import { RequestEnvelope, ResponseEnvelope, IntentRequest } from 'ask-sdk-model';
import { getRequestType, getIntentName, getSlotValue } from 'ask-sdk-core';
import { SessionManager } from '../interfaces/SessionManager';
import { SubscriptionManager } from '../interfaces/SubscriptionManager';
import { LLMService } from '../interfaces/LLMService';
import { AnalyticsService, ErrorContext } from '../interfaces/AnalyticsService';
import { ConversationContext, ChatMessage } from '../models/ConversationContext';

/**
 * Handler for main chat intent - processes user questions and generates LLM responses
 * Implements speech input processing, LLM coordination, and response formatting
 */
export class ChatIntentHandler {
  constructor(
    private sessionManager: SessionManager,
    private subscriptionManager: SubscriptionManager,
    private llmService: LLMService,
    private analyticsService: AnalyticsService
  ) {}

  /**
   * Handle chat intent request with LLM conversation
   * Requirements: 2.1, 2.2, 2.4, 3.1, 3.2
   */
  async handleChatIntent(requestEnvelope: RequestEnvelope): Promise<ResponseEnvelope> {
    const startTime = Date.now();
    
    try {
      const request = requestEnvelope.request as IntentRequest;
      const userId = requestEnvelope.session?.user?.userId;

      if (!userId) {
        throw new Error('User ID not found in request');
      }

      // Extract user's question from the intent slot
      const userQuestion = getSlotValue(requestEnvelope, 'question') || 
                          getSlotValue(requestEnvelope, 'Query');

      if (!userQuestion || userQuestion.trim().length === 0) {
        return this.createErrorResponse(
          "I didn't catch what you said. Could you please repeat your question?",
          "What would you like to ask me?"
        );
      }

      // Check subscription status and usage limits
      const subscriptionStatus = await this.subscriptionManager.getUserSubscriptionStatus(userId);
      const usageLimitResult = await this.subscriptionManager.checkUsageLimits(userId);

      if (!usageLimitResult.canProceed) {
        const upgradeMessage = subscriptionStatus.tier === 'free' 
          ? "You've reached your daily limit of 5 conversations. Would you like to hear about our premium subscription for unlimited access? Just say 'tell me about premium' to learn more."
          : "You've reached your usage limit. Please try again later.";
        
        await this.analyticsService.logUsageLimitEvent(userId, 'daily', true);
        
        return this.createResponse(
          upgradeMessage,
          "Say 'tell me about premium' to learn about unlimited access.",
          "Usage Limit Reached",
          "Upgrade to premium for unlimited conversations!",
          false
        );
      }

      // Get or create conversation context
      let context = await this.sessionManager.getConversationContext(userId);
      
      if (!context) {
        context = {
          userId,
          sessionId: requestEnvelope.session?.sessionId || 'unknown',
          messages: [],
          createdAt: new Date(),
          lastUpdated: new Date(),
          tokenCount: 0
        };
      }

      // Add user message to context
      const userMessage: ChatMessage = {
        role: 'user',
        content: userQuestion,
        timestamp: new Date()
      };
      context.messages.push(userMessage);

      // Check if context needs truncation
      if (this.llmService.shouldTruncateContext(context, subscriptionStatus.tier)) {
        context = this.sessionManager.truncateContextIfNeeded(context);
      }

      // Generate LLM response
      const llmResponse = await this.llmService.generateResponse(
        userQuestion,
        context,
        subscriptionStatus.tier
      );

      if (!llmResponse || llmResponse.trim().length === 0) {
        throw new Error('Empty response from LLM service');
      }

      // Add assistant message to context
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: llmResponse,
        timestamp: new Date()
      };
      context.messages.push(assistantMessage);
      context.lastUpdated = new Date();

      // Update conversation context
      await this.sessionManager.updateConversationContext(userId, context);

      // Increment usage count
      await this.subscriptionManager.incrementUsageCount(userId);

      // Log conversation metrics
      const responseTime = Date.now() - startTime;
      await this.analyticsService.logConversation(
        userId,
        subscriptionStatus.tier,
        responseTime,
        userQuestion.length,
        llmResponse.length
      );

      // Format response for Alexa
      const formattedResponse = this.formatResponseForAlexa(llmResponse);
      const shouldEndSession = this.sessionManager.shouldEndSession(context);

      return this.createResponse(
        formattedResponse,
        shouldEndSession ? undefined : "What else would you like to know?",
        "AI Chat Response",
        this.truncateForCard(llmResponse),
        shouldEndSession
      );

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Log error with context
      await this.analyticsService.logError(error as Error, {
        userId: requestEnvelope.session?.user?.userId || 'unknown',
        intentName: 'ChatIntent',
        errorType: 'ChatIntentHandler',
        timestamp: new Date(),
        additionalData: { 
          handler: 'ChatIntentHandler',
          responseTime 
        }
      });

      // Handle specific error types
      if (error instanceof Error) {
        if (error.message.includes('timeout') || error.message.includes('API')) {
          return this.createErrorResponse(
            "I'm having trouble connecting to the AI service right now. Please try asking your question again in a moment.",
            "What would you like to ask me?"
          );
        }
        
        if (error.message.includes('rate limit')) {
          return this.createErrorResponse(
            "The AI service is busy right now. Please wait a moment and try again.",
            "What would you like to ask me?"
          );
        }
      }

      // Generic error response
      return this.createErrorResponse(
        "I'm sorry, I encountered an issue processing your request. Could you please try asking your question again?",
        "What would you like to ask me?"
      );
    }
  }

  /**
   * Check if this handler can handle the given request
   */
  canHandle(requestEnvelope: RequestEnvelope): boolean {
    return getRequestType(requestEnvelope) === 'IntentRequest' &&
           (getIntentName(requestEnvelope) === 'ChatIntent' ||
            getIntentName(requestEnvelope) === 'AMAZON.FallbackIntent');
  }

  /**
   * Format LLM response for Alexa speech output
   * Handles length limits and speech-friendly formatting
   */
  private formatResponseForAlexa(response: string): string {
    // Remove markdown formatting that doesn't work well with speech
    let formatted = response
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold markdown
      .replace(/\*(.*?)\*/g, '$1')     // Remove italic markdown
      .replace(/`(.*?)`/g, '$1')       // Remove code markdown
      .replace(/#{1,6}\s/g, '')        // Remove headers
      .replace(/\n+/g, ' ')            // Replace newlines with spaces
      .replace(/\s+/g, ' ')            // Normalize whitespace
      .trim();

    // Truncate if too long for speech (Alexa has ~8000 character limit)
    if (formatted.length > 7000) {
      formatted = formatted.substring(0, 6900) + "... I have more to say, but let me pause here. What else would you like to know?";
    }

    return formatted;
  }

  /**
   * Truncate response for card display
   */
  private truncateForCard(response: string): string {
    if (response.length <= 8000) {
      return response;
    }
    return response.substring(0, 7950) + "... (truncated)";
  }

  /**
   * Create a standard response envelope
   */
  private createResponse(
    speechText: string,
    repromptText?: string,
    cardTitle?: string,
    cardContent?: string,
    shouldEndSession: boolean = false
  ): ResponseEnvelope {
    const response: any = {
      outputSpeech: {
        type: 'PlainText',
        text: speechText
      },
      shouldEndSession
    };

    if (repromptText && !shouldEndSession) {
      response.reprompt = {
        outputSpeech: {
          type: 'PlainText',
          text: repromptText
        }
      };
    }

    if (cardTitle && cardContent) {
      response.card = {
        type: 'Simple',
        title: cardTitle,
        content: cardContent
      };
    }

    return {
      version: '1.0',
      response
    };
  }

  /**
   * Create an error response envelope
   */
  private createErrorResponse(
    errorMessage: string,
    repromptText: string
  ): ResponseEnvelope {
    return this.createResponse(
      errorMessage,
      repromptText,
      "AI Chat",
      "Please try your question again.",
      false
    );
  }
}