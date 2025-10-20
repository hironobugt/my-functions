import { SubscriptionStatus, UsageLimitResult, PurchaseResult } from '../models/SubscriptionStatus';

/**
 * Interface for managing user subscriptions and usage limits
 */
export interface SubscriptionManager {
  /**
   * Get user's current subscription status
   */
  getUserSubscriptionStatus(userId: string): Promise<SubscriptionStatus>;

  /**
   * Check if user can proceed based on usage limits
   */
  checkUsageLimits(userId: string): Promise<UsageLimitResult>;

  /**
   * Increment usage count for a user
   */
  incrementUsageCount(userId: string): Promise<void>;

  /**
   * Handle subscription purchase request
   */
  handlePurchaseRequest(userId: string, productId: string): Promise<PurchaseResult>;

  /**
   * Verify subscription status with Alexa ISP
   */
  verifySubscription(userId: string): Promise<boolean>;

  /**
   * Reset daily usage counts (called by scheduled job)
   */
  resetDailyUsage(): Promise<void>;
}