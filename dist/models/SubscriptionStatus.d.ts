/**
 * Subscription status and usage tracking
 */
export interface SubscriptionStatus {
    userId: string;
    tier: UserTier;
    subscriptionId?: string;
    expiresAt?: Date;
    dailyUsageCount: number;
    lastResetDate: Date;
}
export type UserTier = 'free' | 'premium';
/**
 * Result of usage limit check
 */
export interface UsageLimitResult {
    canProceed: boolean;
    remainingUsage?: number;
    limitResetTime?: Date;
    message?: string;
}
/**
 * Result of subscription purchase attempt
 */
export interface PurchaseResult {
    success: boolean;
    transactionId?: string;
    error?: string;
}
/**
 * Subscription events for analytics
 */
export type SubscriptionEvent = 'purchase_initiated' | 'purchase_completed' | 'purchase_failed' | 'subscription_activated' | 'subscription_cancelled' | 'subscription_expired' | 'upgrade_completed';
//# sourceMappingURL=SubscriptionStatus.d.ts.map