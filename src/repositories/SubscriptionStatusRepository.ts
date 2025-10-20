import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { 
  SubscriptionStatus, 
  UserTier, 
  UsageLimitResult, 
  PurchaseResult,
  SubscriptionEvent 
} from '../models/SubscriptionStatus';
import { DynamoDBOperations } from '../utils/DynamoDBClient';

export interface SubscriptionStatusRepositoryConfig {
  tableName: string;
  freeUserDailyLimit?: number;
}

export class SubscriptionStatusRepository {
  private operations: DynamoDBOperations;
  private tableName: string;
  private freeUserDailyLimit: number;

  constructor(
    documentClient: DocumentClient,
    config: SubscriptionStatusRepositoryConfig
  ) {
    this.operations = new DynamoDBOperations(documentClient);
    this.tableName = config.tableName;
    this.freeUserDailyLimit = config.freeUserDailyLimit || 5;
  }

  /**
   * Get subscription status for a user
   */
  public async getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    try {
      const result = await this.operations.get({
        TableName: this.tableName,
        Key: { userId }
      });

      if (!result.Item) {
        // Create default free tier status for new users
        return this.createDefaultSubscriptionStatus(userId);
      }

      return this.deserializeSubscriptionStatus(result.Item);
    } catch (error: any) {
      throw new Error(`Failed to get subscription status for user ${userId}: ${error.message || error}`);
    }
  }

  /**
   * Save or update subscription status
   */
  public async saveSubscriptionStatus(status: SubscriptionStatus): Promise<void> {
    try {
      const item = this.serializeSubscriptionStatus(status);
      
      await this.operations.put({
        TableName: this.tableName,
        Item: item
      });
    } catch (error: any) {
      throw new Error(`Failed to save subscription status for user ${status.userId}: ${error.message || error}`);
    }
  }

  /**
   * Check if user can proceed with usage (within limits)
   */
  public async checkUsageLimits(userId: string): Promise<UsageLimitResult> {
    try {
      const status = await this.getSubscriptionStatus(userId);

      // Premium users have unlimited usage
      if (status.tier === 'premium') {
        return {
          canProceed: true,
          message: 'Premium user - unlimited usage'
        };
      }

      // Check if we need to reset daily usage count
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (status.lastResetDate < today) {
        // Reset usage count for new day
        status.dailyUsageCount = 0;
        status.lastResetDate = today;
        await this.saveSubscriptionStatus(status);
      }

      // Check free tier limits
      const remainingUsage = this.freeUserDailyLimit - status.dailyUsageCount;
      const canProceed = remainingUsage > 0;

      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      return {
        canProceed,
        remainingUsage: Math.max(0, remainingUsage),
        limitResetTime: tomorrow,
        message: canProceed 
          ? `${remainingUsage} conversations remaining today`
          : 'Daily limit reached. Upgrade to premium for unlimited conversations.'
      };
    } catch (error: any) {
      throw new Error(`Failed to check usage limits for user ${userId}: ${error.message || error}`);
    }
  }

  /**
   * Increment usage count for a user
   */
  public async incrementUsageCount(userId: string): Promise<SubscriptionStatus> {
    try {
      const status = await this.getSubscriptionStatus(userId);

      // Only increment for free users
      if (status.tier === 'free') {
        // Check if we need to reset daily usage count
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        if (status.lastResetDate < today) {
          status.dailyUsageCount = 1;
          status.lastResetDate = today;
        } else {
          status.dailyUsageCount += 1;
        }

        await this.saveSubscriptionStatus(status);
      }

      return status;
    } catch (error: any) {
      throw new Error(`Failed to increment usage count for user ${userId}: ${error.message || error}`);
    }
  }

  /**
   * Upgrade user to premium tier
   */
  public async upgradeToPremium(
    userId: string, 
    subscriptionId: string, 
    expiresAt?: Date
  ): Promise<SubscriptionStatus> {
    try {
      const status = await this.getSubscriptionStatus(userId);
      
      status.tier = 'premium';
      status.subscriptionId = subscriptionId;
      status.expiresAt = expiresAt;

      await this.saveSubscriptionStatus(status);
      return status;
    } catch (error: any) {
      throw new Error(`Failed to upgrade user ${userId} to premium: ${error.message || error}`);
    }
  }

  /**
   * Downgrade user to free tier (e.g., when subscription expires)
   */
  public async downgradeToFree(userId: string): Promise<SubscriptionStatus> {
    try {
      const status = await this.getSubscriptionStatus(userId);
      
      status.tier = 'free';
      status.subscriptionId = undefined;
      status.expiresAt = undefined;

      await this.saveSubscriptionStatus(status);
      return status;
    } catch (error: any) {
      throw new Error(`Failed to downgrade user ${userId} to free: ${error.message || error}`);
    }
  }

  /**
   * Check for expired subscriptions and downgrade them
   */
  public async processExpiredSubscriptions(): Promise<string[]> {
    try {
      const now = new Date();
      
      const result = await this.operations.scan({
        TableName: this.tableName,
        FilterExpression: 'tier = :premium AND expiresAt < :now',
        ExpressionAttributeValues: {
          ':premium': 'premium',
          ':now': now.toISOString()
        }
      });

      const expiredUserIds: string[] = [];

      if (result.Items && result.Items.length > 0) {
        const downgradePromises = result.Items.map(async (item) => {
          const userId = item.userId;
          await this.downgradeToFree(userId);
          expiredUserIds.push(userId);
        });

        await Promise.all(downgradePromises);
      }

      return expiredUserIds;
    } catch (error: any) {
      throw new Error(`Failed to process expired subscriptions: ${error.message || error}`);
    }
  }

  /**
   * Get usage statistics for analytics
   */
  public async getUsageStatistics(startDate: Date, endDate: Date): Promise<{
    totalUsers: number;
    freeUsers: number;
    premiumUsers: number;
    totalUsage: number;
    averageUsagePerUser: number;
  }> {
    try {
      const result = await this.operations.scan({
        TableName: this.tableName,
        FilterExpression: 'lastResetDate BETWEEN :start AND :end',
        ExpressionAttributeValues: {
          ':start': startDate.toISOString(),
          ':end': endDate.toISOString()
        }
      });

      const items = result.Items || [];
      const totalUsers = items.length;
      let freeUsers = 0;
      let premiumUsers = 0;
      let totalUsage = 0;

      items.forEach(item => {
        if (item.tier === 'free') {
          freeUsers++;
        } else {
          premiumUsers++;
        }
        totalUsage += item.dailyUsageCount || 0;
      });

      return {
        totalUsers,
        freeUsers,
        premiumUsers,
        totalUsage,
        averageUsagePerUser: totalUsers > 0 ? totalUsage / totalUsers : 0
      };
    } catch (error: any) {
      throw new Error(`Failed to get usage statistics: ${error.message || error}`);
    }
  }

  /**
   * Reset daily usage counts for all users (typically run daily)
   */
  public async resetDailyUsageCounts(): Promise<number> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const result = await this.operations.scan({
        TableName: this.tableName,
        FilterExpression: 'lastResetDate < :today',
        ExpressionAttributeValues: {
          ':today': today.toISOString()
        }
      });

      const items = result.Items || [];
      
      if (items.length === 0) {
        return 0;
      }

      const updatePromises = items.map(async (item) => {
        const status = this.deserializeSubscriptionStatus(item);
        status.dailyUsageCount = 0;
        status.lastResetDate = today;
        await this.saveSubscriptionStatus(status);
      });

      await Promise.all(updatePromises);
      return items.length;
    } catch (error: any) {
      throw new Error(`Failed to reset daily usage counts: ${error.message || error}`);
    }
  }

  /**
   * Create default subscription status for new users
   */
  private createDefaultSubscriptionStatus(userId: string): SubscriptionStatus {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return {
      userId,
      tier: 'free',
      dailyUsageCount: 0,
      lastResetDate: today
    };
  }

  /**
   * Serialize subscription status for DynamoDB storage
   */
  private serializeSubscriptionStatus(status: SubscriptionStatus): any {
    const item: any = {
      userId: status.userId,
      tier: status.tier,
      dailyUsageCount: status.dailyUsageCount,
      lastResetDate: status.lastResetDate.toISOString()
    };

    if (status.subscriptionId) {
      item.subscriptionId = status.subscriptionId;
    }

    if (status.expiresAt) {
      item.expiresAt = status.expiresAt.toISOString();
    }

    return item;
  }

  /**
   * Deserialize subscription status from DynamoDB item
   */
  private deserializeSubscriptionStatus(item: any): SubscriptionStatus {
    const status: SubscriptionStatus = {
      userId: item.userId,
      tier: item.tier as UserTier,
      dailyUsageCount: item.dailyUsageCount || 0,
      lastResetDate: new Date(item.lastResetDate)
    };

    if (item.subscriptionId) {
      status.subscriptionId = item.subscriptionId;
    }

    if (item.expiresAt) {
      status.expiresAt = new Date(item.expiresAt);
    }

    return status;
  }
}