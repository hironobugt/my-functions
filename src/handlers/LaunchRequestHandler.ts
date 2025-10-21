import { RequestEnvelope, ResponseEnvelope, LaunchRequest } from 'ask-sdk-model';
import { getRequestType, getLocale, getSlotValue } from 'ask-sdk-core';
import { SessionManager } from '../interfaces/SessionManager';
import { SubscriptionManager } from '../interfaces/SubscriptionManager';
import { AnalyticsService, ErrorContext } from '../interfaces/AnalyticsService';

/**
 * Handler for Alexa skill launch requests
 * Implements welcome message, user recognition, and subscription status announcement
 */
export class LaunchRequestHandler {
  constructor(
    private sessionManager: SessionManager,
    private subscriptionManager: SubscriptionManager,
    private analyticsService: AnalyticsService
  ) {}

  /**
   * Handle skill launch request with personalized welcome message
   * Requirements: 1.1, 1.2
   */
  async handleLaunchRequest(requestEnvelope: RequestEnvelope): Promise<ResponseEnvelope> {
    try {
      const request = requestEnvelope.request as LaunchRequest;
      const userId = requestEnvelope.session?.user?.userId;

      if (!userId) {
        throw new Error('User ID not found in request');
      }

      // Check if user is returning or new
      const existingContext = await this.sessionManager.getConversationContext(userId);
      const isReturningUser = existingContext !== null;

      // Get subscription status
      const subscriptionStatus = await this.subscriptionManager.getUserSubscriptionStatus(userId);
      const isPremiumUser = subscriptionStatus.tier === 'premium';

      // Log launch event
      await this.analyticsService.logSkillLaunch(userId, !isReturningUser);

      // Build personalized welcome message
      let welcomeMessage: string;
      let cardTitle: string;
      let cardContent: string;

      if (isReturningUser) {
        if (isPremiumUser) {
          welcomeMessage = "Welcome back to AI Chat! As a premium subscriber, you have unlimited conversations. What would you like to talk about today?";
          cardTitle = "Welcome Back - Premium User";
          cardContent = "You have unlimited AI conversations. Ask me anything!";
        } else {
          const remainingUsage = Math.max(0, subscriptionStatus.dailyUsageCount);
          const usageLeft = Math.max(0, 5 - remainingUsage);
          
          if (usageLeft > 0) {
            welcomeMessage = `Welcome back to AI Chat! You have ${usageLeft} conversation${usageLeft === 1 ? '' : 's'} remaining today. What would you like to ask?`;
            cardTitle = "Welcome Back";
            cardContent = `${usageLeft} conversation${usageLeft === 1 ? '' : 's'} remaining today. Upgrade to premium for unlimited access!`;
          } else {
            welcomeMessage = "Welcome back to AI Chat! You've reached your daily limit of 5 conversations. Would you like to hear about our premium subscription for unlimited access?";
            cardTitle = "Daily Limit Reached";
            cardContent = "Upgrade to premium for unlimited AI conversations!";
          }
        }
      } else {
        // New user onboarding
        welcomeMessage = "Welcome to AI Chat! I'm your AI assistant powered by advanced language models. You can ask me questions, have conversations, or get help with various topics. Free users get 5 conversations per day. What would you like to talk about?";
        cardTitle = "Welcome to AI Chat";
        cardContent = "Ask me anything! Free users get 5 conversations per day. Upgrade to premium for unlimited access.";
      }

      // Build response
      return {
        version: '1.0',
        response: {
          outputSpeech: {
            type: 'PlainText',
            text: welcomeMessage
          },
          reprompt: {
            outputSpeech: {
              type: 'PlainText',
              text: "What would you like to ask me?"
            }
          },
          card: {
            type: 'Simple',
            title: cardTitle,
            content: cardContent
          },
          shouldEndSession: false
        }
      };

    } catch (error) {
      // Log error and provide fallback response
      await this.analyticsService.logError(error as Error, {
        userId: requestEnvelope.session?.user?.userId || 'unknown',
        errorType: 'LaunchRequestHandler',
        timestamp: new Date(),
        additionalData: { handler: 'LaunchRequestHandler' }
      });

      return {
        version: '1.0',
        response: {
          outputSpeech: {
            type: 'PlainText',
            text: "Welcome to AI Chat! I'm having a small technical issue, but I'm ready to help. What would you like to ask me?"
          },
          reprompt: {
            outputSpeech: {
              type: 'PlainText',
              text: "What would you like to ask me?"
            }
          },
          card: {
            type: 'Simple',
            title: "Welcome to AI Chat",
            content: "Ask me anything!"
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
    return requestEnvelope.request.type === 'LaunchRequest';
  }
}