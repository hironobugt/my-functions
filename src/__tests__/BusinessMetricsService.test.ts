import { BusinessMetricsService, ConversationMetric, SubscriptionMetric, UsageMetric, ErrorMetric } from '../services/BusinessMetricsService';
import { CloudWatch } from 'aws-sdk';
import { logger } from '../services/LoggingService';

// Mock AWS SDK
jest.mock('aws-sdk');
jest.mock('../services/LoggingService');

describe('BusinessMetricsService', () => {
  let businessMetricsService: BusinessMetricsService;
  let mockCloudWatch: jest.Mocked<CloudWatch>;
  let mockLogger: jest.Mocked<typeof logger>;

  beforeEach(() => {
    // Mock CloudWatch
    mockCloudWatch = {
      putMetricData: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({})
      }),
      getMetricStatistics: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Datapoints: [
            { Sum: 10, Average: 1200, Timestamp: new Date() },
            { Sum: 15, Average: 1800, Timestamp: new Date() }
          ]
        })
      })
    } as any;

    (CloudWatch as unknown as jest.Mock).mockImplementation(() => mockCloudWatch);

    // Mock logger
    mockLogger = logger as jest.Mocked<typeof logger>;
    mockLogger.info = jest.fn();
    mockLogger.warn = jest.fn();
    mockLogger.error = jest.fn();
    mockLogger.debug = jest.fn();

    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.METRICS_NAMESPACE = 'TestAlexaLLMChat';

    businessMetricsService = new BusinessMetricsService();
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete process.env.METRICS_NAMESPACE;
  });

  describe('constructor', () => {
    it('should initialize with correct default values', () => {
      expect(CloudWatch).toHaveBeenCalledWith({ region: 'us-east-1' });
    });

    it('should use environment variables when available', () => {
      process.env.AWS_REGION = 'us-west-2';
      process.env.METRICS_NAMESPACE = 'CustomNamespace';
      
      new BusinessMetricsService();
      
      expect(CloudWatch).toHaveBeenCalledWith({ region: 'us-west-2' });
    });
  });

  describe('logConversationMetric', () => {
    it('should log conversation metrics successfully', async () => {
      const metric: ConversationMetric = {
        userId: 'user123',
        userTier: 'free',
        intentName: 'ChatIntent',
        responseTime: 1500,
        success: true,
        timestamp: new Date()
      };

      await businessMetricsService.logConversationMetric(metric);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'LLM response generated successfully',
        expect.objectContaining({
          userId: 'user123',
          userTier: 'free',
          intentName: 'ChatIntent',
          responseTime: 1500,
          success: true
        })
      );

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith({
        Namespace: 'TestAlexaLLMChat/Business',
        MetricData: expect.arrayContaining([
          expect.objectContaining({
            MetricName: 'ConversationCount',
            Value: 1,
            Unit: 'Count'
          }),
          expect.objectContaining({
            MetricName: 'ResponseTime',
            Value: 1500,
            Unit: 'Milliseconds'
          }),
          expect.objectContaining({
            MetricName: 'SuccessfulConversations',
            Value: 1,
            Unit: 'Count'
          })
        ])
      });
    });

    it('should log failed conversation metrics', async () => {
      const metric: ConversationMetric = {
        userId: 'user123',
        userTier: 'premium',
        intentName: 'ChatIntent',
        responseTime: 2000,
        success: false,
        timestamp: new Date()
      };

      await businessMetricsService.logConversationMetric(metric);

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith({
        Namespace: 'TestAlexaLLMChat/Business',
        MetricData: expect.arrayContaining([
          expect.objectContaining({
            MetricName: 'FailedConversations',
            Value: 1,
            Unit: 'Count'
          })
        ])
      });
    });

    it('should handle CloudWatch errors gracefully', async () => {
      mockCloudWatch.putMetricData.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('CloudWatch error'))
      } as any);

      const metric: ConversationMetric = {
        userId: 'user123',
        userTier: 'free',
        intentName: 'ChatIntent',
        responseTime: 1500,
        success: true,
        timestamp: new Date()
      };

      await businessMetricsService.logConversationMetric(metric);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to send conversation metrics to CloudWatch',
        expect.any(Error),
        expect.any(Object)
      );
    });
  });

  describe('logSubscriptionMetric', () => {
    it('should log subscription purchase completion', async () => {
      const metric: SubscriptionMetric = {
        userId: 'user123',
        event: 'purchase_completed',
        productId: 'premium_monthly',
        timestamp: new Date()
      };

      await businessMetricsService.logSubscriptionMetric(metric);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Subscription purchase completed',
        expect.objectContaining({
          userId: 'user123',
          subscriptionEvent: 'purchase_completed',
          productId: 'premium_monthly'
        })
      );

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith({
        Namespace: 'TestAlexaLLMChat/Business',
        MetricData: expect.arrayContaining([
          expect.objectContaining({
            MetricName: 'SubscriptionEvents',
            Value: 1,
            Unit: 'Count'
          }),
          expect.objectContaining({
            MetricName: 'SubscriptionPurchases',
            Value: 1,
            Unit: 'Count'
          })
        ])
      });
    });

    it('should log subscription purchase failure', async () => {
      const metric: SubscriptionMetric = {
        userId: 'user123',
        event: 'purchase_failed',
        productId: 'premium_monthly',
        timestamp: new Date()
      };

      await businessMetricsService.logSubscriptionMetric(metric);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Subscription purchase failed',
        expect.objectContaining({
          userId: 'user123',
          subscriptionEvent: 'purchase_failed',
          productId: 'premium_monthly'
        })
      );
    });
  });

  describe('logUsageMetric', () => {
    it('should log usage limit reached', async () => {
      const metric: UsageMetric = {
        userId: 'user123',
        userTier: 'free',
        event: 'limit_reached',
        currentUsage: 5,
        limit: 5,
        timestamp: new Date()
      };

      await businessMetricsService.logUsageMetric(metric);

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Free user usage limit reached',
        expect.objectContaining({
          userId: 'user123',
          userTier: 'free',
          usageEvent: 'limit_reached',
          currentUsage: 5,
          limit: 5
        })
      );

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith({
        Namespace: 'TestAlexaLLMChat/Business',
        MetricData: expect.arrayContaining([
          expect.objectContaining({
            MetricName: 'UsageLimitReached',
            Value: 1,
            Unit: 'Count'
          }),
          expect.objectContaining({
            MetricName: 'CurrentUsage',
            Value: 5,
            Unit: 'Count'
          })
        ])
      });
    });

    it('should log usage reset', async () => {
      const metric: UsageMetric = {
        userId: 'user123',
        userTier: 'free',
        event: 'usage_reset',
        timestamp: new Date()
      };

      await businessMetricsService.logUsageMetric(metric);

      expect(mockLogger.info).toHaveBeenCalledWith(
        'User usage count reset',
        expect.objectContaining({
          userId: 'user123',
          userTier: 'free',
          usageEvent: 'usage_reset'
        })
      );
    });
  });

  describe('logErrorMetric', () => {
    it('should log error metrics with different severities', async () => {
      const metric: ErrorMetric = {
        userId: 'user123',
        errorType: 'API_TIMEOUT',
        operation: 'OPENROUTER_API_CALL',
        severity: 'high',
        timestamp: new Date(),
        additionalData: { requestId: 'req123' }
      };

      await businessMetricsService.logErrorMetric(metric);

      expect(mockLogger.error).toHaveBeenCalledWith(
        'HIGH error in OPENROUTER_API_CALL',
        expect.any(Error),
        expect.objectContaining({
          userId: 'user123',
          errorType: 'API_TIMEOUT',
          operation: 'OPENROUTER_API_CALL',
          severity: 'high',
          requestId: 'req123'
        })
      );

      expect(mockCloudWatch.putMetricData).toHaveBeenCalledWith({
        Namespace: 'TestAlexaLLMChat/Errors',
        MetricData: expect.arrayContaining([
          expect.objectContaining({
            MetricName: 'ErrorCount',
            Value: 1,
            Unit: 'Count'
          }),
          expect.objectContaining({
            MetricName: 'HighErrors',
            Value: 1,
            Unit: 'Count'
          })
        ])
      });
    });
  });

  describe('getBusinessMetricsSummary', () => {
    it('should return business metrics summary', async () => {
      // Mock different responses for different metrics
      mockCloudWatch.getMetricStatistics
        .mockReturnValueOnce({
          promise: jest.fn().mockResolvedValue({
            Datapoints: [{ Sum: 10 }, { Sum: 15 }]
          })
        } as any) // ConversationCount
        .mockReturnValueOnce({
          promise: jest.fn().mockResolvedValue({
            Datapoints: [{ Sum: 8 }, { Sum: 12 }]
          })
        } as any) // FreeUserConversations
        .mockReturnValueOnce({
          promise: jest.fn().mockResolvedValue({
            Datapoints: [{ Sum: 2 }, { Sum: 3 }]
          })
        } as any) // PremiumUserConversations
        .mockReturnValueOnce({
          promise: jest.fn().mockResolvedValue({
            Datapoints: [{ Sum: 1 }, { Sum: 2 }]
          })
        } as any) // SubscriptionPurchases
        .mockReturnValueOnce({
          promise: jest.fn().mockResolvedValue({
            Datapoints: [{ Sum: 0 }, { Sum: 1 }]
          })
        } as any) // UsageLimitReached
        .mockReturnValueOnce({
          promise: jest.fn().mockResolvedValue({
            Datapoints: [{ Average: 1200 }, { Average: 1800 }]
          })
        } as any); // ResponseTime (Average)

      const startTime = new Date('2023-01-01');
      const endTime = new Date('2023-01-02');

      const summary = await businessMetricsService.getBusinessMetricsSummary(startTime, endTime);

      expect(summary).toEqual({
        totalConversations: 25, // 10 + 15
        freeUserConversations: 20, // 8 + 12
        premiumUserConversations: 5, // 2 + 3
        subscriptionPurchases: 3, // 1 + 2
        usageLimitReached: 1, // 0 + 1
        averageResponseTime: 3000 // 1200 + 1800
      });

      expect(mockCloudWatch.getMetricStatistics).toHaveBeenCalledTimes(6);
    });

    it('should handle empty metric data', async () => {
      mockCloudWatch.getMetricStatistics.mockReturnValue({
        promise: jest.fn().mockResolvedValue({ Datapoints: [] })
      } as any);

      const startTime = new Date('2023-01-01');
      const endTime = new Date('2023-01-02');

      const summary = await businessMetricsService.getBusinessMetricsSummary(startTime, endTime);

      expect(summary).toEqual({
        totalConversations: 0,
        freeUserConversations: 0,
        premiumUserConversations: 0,
        subscriptionPurchases: 0,
        usageLimitReached: 0,
        averageResponseTime: 0
      });
    });

    it('should handle CloudWatch errors gracefully', async () => {
      mockCloudWatch.getMetricStatistics.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('CloudWatch error'))
      } as any);

      const startTime = new Date('2023-01-01');
      const endTime = new Date('2023-01-02');

      const summary = await businessMetricsService.getBusinessMetricsSummary(startTime, endTime);

      // Should return zeros when individual metrics fail
      expect(summary).toEqual({
        totalConversations: 0,
        freeUserConversations: 0,
        premiumUserConversations: 0,
        subscriptionPurchases: 0,
        usageLimitReached: 0,
        averageResponseTime: 0
      });

      // Should log errors for each failed metric call
      expect(mockLogger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to get metric statistics for'),
        expect.any(Error)
      );
    });
  });
});