import {
  validateConversationContext,
  validateChatMessage,
  validateSubscriptionStatus,
  validateAppConfig,
  ValidationError,
  sanitizeConversationContext,
  sanitizeChatMessage,
  sanitizeSubscriptionStatus,
} from '../models/ValidationUtils';

describe('ValidationUtils', () => {
  describe('validateChatMessage', () => {
    it('should validate a correct chat message', () => {
      const message = {
        role: 'user' as const,
        content: 'Hello world',
        timestamp: new Date(),
      };
      expect(validateChatMessage(message)).toBe(true);
    });

    it('should reject invalid role', () => {
      const message = {
        role: 'invalid',
        content: 'Hello world',
        timestamp: new Date(),
      };
      expect(validateChatMessage(message)).toBe(false);
    });

    it('should reject empty content', () => {
      const message = {
        role: 'user' as const,
        content: '',
        timestamp: new Date(),
      };
      expect(validateChatMessage(message)).toBe(false);
    });

    it('should accept valid date string', () => {
      const message = {
        role: 'assistant' as const,
        content: 'Hello back',
        timestamp: '2023-01-01T00:00:00.000Z',
      };
      expect(validateChatMessage(message)).toBe(true);
    });
  });

  describe('validateConversationContext', () => {
    const validContext = {
      userId: 'user123',
      sessionId: 'session456',
      messages: [
        {
          role: 'user' as const,
          content: 'Hello',
          timestamp: new Date(),
        },
      ],
      createdAt: new Date(),
      lastUpdated: new Date(),
      tokenCount: 10,
    };

    it('should validate a correct conversation context', () => {
      expect(validateConversationContext(validContext)).toBe(true);
    });

    it('should throw error for missing userId', () => {
      const context = { ...validContext, userId: '' };
      expect(() => validateConversationContext(context)).toThrow(ValidationError);
    });

    it('should throw error for invalid messages array', () => {
      const context = { ...validContext, messages: 'not an array' };
      expect(() => validateConversationContext(context)).toThrow(ValidationError);
    });

    it('should throw error for negative token count', () => {
      const context = { ...validContext, tokenCount: -1 };
      expect(() => validateConversationContext(context)).toThrow(ValidationError);
    });

    it('should accept valid date strings', () => {
      const context = {
        ...validContext,
        createdAt: '2023-01-01T00:00:00.000Z',
        lastUpdated: '2023-01-01T00:00:00.000Z',
      };
      expect(validateConversationContext(context)).toBe(true);
    });
  });

  describe('validateSubscriptionStatus', () => {
    const validStatus = {
      userId: 'user123',
      tier: 'free' as const,
      dailyUsageCount: 3,
      lastResetDate: new Date(),
    };

    it('should validate a correct subscription status', () => {
      expect(validateSubscriptionStatus(validStatus)).toBe(true);
    });

    it('should throw error for invalid tier', () => {
      const status = { ...validStatus, tier: 'invalid' };
      expect(() => validateSubscriptionStatus(status)).toThrow(ValidationError);
    });

    it('should throw error for negative usage count', () => {
      const status = { ...validStatus, dailyUsageCount: -1 };
      expect(() => validateSubscriptionStatus(status)).toThrow(ValidationError);
    });

    it('should accept optional fields', () => {
      const status = {
        ...validStatus,
        subscriptionId: 'sub123',
        expiresAt: new Date(),
      };
      expect(validateSubscriptionStatus(status)).toBe(true);
    });
  });

  describe('validateAppConfig', () => {
    const validConfig = {
      openRouterApiKey: 'sk-test123',
      openRouterBaseUrl: 'https://openrouter.ai/api/v1',
      freeUserDailyLimit: 5,
      freeUserModel: 'gpt-3.5-turbo',
      premiumUserModel: 'gpt-4',
      maxContextTokens: 4000,
      responseTimeoutMs: 7000,
    };

    it('should validate a correct app config', () => {
      expect(validateAppConfig(validConfig)).toBe(true);
    });

    it('should throw error for missing API key', () => {
      const config = { ...validConfig, openRouterApiKey: '' };
      expect(() => validateAppConfig(config)).toThrow(ValidationError);
    });

    it('should throw error for invalid URL', () => {
      const config = { ...validConfig, openRouterBaseUrl: 'not-a-url' };
      expect(() => validateAppConfig(config)).toThrow(ValidationError);
    });

    it('should throw error for non-positive limits', () => {
      const config = { ...validConfig, freeUserDailyLimit: 0 };
      expect(() => validateAppConfig(config)).toThrow(ValidationError);
    });
  });

  describe('sanitization functions', () => {
    it('should sanitize conversation context', () => {
      const context = {
        userId: '  user123  ',
        sessionId: '  session456  ',
        messages: [
          {
            role: 'user' as const,
            content: '  Hello  ',
            timestamp: '2023-01-01T00:00:00.000Z',
          },
        ],
        createdAt: '2023-01-01T00:00:00.000Z',
        lastUpdated: '2023-01-01T00:00:00.000Z',
        tokenCount: 10.7,
      };

      const sanitized = sanitizeConversationContext(context);
      expect(sanitized.userId).toBe('user123');
      expect(sanitized.sessionId).toBe('session456');
      expect(sanitized.messages[0].content).toBe('Hello');
      expect(sanitized.tokenCount).toBe(10);
      expect(sanitized.createdAt).toBeInstanceOf(Date);
    });

    it('should sanitize chat message', () => {
      const message = {
        role: 'assistant' as const,
        content: '  Hello back  ',
        timestamp: '2023-01-01T00:00:00.000Z',
      };

      const sanitized = sanitizeChatMessage(message);
      expect(sanitized.content).toBe('Hello back');
      expect(sanitized.timestamp).toBeInstanceOf(Date);
    });

    it('should sanitize subscription status', () => {
      const status = {
        userId: '  user123  ',
        tier: 'premium' as const,
        subscriptionId: '  sub123  ',
        dailyUsageCount: 5.8,
        lastResetDate: '2023-01-01T00:00:00.000Z',
      };

      const sanitized = sanitizeSubscriptionStatus(status);
      expect(sanitized.userId).toBe('user123');
      expect(sanitized.subscriptionId).toBe('sub123');
      expect(sanitized.dailyUsageCount).toBe(5);
      expect(sanitized.lastResetDate).toBeInstanceOf(Date);
    });
  });
});