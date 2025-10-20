/**
 * Represents a conversation context for maintaining chat history
 */
export interface ConversationContext {
    userId: string;
    sessionId: string;
    messages: ChatMessage[];
    createdAt: Date;
    lastUpdated: Date;
    tokenCount: number;
}
/**
 * Individual chat message in a conversation
 */
export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}
//# sourceMappingURL=ConversationContext.d.ts.map