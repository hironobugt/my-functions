import { ResponseEnvelope, ui, RequestEnvelope } from 'ask-sdk-model';
import { ConversationContext, ChatMessage } from '../models/ConversationContext';

/**
 * Response builder utilities for Alexa skill responses
 * Handles speech output, SSML formatting, cards, and response truncation
 * Requirements: 3.1, 3.2, 3.3
 */
export class ResponseBuilder {
  private static readonly MAX_SPEECH_LENGTH = 8000; // Alexa's limit for speech output
  private static readonly MAX_CARD_CONTENT_LENGTH = 8000; // Alexa's limit for card content
  private static readonly TRUNCATION_SUFFIX = "... I had to cut this short due to length limits.";

  /**
   * Create a basic response with speech output
   */
  static createSpeechResponse(
    speechText: string,
    shouldEndSession: boolean = false,
    repromptText?: string
  ): ResponseEnvelope {
    const truncatedSpeech = this.truncateText(speechText, this.MAX_SPEECH_LENGTH);
    
    const response: ResponseEnvelope = {
      version: '1.0',
      response: {
        outputSpeech: {
          type: 'PlainText',
          text: truncatedSpeech
        },
        shouldEndSession
      }
    };

    if (repromptText && !shouldEndSession) {
      const truncatedReprompt = this.truncateText(repromptText, this.MAX_SPEECH_LENGTH);
      response.response.reprompt = {
        outputSpeech: {
          type: 'PlainText',
          text: truncatedReprompt
        }
      };
    }

    return response;
  }

  /**
   * Create a response with SSML-formatted speech
   */
  static createSSMLResponse(
    ssmlText: string,
    shouldEndSession: boolean = false,
    repromptSSML?: string
  ): ResponseEnvelope {
    const truncatedSSML = this.truncateSSML(ssmlText, this.MAX_SPEECH_LENGTH);
    
    const response: ResponseEnvelope = {
      version: '1.0',
      response: {
        outputSpeech: {
          type: 'SSML',
          ssml: truncatedSSML
        },
        shouldEndSession
      }
    };

    if (repromptSSML && !shouldEndSession) {
      const truncatedRepromptSSML = this.truncateSSML(repromptSSML, this.MAX_SPEECH_LENGTH);
      response.response.reprompt = {
        outputSpeech: {
          type: 'SSML',
          ssml: truncatedRepromptSSML
        }
      };
    }

    return response;
  }

  /**
   * Create a response with both speech and card content
   */
  static createSpeechWithCardResponse(
    speechText: string,
    cardTitle: string,
    cardContent: string,
    shouldEndSession: boolean = false,
    repromptText?: string
  ): ResponseEnvelope {
    const response = this.createSpeechResponse(speechText, shouldEndSession, repromptText);
    
    response.response.card = {
      type: 'Simple',
      title: cardTitle,
      content: this.truncateText(cardContent, this.MAX_CARD_CONTENT_LENGTH)
    };

    return response;
  }

  /**
   * Create a response with SSML speech and card content
   */
  static createSSMLWithCardResponse(
    ssmlText: string,
    cardTitle: string,
    cardContent: string,
    shouldEndSession: boolean = false,
    repromptSSML?: string
  ): ResponseEnvelope {
    const response = this.createSSMLResponse(ssmlText, shouldEndSession, repromptSSML);
    
    response.response.card = {
      type: 'Simple',
      title: cardTitle,
      content: this.truncateText(cardContent, this.MAX_CARD_CONTENT_LENGTH)
    };

    return response;
  }

  /**
   * Create an error response with appropriate messaging
   */
  static createErrorResponse(
    errorMessage: string = "I'm sorry, I encountered an error. Please try again.",
    shouldEndSession: boolean = false
  ): ResponseEnvelope {
    return this.createSpeechResponse(
      errorMessage,
      shouldEndSession,
      shouldEndSession ? undefined : "Please try asking me something else."
    );
  }

