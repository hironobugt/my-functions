import { ConversationContext, ChatMessage } from './ConversationContext';
import { SubscriptionStatus, UserTier, UsageLimitResult, PurchaseResult } from './SubscriptionStatus';
import { AppConfig } from './AppConfig';

/**
 * Validation error class
 */
export class ValidationError extends Error {
  constructor(message: string, public field?: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validates a ConversationContext object
 */
export function validateConversationContext(context: any): context is ConversationContext {
  if (!context || typeof context !== 'object') {
    throw new ValidationError('Context must be an object');
  }

  if (!context.userId || typeof context.userId !== 'string') {
    throw new ValidationError('userId must be a non-empty string', 'userId');
  }

  if (!context.sessionId || typeof context.sessionId !== 'string') {
    throw new ValidationError('sessionId must be a non-empty string', 'sessionId');
  }

  if (!Array.isArray(context.messages)) {
    throw new ValidationError('messages must be an array', 'messages');
  }

  context.messages.forEach((message: any, index: number) => {
    if (!validateChatMessage(message)) {
      throw new ValidationError(`Invalid message at index ${index}`, `messages[${index}]`);
    }
  });

  if (!(context.createdAt instanceof Date) && !isValidDateString(context.createdAt)) {
    throw new ValidationError('createdAt must be a valid Date', 'createdAt');
  }

  if (!(context.lastUpdated instanceof Date) && !isValidDateString(context.lastUpdated)) {
    throw new ValidationError('lastUpdated must be a valid Date', 'lastUpdated');
  }

  if (typeof context.tokenCount !== 'number' || context.tokenCount < 0) {
    throw new ValidationError('tokenCount must be a non-negative number', 'tokenCount');
  }

  return true;
}

/**
 * Validates a ChatMessage object
 */
export function validateChatMessage(message: any): message is ChatMessage {
  if (!message || typeof message !== 'object') {
    return false;
  }

  if (!['user', 'assistant'].includes(message.role)) {
    return false;
  }

  if (!message.content || typeof message.content !== 'string') {
    return false;
  }

  if (!(message.timestamp instanceof Date) && !isValidDateString(message.timestamp)) {
    return false;
  }

  return true;
}

/**
 * Validates a SubscriptionStatus object
 */
export function validateSubscriptionStatus(status: any): status is SubscriptionStatus {
  if (!status || typeof status !== 'object') {
    throw new ValidationError('Status must be an object');
  }

  if (!status.userId || typeof status.userId !== 'string') {
    throw new ValidationError('userId must be a non-empty string', 'userId');
  }

  if (!isValidUserTier(status.tier)) {
    throw new ValidationError('tier must be "free" or "premium"', 'tier');
  }

  if (status.subscriptionId !== undefined && typeof status.subscriptionId !== 'string') {
    throw new ValidationError('subscriptionId must be a string if provided', 'subscriptionId');
  }

  if (status.expiresAt !== undefined && !(status.expiresAt instanceof Date) && !isValidDateString(status.expiresAt)) {
    throw new ValidationError('expiresAt must be a valid Date if provided', 'expiresAt');
  }

  if (typeof status.dailyUsageCount !== 'number' || status.dailyUsageCount < 0) {
    throw new ValidationError('dailyUsageCount must be a non-negative number', 'dailyUsageCount');
  }

  if (!(status.lastResetDate instanceof Date) && !isValidDateString(status.lastResetDate)) {
    throw new ValidationError('lastResetDate must be a valid Date', 'lastResetDate');
  }

  return true;
}

/**
 * Validates a UserTier value
 */
export function isValidUserTier(tier: any): tier is UserTier {
  return tier === 'free' || tier === 'premium';
}

/**
 * Validates an AppConfig object
 */
export function validateAppConfig(config: any): config is AppConfig {
  if (!config || typeof config !== 'object') {
    throw new ValidationError('Config must be an object');
  }

  if (!config.openRouterApiKey || typeof config.openRouterApiKey !== 'string') {
    throw new ValidationError('openRouterApiKey must be a non-empty string', 'openRouterApiKey');
  }

  if (!config.openRouterBaseUrl || typeof config.openRouterBaseUrl !== 'string') {
    throw new ValidationError('openRouterBaseUrl must be a non-empty string', 'openRouterBaseUrl');
  }

  if (!isValidUrl(config.openRouterBaseUrl)) {
    throw new ValidationError('openRouterBaseUrl must be a valid URL', 'openRouterBaseUrl');
  }

  if (typeof config.freeUserDailyLimit !== 'number' || config.freeUserDailyLimit <= 0) {
    throw new ValidationError('freeUserDailyLimit must be a positive number', 'freeUserDailyLimit');
  }

  if (!config.freeUserModel || typeof config.freeUserModel !== 'string') {
    throw new ValidationError('freeUserModel must be a non-empty string', 'freeUserModel');
  }

  if (!config.premiumUserModel || typeof config.premiumUserModel !== 'string') {
    throw new ValidationError('premiumUserModel must be a non-empty string', 'premiumUserModel');
  }

  if (typeof config.maxContextTokens !== 'number' || config.maxContextTokens <= 0) {
    throw new ValidationError('maxContextTokens must be a positive number', 'maxContextTokens');
  }

  if (typeof config.responseTimeoutMs !== 'number' || config.responseTimeoutMs <= 0) {
    throw new ValidationError('responseTimeoutMs must be a positive number', 'responseTimeoutMs');
  }

  return true;
}

/**
 * Helper function to check if a string represents a valid date
 */
function isValidDateString(dateString: any): boolean {
  if (typeof dateString !== 'string') {
    return false;
  }
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

/**
 * Helper function to validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitizes and normalizes a ConversationContext object
 */
export function sanitizeConversationContext(context: any): ConversationContext {
  validateConversationContext(context);
  
  return {
    userId: context.userId.trim(),
    sessionId: context.sessionId.trim(),
    messages: context.messages.map((msg: any) => sanitizeChatMessage(msg)),
    createdAt: context.createdAt instanceof Date ? context.createdAt : new Date(context.createdAt),
    lastUpdated: context.lastUpdated instanceof Date ? context.lastUpdated : new Date(context.lastUpdated),
    tokenCount: Math.max(0, Math.floor(context.tokenCount)),
  };
}

/**
 * Sanitizes and normalizes a ChatMessage object
 */
export function sanitizeChatMessage(message: any): ChatMessage {
  if (!validateChatMessage(message)) {
    throw new ValidationError('Invalid chat message');
  }

  return {
    role: message.role,
    content: message.content.trim(),
    timestamp: message.timestamp instanceof Date ? message.timestamp : new Date(message.timestamp),
  };
}

/**
 * Sanitizes and normalizes a SubscriptionStatus object
 */
export function sanitizeSubscriptionStatus(status: any): SubscriptionStatus {
  validateSubscriptionStatus(status);

  return {
    userId: status.userId.trim(),
    tier: status.tier,
    subscriptionId: status.subscriptionId?.trim(),
    expiresAt: status.expiresAt instanceof Date ? status.expiresAt : (status.expiresAt ? new Date(status.expiresAt) : undefined),
    dailyUsageCount: Math.max(0, Math.floor(status.dailyUsageCount)),
    lastResetDate: status.lastResetDate instanceof Date ? status.lastResetDate : new Date(status.lastResetDate),
  };
}