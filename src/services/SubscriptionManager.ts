import { SubscriptionManager as ISubscriptionManager } from '../interfaces/SubscriptionManager';
import { 
  SubscriptionStatus, 
  UsageLimitResult, 
  PurchaseResult, 
  UserTier,
  SubscriptionEvent 
} from '../models/SubscriptionStatus';
import { SubscriptionStatusRepository } from '../repositories/SubscriptionStatusRepository';
import { ConfigManager } from '../models/AppConfig';
import { AlexaISPService, ISPPurchaseResult } from './AlexaISPService';

/**
 * Configuration for SubscriptionManager
 */
export interface SubscriptionManagerConfig {
  subscriptionRepository: SubscriptionStatusRepository;
  alexaISPService?: AlexaISPService;
  enableISP?: boolean;
}

/**
 * Service for managing user subscriptions and usage limits
 */
export class SubscriptionManager implements ISubscriptionManager {
  private repository: SubscriptionStatusRepository;
  private config: ConfigManager;
  private ispService?: AlexaISPService;
  private enableISP: boolean;

  constructor(config: SubscriptionManagerConfig) {
    this.repository = config.subscriptionRepository;
    this.config = ConfigManager.getInstance();
    this.ispService = config.alexaISPService;
    this.enableISP = config.enableISP ?? false;
  }