  /**
   * Format text for natural speech using SSML
   */
  static formatForSpeech(text: string): string {
    // Clean up text for better speech synthesis
    let formattedText = text
      // Add pauses after sentences
      .replace(/\. /g, '. <break time="0.3s"/> ')
      // Add pauses after question marks
      .replace(/\? /g, '? <break time="0.3s"/> ')
      // Add pauses after exclamation marks
      .replace(/! /g, '! <break time="0.3s"/> ')
      // Add pauses after colons
      .replace(/: /g, ': <break time="0.2s"/> ')
      // Handle lists with pauses
      .replace(/\n- /g, ' <break time="0.2s"/> ')
      .replace(/\n\d+\. /g, ' <break time="0.2s"/> ')
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      .trim();

    // Wrap in SSML speak tags
    return `<speak>${formattedText}</speak>`;
  }

  /**
   * Create a conversation response with natural SSML formatting
   */
  static createConversationResponse(
    llmResponse: string,
    shouldEndSession: boolean = false,
    includeCard: boolean = true
  ): ResponseEnvelope {
    const ssmlText = this.formatForSpeech(llmResponse);
    
    if (includeCard) {
      return this.createSSMLWithCardResponse(
        ssmlText,
        "AI Chat Response",
        llmResponse,
        shouldEndSession,
        shouldEndSession ? undefined : "What else would you like to know?"
      );
    } else {
      return this.createSSMLResponse(
        ssmlText,
        shouldEndSession,
        shouldEndSession ? undefined : "What else would you like to know?"
      );
    }
  }

  /**
   * Create a subscription prompt response
   */
  static createSubscriptionPromptResponse(
    remainingUsage: number = 0
  ): ResponseEnvelope {
    let speechText: string;
    let cardContent: string;

    if (remainingUsage > 0) {
      const conversationWord = remainingUsage === 1 ? 'conversation' : 'conversations';
      const unlimitedWord = remainingUsage === 1 ? 'unlimited access' : 'unlimited conversations';
      speechText = `You have ${remainingUsage} ${conversationWord} remaining today. Would you like to upgrade to premium for ${unlimitedWord}?`;
      cardContent = `${remainingUsage} ${conversationWord} remaining today. Upgrade to premium for unlimited AI conversations, better models, and extended context!`;
    } else {
      speechText = "You've reached your daily limit of 5 conversations. Upgrade to premium for unlimited conversations with advanced AI models!";
      cardContent = "Daily limit reached! Upgrade to premium for unlimited AI conversations, better models, and extended context!";
    }

    const ssmlText = this.formatForSpeech(speechText);

    return this.createSSMLWithCardResponse(
      ssmlText,
      "Upgrade to Premium",
      cardContent,
      false,
      "Say 'subscribe' to upgrade, or 'help' for more information."
    );
  }

