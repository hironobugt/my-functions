import { CloudWatch } from 'aws-sdk';
import { logger, LogContext } from './LoggingService';

export interface ConversationMetric {
  userId: string;
  userTier: 'free' | 'premium';
  intentName: string;
  responseTime: number;
  success: boolean;
  timestamp: Date;
}

export interface SubscriptionMetric {
  userId: string;
  event: 'purchase_initiated' | 'purchase_completed' | 'purchase_failed' | 'subscription_cancelled';
  productId?: string;
  timestamp: Date;
  additionalData?: Record<string, any>;
}

export interface UsageMetric {
  userId: string;
  userTier: 'free' | 'premium';
  event: 'limit_reached' | 'limit_warning' | 'usage_reset';
  currentUsage?: number;
  limit?: number;
  timestamp: Date;
}

export interface ErrorMetric {
  userId?: string;
  errorType: string;
  operation: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  additionalData?: Record<string, any>;
}

export class BusinessMetricsService {
  private cloudWatch: CloudWatch;
  private namespace: string;
  private environment: string;

  constructor() {
    this.cloudWatch = new CloudWatch({ region: process.env.AWS_REGION || 'us-east-1' });
    this.namespace = process.env.METRICS_NAMESPACE || 'AlexaLLMChat';
    this.environment = process.env.NODE_ENV || 'development';
  }

  /**
   * Log conversation metrics for business intelligence
   */
  async logConversationMetric(metric: ConversationMetric): Promise<void> {
    const logContext: LogContext = {
      userId: metric.userId,
      userTier: metric.userTier,
      intentName: metric.intentName,
      responseTime: metric.responseTime,
      success: metric.success
    };

    // Log structured message for CloudWatch Logs metric filters
    logger.info('LLM response generated successfully', logContext);

    // Send custom metrics to CloudWatch
    try {
      const metricData = [
        {
          MetricName: 'ConversationCount',
          Value: 1,
          Unit: 'Count',
          Dimensions: [
            { Name: 'Environment', Value: this.environment },
            { Name: 'UserTier', Value: metric.userTier },
            { Name: 'IntentName', Value: metric.intentName }
          ],
          Timestamp: metric.timestamp
        },
        {
          MetricName: 'ResponseTime',
          Value: metric.responseTime,
          Unit: 'Milliseconds',
          Dimensions: [
            { Name: 'Environment', Value: this.environment },
            { Name: 'UserTier', Value: metric.userTier },
            { Name: 'IntentName', Value: metric.intentName }
          ],
          Timestamp: metric.timestamp
        }
      ];

      if (metric.success) {
        metricData.push({
          MetricName: 'SuccessfulConversations',
          Value: 1,
          Unit: 'Count',
          Dimensions: [
            { Name: 'Environment', Value: this.environment },
            { Name: 'UserTier', Value: metric.userTier }
          ],
          Timestamp: metric.timestamp
        });
      } else {
        metricData.push({
          MetricName: 'FailedConversations',
          Value: 1,
          Unit: 'Count',
          Dimensions: [
            { Name: 'Environment', Value: this.environment },
            { Name: 'UserTier', Value: metric.userTier }
          ],
          Timestamp: metric.timestamp
        });
      }

      await this.cloudWatch.putMetricData({
        Namespace: `${this.namespace}/Business`,
        MetricData: metricData
      }).promise();

      logger.debug('Conversation metrics sent to CloudWatch', logContext);
    } catch (error) {
      logger.error('Failed to send conversation metrics to CloudWatch', 
        error instanceof Error ? error : new Error(String(error)), 
        logContext
      );
    }
  }

