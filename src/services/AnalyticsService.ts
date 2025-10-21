import { AnalyticsService, ErrorContext } from '../interfaces/AnalyticsService';
import { UserTier, SubscriptionEvent } from '../models/SubscriptionStatus';
import { DynamoDBClientManager, DynamoDBOperations } from '../utils/DynamoDBClient';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

/**
 * Analytics data models for DynamoDB storage
 */
export interface ConversationLog {
  id: string; // Partition key: userId#timestamp
  userId: string;
  timestamp: Date;
  userTier: UserTier;
  responseTime: number;
  promptLength: number;
  responseLength: number;
  ttl?: number; // TTL for automatic cleanup
}

export interface SubscriptionEventLog {
  id: string; // Partition key: userId#timestamp
  userId: string;
  timestamp: Date;
  event: SubscriptionEvent;
  subscriptionId?: string;
  transactionId?: string;
  additionalData?: Record<string, any>;
  ttl?: number;
}

export interface ErrorLog {
  id: string; // Partition key: errorType#timestamp
  timestamp: Date;
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  userId?: string;
  intentName?: string;
  additionalData?: Record<string, any>;
  ttl?: number;
}

export interface SkillLaunchLog {
  id: string; // Partition key: userId#timestamp
  userId: string;
  timestamp: Date;
  isNewUser: boolean;
  ttl?: number;
}

export interface UsageLimitLog {
  id: string; // Partition key: userId#timestamp
  userId: string;
  timestamp: Date;
  limitType: 'daily' | 'monthly';
  exceeded: boolean;
  currentUsage?: number;
  limit?: number;
  ttl?: number;
}

/**
 * Aggregated metrics data structures
 */
export interface DailyMetrics {
  date: string; // YYYY-MM-DD format (partition key)
  totalConversations: number;
  totalUsers: number;
  uniqueUsers: Set<string>;
  freeUserConversations: number;
  premiumUserConversations: number;
  averageResponseTime: number;
  totalResponseTime: number;
  errorCount: number;
  subscriptionEvents: Record<SubscriptionEvent, number>;
  skillLaunches: number;
  newUsers: number;
  usageLimitExceeded: number;
  lastUpdated: Date;
  ttl?: number;
}

export interface UserMetrics {
  userId: string; // Partition key
  date: string; // Sort key: YYYY-MM-DD
  conversationCount: number;
  totalResponseTime: number;
  averageResponseTime: number;
  userTier: UserTier;
  skillLaunches: number;
  isNewUser: boolean;
  usageLimitExceeded: boolean;
  subscriptionEvents: SubscriptionEvent[];
  lastActivity: Date;
  ttl?: number;
}

export interface MetricsAggregationResult {
  dailyMetrics: DailyMetrics;
  userMetrics: UserMetrics[];
}

export interface MetricsQuery {
  startDate: string;
  endDate: string;
  userId?: string;
  userTier?: UserTier;
  includeUserMetrics?: boolean;
}

/**
 * Configuration for analytics service
 */
export interface AnalyticsConfig {
  conversationTableName: string;
  subscriptionEventTableName: string;
  errorLogTableName: string;
  skillLaunchTableName: string;
  usageLimitTableName: string;
  dailyMetricsTableName: string;
  userMetricsTableName: string;
  dataRetentionDays: number;
  batchSize: number;
  flushIntervalMs: number;
}

/**
 * Default analytics configuration
 */
export const DEFAULT_ANALYTICS_CONFIG: AnalyticsConfig = {
  conversationTableName: process.env.CONVERSATION_LOG_TABLE || 'alexa-llm-conversation-logs',
  subscriptionEventTableName: process.env.SUBSCRIPTION_EVENT_TABLE || 'alexa-llm-subscription-events',
  errorLogTableName: process.env.ERROR_LOG_TABLE || 'alexa-llm-error-logs',
  skillLaunchTableName: process.env.SKILL_LAUNCH_TABLE || 'alexa-llm-skill-launches',
  usageLimitTableName: process.env.USAGE_LIMIT_TABLE || 'alexa-llm-usage-limits',
  dailyMetricsTableName: process.env.DAILY_METRICS_TABLE || 'alexa-llm-daily-metrics',
  userMetricsTableName: process.env.USER_METRICS_TABLE || 'alexa-llm-user-metrics',
  dataRetentionDays: parseInt(process.env.ANALYTICS_RETENTION_DAYS || '90', 10),
  batchSize: parseInt(process.env.ANALYTICS_BATCH_SIZE || '25', 10),
  flushIntervalMs: parseInt(process.env.ANALYTICS_FLUSH_INTERVAL_MS || '5000', 10),
};

