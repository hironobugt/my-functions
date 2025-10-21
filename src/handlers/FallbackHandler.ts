import { RequestEnvelope, ResponseEnvelope, IntentRequest } from 'ask-sdk-model';
import { getRequestType, getIntentName } from 'ask-sdk-core';
import { AnalyticsService } from '../interfaces/AnalyticsService';

/**
 * Handler for unrecognized intents and fallback scenarios
 * Provides helpful responses when user input doesn't match expected intents
 */
export class FallbackHandler {
  constructor(private analyticsService: AnalyticsService) {}

  /**
   * Handle fallback scenarios with helpful guidance
   * Requirements: 2.3 (speech recognition failures), general fallback handling
   */
  async handleFallback(requestEnvelope: RequestEnvelope): Promise<ResponseEnvelope> {
    try {
      const userId = requestEnvelope.session?.user?.userId;

      if (userId) {
        // Log fallback event for analytics (don't let analytics failures break fallback handling)
        try {
          await this.analyticsService.logFallbackEvent(userId, {
            intentName: getRequestType(requestEnvelope) === 'IntentRequest' 
              ? getIntentName(requestEnvelope) 
              : 'unknown',
            timestamp: new Date()
          });
        } catch (analyticsError) {
          console.error('Analytics logging failed in FallbackHandler:', analyticsError);
        }
      }

      // Provide helpful fallback responses
      const fallbackMessages = [
        "I'm not sure I understood that. You can ask me questions, have conversations, or say 'tell me about premium' to learn about subscription options. What would you like to do?",
        "I didn't catch that. Try asking me a question, starting a conversation, or saying 'help' for more options. What can I help you with?",
        "I'm not sure what you meant. You can ask me anything you'd like to know, or say 'stop' to exit. What would you like to ask?",
        "I didn't understand that request. Try asking me a question or saying 'help' for guidance. What can I help you with today?"
      ];

      const randomMessage = fallbackMessages[Math.floor(Math.random() * fallbackMessages.length)];

      return {
        version: '1.0',
        response: {
          outputSpeech: {
            type: 'PlainText',
            text: randomMessage
          },
          reprompt: {
            outputSpeech: {
              type: 'PlainText',
              text: "What would you like to ask me?"
            }
          },
          card: {
            type: 'Simple',
            title: "AI Chat - Help",
            content: "You can:\n• Ask me any question\n• Have a conversation\n• Say 'tell me about premium' for subscription info\n• Say 'stop' to exit"
          },
          shouldEndSession: false
        }
      };

    } catch (error) {
      // Log error and provide basic fallback
      if (requestEnvelope.session?.user?.userId) {
        try {
          await this.analyticsService.logError(error as Error, {
            userId: requestEnvelope.session.user.userId,
            errorType: 'FallbackHandler',
            timestamp: new Date(),
            additionalData: { handler: 'FallbackHandler' }
          });
        } catch (analyticsError) {
          console.error('Analytics logging failed in FallbackHandler error handler:', analyticsError);
        }
      }

      return {
        version: '1.0',
        response: {
          outputSpeech: {
            type: 'PlainText',
            text: "I'm not sure what you meant. What would you like to ask me?"
          },
          reprompt: {
            outputSpeech: {
              type: 'PlainText',
              text: "What would you like to ask me?"
            }
          },
          shouldEndSession: false
        }
      };
    }
  }

  /**
   * Check if this handler can handle the given request
   */
  canHandle(requestEnvelope: RequestEnvelope): boolean {
    return getRequestType(requestEnvelope) === 'IntentRequest' &&
           (getIntentName(requestEnvelope) === 'AMAZON.FallbackIntent' ||
            getIntentName(requestEnvelope) === 'AMAZON.HelpIntent');
  }
}