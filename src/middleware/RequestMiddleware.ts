import { RequestEnvelope, ResponseEnvelope } from 'ask-sdk-model';
import { AnalyticsService } from '../interfaces/AnalyticsService';

/**
 * Middleware context for request processing
 */
export interface MiddlewareContext {
  requestEnvelope: RequestEnvelope;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  timestamp: Date;
  processingStartTime: number;
  validationErrors: string[];
  sanitizedInput?: string;
  isAuthenticated: boolean;
  metadata: Record<string, any>;
}

/**
 * Middleware function type
 */
export type MiddlewareFunction = (
  context: MiddlewareContext,
  next: () => Promise<void>
) => Promise<void>;

/**
 * Request validation middleware
 * Validates incoming Alexa requests for required fields and proper structure
 */
export class RequestValidationMiddleware {
  /**
   * Validate request structure and required fields
   */
  static validate(): MiddlewareFunction {
    return async (context: MiddlewareContext, next: () => Promise<void>) => {
      const { requestEnvelope } = context;
      
      try {
        // Validate basic request structure
        if (!requestEnvelope) {
          context.validationErrors.push('Missing request envelope');
          return;
        }

        if (!requestEnvelope.version) {
          context.validationErrors.push('Missing request version');
        }

        if (!requestEnvelope.request) {
          context.validationErrors.push('Missing request object');
          return;
        }

        if (!requestEnvelope.request.type) {
          context.validationErrors.push('Missing request type');
        }

        if (!requestEnvelope.request.requestId) {
          context.validationErrors.push('Missing request ID');
        } else {
          context.requestId = requestEnvelope.request.requestId;
        }

        // Validate session information
        if (requestEnvelope.session) {
          if (!requestEnvelope.session.sessionId) {
            context.validationErrors.push('Missing session ID');
          } else {
            context.sessionId = requestEnvelope.session.sessionId;
          }

          if (!requestEnvelope.session.user?.userId) {
            context.validationErrors.push('Missing user ID');
          } else {
            context.userId = requestEnvelope.session.user.userId;
          }
        }

        // Validate intent-specific fields
        if (requestEnvelope.request.type === 'IntentRequest') {
          const intentRequest = requestEnvelope.request as any;
          
          if (!intentRequest.intent) {
            context.validationErrors.push('Missing intent object');
          } else if (!intentRequest.intent.name) {
            context.validationErrors.push('Missing intent name');
          }
        }

        // Validate application ID if present
        if (requestEnvelope.session?.application?.applicationId) {
          const expectedAppId = process.env.ALEXA_SKILL_ID;
          if (expectedAppId && requestEnvelope.session.application.applicationId !== expectedAppId) {
            context.validationErrors.push('Invalid application ID');
          }
        }

        // Continue to next middleware if validation passes
        if (context.validationErrors.length === 0) {
          await next();
        }
      } catch (error) {
        context.validationErrors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
  }
}

/**
 * Input sanitization middleware
 * Sanitizes user input to prevent injection attacks and normalize data
 */
export class InputSanitizationMiddleware {
  /**
   * Sanitize user input from slots and other sources
   */
  static sanitize(): MiddlewareFunction {
    return async (context: MiddlewareContext, next: () => Promise<void>) => {
      const { requestEnvelope } = context;
      
      try {
        // Sanitize intent slots if present
        if (requestEnvelope.request.type === 'IntentRequest') {
          const intentRequest = requestEnvelope.request as any;
          
          if (intentRequest.intent?.slots) {
            for (const [slotName, slot] of Object.entries(intentRequest.intent.slots)) {
              const slotValue = (slot as any)?.value;
              if (typeof slotValue === 'string') {
                // Sanitize the slot value
                const sanitized = this.sanitizeString(slotValue);
                (slot as any).value = sanitized;
                
                // Store sanitized input for logging
                if (slotName === 'question' || slotName === 'Query') {
                  context.sanitizedInput = sanitized;
                }
              }
            }
          }
        }

        await next();
      } catch (error) {
        context.validationErrors.push(`Sanitization error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };
  }

  /**
   * Sanitize a string input
   */
  private static sanitizeString(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // Remove potentially dangerous characters and normalize whitespace
    return input
      .replace(/[<>\"'&]/g, '') // Remove HTML/XML characters
      .replace(/\s+/g, ' ')      // Normalize whitespace
      .trim()                    // Remove leading/trailing whitespace
      .substring(0, 1000);       // Limit length to prevent abuse
  }
}

/**
 * Authentication and session verification middleware
 * Verifies request authenticity and session validity
 */
export class AuthenticationMiddleware {
  /**
   * Verify request authentication and session
   */
  static authenticate(): MiddlewareFunction {
    return async (context: MiddlewareContext, next: () => Promise<void>) => {
      const { requestEnvelope } = context;
      
      try {
        // Basic authentication checks
        context.isAuthenticated = true; // Default to authenticated

        // Verify timestamp to prevent replay attacks
        if (requestEnvelope.request.timestamp) {
          const requestTime = new Date(requestEnvelope.request.timestamp);
          const now = new Date();
          const timeDiff = Math.abs(now.getTime() - requestTime.getTime());
          
          // Allow up to 150 seconds difference (Alexa's requirement is 150s)
          if (timeDiff > 150000) {
            context.validationErrors.push('Request timestamp too old');
            context.isAuthenticated = false;
          }
        }

        // Verify session consistency
        if (requestEnvelope.session) {
          // Check if session is new vs continuing
          const isNewSession = requestEnvelope.session.new;
          const requestType = requestEnvelope.request.type;
          
          // LaunchRequest should have new session
          if (requestType === 'LaunchRequest' && !isNewSession) {
            console.warn('LaunchRequest with continuing session - possible session inconsistency');
          }
          
          // IntentRequest should typically have continuing session (unless it's the first intent)
          if (requestType === 'IntentRequest' && isNewSession) {
            const intentName = (requestEnvelope.request as any).intent?.name;
            if (intentName && !['AMAZON.HelpIntent', 'AMAZON.StopIntent', 'AMAZON.CancelIntent'].includes(intentName)) {
              console.warn('IntentRequest with new session - possible session restart');
            }
          }
        }

        // Verify application ID if configured
        const expectedAppId = process.env.ALEXA_SKILL_ID;
        if (expectedAppId && requestEnvelope.session?.application?.applicationId !== expectedAppId) {
          context.validationErrors.push('Application ID mismatch');
          context.isAuthenticated = false;
        }

        // Store authentication metadata
        context.metadata.authenticationChecked = true;
        context.metadata.isNewSession = requestEnvelope.session?.new || false;
        context.metadata.applicationId = requestEnvelope.session?.application?.applicationId;

        await next();
      } catch (error) {
        context.validationErrors.push(`Authentication error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        context.isAuthenticated = false;
      }
    };
  }
}

/**
 * Request/Response logging middleware
 * Logs requests and responses for debugging and monitoring
 */
export class LoggingMiddleware {
  constructor(private analyticsService: AnalyticsService) {}

  /**
   * Log request details
   */
  logRequest(): MiddlewareFunction {
    return async (context: MiddlewareContext, next: () => Promise<void>) => {
      const { requestEnvelope, userId, sessionId, requestId } = context;
      
      try {
        // Log request details (don't let logging failures break the request)
        const requestLog = {
          timestamp: context.timestamp,
          userId: userId || 'unknown',
          sessionId: sessionId || 'unknown',
          requestId: requestId || 'unknown',
          requestType: requestEnvelope.request.type,
          intentName: requestEnvelope.request.type === 'IntentRequest' 
            ? (requestEnvelope.request as any).intent?.name 
            : undefined,
          isNewSession: requestEnvelope.session?.new || false,
          locale: requestEnvelope.request.locale,
          sanitizedInput: context.sanitizedInput,
          processingStartTime: context.processingStartTime
        };

        console.log('Request received:', JSON.stringify(requestLog, null, 2));

        // Store request metadata for response logging
        context.metadata.requestLog = requestLog;

        await next();
      } catch (error) {
        console.error('Request logging failed:', error);
        // Continue processing even if logging fails
        await next();
      }
    };
  }

  /**
   * Log response details
   */
  logResponse(response: ResponseEnvelope): MiddlewareFunction {
    return async (context: MiddlewareContext, next: () => Promise<void>) => {
      try {
        const processingTime = Date.now() - context.processingStartTime;
        
        const responseLog = {
          timestamp: new Date(),
          userId: context.userId || 'unknown',
          sessionId: context.sessionId || 'unknown',
          requestId: context.requestId || 'unknown',
          processingTimeMs: processingTime,
          responseType: response.response.outputSpeech?.type,
          shouldEndSession: response.response.shouldEndSession,
          hasCard: !!response.response.card,
          hasReprompt: !!response.response.reprompt,
          validationErrors: context.validationErrors,
          isAuthenticated: context.isAuthenticated
        };

        console.log('Response sent:', JSON.stringify(responseLog, null, 2));

        // Log to analytics service if available
        if (context.userId && context.validationErrors.length === 0) {
          try {
            await this.analyticsService.logConversation(
              context.userId,
              'free', // Default tier - this should be determined from subscription service
              processingTime,
              context.sanitizedInput?.length || 0,
              response.response.outputSpeech?.type === 'PlainText' 
                ? (response.response.outputSpeech as any).text?.length || 0 
                : 0
            );
          } catch (analyticsError) {
            console.error('Analytics logging failed:', analyticsError);
          }
        }

        await next();
      } catch (error) {
        console.error('Response logging failed:', error);
        await next();
      }
    };
  }
}

/**
 * Middleware pipeline for processing requests
 */
export class MiddlewarePipeline {
  private middlewares: MiddlewareFunction[] = [];

  /**
   * Add middleware to the pipeline
   */
  use(middleware: MiddlewareFunction): this {
    this.middlewares.push(middleware);
    return this;
  }

  /**
   * Execute the middleware pipeline
   */
  async execute(requestEnvelope: RequestEnvelope): Promise<MiddlewareContext> {
    const context: MiddlewareContext = {
      requestEnvelope,
      timestamp: new Date(),
      processingStartTime: Date.now(),
      validationErrors: [],
      isAuthenticated: false,
      metadata: {}
    };

    let currentIndex = 0;

    const next = async (): Promise<void> => {
      if (currentIndex < this.middlewares.length) {
        const middleware = this.middlewares[currentIndex++];
        await middleware(context, next);
      }
    };

    await next();
    return context;
  }

  /**
   * Create a standard middleware pipeline
   */
  static createStandard(analyticsService: AnalyticsService): MiddlewarePipeline {
    const loggingMiddleware = new LoggingMiddleware(analyticsService);
    
    return new MiddlewarePipeline()
      .use(RequestValidationMiddleware.validate())
      .use(InputSanitizationMiddleware.sanitize())
      .use(AuthenticationMiddleware.authenticate())
      .use(loggingMiddleware.logRequest());
  }
}

/**
 * Middleware error for validation and processing failures
 */
export class MiddlewareError extends Error {
  constructor(
    message: string,
    public validationErrors: string[] = [],
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'MiddlewareError';
  }
}

/**
 * Create error response for middleware failures
 */
export function createMiddlewareErrorResponse(
  context: MiddlewareContext,
  error?: Error
): ResponseEnvelope {
  let errorMessage = 'I\'m sorry, there was an issue processing your request.';
  
  if (context.validationErrors.length > 0) {
    // Don't expose validation details to users, but log them
    console.error('Request validation errors:', context.validationErrors);
    
    if (context.validationErrors.some(err => err.includes('authentication') || err.includes('Application ID'))) {
      errorMessage = 'I\'m having trouble verifying your request. Please try again.';
    } else if (context.validationErrors.some(err => err.includes('timestamp'))) {
      errorMessage = 'Your request seems to be outdated. Please try again.';
    }
  }

  if (error) {
    console.error('Middleware processing error:', error);
  }

  return {
    version: '1.0',
    response: {
      outputSpeech: {
        type: 'PlainText',
        text: errorMessage
      },
      card: {
        type: 'Simple',
        title: 'Request Error',
        content: 'Please try your request again.'
      },
      shouldEndSession: false
    }
  };
}