/**
 * Analytics service implementation with DynamoDB storage
 */
export class AnalyticsServiceImpl implements AnalyticsService {
  private dynamoOperations: DynamoDBOperations;
  private config: AnalyticsConfig;
  private pendingLogs: Array<{ table: string; item: any }> = [];
  private flushTimer?: NodeJS.Timeout;

  constructor(config: AnalyticsConfig = DEFAULT_ANALYTICS_CONFIG) {
    this.config = config;
    const dynamoClient = DynamoDBClientManager.getInstance();
    this.dynamoOperations = new DynamoDBOperations(dynamoClient.getDocumentClient());
    
    // Start batch flush timer
    this.startBatchFlushTimer();
  }

  /**
   * Log conversation interaction
   */
  public async logConversation(
    userId: string,
    userTier: UserTier,
    responseTime: number,
    promptLength: number,
    responseLength: number
  ): Promise<void> {
    const timestamp = new Date();
    const id = `${userId}#${timestamp.getTime()}`;
    
    const conversationLog: ConversationLog = {
      id,
      userId,
      timestamp,
      userTier,
      responseTime,
      promptLength,
      responseLength,
      ttl: this.calculateTTL(timestamp),
    };

    await this.addToBatch(this.config.conversationTableName, conversationLog);
  }

  /**
   * Log subscription-related events
   */
  public async logSubscriptionEvent(userId: string, event: SubscriptionEvent): Promise<void> {
    const timestamp = new Date();
    const id = `${userId}#${timestamp.getTime()}`;
    
    const subscriptionEventLog: SubscriptionEventLog = {
      id,
      userId,
      timestamp,
      event,
      ttl: this.calculateTTL(timestamp),
    };

    await this.addToBatch(this.config.subscriptionEventTableName, subscriptionEventLog);
  }

  /**
   * Log errors with context
   */
  public async logError(error: Error, context: ErrorContext): Promise<void> {
    const timestamp = new Date();
    const id = `${context.errorType}#${timestamp.getTime()}`;
    
    const errorLog: ErrorLog = {
      id,
      timestamp,
      errorType: context.errorType,
      errorMessage: error.message,
      stackTrace: error.stack,
      userId: context.userId,
      intentName: context.intentName,
      additionalData: context.additionalData,
      ttl: this.calculateTTL(timestamp),
    };

    // Error logs are written immediately for debugging purposes
    await this.writeLogItem(this.config.errorLogTableName, errorLog);
  }

  /**
   * Log skill launch events
   */
  public async logSkillLaunch(userId: string, isNewUser: boolean): Promise<void> {
    const timestamp = new Date();
    const id = `${userId}#${timestamp.getTime()}`;
    
    const skillLaunchLog: SkillLaunchLog = {
      id,
      userId,
      timestamp,
      isNewUser,
      ttl: this.calculateTTL(timestamp),
    };

    await this.addToBatch(this.config.skillLaunchTableName, skillLaunchLog);
  }

  /**
   * Log usage limit events
   */
  public async logUsageLimitEvent(
    userId: string,
    limitType: 'daily' | 'monthly',
    exceeded: boolean
  ): Promise<void> {
    const timestamp = new Date();
    const id = `${userId}#${timestamp.getTime()}`;
    
    const usageLimitLog: UsageLimitLog = {
      id,
      userId,
      timestamp,
      limitType,
      exceeded,
      ttl: this.calculateTTL(timestamp),
    };

    await this.addToBatch(this.config.usageLimitTableName, usageLimitLog);
  }

