import { FallbackHandler } from '../handlers/FallbackHandler';
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

describe('FallbackHandler', () => {
  let handler: FallbackHandler;

  beforeEach(() => {
    handler = new FallbackHandler(mockAnalyticsService);
    jest.clearAllMocks();
  });

  describe('handleFallback', () => {
    const createFallbackRequest = (intentName: string = 'AMAZON.FallbackIntent', userId: string = 'test-user-123'): RequestEnvelope => ({
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
      request: {
        type: 'IntentRequest',
        requestId: 'test-request-123',
        timestamp: '2023-01-01T00:00:00Z',
        locale: 'en-US',
        dialogState: 'COMPLETED',
        intent: {
          name: intentName,
          confirmationStatus: 'NONE',
        },
      } as IntentRequest,
    });

    it('should handle fallback intent successfully with analytics logging', async () => {
      const request = createFallbackRequest();
      mockAnalyticsService.logFallbackEvent.mockResolvedValue();

      const response = await handler.handleFallback(request);

      expect(mockAnalyticsService.logFallbackEvent).toHaveBeenCalledWith('test-user-123', {
        intentName: 'AMAZON.FallbackIntent',
        timestamp: expect.any(Date),
      });

      expect(response.version).toBe('1.0');
      expect(response.response.shouldEndSession).toBe(false);
      expect(response.response.outputSpeech?.type).toBe('PlainText');
      const responseText = (response.response.outputSpeech as ui.PlainTextOutputSpeech)?.text;
      expect(responseText).toMatch(/not sure|didn't|understand|catch/i);
      expect((response.response.reprompt?.outputSpeech as ui.PlainTextOutputSpeech)?.text).toBe("What would you like to ask me?");
      expect(response.response.card?.type).toBe('Simple');
      expect((response.response.card as ui.SimpleCard)?.title).toBe('AI Chat - Help');
      expect((response.response.card as ui.SimpleCard)?.content).toContain('You can:');
    });

    it('should handle fallback without user ID gracefully', async () => {
      const request = createFallbackRequest();
      if (request.session) {
        request.session.user = undefined as any;
      }

      const response = await handler.handleFallback(request);

      expect(mockAnalyticsService.logFallbackEvent).not.toHaveBeenCalled();
      
      expect(response.version).toBe('1.0');
      expect(response.response.shouldEndSession).toBe(false);
      expect(response.response.outputSpeech?.type).toBe('PlainText');
      const responseText = (response.response.outputSpeech as ui.PlainTextOutputSpeech)?.text;
      expect(responseText).toMatch(/not sure|didn't|understand|catch/i);
    });

    it('should provide varied fallback messages', async () => {
      const request = createFallbackRequest();
      mockAnalyticsService.logFallbackEvent.mockResolvedValue();

      // Test multiple calls to ensure randomization works
      const responses = [];
      for (let i = 0; i < 10; i++) {
        const response = await handler.handleFallback(request);
        responses.push((response.response.outputSpeech as ui.PlainTextOutputSpeech)?.text);
      }

      // Should have some variety in responses (not all the same)
      const uniqueResponses = new Set(responses);
      expect(uniqueResponses.size).toBeGreaterThan(1);
      
      // All responses should contain helpful guidance
      responses.forEach(text => {
        expect(text).toMatch(/not sure|didn't|understand|catch/i);
        expect(text).toMatch(/ask|question|help/i);
      });
    });

    it('should handle analytics logging errors gracefully', async () => {
      const request = createFallbackRequest();
      const analyticsError = new Error('Analytics failed');
      mockAnalyticsService.logFallbackEvent.mockRejectedValue(analyticsError);

      // Mock console.error to verify it's called
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const response = await handler.handleFallback(request);

      // Should log the analytics error to console
      expect(consoleSpy).toHaveBeenCalledWith('Analytics logging failed in FallbackHandler:', analyticsError);

      // Should still provide a basic fallback response
      expect(response.version).toBe('1.0');

      consoleSpy.mockRestore();
      expect(response.response.shouldEndSession).toBe(false);
      
      // Should still provide one of the fallback messages
      const text = (response.response.outputSpeech as ui.PlainTextOutputSpeech)?.text;
      expect(text).toMatch(/not sure|didn't catch|didn't understand/i);
    });

    it('should handle help intent with proper guidance', async () => {
      const request = createFallbackRequest('AMAZON.HelpIntent');
      mockAnalyticsService.logFallbackEvent.mockResolvedValue();

      const response = await handler.handleFallback(request);

      expect(mockAnalyticsService.logFallbackEvent).toHaveBeenCalledWith('test-user-123', {
        intentName: 'AMAZON.HelpIntent',
        timestamp: expect.any(Date),
      });

      expect((response.response.card as ui.SimpleCard)?.content).toContain('You can:');
      expect((response.response.card as ui.SimpleCard)?.content).toContain('Ask me any question');
      expect((response.response.card as ui.SimpleCard)?.content).toContain('Have a conversation');
      expect((response.response.card as ui.SimpleCard)?.content).toContain('tell me about premium');
      expect((response.response.card as ui.SimpleCard)?.content).toContain('stop');
    });

    it('should handle unknown intent names', async () => {
      const request = createFallbackRequest('UnknownIntent');
      mockAnalyticsService.logFallbackEvent.mockResolvedValue();

      const response = await handler.handleFallback(request);

      expect(mockAnalyticsService.logFallbackEvent).toHaveBeenCalledWith('test-user-123', {
        intentName: 'UnknownIntent',
        timestamp: expect.any(Date),
      });

      expect(response.version).toBe('1.0');
      expect(response.response.shouldEndSession).toBe(false);
    });
  });

  describe('canHandle', () => {
    it('should handle AMAZON.FallbackIntent', () => {
      const request: RequestEnvelope = {
        version: '1.0',
        session: {
          new: false,
          sessionId: 'test-session',
          application: { applicationId: 'test-app' },
          user: { userId: 'test-user' },
        },
        context: {
          System: {
            application: { applicationId: 'test-app' },
            user: { userId: 'test-user' },
            device: { deviceId: 'test-device', supportedInterfaces: {} },
            apiEndpoint: 'https://api.amazonalexa.com',
            apiAccessToken: 'test-token',
          },
        },
        request: {
          type: 'IntentRequest',
          requestId: 'test-request',
          timestamp: '2023-01-01T00:00:00Z',
          locale: 'en-US',
          dialogState: 'COMPLETED',
          intent: { name: 'AMAZON.FallbackIntent', confirmationStatus: 'NONE' },
        } as IntentRequest,
      };

      expect(handler.canHandle(request)).toBe(true);
    });

    it('should handle AMAZON.HelpIntent', () => {
      const request: RequestEnvelope = {
        version: '1.0',
        session: {
          new: false,
          sessionId: 'test-session',
          application: { applicationId: 'test-app' },
          user: { userId: 'test-user' },
        },
        context: {
          System: {
            application: { applicationId: 'test-app' },
            user: { userId: 'test-user' },
            device: { deviceId: 'test-device', supportedInterfaces: {} },
            apiEndpoint: 'https://api.amazonalexa.com',
            apiAccessToken: 'test-token',
          },
        },
        request: {
          type: 'IntentRequest',
          requestId: 'test-request',
          timestamp: '2023-01-01T00:00:00Z',
          locale: 'en-US',
          dialogState: 'COMPLETED',
          intent: { name: 'AMAZON.HelpIntent', confirmationStatus: 'NONE' },
        } as IntentRequest,
      };

      expect(handler.canHandle(request)).toBe(true);
    });

    it('should not handle other intents', () => {
      const request: RequestEnvelope = {
        version: '1.0',
        session: {
          new: false,
          sessionId: 'test-session',
          application: { applicationId: 'test-app' },
          user: { userId: 'test-user' },
        },
        context: {
          System: {
            application: { applicationId: 'test-app' },
            user: { userId: 'test-user' },
            device: { deviceId: 'test-device', supportedInterfaces: {} },
            apiEndpoint: 'https://api.amazonalexa.com',
            apiAccessToken: 'test-token',
          },
        },
        request: {
          type: 'IntentRequest',
          requestId: 'test-request',
          timestamp: '2023-01-01T00:00:00Z',
          locale: 'en-US',
          dialogState: 'COMPLETED',
          intent: { name: 'ChatIntent', confirmationStatus: 'NONE' },
        } as IntentRequest,
      };

      expect(handler.canHandle(request)).toBe(false);
    });

    it('should not handle non-intent requests', () => {
      const request: RequestEnvelope = {
        version: '1.0',
        session: {
          new: false,
          sessionId: 'test-session',
          application: { applicationId: 'test-app' },
          user: { userId: 'test-user' },
        },
        context: {
          System: {
            application: { applicationId: 'test-app' },
            user: { userId: 'test-user' },
            device: { deviceId: 'test-device', supportedInterfaces: {} },
            apiEndpoint: 'https://api.amazonalexa.com',
            apiAccessToken: 'test-token',
          },
        },
        request: {
          type: 'LaunchRequest',
          requestId: 'test-request',
          timestamp: '2023-01-01T00:00:00Z',
          locale: 'en-US',
        },
      };

      expect(handler.canHandle(request)).toBe(false);
    });
  });
});