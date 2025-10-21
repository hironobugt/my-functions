import { SubscriptionManager } from '../services/SubscriptionManager';
import { SubscriptionStatusRepository } from '../repositories/SubscriptionStatusRepository';
import { SubscriptionStatus, UserTier, UsageLimitResult } from '../models/SubscriptionStatus';
import { ConfigManager } from '../models/AppConfig';
import { AlexaISPService } from '../services/AlexaISPService';

// Mock the dependencies
jest.mock('../repositories/SubscriptionStatusRepository');
jest.mock('../models/AppConfig');
jest.mock('../services/AlexaISPService');

describe('SubscriptionManager', () => {
  let subscriptionManager: SubscriptionManager;
  let mockRepository: jest.Mocked<SubscriptionStatusRepository>;
  let mockConfigManager: jest.Mocked<ConfigManager>;
  let mockISPService: jest.Mocked<AlexaISPService>;

  const mockUserId = 'test-user-123';
  const mockFreeStatus: SubscriptionStatus = {
    userId: mockUserId,
    tier: 'free',
    dailyUsageCount: 2,
    lastResetDate: new Date()
  };

  const mockPremiumStatus: SubscriptionStatus = {
    userId: mockUserId,
    tier: 'premium',
    subscriptionId: 'sub-123',
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    dailyUsageCount: 10,
    lastResetDate: new Date()
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Create mock repository
    mockRepository = {
      getSubscriptionStatus: jest.fn(),
      saveSubscriptionStatus: jest.fn(),
      checkUsageLimits: jest.fn(),
      incrementUsageCount: jest.fn(),
      upgradeToPremium: jest.fn(),
      downgradeToFree: jest.fn(),
      processExpiredSubscriptions: jest.fn(),
      getUsageStatistics: jest.fn(),
      resetDailyUsageCounts: jest.fn()
    } as any;

    // Create mock ISP service
    mockISPService = {
      getProducts: jest.fn(),
      getProduct: jest.fn(),
      initiatePurchase: jest.fn(),
      handlePurchaseResponse: jest.fn(),
      getUserEntitlements: jest.fn(),
      isEntitled: jest.fn(),
      generatePurchasePrompt: jest.fn(),
      generateProductInfo: jest.fn(),
      handlePurchaseError: jest.fn(),
      validateConfiguration: jest.fn()
    } as any;

    // Create mock config manager
    mockConfigManager = {
      getInstance: jest.fn().mockReturnThis(),
      getConfig: jest.fn().mockReturnValue({
        freeUserDailyLimit: 5,
        openRouterApiKey: 'test-key'
      })
    } as any;

    (ConfigManager.getInstance as jest.Mock).mockReturnValue(mockConfigManager);

    // Create subscription manager instance
    subscriptionManager = new SubscriptionManager({
      subscriptionRepository: mockRepository,
      enableISP: false
    });
  });

  describe('getUserSubscriptionStatus', () => {
    it('should return user subscription status', async () => {
      mockRepository.getSubscriptionStatus.mockResolvedValue(mockFreeStatus);

      const result = await subscriptionManager.getUserSubscriptionStatus(mockUserId);

      expect(result).toEqual(mockFreeStatus);
      expect(mockRepository.getSubscriptionStatus).toHaveBeenCalledWith(mockUserId);
    });

    it('should downgrade expired premium subscription', async () => {
      const expiredStatus: SubscriptionStatus = {
        ...mockPremiumStatus,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
      };

      mockRepository.getSubscriptionStatus.mockResolvedValue(expiredStatus);
      mockRepository.downgradeToFree.mockResolvedValue({
        ...expiredStatus,
        tier: 'free',
        subscriptionId: undefined,
        expiresAt: undefined
      });

      const result = await subscriptionManager.getUserSubscriptionStatus(mockUserId);

      expect(result.tier).toBe('free');
      expect(mockRepository.downgradeToFree).toHaveBeenCalledWith(mockUserId);
    });

    it('should handle repository errors', async () => {
      const error = new Error('Repository error');
      mockRepository.getSubscriptionStatus.mockRejectedValue(error);

      await expect(subscriptionManager.getUserSubscriptionStatus(mockUserId))
        .rejects.toThrow('Failed to get subscription status for user test-user-123: Repository error');
    });
  });

  describe('checkUsageLimits', () => {
    it('should return usage limits from repository', async () => {
      const mockLimits: UsageLimitResult = {
        canProceed: true,
        remainingUsage: 3,
        message: '3 conversations remaining today'
      };

      mockRepository.checkUsageLimits.mockResolvedValue(mockLimits);

      const result = await subscriptionManager.checkUsageLimits(mockUserId);

      expect(result).toEqual(mockLimits);
      expect(mockRepository.checkUsageLimits).toHaveBeenCalledWith(mockUserId);
    });

    it('should handle repository errors', async () => {
      const error = new Error('Limits check error');
      mockRepository.checkUsageLimits.mockRejectedValue(error);

      await expect(subscriptionManager.checkUsageLimits(mockUserId))
        .rejects.toThrow('Failed to check usage limits for user test-user-123: Limits check error');
    });
  });

  describe('incrementUsageCount', () => {
    it('should increment usage count through repository', async () => {
      mockRepository.incrementUsageCount.mockResolvedValue(mockFreeStatus);

      await subscriptionManager.incrementUsageCount(mockUserId);

      expect(mockRepository.incrementUsageCount).toHaveBeenCalledWith(mockUserId);
    });

    it('should handle repository errors', async () => {
      const error = new Error('Increment error');
      mockRepository.incrementUsageCount.mockRejectedValue(error);

      await expect(subscriptionManager.incrementUsageCount(mockUserId))
        .rejects.toThrow('Failed to increment usage count for user test-user-123: Increment error');
    });
  });

  describe('handlePurchaseRequest', () => {
    it('should return error when ISP is not enabled', async () => {
      const result = await subscriptionManager.handlePurchaseRequest(mockUserId, 'premium-monthly');

      expect(result).toEqual({
        success: false,
        error: 'In-skill purchases are not enabled or configured'
      });
    });

    it('should handle successful purchase initiation when ISP is enabled', async () => {
      // Create manager with ISP enabled
      const ispManager = new SubscriptionManager({
        subscriptionRepository: mockRepository,
        alexaISPService: mockISPService,
        enableISP: true
      });

      mockISPService.initiatePurchase.mockResolvedValue({
        success: true,
        transactionId: 'txn-123',
        productId: 'premium-monthly',
        message: 'Purchase initiated'
      });

      const result = await ispManager.handlePurchaseRequest(mockUserId, 'premium-monthly');

      expect(result).toEqual({
        success: true,
        transactionId: 'txn-123'
      });
      expect(mockISPService.initiatePurchase).toHaveBeenCalledWith('premium-monthly', expect.stringContaining('purchase_'));
    });

    it('should handle failed purchase initiation', async () => {
      const ispManager = new SubscriptionManager({
        subscriptionRepository: mockRepository,
        alexaISPService: mockISPService,
        enableISP: true
      });

      mockISPService.initiatePurchase.mockResolvedValue({
        success: false,
        message: 'Product not available'
      });

      const result = await ispManager.handlePurchaseRequest(mockUserId, 'premium-monthly');

      expect(result).toEqual({
        success: false,
        error: 'Product not available'
      });
    });

    it('should handle ISP service errors', async () => {
      const ispManager = new SubscriptionManager({
        subscriptionRepository: mockRepository,
        alexaISPService: mockISPService,
        enableISP: true
      });

      mockISPService.initiatePurchase.mockRejectedValue(new Error('ISP error'));

      const result = await ispManager.handlePurchaseRequest(mockUserId, 'premium-monthly');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Purchase failed: ISP error');
    });
  });

  describe('handlePurchaseResponse', () => {
    let ispManager: SubscriptionManager;

    beforeEach(() => {
      ispManager = new SubscriptionManager({
        subscriptionRepository: mockRepository,
        alexaISPService: mockISPService,
        enableISP: true
      });
    });

    it('should handle accepted purchase response', async () => {
      const purchaseResponse = {
        payload: {
          purchaseResult: 'ACCEPTED'
        }
      };

      mockISPService.handlePurchaseResponse.mockResolvedValue({
        success: true,
        productId: 'premium-monthly',
        purchaseResult: 'ACCEPTED',
        transactionId: 'txn-123'
      });

      mockRepository.upgradeToPremium.mockResolvedValue(mockPremiumStatus);

      const result = await ispManager.handlePurchaseResponse(mockUserId, 'premium-monthly', purchaseResponse);

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('txn-123');
      expect(mockRepository.upgradeToPremium).toHaveBeenCalledWith(
        mockUserId,
        'txn-123',
        expect.any(Date)
      );
    });

    it('should handle declined purchase response', async () => {
      const purchaseResponse = {
        payload: {
          purchaseResult: 'DECLINED'
        }
      };

      mockISPService.handlePurchaseResponse.mockResolvedValue({
        success: false,
        productId: 'premium-monthly',
        purchaseResult: 'DECLINED',
        message: 'Purchase declined by user'
      });

      const result = await ispManager.handlePurchaseResponse(mockUserId, 'premium-monthly', purchaseResponse);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Purchase declined by user');
      expect(mockRepository.upgradeToPremium).not.toHaveBeenCalled();
    });

    it('should handle purchase response without ISP service', async () => {
      const managerWithoutISP = new SubscriptionManager({
        subscriptionRepository: mockRepository,
        enableISP: false
      });

      const result = await managerWithoutISP.handlePurchaseResponse(mockUserId, 'premium-monthly', {});

      expect(result).toEqual({
        success: false,
        error: 'ISP service not configured'
      });
    });

    it('should handle ISP service errors in response handling', async () => {
      mockISPService.handlePurchaseResponse.mockRejectedValue(new Error('Response handling error'));

      const result = await ispManager.handlePurchaseResponse(mockUserId, 'premium-monthly', {});

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to handle purchase response: Response handling error');
    });
  });

  describe('verifySubscription', () => {
    it('should verify subscription locally when ISP is disabled', async () => {
      mockRepository.getSubscriptionStatus.mockResolvedValue(mockPremiumStatus);

      const result = await subscriptionManager.verifySubscription(mockUserId);

      expect(result).toBe(true);
    });

    it('should return false for free users', async () => {
      mockRepository.getSubscriptionStatus.mockResolvedValue(mockFreeStatus);

      const result = await subscriptionManager.verifySubscription(mockUserId);

      expect(result).toBe(false);
    });

    it('should return false for expired premium subscriptions', async () => {
      const expiredStatus: SubscriptionStatus = {
        ...mockPremiumStatus,
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day ago
      };

      const downgradedStatus: SubscriptionStatus = {
        ...expiredStatus,
        tier: 'free',
        subscriptionId: undefined,
        expiresAt: undefined
      };

      mockRepository.getSubscriptionStatus.mockResolvedValue(expiredStatus);
      mockRepository.downgradeToFree.mockResolvedValue(downgradedStatus);

      const result = await subscriptionManager.verifySubscription(mockUserId);

      expect(result).toBe(false);
      expect(mockRepository.downgradeToFree).toHaveBeenCalledWith(mockUserId);
    });
  });

  describe('resetDailyUsage', () => {
    it('should reset daily usage through repository', async () => {
      mockRepository.resetDailyUsageCounts.mockResolvedValue(10);

      await subscriptionManager.resetDailyUsage();

      expect(mockRepository.resetDailyUsageCounts).toHaveBeenCalled();
    });

    it('should handle repository errors', async () => {
      const error = new Error('Reset error');
      mockRepository.resetDailyUsageCounts.mockRejectedValue(error);

      await expect(subscriptionManager.resetDailyUsage())
        .rejects.toThrow('Failed to reset daily usage: Reset error');
    });
  });

  describe('getUserTier', () => {
    it('should return user tier', async () => {
      mockRepository.getSubscriptionStatus.mockResolvedValue(mockPremiumStatus);

      const result = await subscriptionManager.getUserTier(mockUserId);

      expect(result).toBe('premium');
    });

    it('should default to free tier on error', async () => {
      const error = new Error('Get tier error');
      mockRepository.getSubscriptionStatus.mockRejectedValue(error);

      const result = await subscriptionManager.getUserTier(mockUserId);

      expect(result).toBe('free');
    });
  });

  describe('hasPremiumAccess', () => {
    it('should return true for premium users', async () => {
      mockRepository.getSubscriptionStatus.mockResolvedValue(mockPremiumStatus);

      const result = await subscriptionManager.hasPremiumAccess(mockUserId);

      expect(result).toBe(true);
    });

    it('should return false for free users', async () => {
      mockRepository.getSubscriptionStatus.mockResolvedValue(mockFreeStatus);

      const result = await subscriptionManager.hasPremiumAccess(mockUserId);

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      const error = new Error('Access check error');
      mockRepository.getSubscriptionStatus.mockRejectedValue(error);

      const result = await subscriptionManager.hasPremiumAccess(mockUserId);

      expect(result).toBe(false);
    });
  });

  describe('getUserUsageSummary', () => {
    it('should return usage summary', async () => {
      const mockLimits: UsageLimitResult = {
        canProceed: true,
        remainingUsage: 3,
        limitResetTime: new Date()
      };

      mockRepository.getSubscriptionStatus.mockResolvedValue(mockFreeStatus);
      mockRepository.checkUsageLimits.mockResolvedValue(mockLimits);

      const result = await subscriptionManager.getUserUsageSummary(mockUserId);

      expect(result).toEqual({
        tier: 'free',
        dailyUsageCount: 2,
        remainingUsage: 3,
        limitResetTime: mockLimits.limitResetTime
      });
    });

    it('should handle errors', async () => {
      const error = new Error('Summary error');
      mockRepository.getSubscriptionStatus.mockRejectedValue(error);

      await expect(subscriptionManager.getUserUsageSummary(mockUserId))
        .rejects.toThrow('Failed to get usage summary for user test-user-123: Failed to get subscription status for user test-user-123: Summary error');
    });
  });

  describe('canStartConversation', () => {
    it('should allow conversation when user has remaining usage', async () => {
      const mockLimits: UsageLimitResult = {
        canProceed: true,
        remainingUsage: 3,
        message: '3 conversations remaining today'
      };

      mockRepository.checkUsageLimits.mockResolvedValue(mockLimits);

      const result = await subscriptionManager.canStartConversation(mockUserId);

      expect(result).toEqual({
        canProceed: true,
        message: '3 conversations remaining today'
      });
    });

    it('should deny conversation and provide upgrade prompt when limits exceeded', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const mockLimits: UsageLimitResult = {
        canProceed: false,
        remainingUsage: 0,
        limitResetTime: tomorrow,
        message: 'Daily limit reached'
      };

      mockRepository.checkUsageLimits.mockResolvedValue(mockLimits);

      const result = await subscriptionManager.canStartConversation(mockUserId);

      expect(result.canProceed).toBe(false);
      expect(result.message).toBe('Daily limit reached');
      expect(result.upgradePrompt).toContain('You\'ve used all your free conversations for today');
      expect(result.upgradePrompt).toContain('Upgrade to premium');
    });

    it('should handle errors', async () => {
      const error = new Error('Check error');
      mockRepository.checkUsageLimits.mockRejectedValue(error);

      await expect(subscriptionManager.canStartConversation(mockUserId))
        .rejects.toThrow('Failed to check conversation eligibility for user test-user-123: Failed to check usage limits for user test-user-123: Check error');
    });
  });

  describe('enforceUsageLimits', () => {
    it('should allow premium users without limits', async () => {
      mockRepository.getSubscriptionStatus.mockResolvedValue(mockPremiumStatus);

      const result = await subscriptionManager.enforceUsageLimits(mockUserId);

      expect(result).toEqual({
        allowed: true,
        message: 'Premium access - unlimited conversations',
        shouldPromptUpgrade: false
      });
    });

    it('should allow free users within limits', async () => {
      const mockLimits: UsageLimitResult = {
        canProceed: true,
        remainingUsage: 2,
        message: '2 conversations remaining today'
      };

      mockRepository.getSubscriptionStatus.mockResolvedValue(mockFreeStatus);
      mockRepository.checkUsageLimits.mockResolvedValue(mockLimits);

      const result = await subscriptionManager.enforceUsageLimits(mockUserId);

      expect(result).toEqual({
        allowed: true,
        message: '2 conversations remaining today',
        shouldPromptUpgrade: false
      });
    });

    it('should deny free users who exceeded limits and prompt upgrade', async () => {
      const mockLimits: UsageLimitResult = {
        canProceed: false,
        remainingUsage: 0,
        message: 'Daily limit reached'
      };

      mockRepository.getSubscriptionStatus.mockResolvedValue(mockFreeStatus);
      mockRepository.checkUsageLimits.mockResolvedValue(mockLimits);

      const result = await subscriptionManager.enforceUsageLimits(mockUserId);

      expect(result).toEqual({
        allowed: false,
        message: 'You\'ve reached your daily limit of free conversations.',
        shouldPromptUpgrade: true
      });
    });

    it('should allow on error but log the issue', async () => {
      const error = new Error('Enforcement error');
      mockRepository.getSubscriptionStatus.mockRejectedValue(error);

      // Mock console.error to verify it's called
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await subscriptionManager.enforceUsageLimits(mockUserId);

      expect(result).toEqual({
        allowed: true,
        message: 'Usage check temporarily unavailable',
        shouldPromptUpgrade: false
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to enforce usage limits for user test-user-123:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('usage limit scenarios', () => {
    it('should handle daily reset correctly', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const statusWithOldDate: SubscriptionStatus = {
        ...mockFreeStatus,
        dailyUsageCount: 5,
        lastResetDate: new Date(today.getTime() - 24 * 60 * 60 * 1000) // Yesterday
      };

      const resetStatus: SubscriptionStatus = {
        ...statusWithOldDate,
        dailyUsageCount: 0,
        lastResetDate: today
      };

      const mockLimits: UsageLimitResult = {
        canProceed: true,
        remainingUsage: 5,
        message: '5 conversations remaining today'
      };

      mockRepository.getSubscriptionStatus.mockResolvedValue(statusWithOldDate);
      mockRepository.checkUsageLimits.mockResolvedValue(mockLimits);

      const result = await subscriptionManager.checkUsageLimits(mockUserId);

      expect(result.canProceed).toBe(true);
      expect(result.remainingUsage).toBe(5);
    });

    it('should track usage increments correctly', async () => {
      const updatedStatus: SubscriptionStatus = {
        ...mockFreeStatus,
        dailyUsageCount: 3
      };

      mockRepository.incrementUsageCount.mockResolvedValue(updatedStatus);

      await subscriptionManager.incrementUsageCount(mockUserId);

      expect(mockRepository.incrementUsageCount).toHaveBeenCalledWith(mockUserId);
    });

    it('should handle edge case of exactly reaching limit', async () => {
      const mockLimits: UsageLimitResult = {
        canProceed: false,
        remainingUsage: 0,
        message: 'Daily limit reached. Upgrade to premium for unlimited conversations.'
      };

      mockRepository.checkUsageLimits.mockResolvedValue(mockLimits);

      const result = await subscriptionManager.canStartConversation(mockUserId);

      expect(result.canProceed).toBe(false);
      expect(result.upgradePrompt).toContain('Upgrade to premium');
    });
  });

  describe('processExpiredSubscriptions', () => {
    it('should process expired subscriptions through repository', async () => {
      const expiredUserIds = ['user1', 'user2'];
      mockRepository.processExpiredSubscriptions.mockResolvedValue(expiredUserIds);

      const result = await subscriptionManager.processExpiredSubscriptions();

      expect(result).toEqual(expiredUserIds);
      expect(mockRepository.processExpiredSubscriptions).toHaveBeenCalled();
    });

    it('should handle repository errors', async () => {
      const error = new Error('Process error');
      mockRepository.processExpiredSubscriptions.mockRejectedValue(error);

      await expect(subscriptionManager.processExpiredSubscriptions())
        .rejects.toThrow('Failed to process expired subscriptions: Process error');
    });
  });
});