import { ErrorHandler } from '../handlers/ErrorHandler';
import { AnalyticsService } from '../interfaces/AnalyticsService';
import { RequestEnvelope, IntentRequest, ui } from 'ask-sdk-model';

// Mock dependencies
const mockAnalyticsService: jest.Mocked<AnalyticsService> = {
  logConversation: jest.fn(),
  logSubscriptionEvent: jest.fn(),
  logError: jest.fn(),
  logSkillLaunch: jest.fn(),
  logUsageLimitEvent: jest.fn(),
  logSessionEnd: jest.fn(),
  logFallbackEvent: jest.fn(),
};

describe('ErrorHandler', () => {
  let handler: ErrorHandler;

  beforeEach(() => {
    handler = new ErrorHandler(mockAnalyticsService);
    jest.clearAllMocks();
  });

  const createHandlerInput = (intentName?: string, userId: string = 'test-user-123') => ({
    requestEnvelope: {
      version: '1.0',
      session: {
        new: false,
        sessionId: 'test-session-123',
        application: { applicationId: 'test-app-id' },
        user: { userId },
      },
      context: {
        System: {
          application: { applicationId: 'test-app-id' },
          user: { userId },
          device: {
            deviceId: 'test-device-id',
            supportedInterfaces: {},
          },
          apiEndpoint: 'https://api.amazonalexa.com',
          apiAccessToken: 'test-token',
        },
      },
      request: intentName ? {
        type: 'IntentRequest',
        requestId: 'test-request-123',
        timestamp: '2023-01-01T00:00:00Z',
        locale: 'en-US',
        dialogState: 'COMPLETED',
        intent: {
          name: intentName,
          confirmationStatus: 'NONE',
        },
      } as IntentRequest : {
        type: 'LaunchRequest',
        requestId: 'test-request-123',
        timestamp: '2023-01-01T00:00:00Z',
        locale: 'en-US',
      },
    } as RequestEnvelope,
  });

  describe('canHandle', () => {
    it('should handle all errors', () => {
      const error = new Error('Test error');
      const handlerInput = createHandlerInput();

      expect(handler.canHandle(handlerInput, error)).toBe(true);
    });
  });

  describe('handle', () => {
    it('should handle API timeout errors appropriately', async () => {
      const error = new Error('API timeout occurred');
      const handlerInput = createHandlerInput('ChatIntent');
      mockAnalyticsService.logError.mockResolvedValue();

      const response = await handler.handle(handlerInput, error);

      expect(mockAnalyticsService.logError).toHaveBeenCalledWith(error, {
        userId: 'test-user-123',
        errorType: 'GlobalErrorHandler',
        timestamp: expect.any(Date),
        additionalData: {
          requestType: 'IntentRequest',
          intentName: 'ChatIntent',
          errorMessage: 'API timeout occurred',
          errorStack: error.stack,
        },
      });

      expect(response.version).toBe('1.0');
      expect((response.response.outputSpeech as ui.PlainTextOutputSpeech)?.text).toBe(
        "I'm having trouble connecting to the AI service right now. Please try again in a moment."
      );
      expect((response.response.reprompt?.outputSpeech as ui.PlainTextOutputSpeech)?.text).toBe("What would you like to ask me?");
      expect((response.response.card as ui.SimpleCard)?.title).toBe("AI Chat - Connection Issue");
      expect(response.response.shouldEndSession).toBe(false);
    });

    it('should handle rate limit errors appropriately', async () => {
      const error = new Error('rate limit exceeded');
      const handlerInput = createHandlerInput('ChatIntent');
      mockAnalyticsService.logError.mockResolvedValue();

      const response = await handler.handle(handlerInput, error);

      expect((response.response.outputSpeech as ui.PlainTextOutputSpeech)?.text).toBe(
        "The AI service is busy right now. Please wait a moment and try again."
      );
      expect((response.response.card as ui.SimpleCard)?.title).toBe("AI Chat - Service Busy");
    });

    it('should handle authentication errors appropriately', async () => {
      const error = new Error('authentication failed');
      const handlerInput = createHandlerInput('ChatIntent');
      mockAnalyticsService.logError.mockResolvedValue();

      const response = await handler.handle(handlerInput, error);

      expect((response.response.outputSpeech as ui.PlainTextOutputSpeech)?.text).toBe(
        "I'm experiencing a temporary technical issue. Please try again later."
      );
      expect((response.response.card as ui.SimpleCard)?.title).toBe("AI Chat - Technical Issue");
    });

    it('should handle speech recognition errors appropriately', async () => {
      const error = new Error('Speech recognition failed');
      const handlerInput = createHandlerInput('ChatIntent');
      mockAnalyticsService.logError.mockResolvedValue();

      const response = await handler.handle(handlerInput, error);

      expect((response.response.outputSpeech as ui.PlainTextOutputSpeech)?.text).toBe(
        "I didn't catch what you said. Could you please repeat your question?"
      );
      expect((response.response.card as ui.SimpleCard)?.title).toBe("AI Chat - Speech Recognition Issue");
    });

    it('should handle skill activation errors appropriately', async () => {
      const error = new Error('skill activation failed');
      const handlerInput = createHandlerInput();
      mockAnalyticsService.logError.mockResolvedValue();

      const response = await handler.handle(handlerInput, error);

      expect((response.response.outputSpeech as ui.PlainTextOutputSpeech)?.text).toBe(
        "I'm having trouble starting up, but I'm ready to help now. What would you like to ask me?"
      );
      expect((response.response.card as ui.SimpleCard)?.title).toBe("AI Chat - Startup Issue");
    });

    it('should handle generic errors appropriately', async () => {
      const error = new Error('Something unexpected happened');
      const handlerInput = createHandlerInput('ChatIntent');
      mockAnalyticsService.logError.mockResolvedValue();

      const response = await handler.handle(handlerInput, error);

      expect((response.response.outputSpeech as ui.PlainTextOutputSpeech)?.text).toBe(
        "I'm sorry, I encountered an unexpected issue. Could you please try again?"
      );
      expect((response.response.card as ui.SimpleCard)?.title).toBe("AI Chat - Unexpected Error");
    });

    it('should handle missing user ID gracefully', async () => {
      const error = new Error('Test error');
      const handlerInput = createHandlerInput('ChatIntent');
      if (handlerInput.requestEnvelope.session) {
        handlerInput.requestEnvelope.session.user = undefined as any;
      }
      mockAnalyticsService.logError.mockResolvedValue();

      const response = await handler.handle(handlerInput, error);

      expect(mockAnalyticsService.logError).toHaveBeenCalledWith(error, {
        userId: 'unknown',
        errorType: 'GlobalErrorHandler',
        timestamp: expect.any(Date),
        additionalData: {
          requestType: 'IntentRequest',
          intentName: 'ChatIntent',
          errorMessage: 'Test error',
          errorStack: error.stack,
        },
      });

      expect(response.version).toBe('1.0');
      expect(response.response.shouldEndSession).toBe(false);
    });

    it('should handle launch request errors', async () => {
      const error = new Error('Launch failed');
      const handlerInput = createHandlerInput(); // No intent name = LaunchRequest
      mockAnalyticsService.logError.mockResolvedValue();

      const response = await handler.handle(handlerInput, error);

      expect(mockAnalyticsService.logError).toHaveBeenCalledWith(error, {
        userId: 'test-user-123',
        errorType: 'GlobalErrorHandler',
        timestamp: expect.any(Date),
        additionalData: {
          requestType: 'LaunchRequest',
          intentName: undefined,
          errorMessage: 'Launch failed',
          errorStack: error.stack,
        },
      });
    });

    it('should continue functioning even if analytics logging fails', async () => {
      const error = new Error('Test error');
      const handlerInput = createHandlerInput('ChatIntent');
      mockAnalyticsService.logError.mockRejectedValue(new Error('Analytics failed'));

      // Should not throw despite analytics failure
      const response = await handler.handle(handlerInput, error);

      expect(response.version).toBe('1.0');
      expect((response.response.outputSpeech as ui.PlainTextOutputSpeech)?.text).toBeDefined();
    });
  });
});