  /**
   * Get user's current subscription status
   */
  public async getUserSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    try {
      const status = await this.repository.getSubscriptionStatus(userId);
      
      // Check if premium subscription has expired
      if (status.tier === 'premium' && status.expiresAt && status.expiresAt < new Date()) {
        // Downgrade expired subscription
        const downgradedStatus = await this.repository.downgradeToFree(userId);
        return downgradedStatus;
      }

      return status;
    } catch (error: any) {
      throw new Error(`Failed to get subscription status for user ${userId}: ${error.message || error}`);
    }
  }

  /**
   * Check if user can proceed based on usage limits
   */
  public async checkUsageLimits(userId: string): Promise<UsageLimitResult> {
    try {
      return await this.repository.checkUsageLimits(userId);
    } catch (error: any) {
      throw new Error(`Failed to check usage limits for user ${userId}: ${error.message || error}`);
    }
  }

  /**
   * Check if user can start a new conversation (enforces limits)
   */
  public async canStartConversation(userId: string): Promise<{
    canProceed: boolean;
    message: string;
    upgradePrompt?: string;
  }> {
    try {
      const usageLimits = await this.checkUsageLimits(userId);
      
      if (usageLimits.canProceed) {
        return {
          canProceed: true,
          message: usageLimits.message || 'You can start a conversation'
        };
      }

      // Generate upgrade prompt for free users who hit limits
      const upgradePrompt = this.generateUpgradePrompt(usageLimits);
      
      return {
        canProceed: false,
        message: usageLimits.message || 'Usage limit exceeded',
        upgradePrompt
      };
    } catch (error: any) {
      throw new Error(`Failed to check conversation eligibility for user ${userId}: ${error.message || error}`);
    }
  }

  /**
   * Enforce usage limits before allowing conversation
   */
  public async enforceUsageLimits(userId: string): Promise<{
    allowed: boolean;
    message: string;
    shouldPromptUpgrade: boolean;
  }> {
    try {
      const status = await this.getUserSubscriptionStatus(userId);
      
      // Premium users always allowed
      if (status.tier === 'premium') {
        return {
          allowed: true,
          message: 'Premium access - unlimited conversations',
          shouldPromptUpgrade: false
        };
      }

      // Check free user limits
      const usageLimits = await this.checkUsageLimits(userId);
      
      if (usageLimits.canProceed) {
        return {
          allowed: true,
          message: usageLimits.message || `${usageLimits.remainingUsage} conversations remaining today`,
          shouldPromptUpgrade: false
        };
      }

      return {
        allowed: false,
        message: 'You\'ve reached your daily limit of free conversations.',
        shouldPromptUpgrade: true
      };
    } catch (error: any) {
      // On error, allow but log the issue
      console.error(`Failed to enforce usage limits for user ${userId}:`, error);
      return {
        allowed: true,
        message: 'Usage check temporarily unavailable',
        shouldPromptUpgrade: false
      };
    }
  }

  /**
   * Increment usage count for a user
   */
  public async incrementUsageCount(userId: string): Promise<void> {
    try {
      await this.repository.incrementUsageCount(userId);
    } catch (error: any) {
      throw new Error(`Failed to increment usage count for user ${userId}: ${error.message || error}`);
    }
  }

  /**
   * Handle subscription purchase request
   */
  public async handlePurchaseRequest(userId: string, productId: string): Promise<PurchaseResult> {
    try {
      if (!this.enableISP || !this.ispService) {
        return {
          success: false,
          error: 'In-skill purchases are not enabled or configured'
        };
      }

      // Generate correlation token for tracking
      const correlationToken = `purchase_${userId}_${Date.now()}`;
      
      // Initiate purchase with Alexa ISP
      const purchaseResult = await this.ispService.initiatePurchase(productId, correlationToken);
      
      if (purchaseResult.success) {
        return {
          success: true,
          transactionId: purchaseResult.transactionId
        };
      }

      return {
        success: false,
        error: purchaseResult.message || 'Purchase initiation failed'
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Purchase failed: ${error.message || error}`
      };
    }
  }

  /**
   * Handle purchase response from Alexa ISP
   */
  public async handlePurchaseResponse(
    userId: string, 
    productId: string, 
    purchaseResponse: any
  ): Promise<PurchaseResult> {
    try {
      if (!this.ispService) {
        return {
          success: false,
          error: 'ISP service not configured'
        };
      }

      const result = await this.ispService.handlePurchaseResponse(purchaseResponse, productId);
      
      if (result.success && result.purchaseResult === 'ACCEPTED') {
        // Upgrade user to premium
        const expiresAt = this.calculateExpirationDate(productId);
        await this.repository.upgradeToPremium(userId, result.transactionId || `isp_${Date.now()}`, expiresAt);
        
        return {
          success: true,
          transactionId: result.transactionId
        };
      }

      return {
        success: result.success,
        error: result.message
      };
    } catch (error: any) {
      return {
        success: false,
        error: `Failed to handle purchase response: ${error.message || error}`
      };
    }
  }

  /**
   * Verify subscription status with Alexa ISP
   */
  public async verifySubscription(userId: string): Promise<boolean> {
    try {
      if (!this.enableISP || !this.ispService) {
        // If ISP is not enabled, check local subscription status
        const status = await this.getUserSubscriptionStatus(userId);
        return status.tier === 'premium' && (!status.expiresAt || status.expiresAt > new Date());
      }

      // Get premium product ID from config
      const appConfig = this.config.getConfig();
      const premiumProductId = 'premium-monthly'; // This should come from config
      
      // Check entitlement with ISP service
      const isEntitled = await this.ispService.isEntitled(premiumProductId);
      
      // Update local status based on ISP verification
      if (isEntitled) {
        const currentStatus = await this.repository.getSubscriptionStatus(userId);
        if (currentStatus.tier !== 'premium') {
          await this.repository.upgradeToPremium(
            userId, 
            'isp-verified',
            this.calculateExpirationDate(premiumProductId)
          );
        }
        return true;
      } else {
        // Downgrade if ISP shows not entitled
        const currentStatus = await this.repository.getSubscriptionStatus(userId);
        if (currentStatus.tier === 'premium') {
          await this.repository.downgradeToFree(userId);
        }
        return false;
      }
    } catch (error: any) {
      // Log error but don't throw - return current local status
      console.error(`Failed to verify subscription for user ${userId}:`, error);
      const status = await this.getUserSubscriptionStatus(userId);
      return status.tier === 'premium' && (!status.expiresAt || status.expiresAt > new Date());
    }
  }

  /**
   * Reset daily usage counts (called by scheduled job)
   */
  public async resetDailyUsage(): Promise<void> {
    try {
      const resetCount = await this.repository.resetDailyUsageCounts();
      console.log(`Reset daily usage for ${resetCount} users`);
    } catch (error: any) {
      throw new Error(`Failed to reset daily usage: ${error.message || error}`);
    }
  }

  /**
   * Get user tier for configuration purposes
   */
  public async getUserTier(userId: string): Promise<UserTier> {
    try {
      const status = await this.getUserSubscriptionStatus(userId);
      return status.tier;
    } catch (error: any) {
      // Default to free tier on error
      console.error(`Failed to get user tier for ${userId}, defaulting to free:`, error);
      return 'free';
    }
  }

  /**
   * Check if user has premium access
   */
  public async hasPremiumAccess(userId: string): Promise<boolean> {
    try {
      const tier = await this.getUserTier(userId);
      return tier === 'premium';
    } catch (error: any) {
      return false;
    }
  }

  /**
   * Get usage summary for user
   */
  public async getUserUsageSummary(userId: string): Promise<{
    tier: UserTier;
    dailyUsageCount: number;
    remainingUsage?: number;
    limitResetTime?: Date;
  }> {
    try {
      const status = await this.getUserSubscriptionStatus(userId);
      const usageLimits = await this.checkUsageLimits(userId);

      return {
        tier: status.tier,
        dailyUsageCount: status.dailyUsageCount,
        remainingUsage: usageLimits.remainingUsage,
        limitResetTime: usageLimits.limitResetTime
      };
    } catch (error: any) {
      throw new Error(`Failed to get usage summary for user ${userId}: ${error.message || error}`);
    }
  }

  /**
   * Process expired subscriptions (called by scheduled job)
   */
  public async processExpiredSubscriptions(): Promise<string[]> {
    try {
      return await this.repository.processExpiredSubscriptions();
    } catch (error: any) {
      throw new Error(`Failed to process expired subscriptions: ${error.message || error}`);
    }
  }



  /**
   * Calculate subscription expiration date based on product
   */
  private calculateExpirationDate(productId: string): Date {
    const now = new Date();
    
    // Default to 30 days for monthly subscription
    // In real implementation, this would be based on product configuration
    const expirationDate = new Date(now);
    expirationDate.setDate(now.getDate() + 30);
    
    return expirationDate;
  }

  /**
   * Generate upgrade prompt message for users who hit limits
   */
  private generateUpgradePrompt(usageLimits: UsageLimitResult): string {
    const resetTime = usageLimits.limitResetTime;
    const resetTimeStr = resetTime ? resetTime.toLocaleDateString() : 'tomorrow';
    
    return `You've used all your free conversations for today. Your limit will reset ${resetTimeStr}. ` +
           `Upgrade to premium for unlimited conversations, better AI models, and priority support. ` +
           `Say "tell me about premium" to learn more or "buy premium" to upgrade now.`;
  }
}