import { ChatIntentHandler } from '../handlers/ChatIntentHandler';
import { SessionManager } from '../interfaces/SessionManager';
import { SubscriptionManager } from '../interfaces/SubscriptionManager';
import { LLMService } from '../interfaces/LLMService';
import { AnalyticsService } from '../interfaces/AnalyticsService';
import { RequestEnvelope, IntentRequest } from 'ask-sdk-model';
import { ConversationContext } from '../models/ConversationContext';
import { SubscriptionStatus, UsageLimitResult } from '../models/SubscriptionStatus';

describe('ChatIntentHandler', () => {
  let handler: ChatIntentHandler;
  let mockSessionManager: jest.Mocked<SessionManager>;
  let mockSubscriptionManager: jest.Mocked<SubscriptionManager>;
  let mockLLMService: jest.Mocked<LLMService>;
  let mockAnalyticsService: jest.Mocked<AnalyticsService>;

  const mockRequestEnvelope: RequestEnvelope = {
    version: '1.0',
    session: {
      sessionId: 'test-session',
      application: { applicationId: 'test-app' },
      user: { userId: 'test-user' },
      new: false
    },
    request: {
      type: 'IntentRequest',
      requestId: 'test-request',
      timestamp: '2023-01-01T00:00:00Z',
      locale: 'en-US',
      dialogState: 'COMPLETED',
      intent: {
        name: 'ChatIntent',
        confirmationStatus: 'NONE',
        slots: {
          question: {
            name: 'question',
            value: 'What is the weather like?',
            confirmationStatus: 'NONE'
          }
        }
      }
    } as IntentRequest,
    context: {
      System: {
        application: { applicationId: 'test-app' },
        user: { userId: 'test-user' },
        device: { 
          deviceId: 'test-device',
          supportedInterfaces: {}
        },
        apiEndpoint: 'https://api.amazonalexa.com'
      }
    }
  };

  beforeEach(() => {
    mockSessionManager = {
      getConversationContext: jest.fn(),
      updateConversationContext: jest.fn(),
      clearConversationContext: jest.fn(),
      truncateContextIfNeeded: jest.fn(),
      shouldEndSession: jest.fn()
    };

    mockSubscriptionManager = {
      getUserSubscriptionStatus: jest.fn(),
      checkUsageLimits: jest.fn(),
      incrementUsageCount: jest.fn(),
      handlePurchaseRequest: jest.fn(),
      verifySubscription: jest.fn(),
      resetDailyUsage: jest.fn()
    };

    mockLLMService = {
      generateResponse: jest.fn(),
      validateApiConfiguration: jest.fn(),
      handleApiError: jest.fn(),
      isApiAvailable: jest.fn(),
      getModelConfig: jest.fn(),
      calculateContextTokenCount: jest.fn(),
      shouldTruncateContext: jest.fn()
    };

    mockAnalyticsService = {
      logConversation: jest.fn(),
      logSubscriptionEvent: jest.fn(),
      logError: jest.fn(),
      logSkillLaunch: jest.fn(),
      logUsageLimitEvent: jest.fn(),
      logSessionEnd: jest.fn(),
      logFallbackEvent: jest.fn()
    };

    handler = new ChatIntentHandler(
      mockSessionManager,
      mockSubscriptionManager,
      mockLLMService,
      mockAnalyticsService
    );
  });

  describe('canHandle', () => {
    it('should return true for ChatIntent', () => {
      expect(handler.canHandle(mockRequestEnvelope)).toBe(true);
    });

    it('should return true for AMAZON.FallbackIntent', () => {
      const fallbackRequest = {
        ...mockRequestEnvelope,
        request: {
          ...mockRequestEnvelope.request,
          intent: { name: 'AMAZON.FallbackIntent' }
        } as IntentRequest
      };
      expect(handler.canHandle(fallbackRequest)).toBe(true);
    });

    it('should return false for other intents', () => {
      const otherRequest = {
        ...mockRequestEnvelope,
        request: {
          ...mockRequestEnvelope.request,
          intent: { name: 'SomeOtherIntent' }
        } as IntentRequest
      };
      expect(handler.canHandle(otherRequest)).toBe(false);
    });
  });

  describe('handleChatIntent', () => {
    beforeEach(() => {
      // Setup default mocks
      mockSubscriptionManager.getUserSubscriptionStatus.mockResolvedValue({
        userId: 'test-user',
        tier: 'free',
        dailyUsageCount: 2,
        lastResetDate: new Date()
      } as SubscriptionStatus);

      mockSubscriptionManager.checkUsageLimits.mockResolvedValue({
        canProceed: true,
        remainingUsage: 3
      } as UsageLimitResult);

      mockSessionManager.getConversationContext.mockResolvedValue(null);
      mockLLMService.shouldTruncateContext.mockReturnValue(false);
      mockLLMService.generateResponse.mockResolvedValue('This is a test response from the AI.');
      mockSessionManager.shouldEndSession.mockReturnValue(false);
    });

    it('should handle successful chat interaction', async () => {
      const response = await handler.handleChatIntent(mockRequestEnvelope);

      expect(mockSubscriptionManager.getUserSubscriptionStatus).toHaveBeenCalledWith('test-user');
      expect(mockSubscriptionManager.checkUsageLimits).toHaveBeenCalledWith('test-user');
      expect(mockLLMService.generateResponse).toHaveBeenCalled();
      expect(mockSessionManager.updateConversationContext).toHaveBeenCalled();
      expect(mockSubscriptionManager.incrementUsageCount).toHaveBeenCalledWith('test-user');
      expect(mockAnalyticsService.logConversation).toHaveBeenCalled();

      const outputSpeech = response.response?.outputSpeech as any;
      expect(outputSpeech?.text).toContain('This is a test response from the AI.');
      expect(response.response?.shouldEndSession).toBe(false);
    });

    it('should handle usage limit exceeded for free user', async () => {
      mockSubscriptionManager.checkUsageLimits.mockResolvedValue({
        canProceed: false,
        remainingUsage: 0
      } as UsageLimitResult);

      const response = await handler.handleChatIntent(mockRequestEnvelope);

      expect(mockAnalyticsService.logUsageLimitEvent).toHaveBeenCalledWith('test-user', 'daily', true);
      
      const outputSpeech = response.response?.outputSpeech as any;
      expect(outputSpeech?.text).toContain('reached your daily limit');
      expect(response.response?.shouldEndSession).toBe(false);
    });

    it('should handle existing conversation context', async () => {
      const existingContext: ConversationContext = {
        userId: 'test-user',
        sessionId: 'test-session',
        messages: [
          {
            role: 'user',
            content: 'Previous question',
            timestamp: new Date()
          },
          {
            role: 'assistant',
            content: 'Previous answer',
            timestamp: new Date()
          }
        ],
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 100
      };

      mockSessionManager.getConversationContext.mockResolvedValue(existingContext);

      const response = await handler.handleChatIntent(mockRequestEnvelope);

      expect(mockLLMService.generateResponse).toHaveBeenCalledWith(
        'What is the weather like?',
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({ content: 'Previous question' }),
            expect.objectContaining({ content: 'Previous answer' }),
            expect.objectContaining({ content: 'What is the weather like?' })
          ])
        }),
        'free'
      );
    });

    it('should handle context truncation when needed', async () => {
      const longContext: ConversationContext = {
        userId: 'test-user',
        sessionId: 'test-session',
        messages: [],
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 5000
      };

      mockSessionManager.getConversationContext.mockResolvedValue(longContext);
      mockLLMService.shouldTruncateContext.mockReturnValue(true);
      mockSessionManager.truncateContextIfNeeded.mockReturnValue({
        ...longContext,
        tokenCount: 2000
      });

      const response = await handler.handleChatIntent(mockRequestEnvelope);

      expect(mockSessionManager.truncateContextIfNeeded).toHaveBeenCalled();
      expect(response.response?.shouldEndSession).toBe(false);
    });

    it('should handle empty or missing question slot', async () => {
      const requestWithoutQuestion = {
        ...mockRequestEnvelope,
        request: {
          ...mockRequestEnvelope.request,
          intent: {
            name: 'ChatIntent',
            slots: {}
          }
        } as IntentRequest
      };

      const response = await handler.handleChatIntent(requestWithoutQuestion);

      const outputSpeech = response.response?.outputSpeech as any;
      expect(outputSpeech?.text).toContain("didn't catch what you said");
      expect(response.response?.shouldEndSession).toBe(false);
    });

    it('should handle LLM service errors gracefully', async () => {
      mockLLMService.generateResponse.mockRejectedValue(new Error('API timeout'));

      const response = await handler.handleChatIntent(mockRequestEnvelope);

      expect(mockAnalyticsService.logError).toHaveBeenCalled();
      
      const outputSpeech = response.response?.outputSpeech as any;
      expect(outputSpeech?.text).toContain('trouble connecting to the AI service');
      expect(response.response?.shouldEndSession).toBe(false);
    });

    it('should handle rate limit errors', async () => {
      mockLLMService.generateResponse.mockRejectedValue(new Error('rate limit exceeded'));

      const response = await handler.handleChatIntent(mockRequestEnvelope);

      const outputSpeech = response.response?.outputSpeech as any;
      expect(outputSpeech?.text).toContain('AI service is busy');
    });

    it('should handle empty LLM response', async () => {
      mockLLMService.generateResponse.mockResolvedValue('');

      const response = await handler.handleChatIntent(mockRequestEnvelope);

      expect(mockAnalyticsService.logError).toHaveBeenCalled();
      
      const outputSpeech = response.response?.outputSpeech as any;
      expect(outputSpeech?.text).toContain('encountered an issue');
    });

    it('should handle missing user ID', async () => {
      const requestWithoutUserId = {
        ...mockRequestEnvelope,
        session: {
          ...mockRequestEnvelope.session!,
          user: { userId: undefined as any }
        }
      };

      const response = await handler.handleChatIntent(requestWithoutUserId);

      expect(mockAnalyticsService.logError).toHaveBeenCalled();
      
      const outputSpeech = response.response?.outputSpeech as any;
      expect(outputSpeech?.text).toContain('encountered an issue');
    });

    it('should format long responses appropriately', async () => {
      const longResponse = 'A'.repeat(8000); // Very long response
      mockLLMService.generateResponse.mockResolvedValue(longResponse);

      const response = await handler.handleChatIntent(mockRequestEnvelope);

      const outputSpeech = response.response?.outputSpeech as any;
      expect(outputSpeech?.text.length).toBeLessThan(7500);
      expect(outputSpeech?.text).toContain('let me pause here');
    });

    it('should end session when appropriate', async () => {
      mockSessionManager.shouldEndSession.mockReturnValue(true);

      const response = await handler.handleChatIntent(mockRequestEnvelope);

      expect(response.response?.shouldEndSession).toBe(true);
      expect(response.response?.reprompt).toBeUndefined();
    });
  });
});