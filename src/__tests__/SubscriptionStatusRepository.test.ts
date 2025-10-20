import { SubscriptionStatusRepository } from '../repositories/SubscriptionStatusRepository';
import { SubscriptionStatus, UserTier } from '../models/SubscriptionStatus';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

// Mock DynamoDBOperations
jest.mock('../utils/DynamoDBClient', () => ({
  DynamoDBOperations: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    put: jest.fn(),
    scan: jest.fn()
  }))
}));

describe('SubscriptionStatusRepository', () => {
  let repository: SubscriptionStatusRepository;
  let mockDocumentClient: jest.Mocked<DocumentClient>;
  let mockOperations: any;

  const tableName = 'test-subscriptions';
  const userId = 'user123';
  const freeUserDailyLimit = 5;

  beforeEach(() => {
    mockDocumentClient = {} as jest.Mocked<DocumentClient>;
    
    // Get the mocked operations instance
    const { DynamoDBOperations } = require('../utils/DynamoDBClient');
    mockOperations = {
      get: jest.fn(),
      put: jest.fn(),
      scan: jest.fn()
    };
    DynamoDBOperations.mockImplementation(() => mockOperations);

    repository = new SubscriptionStatusRepository(mockDocumentClient, {
      tableName,
      freeUserDailyLimit
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSubscriptionStatus', () => {
    it('should return default free status for new user', async () => {
      mockOperations.get.mockResolvedValue({ Item: null });

      const result = await repository.getSubscriptionStatus(userId);

      expect(result.userId).toBe(userId);
      expect(result.tier).toBe('free');
      expect(result.dailyUsageCount).toBe(0);
      expect(result.lastResetDate).toBeInstanceOf(Date);
    });

    it('should return existing subscription status', async () => {
      const mockItem = {
        userId,
        tier: 'premium',
        subscriptionId: 'sub123',
        expiresAt: '2024-12-31T23:59:59.000Z',
        dailyUsageCount: 10,
        lastResetDate: '2023-01-01T00:00:00.000Z'
      };

      mockOperations.get.mockResolvedValue({ Item: mockItem });

      const result = await repository.getSubscriptionStatus(userId);

      expect(result).toEqual({
        userId,
        tier: 'premium',
        subscriptionId: 'sub123',
        expiresAt: new Date('2024-12-31T23:59:59.000Z'),
        dailyUsageCount: 10,
        lastResetDate: new Date('2023-01-01T00:00:00.000Z')
      });
    });

    it('should throw error when get operation fails', async () => {
      mockOperations.get.mockRejectedValue(new Error('DynamoDB error'));

      await expect(repository.getSubscriptionStatus(userId))
        .rejects.toThrow('Failed to get subscription status for user user123');
    });
  });

  describe('saveSubscriptionStatus', () => {
    it('should save subscription status', async () => {
      const status: SubscriptionStatus = {
        userId,
        tier: 'premium',
        subscriptionId: 'sub123',
        expiresAt: new Date('2024-12-31T23:59:59.000Z'),
        dailyUsageCount: 5,
        lastResetDate: new Date('2023-01-01T00:00:00.000Z')
      };

      mockOperations.put.mockResolvedValue({});

      await repository.saveSubscriptionStatus(status);

      expect(mockOperations.put).toHaveBeenCalledWith({
        TableName: tableName,
        Item: {
          userId,
          tier: 'premium',
          subscriptionId: 'sub123',
          expiresAt: '2024-12-31T23:59:59.000Z',
          dailyUsageCount: 5,
          lastResetDate: '2023-01-01T00:00:00.000Z'
        }
      });
    });

    it('should save free tier status without optional fields', async () => {
      const status: SubscriptionStatus = {
        userId,
        tier: 'free',
        dailyUsageCount: 2,
        lastResetDate: new Date('2023-01-01T00:00:00.000Z')
      };

      mockOperations.put.mockResolvedValue({});

      await repository.saveSubscriptionStatus(status);

      expect(mockOperations.put).toHaveBeenCalledWith({
        TableName: tableName,
        Item: {
          userId,
          tier: 'free',
          dailyUsageCount: 2,
          lastResetDate: '2023-01-01T00:00:00.000Z'
        }
      });
    });
  });

  describe('checkUsageLimits', () => {
    it('should allow unlimited usage for premium users', async () => {
      const premiumStatus = {
        userId,
        tier: 'premium',
        dailyUsageCount: 100,
        lastResetDate: '2023-01-01T00:00:00.000Z'
      };

      mockOperations.get.mockResolvedValue({ Item: premiumStatus });

      const result = await repository.checkUsageLimits(userId);

      expect(result.canProceed).toBe(true);
      expect(result.message).toContain('Premium user');
    });

    it('should check limits for free users within daily limit', async () => {
      const freeStatus = {
        userId,
        tier: 'free',
        dailyUsageCount: 2,
        lastResetDate: new Date().toISOString()
      };

      mockOperations.get.mockResolvedValue({ Item: freeStatus });

      const result = await repository.checkUsageLimits(userId);

      expect(result.canProceed).toBe(true);
      expect(result.remainingUsage).toBe(3);
      expect(result.message).toContain('3 conversations remaining');
    });

    it('should deny usage for free users at daily limit', async () => {
      const freeStatus = {
        userId,
        tier: 'free',
        dailyUsageCount: 5,
        lastResetDate: new Date().toISOString()
      };

      mockOperations.get.mockResolvedValue({ Item: freeStatus });

      const result = await repository.checkUsageLimits(userId);

      expect(result.canProceed).toBe(false);
      expect(result.remainingUsage).toBe(0);
      expect(result.message).toContain('Daily limit reached');
    });

    it('should reset usage count for new day', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const freeStatus = {
        userId,
        tier: 'free',
        dailyUsageCount: 5,
        lastResetDate: yesterday.toISOString()
      };

      mockOperations.get.mockResolvedValue({ Item: freeStatus });
      mockOperations.put.mockResolvedValue({});

      const result = await repository.checkUsageLimits(userId);

      expect(result.canProceed).toBe(true);
      expect(result.remainingUsage).toBe(5);
      expect(mockOperations.put).toHaveBeenCalled();
    });
  });

  describe('incrementUsageCount', () => {
    it('should increment usage count for free users', async () => {
      const freeStatus = {
        userId,
        tier: 'free',
        dailyUsageCount: 2,
        lastResetDate: new Date().toISOString()
      };

      mockOperations.get.mockResolvedValue({ Item: freeStatus });
      mockOperations.put.mockResolvedValue({});

      const result = await repository.incrementUsageCount(userId);

      expect(result.dailyUsageCount).toBe(3);
      expect(mockOperations.put).toHaveBeenCalled();
    });

    it('should not increment usage count for premium users', async () => {
      const premiumStatus = {
        userId,
        tier: 'premium',
        dailyUsageCount: 10,
        lastResetDate: new Date().toISOString()
      };

      mockOperations.get.mockResolvedValue({ Item: premiumStatus });

      const result = await repository.incrementUsageCount(userId);

      expect(result.dailyUsageCount).toBe(10);
      expect(mockOperations.put).not.toHaveBeenCalled();
    });

    it('should reset and increment for new day', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const freeStatus = {
        userId,
        tier: 'free',
        dailyUsageCount: 5,
        lastResetDate: yesterday.toISOString()
      };

      mockOperations.get.mockResolvedValue({ Item: freeStatus });
      mockOperations.put.mockResolvedValue({});

      const result = await repository.incrementUsageCount(userId);

      expect(result.dailyUsageCount).toBe(1);
      expect(mockOperations.put).toHaveBeenCalled();
    });
  });

  describe('upgradeToPremium', () => {
    it('should upgrade user to premium tier', async () => {
      const freeStatus = {
        userId,
        tier: 'free',
        dailyUsageCount: 3,
        lastResetDate: new Date().toISOString()
      };

      const expiresAt = new Date('2024-12-31T23:59:59.000Z');

      mockOperations.get.mockResolvedValue({ Item: freeStatus });
      mockOperations.put.mockResolvedValue({});

      const result = await repository.upgradeToPremium(userId, 'sub123', expiresAt);

      expect(result.tier).toBe('premium');
      expect(result.subscriptionId).toBe('sub123');
      expect(result.expiresAt).toEqual(expiresAt);
      expect(mockOperations.put).toHaveBeenCalled();
    });
  });

  describe('downgradeToFree', () => {
    it('should downgrade user to free tier', async () => {
      const premiumStatus = {
        userId,
        tier: 'premium',
        subscriptionId: 'sub123',
        expiresAt: '2024-12-31T23:59:59.000Z',
        dailyUsageCount: 10,
        lastResetDate: new Date().toISOString()
      };

      mockOperations.get.mockResolvedValue({ Item: premiumStatus });
      mockOperations.put.mockResolvedValue({});

      const result = await repository.downgradeToFree(userId);

      expect(result.tier).toBe('free');
      expect(result.subscriptionId).toBeUndefined();
      expect(result.expiresAt).toBeUndefined();
      expect(mockOperations.put).toHaveBeenCalled();
    });
  });

  describe('processExpiredSubscriptions', () => {
    it('should process expired subscriptions', async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const expiredUsers = [
        {
          userId: 'user1',
          tier: 'premium',
          subscriptionId: 'sub1',
          expiresAt: '2023-01-01T00:00:00.000Z',
          dailyUsageCount: 5,
          lastResetDate: today.toISOString()
        },
        {
          userId: 'user2',
          tier: 'premium',
          subscriptionId: 'sub2',
          expiresAt: '2023-01-01T00:00:00.000Z',
          dailyUsageCount: 10,
          lastResetDate: today.toISOString()
        }
      ];

      mockOperations.scan.mockResolvedValue({ Items: expiredUsers });
      mockOperations.get.mockImplementation((params: any) => {
        const user = expiredUsers.find(u => u.userId === params.Key.userId);
        return Promise.resolve({ Item: user });
      });
      mockOperations.put.mockResolvedValue({});

      const result = await repository.processExpiredSubscriptions();

      expect(result).toEqual(['user1', 'user2']);
      expect(mockOperations.put).toHaveBeenCalledTimes(2);
    });

    it('should return empty array when no expired subscriptions', async () => {
      mockOperations.scan.mockResolvedValue({ Items: [] });

      const result = await repository.processExpiredSubscriptions();

      expect(result).toEqual([]);
      expect(mockOperations.put).not.toHaveBeenCalled();
    });
  });

  describe('getUsageStatistics', () => {
    it('should return usage statistics', async () => {
      const mockItems = [
        { tier: 'free', dailyUsageCount: 3 },
        { tier: 'free', dailyUsageCount: 5 },
        { tier: 'premium', dailyUsageCount: 10 },
        { tier: 'premium', dailyUsageCount: 15 }
      ];

      mockOperations.scan.mockResolvedValue({ Items: mockItems });

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      const result = await repository.getUsageStatistics(startDate, endDate);

      expect(result).toEqual({
        totalUsers: 4,
        freeUsers: 2,
        premiumUsers: 2,
        totalUsage: 33,
        averageUsagePerUser: 8.25
      });
    });

    it('should handle empty results', async () => {
      mockOperations.scan.mockResolvedValue({ Items: [] });

      const startDate = new Date('2023-01-01');
      const endDate = new Date('2023-01-31');
      const result = await repository.getUsageStatistics(startDate, endDate);

      expect(result).toEqual({
        totalUsers: 0,
        freeUsers: 0,
        premiumUsers: 0,
        totalUsage: 0,
        averageUsagePerUser: 0
      });
    });
  });

  describe('resetDailyUsageCounts', () => {
    it('should reset usage counts for users with old reset dates', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const mockItems = [
        {
          userId: 'user1',
          tier: 'free',
          dailyUsageCount: 5,
          lastResetDate: yesterday.toISOString()
        },
        {
          userId: 'user2',
          tier: 'premium',
          dailyUsageCount: 10,
          lastResetDate: yesterday.toISOString()
        }
      ];

      mockOperations.scan.mockResolvedValue({ Items: mockItems });
      mockOperations.put.mockResolvedValue({});

      const result = await repository.resetDailyUsageCounts();

      expect(result).toBe(2);
      expect(mockOperations.put).toHaveBeenCalledTimes(2);
    });

    it('should return 0 when no users need reset', async () => {
      mockOperations.scan.mockResolvedValue({ Items: [] });

      const result = await repository.resetDailyUsageCounts();

      expect(result).toBe(0);
      expect(mockOperations.put).not.toHaveBeenCalled();
    });
  });

  describe('serialization', () => {
    it('should serialize and deserialize subscription status correctly', async () => {
      const originalStatus: SubscriptionStatus = {
        userId,
        tier: 'premium',
        subscriptionId: 'sub123',
        expiresAt: new Date('2024-12-31T23:59:59.000Z'),
        dailyUsageCount: 5,
        lastResetDate: new Date('2023-01-01T00:00:00.000Z')
      };

      mockOperations.put.mockResolvedValue({});
      await repository.saveSubscriptionStatus(originalStatus);

      const serializedItem = mockOperations.put.mock.calls[0][0].Item;
      mockOperations.get.mockResolvedValue({ Item: serializedItem });

      const retrievedStatus = await repository.getSubscriptionStatus(userId);

      expect(retrievedStatus).toEqual(originalStatus);
    });
  });
});