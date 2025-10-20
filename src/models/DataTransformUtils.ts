import { ConversationContext, ChatMessage } from './ConversationContext';
import { SubscriptionStatus } from './SubscriptionStatus';
import { sanitizeConversationContext, sanitizeSubscriptionStatus } from './ValidationUtils';

/**
 * Serialization utilities for data models
 */

/**
 * Converts ConversationContext to DynamoDB-compatible format
 */
export function serializeConversationContext(context: ConversationContext): Record<string, any> {
  return {
    userId: context.userId,
    sessionId: context.sessionId,
    messages: context.messages.map(serializeChatMessage),
    createdAt: context.createdAt.toISOString(),
    lastUpdated: context.lastUpdated.toISOString(),
    tokenCount: context.tokenCount,
  };
}

/**
 * Converts DynamoDB format back to ConversationContext
 */
export function deserializeConversationContext(data: Record<string, any>): ConversationContext {
  const context = {
    userId: data.userId,
    sessionId: data.sessionId,
    messages: (data.messages || []).map(deserializeChatMessage),
    createdAt: new Date(data.createdAt),
    lastUpdated: new Date(data.lastUpdated),
    tokenCount: data.tokenCount || 0,
  };

  return sanitizeConversationContext(context);
}

/**
 * Converts ChatMessage to serializable format
 */
export function serializeChatMessage(message: ChatMessage): Record<string, any> {
  return {
    role: message.role,
    content: message.content,
    timestamp: message.timestamp.toISOString(),
  };
}

/**
 * Converts serialized format back to ChatMessage
 */
export function deserializeChatMessage(data: Record<string, any>): ChatMessage {
  return {
    role: data.role,
    content: data.content,
    timestamp: new Date(data.timestamp),
  };
}

/**
 * Converts SubscriptionStatus to DynamoDB-compatible format
 */
export function serializeSubscriptionStatus(status: SubscriptionStatus): Record<string, any> {
  return {
    userId: status.userId,
    tier: status.tier,
    subscriptionId: status.subscriptionId,
    expiresAt: status.expiresAt?.toISOString(),
    dailyUsageCount: status.dailyUsageCount,
    lastResetDate: status.lastResetDate.toISOString(),
  };
}

/**
 * Converts DynamoDB format back to SubscriptionStatus
 */
export function deserializeSubscriptionStatus(data: Record<string, any>): SubscriptionStatus {
  const status = {
    userId: data.userId,
    tier: data.tier,
    subscriptionId: data.subscriptionId,
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    dailyUsageCount: data.dailyUsageCount || 0,
    lastResetDate: new Date(data.lastResetDate),
  };

  return sanitizeSubscriptionStatus(status);
}

/**
 * Creates a new ConversationContext with default values
 */
export function createNewConversationContext(userId: string, sessionId: string): ConversationContext {
  const now = new Date();
  return {
    userId,
    sessionId,
    messages: [],
    createdAt: now,
    lastUpdated: now,
    tokenCount: 0,
  };
}

/**
 * Creates a new SubscriptionStatus for a free user
 */
export function createNewFreeUserSubscription(userId: string): SubscriptionStatus {
  const now = new Date();
  return {
    userId,
    tier: 'free',
    dailyUsageCount: 0,
    lastResetDate: now,
  };
}

/**
 * Adds a message to conversation context and updates metadata
 */
export function addMessageToContext(
  context: ConversationContext,
  role: 'user' | 'assistant',
  content: string,
  estimatedTokens: number = 0
): ConversationContext {
  const message: ChatMessage = {
    role,
    content,
    timestamp: new Date(),
  };

  return {
    ...context,
    messages: [...context.messages, message],
    lastUpdated: new Date(),
    tokenCount: context.tokenCount + estimatedTokens,
  };
}

/**
 * Truncates conversation context to fit within token limits
 */
export function truncateContextToTokenLimit(
  context: ConversationContext,
  maxTokens: number
): ConversationContext {
  if (context.tokenCount <= maxTokens) {
    return context;
  }

  // Keep the most recent messages that fit within the token limit
  const messages: ChatMessage[] = [];
  let tokenCount = 0;
  
  // Start from the end and work backwards
  for (let i = context.messages.length - 1; i >= 0; i--) {
    const message = context.messages[i];
    const estimatedTokens = Math.ceil(message.content.length / 4); // Rough estimation
    
    if (tokenCount + estimatedTokens <= maxTokens) {
      messages.unshift(message);
      tokenCount += estimatedTokens;
    } else {
      break;
    }
  }

  return {
    ...context,
    messages,
    tokenCount,
    lastUpdated: new Date(),
  };
}

/**
 * Checks if subscription status needs daily reset
 */
export function shouldResetDailyUsage(status: SubscriptionStatus): boolean {
  const now = new Date();
  const lastReset = status.lastResetDate;
  
  // Check if it's a new day (different date)
  return now.toDateString() !== lastReset.toDateString();
}

/**
 * Resets daily usage count for a subscription status
 */
export function resetDailyUsage(status: SubscriptionStatus): SubscriptionStatus {
  return {
    ...status,
    dailyUsageCount: 0,
    lastResetDate: new Date(),
  };
}

/**
 * Increments daily usage count
 */
export function incrementDailyUsage(status: SubscriptionStatus): SubscriptionStatus {
  return {
    ...status,
    dailyUsageCount: status.dailyUsageCount + 1,
  };
}