  /**
   * Log subscription-related metrics
   */
  async logSubscriptionMetric(metric: SubscriptionMetric): Promise<void> {
    const logContext: LogContext = {
      userId: metric.userId,
      subscriptionEvent: metric.event,
      productId: metric.productId
    };

    // Log structured message for CloudWatch Logs metric filters
    switch (metric.event) {
      case 'purchase_initiated':
        logger.info('Subscription purchase initiated', logContext);
        break;
      case 'purchase_completed':
        logger.info('Subscription purchase completed', logContext);
        break;
      case 'purchase_failed':
        logger.warn('Subscription purchase failed', logContext);
        break;
      case 'subscription_cancelled':
        logger.info('Subscription cancelled', logContext);
        break;
    }

    // Send custom metrics to CloudWatch
    try {
      const metricData = [
        {
          MetricName: 'SubscriptionEvents',
          Value: 1,
          Unit: 'Count',
          Dimensions: [
            { Name: 'Environment', Value: this.environment },
            { Name: 'EventType', Value: metric.event },
            { Name: 'ProductId', Value: metric.productId || 'unknown' }
          ],
          Timestamp: metric.timestamp
        }
      ];

      // Add specific metrics for successful purchases
      if (metric.event === 'purchase_completed') {
        metricData.push({
          MetricName: 'SubscriptionPurchases',
          Value: 1,
          Unit: 'Count',
          Dimensions: [
            { Name: 'Environment', Value: this.environment },
            { Name: 'ProductId', Value: metric.productId || 'unknown' }
          ],
          Timestamp: metric.timestamp
        });
      }

      await this.cloudWatch.putMetricData({
        Namespace: `${this.namespace}/Business`,
        MetricData: metricData
      }).promise();

      logger.debug('Subscription metrics sent to CloudWatch', logContext);
    } catch (error) {
      logger.error('Failed to send subscription metrics to CloudWatch', 
        error instanceof Error ? error : new Error(String(error)), 
        logContext
      );
    }
  }

  /**
   * Log usage-related metrics for free tier monitoring
   */
  async logUsageMetric(metric: UsageMetric): Promise<void> {
    const logContext: LogContext = {
      userId: metric.userId,
      userTier: metric.userTier,
      usageEvent: metric.event,
      currentUsage: metric.currentUsage,
      limit: metric.limit
    };

    // Log structured message for CloudWatch Logs metric filters
    switch (metric.event) {
      case 'limit_reached':
        logger.warn('Free user usage limit reached', logContext);
        break;
      case 'limit_warning':
        logger.info('Free user approaching usage limit', logContext);
        break;
      case 'usage_reset':
        logger.info('User usage count reset', logContext);
        break;
    }

    // Send custom metrics to CloudWatch
    try {
      const metricData = [
        {
          MetricName: 'UsageEvents',
          Value: 1,
          Unit: 'Count',
          Dimensions: [
            { Name: 'Environment', Value: this.environment },
            { Name: 'UserTier', Value: metric.userTier },
            { Name: 'EventType', Value: metric.event }
          ],
          Timestamp: metric.timestamp
        }
      ];

      // Add current usage as a metric
      if (metric.currentUsage !== undefined) {
        metricData.push({
          MetricName: 'CurrentUsage',
          Value: metric.currentUsage,
          Unit: 'Count',
          Dimensions: [
            { Name: 'Environment', Value: this.environment },
            { Name: 'UserTier', Value: metric.userTier }
          ],
          Timestamp: metric.timestamp
        });
      }

      // Track limit reached events specifically
      if (metric.event === 'limit_reached') {
        metricData.push({
          MetricName: 'UsageLimitReached',
          Value: 1,
          Unit: 'Count',
          Dimensions: [
            { Name: 'Environment', Value: this.environment }
          ],
          Timestamp: metric.timestamp
        });
      }

      await this.cloudWatch.putMetricData({
        Namespace: `${this.namespace}/Business`,
        MetricData: metricData
      }).promise();

      logger.debug('Usage metrics sent to CloudWatch', logContext);
    } catch (error) {
      logger.error('Failed to send usage metrics to CloudWatch', 
        error instanceof Error ? error : new Error(String(error)), 
        logContext
      );
    }
  }

