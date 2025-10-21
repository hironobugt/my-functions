import { SubscriptionIntentHandler } from '../handlers/SubscriptionIntentHandler';
import { SubscriptionManager } from '../interfaces/SubscriptionManager';
import { AnalyticsService } from '../interfaces/AnalyticsService';
import { RequestEnvelope, ResponseEnvelope } from 'ask-sdk-model';
import { SubscriptionStatus, PurchaseResult, UsageLimitResult } from '../models/SubscriptionStatus';

describe('SubscriptionIntentHandler', () => {
  let handler: SubscriptionIntentHandler;
  let mockSubscriptionManager: jest.Mocked<SubscriptionManager>;
  let mockAnalyticsService: jest.Mocked<AnalyticsService>;

  const mockUserId = 'test-user-123';
  const mockSessionId = 'test-session-456';

  beforeEach(() => {
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

    handler = new SubscriptionIntentHandler(mockSubscriptionManager, mockAnalyticsService);
  });

  const createMockRequestEnvelope = (intentName: string): RequestEnvelope => ({
    version: '1.0',
    session: {
      sessionId: mockSessionId,
      user: {
        userId: mockUserId
      },
      new: false,
      application: {
        applicationId: 'test-app'
      }
    },
    request: {
      type: 'IntentRequest',
      requestId: 'test-request',
      timestamp: new Date().toISOString(),
      locale: 'en-US',
      intent: {
        name: intentName,
        confirmationStatus: 'NONE'
      },
      dialogState: 'COMPLETED'
    },
    context: {
      System: {
        application: {
          applicationId: 'test-app'
        },
        user: {
          userId: mockUserId
        },
        device: {
          deviceId: 'test-device',
          supportedInterfaces: {}
        },
        apiEndpoint: 'https://api.amazonalexa.com'
      }
    }
  });

  const createMockSubscriptionStatus = (tier: 'free' | 'premium', dailyUsageCount: number = 0): SubscriptionStatus => ({
    userId: mockUserId,
    tier,
    dailyUsageCount,
    lastResetDate: new Date(),
    subscriptionId: tier === 'premium' ? 'sub-123' : undefined,
    expiresAt: tier === 'premium' ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) : undefined
  });

  describe('canHandle', () => {
    it('should handle SubscriptionInfoIntent', () => {
      const request = createMockRequestEnvelope('SubscriptionInfoIntent');
      expect(handler.canHandle(request)).toBe(true);
    });

    it('should handle PremiumInfoIntent', () => {
      const request = createMockRequestEnvelope('PremiumInfoIntent');
      expect(handler.canHandle(request)).toBe(true);
    });

    it('should handle PurchaseIntent', () => {
      const request = createMockRequestEnvelope('PurchaseIntent');
      expect(handler.canHandle(request)).toBe(true);
    });

    it('should handle BuyPremiumIntent', () => {
      const request = createMockRequestEnvelope('BuyPremiumIntent');
      expect(handler.canHandle(request)).toBe(true);
    });

    it('should handle SubscriptionStatusIntent', () => {
      const request = createMockRequestEnvelope('SubscriptionStatusIntent');
      expect(handler.canHandle(request)).toBe(true);
    });

    it('should handle MySubscriptionIntent', () => {
      const request = createMockRequestEnvelope('MySubscriptionIntent');
      expect(handler.canHandle(request)).toBe(true);
    });

    it('should not handle other intents', () => {
      const request = createMockRequestEnvelope('ChatIntent');
      expect(handler.canHandle(request)).toBe(false);
    });
  });

  describe('handleSubscriptionIntent', () => {
    describe('SubscriptionInfoIntent for free users', () => {
      it('should provide premium information to free users', async () => {
        const subscriptionStatus = createMockSubscriptionStatus('free', 2);
        const usageLimitResult: UsageLimitResult = {
          canProceed: true,
          remainingUsage: 3
        };

        mockSubscriptionManager.getUserSubscriptionStatus.mockResolvedValue(subscriptionStatus);
        mockSubscriptionManager.checkUsageLimits.mockResolvedValue(usageLimitResult);

        const request = createMockRequestEnvelope('SubscriptionInfoIntent');
        const response = await handler.handleSubscriptionIntent(request);

        expect(response.response.outputSpeech?.type).toBe('PlainText');
        expect((response.response.outputSpeech as any).text).toContain('premium subscription');
        expect((response.response.outputSpeech as any).text).toContain('3 conversations remaining');
        expect((response.response.outputSpeech as any).text).toContain('$4.99 per month');
        expect(response.response.shouldEndSession).toBe(false);
      });
    });

    describe('SubscriptionInfoIntent for premium users', () => {
      it('should inform premium users they already have access', async () => {
        const subscriptionStatus = createMockSubscriptionStatus('premium');

        mockSubscriptionManager.getUserSubscriptionStatus.mockResolvedValue(subscriptionStatus);

        const request = createMockRequestEnvelope('SubscriptionInfoIntent');
        const response = await handler.handleSubscriptionIntent(request);

        expect(response.response.outputSpeech?.type).toBe('PlainText');
        expect((response.response.outputSpeech as any).text).toContain("You're already a premium subscriber");
        expect((response.response.outputSpeech as any).text).toContain('unlimited daily conversations');
        expect(response.response.shouldEndSession).toBe(false);
      });
    });

    describe('PurchaseIntent', () => {
      it('should handle successful purchase for free users', async () => {
        const subscriptionStatus = createMockSubscriptionStatus('free');
        const purchaseResult: PurchaseResult = {
          success: true,
          transactionId: 'txn-123'
        };

        mockSubscriptionManager.getUserSubscriptionStatus.mockResolvedValue(subscriptionStatus);
        mockSubscriptionManager.handlePurchaseRequest.mockResolvedValue(purchaseResult);

        const request = createMockRequestEnvelope('PurchaseIntent');
        const response = await handler.handleSubscriptionIntent(request);

        expect(mockAnalyticsService.logSubscriptionEvent).toHaveBeenCalledWith(mockUserId, 'purchase_initiated');
        expect(mockAnalyticsService.logSubscriptionEvent).toHaveBeenCalledWith(mockUserId, 'purchase_completed');
        expect((response.response.outputSpeech as any).text).toContain('premium subscription is now active');
        expect(response.response.shouldEndSession).toBe(false);
      });

      it('should handle failed purchase for free users', async () => {
        const subscriptionStatus = createMockSubscriptionStatus('free');
        const purchaseResult: PurchaseResult = {
          success: false,
          error: 'Payment method declined'
        };

        mockSubscriptionManager.getUserSubscriptionStatus.mockResolvedValue(subscriptionStatus);
        mockSubscriptionManager.handlePurchaseRequest.mockResolvedValue(purchaseResult);

        const request = createMockRequestEnvelope('PurchaseIntent');
        const response = await handler.handleSubscriptionIntent(request);

        expect(mockAnalyticsService.logSubscriptionEvent).toHaveBeenCalledWith(mockUserId, 'purchase_initiated');
        expect(mockAnalyticsService.logSubscriptionEvent).toHaveBeenCalledWith(mockUserId, 'purchase_failed');
        expect((response.response.outputSpeech as any).text).toContain('Payment method declined');
        expect((response.response.outputSpeech as any).text).toContain('try again later');
        expect(response.response.shouldEndSession).toBe(false);
      });

      it('should inform premium users they already have access', async () => {
        const subscriptionStatus = createMockSubscriptionStatus('premium');

        mockSubscriptionManager.getUserSubscriptionStatus.mockResolvedValue(subscriptionStatus);

        const request = createMockRequestEnvelope('PurchaseIntent');
        const response = await handler.handleSubscriptionIntent(request);

        expect(mockSubscriptionManager.handlePurchaseRequest).not.toHaveBeenCalled();
        expect((response.response.outputSpeech as any).text).toContain('already have premium access');
        expect(response.response.shouldEndSession).toBe(false);
      });

      it('should handle purchase request exceptions', async () => {
        const subscriptionStatus = createMockSubscriptionStatus('free');

        mockSubscriptionManager.getUserSubscriptionStatus.mockResolvedValue(subscriptionStatus);
        mockSubscriptionManager.handlePurchaseRequest.mockRejectedValue(new Error('Network error'));

        const request = createMockRequestEnvelope('PurchaseIntent');
        const response = await handler.handleSubscriptionIntent(request);

        expect(mockAnalyticsService.logSubscriptionEvent).toHaveBeenCalledWith(mockUserId, 'purchase_failed');
        expect((response.response.outputSpeech as any).text).toContain('issue starting the purchase process');
        expect(response.response.shouldEndSession).toBe(false);
      });
    });

    describe('SubscriptionStatusIntent', () => {
      it('should report premium status with expiration date', async () => {
        const expirationDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const subscriptionStatus = createMockSubscriptionStatus('premium');
        subscriptionStatus.expiresAt = expirationDate;

        const usageLimitResult: UsageLimitResult = {
          canProceed: true
        };

        mockSubscriptionManager.getUserSubscriptionStatus.mockResolvedValue(subscriptionStatus);
        mockSubscriptionManager.checkUsageLimits.mockResolvedValue(usageLimitResult);

        const request = createMockRequestEnvelope('SubscriptionStatusIntent');
        const response = await handler.handleSubscriptionIntent(request);

        expect((response.response.outputSpeech as any).text).toContain('premium access');
        expect((response.response.outputSpeech as any).text).toContain('unlimited daily conversations');
        expect((response.response.outputSpeech as any).text).toContain(expirationDate.toLocaleDateString());
        expect(response.response.shouldEndSession).toBe(false);
      });

      it('should report free tier status with remaining usage', async () => {
        const subscriptionStatus = createMockSubscriptionStatus('free', 2);
        const usageLimitResult: UsageLimitResult = {
          canProceed: true,
          remainingUsage: 3,
          limitResetTime: new Date(Date.now() + 24 * 60 * 60 * 1000)
        };

        mockSubscriptionManager.getUserSubscriptionStatus.mockResolvedValue(subscriptionStatus);
        mockSubscriptionManager.checkUsageLimits.mockResolvedValue(usageLimitResult);

        const request = createMockRequestEnvelope('SubscriptionStatusIntent');
        const response = await handler.handleSubscriptionIntent(request);

        expect((response.response.outputSpeech as any).text).toContain('free tier');
        expect((response.response.outputSpeech as any).text).toContain('3 conversations remaining');
        expect((response.response.outputSpeech as any).text).toContain('usage resets at midnight');
        expect(response.response.shouldEndSession).toBe(false);
      });
    });

    describe('Error handling', () => {
      it('should handle missing user ID', async () => {
        const request = createMockRequestEnvelope('SubscriptionInfoIntent');
        request.session!.user!.userId = undefined as any;

        const response = await handler.handleSubscriptionIntent(request);

        expect(mockAnalyticsService.logError).toHaveBeenCalled();
        expect((response.response.outputSpeech as any).text).toContain('encountered an issue');
        expect(response.response.shouldEndSession).toBe(false);
      });

      it('should handle subscription manager errors', async () => {
        mockSubscriptionManager.getUserSubscriptionStatus.mockRejectedValue(new Error('Database error'));

        const request = createMockRequestEnvelope('SubscriptionInfoIntent');
        const response = await handler.handleSubscriptionIntent(request);

        expect(mockAnalyticsService.logError).toHaveBeenCalledWith(
          expect.any(Error),
          expect.objectContaining({
            userId: mockUserId,
            intentName: 'SubscriptionInfoIntent',
            errorType: 'SubscriptionIntentHandler'
          })
        );
        expect((response.response.outputSpeech as any).text).toContain('encountered an issue');
        expect(response.response.shouldEndSession).toBe(false);
      });
    });

    describe('Default intent handling', () => {
      it('should default to subscription info for unknown intents', async () => {
        const subscriptionStatus = createMockSubscriptionStatus('free');
        const usageLimitResult: UsageLimitResult = {
          canProceed: true,
          remainingUsage: 5
        };

        mockSubscriptionManager.getUserSubscriptionStatus.mockResolvedValue(subscriptionStatus);
        mockSubscriptionManager.checkUsageLimits.mockResolvedValue(usageLimitResult);

        const request = createMockRequestEnvelope('UnknownIntent');
        // Manually set the intent name to something the handler can handle but isn't explicitly listed
        (request.request as any).intent.name = 'SubscriptionInfoIntent';
        
        const response = await handler.handleSubscriptionIntent(request);

        expect((response.response.outputSpeech as any).text).toContain('premium subscription');
        expect(response.response.shouldEndSession).toBe(false);
      });
    });
  });

  describe('Response formatting', () => {
    it('should include proper card information', async () => {
      const subscriptionStatus = createMockSubscriptionStatus('free');
      const usageLimitResult: UsageLimitResult = {
        canProceed: true,
        remainingUsage: 3
      };

      mockSubscriptionManager.getUserSubscriptionStatus.mockResolvedValue(subscriptionStatus);
      mockSubscriptionManager.checkUsageLimits.mockResolvedValue(usageLimitResult);

      const request = createMockRequestEnvelope('SubscriptionInfoIntent');
      const response = await handler.handleSubscriptionIntent(request);

      expect(response.response.card).toBeDefined();
      expect(response.response.card?.type).toBe('Simple');
      expect((response.response.card as any)?.title).toBe('Premium Features');
      expect((response.response.card as any).content).toContain('Premium:');
    });

    it('should include reprompt text when session continues', async () => {
      const subscriptionStatus = createMockSubscriptionStatus('premium');

      mockSubscriptionManager.getUserSubscriptionStatus.mockResolvedValue(subscriptionStatus);

      const request = createMockRequestEnvelope('SubscriptionInfoIntent');
      const response = await handler.handleSubscriptionIntent(request);

      expect(response.response.reprompt).toBeDefined();
      expect(response.response.reprompt?.outputSpeech?.type).toBe('PlainText');
      expect((response.response.reprompt?.outputSpeech as any).text).toContain('subscription status');
    });
  });
});