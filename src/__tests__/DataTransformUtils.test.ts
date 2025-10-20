import {
  serializeConversationContext,
  deserializeConversationContext,
  serializeChatMessage,
  deserializeChatMessage,
  serializeSubscriptionStatus,
  deserializeSubscriptionStatus,
  createNewConversationContext,
  createNewFreeUserSubscription,
  addMessageToContext,
  truncateContextToTokenLimit,
  shouldResetDailyUsage,
  resetDailyUsage,
  incrementDailyUsage,
} from '../models/DataTransformUtils';

describe('DataTransformUtils', () => {
  describe('ChatMessage serialization', () => {
    it('should serialize and deserialize chat message correctly', () => {
      const message = {
        role: 'user' as const,
        content: 'Hello world',
        timestamp: new Date('2023-01-01T00:00:00.000Z'),
      };

      const serialized = serializeChatMessage(message);
      expect(serialized).toEqual({
        role: 'user',
        content: 'Hello world',
        timestamp: '2023-01-01T00:00:00.000Z',
      });

      const deserialized = deserializeChatMessage(serialized);
      expect(deserialized).toEqual(message);
    });
  });

  describe('ConversationContext serialization', () => {
    it('should serialize and deserialize conversation context correctly', () => {
      const context = {
        userId: 'user123',
        sessionId: 'session456',
        messages: [
          {
            role: 'user' as const,
            content: 'Hello',
            timestamp: new Date('2023-01-01T00:00:00.000Z'),
          },
          {
            role: 'assistant' as const,
            content: 'Hi there!',
            timestamp: new Date('2023-01-01T00:01:00.000Z'),
          },
        ],
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        lastUpdated: new Date('2023-01-01T00:01:00.000Z'),
        tokenCount: 25,
      };

      const serialized = serializeConversationContext(context);
      const deserialized = deserializeConversationContext(serialized);

      expect(deserialized.userId).toBe(context.userId);
      expect(deserialized.sessionId).toBe(context.sessionId);
      expect(deserialized.messages).toHaveLength(2);
      expect(deserialized.messages[0].content).toBe('Hello');
      expect(deserialized.tokenCount).toBe(25);
    });
  });

  describe('SubscriptionStatus serialization', () => {
    it('should serialize and deserialize subscription status correctly', () => {
      const status = {
        userId: 'user123',
        tier: 'premium' as const,
        subscriptionId: 'sub456',
        expiresAt: new Date('2024-01-01T00:00:00.000Z'),
        dailyUsageCount: 10,
        lastResetDate: new Date('2023-01-01T00:00:00.000Z'),
      };

      const serialized = serializeSubscriptionStatus(status);
      const deserialized = deserializeSubscriptionStatus(serialized);

      expect(deserialized).toEqual(status);
    });

    it('should handle optional fields correctly', () => {
      const status = {
        userId: 'user123',
        tier: 'free' as const,
        dailyUsageCount: 3,
        lastResetDate: new Date('2023-01-01T00:00:00.000Z'),
      };

      const serialized = serializeSubscriptionStatus(status);
      const deserialized = deserializeSubscriptionStatus(serialized);

      expect(deserialized.subscriptionId).toBeUndefined();
      expect(deserialized.expiresAt).toBeUndefined();
    });
  });

  describe('Factory functions', () => {
    it('should create new conversation context', () => {
      const context = createNewConversationContext('user123', 'session456');
      
      expect(context.userId).toBe('user123');
      expect(context.sessionId).toBe('session456');
      expect(context.messages).toEqual([]);
      expect(context.tokenCount).toBe(0);
      expect(context.createdAt).toBeInstanceOf(Date);
      expect(context.lastUpdated).toBeInstanceOf(Date);
    });

    it('should create new free user subscription', () => {
      const subscription = createNewFreeUserSubscription('user123');
      
      expect(subscription.userId).toBe('user123');
      expect(subscription.tier).toBe('free');
      expect(subscription.dailyUsageCount).toBe(0);
      expect(subscription.lastResetDate).toBeInstanceOf(Date);
    });
  });

  describe('Context manipulation', () => {
    it('should add message to context', () => {
      const context = createNewConversationContext('user123', 'session456');
      const updatedContext = addMessageToContext(context, 'user', 'Hello', 10);
      
      expect(updatedContext.messages).toHaveLength(1);
      expect(updatedContext.messages[0].content).toBe('Hello');
      expect(updatedContext.messages[0].role).toBe('user');
      expect(updatedContext.tokenCount).toBe(10);
    });

    it('should truncate context to token limit', () => {
      const context = {
        userId: 'user123',
        sessionId: 'session456',
        messages: [
          { role: 'user' as const, content: 'A'.repeat(100), timestamp: new Date() },
          { role: 'assistant' as const, content: 'B'.repeat(100), timestamp: new Date() },
          { role: 'user' as const, content: 'C'.repeat(100), timestamp: new Date() },
        ],
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 300,
      };

      const truncated = truncateContextToTokenLimit(context, 60);
      
      expect(truncated.messages.length).toBeLessThan(context.messages.length);
      expect(truncated.tokenCount).toBeLessThanOrEqual(60);
    });
  });

  describe('Usage management', () => {
    it('should detect when daily usage needs reset', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      
      const status = {
        userId: 'user123',
        tier: 'free' as const,
        dailyUsageCount: 5,
        lastResetDate: yesterday,
      };

      expect(shouldResetDailyUsage(status)).toBe(true);
    });

    it('should not reset usage on same day', () => {
      const status = {
        userId: 'user123',
        tier: 'free' as const,
        dailyUsageCount: 3,
        lastResetDate: new Date(),
      };

      expect(shouldResetDailyUsage(status)).toBe(false);
    });

    it('should reset daily usage', () => {
      const status = {
        userId: 'user123',
        tier: 'free' as const,
        dailyUsageCount: 5,
        lastResetDate: new Date('2023-01-01'),
      };

      const reset = resetDailyUsage(status);
      
      expect(reset.dailyUsageCount).toBe(0);
      expect(reset.lastResetDate.toDateString()).toBe(new Date().toDateString());
    });

    it('should increment daily usage', () => {
      const status = {
        userId: 'user123',
        tier: 'free' as const,
        dailyUsageCount: 3,
        lastResetDate: new Date(),
      };

      const incremented = incrementDailyUsage(status);
      
      expect(incremented.dailyUsageCount).toBe(4);
    });
  });
});