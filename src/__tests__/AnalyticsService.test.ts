import { AnalyticsServiceImpl, DEFAULT_ANALYTICS_CONFIG } from '../services/AnalyticsService';
import { ErrorContext } from '../interfaces/AnalyticsService';
import { DynamoDBClientManager, DynamoDBOperations } from '../utils/DynamoDBClient';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

// Mock the DynamoDB dependencies
jest.mock('../utils/DynamoDBClient');

describe('AnalyticsService', () => {
  let analyticsService: AnalyticsServiceImpl;
  let mockDynamoOperations: jest.Mocked<DynamoDBOperations>;
  let mockDocumentClient: jest.Mocked<DocumentClient>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Mock DynamoDB operations
    mockDynamoOperations = {
      get: jest.fn(),
      put: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      query: jest.fn(),
      scan: jest.fn(),
    } as any;

    mockDocumentClient = {} as jest.Mocked<DocumentClient>;

    // Mock DynamoDBClientManager
    const mockClientManager = {
      getDocumentClient: jest.fn().mockReturnValue(mockDocumentClient),
    };
    (DynamoDBClientManager.getInstance as jest.Mock).mockReturnValue(mockClientManager);

    // Mock DynamoDBOperations constructor
    (DynamoDBOperations as jest.Mock).mockImplementation(() => mockDynamoOperations);

    // Create analytics service with test config
    const testConfig = {
      ...DEFAULT_ANALYTICS_CONFIG,
      flushIntervalMs: 1000, // 1 second for testing
      batchSize: 2, // Small batch size for testing
    };
    analyticsService = new AnalyticsServiceImpl(testConfig);
  });

  afterEach(() => {
    analyticsService.cleanup();
  });

  describe('logConversation', () => {
    it('should add conversation log to batch queue', async () => {
      const userId = 'user123';
      const userTier = 'free';
      const responseTime = 1500;
      const promptLength = 100;
      const responseLength = 200;

      await analyticsService.logConversation(userId, userTier, responseTime, promptLength, responseLength);

      // Should not write immediately (batched)
      expect(mockDynamoOperations.put).not.toHaveBeenCalled();
    });

    it('should flush batch when batch size is reached', async () => {
      mockDynamoOperations.put.mockResolvedValue({});

      // Add two logs to reach batch size of 2
      await analyticsService.logConversation('user1', 'free', 1000, 50, 100);
      await analyticsService.logConversation('user2', 'premium', 1200, 75, 150);

      // Should trigger batch flush
      expect(mockDynamoOperations.put).toHaveBeenCalled();
    });

    it('should include TTL in conversation log', async () => {
      const mockDate = new Date('2023-01-01T00:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      mockDynamoOperations.put.mockResolvedValue({});

      await analyticsService.logConversation('user1', 'free', 1000, 50, 100);
      await analyticsService.logConversation('user2', 'premium', 1200, 75, 150);

      const putCall = mockDynamoOperations.put.mock.calls[0][0];
      expect(putCall.Item.ttl).toBeDefined();
      expect(typeof putCall.Item.ttl).toBe('number');
    });
  });

  describe('logSubscriptionEvent', () => {
    it('should add subscription event to batch queue', async () => {
      await analyticsService.logSubscriptionEvent('user123', 'purchase_completed');

      // Should not write immediately (batched)
      expect(mockDynamoOperations.put).not.toHaveBeenCalled();
    });

    it('should create proper subscription event log structure', async () => {
      mockDynamoOperations.put.mockResolvedValue({});

      await analyticsService.logSubscriptionEvent('user1', 'purchase_initiated');
      await analyticsService.logSubscriptionEvent('user2', 'subscription_activated');

      const putCall = mockDynamoOperations.put.mock.calls[0][0];
      
      expect(putCall.Item).toMatchObject({
        userId: 'user1',
        event: 'purchase_initiated',
        ttl: expect.any(Number),
      });
    });
  });

  describe('logError', () => {
    it('should write error log immediately', async () => {
      mockDynamoOperations.put.mockResolvedValue({});

      const error = new Error('Test error');
      const context: ErrorContext = {
        userId: 'user123',
        intentName: 'ChatIntent',
        errorType: 'LLMServiceError',
        timestamp: new Date(),
      };

      await analyticsService.logError(error, context);

      expect(mockDynamoOperations.put).toHaveBeenCalledWith({
        TableName: DEFAULT_ANALYTICS_CONFIG.errorLogTableName,
        Item: expect.objectContaining({
          errorType: 'LLMServiceError',
          errorMessage: 'Test error',
          userId: 'user123',
          intentName: 'ChatIntent',
          stackTrace: expect.any(String),
        }),
      });
    });

    it('should handle error logging failures gracefully', async () => {
      mockDynamoOperations.put.mockRejectedValue(new Error('DynamoDB error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const error = new Error('Test error');
      const context: ErrorContext = {
        errorType: 'TestError',
        timestamp: new Date(),
      };

      // Should not throw
      await expect(analyticsService.logError(error, context)).resolves.toBeUndefined();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('logSkillLaunch', () => {
    it('should add skill launch log to batch queue', async () => {
      await analyticsService.logSkillLaunch('user123', true);

      // Should not write immediately (batched)
      expect(mockDynamoOperations.put).not.toHaveBeenCalled();
    });

    it('should track new vs returning users', async () => {
      mockDynamoOperations.put.mockResolvedValue({});

      await analyticsService.logSkillLaunch('newUser', true);
      await analyticsService.logSkillLaunch('returningUser', false);

      const firstCall = mockDynamoOperations.put.mock.calls[0][0];
      const secondCall = mockDynamoOperations.put.mock.calls[1][0];
      
      expect(firstCall.Item.isNewUser).toBe(true);
      expect(secondCall.Item.isNewUser).toBe(false);
    });
  });

  describe('logUsageLimitEvent', () => {
    it('should add usage limit event to batch queue', async () => {
      await analyticsService.logUsageLimitEvent('user123', 'daily', true);

      // Should not write immediately (batched)
      expect(mockDynamoOperations.put).not.toHaveBeenCalled();
    });

    it('should track limit type and exceeded status', async () => {
      mockDynamoOperations.put.mockResolvedValue({});

      await analyticsService.logUsageLimitEvent('user1', 'daily', true);
      await analyticsService.logUsageLimitEvent('user2', 'monthly', false);

      const firstCall = mockDynamoOperations.put.mock.calls[0][0];
      const secondCall = mockDynamoOperations.put.mock.calls[1][0];
      
      expect(firstCall.Item).toMatchObject({
        limitType: 'daily',
        exceeded: true,
      });
      expect(secondCall.Item).toMatchObject({
        limitType: 'monthly',
        exceeded: false,
      });
    });
  });

  describe('flushLogs', () => {
    it('should flush all pending logs', async () => {
      mockDynamoOperations.put.mockResolvedValue({});

      // Add some logs to the batch
      await analyticsService.logSkillLaunch('user1', true);
      await analyticsService.logSubscriptionEvent('user2', 'purchase_completed');

      // Manually flush
      await analyticsService.flushLogs();

      expect(mockDynamoOperations.put).toHaveBeenCalled();
    });

    it('should handle empty batch gracefully', async () => {
      await analyticsService.flushLogs();

      expect(mockDynamoOperations.put).not.toHaveBeenCalled();
    });

    it('should group logs by table for batch writing', async () => {
      mockDynamoOperations.put.mockResolvedValue({});

      // Add logs for different tables
      await analyticsService.logSkillLaunch('user1', true);
      await analyticsService.logUsageLimitEvent('user2', 'daily', false);

      await analyticsService.flushLogs();

      // Should make separate batch writes for different tables
      expect(mockDynamoOperations.put).toHaveBeenCalledTimes(2);
    });
  });

  describe('cleanup', () => {
    it('should clear the flush timer', () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      analyticsService.cleanup();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });
  });

  describe('TTL calculation', () => {
    it('should calculate correct TTL based on retention days', async () => {
      const mockDate = new Date('2023-01-01T00:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      mockDynamoOperations.put.mockResolvedValue({});

      await analyticsService.logConversation('user1', 'free', 1000, 50, 100);
      await analyticsService.logConversation('user2', 'premium', 1200, 75, 150);

      const putCall = mockDynamoOperations.put.mock.calls[0][0];
      
      // TTL should be 90 days from now (in seconds)
      const expectedTTL = Math.floor((mockDate.getTime() + (90 * 24 * 60 * 60 * 1000)) / 1000);
      expect(putCall.Item.ttl).toBe(expectedTTL);
    });
  });

  describe('error handling', () => {
    it('should not throw on batch write failures', async () => {
      mockDynamoOperations.put.mockRejectedValue(new Error('DynamoDB error'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Add logs to the batch first
      await analyticsService.logConversation('user1', 'free', 1000, 50, 100);
      
      // Manually flush to trigger the error
      await expect(analyticsService.flushLogs()).resolves.toBeUndefined();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('metrics collection and aggregation', () => {
    beforeEach(() => {
      mockDynamoOperations.scan.mockResolvedValue({ Items: [] });
      mockDynamoOperations.put.mockResolvedValue({});
    });

    describe('aggregateMetrics', () => {
      it('should aggregate metrics for a single date', async () => {
        const mockConversationLogs = [
          {
            id: 'user1#1640995200000',
            userId: 'user1',
            timestamp: new Date('2022-01-01T00:00:00Z'),
            userTier: 'free',
            responseTime: 1000,
            promptLength: 50,
            responseLength: 100,
          },
          {
            id: 'user2#1640995260000',
            userId: 'user2',
            timestamp: new Date('2022-01-01T00:01:00Z'),
            userTier: 'premium',
            responseTime: 1200,
            promptLength: 75,
            responseLength: 150,
          },
        ];

        const mockSkillLaunches = [
          {
            id: 'user1#1640995200000',
            userId: 'user1',
            timestamp: new Date('2022-01-01T00:00:00Z'),
            isNewUser: true,
          },
        ];

        mockDynamoOperations.scan
          .mockResolvedValueOnce({ Items: mockConversationLogs })
          .mockResolvedValueOnce({ Items: [] }) // subscription events
          .mockResolvedValueOnce({ Items: mockSkillLaunches })
          .mockResolvedValueOnce({ Items: [] }) // usage limit events
          .mockResolvedValueOnce({ Items: [] }); // error logs

        const query = {
          startDate: '2022-01-01',
          endDate: '2022-01-01',
          includeUserMetrics: true,
        };

        const result = await analyticsService.aggregateMetrics(query);

        expect(result.dailyMetrics).toMatchObject({
          date: '2022-01-01',
          totalConversations: 2,
          totalUsers: 2,
          freeUserConversations: 1,
          premiumUserConversations: 1,
          averageResponseTime: 1100,
          totalResponseTime: 2200,
          skillLaunches: 1,
          newUsers: 1,
        });

        expect(result.userMetrics).toHaveLength(2);
        expect(mockDynamoOperations.put).toHaveBeenCalledTimes(3); // 1 daily + 2 user metrics
      });

      it('should handle empty data gracefully', async () => {
        mockDynamoOperations.scan.mockResolvedValue({ Items: [] });

        const query = {
          startDate: '2022-01-01',
          endDate: '2022-01-01',
        };

        const result = await analyticsService.aggregateMetrics(query);

        expect(result.dailyMetrics).toMatchObject({
          date: '2022-01-01',
          totalConversations: 0,
          totalUsers: 0,
          averageResponseTime: 0,
        });

        expect(result.userMetrics).toHaveLength(0);
      });

      it('should filter by userId when specified', async () => {
        const mockConversationLogs = [
          {
            id: 'user1#1640995200000',
            userId: 'user1',
            timestamp: new Date('2022-01-01T00:00:00Z'),
            userTier: 'free',
            responseTime: 1000,
            promptLength: 50,
            responseLength: 100,
          },
          {
            id: 'user2#1640995260000',
            userId: 'user2',
            timestamp: new Date('2022-01-01T00:01:00Z'),
            userTier: 'premium',
            responseTime: 1200,
            promptLength: 75,
            responseLength: 150,
          },
        ];

        mockDynamoOperations.scan
          .mockResolvedValueOnce({ Items: mockConversationLogs })
          .mockResolvedValueOnce({ Items: [] })
          .mockResolvedValueOnce({ Items: [] })
          .mockResolvedValueOnce({ Items: [] })
          .mockResolvedValueOnce({ Items: [] });

        const query = {
          startDate: '2022-01-01',
          endDate: '2022-01-01',
          userId: 'user1',
          includeUserMetrics: true,
        };

        const result = await analyticsService.aggregateMetrics(query);

        // Should still aggregate all conversations for daily metrics
        expect(result.dailyMetrics.totalConversations).toBe(2);
        
        // But user metrics should only include user1
        expect(result.userMetrics).toHaveLength(1);
        expect(result.userMetrics[0].userId).toBe('user1');
      });

      it('should handle scan errors gracefully', async () => {
        mockDynamoOperations.scan.mockRejectedValue(new Error('Scan error'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const query = {
          startDate: '2022-01-01',
          endDate: '2022-01-01',
        };

        const result = await analyticsService.aggregateMetrics(query);

        expect(result.dailyMetrics.totalConversations).toBe(0);
        expect(consoleSpy).toHaveBeenCalled();

        consoleSpy.mockRestore();
      });
    });

    describe('getDailyMetrics', () => {
      it('should retrieve daily metrics for date range', async () => {
        const mockMetrics = [
          {
            date: '2022-01-01',
            totalConversations: 10,
            totalUsers: 5,
            uniqueUsersList: ['user1', 'user2', 'user3'],
            lastUpdated: '2022-01-01T12:00:00Z',
          },
          {
            date: '2022-01-02',
            totalConversations: 15,
            totalUsers: 7,
            uniqueUsersList: ['user1', 'user2', 'user4'],
            lastUpdated: '2022-01-02T12:00:00Z',
          },
        ];

        mockDynamoOperations.query.mockResolvedValue({ Items: mockMetrics });

        const result = await analyticsService.getDailyMetrics('2022-01-01', '2022-01-02');

        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
          date: '2022-01-01',
          totalConversations: 10,
          totalUsers: 5,
        });
        expect(result[0].uniqueUsers).toBeInstanceOf(Set);
        expect(result[0].uniqueUsers.size).toBe(3);
        expect(result[0].lastUpdated).toBeInstanceOf(Date);
      });

      it('should handle query errors gracefully', async () => {
        mockDynamoOperations.query.mockRejectedValue(new Error('Query error'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await analyticsService.getDailyMetrics('2022-01-01', '2022-01-02');

        expect(result).toHaveLength(0);
        expect(consoleSpy).toHaveBeenCalledWith('Failed to get daily metrics:', expect.any(Error));

        consoleSpy.mockRestore();
      });

      it('should handle empty results', async () => {
        mockDynamoOperations.query.mockResolvedValue({ Items: [] });

        const result = await analyticsService.getDailyMetrics('2022-01-01', '2022-01-02');

        expect(result).toHaveLength(0);
      });
    });

    describe('getUserMetrics', () => {
      it('should retrieve user metrics for specific user and date range', async () => {
        const mockUserMetrics = [
          {
            userId: 'user1',
            date: '2022-01-01',
            conversationCount: 5,
            averageResponseTime: 1200,
            userTier: 'premium',
            lastActivity: '2022-01-01T15:30:00Z',
          },
          {
            userId: 'user1',
            date: '2022-01-02',
            conversationCount: 3,
            averageResponseTime: 1100,
            userTier: 'premium',
            lastActivity: '2022-01-02T10:15:00Z',
          },
        ];

        mockDynamoOperations.query.mockResolvedValue({ Items: mockUserMetrics });

        const result = await analyticsService.getUserMetrics('user1', '2022-01-01', '2022-01-02');

        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({
          userId: 'user1',
          date: '2022-01-01',
          conversationCount: 5,
          userTier: 'premium',
        });
        expect(result[0].lastActivity).toBeInstanceOf(Date);
      });

      it('should handle query errors gracefully', async () => {
        mockDynamoOperations.query.mockRejectedValue(new Error('Query error'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const result = await analyticsService.getUserMetrics('user1', '2022-01-01', '2022-01-02');

        expect(result).toHaveLength(0);
        expect(consoleSpy).toHaveBeenCalledWith('Failed to get user metrics:', expect.any(Error));

        consoleSpy.mockRestore();
      });
    });

    describe('metrics storage', () => {
      it('should store daily metrics with converted Set to Array', async () => {
        const mockConversationLogs = [
          {
            id: 'user1#1640995200000',
            userId: 'user1',
            timestamp: new Date('2022-01-01T00:00:00Z'),
            userTier: 'free',
            responseTime: 1000,
            promptLength: 50,
            responseLength: 100,
          },
        ];

        mockDynamoOperations.scan
          .mockResolvedValueOnce({ Items: mockConversationLogs })
          .mockResolvedValueOnce({ Items: [] })
          .mockResolvedValueOnce({ Items: [] })
          .mockResolvedValueOnce({ Items: [] })
          .mockResolvedValueOnce({ Items: [] });

        const query = {
          startDate: '2022-01-01',
          endDate: '2022-01-01',
        };

        await analyticsService.aggregateMetrics(query);

        // Check that daily metrics were stored with uniqueUsersList instead of uniqueUsers Set
        const dailyMetricsPutCall = mockDynamoOperations.put.mock.calls.find(call => 
          call[0].TableName === DEFAULT_ANALYTICS_CONFIG.dailyMetricsTableName
        );

        expect(dailyMetricsPutCall).toBeDefined();
        expect(dailyMetricsPutCall![0].Item.uniqueUsersList).toEqual(['user1']);
        expect(dailyMetricsPutCall![0].Item.uniqueUsers).toBeUndefined();
      });

      it('should handle storage errors gracefully', async () => {
        mockDynamoOperations.scan.mockResolvedValue({ Items: [] });
        mockDynamoOperations.put.mockRejectedValue(new Error('Storage error'));
        const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

        const query = {
          startDate: '2022-01-01',
          endDate: '2022-01-01',
        };

        await expect(analyticsService.aggregateMetrics(query)).resolves.toBeDefined();
        expect(consoleSpy).toHaveBeenCalledWith('Failed to store aggregated metrics:', expect.any(Error));

        consoleSpy.mockRestore();
      });
    });
  });
});