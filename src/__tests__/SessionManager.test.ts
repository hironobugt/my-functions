import { SessionManager } from '../services/SessionManager';
import { ConversationContextRepository } from '../repositories/ConversationContextRepository';
import { ConversationContext, ChatMessage } from '../models/ConversationContext';
import { AppConfig } from '../models/AppConfig';

// Mock the ConversationContextRepository
jest.mock('../repositories/ConversationContextRepository');

describe('SessionManager', () => {
  let sessionManager: SessionManager;
  let mockRepository: jest.Mocked<ConversationContextRepository>;
  
  const mockConfig = {
    maxContextTokens: 1000,
    sessionTimeoutMinutes: 30,
    maxMessagesPerSession: 10
  };

  const mockAppConfig: AppConfig = {
    openRouterApiKey: 'test-key',
    openRouterBaseUrl: 'https://test.com',
    freeUserDailyLimit: 5,
    freeUserModel: 'gpt-3.5-turbo',
    premiumUserModel: 'gpt-4',
    maxContextTokens: 1000,
    responseTimeoutMs: 7000
  };

  beforeEach(() => {
    mockRepository = new ConversationContextRepository(
      {} as any,
      { tableName: 'test' }
    ) as jest.Mocked<ConversationContextRepository>;
    
    sessionManager = new SessionManager(mockRepository, mockConfig);
    
    jest.clearAllMocks();
  });

  describe('getConversationContext', () => {
    it('should return null when no context exists', async () => {
      mockRepository.getConversationContext.mockResolvedValue(null);

      const result = await sessionManager.getConversationContext('user123');

      expect(result).toBeNull();
      expect(mockRepository.getConversationContext).toHaveBeenCalledWith('user123');
    });

    it('should return context when it exists and is not expired', async () => {
      const mockContext: ConversationContext = {
        userId: 'user123',
        sessionId: 'session123',
        messages: [],
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 0
      };

      mockRepository.getConversationContext.mockResolvedValue(mockContext);

      const result = await sessionManager.getConversationContext('user123');

      expect(result).toEqual(mockContext);
    });

    it('should clear and return null for expired sessions', async () => {
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 2); // 2 hours ago

      const mockContext: ConversationContext = {
        userId: 'user123',
        sessionId: 'session123',
        messages: [],
        createdAt: expiredDate,
        lastUpdated: expiredDate,
        tokenCount: 0
      };

      mockRepository.getConversationContext.mockResolvedValue(mockContext);
      mockRepository.clearConversationContext.mockResolvedValue();

      const result = await sessionManager.getConversationContext('user123');

      expect(result).toBeNull();
      expect(mockRepository.clearConversationContext).toHaveBeenCalledWith('user123');
    });

    it('should handle repository errors', async () => {
      mockRepository.getConversationContext.mockRejectedValue(new Error('DB error'));

      await expect(sessionManager.getConversationContext('user123'))
        .rejects.toThrow('Failed to get conversation context for user user123: DB error');
    });
  });

  describe('updateConversationContext', () => {
    it('should update context with new timestamp and token count', async () => {
      const oldDate = new Date('2023-01-01');
      const mockContext: ConversationContext = {
        userId: 'user123',
        sessionId: 'session123',
        messages: [
          {
            role: 'user',
            content: 'Hello',
            timestamp: new Date()
          }
        ],
        createdAt: new Date(),
        lastUpdated: oldDate,
        tokenCount: 0
      };

      mockRepository.saveConversationContext.mockResolvedValue();

      await sessionManager.updateConversationContext('user123', mockContext);

      expect(mockRepository.saveConversationContext).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          sessionId: 'session123',
          messages: mockContext.messages,
          lastUpdated: expect.any(Date),
          tokenCount: expect.any(Number)
        })
      );

      // Check that lastUpdated was updated
      const savedContext = mockRepository.saveConversationContext.mock.calls[0][0];
      expect(savedContext.lastUpdated.getTime()).toBeGreaterThan(oldDate.getTime());
    });

    it('should handle repository errors', async () => {
      const mockContext: ConversationContext = {
        userId: 'user123',
        sessionId: 'session123',
        messages: [],
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 0
      };

      mockRepository.saveConversationContext.mockRejectedValue(new Error('Save error'));

      await expect(sessionManager.updateConversationContext('user123', mockContext))
        .rejects.toThrow('Failed to update conversation context for user user123: Save error');
    });
  });

  describe('addMessage', () => {
    it('should create new context when none exists', async () => {
      const message: ChatMessage = {
        role: 'user',
        content: 'Hello',
        timestamp: new Date()
      };

      const newContext: ConversationContext = {
        userId: 'user123',
        sessionId: 'session123',
        messages: [],
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 0
      };

      mockRepository.getConversationContext.mockResolvedValue(null);
      mockRepository.startNewSession.mockResolvedValue(newContext);
      mockRepository.saveConversationContext.mockResolvedValue();

      const result = await sessionManager.addMessage('user123', message);

      expect(mockRepository.startNewSession).toHaveBeenCalledWith('user123');
      expect(result.messages).toContain(message);
    });

    it('should add message to existing context', async () => {
      const existingContext: ConversationContext = {
        userId: 'user123',
        sessionId: 'session123',
        messages: [
          {
            role: 'user',
            content: 'Previous message',
            timestamp: new Date()
          }
        ],
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 20
      };

      const newMessage: ChatMessage = {
        role: 'assistant',
        content: 'Hello there!',
        timestamp: new Date()
      };

      mockRepository.getConversationContext.mockResolvedValue(existingContext);
      mockRepository.saveConversationContext.mockResolvedValue();

      const result = await sessionManager.addMessage('user123', newMessage);

      expect(result.messages).toHaveLength(2);
      expect(result.messages[1]).toEqual(newMessage);
      // Token count should be recalculated based on all messages
      expect(result.tokenCount).toBeGreaterThan(0);
      expect(mockRepository.saveConversationContext).toHaveBeenCalled();
    });
  });

  describe('truncateContextIfNeeded', () => {
    it('should not truncate when within limits', () => {
      const context: ConversationContext = {
        userId: 'user123',
        sessionId: 'session123',
        messages: [
          { role: 'user', content: 'Short message', timestamp: new Date() }
        ],
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 50
      };

      const result = sessionManager.truncateContextIfNeeded(context);

      expect(result.messages).toHaveLength(1);
      expect(result.tokenCount).toBe(50);
    });

    it('should truncate when exceeding message count limit', () => {
      const messages: ChatMessage[] = [];
      for (let i = 0; i < 15; i++) {
        messages.push({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`,
          timestamp: new Date()
        });
      }

      const context: ConversationContext = {
        userId: 'user123',
        sessionId: 'session123',
        messages,
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 200
      };

      const result = sessionManager.truncateContextIfNeeded(context);

      expect(result.messages).toHaveLength(mockConfig.maxMessagesPerSession);
      // Should keep the most recent messages
      expect(result.messages[0].content).toBe('Message 5');
      expect(result.messages[9].content).toBe('Message 14');
    });

    it('should truncate when exceeding token limit', () => {
      const longMessage = 'A'.repeat(2000); // Very long message
      const context: ConversationContext = {
        userId: 'user123',
        sessionId: 'session123',
        messages: [
          { role: 'user', content: longMessage, timestamp: new Date() },
          { role: 'assistant', content: longMessage, timestamp: new Date() },
          { role: 'user', content: 'Short', timestamp: new Date() }
        ],
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 1500 // Exceeds limit
      };

      const result = sessionManager.truncateContextIfNeeded(context);

      expect(result.tokenCount).toBeLessThanOrEqual(mockConfig.maxContextTokens);
      expect(result.messages.length).toBeLessThan(context.messages.length);
    });
  });

  describe('shouldEndSession', () => {
    it('should return false for recent sessions', () => {
      const context: ConversationContext = {
        userId: 'user123',
        sessionId: 'session123',
        messages: [],
        createdAt: new Date(),
        lastUpdated: new Date(), // Current time
        tokenCount: 0
      };

      const result = sessionManager.shouldEndSession(context);

      expect(result).toBe(false);
    });

    it('should return true for expired sessions', () => {
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 2); // 2 hours ago

      const context: ConversationContext = {
        userId: 'user123',
        sessionId: 'session123',
        messages: [],
        createdAt: expiredDate,
        lastUpdated: expiredDate,
        tokenCount: 0
      };

      const result = sessionManager.shouldEndSession(context);

      expect(result).toBe(true);
    });

    it('should return false when timeout is disabled', () => {
      const sessionManagerNoTimeout = new SessionManager(mockRepository, {
        maxContextTokens: 1000,
        sessionTimeoutMinutes: undefined
      });

      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 2);

      const context: ConversationContext = {
        userId: 'user123',
        sessionId: 'session123',
        messages: [],
        createdAt: expiredDate,
        lastUpdated: expiredDate,
        tokenCount: 0
      };

      const result = sessionManagerNoTimeout.shouldEndSession(context);

      expect(result).toBe(false);
    });
  });

  describe('startNewSession', () => {
    it('should clear existing context and create new session', async () => {
      const newContext: ConversationContext = {
        userId: 'user123',
        sessionId: 'new_session123',
        messages: [],
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 0
      };

      mockRepository.clearConversationContext.mockResolvedValue();
      mockRepository.startNewSession.mockResolvedValue(newContext);

      const result = await sessionManager.startNewSession('user123');

      expect(mockRepository.clearConversationContext).toHaveBeenCalledWith('user123');
      expect(mockRepository.startNewSession).toHaveBeenCalledWith('user123');
      expect(result).toEqual(newContext);
    });
  });

  describe('getConversationSummary', () => {
    it('should return correct conversation statistics', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Hello', timestamp: new Date() },
        { role: 'assistant', content: 'Hi there!', timestamp: new Date() },
        { role: 'user', content: 'How are you?', timestamp: new Date() }
      ];

      const createdAt = new Date('2023-01-01T10:00:00Z');
      const lastUpdated = new Date('2023-01-01T10:05:00Z');

      const context: ConversationContext = {
        userId: 'user123',
        sessionId: 'session123',
        messages,
        createdAt,
        lastUpdated,
        tokenCount: 100
      };

      const summary = sessionManager.getConversationSummary(context);

      expect(summary).toEqual({
        messageCount: 3,
        tokenCount: 100,
        duration: 300, // 5 minutes in seconds
        userMessages: 2,
        assistantMessages: 1
      });
    });
  });

  describe('fromConfig', () => {
    it('should create SessionManager from AppConfig', () => {
      const sessionManager = SessionManager.fromConfig(mockRepository, mockAppConfig);

      expect(sessionManager).toBeInstanceOf(SessionManager);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should delegate to repository cleanup method', async () => {
      mockRepository.cleanupExpiredContexts.mockResolvedValue(5);

      const result = await sessionManager.cleanupExpiredSessions();

      expect(result).toBe(5);
      expect(mockRepository.cleanupExpiredContexts).toHaveBeenCalled();
    });

    it('should handle cleanup errors', async () => {
      mockRepository.cleanupExpiredContexts.mockRejectedValue(new Error('Cleanup error'));

      await expect(sessionManager.cleanupExpiredSessions())
        .rejects.toThrow('Failed to cleanup expired sessions: Cleanup error');
    });
  });

  describe('handleConversationTurn', () => {
    it('should add both user and assistant messages in sequence', async () => {
      const existingContext: ConversationContext = {
        userId: 'user123',
        sessionId: 'session123',
        messages: [],
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 0
      };

      mockRepository.getConversationContext.mockResolvedValue(existingContext);
      mockRepository.saveConversationContext.mockResolvedValue();

      const result = await sessionManager.handleConversationTurn(
        'user123',
        'Hello AI',
        'Hello! How can I help you?'
      );

      expect(result.messages).toHaveLength(2);
      expect(result.messages[0].role).toBe('user');
      expect(result.messages[0].content).toBe('Hello AI');
      expect(result.messages[1].role).toBe('assistant');
      expect(result.messages[1].content).toBe('Hello! How can I help you?');
    });

    it('should handle errors during conversation turn', async () => {
      mockRepository.getConversationContext.mockRejectedValue(new Error('DB error'));

      await expect(sessionManager.handleConversationTurn('user123', 'Hello', 'Hi'))
        .rejects.toThrow('Failed to handle conversation turn for user user123');
    });
  });

  describe('getFormattedConversationHistory', () => {
    it('should return empty string when no context exists', async () => {
      mockRepository.getConversationContext.mockResolvedValue(null);

      const result = await sessionManager.getFormattedConversationHistory('user123');

      expect(result).toBe('');
    });

    it('should format conversation history correctly', async () => {
      const context: ConversationContext = {
        userId: 'user123',
        sessionId: 'session123',
        messages: [
          { role: 'user', content: 'Hello', timestamp: new Date() },
          { role: 'assistant', content: 'Hi there!', timestamp: new Date() },
          { role: 'user', content: 'How are you?', timestamp: new Date() }
        ],
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 50
      };

      mockRepository.getConversationContext.mockResolvedValue(context);

      const result = await sessionManager.getFormattedConversationHistory('user123');

      expect(result).toBe('User: Hello\nAssistant: Hi there!\nUser: How are you?');
    });
  });

  describe('shouldContinueConversation', () => {
    let context: ConversationContext;

    beforeEach(() => {
      context = {
        userId: 'user123',
        sessionId: 'session123',
        messages: [],
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 0
      };
    });

    it('should return true for normal conversation', () => {
      const result = sessionManager.shouldContinueConversation(context, 'Tell me more');

      expect(result).toBe(true);
    });

    it('should return false for expired sessions', () => {
      const expiredDate = new Date();
      expiredDate.setHours(expiredDate.getHours() - 2);
      context.lastUpdated = expiredDate;

      const result = sessionManager.shouldContinueConversation(context, 'Hello');

      expect(result).toBe(false);
    });

    it('should return false for stop commands', () => {
      const stopCommands = ['stop', 'exit', 'quit', 'goodbye', 'bye', 'end'];

      stopCommands.forEach(command => {
        const result = sessionManager.shouldContinueConversation(context, command);
        expect(result).toBe(false);
      });
    });

    it('should return false when message limit is reached', () => {
      // Fill context with max messages
      for (let i = 0; i < mockConfig.maxMessagesPerSession!; i++) {
        context.messages.push({
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`,
          timestamp: new Date()
        });
      }

      const result = sessionManager.shouldContinueConversation(context, 'More messages');

      expect(result).toBe(false);
    });
  });

  describe('prepareContextForLLM', () => {
    it('should return empty context when no conversation exists', async () => {
      mockRepository.getConversationContext.mockResolvedValue(null);

      const result = await sessionManager.prepareContextForLLM('user123');

      expect(result).toEqual({ messages: [], tokenCount: 0 });
    });

    it('should format messages for LLM API', async () => {
      const context: ConversationContext = {
        userId: 'user123',
        sessionId: 'session123',
        messages: [
          { role: 'user', content: 'Hello', timestamp: new Date() },
          { role: 'assistant', content: 'Hi!', timestamp: new Date() }
        ],
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 30
      };

      mockRepository.getConversationContext.mockResolvedValue(context);

      const result = await sessionManager.prepareContextForLLM('user123');

      expect(result.messages).toEqual([
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi!' }
      ]);
      expect(result.tokenCount).toBeGreaterThan(0);
    });
  });

  describe('endConversationGracefully', () => {
    it('should log summary and clear context', async () => {
      const context: ConversationContext = {
        userId: 'user123',
        sessionId: 'session123',
        messages: [
          { role: 'user', content: 'Hello', timestamp: new Date() }
        ],
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 20
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockRepository.getConversationContext.mockResolvedValue(context);
      mockRepository.clearConversationContext.mockResolvedValue();

      await sessionManager.endConversationGracefully('user123', 'timeout');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Ending conversation for user user123:',
        expect.objectContaining({
          reason: 'timeout',
          summary: expect.any(Object)
        })
      );
      expect(mockRepository.clearConversationContext).toHaveBeenCalledWith('user123');

      consoleSpy.mockRestore();
    });

    it('should handle case when no context exists', async () => {
      mockRepository.getConversationContext.mockResolvedValue(null);
      mockRepository.clearConversationContext.mockResolvedValue();

      await sessionManager.endConversationGracefully('user123');

      expect(mockRepository.clearConversationContext).toHaveBeenCalledWith('user123');
    });
  });

  describe('performScheduledCleanup', () => {
    it('should perform cleanup and return results', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockRepository.cleanupExpiredContexts.mockResolvedValue(3);

      const result = await sessionManager.performScheduledCleanup();

      expect(result).toEqual({
        cleanedCount: 3,
        errors: []
      });
      expect(consoleSpy).toHaveBeenCalledWith('Scheduled cleanup completed: 3 sessions cleaned');

      consoleSpy.mockRestore();
    });

    it('should handle cleanup errors gracefully', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockRepository.cleanupExpiredContexts.mockRejectedValue(new Error('Cleanup failed'));

      const result = await sessionManager.performScheduledCleanup();

      expect(result.cleanedCount).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Scheduled cleanup failed');
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('validateAndRepairContext', () => {
    it('should return null when no context exists', async () => {
      mockRepository.getConversationContext.mockResolvedValue(null);

      const result = await sessionManager.validateAndRepairContext('user123');

      expect(result).toBeNull();
    });

    it('should repair incorrect token count', async () => {
      const context: ConversationContext = {
        userId: 'user123',
        sessionId: 'session123',
        messages: [
          { role: 'user', content: 'Hello', timestamp: new Date() }
        ],
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 1000 // Incorrect token count
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockRepository.getConversationContext.mockResolvedValue(context);
      mockRepository.saveConversationContext.mockResolvedValue();

      const result = await sessionManager.validateAndRepairContext('user123');

      expect(result?.tokenCount).not.toBe(1000);
      expect(mockRepository.saveConversationContext).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('Repaired conversation context for user user123');

      consoleSpy.mockRestore();
    });

    it('should repair message order', async () => {
      const oldDate = new Date('2023-01-01T10:00:00Z');
      const newDate = new Date('2023-01-01T11:00:00Z');

      const context: ConversationContext = {
        userId: 'user123',
        sessionId: 'session123',
        messages: [
          { role: 'assistant', content: 'Second', timestamp: newDate },
          { role: 'user', content: 'First', timestamp: oldDate }
        ],
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 30
      };

      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockRepository.getConversationContext.mockResolvedValue(context);
      mockRepository.saveConversationContext.mockResolvedValue();

      const result = await sessionManager.validateAndRepairContext('user123');

      expect(result?.messages[0].content).toBe('First');
      expect(result?.messages[1].content).toBe('Second');
      expect(mockRepository.saveConversationContext).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should not repair when context is valid', async () => {
      const context: ConversationContext = {
        userId: 'user123',
        sessionId: 'session123',
        messages: [
          { role: 'user', content: 'Hello', timestamp: new Date() }
        ],
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 13 // Correct token count (Hello = 1 token + 10 overhead + 2 for role)
      };

      mockRepository.getConversationContext.mockResolvedValue(context);

      const result = await sessionManager.validateAndRepairContext('user123');

      expect(result).toEqual(context);
      expect(mockRepository.saveConversationContext).not.toHaveBeenCalled();
    });
  });

  describe('getSessionStatistics', () => {
    it('should return placeholder statistics', async () => {
      const result = await sessionManager.getSessionStatistics();

      expect(result).toEqual({
        totalActiveSessions: 0,
        averageTokensPerSession: 0,
        averageMessagesPerSession: 0
      });
    });
  });
});