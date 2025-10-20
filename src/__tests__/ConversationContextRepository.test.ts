import { ConversationContextRepository } from '../repositories/ConversationContextRepository';
import { ConversationContext, ChatMessage } from '../models/ConversationContext';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

// Mock DynamoDBOperations
jest.mock('../utils/DynamoDBClient', () => ({
  DynamoDBOperations: jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    scan: jest.fn()
  }))
}));

describe('ConversationContextRepository', () => {
  let repository: ConversationContextRepository;
  let mockDocumentClient: jest.Mocked<DocumentClient>;
  let mockOperations: any;

  const tableName = 'test-conversations';
  const userId = 'user123';

  beforeEach(() => {
    mockDocumentClient = {} as jest.Mocked<DocumentClient>;
    
    // Get the mocked operations instance
    const { DynamoDBOperations } = require('../utils/DynamoDBClient');
    mockOperations = {
      get: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      scan: jest.fn()
    };
    DynamoDBOperations.mockImplementation(() => mockOperations);

    repository = new ConversationContextRepository(mockDocumentClient, {
      tableName,
      ttlHours: 24
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getConversationContext', () => {
    it('should return null when no context exists', async () => {
      mockOperations.get.mockResolvedValue({ Item: null });

      const result = await repository.getConversationContext(userId);

      expect(result).toBeNull();
      expect(mockOperations.get).toHaveBeenCalledWith({
        TableName: tableName,
        Key: { userId }
      });
    });

    it('should return deserialized context when it exists', async () => {
      const mockItem = {
        userId,
        sessionId: 'session123',
        messages: [
          {
            role: 'user',
            content: 'Hello',
            timestamp: '2023-01-01T00:00:00.000Z'
          }
        ],
        createdAt: '2023-01-01T00:00:00.000Z',
        lastUpdated: '2023-01-01T00:00:00.000Z',
        tokenCount: 10
      };

      mockOperations.get.mockResolvedValue({ Item: mockItem });

      const result = await repository.getConversationContext(userId);

      expect(result).toEqual({
        userId,
        sessionId: 'session123',
        messages: [
          {
            role: 'user',
            content: 'Hello',
            timestamp: new Date('2023-01-01T00:00:00.000Z')
          }
        ],
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        lastUpdated: new Date('2023-01-01T00:00:00.000Z'),
        tokenCount: 10
      });
    });

    it('should throw error when get operation fails', async () => {
      mockOperations.get.mockRejectedValue(new Error('DynamoDB error'));

      await expect(repository.getConversationContext(userId))
        .rejects.toThrow('Failed to get conversation context for user user123');
    });
  });

  describe('saveConversationContext', () => {
    it('should save serialized context', async () => {
      const context: ConversationContext = {
        userId,
        sessionId: 'session123',
        messages: [
          {
            role: 'user',
            content: 'Hello',
            timestamp: new Date('2023-01-01T00:00:00.000Z')
          }
        ],
        createdAt: new Date('2023-01-01T00:00:00.000Z'),
        lastUpdated: new Date('2023-01-01T00:00:00.000Z'),
        tokenCount: 10
      };

      mockOperations.put.mockResolvedValue({});

      await repository.saveConversationContext(context);

      expect(mockOperations.put).toHaveBeenCalledWith({
        TableName: tableName,
        Item: expect.objectContaining({
          userId,
          sessionId: 'session123',
          messages: [
            {
              role: 'user',
              content: 'Hello',
              timestamp: '2023-01-01T00:00:00.000Z'
            }
          ],
          createdAt: '2023-01-01T00:00:00.000Z',
          lastUpdated: '2023-01-01T00:00:00.000Z',
          tokenCount: 10,
          ttl: expect.any(Number)
        })
      });
    });

    it('should throw error when put operation fails', async () => {
      const context: ConversationContext = {
        userId,
        sessionId: 'session123',
        messages: [],
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 0
      };

      mockOperations.put.mockRejectedValue(new Error('DynamoDB error'));

      await expect(repository.saveConversationContext(context))
        .rejects.toThrow('Failed to save conversation context for user user123');
    });
  });

  describe('addMessage', () => {
    const message: ChatMessage = {
      role: 'user',
      content: 'Hello world',
      timestamp: new Date('2023-01-01T00:00:00.000Z')
    };

    it('should create new context when none exists', async () => {
      mockOperations.get.mockResolvedValue({ Item: null });
      mockOperations.put.mockResolvedValue({});

      const result = await repository.addMessage(userId, message);

      expect(result.userId).toBe(userId);
      expect(result.messages).toHaveLength(1);
      expect(result.messages[0]).toEqual(message);
      expect(result.tokenCount).toBeGreaterThan(0);
      expect(mockOperations.put).toHaveBeenCalled();
    });

    it('should add message to existing context', async () => {
      const existingContext = {
        userId,
        sessionId: 'session123',
        messages: [
          {
            role: 'assistant',
            content: 'Hi there',
            timestamp: '2023-01-01T00:00:00.000Z'
          }
        ],
        createdAt: '2023-01-01T00:00:00.000Z',
        lastUpdated: '2023-01-01T00:00:00.000Z',
        tokenCount: 5
      };

      mockOperations.get.mockResolvedValue({ Item: existingContext });
      mockOperations.put.mockResolvedValue({});

      const result = await repository.addMessage(userId, message);

      expect(result.messages).toHaveLength(2);
      expect(result.messages[1]).toEqual(message);
      expect(result.tokenCount).toBeGreaterThan(5);
      expect(mockOperations.put).toHaveBeenCalled();
    });
  });

  describe('startNewSession', () => {
    it('should create new session context', async () => {
      mockOperations.put.mockResolvedValue({});

      const result = await repository.startNewSession(userId);

      expect(result.userId).toBe(userId);
      expect(result.sessionId).toMatch(/^session_/);
      expect(result.messages).toHaveLength(0);
      expect(result.tokenCount).toBe(0);
      expect(mockOperations.put).toHaveBeenCalled();
    });
  });

  describe('clearConversationContext', () => {
    it('should delete context for user', async () => {
      mockOperations.delete.mockResolvedValue({});

      await repository.clearConversationContext(userId);

      expect(mockOperations.delete).toHaveBeenCalledWith({
        TableName: tableName,
        Key: { userId }
      });
    });

    it('should throw error when delete operation fails', async () => {
      mockOperations.delete.mockRejectedValue(new Error('DynamoDB error'));

      await expect(repository.clearConversationContext(userId))
        .rejects.toThrow('Failed to clear conversation context for user user123');
    });
  });

  describe('truncateContext', () => {
    it('should return context unchanged when within token limit', async () => {
      const context = {
        userId,
        sessionId: 'session123',
        messages: [
          {
            role: 'user',
            content: 'Hi',
            timestamp: '2023-01-01T00:00:00.000Z'
          }
        ],
        createdAt: '2023-01-01T00:00:00.000Z',
        lastUpdated: '2023-01-01T00:00:00.000Z',
        tokenCount: 5
      };

      mockOperations.get.mockResolvedValue({ Item: context });

      const result = await repository.truncateContext(userId, 100);

      expect(result?.tokenCount).toBe(5);
      expect(mockOperations.put).not.toHaveBeenCalled();
    });

    it('should truncate messages when over token limit', async () => {
      const context = {
        userId,
        sessionId: 'session123',
        messages: [
          {
            role: 'user',
            content: 'This is a very long message that takes many tokens',
            timestamp: '2023-01-01T00:00:00.000Z'
          },
          {
            role: 'assistant',
            content: 'Short reply',
            timestamp: '2023-01-01T00:01:00.000Z'
          },
          {
            role: 'user',
            content: 'Hi',
            timestamp: '2023-01-01T00:02:00.000Z'
          }
        ],
        createdAt: '2023-01-01T00:00:00.000Z',
        lastUpdated: '2023-01-01T00:02:00.000Z',
        tokenCount: 100
      };

      mockOperations.get.mockResolvedValue({ Item: context });
      mockOperations.put.mockResolvedValue({});

      const result = await repository.truncateContext(userId, 10);

      expect(result?.messages.length).toBeLessThan(3);
      expect(result?.tokenCount).toBeLessThanOrEqual(10);
      expect(mockOperations.put).toHaveBeenCalled();
    });

    it('should return null when no context exists', async () => {
      mockOperations.get.mockResolvedValue({ Item: null });

      const result = await repository.truncateContext(userId, 100);

      expect(result).toBeNull();
    });
  });

  describe('getExpiredContexts', () => {
    it('should return expired user IDs', async () => {
      const mockItems = [
        { userId: 'user1' },
        { userId: 'user2' }
      ];

      mockOperations.scan.mockResolvedValue({ Items: mockItems });

      const result = await repository.getExpiredContexts();

      expect(result).toEqual(['user1', 'user2']);
      expect(mockOperations.scan).toHaveBeenCalledWith({
        TableName: tableName,
        FilterExpression: 'lastUpdated < :cutoff',
        ExpressionAttributeValues: {
          ':cutoff': expect.any(String)
        },
        ProjectionExpression: 'userId'
      });
    });

    it('should return empty array when no expired contexts', async () => {
      mockOperations.scan.mockResolvedValue({ Items: [] });

      const result = await repository.getExpiredContexts();

      expect(result).toEqual([]);
    });
  });

  describe('cleanupExpiredContexts', () => {
    it('should cleanup expired contexts and return count', async () => {
      const expiredUserIds = ['user1', 'user2'];
      
      // Mock getExpiredContexts
      mockOperations.scan.mockResolvedValue({ 
        Items: expiredUserIds.map(id => ({ userId: id }))
      });
      
      // Mock delete operations
      mockOperations.delete.mockResolvedValue({});

      const result = await repository.cleanupExpiredContexts();

      expect(result).toBe(2);
      expect(mockOperations.delete).toHaveBeenCalledTimes(2);
    });

    it('should return 0 when no expired contexts', async () => {
      mockOperations.scan.mockResolvedValue({ Items: [] });

      const result = await repository.cleanupExpiredContexts();

      expect(result).toBe(0);
      expect(mockOperations.delete).not.toHaveBeenCalled();
    });
  });

  describe('token estimation', () => {
    it('should estimate tokens correctly', async () => {
      const message: ChatMessage = {
        role: 'user',
        content: 'This is a test message with multiple words',
        timestamp: new Date()
      };

      mockOperations.get.mockResolvedValue({ Item: null });
      mockOperations.put.mockResolvedValue({});

      const result = await repository.addMessage(userId, message);

      // Should estimate roughly 1 token per 4 characters
      const expectedTokens = Math.ceil(message.content.length / 4);
      expect(result.tokenCount).toBe(expectedTokens);
    });
  });
});