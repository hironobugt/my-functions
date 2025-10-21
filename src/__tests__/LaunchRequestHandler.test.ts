import { LaunchRequestHandler } from '../handlers/LaunchRequestHandler';
import { SessionManager } from '../interfaces/SessionManager';
import { SubscriptionManager } from '../interfaces/SubscriptionManager';
import { AnalyticsService } from '../interfaces/AnalyticsService';
import { RequestEnvelope, LaunchRequest } from 'ask-sdk-model';
import { ConversationContext } from '../models/ConversationContext';
import { SubscriptionStatus } from '../models/SubscriptionStatus';

describe('LaunchRequestHandler', () => {
  let handler: LaunchRequestHandler;
  let mockSessionManager: jest.Mocked<SessionManager>;
  let mockSubscriptionManager: jest.Mocked<SubscriptionManager>;
  let mockAnalyticsService: jest.Mocked<AnalyticsService>;

  const mockRequestEnvelope: RequestEnvelope = {
    version: '1.0',
    session: {
      sessionId: 'test-session',
      application: { applicationId: 'test-app' },
      user: { userId: 'test-user' },
      new: true
    },
    request: {
      type: 'LaunchRequest',
      requestId: 'test-request',
      timestamp: '2023-01-01T00:00:00Z',
      locale: 'en-US'
    } as LaunchRequest,
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

    mockAnalyticsService = {
      logConversation: jest.fn(),
      logSubscriptionEvent: jest.fn(),
      logError: jest.fn(),
      logSkillLaunch: jest.fn(),
      logUsageLimitEvent: jest.fn(),
      logSessionEnd: jest.fn(),
      logFallbackEvent: jest.fn()
    };

    handler = new LaunchRequestHandler(
      mockSessionManager,
      mockSubscriptionManager,
      mockAnalyticsService
    );
  });

  describe('canHandle', () => {
    it('should return true for LaunchRequest', () => {
      expect(handler.canHandle(mockRequestEnvelope)).toBe(true);
    });

    it('should return false for non-LaunchRequest', () => {
      const nonLaunchRequest = {
        ...mockRequestEnvelope,
        request: { ...mockRequestEnvelope.request, type: 'IntentRequest' as any }
      };
      expect(handler.canHandle(nonLaunchRequest)).toBe(false);
    });
  });

  describe('handleLaunchRequest', () => {
    it('should handle new free user launch', async () => {
      // Setup mocks for new free user
      mockSessionManager.getConversationContext.mockResolvedValue(null);
      mockSubscriptionManager.getUserSubscriptionStatus.mockResolvedValue({
        userId: 'test-user',
        tier: 'free',
        dailyUsageCount: 0,
        lastResetDate: new Date()
      } as SubscriptionStatus);

      const response = await handler.handleLaunchRequest(mockRequestEnvelope);

      expect(mockAnalyticsService.logSkillLaunch).toHaveBeenCalledWith('test-user', true);
      const outputSpeech = response.response?.outputSpeech as any;
      expect(outputSpeech?.text).toContain('Welcome to AI Chat');
      expect(response.response?.shouldEndSession).toBe(false);
    });

    it('should handle returning premium user launch', async () => {
      // Setup mocks for returning premium user
      const mockContext: ConversationContext = {
        userId: 'test-user',
        sessionId: 'test-session',
        messages: [],
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 0
      };
      
      mockSessionManager.getConversationContext.mockResolvedValue(mockContext);
      mockSubscriptionManager.getUserSubscriptionStatus.mockResolvedValue({
        userId: 'test-user',
        tier: 'premium',
        subscriptionId: 'premium-sub',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        dailyUsageCount: 10,
        lastResetDate: new Date()
      } as SubscriptionStatus);

      const response = await handler.handleLaunchRequest(mockRequestEnvelope);

      expect(mockAnalyticsService.logSkillLaunch).toHaveBeenCalledWith('test-user', false);
      const outputSpeech = response.response?.outputSpeech as any;
      expect(outputSpeech?.text).toContain('Welcome back to AI Chat! As a premium subscriber');
      const card = response.response?.card as any;
      expect(card?.title).toBe('Welcome Back - Premium User');
    });

    it('should handle returning free user with usage remaining', async () => {
      // Setup mocks for returning free user with usage left
      const mockContext: ConversationContext = {
        userId: 'test-user',
        sessionId: 'test-session',
        messages: [],
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 0
      };
      
      mockSessionManager.getConversationContext.mockResolvedValue(mockContext);
      mockSubscriptionManager.getUserSubscriptionStatus.mockResolvedValue({
        userId: 'test-user',
        tier: 'free',
        dailyUsageCount: 2,
        lastResetDate: new Date()
      } as SubscriptionStatus);

      const response = await handler.handleLaunchRequest(mockRequestEnvelope);

      const outputSpeech = response.response?.outputSpeech as any;
      expect(outputSpeech?.text).toContain('You have 3 conversations remaining');
    });

    it('should handle returning free user with no usage remaining', async () => {
      // Setup mocks for returning free user at limit
      const mockContext: ConversationContext = {
        userId: 'test-user',
        sessionId: 'test-session',
        messages: [],
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 0
      };
      
      mockSessionManager.getConversationContext.mockResolvedValue(mockContext);
      mockSubscriptionManager.getUserSubscriptionStatus.mockResolvedValue({
        userId: 'test-user',
        tier: 'free',
        dailyUsageCount: 5,
        lastResetDate: new Date()
      } as SubscriptionStatus);

      const response = await handler.handleLaunchRequest(mockRequestEnvelope);

      const outputSpeech = response.response?.outputSpeech as any;
      expect(outputSpeech?.text).toContain('reached your daily limit');
      const card = response.response?.card as any;
      expect(card?.title).toBe('Daily Limit Reached');
    });

    it('should handle errors gracefully', async () => {
      // Setup mocks to throw error
      mockSessionManager.getConversationContext.mockRejectedValue(new Error('Database error'));

      const response = await handler.handleLaunchRequest(mockRequestEnvelope);

      expect(mockAnalyticsService.logError).toHaveBeenCalled();
      const outputSpeech = response.response?.outputSpeech as any;
      expect(outputSpeech?.text).toContain('having a small technical issue');
      expect(response.response?.shouldEndSession).toBe(false);
    });

    it('should handle missing user ID', async () => {
      const requestWithoutUserId = {
        ...mockRequestEnvelope,
        session: {
          ...mockRequestEnvelope.session!,
          user: { userId: undefined as any }
        }
      };

      const response = await handler.handleLaunchRequest(requestWithoutUserId);

      expect(mockAnalyticsService.logError).toHaveBeenCalled();
      const outputSpeech = response.response?.outputSpeech as any;
      expect(outputSpeech?.text).toContain('having a small technical issue');
    });
  });
});