  /**
   * Truncate text to fit within Alexa's limits
   */
  private static truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) {
      return text;
    }

    // Reserve space for " " + suffix (1 + 49 = 50 characters) + 1 extra for safety
    const availableLength = maxLength - this.TRUNCATION_SUFFIX.length - 2;
    const truncated = text.substring(0, availableLength);
    
    // Try to truncate at a sentence boundary
    const lastSentence = Math.max(
      truncated.lastIndexOf('. '),
      truncated.lastIndexOf('! '),
      truncated.lastIndexOf('? ')
    );

    if (lastSentence > availableLength * 0.7) {
      return truncated.substring(0, lastSentence + 1) + " " + this.TRUNCATION_SUFFIX;
    }

    // Try to truncate at a word boundary
    const lastSpace = truncated.lastIndexOf(' ');
    if (lastSpace > availableLength * 0.5) { // More lenient threshold
      return truncated.substring(0, lastSpace) + " " + this.TRUNCATION_SUFFIX;
    }

    // If no good word boundary, truncate at character boundary
    return truncated + " " + this.TRUNCATION_SUFFIX;
  }

  /**
   * Truncate SSML text while preserving tags
   */
  private static truncateSSML(ssml: string, maxLength: number): string {
    // If SSML is within limits, return as-is
    if (ssml.length <= maxLength) {
      return ssml;
    }

    // Extract content between <speak> tags
    const speakMatch = ssml.match(/<speak>(.*?)<\/speak>/s);
    if (!speakMatch) {
      // If no speak tags, treat as plain text and add them
      const truncated = this.truncateText(ssml, maxLength - 15); // Account for <speak> tags
      return `<speak>${truncated}</speak>`;
    }

    const content = speakMatch[1];
    const availableLength = maxLength - 15; // Account for <speak></speak> tags
    
    if (content.length <= availableLength) {
      return ssml;
    }

    // Truncate the content and wrap in speak tags
    const truncatedContent = this.truncateText(content, availableLength);
    return `<speak>${truncatedContent}</speak>`;
  }

  /**
   * Create a response with conversation state management
   * Requirements: 3.4, 4.1, 4.4
   */
  static createConversationStateResponse(
    llmResponse: string,
    context: ConversationContext,
    shouldEndSession?: boolean
  ): ResponseEnvelope {
    // Determine if session should end based on context and response
    const endSession = shouldEndSession ?? this.shouldEndConversation(llmResponse, context);
    
    // Create the base response
    const response = this.createConversationResponse(llmResponse, endSession);
    
    // Add session attributes for context preservation
    if (!endSession) {
      response.sessionAttributes = this.createSessionAttributes(context);
    }
    
    return response;
  }

  /**
   * Create session attributes for context preservation between turns
   */
  static createSessionAttributes(context: ConversationContext): Record<string, any> {
    return {
      userId: context.userId,
      sessionId: context.sessionId,
      messageCount: context.messages.length,
      lastUpdated: context.lastUpdated.toISOString(),
      tokenCount: context.tokenCount
    };
  }

  /**
   * Extract conversation context from session attributes
   */
  static extractContextFromSession(requestEnvelope: RequestEnvelope): Partial<ConversationContext> | null {
    const sessionAttributes = requestEnvelope.session?.attributes;
    
    if (!sessionAttributes) {
      return null;
    }

    try {
      // Validate required fields
      if (!sessionAttributes.userId || !sessionAttributes.sessionId) {
        return null;
      }

      // Validate date
      const lastUpdated = sessionAttributes.lastUpdated ? new Date(sessionAttributes.lastUpdated) : new Date();
      if (isNaN(lastUpdated.getTime())) {
        return null;
      }

      return {
        userId: sessionAttributes.userId,
        sessionId: sessionAttributes.sessionId,
        tokenCount: sessionAttributes.tokenCount || 0,
        lastUpdated
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Determine if conversation should end based on response content and context
   */
  static shouldEndConversation(llmResponse: string, context: ConversationContext): boolean {
    // Check for explicit ending phrases
    const endingPhrases = [
      'goodbye',
      'bye',
      'see you later',
      'talk to you later',
      'have a good day',
      'take care',
      'farewell',
      'until next time'
    ];

    const lowerResponse = llmResponse.toLowerCase();
    const hasEndingPhrase = endingPhrases.some(phrase => lowerResponse.includes(phrase));

    // Check conversation length - end if too many turns
    const maxTurns = 20;
    const tooManyTurns = context.messages.length >= maxTurns;

    // Check for inactivity - if last update was too long ago
    const maxInactivityMinutes = 30;
    const inactivityThreshold = new Date(Date.now() - maxInactivityMinutes * 60 * 1000);
    const tooInactive = context.lastUpdated < inactivityThreshold;

    return hasEndingPhrase || tooManyTurns || tooInactive;
  }

  /**
   * Create a session continuation response with context preservation
   */
  static createContinuationResponse(
    speechText: string,
    context: ConversationContext,
    repromptText?: string
  ): ResponseEnvelope {
    const ssmlText = this.formatForSpeech(speechText);
    const defaultReprompt = "What else would you like to know?";
    const repromptSSML = this.formatForSpeech(repromptText || defaultReprompt);
    
    const response = this.createSSMLResponse(
      ssmlText,
      false, // Never end session for continuation
      repromptSSML
    );

    // Preserve session state
    response.sessionAttributes = this.createSessionAttributes(context);

    return response;
  }

  /**
   * Create a session ending response with cleanup
   */
  static createEndingResponse(
    speechText: string,
    includeGoodbye: boolean = true
  ): ResponseEnvelope {
    let finalSpeech = speechText;
    
    if (includeGoodbye && !speechText.toLowerCase().includes('goodbye')) {
      finalSpeech += " Goodbye!";
    }

    const ssmlText = this.formatForSpeech(finalSpeech);
    
    return this.createSSMLResponse(
      ssmlText,
      true // Always end session
    );
  }

  /**
   * Create a response for when conversation context is lost
   */
  static createContextLostResponse(): ResponseEnvelope {
    const speechText = "I'm sorry, I seem to have lost track of our conversation. Let's start fresh. What would you like to talk about?";
    
    return this.createConversationResponse(speechText, false);
  }

  /**
   * Create a response for session timeout
   */
  static createTimeoutResponse(): ResponseEnvelope {
    const speechText = "I haven't heard from you in a while. Our conversation will end now, but feel free to start a new one anytime. Goodbye!";
    
    return this.createEndingResponse(speechText, false);
  }

  /**
   * Determine appropriate reprompt based on conversation state
   */
  static getContextualReprompt(context: ConversationContext): string {
    const messageCount = context.messages.length;
    
    if (messageCount === 0) {
      return "What would you like to ask me?";
    } else if (messageCount < 3) {
      return "What else would you like to know?";
    } else if (messageCount < 10) {
      return "Is there anything else I can help you with?";
    } else {
      return "What other questions do you have?";
    }
  }

  /**
   * Check if the user's input indicates they want to end the conversation
   */
  static isEndingIntent(userInput: string): boolean {
    const endingIntents = [
      'stop',
      'exit',
      'quit',
      'end',
      'goodbye',
      'bye',
      'cancel',
      'that\'s all',
      'nothing else',
      'no more questions'
    ];

    const lowerInput = userInput.toLowerCase().trim();
    return endingIntents.some(intent => 
      lowerInput === intent || 
      lowerInput.startsWith(intent + ' ') ||
      lowerInput.endsWith(' ' + intent)
    );
  }

  /**
   * Create a response that maintains conversation flow
   */
  static createFlowResponse(
    llmResponse: string,
    context: ConversationContext,
    userInput?: string
  ): ResponseEnvelope {
    // Check if user wants to end conversation
    if (userInput && this.isEndingIntent(userInput)) {
      return this.createEndingResponse(llmResponse);
    }

    // Check if LLM response indicates conversation should end
    if (this.shouldEndConversation(llmResponse, context)) {
      return this.createEndingResponse(llmResponse);
    }

    // Continue conversation with appropriate reprompt
    const reprompt = this.getContextualReprompt(context);
    return this.createConversationStateResponse(llmResponse, context, false);
  }

  /**
   * Validate response envelope for Alexa compliance
   */
  static validateResponse(response: ResponseEnvelope): boolean {
    try {
      // Check required fields
      if (!response.version || !response.response) {
        return false;
      }

      // Check speech output
      if (response.response.outputSpeech) {
        const speech = response.response.outputSpeech;
        if (speech.type === 'PlainText' && speech.text) {
          if (speech.text.length > this.MAX_SPEECH_LENGTH) {
            return false;
          }
        } else if (speech.type === 'SSML' && speech.ssml) {
          if (speech.ssml.length > this.MAX_SPEECH_LENGTH) {
            return false;
          }
        }
      }

      // Check card content
      if (response.response.card && response.response.card.type === 'Simple') {
        const card = response.response.card as ui.SimpleCard;
        if (card.content && card.content.length > this.MAX_CARD_CONTENT_LENGTH) {
          return false;
        }
      }

      return true;
    } catch (error) {
      return false;
    }
  }
}