import { SessionManager as ISessionManager } from '../interfaces/SessionManager';
import { ConversationContext, ChatMessage } from '../models/ConversationContext';
import { ConversationContextRepository } from '../repositories/ConversationContextRepository';
import { AppConfig } from '../models/AppConfig';

export interface SessionManagerConfig {
  maxContextTokens: number;
  sessionTimeoutMinutes?: number;
  maxMessagesPerSession?: number;
}

/**
 * Implementation of SessionManager for managing conversation sessions and context
 */
export class SessionManager implements ISessionManager {
  private contextRepository: ConversationContextRepository;
  private config: SessionManagerConfig;

  constructor(
    contextRepository: ConversationContextRepository,
    config: SessionManagerConfig
  ) {
    this.contextRepository = contextRepository;
    this.config = {
      sessionTimeoutMinutes: 30, // Default 30 minutes timeout
      maxMessagesPerSession: 50, // Default max 50 messages per session
      ...config
    };
  }

  /**
   * Retrieve conversation context for a user
   */
  public async getConversationContext(userId: string): Promise<ConversationContext | null> {
    try {
      const context = await this.contextRepository.getConversationContext(userId);
      
      if (!context) {
        return null;
      }

      // Check if session should be ended due to inactivity
      if (this.shouldEndSession(context)) {
        await this.clearConversationContext(userId);
        return null;
      }

      return context;
    } catch (error: any) {
      throw new Error(`Failed to get conversation context for user ${userId}: ${error.message || error}`);
    }
  }

  /**
   * Update conversation context with new messages
   */
  public async updateConversationContext(userId: string, context: ConversationContext): Promise<void> {
    try {
      // Update the last updated timestamp
      context.lastUpdated = new Date();
      
      // Recalculate token count
      context.tokenCount = this.calculateTotalTokenCount(context.messages);
      
      // Truncate if needed before saving
      const truncatedContext = this.truncateContextIfNeeded(context);
      
      await this.contextRepository.saveConversationContext(truncatedContext);
    } catch (error: any) {
      throw new Error(`Failed to update conversation context for user ${userId}: ${error.message || error}`);
    }
  }

  /**
   * Add a new message to the conversation context
   */
  public async addMessage(userId: string, message: ChatMessage): Promise<ConversationContext> {
    try {
      let context = await this.getConversationContext(userId);
      
      if (!context) {
        // Create new context if none exists or session expired
        context = await this.contextRepository.startNewSession(userId);
      }

      // Add the new message
      context.messages.push(message);
      context.lastUpdated = new Date();
      context.tokenCount = this.calculateTotalTokenCount(context.messages);

      // Check if we need to truncate due to message count or token limits
      const truncatedContext = this.truncateContextIfNeeded(context);
      
      await this.contextRepository.saveConversationContext(truncatedContext);
      return truncatedContext;
    } catch (error: any) {
      throw new Error(`Failed to add message for user ${userId}: ${error.message || error}`);
    }
  }

  /**
   * Start a new conversation session for a user
   */
  public async startNewSession(userId: string): Promise<ConversationContext> {
    try {
      // Clear any existing context
      await this.clearConversationContext(userId);
      
      // Create new session
      return await this.contextRepository.startNewSession(userId);
    } catch (error: any) {
      throw new Error(`Failed to start new session for user ${userId}: ${error.message || error}`);
    }
  }

  /**
   * Clear conversation context for a user
   */
  public async clearConversationContext(userId: string): Promise<void> {
    try {
      await this.contextRepository.clearConversationContext(userId);
    } catch (error: any) {
      throw new Error(`Failed to clear conversation context for user ${userId}: ${error.message || error}`);
    }
  }

  /**
   * Truncate context if it exceeds token limits or message count limits
   */
  public truncateContextIfNeeded(context: ConversationContext): ConversationContext {
    let truncatedContext = { ...context };
    
    // First, check message count limit
    if (this.config.maxMessagesPerSession && 
        truncatedContext.messages.length > this.config.maxMessagesPerSession) {
      
      // Keep the most recent messages within the limit
      const startIndex = truncatedContext.messages.length - this.config.maxMessagesPerSession;
      truncatedContext.messages = truncatedContext.messages.slice(startIndex);
    }

    // Then, check token count limit
    if (truncatedContext.tokenCount > this.config.maxContextTokens) {
      truncatedContext = this.truncateByTokenCount(truncatedContext);
    }

    return truncatedContext;
  }

