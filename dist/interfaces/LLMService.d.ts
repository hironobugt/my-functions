import { ConversationContext } from '../models/ConversationContext';
import { UserTier } from '../models/SubscriptionStatus';
/**
 * Interface for LLM service integration
 */
export interface LLMService {
    /**
     * Generate response from LLM based on user input and context
     */
    generateResponse(prompt: string, context: ConversationContext | null, userTier: UserTier): Promise<string>;
    /**
     * Validate API configuration and connectivity
     */
    validateApiConfiguration(): Promise<boolean>;
    /**
     * Handle API errors and return user-friendly messages
     */
    handleApiError(error: any): string;
    /**
     * Check if API is currently available
     */
    isApiAvailable(): Promise<boolean>;
    /**
     * Get appropriate model configuration for user tier
     */
    getModelConfig(userTier: UserTier): ModelConfig;
}
export interface ModelConfig {
    model: string;
    maxTokens: number;
    temperature: number;
    topP?: number;
}
//# sourceMappingURL=LLMService.d.ts.map