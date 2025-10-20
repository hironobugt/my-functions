import { DocumentClient } from 'aws-sdk/clients/dynamodb';
import { ConversationContext, ChatMessage } from '../models/ConversationContext';
import { DynamoDBOperations } from '../utils/DynamoDBClient';

export interface ConversationContextRepositoryConfig {
  tableName: string;
  ttlHours?: number;
}

export class ConversationContextRepository {
  private operations: DynamoDBOperations;
  private tableName: string;
  private ttlHours: number;

  constructor(
    documentClient: DocumentClient,
    config: ConversationContextRepositoryConfig
  ) {
    this.operations = new DynamoDBOperations(documentClient);
    this.tableName = config.tableName;
    this.ttlHours = config.ttlHours || 24; // Default 24 hours TTL
  }

  /**
   * Retrieve conversation context for a user
   */
  public async getConversationContext(userId: string): Promise<ConversationContext | null> {
    try {
      const result = await this.operations.get({
        TableName: this.tableName,
        Key: { userId }
      });

      if (!result.Item) {
        return null;
      }

      return this.deserializeContext(result.Item);
    } catch (error: any) {
      throw new Error(`Failed to get conversation context for user ${userId}: ${error.message || error}`);
    }
  }

  /**
   * Store or update conversation context for a user
   */
  public async saveConversationContext(context: ConversationContext): Promise<void> {
    try {
      const item = this.serializeContext(context);
      
      await this.operations.put({
        TableName: this.tableName,
        Item: item
      });
    } catch (error: any) {
      throw new Error(`Failed to save conversation context for user ${context.userId}: ${error.message || error}`);
    }
  }

  /**
   * Add a new message to existing conversation context
   */
  public async addMessage(userId: string, message: ChatMessage): Promise<ConversationContext> {
    try {
      const existingContext = await this.getConversationContext(userId);
      
      if (!existingContext) {
        // Create new context if none exists
        const newContext: ConversationContext = {
          userId,
          sessionId: this.generateSessionId(),
          messages: [message],
          createdAt: new Date(),
          lastUpdated: new Date(),
          tokenCount: this.estimateTokenCount(message.content)
        };
        
        await this.saveConversationContext(newContext);
        return newContext;
      }

      // Update existing context
      existingContext.messages.push(message);
      existingContext.lastUpdated = new Date();
      existingContext.tokenCount += this.estimateTokenCount(message.content);

      await this.saveConversationContext(existingContext);
      return existingContext;
    } catch (error: any) {
      throw new Error(`Failed to add message for user ${userId}: ${error.message || error}`);
    }
  }

  /**
   * Update conversation context with new session ID (for new conversations)
   */
  public async startNewSession(userId: string): Promise<ConversationContext> {
    try {
      const newContext: ConversationContext = {
        userId,
        sessionId: this.generateSessionId(),
        messages: [],
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 0
      };

      await this.saveConversationContext(newContext);
      return newContext;
    } catch (error: any) {
      throw new Error(`Failed to start new session for user ${userId}: ${error.message || error}`);
    }
  }

  /**
   * Clear conversation context for a user
   */
  public async clearConversationContext(userId: string): Promise<void> {
    try {
      await this.operations.delete({
        TableName: this.tableName,
        Key: { userId }
      });
    } catch (error: any) {
      throw new Error(`Failed to clear conversation context for user ${userId}: ${error.message || error}`);
    }
  }

  /**
   * Truncate conversation context to stay within token limits
   */
  public async truncateContext(userId: string, maxTokens: number): Promise<ConversationContext | null> {
    try {
      const context = await this.getConversationContext(userId);
      
      if (!context || context.tokenCount <= maxTokens) {
        return context;
      }

      // Keep the most recent messages that fit within the token limit
      const truncatedMessages: ChatMessage[] = [];
      let currentTokenCount = 0;

      // Start from the end (most recent) and work backwards
      for (let i = context.messages.length - 1; i >= 0; i--) {
        const message = context.messages[i];
        const messageTokens = this.estimateTokenCount(message.content);
        
        if (currentTokenCount + messageTokens <= maxTokens) {
          truncatedMessages.unshift(message);
          currentTokenCount += messageTokens;
        } else {
          break;
        }
      }

      const truncatedContext: ConversationContext = {
        ...context,
        messages: truncatedMessages,
        tokenCount: currentTokenCount,
        lastUpdated: new Date()
      };

      await this.saveConversationContext(truncatedContext);
      return truncatedContext;
    } catch (error: any) {
      throw new Error(`Failed to truncate context for user ${userId}: ${error.message || error}`);
    }
  }

  /**
   * Get conversation contexts that are older than TTL for cleanup
   */
  public async getExpiredContexts(): Promise<string[]> {
    try {
      const cutoffTime = new Date();
      cutoffTime.setHours(cutoffTime.getHours() - this.ttlHours);

      const result = await this.operations.scan({
        TableName: this.tableName,
        FilterExpression: 'lastUpdated < :cutoff',
        ExpressionAttributeValues: {
          ':cutoff': cutoffTime.toISOString()
        },
        ProjectionExpression: 'userId'
      });

      return result.Items?.map(item => item.userId) || [];
    } catch (error: any) {
      throw new Error(`Failed to get expired contexts: ${error.message || error}`);
    }
  }

  /**
   * Cleanup expired conversation contexts
   */
  public async cleanupExpiredContexts(): Promise<number> {
    try {
      const expiredUserIds = await this.getExpiredContexts();
      
      if (expiredUserIds.length === 0) {
        return 0;
      }

      // Delete expired contexts in batches
      const deletePromises = expiredUserIds.map(userId => 
        this.clearConversationContext(userId)
      );

      await Promise.all(deletePromises);
      return expiredUserIds.length;
    } catch (error: any) {
      throw new Error(`Failed to cleanup expired contexts: ${error.message || error}`);
    }
  }

  /**
   * Serialize conversation context for DynamoDB storage
   */
  private serializeContext(context: ConversationContext): any {
    return {
      userId: context.userId,
      sessionId: context.sessionId,
      messages: context.messages.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp.toISOString()
      })),
      createdAt: context.createdAt.toISOString(),
      lastUpdated: context.lastUpdated.toISOString(),
      tokenCount: context.tokenCount,
      ttl: Math.floor((context.lastUpdated.getTime() + (this.ttlHours * 60 * 60 * 1000)) / 1000)
    };
  }

  /**
   * Deserialize conversation context from DynamoDB item
   */
  private deserializeContext(item: any): ConversationContext {
    return {
      userId: item.userId,
      sessionId: item.sessionId,
      messages: item.messages.map((msg: any) => ({
        role: msg.role,
        content: msg.content,
        timestamp: new Date(msg.timestamp)
      })),
      createdAt: new Date(item.createdAt),
      lastUpdated: new Date(item.lastUpdated),
      tokenCount: item.tokenCount
    };
  }

  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Estimate token count for a text string (rough approximation)
   */
  private estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }
}