  /**
   * Check if session should be ended due to inactivity
   */
  public shouldEndSession(context: ConversationContext): boolean {
    if (!this.config.sessionTimeoutMinutes) {
      return false;
    }

    const now = new Date();
    const lastUpdated = new Date(context.lastUpdated);
    const timeDiffMinutes = (now.getTime() - lastUpdated.getTime()) / (1000 * 60);
    
    return timeDiffMinutes > this.config.sessionTimeoutMinutes;
  }

  /**
   * Get conversation summary for analytics or debugging
   */
  public getConversationSummary(context: ConversationContext): {
    messageCount: number;
    tokenCount: number;
    duration: number;
    userMessages: number;
    assistantMessages: number;
  } {
    const userMessages = context.messages.filter(msg => msg.role === 'user').length;
    const assistantMessages = context.messages.filter(msg => msg.role === 'assistant').length;
    const duration = new Date(context.lastUpdated).getTime() - new Date(context.createdAt).getTime();

    return {
      messageCount: context.messages.length,
      tokenCount: context.tokenCount,
      duration: Math.floor(duration / 1000), // Duration in seconds
      userMessages,
      assistantMessages
    };
  }

  /**
   * Cleanup expired sessions for all users
   */
  public async cleanupExpiredSessions(): Promise<number> {
    try {
      return await this.contextRepository.cleanupExpiredContexts();
    } catch (error: any) {
      throw new Error(`Failed to cleanup expired sessions: ${error.message || error}`);
    }
  }

  /**
   * Truncate context by token count, keeping the most recent messages
   */
  private truncateByTokenCount(context: ConversationContext): ConversationContext {
    const truncatedMessages: ChatMessage[] = [];
    let currentTokenCount = 0;
    const maxTokens = this.config.maxContextTokens;

    // Start from the end (most recent) and work backwards
    for (let i = context.messages.length - 1; i >= 0; i--) {
      const message = context.messages[i];
      const messageTokens = this.estimateTokenCount(message.content);
      
      if (currentTokenCount + messageTokens <= maxTokens) {
        truncatedMessages.unshift(message);
        currentTokenCount += messageTokens;
      } else {
        // If we can't fit this message, we're done
        break;
      }
    }

    return {
      ...context,
      messages: truncatedMessages,
      tokenCount: currentTokenCount
    };
  }

  /**
   * Calculate total token count for all messages in the conversation
   */
  private calculateTotalTokenCount(messages: ChatMessage[]): number {
    return messages.reduce((total, message) => {
      return total + this.estimateTokenCount(message.content);
    }, 0);
  }

