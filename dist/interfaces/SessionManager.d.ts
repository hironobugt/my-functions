import { ConversationContext } from '../models/ConversationContext';
/**
 * Interface for managing conversation sessions and context
 */
export interface SessionManager {
    /**
     * Retrieve conversation context for a user
     */
    getConversationContext(userId: string): Promise<ConversationContext | null>;
    /**
     * Update conversation context with new messages
     */
    updateConversationContext(userId: string, context: ConversationContext): Promise<void>;
    /**
     * Clear conversation context for a user
     */
    clearConversationContext(userId: string): Promise<void>;
    /**
     * Truncate context if it exceeds token limits
     */
    truncateContextIfNeeded(context: ConversationContext): ConversationContext;
    /**
     * Check if session should be ended due to inactivity
     */
    shouldEndSession(context: ConversationContext): boolean;
}
//# sourceMappingURL=SessionManager.d.ts.map