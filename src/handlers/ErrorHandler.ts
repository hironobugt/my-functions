import { RequestEnvelope, ResponseEnvelope } from 'ask-sdk-model';
import { getRequestType, getIntentName, HandlerInput } from 'ask-sdk-core';
import { AnalyticsService } from '../interfaces/AnalyticsService';

/**
 * Global error handler for unhandled exceptions and system errors
 * Requirements: 1.3, 2.3, 5.1, 5.2, 5.3, 5.4
 */
export class ErrorHandler {
  constructor(private analyticsService: AnalyticsService) {}

  /**
   * Check if this error handler can handle the error
   */
  canHandle(handlerInput: any, error: Error): boolean {
    // Handle all errors as a catch-all
    return true;
  }

  /**
   * Handle errors with appropriate user-friendly responses
   * Requirements: 1.3, 2.3, 5.1, 5.2, 5.3, 5.4
   */
  async handle(handlerInput: any, error: Error): Promise<ResponseEnvelope> {
    const requestEnvelope = handlerInput.requestEnvelope as RequestEnvelope;
    const userId = requestEnvelope.session?.user?.userId || 'unknown';

    // Log the error for debugging (don't let analytics failures break error handling)
    try {
      await this.analyticsService.logError(error, {
        userId,
        errorType: 'GlobalErrorHandler',
        timestamp: new Date(),
        additionalData: {
          requestType: requestEnvelope.request.type,
          intentName: getRequestType(requestEnvelope) === 'IntentRequest' 
            ? getIntentName(requestEnvelope) 
            : undefined,
          errorMessage: error.message,
          errorStack: error.stack
        }
      });
    } catch (analyticsError) {
      // Analytics logging failed, but we should still handle the original error
      console.error('Analytics logging failed in ErrorHandler:', analyticsError);
    }

    // Determine appropriate error response based on error type
    let errorMessage: string;
    let repromptMessage: string;
    let cardTitle: string;
    let shouldEndSession = false;

    if (error.message.includes('timeout') || error.message.includes('API')) {
      // API or timeout errors - Requirement 5.1, 5.4
      errorMessage = "I'm having trouble connecting to the AI service right now. Please try again in a moment.";
      repromptMessage = "What would you like to ask me?";
      cardTitle = "Connection Issue";
    } else if (error.message.includes('rate limit')) {
      // Rate limit errors - Requirement 5.2
      errorMessage = "The AI service is busy right now. Please wait a moment and try again.";
      repromptMessage = "What would you like to ask me?";
      cardTitle = "Service Busy";
    } else if (error.message.includes('authentication') || error.message.includes('unauthorized')) {
      // Authentication errors - Requirement 5.4
      errorMessage = "I'm experiencing a temporary technical issue. Please try again later.";
      repromptMessage = "What would you like to ask me?";
      cardTitle = "Technical Issue";
    } else if (error.message.includes('speech') || error.message.includes('recognition')) {
      // Speech recognition errors - Requirement 2.3
      errorMessage = "I didn't catch what you said. Could you please repeat your question?";
      repromptMessage = "What would you like to ask me?";
      cardTitle = "Speech Recognition Issue";
    } else if (error.message.includes('skill activation') || error.message.includes('launch')) {
      // Skill activation errors - Requirement 1.3
      errorMessage = "I'm having trouble starting up, but I'm ready to help now. What would you like to ask me?";
      repromptMessage = "What would you like to ask me?";
      cardTitle = "Startup Issue";
    } else {
      // Generic errors - Requirement 5.3
      errorMessage = "I'm sorry, I encountered an unexpected issue. Could you please try again?";
      repromptMessage = "What would you like to ask me?";
      cardTitle = "Unexpected Error";
    }

    return {
      version: '1.0',
      response: {
        outputSpeech: {
          type: 'PlainText',
          text: errorMessage
        },
        reprompt: {
          outputSpeech: {
            type: 'PlainText',
            text: repromptMessage
          }
        },
        card: {
          type: 'Simple',
          title: `AI Chat - ${cardTitle}`,
          content: "Please try your request again. If the problem persists, try again later."
        },
        shouldEndSession
      }
    };
  }
}