  /**
   * Estimate token count for a text string (rough approximation)
   * This is a simple heuristic - in production, you might want to use a proper tokenizer
   */
  private estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    // Add some overhead for role and formatting tokens
    const baseTokens = Math.ceil(text.length / 4);
    const overhead = 10; // Overhead for role, formatting, etc.
    return baseTokens + overhead;
  }

  /**
   * Handle conversation flow for multi-turn interactions
   */
  public async handleConversationTurn(
    userId: string,
    userMessage: string,
    assistantResponse: string
  ): Promise<ConversationContext> {
    try {
      // Add user message
      const userMsg: ChatMessage = {
        role: 'user',
        content: userMessage,
        timestamp: new Date()
      };
      
      let context = await this.addMessage(userId, userMsg);
      
      // Add assistant response
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: assistantResponse,
        timestamp: new Date()
      };
      
      context = await this.addMessage(userId, assistantMsg);
      
      return context;
    } catch (error: any) {
      throw new Error(`Failed to handle conversation turn for user ${userId}: ${error.message || error}`);
    }
  }

  /**
   * Get conversation history formatted for LLM context
   */
  public async getFormattedConversationHistory(userId: string): Promise<string> {
    try {
      const context = await this.getConversationContext(userId);
      
      if (!context || context.messages.length === 0) {
        return '';
      }

      return context.messages
        .map(msg => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
        .join('\n');
    } catch (error: any) {
      throw new Error(`Failed to get formatted conversation history for user ${userId}: ${error.message || error}`);
    }
  }

  /**
   * Check if conversation should continue based on context and user input
   */
  public shouldContinueConversation(context: ConversationContext, lastUserInput?: string): boolean {
    // Check session timeout
    if (this.shouldEndSession(context)) {
      return false;
    }

    // Check for explicit end commands
    if (lastUserInput) {
      const endCommands = ['stop', 'exit', 'quit', 'goodbye', 'bye', 'end'];
      const normalizedInput = lastUserInput.toLowerCase().trim();
      
      if (endCommands.some(cmd => normalizedInput.includes(cmd))) {
        return false;
      }
    }

    // Check if we've hit message limits
    if (this.config.maxMessagesPerSession && 
        context.messages.length >= this.config.maxMessagesPerSession) {
      return false;
    }

    return true;
  }

  /**
   * Prepare context for LLM API call with proper formatting
   */
  public async prepareContextForLLM(userId: string): Promise<{
    messages: Array<{ role: string; content: string }>;
    tokenCount: number;
  }> {
    try {
      const context = await this.getConversationContext(userId);
      
      if (!context || context.messages.length === 0) {
        return { messages: [], tokenCount: 0 };
      }

      // Ensure context is within token limits
      const truncatedContext = this.truncateContextIfNeeded(context);
      
      // Format messages for LLM API
      const formattedMessages = truncatedContext.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      return {
        messages: formattedMessages,
        tokenCount: truncatedContext.tokenCount
      };
    } catch (error: any) {
      throw new Error(`Failed to prepare context for LLM for user ${userId}: ${error.message || error}`);
    }
  }

  /**
   * Handle session cleanup with proper logging
   */
  public async endConversationGracefully(userId: string, reason?: string): Promise<void> {
    try {
      const context = await this.getConversationContext(userId);
      
      if (context) {
        // Log conversation summary before cleanup
        const summary = this.getConversationSummary(context);
        console.log(`Ending conversation for user ${userId}:`, {
          reason: reason || 'user_request',
          summary
        });
      }

      await this.clearConversationContext(userId);
    } catch (error: any) {
      throw new Error(`Failed to end conversation gracefully for user ${userId}: ${error.message || error}`);
    }
  }

  /**
   * Batch cleanup of expired sessions with progress tracking
   */
  public async performScheduledCleanup(): Promise<{
    cleanedCount: number;
    errors: string[];
  }> {
    const errors: string[] = [];
    let cleanedCount = 0;

    try {
      cleanedCount = await this.cleanupExpiredSessions();
      console.log(`Scheduled cleanup completed: ${cleanedCount} sessions cleaned`);
    } catch (error: any) {
      const errorMsg = `Scheduled cleanup failed: ${error.message || error}`;
      errors.push(errorMsg);
      console.error(errorMsg);
    }

    return { cleanedCount, errors };
  }

  /**
   * Get active session statistics for monitoring
   */
  public async getSessionStatistics(): Promise<{
    totalActiveSessions: number;
    averageTokensPerSession: number;
    averageMessagesPerSession: number;
  }> {
    // This would require additional repository methods to scan all active sessions
    // For now, return placeholder values
    return {
      totalActiveSessions: 0,
      averageTokensPerSession: 0,
      averageMessagesPerSession: 0
    };
  }

  /**
   * Validate conversation state and fix inconsistencies
   */
  public async validateAndRepairContext(userId: string): Promise<ConversationContext | null> {
    try {
      const context = await this.getConversationContext(userId);
      
      if (!context) {
        return null;
      }

      let needsRepair = false;
      const repairedContext = { ...context };

      // Recalculate token count if it seems incorrect
      const actualTokenCount = this.calculateTotalTokenCount(context.messages);
      if (Math.abs(context.tokenCount - actualTokenCount) > 10) {
        repairedContext.tokenCount = actualTokenCount;
        needsRepair = true;
      }

      // Ensure messages are properly ordered by timestamp
      const sortedMessages = [...context.messages].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      
      if (JSON.stringify(sortedMessages) !== JSON.stringify(context.messages)) {
        repairedContext.messages = sortedMessages;
        needsRepair = true;
      }

      // Update lastUpdated if it's older than the newest message
      const newestMessageTime = Math.max(
        ...context.messages.map(msg => new Date(msg.timestamp).getTime())
      );
      
      if (new Date(context.lastUpdated).getTime() < newestMessageTime) {
        repairedContext.lastUpdated = new Date(newestMessageTime);
        needsRepair = true;
      }

      if (needsRepair) {
        await this.updateConversationContext(userId, repairedContext);
        console.log(`Repaired conversation context for user ${userId}`);
      }

      return repairedContext;
    } catch (error: any) {
      throw new Error(`Failed to validate and repair context for user ${userId}: ${error.message || error}`);
    }
  }

  /**
   * Create SessionManager from AppConfig
   */
  public static fromConfig(
    contextRepository: ConversationContextRepository,
    appConfig: AppConfig
  ): SessionManager {
    const config: SessionManagerConfig = {
      maxContextTokens: appConfig.maxContextTokens,
      sessionTimeoutMinutes: 30, // Default timeout
      maxMessagesPerSession: 50   // Default message limit
    };

    return new SessionManager(contextRepository, config);
  }
}