import { UserTier, SubscriptionEvent } from '../models/SubscriptionStatus';

/**
 * Interface for analytics and usage tracking
 */
export interface AnalyticsService {
  /**
   * Log conversation interaction
   */
  logConversation(
    userId: string, 
    userTier: UserTier, 
    responseTime: number,
    promptLength: number,
    responseLength: number
  ): Promise<void>;

  /**
   * Log subscription-related events
   */
  logSubscriptionEvent(userId: string, event: SubscriptionEvent): Promise<void>;

  /**
   * Log errors with context
   */
  logError(error: Error, context: ErrorContext): Promise<void>;

  /**
   * Log skill launch events
   */
  logSkillLaunch(userId: string, isNewUser: boolean): Promise<void>;

  /**
   * Log usage limit events
   */
  logUsageLimitEvent(userId: string, limitType: 'daily' | 'monthly', exceeded: boolean): Promise<void>;

  /**
   * Log session end events
   */
  logSessionEnd(userId: string, reason: 'user_initiated' | 'timeout' | 'error'): Promise<void>;

  /**
   * Log fallback events when user input is not recognized
   */
  logFallbackEvent(userId: string, context: FallbackContext): Promise<void>;
}

export interface ErrorContext {
  userId?: string;
  intentName?: string;
  errorType: string;
  timestamp: Date;
  additionalData?: Record<string, any>;
}

export interface FallbackContext {
  intentName?: string;
  timestamp: Date;
  additionalData?: Record<string, any>;
}