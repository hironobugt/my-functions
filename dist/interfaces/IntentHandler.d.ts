import { RequestEnvelope, ResponseEnvelope } from 'ask-sdk-model';
/**
 * Core interface for handling Alexa intent requests
 */
export interface IntentHandler {
    /**
     * Handle skill launch request
     */
    handleLaunchRequest(requestEnvelope: RequestEnvelope): Promise<ResponseEnvelope>;
    /**
     * Handle main chat intent for LLM conversation
     */
    handleChatIntent(requestEnvelope: RequestEnvelope): Promise<ResponseEnvelope>;
    /**
     * Handle subscription-related intents
     */
    handleSubscriptionIntent(requestEnvelope: RequestEnvelope): Promise<ResponseEnvelope>;
    /**
     * Handle stop/cancel intents
     */
    handleStopIntent(requestEnvelope: RequestEnvelope): Promise<ResponseEnvelope>;
    /**
     * Handle unrecognized or error scenarios
     */
    handleFallback(requestEnvelope: RequestEnvelope): Promise<ResponseEnvelope>;
}
//# sourceMappingURL=IntentHandler.d.ts.map