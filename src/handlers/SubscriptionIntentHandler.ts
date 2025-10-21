import { RequestEnvelope, ResponseEnvelope, IntentRequest } from 'ask-sdk-model';
import { getRequestType, getIntentName, getSlotValue } from 'ask-sdk-core';
import { SubscriptionManager } from '../interfaces/SubscriptionManager';
import { AnalyticsService, ErrorContext } from '../interfaces/AnalyticsService';
import { PurchaseResult, SubscriptionStatus } from '../models/SubscriptionStatus';

/**
 * Handler for subscription-related intents
 * Implements subscription information, purchase guidance, and status checking
 */
export class SubscriptionIntentHandler {
  constructor(
    private subscriptionManager: SubscriptionManager,
    private analyticsService: AnalyticsService
  ) {}

  /**
   * Handle subscription-related intent requests
   * Requirements: 8.2, 8.3, 9.4
   */
  async handleSubscriptionIntent(requestEnvelope: RequestEnvelope): Promise<ResponseEnvelope> {
    const startTime = Date.now();
    
    try {
      const request = requestEnvelope.request as IntentRequest;
      const userId = requestEnvelope.session?.user?.userId;
      const intentName = getIntentName(requestEnvelope);

      if (!userId) {
        throw new Error('User ID not found in request');
      }

      // Get current subscription status
      const subscriptionStatus = await this.subscriptionManager.getUserSubscriptionStatus(userId);

      // Route to appropriate handler based on intent
      switch (intentName) {
        case 'SubscriptionInfoIntent':
        case 'PremiumInfoIntent':
          return await this.handleSubscriptionInfo(userId, subscriptionStatus);
        
        case 'PurchaseIntent':
        case 'BuyPremiumIntent':
          return await this.handlePurchaseRequest(userId, subscriptionStatus);
        
        case 'SubscriptionStatusIntent':
        case 'MySubscriptionIntent':
          return await this.handleSubscriptionStatus(userId, subscriptionStatus);
        
        default:
          return await this.handleSubscriptionInfo(userId, subscriptionStatus);
      }

    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Log error with context
      await this.analyticsService.logError(error as Error, {
        userId: requestEnvelope.session?.user?.userId || 'unknown',
        intentName: getIntentName(requestEnvelope) || 'SubscriptionIntent',
        errorType: 'SubscriptionIntentHandler',
        timestamp: new Date(),
        additionalData: { 
          handler: 'SubscriptionIntentHandler',
          responseTime 
        }
      });

      return this.createErrorResponse(
        "I'm sorry, I encountered an issue with subscription information. Please try again later.",
        "You can ask about premium features or your subscription status."
      );
    }
  }

  /**
   * Handle subscription information requests
   * Explains premium features and benefits
   */
  private async handleSubscriptionInfo(userId: string, subscriptionStatus: SubscriptionStatus): Promise<ResponseEnvelope> {
    // Log that user requested subscription information (no specific event type for this in the enum)

    const isCurrentlyPremium = subscriptionStatus.tier === 'premium';
    
    if (isCurrentlyPremium) {
      const speechText = "You're already a premium subscriber! You have unlimited daily conversations, access to advanced AI models, and extended conversation memory. Is there anything specific about your subscription you'd like to know?";
      
      return this.createResponse(
        speechText,
        "You can ask about your subscription status or continue chatting.",
        "Premium Subscription",
        "You have premium access with unlimited conversations and advanced features.",
        false
      );
    }

    const usageLimitResult = await this.subscriptionManager.checkUsageLimits(userId);
    const remainingUsage = usageLimitResult.remainingUsage || 0;
    
    const speechText = `Our premium subscription gives you unlimited daily conversations, access to more advanced AI models, and longer conversation memory. As a free user, you have ${remainingUsage} conversations remaining today. Premium costs just $4.99 per month. Would you like to purchase premium access now?`;
    
    return this.createResponse(
      speechText,
      "Say 'yes' to purchase premium, or 'no' to continue with free access.",
      "Premium Features",
      "Premium: Unlimited conversations, advanced AI models, extended memory - $4.99/month",
      false
    );
  }

