import { StopIntentHandler } from '../handlers/StopIntentHandler';
import { SessionManager } from '../interfaces/SessionManager';
import { AnalyticsService } from '../interfaces/AnalyticsService';
import { RequestEnvelope, ResponseEnvelope, IntentRequest, ui } from 'ask-sdk-model';

// Mock dependencies
const mockSessionManager: jest.Mocked<SessionManager> = {
  getConversationContext: jest.fn(),
  updateConversationContext: jest.fn(),
  clearConversationContext: jest.fn(),
  truncateContextIfNeeded: jest.fn(),
  shouldEndSession: jest.fn(),
};

const mockAnalyticsService: jest.Mocked<AnalyticsService> = {
  logConversation: jest.fn(),
  logSubscriptionEvent: jest.fn(),
  logError: jest.fn(),
  logSkillLaunch: jest.fn(),
  logUsageLimitEvent: jest.fn(),
  logSessionEnd: jest.fn(),
  logFallbackEvent: jest.fn(),
};

describe('StopIntentHandler', () => {
  let handler: StopIntentHandler;

  beforeEach(() => {
    handler = new StopIntentHandler(mockSessionManager, mockAnalyticsService);
    jest.clearAllMocks();
  });

  describe('handleStopIntent', () => {
    const createStopRequest = (userId: string = 'test-user-123'): RequestEnvelope => ({
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
          name: 'AMAZON.StopIntent',
          confirmationStatus: 'NONE',
        },
      } as IntentRequest,
    });

    it('should handle stop intent successfully with conversation cleanup', async () => {
      const request = createStopRequest();
      mockSessionManager.clearConversationContext.mockResolvedValue();
      mockAnalyticsService.logSessionEnd.mockResolvedValue();

      const response = await handler.handleStopIntent(request);

      expect(mockSessionManager.clearConversationContext).toHaveBeenCalledWith('test-user-123');
      expect(mockAnalyticsService.logSessionEnd).toHaveBeenCalledWith('test-user-123', 'user_initiated');
      
      expect(response.version).toBe('1.0');
      expect(response.response.shouldEndSession).toBe(true);
      expect(response.response.outputSpeech?.type).toBe('PlainText');
      const responseText = (response.response.outputSpeech as ui.PlainTextOutputSpeech)?.text;
      expect(responseText).toMatch(/goodbye|see you|thanks|have a/i);
      expect(response.response.card?.type).toBe('Simple');
      expect((response.response.card as ui.SimpleCard)?.title).toBe('AI Chat - Goodbye');
    });

    it('should handle stop intent without user ID gracefully', async () => {
      const request = createStopRequest();
      if (request.session) {
        request.session.user = undefined as any;
      }

      const response = await handler.handleStopIntent(request);

      expect(mockSessionManager.clearConversationContext).not.toHaveBeenCalled();
      expect(mockAnalyticsService.logSessionEnd).not.toHaveBeenCalled();
      
      expect(response.version).toBe('1.0');
      expect(response.response.shouldEndSession).toBe(true);
      expect(response.response.outputSpeech?.type).toBe('PlainText');
      const responseText = (response.response.outputSpeech as ui.PlainTextOutputSpeech)?.text;
      expect(responseText).toMatch(/goodbye|see you|thanks|have a/i);
    });

    it('should handle cleanup errors gracefully and still end session', async () => {
      const request = createStopRequest();
      const cleanupError = new Error('Cleanup failed');
      mockSessionManager.clearConversationContext.mockRejectedValue(cleanupError);
      mockAnalyticsService.logError.mockResolvedValue();

      const response = await handler.handleStopIntent(request);

      expect(mockAnalyticsService.logError).toHaveBeenCalledWith(cleanupError, {
        userId: 'test-user-123',
        errorType: 'StopIntentHandler',
        timestamp: expect.any(Date),
        additionalData: { handler: 'StopIntentHandler' }
      });
      
      expect(response.version).toBe('1.0');
      expect(response.response.shouldEndSession).toBe(true);
      expect(response.response.outputSpeech?.type).toBe('PlainText');
      expect((response.response.outputSpeech as ui.PlainTextOutputSpeech)?.text).toBe('Goodbye! Thanks for using AI Chat.');
    });

    it('should provide varied goodbye messages', async () => {
      const request = createStopRequest();
      mockSessionManager.clearConversationContext.mockResolvedValue();
      mockAnalyticsService.logSessionEnd.mockResolvedValue();

      // Test multiple calls to ensure randomization works
      const responses = [];
      for (let i = 0; i < 10; i++) {
        const response = await handler.handleStopIntent(request);
        responses.push((response.response.outputSpeech as ui.PlainTextOutputSpeech)?.text);
      }

      // Should have some variety in responses (not all the same)
      const uniqueResponses = new Set(responses);
      expect(uniqueResponses.size).toBeGreaterThan(1);
      
      // All responses should contain goodbye-related content
      responses.forEach(text => {
        expect(text).toMatch(/goodbye|see you|thanks|have a/i);
      });
    });
  });

  describe('canHandle', () => {
    it('should handle AMAZON.StopIntent', () => {
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
          intent: { name: 'AMAZON.StopIntent', confirmationStatus: 'NONE' },
        } as IntentRequest,
      };

      expect(handler.canHandle(request)).toBe(true);
    });

    it('should handle AMAZON.CancelIntent', () => {
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
          intent: { name: 'AMAZON.CancelIntent', confirmationStatus: 'NONE' },
        } as IntentRequest,
      };

      expect(handler.canHandle(request)).toBe(true);
    });

    it('should handle ExitIntent', () => {
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
          intent: { name: 'ExitIntent', confirmationStatus: 'NONE' },
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