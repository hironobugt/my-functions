import { ResponseBuilder } from '../utils/ResponseBuilder';
import { ResponseEnvelope, RequestEnvelope } from 'ask-sdk-model';
import { ConversationContext, ChatMessage } from '../models/ConversationContext';

describe('ResponseBuilder', () => {
  describe('createSpeechResponse', () => {
    it('should create a basic speech response', () => {
      const speechText = 'Hello, this is a test response.';
      const response = ResponseBuilder.createSpeechResponse(speechText);

      expect(response.version).toBe('1.0');
      expect(response.response.outputSpeech?.type).toBe('PlainText');
      expect((response.response.outputSpeech as any).text).toBe(speechText);
      expect(response.response.shouldEndSession).toBe(false);
    });

    it('should create a speech response that ends the session', () => {
      const speechText = 'Goodbye!';
      const response = ResponseBuilder.createSpeechResponse(speechText, true);

      expect(response.response.shouldEndSession).toBe(true);
      expect(response.response.reprompt).toBeUndefined();
    });

    it('should include reprompt when session continues', () => {
      const speechText = 'What would you like to know?';
      const repromptText = 'Please ask me a question.';
      const response = ResponseBuilder.createSpeechResponse(speechText, false, repromptText);

      expect(response.response.shouldEndSession).toBe(false);
      expect(response.response.reprompt?.outputSpeech?.type).toBe('PlainText');
      expect((response.response.reprompt?.outputSpeech as any).text).toBe(repromptText);
    });

    it('should truncate long speech text', () => {
      const longText = 'A'.repeat(9000); // Exceeds MAX_SPEECH_LENGTH
      const response = ResponseBuilder.createSpeechResponse(longText);

      const outputText = (response.response.outputSpeech as any).text;
      expect(outputText.length).toBeLessThan(8000);
      expect(outputText).toContain('I had to cut this short due to length limits.');
    });
  });

  describe('createSSMLResponse', () => {
    it('should create an SSML response', () => {
      const ssmlText = '<speak>Hello <break time="0.5s"/> world!</speak>';
      const response = ResponseBuilder.createSSMLResponse(ssmlText);

      expect(response.response.outputSpeech?.type).toBe('SSML');
      expect((response.response.outputSpeech as any).ssml).toBe(ssmlText);
    });

    it('should include SSML reprompt', () => {
      const ssmlText = '<speak>What can I help you with?</speak>';
      const repromptSSML = '<speak>Please ask me something.</speak>';
      const response = ResponseBuilder.createSSMLResponse(ssmlText, false, repromptSSML);

      expect(response.response.reprompt?.outputSpeech?.type).toBe('SSML');
      expect((response.response.reprompt?.outputSpeech as any).ssml).toBe(repromptSSML);
    });

    it('should truncate long SSML text', () => {
      const longSSML = '<speak>' + 'A'.repeat(9000) + '</speak>';
      const response = ResponseBuilder.createSSMLResponse(longSSML);

      const outputSSML = (response.response.outputSpeech as any).ssml;
      expect(outputSSML.length).toBeLessThan(8000);
      expect(outputSSML).toContain('<speak>');
      expect(outputSSML).toContain('</speak>');
    });
  });

  describe('createSpeechWithCardResponse', () => {
    it('should create a response with speech and card', () => {
      const speechText = 'Here is your answer.';
      const cardTitle = 'AI Response';
      const cardContent = 'This is the detailed answer.';
      
      const response = ResponseBuilder.createSpeechWithCardResponse(
        speechText, cardTitle, cardContent
      );

      expect(response.response.outputSpeech?.type).toBe('PlainText');
      expect((response.response.outputSpeech as any).text).toBe(speechText);
      expect(response.response.card?.type).toBe('Simple');
      expect((response.response.card as any).title).toBe(cardTitle);
      expect((response.response.card as any).content).toBe(cardContent);
    });

    it('should truncate long card content', () => {
      const speechText = 'Short speech';
      const cardTitle = 'Title';
      const longCardContent = 'A'.repeat(9000);
      
      const response = ResponseBuilder.createSpeechWithCardResponse(
        speechText, cardTitle, longCardContent
      );

      const cardContent = (response.response.card as any).content;
      expect(cardContent.length).toBeLessThan(8000);
      expect(cardContent).toContain('I had to cut this short due to length limits.');
    });
  });

  describe('createSSMLWithCardResponse', () => {
    it('should create a response with SSML and card', () => {
      const ssmlText = '<speak>Here is your answer.</speak>';
      const cardTitle = 'AI Response';
      const cardContent = 'This is the detailed answer.';
      
      const response = ResponseBuilder.createSSMLWithCardResponse(
        ssmlText, cardTitle, cardContent
      );

      expect(response.response.outputSpeech?.type).toBe('SSML');
      expect((response.response.outputSpeech as any).ssml).toBe(ssmlText);
      expect(response.response.card?.type).toBe('Simple');
      expect((response.response.card as any).title).toBe(cardTitle);
      expect((response.response.card as any).content).toBe(cardContent);
    });
  });

  describe('createErrorResponse', () => {
    it('should create a default error response', () => {
      const response = ResponseBuilder.createErrorResponse();

      expect(response.response.outputSpeech?.type).toBe('PlainText');
      expect((response.response.outputSpeech as any).text).toContain('error');
      expect(response.response.shouldEndSession).toBe(false);
      expect(response.response.reprompt).toBeDefined();
    });

    it('should create a custom error response that ends session', () => {
      const errorMessage = 'Custom error occurred.';
      const response = ResponseBuilder.createErrorResponse(errorMessage, true);

      expect((response.response.outputSpeech as any).text).toBe(errorMessage);
      expect(response.response.shouldEndSession).toBe(true);
      expect(response.response.reprompt).toBeUndefined();
    });
  });

  describe('formatForSpeech', () => {
    it('should add SSML breaks after sentences', () => {
      const text = 'First sentence. Second sentence! Third sentence?';
      const formatted = ResponseBuilder.formatForSpeech(text);

      expect(formatted).toContain('<speak>');
      expect(formatted).toContain('</speak>');
      expect(formatted).toContain('<break time="0.3s"/>');
    });

    it('should handle colons with shorter breaks', () => {
      const text = 'Here are the options: option one, option two.';
      const formatted = ResponseBuilder.formatForSpeech(text);

      expect(formatted).toContain('<break time="0.2s"/>');
    });

    it('should handle lists with breaks', () => {
      const text = 'Items:\n- First item\n- Second item\n1. Numbered item';
      const formatted = ResponseBuilder.formatForSpeech(text);

      expect(formatted).toContain('<break time="0.2s"/>');
      expect(formatted).not.toContain('\n');
    });

    it('should clean up excessive whitespace', () => {
      const text = 'Text   with    multiple     spaces.';
      const formatted = ResponseBuilder.formatForSpeech(text);

      expect(formatted).not.toContain('   ');
      expect(formatted).toContain('Text with multiple spaces.');
    });
  });

  describe('createConversationResponse', () => {
    it('should create a conversation response with SSML and card', () => {
      const llmResponse = 'This is an AI response. It has multiple sentences!';
      const response = ResponseBuilder.createConversationResponse(llmResponse);

      expect(response.response.outputSpeech?.type).toBe('SSML');
      expect((response.response.outputSpeech as any).ssml).toContain('<speak>');
      expect((response.response.outputSpeech as any).ssml).toContain('<break time="0.3s"/>');
      expect(response.response.card?.type).toBe('Simple');
      expect((response.response.card as any).title).toBe('AI Chat Response');
      expect((response.response.card as any).content).toBe(llmResponse);
    });

    it('should create a conversation response without card', () => {
      const llmResponse = 'Simple response.';
      const response = ResponseBuilder.createConversationResponse(llmResponse, false, false);

      expect(response.response.outputSpeech?.type).toBe('SSML');
      expect(response.response.card).toBeUndefined();
      expect(response.response.shouldEndSession).toBe(false);
    });

    it('should end session when requested', () => {
      const llmResponse = 'Goodbye!';
      const response = ResponseBuilder.createConversationResponse(llmResponse, true);

      expect(response.response.shouldEndSession).toBe(true);
      expect(response.response.reprompt).toBeUndefined();
    });
  });

  describe('createSubscriptionPromptResponse', () => {
    it('should create subscription prompt with remaining usage', () => {
      const response = ResponseBuilder.createSubscriptionPromptResponse(3);

      const speechSSML = (response.response.outputSpeech as any).ssml;
      expect(speechSSML).toContain('3 conversations remaining');
      expect(response.response.card?.type).toBe('Simple');
      expect((response.response.card as any).title).toBe('Upgrade to Premium');
      expect(response.response.shouldEndSession).toBe(false);
    });

    it('should create subscription prompt when limit reached', () => {
      const response = ResponseBuilder.createSubscriptionPromptResponse(0);

      const speechSSML = (response.response.outputSpeech as any).ssml;
      expect(speechSSML).toContain('reached your daily limit');
      expect((response.response.card as any).content).toContain('Daily limit reached');
    });

    it('should handle singular conversation count', () => {
      const response = ResponseBuilder.createSubscriptionPromptResponse(1);

      const speechSSML = (response.response.outputSpeech as any).ssml;
      expect(speechSSML).toContain('1 conversation remaining');
      expect(speechSSML).toContain('unlimited access');
      expect(speechSSML).not.toContain('unlimited conversations');
    });
  });

  describe('validateResponse', () => {
    it('should validate a correct response', () => {
      const response = ResponseBuilder.createSpeechResponse('Valid response');
      const isValid = ResponseBuilder.validateResponse(response);

      expect(isValid).toBe(true);
    });

    it('should reject response without version', () => {
      const invalidResponse = {
        response: {
          outputSpeech: { type: 'PlainText', text: 'Test' },
          shouldEndSession: false
        }
      } as ResponseEnvelope;

      const isValid = ResponseBuilder.validateResponse(invalidResponse);
      expect(isValid).toBe(false);
    });

    it('should reject response with oversized speech', () => {
      const longText = 'A'.repeat(10000);
      const response: ResponseEnvelope = {
        version: '1.0',
        response: {
          outputSpeech: { type: 'PlainText', text: longText },
          shouldEndSession: false
        }
      };

      const isValid = ResponseBuilder.validateResponse(response);
      expect(isValid).toBe(false);
    });

    it('should reject response with oversized card content', () => {
      const longContent = 'A'.repeat(10000);
      const response: ResponseEnvelope = {
        version: '1.0',
        response: {
          outputSpeech: { type: 'PlainText', text: 'Short text' },
          card: { type: 'Simple', title: 'Title', content: longContent },
          shouldEndSession: false
        }
      };

      const isValid = ResponseBuilder.validateResponse(response);
      expect(isValid).toBe(false);
    });

    it('should handle validation errors gracefully', () => {
      const malformedResponse = null as any;
      const isValid = ResponseBuilder.validateResponse(malformedResponse);

      expect(isValid).toBe(false);
    });
  });

  describe('text truncation', () => {
    it('should truncate at sentence boundaries when possible', () => {
      const text = 'First sentence. Second sentence. ' + 'A'.repeat(8000);
      const response = ResponseBuilder.createSpeechResponse(text);
      const outputText = (response.response.outputSpeech as any).text;

      expect(outputText).toContain('First sentence.');
      expect(outputText).toContain('I had to cut this short due to length limits.');
    });

    it('should truncate at character boundary when no good word boundary available', () => {
      const text = 'This is a very long sentence without periods that goes on and on and continues with more words and more words and more words ' + 'A'.repeat(8000);
      const response = ResponseBuilder.createSpeechResponse(text);
      const outputText = (response.response.outputSpeech as any).text;

      // When no good word boundary is available, should truncate at character boundary
      expect(outputText).toContain('I had to cut this short due to length limits.');
      expect(outputText.length).toBeLessThan(8000);
      // Should contain the beginning of the text
      expect(outputText).toContain('This is a very long sentence');
    });
  });

  // Helper function to create mock conversation context
  const createMockContext = (messageCount: number = 2, lastUpdated?: Date): ConversationContext => ({
    userId: 'test-user-123',
    sessionId: 'test-session-456',
    messages: Array.from({ length: messageCount }, (_, i) => ({
      role: i % 2 === 0 ? 'user' : 'assistant',
      content: `Message ${i + 1}`,
      timestamp: new Date(Date.now() - (messageCount - i) * 60000)
    } as ChatMessage)),
    createdAt: new Date(Date.now() - messageCount * 60000),
    lastUpdated: lastUpdated || new Date(),
    tokenCount: messageCount * 50
  });

  describe('conversation state management', () => {
    describe('createConversationStateResponse', () => {
      it('should create response with session attributes when continuing', () => {
        const context = createMockContext(3);
        const llmResponse = 'This is a normal response.';
        
        const response = ResponseBuilder.createConversationStateResponse(llmResponse, context, false);

        expect(response.response.shouldEndSession).toBe(false);
        expect(response.sessionAttributes).toBeDefined();
        expect(response.sessionAttributes?.userId).toBe(context.userId);
        expect(response.sessionAttributes?.sessionId).toBe(context.sessionId);
        expect(response.sessionAttributes?.messageCount).toBe(3);
        expect(response.sessionAttributes?.tokenCount).toBe(150);
      });

      it('should end session and not include attributes when ending', () => {
        const context = createMockContext(3);
        const llmResponse = 'Goodbye! Have a great day.';
        
        const response = ResponseBuilder.createConversationStateResponse(llmResponse, context, true);

        expect(response.response.shouldEndSession).toBe(true);
        expect(response.sessionAttributes).toBeUndefined();
      });

      it('should auto-detect ending based on response content', () => {
        const context = createMockContext(3);
        const llmResponse = 'Thanks for chatting! Goodbye and take care.';
        
        const response = ResponseBuilder.createConversationStateResponse(llmResponse, context);

        expect(response.response.shouldEndSession).toBe(true);
      });
    });

    describe('createSessionAttributes', () => {
      it('should create proper session attributes', () => {
        const context = createMockContext(5);
        const attributes = ResponseBuilder.createSessionAttributes(context);

        expect(attributes.userId).toBe('test-user-123');
        expect(attributes.sessionId).toBe('test-session-456');
        expect(attributes.messageCount).toBe(5);
        expect(attributes.tokenCount).toBe(250);
        expect(attributes.lastUpdated).toBeDefined();
      });
    });

    describe('extractContextFromSession', () => {
      it('should extract context from valid session attributes', () => {
        const mockRequest: RequestEnvelope = {
          version: '1.0',
          session: {
            sessionId: 'session-123',
            application: { applicationId: 'app-123' },
            user: { userId: 'user-123' },
            new: false,
            attributes: {
              userId: 'test-user',
              sessionId: 'test-session',
              tokenCount: 100,
              lastUpdated: '2023-01-01T12:00:00.000Z'
            }
          },
          context: {
            System: {
              application: { applicationId: 'app-123' },
              user: { userId: 'user-123' },
              device: { deviceId: 'device-123', supportedInterfaces: {} },
              apiEndpoint: 'https://api.amazonalexa.com',
              apiAccessToken: 'token-123'
            }
          },
          request: {
            type: 'IntentRequest',
            requestId: 'req-123',
            timestamp: '2023-01-01T12:00:00.000Z',
            locale: 'en-US',
            intent: {
              name: 'TestIntent',
              confirmationStatus: 'NONE'
            },
            dialogState: 'COMPLETED'
          }
        };

        const context = ResponseBuilder.extractContextFromSession(mockRequest);

        expect(context).toBeDefined();
        expect(context?.userId).toBe('test-user');
        expect(context?.sessionId).toBe('test-session');
        expect(context?.tokenCount).toBe(100);
        expect(context?.lastUpdated).toBeInstanceOf(Date);
      });

      it('should return null for missing session attributes', () => {
        const mockRequest: RequestEnvelope = {
          version: '1.0',
          session: {
            sessionId: 'session-123',
            application: { applicationId: 'app-123' },
            user: { userId: 'user-123' },
            new: true
          },
          context: {
            System: {
              application: { applicationId: 'app-123' },
              user: { userId: 'user-123' },
              device: { deviceId: 'device-123', supportedInterfaces: {} },
              apiEndpoint: 'https://api.amazonalexa.com',
              apiAccessToken: 'token-123'
            }
          },
          request: {
            type: 'LaunchRequest',
            requestId: 'req-123',
            timestamp: '2023-01-01T12:00:00.000Z',
            locale: 'en-US'
          }
        };

        const context = ResponseBuilder.extractContextFromSession(mockRequest);
        expect(context).toBeNull();
      });

      it('should handle malformed session attributes gracefully', () => {
        const mockRequest: RequestEnvelope = {
          version: '1.0',
          session: {
            sessionId: 'session-123',
            application: { applicationId: 'app-123' },
            user: { userId: 'user-123' },
            new: false,
            attributes: {
              lastUpdated: 'invalid-date'
            }
          },
          context: {
            System: {
              application: { applicationId: 'app-123' },
              user: { userId: 'user-123' },
              device: { deviceId: 'device-123', supportedInterfaces: {} },
              apiEndpoint: 'https://api.amazonalexa.com',
              apiAccessToken: 'token-123'
            }
          },
          request: {
            type: 'IntentRequest',
            requestId: 'req-123',
            timestamp: '2023-01-01T12:00:00.000Z',
            locale: 'en-US',
            intent: {
              name: 'TestIntent',
              confirmationStatus: 'NONE'
            },
            dialogState: 'COMPLETED'
          }
        };

        const context = ResponseBuilder.extractContextFromSession(mockRequest);
        expect(context).toBeNull();
      });
    });

    describe('shouldEndConversation', () => {
      it('should detect ending phrases', () => {
        const context = createMockContext(3);
        
        expect(ResponseBuilder.shouldEndConversation('Thanks! Goodbye.', context)).toBe(true);
        expect(ResponseBuilder.shouldEndConversation('See you later!', context)).toBe(true);
        expect(ResponseBuilder.shouldEndConversation('Have a good day.', context)).toBe(true);
        expect(ResponseBuilder.shouldEndConversation('Take care!', context)).toBe(true);
      });

      it('should not end for normal responses', () => {
        const context = createMockContext(3);
        
        expect(ResponseBuilder.shouldEndConversation('Here is your answer.', context)).toBe(false);
        expect(ResponseBuilder.shouldEndConversation('What else would you like to know?', context)).toBe(false);
      });

      it('should end conversation after too many turns', () => {
        const context = createMockContext(25); // Exceeds maxTurns of 20
        
        expect(ResponseBuilder.shouldEndConversation('Normal response.', context)).toBe(true);
      });

      it('should end conversation after inactivity', () => {
        const oldDate = new Date(Date.now() - 35 * 60 * 1000); // 35 minutes ago
        const context = createMockContext(3, oldDate);
        
        expect(ResponseBuilder.shouldEndConversation('Normal response.', context)).toBe(true);
      });
    });

    describe('createContinuationResponse', () => {
      it('should create continuation response with session attributes', () => {
        const context = createMockContext(3);
        const speechText = 'What else would you like to know?';
        
        const response = ResponseBuilder.createContinuationResponse(speechText, context);

        expect(response.response.shouldEndSession).toBe(false);
        expect(response.response.outputSpeech?.type).toBe('SSML');
        expect(response.sessionAttributes).toBeDefined();
        expect(response.sessionAttributes?.userId).toBe(context.userId);
      });

      it('should use custom reprompt when provided', () => {
        const context = createMockContext(3);
        const speechText = 'Here is your answer.';
        const customReprompt = 'Any other questions?';
        
        const response = ResponseBuilder.createContinuationResponse(speechText, context, customReprompt);

        expect(response.response.reprompt?.outputSpeech?.type).toBe('SSML');
        expect((response.response.reprompt?.outputSpeech as any)?.ssml).toContain(customReprompt);
      });
    });

    describe('createEndingResponse', () => {
      it('should create ending response that ends session', () => {
        const speechText = 'Thanks for using the service.';
        
        const response = ResponseBuilder.createEndingResponse(speechText);

        expect(response.response.shouldEndSession).toBe(true);
        expect(response.response.reprompt).toBeUndefined();
        expect((response.response.outputSpeech as any).ssml).toContain('Goodbye!');
      });

      it('should not add goodbye if already present', () => {
        const speechText = 'Thanks for using the service. Goodbye!';
        
        const response = ResponseBuilder.createEndingResponse(speechText);

        const ssml = (response.response.outputSpeech as any).ssml;
        expect((ssml.match(/goodbye/gi) || []).length).toBe(1);
      });

      it('should skip goodbye when requested', () => {
        const speechText = 'Session ended.';
        
        const response = ResponseBuilder.createEndingResponse(speechText, false);

        expect((response.response.outputSpeech as any).ssml).not.toContain('Goodbye');
      });
    });

    describe('createContextLostResponse', () => {
      it('should create appropriate response for lost context', () => {
        const response = ResponseBuilder.createContextLostResponse();

        expect(response.response.shouldEndSession).toBe(false);
        expect((response.response.outputSpeech as any).ssml).toContain('lost track of our conversation');
        expect((response.response.outputSpeech as any).ssml).toContain('start fresh');
      });
    });

    describe('createTimeoutResponse', () => {
      it('should create timeout response that ends session', () => {
        const response = ResponseBuilder.createTimeoutResponse();

        expect(response.response.shouldEndSession).toBe(true);
        expect((response.response.outputSpeech as any).ssml).toContain('haven\'t heard from you');
        expect((response.response.outputSpeech as any).ssml).toContain('Goodbye');
      });
    });

    describe('getContextualReprompt', () => {
      it('should provide appropriate reprompts based on message count', () => {
        expect(ResponseBuilder.getContextualReprompt(createMockContext(0))).toContain('What would you like to ask');
        expect(ResponseBuilder.getContextualReprompt(createMockContext(2))).toContain('What else would you like');
        expect(ResponseBuilder.getContextualReprompt(createMockContext(5))).toContain('anything else I can help');
        expect(ResponseBuilder.getContextualReprompt(createMockContext(15))).toContain('What other questions');
      });
    });

    describe('isEndingIntent', () => {
      it('should detect ending intents', () => {
        expect(ResponseBuilder.isEndingIntent('stop')).toBe(true);
        expect(ResponseBuilder.isEndingIntent('exit')).toBe(true);
        expect(ResponseBuilder.isEndingIntent('quit')).toBe(true);
        expect(ResponseBuilder.isEndingIntent('goodbye')).toBe(true);
        expect(ResponseBuilder.isEndingIntent('that\'s all')).toBe(true);
        expect(ResponseBuilder.isEndingIntent('nothing else')).toBe(true);
      });

      it('should detect ending intents with extra words', () => {
        expect(ResponseBuilder.isEndingIntent('stop please')).toBe(true);
        expect(ResponseBuilder.isEndingIntent('please stop')).toBe(true);
        expect(ResponseBuilder.isEndingIntent('I want to quit')).toBe(true);
      });

      it('should not detect normal conversation', () => {
        expect(ResponseBuilder.isEndingIntent('tell me about cats')).toBe(false);
        expect(ResponseBuilder.isEndingIntent('what is the weather')).toBe(false);
        expect(ResponseBuilder.isEndingIntent('help me')).toBe(false);
      });
    });

    describe('createFlowResponse', () => {
      it('should end conversation when user indicates ending intent', () => {
        const context = createMockContext(3);
        const llmResponse = 'Okay, I understand.';
        
        const response = ResponseBuilder.createFlowResponse(llmResponse, context, 'stop');

        expect(response.response.shouldEndSession).toBe(true);
      });

      it('should end conversation when LLM response indicates ending', () => {
        const context = createMockContext(3);
        const llmResponse = 'Thanks for chatting! Goodbye.';
        
        const response = ResponseBuilder.createFlowResponse(llmResponse, context, 'tell me more');

        expect(response.response.shouldEndSession).toBe(true);
      });

      it('should continue conversation for normal flow', () => {
        const context = createMockContext(3);
        const llmResponse = 'Here is the information you requested.';
        
        const response = ResponseBuilder.createFlowResponse(llmResponse, context, 'tell me about cats');

        expect(response.response.shouldEndSession).toBe(false);
        expect(response.sessionAttributes).toBeDefined();
      });
    });
  });
});