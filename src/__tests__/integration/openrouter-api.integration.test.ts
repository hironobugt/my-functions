import { OpenRouterLLMService } from '../../services/OpenRouterLLMService';
import { ConversationContext } from '../../models/ConversationContext';
import axios from 'axios';

// This test file contains integration tests for OpenRouter API
// These tests make real API calls and should be run with caution
// Set INTEGRATION_TEST_OPENROUTER=true to enable these tests

const INTEGRATION_TESTS_ENABLED = process.env.INTEGRATION_TEST_OPENROUTER === 'true';
const REAL_API_KEY = process.env.OPENROUTER_API_KEY_REAL; // Use a real API key for integration tests

describe('OpenRouter API Integration Tests', () => {
  let llmService: OpenRouterLLMService;

  beforeAll(() => {
    if (!INTEGRATION_TESTS_ENABLED) {
      console.log('OpenRouter integration tests skipped. Set INTEGRATION_TEST_OPENROUTER=true to enable.');
      return;
    }

    if (!REAL_API_KEY) {
      throw new Error('OPENROUTER_API_KEY_REAL environment variable is required for integration tests');
    }

    // Set up real API key for integration tests
    process.env.OPENROUTER_API_KEY = REAL_API_KEY;
    process.env.OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
    process.env.FREE_USER_MODEL = 'openai/gpt-3.5-turbo';
    process.env.PREMIUM_USER_MODEL = 'openai/gpt-4';
    process.env.MAX_CONTEXT_TOKENS = '4000';
    process.env.RESPONSE_TIMEOUT_MS = '10000';

    llmService = new OpenRouterLLMService();
  });

  beforeEach(() => {
    if (!INTEGRATION_TESTS_ENABLED) {
      return;
    }
    jest.setTimeout(15000); // Increase timeout for real API calls
  });

  describe('Real API Configuration Validation', () => {
    it('should validate API configuration with real credentials', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      const isValid = await llmService.validateApiConfiguration();
      expect(isValid).toBe(true);
    });

    it('should check API availability', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      const isAvailable = await llmService.isApiAvailable();
      expect(isAvailable).toBe(true);
    });
  });

  describe('Real API Chat Completions', () => {
    it('should generate response for free user with simple question', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      const context: ConversationContext = {
        userId: 'integration-test-user',
        sessionId: 'integration-test-session',
        messages: [],
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 0
      };

      const response = await llmService.generateResponse(
        'What is 2 + 2?',
        context,
        'free'
      );

      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
      expect(response).toMatch(/4|four/i); // Should contain the answer
    });

    it('should generate response for premium user with complex question', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      const context: ConversationContext = {
        userId: 'integration-test-premium-user',
        sessionId: 'integration-test-premium-session',
        messages: [],
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 0
      };

      const response = await llmService.generateResponse(
        'Explain the concept of quantum entanglement in simple terms.',
        context,
        'premium'
      );

      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(50);
      expect(response.toLowerCase()).toContain('quantum');
    });

    it('should maintain conversation context across multiple turns', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      const context: ConversationContext = {
        userId: 'integration-test-context-user',
        sessionId: 'integration-test-context-session',
        messages: [
          {
            role: 'user',
            content: 'My name is Alice.',
            timestamp: new Date()
          },
          {
            role: 'assistant',
            content: 'Hello Alice! Nice to meet you.',
            timestamp: new Date()
          }
        ],
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 50
      };

      const response = await llmService.generateResponse(
        'What is my name?',
        context,
        'free'
      );

      expect(response).toBeDefined();
      expect(response.toLowerCase()).toContain('alice');
    });

    it('should handle long context and truncation', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      // Create a context with many messages to test truncation
      const messages = [];
      for (let i = 0; i < 20; i++) {
        messages.push(
          {
            role: 'user' as const,
            content: `This is message number ${i}. Please remember this number.`,
            timestamp: new Date()
          },
          {
            role: 'assistant' as const,
            content: `I acknowledge message number ${i}. I will remember it.`,
            timestamp: new Date()
          }
        );
      }

      const context: ConversationContext = {
        userId: 'integration-test-long-context-user',
        sessionId: 'integration-test-long-context-session',
        messages,
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 3000 // High token count to trigger truncation
      };

      const response = await llmService.generateResponse(
        'What was the last message number I mentioned?',
        context,
        'free'
      );

      expect(response).toBeDefined();
      expect(typeof response).toBe('string');
      expect(response.length).toBeGreaterThan(0);
    });
  });

  describe('Real API Error Handling', () => {
    it('should handle invalid model gracefully', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      // Temporarily override model to invalid one
      const originalModel = process.env.FREE_USER_MODEL;
      process.env.FREE_USER_MODEL = 'invalid/model-name';

      const testService = new OpenRouterLLMService();
      const context: ConversationContext = {
        userId: 'integration-test-error-user',
        sessionId: 'integration-test-error-session',
        messages: [],
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 0
      };

      await expect(testService.generateResponse(
        'This should fail',
        context,
        'free'
      )).rejects.toThrow();

      // Restore original model
      process.env.FREE_USER_MODEL = originalModel;
    });

    it('should handle rate limiting gracefully', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      const context: ConversationContext = {
        userId: 'integration-test-rate-limit-user',
        sessionId: 'integration-test-rate-limit-session',
        messages: [],
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 0
      };

      // Make multiple rapid requests to potentially trigger rate limiting
      const promises = [];
      for (let i = 0; i < 5; i++) {
        promises.push(
          llmService.generateResponse(
            `Rate limit test request ${i}`,
            context,
            'free'
          )
        );
      }

      // At least some requests should succeed
      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(0);
    });

    it('should handle timeout scenarios', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      // Set a very short timeout to test timeout handling
      const originalTimeout = process.env.RESPONSE_TIMEOUT_MS;
      process.env.RESPONSE_TIMEOUT_MS = '100'; // 100ms timeout

      const testService = new OpenRouterLLMService();
      const context: ConversationContext = {
        userId: 'integration-test-timeout-user',
        sessionId: 'integration-test-timeout-session',
        messages: [],
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 0
      };

      await expect(testService.generateResponse(
        'This should timeout due to very short timeout',
        context,
        'free'
      )).rejects.toThrow();

      // Restore original timeout
      process.env.RESPONSE_TIMEOUT_MS = originalTimeout;
    });
  });

  describe('Real API Model Configuration', () => {
    it('should use different models for free vs premium users', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      const context: ConversationContext = {
        userId: 'integration-test-model-user',
        sessionId: 'integration-test-model-session',
        messages: [],
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 0
      };

      // Test free user model
      const freeConfig = llmService.getModelConfig('free');
      expect(freeConfig.model).toBe('openai/gpt-3.5-turbo');

      // Test premium user model
      const premiumConfig = llmService.getModelConfig('premium');
      expect(premiumConfig.model).toBe('openai/gpt-4');

      // Both should have appropriate parameters
      expect(freeConfig.temperature).toBeDefined();
      expect(freeConfig.maxTokens).toBeDefined();
      expect(premiumConfig.temperature).toBeDefined();
      expect(premiumConfig.maxTokens).toBeDefined();
    });

    it('should calculate token counts accurately', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      const shortContext: ConversationContext = {
        userId: 'integration-test-tokens-user',
        sessionId: 'integration-test-tokens-session',
        messages: [
          {
            role: 'user',
            content: 'Hello',
            timestamp: new Date()
          }
        ],
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 0
      };

      const tokenCount = llmService.calculateContextTokenCount(shortContext);
      expect(tokenCount).toBeGreaterThan(0);
      expect(tokenCount).toBeLessThan(100); // Should be small for short message
    });

    it('should determine when context truncation is needed', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      const shortContext: ConversationContext = {
        userId: 'integration-test-truncation-user',
        sessionId: 'integration-test-truncation-session',
        messages: [
          {
            role: 'user',
            content: 'Short message',
            timestamp: new Date()
          }
        ],
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 50
      };

      const longContext: ConversationContext = {
        ...shortContext,
        tokenCount: 5000 // Exceeds max context tokens
      };

      expect(llmService.shouldTruncateContext(shortContext, 'free')).toBe(false);
      expect(llmService.shouldTruncateContext(longContext, 'free')).toBe(true);
    });
  });
});