  /**
   * Log error metrics for monitoring and alerting
   */
  async logErrorMetric(metric: ErrorMetric): Promise<void> {
    const logContext: LogContext = {
      userId: metric.userId,
      errorType: metric.errorType,
      operation: metric.operation,
      severity: metric.severity,
      ...metric.additionalData
    };

    // Log structured message for CloudWatch Logs metric filters
    logger.error(`${metric.severity.toUpperCase()} error in ${metric.operation}`, 
      new Error(metric.errorType), 
      logContext
    );

    // Send custom metrics to CloudWatch
    try {
      const metricData = [
        {
          MetricName: 'ErrorCount',
          Value: 1,
          Unit: 'Count',
          Dimensions: [
            { Name: 'Environment', Value: this.environment },
            { Name: 'ErrorType', Value: metric.errorType },
            { Name: 'Operation', Value: metric.operation },
            { Name: 'Severity', Value: metric.severity }
          ],
          Timestamp: metric.timestamp
        }
      ];

      // Add severity-specific metrics
      metricData.push({
        MetricName: `${metric.severity.charAt(0).toUpperCase() + metric.severity.slice(1)}Errors`,
        Value: 1,
        Unit: 'Count',
        Dimensions: [
          { Name: 'Environment', Value: this.environment },
          { Name: 'Operation', Value: metric.operation }
        ],
        Timestamp: metric.timestamp
      });

      await this.cloudWatch.putMetricData({
        Namespace: `${this.namespace}/Errors`,
        MetricData: metricData
      }).promise();

      logger.debug('Error metrics sent to CloudWatch', logContext);
    } catch (error) {
      logger.error('Failed to send error metrics to CloudWatch', 
        error instanceof Error ? error : new Error(String(error)), 
        logContext
      );
    }
  }

  /**
   * Get business metrics summary for a time period
   */
  async getBusinessMetricsSummary(
    startTime: Date, 
    endTime: Date
  ): Promise<{
    totalConversations: number;
    freeUserConversations: number;
    premiumUserConversations: number;
    subscriptionPurchases: number;
    usageLimitReached: number;
    averageResponseTime: number;
  }> {
    try {
      const metrics = await Promise.all([
        this.getMetricStatistics('ConversationCount', startTime, endTime),
        this.getMetricStatistics('FreeUserConversations', startTime, endTime),
        this.getMetricStatistics('PremiumUserConversations', startTime, endTime),
        this.getMetricStatistics('SubscriptionPurchases', startTime, endTime),
        this.getMetricStatistics('UsageLimitReached', startTime, endTime),
        this.getMetricStatistics('ResponseTime', startTime, endTime, 'Average')
      ]);

      return {
        totalConversations: metrics[0],
        freeUserConversations: metrics[1],
        premiumUserConversations: metrics[2],
        subscriptionPurchases: metrics[3],
        usageLimitReached: metrics[4],
        averageResponseTime: metrics[5]
      };
    } catch (error) {
      logger.error('Failed to get business metrics summary', 
        error instanceof Error ? error : new Error(String(error))
      );
      throw error;
    }
  }

  /**
   * Helper method to get metric statistics from CloudWatch
   */
  private async getMetricStatistics(
    metricName: string, 
    startTime: Date, 
    endTime: Date, 
    statistic: string = 'Sum'
  ): Promise<number> {
    try {
      const result = await this.cloudWatch.getMetricStatistics({
        Namespace: `${this.namespace}/Business`,
        MetricName: metricName,
        StartTime: startTime,
        EndTime: endTime,
        Period: 3600, // 1 hour periods
        Statistics: [statistic],
        Dimensions: [
          { Name: 'Environment', Value: this.environment }
        ]
      }).promise();

      if (!result.Datapoints || result.Datapoints.length === 0) {
        return 0;
      }

      // Sum all datapoints for the period
      return result.Datapoints.reduce((sum, datapoint) => {
        const value = statistic === 'Sum' ? datapoint.Sum : 
                     statistic === 'Average' ? datapoint.Average :
                     statistic === 'Maximum' ? datapoint.Maximum :
                     datapoint.Minimum;
        return sum + (value || 0);
      }, 0);
    } catch (error) {
      logger.error(`Failed to get metric statistics for ${metricName}`, 
        error instanceof Error ? error : new Error(String(error))
      );
      return 0;
    }
  }
}

// Singleton instance
export const businessMetrics = new BusinessMetricsService();