  /**
   * Log session end events
   */
  public async logSessionEnd(userId: string, reason: 'user_initiated' | 'timeout' | 'error'): Promise<void> {
    const timestamp = new Date();
    const id = `${userId}#${timestamp.getTime()}`;
    
    const sessionEndLog = {
      id,
      userId,
      timestamp,
      reason,
      ttl: this.calculateTTL(timestamp),
    };

    await this.addToBatch('alexa-llm-session-ends', sessionEndLog);
  }

  /**
   * Log fallback events when user input is not recognized
   */
  public async logFallbackEvent(userId: string, context: { intentName?: string; timestamp: Date; additionalData?: Record<string, any> }): Promise<void> {
    const timestamp = new Date();
    const id = `${userId}#${timestamp.getTime()}`;
    
    const fallbackLog = {
      id,
      userId,
      timestamp,
      intentName: context.intentName,
      additionalData: context.additionalData,
      ttl: this.calculateTTL(timestamp),
    };

    await this.addToBatch('alexa-llm-fallback-events', fallbackLog);
  }

  /**
   * Flush all pending logs immediately
   */
  public async flushLogs(): Promise<void> {
    if (this.pendingLogs.length === 0) {
      return;
    }

    const logsToFlush = [...this.pendingLogs];
    this.pendingLogs = [];

    // Group logs by table for batch writing
    const logsByTable = new Map<string, any[]>();
    
    for (const log of logsToFlush) {
      if (!logsByTable.has(log.table)) {
        logsByTable.set(log.table, []);
      }
      logsByTable.get(log.table)!.push(log.item);
    }

    // Write batches for each table
    const writePromises = Array.from(logsByTable.entries()).map(([tableName, items]) =>
      this.writeBatchItems(tableName, items)
    );

    await Promise.allSettled(writePromises);
  }

  /**
   * Aggregate metrics for a specific date range
   */
  public async aggregateMetrics(query: MetricsQuery): Promise<MetricsAggregationResult> {
    const dailyMetricsMap = new Map<string, DailyMetrics>();
    const userMetricsMap = new Map<string, UserMetrics>();

    // Process each date in the range
    const startDate = new Date(query.startDate);
    const endDate = new Date(query.endDate);
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      
      // Initialize daily metrics
      const dailyMetrics: DailyMetrics = {
        date: dateStr,
        totalConversations: 0,
        totalUsers: 0,
        uniqueUsers: new Set<string>(),
        freeUserConversations: 0,
        premiumUserConversations: 0,
        averageResponseTime: 0,
        totalResponseTime: 0,
        errorCount: 0,
        subscriptionEvents: {} as Record<SubscriptionEvent, number>,
        skillLaunches: 0,
        newUsers: 0,
        usageLimitExceeded: 0,
        lastUpdated: new Date(),
        ttl: this.calculateTTL(new Date()),
      };

      // Aggregate conversation logs for this date
      await this.aggregateConversationLogs(dateStr, dailyMetrics, userMetricsMap, query);
      
      // Aggregate subscription events for this date
      await this.aggregateSubscriptionEvents(dateStr, dailyMetrics, userMetricsMap, query);
      
      // Aggregate skill launches for this date
      await this.aggregateSkillLaunches(dateStr, dailyMetrics, userMetricsMap, query);
      
      // Aggregate usage limit events for this date
      await this.aggregateUsageLimitEvents(dateStr, dailyMetrics, userMetricsMap, query);
      
      // Aggregate error logs for this date
      await this.aggregateErrorLogs(dateStr, dailyMetrics, query);

      // Calculate final metrics
      dailyMetrics.totalUsers = dailyMetrics.uniqueUsers.size;
      dailyMetrics.averageResponseTime = dailyMetrics.totalConversations > 0 
        ? dailyMetrics.totalResponseTime / dailyMetrics.totalConversations 
        : 0;

      dailyMetricsMap.set(dateStr, dailyMetrics);
    }

    // Store aggregated metrics
    await this.storeAggregatedMetrics(dailyMetricsMap, userMetricsMap);

