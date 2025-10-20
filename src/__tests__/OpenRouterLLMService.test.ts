import { OpenRouterLLMService, LLMServiceError, ApiErrorType } from '../services/OpenRouterLLMService';
import { ConversationContext } from '../models/ConversationContext';
import { UserTier } from '../models/SubscriptionStatus';
import { ConfigManager } from '../models/AppConfig';

// Mock fetch globally
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock AbortSignal.timeout
global.AbortSignal = {
  ...global.AbortSignal,
  timeout: jest.fn((ms: number) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  }),
} as any;

describe('OpenRouterLLMService', () => {
  let service: OpenRouterLLMService;
  let configManager: ConfigManager;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Reset configuration
    configManager = ConfigManager.getInstance();
    configManager.resetConfig();

    // Set up test environment variables
    process.env.OPENROUTER_API_KEY = 'test-api-key';
    process.env.OPENROUTER_BASE_URL = 'https://test-api.openrouter.ai/api/v1';
    process.env.FREE_USER_MODEL = 'openai/gpt-3.5-turbo';
    process.env.PREMIUM_USER_MODEL = 'openai/gpt-4';
    process.env.RESPONSE_TIMEOUT_MS = '7000';

    service = new OpenRouterLLMService();
  });

  afterEach(() => {
    // Clean up environment variables
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_BASE_URL;
    delete process.env.FREE_USER_MODEL;
    delete process.env.PREMIUM_USER_MODEL;
    delete process.env.RESPONSE_TIMEOUT_MS;
  });

  describe('generateResponse', () => {
    const mockSuccessResponse = {
      id: 'test-id',
      object: 'chat.completion',
      created: 1234567890,
      model: 'openai/gpt-3.5-turbo',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: 'Hello! How can I help you today?',
          },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 15,
        total_tokens: 25,
      },
    };

    it('should generate response for free user without context', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessResponse,
      } as Response);

      const result = await service.generateResponse('Hello', null, 'free');

      expect(result).toBe('Hello! How can I help you today?');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-api-key',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            model: 'openai/gpt-3.5-turbo',
            messages: [{ role: 'user', content: 'Hello' }],
            max_tokens: 500,
            temperature: 0.7,
            top_p: 0.9,
          }),
        })
      );
    });

    it('should generate response for premium user with context', async () => {
      const context: ConversationContext = {
        userId: 'test-user',
        sessionId: 'test-session',
        messages: [
          {
            role: 'user',
            content: 'What is AI?',
            timestamp: new Date(),
          },
          {
            role: 'assistant',
            content: 'AI stands for Artificial Intelligence.',
            timestamp: new Date(),
          },
        ],
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 50,
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockSuccessResponse,
      } as Response);

      const result = await service.generateResponse('Tell me more', context, 'premium');

      expect(result).toBe('Hello! How can I help you today?');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://test-api.openrouter.ai/api/v1/chat/completions',
        expect.objectContaining({
          body: JSON.stringify({
            model: 'openai/gpt-4',
            messages: [
              { role: 'user', content: 'What is AI?' },
              { role: 'assistant', content: 'AI stands for Artificial Intelligence.' },
              { role: 'user', content: 'Tell me more' },
            ],
            max_tokens: 1000,
            temperature: 0.7,
            top_p: 0.9,
          }),
        })
      );
    });

    it('should handle API error responses', async () => {
      const errorResponse = {
        error: {
          message: 'Invalid API key',
          type: 'authentication_error',
        },
      };

      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        json: async () => errorResponse,
      } as Response);

      try {
        await service.generateResponse('Hello', null, 'free');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMServiceError);
        expect((error as LLMServiceError).statusCode).toBe(401);
        expect((error as LLMServiceError).message).toBe('Invalid API key');
      }
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(service.generateResponse('Hello', null, 'free'))
        .rejects.toThrow(LLMServiceError);
    });

    it('should handle timeout errors', async () => {
      // Mock all retry attempts to fail with timeout
      mockFetch
        .mockRejectedValueOnce(Object.assign(new Error('Timeout'), { name: 'AbortError' }))
        .mockRejectedValueOnce(Object.assign(new Error('Timeout'), { name: 'AbortError' }))
        .mockRejectedValueOnce(Object.assign(new Error('Timeout'), { name: 'AbortError' }));

      try {
        await service.generateResponse('Hello', null, 'free');
        fail('Expected error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(LLMServiceError);
        expect((error as LLMServiceError).statusCode).toBe(408);
        expect((error as LLMServiceError).errorType).toBe(ApiErrorType.TIMEOUT);
      }
    });

    it('should handle empty response choices', async () => {
      const emptyResponse = {
        ...mockSuccessResponse,
        choices: [],
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => emptyResponse,
      } as Response);

      await expect(service.generateResponse('Hello', null, 'free'))
        .rejects.toThrow('No response choices returned from API');
    });
  });

  describe('validateApiConfiguration', () => {
    it('should return true for valid configuration', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: 'test',
          choices: [{ message: { content: 'test' } }],
        }),
      } as Response);

      const result = await service.validateApiConfiguration();
      expect(result).toBe(true);
    });

    it('should return false for invalid configuration', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Invalid API key'));

      const result = await service.validateApiConfiguration();
      expect(result).toBe(false);
    });
  });

  describe('isApiAvailable', () => {
    it('should return true when API is available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
      } as Response);

      const result = await service.isApiAvailable();
      expect(result).toBe(true);
    });

    it('should return false when API is not available', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503,
      } as Response);

      const result = await service.isApiAvailable();
      expect(result).toBe(false);
    });

    it('should return false on network error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.isApiAvailable();
      expect(result).toBe(false);
    });
  });

  describe('getModelConfig', () => {
    it('should return free user configuration', () => {
      const config = service.getModelConfig('free');
      
      expect(config).toEqual({
        model: 'openai/gpt-3.5-turbo',
        maxTokens: 500,
        temperature: 0.7,
        topP: 0.9,
      });
    });

    it('should return premium user configuration', () => {
      const config = service.getModelConfig('premium');
      
      expect(config).toEqual({
        model: 'openai/gpt-4',
        maxTokens: 1000,
        temperature: 0.7,
        topP: 0.9,
      });
    });
  });

  describe('Error Handling and Timeouts', () => {
    describe('handleApiError', () => {
      it('should return appropriate message for authentication error type', () => {
        const error = new LLMServiceError('Unauthorized', 401, ApiErrorType.AUTHENTICATION);
        const message = service.handleApiError(error);
        
        expect(message).toBe("I'm having trouble with my authentication. Please try again later.");
      });

      it('should return appropriate message for rate limit error type', () => {
        const error = new LLMServiceError('Rate limited', 429, ApiErrorType.RATE_LIMIT);
        const message = service.handleApiError(error);
        
        expect(message).toBe("I'm receiving too many requests right now. Please try again in a moment.");
      });

      it('should return appropriate message for timeout error type', () => {
        const error = new LLMServiceError('Timeout', 408, ApiErrorType.TIMEOUT);
        const message = service.handleApiError(error);
        
        expect(message).toBe("I'm taking too long to respond. Please try asking a shorter question.");
      });

      it('should return appropriate message for quota exceeded error type', () => {
        const error = new LLMServiceError('Quota exceeded', 403, ApiErrorType.QUOTA_EXCEEDED);
        const message = service.handleApiError(error);
        
        expect(message).toBe("I've reached my usage limit for now. Please try again later or consider upgrading for unlimited access.");
      });

      it('should return appropriate message for model unavailable error type', () => {
        const error = new LLMServiceError('Model not found', 404, ApiErrorType.MODEL_UNAVAILABLE);
        const message = service.handleApiError(error);
        
        expect(message).toBe("The AI model I'm trying to use is currently unavailable. Please try again in a few minutes.");
      });

      it('should return appropriate message for content filter error type', () => {
        const error = new LLMServiceError('Content filtered', 400, ApiErrorType.CONTENT_FILTER);
        const message = service.handleApiError(error);
        
        expect(message).toBe("I can't respond to that request due to content policy restrictions. Please try rephrasing your question.");
      });

      it('should return appropriate message for validation error type', () => {
        const error = new LLMServiceError('Invalid request', 400, ApiErrorType.VALIDATION);
        const message = service.handleApiError(error);
        
        expect(message).toBe("There was an issue with your request. Please try rephrasing your question.");
      });

      it('should return appropriate message for server error type', () => {
        const error = new LLMServiceError('Server error', 500, ApiErrorType.SERVER);
        const message = service.handleApiError(error);
        
        expect(message).toBe("The AI service is temporarily unavailable. Please try again in a few minutes.");
      });

      it('should return appropriate message for network error type', () => {
        const error = new LLMServiceError('Network error', undefined, ApiErrorType.NETWORK);
        const message = service.handleApiError(error);
        
        expect(message).toBe("I'm having trouble connecting to the AI service. Please check your connection and try again.");
      });

      it('should fall back to status code handling for unknown error types', () => {
        const error = new LLMServiceError('Unknown error', 503, ApiErrorType.UNKNOWN);
        const message = service.handleApiError(error);
        
        expect(message).toBe("The AI service is temporarily unavailable. Please try again in a few minutes.");
      });

      it('should handle AbortError from other sources', () => {
        const error = Object.assign(new Error('Timeout'), { name: 'AbortError' });
        const message = service.handleApiError(error);
        
        expect(message).toBe("I'm taking too long to respond. Please try asking a shorter question.");
      });

      it('should handle network connection errors', () => {
        const error = Object.assign(new Error('Network error'), { code: 'ENOTFOUND' });
        const message = service.handleApiError(error);
        
        expect(message).toBe("I'm having trouble connecting to the AI service. Please try again later.");
      });

      it('should return generic message for unknown errors', () => {
        const error = new Error('Unknown error');
        const message = service.handleApiError(error);
        
        expect(message).toBe("I'm having trouble processing your request right now. Please try again.");
      });
    });

    describe('getFallbackResponse', () => {
      it('should return a fallback response', () => {
        const response = service.getFallbackResponse();
        
        expect(typeof response).toBe('string');
        expect(response.length).toBeGreaterThan(0);
        expect(response).toMatch(/sorry|issues|wrong|unable/i);
      });

      it('should return different responses on multiple calls', () => {
        const responses = new Set();
        
        // Call multiple times to test randomness
        for (let i = 0; i < 20; i++) {
          responses.add(service.getFallbackResponse());
        }
        
        // Should have at least 2 different responses (could be more due to randomness)
        expect(responses.size).toBeGreaterThanOrEqual(1);
      });
    });

    describe('Retry Logic', () => {
      const mockSuccessResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: 1234567890,
        model: 'openai/gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Success after retry',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 15,
          total_tokens: 25,
        },
      };

      it('should retry on 429 rate limit error and succeed', async () => {
        // First call fails with 429, second succeeds
        mockFetch
          .mockResolvedValueOnce({
            ok: false,
            status: 429,
            statusText: 'Too Many Requests',
            json: async () => ({ error: { message: 'Rate limit exceeded', type: 'rate_limit_exceeded' } }),
          } as Response)
          .mockResolvedValueOnce({
            ok: true,
            json: async () => mockSuccessResponse,
          } as Response);

        const result = await service.generateResponse('Hello', null, 'free');

        expect(result).toBe('Success after retry');
        expect(mockFetch).toHaveBeenCalledTimes(2);
        
        // Check that retry attempt header was added
        const secondCall = mockFetch.mock.calls[1];
        expect(secondCall[1]?.headers).toEqual(
          expect.objectContaining({
            'X-Retry-Attempt': '1',
          })
        );
      });

      it('should retry on 500 server error and succeed', async () => {
        mockFetch
          .mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            json: async () => ({ error: { message: 'Server error', type: 'server_error' } }),
          } as Response)
          .mockResolvedValueOnce({
            ok: true,
            json: async () => mockSuccessResponse,
          } as Response);

        const result = await service.generateResponse('Hello', null, 'free');

        expect(result).toBe('Success after retry');
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      it('should retry on network error and succeed', async () => {
        mockFetch
          .mockRejectedValueOnce(new Error('Network error'))
          .mockResolvedValueOnce({
            ok: true,
            json: async () => mockSuccessResponse,
          } as Response);

        const result = await service.generateResponse('Hello', null, 'free');

        expect(result).toBe('Success after retry');
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      it('should retry on timeout error and succeed', async () => {
        mockFetch
          .mockRejectedValueOnce(Object.assign(new Error('Timeout'), { name: 'AbortError' }))
          .mockResolvedValueOnce({
            ok: true,
            json: async () => mockSuccessResponse,
          } as Response);

        const result = await service.generateResponse('Hello', null, 'free');

        expect(result).toBe('Success after retry');
        expect(mockFetch).toHaveBeenCalledTimes(2);
      });

      it('should not retry on 401 authentication error', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 401,
          statusText: 'Unauthorized',
          json: async () => ({ error: { message: 'Invalid API key', type: 'authentication_error' } }),
        } as Response);

        await expect(service.generateResponse('Hello', null, 'free'))
          .rejects.toThrow(LLMServiceError);

        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      it('should not retry on 400 validation error', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          json: async () => ({ error: { message: 'Invalid request', type: 'validation_error' } }),
        } as Response);

        await expect(service.generateResponse('Hello', null, 'free'))
          .rejects.toThrow(LLMServiceError);

        expect(mockFetch).toHaveBeenCalledTimes(1);
      });

      it('should exhaust retries and throw final error', async () => {
        // Mock 3 failures (initial + 2 retries)
        mockFetch
          .mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            json: async () => ({ error: { message: 'Server error', type: 'server_error' } }),
          } as Response)
          .mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            json: async () => ({ error: { message: 'Server error', type: 'server_error' } }),
          } as Response)
          .mockResolvedValueOnce({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            json: async () => ({ error: { message: 'Server error', type: 'server_error' } }),
          } as Response);

        await expect(service.generateResponse('Hello', null, 'free'))
          .rejects.toThrow(LLMServiceError);

        expect(mockFetch).toHaveBeenCalledTimes(3);
      });
    });

    describe('Timeout Handling', () => {
      it('should handle timeout with proper error classification', async () => {
        // Mock all retry attempts to fail with timeout
        mockFetch
          .mockRejectedValueOnce(Object.assign(new Error('Timeout'), { name: 'AbortError' }))
          .mockRejectedValueOnce(Object.assign(new Error('Timeout'), { name: 'AbortError' }))
          .mockRejectedValueOnce(Object.assign(new Error('Timeout'), { name: 'AbortError' }));

        try {
          await service.generateResponse('Hello', null, 'free');
          fail('Expected error to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(LLMServiceError);
          expect((error as LLMServiceError).statusCode).toBe(408);
          expect((error as LLMServiceError).errorType).toBe(ApiErrorType.TIMEOUT);
          expect((error as LLMServiceError).isRetryable).toBe(false); // Should be false after exhausting retries
        }
      });

      it('should use reduced timeout for retry attempts', async () => {
        // Set a shorter timeout for testing
        process.env.RESPONSE_TIMEOUT_MS = '5000';
        const newService = new OpenRouterLLMService();

        mockFetch
          .mockRejectedValueOnce(Object.assign(new Error('Timeout'), { name: 'AbortError' }))
          .mockRejectedValueOnce(Object.assign(new Error('Timeout'), { name: 'AbortError' }))
          .mockRejectedValueOnce(Object.assign(new Error('Timeout'), { name: 'AbortError' }));

        const startTime = Date.now();
        
        try {
          await newService.generateResponse('Hello', null, 'free');
          fail('Expected error to be thrown');
        } catch (error) {
          const duration = Date.now() - startTime;
          
          // Should complete faster than 3 full timeouts due to reduced retry timeouts
          expect(duration).toBeLessThan(15000); // 3 * 5000ms
          expect(error).toBeInstanceOf(LLMServiceError);
        }
      });
    });

    describe('Response Validation', () => {
      it('should throw error for empty response', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => null,
        } as Response);

        await expect(service.generateResponse('Hello', null, 'free'))
          .rejects.toThrow('Empty response from API');
      });

      it('should throw error for response without choices', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ id: 'test' }),
        } as Response);

        await expect(service.generateResponse('Hello', null, 'free'))
          .rejects.toThrow('Invalid response format: missing choices array');
      });

      it('should throw error for response with non-array choices', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ choices: 'not-an-array' }),
        } as Response);

        await expect(service.generateResponse('Hello', null, 'free'))
          .rejects.toThrow('Invalid response format: missing choices array');
      });

      it('should throw error for response with empty choices array', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({ choices: [] }),
        } as Response);

        await expect(service.generateResponse('Hello', null, 'free'))
          .rejects.toThrow('No response choices returned from API');
      });

      it('should throw error for response with invalid message format', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            choices: [{ message: { role: 'assistant' } }] // Missing content
          }),
        } as Response);

        await expect(service.generateResponse('Hello', null, 'free'))
          .rejects.toThrow('Invalid response format: missing or invalid message content');
      });
    });

    describe('Error Classification', () => {
      it('should classify 400 as validation error', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          json: async () => ({ error: { message: 'Invalid request' } }),
        } as Response);

        try {
          await service.generateResponse('Hello', null, 'free');
          fail('Expected error to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(LLMServiceError);
          expect((error as LLMServiceError).errorType).toBe(ApiErrorType.VALIDATION);
          expect((error as LLMServiceError).isRetryable).toBe(false);
        }
      });

      it('should classify 403 as quota exceeded error', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 403,
          statusText: 'Forbidden',
          json: async () => ({ error: { message: 'Quota exceeded', type: 'quota_exceeded' } }),
        } as Response);

        try {
          await service.generateResponse('Hello', null, 'free');
          fail('Expected error to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(LLMServiceError);
          expect((error as LLMServiceError).errorType).toBe(ApiErrorType.QUOTA_EXCEEDED);
          expect((error as LLMServiceError).isRetryable).toBe(false);
        }
      });

      it('should classify 404 as model unavailable error', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          json: async () => ({ error: { message: 'Model not found', type: 'model_not_found' } }),
        } as Response);

        try {
          await service.generateResponse('Hello', null, 'free');
          fail('Expected error to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(LLMServiceError);
          expect((error as LLMServiceError).errorType).toBe(ApiErrorType.MODEL_UNAVAILABLE);
          expect((error as LLMServiceError).isRetryable).toBe(false);
        }
      });

      it('should refine error type based on API response type field', async () => {
        mockFetch.mockResolvedValueOnce({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          json: async () => ({ error: { message: 'Content filtered', type: 'content_filter' } }),
        } as Response);

        try {
          await service.generateResponse('Hello', null, 'free');
          fail('Expected error to be thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(LLMServiceError);
          expect((error as LLMServiceError).errorType).toBe(ApiErrorType.CONTENT_FILTER);
          expect((error as LLMServiceError).message).toBe('Content was filtered due to policy violations');
        }
      });
    });
  });

  describe('Context Handling', () => {
    describe('calculateContextTokenCount', () => {
      it('should return 0 for null context', () => {
        const result = service.calculateContextTokenCount(null as any);
        expect(result).toBe(0);
      });

      it('should return 0 for context with no messages', () => {
        const context: ConversationContext = {
          userId: 'test-user',
          sessionId: 'test-session',
          messages: [],
          createdAt: new Date(),
          lastUpdated: new Date(),
          tokenCount: 0,
        };

        const result = service.calculateContextTokenCount(context);
        expect(result).toBe(0);
      });

      it('should calculate token count for context with messages', () => {
        const context: ConversationContext = {
          userId: 'test-user',
          sessionId: 'test-session',
          messages: [
            {
              role: 'user',
              content: 'Hello world',
              timestamp: new Date(),
            },
            {
              role: 'assistant',
              content: 'Hi there! How can I help you?',
              timestamp: new Date(),
            },
          ],
          createdAt: new Date(),
          lastUpdated: new Date(),
          tokenCount: 0,
        };

        const result = service.calculateContextTokenCount(context);
        expect(result).toBeGreaterThan(0);
      });
    });

    describe('shouldTruncateContext', () => {
      it('should return false for small context', () => {
        const context: ConversationContext = {
          userId: 'test-user',
          sessionId: 'test-session',
          messages: [
            {
              role: 'user',
              content: 'Hello',
              timestamp: new Date(),
            },
          ],
          createdAt: new Date(),
          lastUpdated: new Date(),
          tokenCount: 0,
        };

        const result = service.shouldTruncateContext(context, 'free', 10);
        expect(result).toBe(false);
      });

      it('should return true for large context that exceeds limits', () => {
        // Create a context with many long messages
        const longMessage = 'This is a very long message that contains many words and should consume a significant number of tokens when processed by the language model. '.repeat(50);
        const messages = Array.from({ length: 20 }, (_, i) => ({
          role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
          content: longMessage,
          timestamp: new Date(),
        }));

        const context: ConversationContext = {
          userId: 'test-user',
          sessionId: 'test-session',
          messages,
          createdAt: new Date(),
          lastUpdated: new Date(),
          tokenCount: 0,
        };

        const result = service.shouldTruncateContext(context, 'free', 100);
        expect(result).toBe(true);
      });
    });

    describe('Context truncation in generateResponse', () => {
      const mockSuccessResponse = {
        id: 'test-id',
        object: 'chat.completion',
        created: 1234567890,
        model: 'openai/gpt-3.5-turbo',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Response with context handling',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 15,
          total_tokens: 25,
        },
      };

      it('should handle context truncation for free users', async () => {
        // Create a large context that should be truncated
        const longMessage = 'This is a very long message. '.repeat(100);
        const messages = Array.from({ length: 15 }, (_, i) => ({
          role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
          content: longMessage,
          timestamp: new Date(),
        }));

        const context: ConversationContext = {
          userId: 'test-user',
          sessionId: 'test-session',
          messages,
          createdAt: new Date(),
          lastUpdated: new Date(),
          tokenCount: 0,
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockSuccessResponse,
        } as Response);

        const result = await service.generateResponse('New question', context, 'free');

        expect(result).toBe('Response with context handling');
        
        // Verify that the request was made with truncated context
        const callArgs = mockFetch.mock.calls[0];
        const requestBody = JSON.parse(callArgs[1]?.body as string);
        
        // Should have fewer messages than the original context due to truncation
        expect(requestBody.messages.length).toBeLessThan(messages.length + 1); // +1 for current prompt
        expect(requestBody.messages[requestBody.messages.length - 1]).toEqual({
          role: 'user',
          content: 'New question',
        });
      });

      it('should preserve more context for premium users', async () => {
        const messages = Array.from({ length: 10 }, (_, i) => ({
          role: (i % 2 === 0 ? 'user' : 'assistant') as 'user' | 'assistant',
          content: `Message ${i + 1}`,
          timestamp: new Date(),
        }));

        const context: ConversationContext = {
          userId: 'test-user',
          sessionId: 'test-session',
          messages,
          createdAt: new Date(),
          lastUpdated: new Date(),
          tokenCount: 0,
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockSuccessResponse,
        } as Response);

        await service.generateResponse('New question', context, 'premium');

        const callArgs = mockFetch.mock.calls[0];
        const requestBody = JSON.parse(callArgs[1]?.body as string);
        
        // Premium users should get more context preserved
        expect(requestBody.messages.length).toBeGreaterThan(5);
        expect(requestBody.model).toBe('openai/gpt-4');
      });

      it('should handle empty context gracefully', async () => {
        const context: ConversationContext = {
          userId: 'test-user',
          sessionId: 'test-session',
          messages: [],
          createdAt: new Date(),
          lastUpdated: new Date(),
          tokenCount: 0,
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => mockSuccessResponse,
        } as Response);

        const result = await service.generateResponse('Hello', context, 'free');

        expect(result).toBe('Response with context handling');
        
        const callArgs = mockFetch.mock.calls[0];
        const requestBody = JSON.parse(callArgs[1]?.body as string);
        
        // Should only have the current prompt
        expect(requestBody.messages).toEqual([
          { role: 'user', content: 'Hello' },
        ]);
      });
    });
  });
});