  /**
   * Handle purchase requests
   * Initiates the Alexa ISP purchase flow
   */
  private async handlePurchaseRequest(userId: string, subscriptionStatus: SubscriptionStatus): Promise<ResponseEnvelope> {
    if (subscriptionStatus.tier === 'premium') {
      return this.createResponse(
        "You already have premium access! You can enjoy unlimited conversations and advanced features.",
        "What would you like to ask me?",
        "Already Premium",
        "You already have premium access with unlimited conversations.",
        false
      );
    }

    try {
      await this.analyticsService.logSubscriptionEvent(userId, 'purchase_initiated');
      
      // Initiate purchase through Alexa ISP
      const purchaseResult = await this.subscriptionManager.handlePurchaseRequest(userId, 'premium_subscription');
      
      if (purchaseResult.success) {
        await this.analyticsService.logSubscriptionEvent(userId, 'purchase_completed');
        
        return this.createResponse(
          "Great! Your premium subscription is now active. You now have unlimited daily conversations and access to advanced AI features. What would you like to ask me?",
          "What would you like to ask me?",
          "Premium Activated",
          "Welcome to premium! You now have unlimited conversations and advanced features.",
          false
        );
      } else {
        await this.analyticsService.logSubscriptionEvent(userId, 'purchase_failed');
        
        const errorMessage = purchaseResult.error || "There was an issue processing your purchase.";
        return this.createResponse(
          `${errorMessage} You can try again later or continue with free access. You still have conversations available today.`,
          "What would you like to ask me?",
          "Purchase Issue",
          "Purchase could not be completed. Please try again later.",
          false
        );
      }
      
    } catch (error) {
      await this.analyticsService.logSubscriptionEvent(userId, 'purchase_failed');
      
      return this.createErrorResponse(
        "I'm sorry, there was an issue starting the purchase process. Please try again later.",
        "You can continue with free access or try purchasing premium later."
      );
    }
  }

  /**
   * Handle subscription status requests
   * Reports current subscription status and usage
   */
  private async handleSubscriptionStatus(userId: string, subscriptionStatus: SubscriptionStatus): Promise<ResponseEnvelope> {
    const usageLimitResult = await this.subscriptionManager.checkUsageLimits(userId);
    
    if (subscriptionStatus.tier === 'premium') {
      const expirationText = subscriptionStatus.expiresAt 
        ? ` Your subscription renews on ${subscriptionStatus.expiresAt.toLocaleDateString()}.`
        : '';
      
      const speechText = `You have premium access with unlimited daily conversations and advanced AI features.${expirationText} What would you like to ask me?`;
      
      return this.createResponse(
        speechText,
        "What would you like to ask me?",
        "Premium Status",
        `Premium subscriber with unlimited access.${expirationText}`,
        false
      );
    } else {
      const remainingUsage = usageLimitResult.remainingUsage || 0;
      const resetTime = usageLimitResult.limitResetTime;
      const resetText = resetTime ? ` Your usage resets at midnight.` : '';
      
      const speechText = `You're using the free tier with ${remainingUsage} conversations remaining today.${resetText} Would you like to hear about premium features for unlimited access?`;
      
      return this.createResponse(
        speechText,
        "Say 'tell me about premium' to learn more, or ask me a question.",
        "Free Tier Status",
        `Free tier: ${remainingUsage} conversations remaining today.${resetText}`,
        false
      );
    }
  }

  /**
   * Check if this handler can handle the given request
   */
  canHandle(requestEnvelope: RequestEnvelope): boolean {
    const intentName = getIntentName(requestEnvelope);
    return getRequestType(requestEnvelope) === 'IntentRequest' &&
           (intentName === 'SubscriptionInfoIntent' ||
            intentName === 'PremiumInfoIntent' ||
            intentName === 'PurchaseIntent' ||
            intentName === 'BuyPremiumIntent' ||
            intentName === 'SubscriptionStatusIntent' ||
            intentName === 'MySubscriptionIntent');
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
      "Subscription Error",
      "Please try again later.",
      false
    );
  }
}