    return {
      dailyMetrics: Array.from(dailyMetricsMap.values())[0], // Return first day's metrics
      userMetrics: query.includeUserMetrics ? Array.from(userMetricsMap.values()) : [],
    };
  }

  /**
   * Get stored daily metrics for a date range
   */
  public async getDailyMetrics(startDate: string, endDate: string): Promise<DailyMetrics[]> {
    const metrics: DailyMetrics[] = [];
    
    try {
      const result = await this.dynamoOperations.query({
        TableName: this.config.dailyMetricsTableName,
        KeyConditionExpression: '#date BETWEEN :startDate AND :endDate',
        ExpressionAttributeNames: {
          '#date': 'date',
        },
        ExpressionAttributeValues: {
          ':startDate': startDate,
          ':endDate': endDate,
        },
      });

      if (result.Items) {
        for (const item of result.Items) {
          metrics.push({
            ...item,
            uniqueUsers: new Set(item.uniqueUsersList || []),
            lastUpdated: new Date(item.lastUpdated),
          } as DailyMetrics);
        }
      }
    } catch (error) {
      console.error('Failed to get daily metrics:', error);
    }

    return metrics;
  }

  /**
   * Get stored user metrics for a specific user and date range
   */
  public async getUserMetrics(userId: string, startDate: string, endDate: string): Promise<UserMetrics[]> {
    const metrics: UserMetrics[] = [];
    
    try {
      const result = await this.dynamoOperations.query({
        TableName: this.config.userMetricsTableName,
        KeyConditionExpression: 'userId = :userId AND #date BETWEEN :startDate AND :endDate',
        ExpressionAttributeNames: {
          '#date': 'date',
        },
        ExpressionAttributeValues: {
          ':userId': userId,
          ':startDate': startDate,
          ':endDate': endDate,
        },
      });

      if (result.Items) {
        for (const item of result.Items) {
          metrics.push({
            ...item,
            lastActivity: new Date(item.lastActivity),
          } as UserMetrics);
        }
      }
    } catch (error) {
      console.error('Failed to get user metrics:', error);
    }

    return metrics;
  }

  /**
   * Cleanup method to stop timers
   */
  public cleanup(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }
  }

  /**
   * Add log item to batch queue
   */
  private async addToBatch(tableName: string, item: any): Promise<void> {
    this.pendingLogs.push({ table: tableName, item });
    
    // Flush immediately if batch is full
    if (this.pendingLogs.length >= this.config.batchSize) {
      await this.flushLogs();
    }
  }

  /**
   * Write a single log item immediately
   */
  private async writeLogItem(tableName: string, item: any): Promise<void> {
    try {
      await this.dynamoOperations.put({
        TableName: tableName,
        Item: item,
      });
    } catch (error) {
      console.error(`Failed to write log item to ${tableName}:`, error);
      // Don't throw - analytics failures shouldn't break the main flow
    }
  }

  /**
   * Write batch of items to a table
   */
  private async writeBatchItems(tableName: string, items: any[]): Promise<void> {
    // DynamoDB batch write has a limit of 25 items
    const chunks = this.chunkArray(items, 25);
    
    for (const chunk of chunks) {
      // Write items individually for now (can be optimized to use batchWrite later)
      const writePromises = chunk.map(item => 
        this.dynamoOperations.put({
          TableName: tableName,
          Item: item,
        }).catch(error => {
          console.error(`Failed to write log item to ${tableName}:`, error);
          // Don't throw - analytics failures shouldn't break the main flow
        })
      );

      await Promise.allSettled(writePromises);
    }
  }

  /**
   * Start the batch flush timer
   */
  private startBatchFlushTimer(): void {
    this.flushTimer = setInterval(async () => {
      try {
        await this.flushLogs();
      } catch (error) {
        console.error('Error during scheduled log flush:', error);
      }
    }, this.config.flushIntervalMs);
  }

  /**
   * Calculate TTL timestamp for automatic cleanup
   */
  private calculateTTL(timestamp: Date): number {
    const retentionMs = this.config.dataRetentionDays * 24 * 60 * 60 * 1000;
    return Math.floor((timestamp.getTime() + retentionMs) / 1000);
  }

  /**
   * Aggregate conversation logs for a specific date
   */
  private async aggregateConversationLogs(
    dateStr: string,
    dailyMetrics: DailyMetrics,
    userMetricsMap: Map<string, UserMetrics>,
    query: MetricsQuery
  ): Promise<void> {
    try {
      const result = await this.dynamoOperations.scan({
        TableName: this.config.conversationTableName,
        FilterExpression: 'begins_with(id, :datePrefix)',
        ExpressionAttributeValues: {
          ':datePrefix': dateStr,
        },
      });

      if (result.Items) {
        for (const item of result.Items) {
          const log = item as ConversationLog;
          
          // Update daily metrics
          dailyMetrics.totalConversations++;
          dailyMetrics.uniqueUsers.add(log.userId);
          dailyMetrics.totalResponseTime += log.responseTime;
          
          if (log.userTier === 'free') {
            dailyMetrics.freeUserConversations++;
          } else {
            dailyMetrics.premiumUserConversations++;
          }

          // Update user metrics if requested
          if (query.includeUserMetrics && (!query.userId || query.userId === log.userId)) {
            const userKey = `${log.userId}#${dateStr}`;
            let userMetrics = userMetricsMap.get(userKey);
            
            if (!userMetrics) {
              userMetrics = {
                userId: log.userId,
                date: dateStr,
                conversationCount: 0,
                totalResponseTime: 0,
                averageResponseTime: 0,
                userTier: log.userTier,
                skillLaunches: 0,
                isNewUser: false,
                usageLimitExceeded: false,
                subscriptionEvents: [],
                lastActivity: new Date(log.timestamp),
                ttl: this.calculateTTL(new Date()),
              };
              userMetricsMap.set(userKey, userMetrics);
            }
            
            userMetrics.conversationCount++;
            userMetrics.totalResponseTime += log.responseTime;
            userMetrics.averageResponseTime = userMetrics.totalResponseTime / userMetrics.conversationCount;
            userMetrics.lastActivity = new Date(Math.max(userMetrics.lastActivity.getTime(), new Date(log.timestamp).getTime()));
          }
        }
      }
    } catch (error) {
      console.error(`Failed to aggregate conversation logs for ${dateStr}:`, error);
    }
  }

  /**
   * Aggregate subscription events for a specific date
   */
  private async aggregateSubscriptionEvents(
    dateStr: string,
    dailyMetrics: DailyMetrics,
    userMetricsMap: Map<string, UserMetrics>,
    query: MetricsQuery
  ): Promise<void> {
    try {
      const result = await this.dynamoOperations.scan({
        TableName: this.config.subscriptionEventTableName,
        FilterExpression: 'begins_with(id, :datePrefix)',
        ExpressionAttributeValues: {
          ':datePrefix': dateStr,
        },
      });

      if (result.Items) {
        for (const item of result.Items) {
          const log = item as SubscriptionEventLog;
          
          // Update daily metrics
          if (!dailyMetrics.subscriptionEvents[log.event]) {
            dailyMetrics.subscriptionEvents[log.event] = 0;
          }
          dailyMetrics.subscriptionEvents[log.event]++;

          // Update user metrics if requested
          if (query.includeUserMetrics && (!query.userId || query.userId === log.userId)) {
            const userKey = `${log.userId}#${dateStr}`;
            const userMetrics = userMetricsMap.get(userKey);
            
            if (userMetrics) {
              userMetrics.subscriptionEvents.push(log.event);
            }
          }
        }
      }
    } catch (error) {
      console.error(`Failed to aggregate subscription events for ${dateStr}:`, error);
    }
  }

  /**
   * Aggregate skill launches for a specific date
   */
  private async aggregateSkillLaunches(
    dateStr: string,
    dailyMetrics: DailyMetrics,
    userMetricsMap: Map<string, UserMetrics>,
    query: MetricsQuery
  ): Promise<void> {
    try {
      const result = await this.dynamoOperations.scan({
        TableName: this.config.skillLaunchTableName,
        FilterExpression: 'begins_with(id, :datePrefix)',
        ExpressionAttributeValues: {
          ':datePrefix': dateStr,
        },
      });

      if (result.Items) {
        for (const item of result.Items) {
          const log = item as SkillLaunchLog;
          
          // Update daily metrics
          dailyMetrics.skillLaunches++;
          if (log.isNewUser) {
            dailyMetrics.newUsers++;
          }

          // Update user metrics if requested
          if (query.includeUserMetrics && (!query.userId || query.userId === log.userId)) {
            const userKey = `${log.userId}#${dateStr}`;
            let userMetrics = userMetricsMap.get(userKey);
            
            if (!userMetrics) {
              userMetrics = {
                userId: log.userId,
                date: dateStr,
                conversationCount: 0,
                totalResponseTime: 0,
                averageResponseTime: 0,
                userTier: 'free', // Default, will be updated by conversation logs
                skillLaunches: 0,
                isNewUser: log.isNewUser,
                usageLimitExceeded: false,
                subscriptionEvents: [],
                lastActivity: new Date(log.timestamp),
                ttl: this.calculateTTL(new Date()),
              };
              userMetricsMap.set(userKey, userMetrics);
            }
            
            userMetrics.skillLaunches++;
            userMetrics.isNewUser = log.isNewUser;
          }
        }
      }
    } catch (error) {
      console.error(`Failed to aggregate skill launches for ${dateStr}:`, error);
    }
  }

  /**
   * Aggregate usage limit events for a specific date
   */
  private async aggregateUsageLimitEvents(
    dateStr: string,
    dailyMetrics: DailyMetrics,
    userMetricsMap: Map<string, UserMetrics>,
    query: MetricsQuery
  ): Promise<void> {
    try {
      const result = await this.dynamoOperations.scan({
        TableName: this.config.usageLimitTableName,
        FilterExpression: 'begins_with(id, :datePrefix)',
        ExpressionAttributeValues: {
          ':datePrefix': dateStr,
        },
      });

      if (result.Items) {
        for (const item of result.Items) {
          const log = item as UsageLimitLog;
          
          // Update daily metrics
          if (log.exceeded) {
            dailyMetrics.usageLimitExceeded++;
          }

          // Update user metrics if requested
          if (query.includeUserMetrics && (!query.userId || query.userId === log.userId)) {
            const userKey = `${log.userId}#${dateStr}`;
            const userMetrics = userMetricsMap.get(userKey);
            
            if (userMetrics && log.exceeded) {
              userMetrics.usageLimitExceeded = true;
            }
          }
        }
      }
    } catch (error) {
      console.error(`Failed to aggregate usage limit events for ${dateStr}:`, error);
    }
  }

  /**
   * Aggregate error logs for a specific date
   */
  private async aggregateErrorLogs(
    dateStr: string,
    dailyMetrics: DailyMetrics,
    query: MetricsQuery
  ): Promise<void> {
    try {
      const result = await this.dynamoOperations.scan({
        TableName: this.config.errorLogTableName,
        FilterExpression: 'begins_with(id, :datePrefix)',
        ExpressionAttributeValues: {
          ':datePrefix': dateStr,
        },
      });

      if (result.Items) {
        dailyMetrics.errorCount = result.Items.length;
      }
    } catch (error) {
      console.error(`Failed to aggregate error logs for ${dateStr}:`, error);
    }
  }

  /**
   * Store aggregated metrics to DynamoDB
   */
  private async storeAggregatedMetrics(
    dailyMetricsMap: Map<string, DailyMetrics>,
    userMetricsMap: Map<string, UserMetrics>
  ): Promise<void> {
    try {
      // Store daily metrics
      for (const dailyMetrics of dailyMetricsMap.values()) {
        // Convert Set to Array for DynamoDB storage
        const metricsToStore = {
          ...dailyMetrics,
          uniqueUsersList: Array.from(dailyMetrics.uniqueUsers),
        };
        delete (metricsToStore as any).uniqueUsers;

        await this.dynamoOperations.put({
          TableName: this.config.dailyMetricsTableName,
          Item: metricsToStore,
        });
      }

      // Store user metrics
      for (const userMetrics of userMetricsMap.values()) {
        await this.dynamoOperations.put({
          TableName: this.config.userMetricsTableName,
          Item: userMetrics,
        });
      }
    } catch (error) {
      console.error('Failed to store aggregated metrics:', error);
    }
  }

  /**
   * Utility method to chunk array into smaller arrays
   */
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}