import { RequestEnvelope, ResponseEnvelope, IntentRequest } from 'ask-sdk-model';
import { getRequestType, getIntentName } from 'ask-sdk-core';
import { SessionManager } from '../interfaces/SessionManager';
import { AnalyticsService } from '../interfaces/AnalyticsService';

/**
 * Handler for stop/cancel intents - implements conversation termination and cleanup
 * Requirements: 4.4
 */
export class StopIntentHandler {
  constructor(
    private sessionManager: SessionManager,
    private analyticsService: AnalyticsService
  ) {}

  /**
   * Handle stop/cancel intent request with conversation cleanup
   * Requirement 4.4: WHEN the user says "stop" or "exit" THEN the system SHALL end the conversation gracefully
   */
  async handleStopIntent(requestEnvelope: RequestEnvelope): Promise<ResponseEnvelope> {
    try {
      const userId = requestEnvelope.session?.user?.userId;

      if (userId) {
        // Clear conversation context for clean termination
        await this.sessionManager.clearConversationContext(userId);
        
        // Log session end event (don't let analytics failures break stop functionality)
        try {
          await this.analyticsService.logSessionEnd(userId, 'user_initiated');
        } catch (analyticsError) {
          console.error('Analytics logging failed in StopIntentHandler:', analyticsError);
        }
      }

      // Provide graceful goodbye message
      const goodbyeMessages = [
        "Goodbye! Thanks for chatting with AI Chat. Come back anytime!",
        "See you later! I enjoyed our conversation.",
        "Goodbye! Feel free to return whenever you have more questions.",
        "Thanks for using AI Chat! Have a great day!"
      ];

      const randomGoodbye = goodbyeMessages[Math.floor(Math.random() * goodbyeMessages.length)];

      return {
        version: '1.0',
        response: {
          outputSpeech: {
            type: 'PlainText',
            text: randomGoodbye
          },
          card: {
            type: 'Simple',
            title: "AI Chat - Goodbye",
            content: "Thanks for using AI Chat! Come back anytime for more conversations."
          },
          shouldEndSession: true
        }
      };

    } catch (error) {
      // Log error but still end session gracefully
      if (requestEnvelope.session?.user?.userId) {
        try {
          await this.analyticsService.logError(error as Error, {
            userId: requestEnvelope.session.user.userId,
            errorType: 'StopIntentHandler',
            timestamp: new Date(),
            additionalData: { handler: 'StopIntentHandler' }
          });
        } catch (analyticsError) {
          console.error('Analytics logging failed in StopIntentHandler error handler:', analyticsError);
        }
      }

      // Even if cleanup fails, provide graceful exit
      return {
        version: '1.0',
        response: {
          outputSpeech: {
            type: 'PlainText',
            text: "Goodbye! Thanks for using AI Chat."
          },
          shouldEndSession: true
        }
      };
    }
  }

  /**
   * Check if this handler can handle the given request
   */
  canHandle(requestEnvelope: RequestEnvelope): boolean {
    return getRequestType(requestEnvelope) === 'IntentRequest' &&
           (getIntentName(requestEnvelope) === 'AMAZON.StopIntent' ||
            getIntentName(requestEnvelope) === 'AMAZON.CancelIntent' ||
            getIntentName(requestEnvelope) === 'ExitIntent');
  }
}