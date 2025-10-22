import { SkillBuilders, RequestHandler, ErrorHandler as ASKErrorHandler, HandlerInput, getRequestType, getIntentName } from 'ask-sdk-core';
import { RequestEnvelope, ResponseEnvelope, Response } from 'ask-sdk-model';
import { Handler } from 'aws-lambda';

// Import middleware
import { 
  MiddlewarePipeline, 
  MiddlewareContext, 
  MiddlewareError, 
  createMiddlewareErrorResponse,
  LoggingMiddleware 
} from './middleware/RequestMiddleware';

// Import handlers
import { LaunchRequestHandler } from './handlers/LaunchRequestHandler';
import { ChatIntentHandler } from './handlers/ChatIntentHandler';
import { SubscriptionIntentHandler } from './handlers/SubscriptionIntentHandler';
import { StopIntentHandler } from './handlers/StopIntentHandler';
import { FallbackHandler } from './handlers/FallbackHandler';
import { ErrorHandler } from './handlers/ErrorHandler';

// Import services
import { SessionManager } from './services/SessionManager';
import { SubscriptionManager } from './services/SubscriptionManager';
import { OpenRouterLLMService } from './services/OpenRouterLLMService';
import { AnalyticsServiceImpl } from './services/AnalyticsService';
import { AlexaISPService } from './services/AlexaISPService';

// Import repositories
import { ConversationContextRepository } from './repositories/ConversationContextRepository';
import { SubscriptionStatusRepository } from './repositories/SubscriptionStatusRepository';

// Import utilities
import { DynamoDBClientManager } from './utils/DynamoDBClient';
import { AppConfig, getConfig } from './models/AppConfig';
import { logger, LogContext } from './services/LoggingService';

/**
 * Service container for dependency injection
 */
class ServiceContainer {
  private static instance: ServiceContainer;
  private services: Map<string, any> = new Map();
  private initialized = false;

  public static getInstance(): ServiceContainer {
    if (!ServiceContainer.instance) {
      ServiceContainer.instance = new ServiceContainer();
    }
    return ServiceContainer.instance;
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize configuration
      const config = getConfig();
      
      // Initialize DynamoDB client
      const dynamoClient = DynamoDBClientManager.getInstance();
      
      // Initialize repositories
      const conversationRepository = new ConversationContextRepository(
        dynamoClient.getDocumentClient(),
        {
          tableName: process.env.CONVERSATION_CONTEXT_TABLE || 'alexa-llm-conversation-contexts',
          ttlHours: 24
        }
      );
      
      const subscriptionRepository = new SubscriptionStatusRepository(
        dynamoClient.getDocumentClient(),
        {
          tableName: process.env.SUBSCRIPTION_STATUS_TABLE || 'alexa-llm-subscription-status',
          freeUserDailyLimit: config.freeUserDailyLimit
        }
      );

      // Initialize services
      const sessionManager = SessionManager.fromConfig(conversationRepository, config);
      
      const alexaISPService = new AlexaISPService({
        skillId: process.env.ALEXA_SKILL_ID || 'amzn1.ask.skill.test',
        stage: (process.env.ALEXA_STAGE as 'development' | 'live') || 'development',
        products: {
          premiumMonthly: process.env.PREMIUM_MONTHLY_PRODUCT_ID || 'premium_monthly'
        }
      });
      const subscriptionManager = new SubscriptionManager({
        subscriptionRepository,
        alexaISPService,
        enableISP: true
      });
      
      const llmService = new OpenRouterLLMService();
      const analyticsService = new AnalyticsServiceImpl();

      // Store services in container
      this.services.set('sessionManager', sessionManager);
      this.services.set('subscriptionManager', subscriptionManager);
      this.services.set('llmService', llmService);
      this.services.set('analyticsService', analyticsService);
      this.services.set('alexaISPService', alexaISPService);

      // Validate LLM service configuration
      const isLLMConfigValid = await llmService.validateApiConfiguration();
      if (!isLLMConfigValid) {
        logger.warn('LLM service configuration validation failed - service may not work properly');
      }

      this.initialized = true;
      logger.info('Service container initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize service container', error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  public getService<T>(serviceName: string): T {
    const service = this.services.get(serviceName);
    if (!service) {
      throw new Error(`Service '${serviceName}' not found in container`);
    }
    return service as T;
  }
}

/**
 * ASK SDK Request Handler wrapper for LaunchRequestHandler
 */
class LaunchRequestHandlerWrapper implements RequestHandler {
  private handler: LaunchRequestHandler;

  constructor(serviceContainer: ServiceContainer) {
    this.handler = new LaunchRequestHandler(
      serviceContainer.getService('sessionManager'),
      serviceContainer.getService('subscriptionManager'),
      serviceContainer.getService('analyticsService')
    );
  }

  canHandle(handlerInput: HandlerInput): boolean {
    return this.handler.canHandle(handlerInput.requestEnvelope);
  }

  async handle(handlerInput: HandlerInput): Promise<Response> {
    const responseEnvelope = await this.handler.handleLaunchRequest(handlerInput.requestEnvelope);
    return responseEnvelope.response;
  }
}

/**
 * ASK SDK Request Handler wrapper for ChatIntentHandler
 */
class ChatIntentHandlerWrapper implements RequestHandler {
  private handler: ChatIntentHandler;

  constructor(serviceContainer: ServiceContainer) {
    this.handler = new ChatIntentHandler(
      serviceContainer.getService('sessionManager'),
      serviceContainer.getService('subscriptionManager'),
      serviceContainer.getService('llmService'),
      serviceContainer.getService('analyticsService')
    );
  }

  canHandle(handlerInput: HandlerInput): boolean {
    return this.handler.canHandle(handlerInput.requestEnvelope);
  }

  async handle(handlerInput: HandlerInput): Promise<Response> {
    const responseEnvelope = await this.handler.handleChatIntent(handlerInput.requestEnvelope);
    return responseEnvelope.response;
  }
}

/**
 * ASK SDK Request Handler wrapper for SubscriptionIntentHandler
 */
class SubscriptionIntentHandlerWrapper implements RequestHandler {
  private handler: SubscriptionIntentHandler;

  constructor(serviceContainer: ServiceContainer) {
    this.handler = new SubscriptionIntentHandler(
      serviceContainer.getService('subscriptionManager'),
      serviceContainer.getService('analyticsService')
    );
  }

  canHandle(handlerInput: HandlerInput): boolean {
    return this.handler.canHandle(handlerInput.requestEnvelope);
  }

  async handle(handlerInput: HandlerInput): Promise<Response> {
    const responseEnvelope = await this.handler.handleSubscriptionIntent(handlerInput.requestEnvelope);
    return responseEnvelope.response;
  }
}

/**
 * ASK SDK Request Handler wrapper for StopIntentHandler
 */
class StopIntentHandlerWrapper implements RequestHandler {
  private handler: StopIntentHandler;

  constructor(serviceContainer: ServiceContainer) {
    this.handler = new StopIntentHandler(
      serviceContainer.getService('sessionManager'),
      serviceContainer.getService('analyticsService')
    );
  }

  canHandle(handlerInput: HandlerInput): boolean {
    return this.handler.canHandle(handlerInput.requestEnvelope);
  }

  async handle(handlerInput: HandlerInput): Promise<Response> {
    const responseEnvelope = await this.handler.handleStopIntent(handlerInput.requestEnvelope);
    return responseEnvelope.response;
  }
}

/**
 * ASK SDK Request Handler wrapper for FallbackHandler
 */
class FallbackHandlerWrapper implements RequestHandler {
  private handler: FallbackHandler;

  constructor(serviceContainer: ServiceContainer) {
    this.handler = new FallbackHandler(
      serviceContainer.getService('analyticsService')
    );
  }

  canHandle(handlerInput: HandlerInput): boolean {
    return this.handler.canHandle(handlerInput.requestEnvelope);
  }

  async handle(handlerInput: HandlerInput): Promise<Response> {
    const responseEnvelope = await this.handler.handleFallback(handlerInput.requestEnvelope);
    return responseEnvelope.response;
  }
}

/**
 * ASK SDK Error Handler wrapper for ErrorHandler
 */
class ErrorHandlerWrapper implements ASKErrorHandler {
  private handler: ErrorHandler;

  constructor(serviceContainer: ServiceContainer) {
    this.handler = new ErrorHandler(
      serviceContainer.getService('analyticsService')
    );
  }

  canHandle(handlerInput: HandlerInput, error: Error): boolean {
    return this.handler.canHandle(handlerInput, error);
  }

  async handle(handlerInput: HandlerInput, error: Error): Promise<Response> {
    const responseEnvelope = await this.handler.handle(handlerInput, error);
    return responseEnvelope.response;
  }
}

/**
 * Initialize services and create skill builder
 */
async function createSkillBuilder() {
  const serviceContainer = ServiceContainer.getInstance();
  await serviceContainer.initialize();

  return SkillBuilders.custom()
    .addRequestHandlers(
      new LaunchRequestHandlerWrapper(serviceContainer),
      new ChatIntentHandlerWrapper(serviceContainer),
      new SubscriptionIntentHandlerWrapper(serviceContainer),
      new StopIntentHandlerWrapper(serviceContainer),
      new FallbackHandlerWrapper(serviceContainer)
    )
    .addErrorHandlers(
      new ErrorHandlerWrapper(serviceContainer)
    );
}

/**
 * Process request through middleware pipeline
 */
async function processRequestWithMiddleware(
  requestEnvelope: RequestEnvelope,
  serviceContainer: ServiceContainer
): Promise<{ context: MiddlewareContext; isValid: boolean }> {
  const analyticsService = serviceContainer.getService('analyticsService');
  const middlewarePipeline = MiddlewarePipeline.createStandard(analyticsService as any);
  
  const context = await middlewarePipeline.execute(requestEnvelope);
  
  // Check if request passed validation
  const isValid = context.validationErrors.length === 0 && context.isAuthenticated;
  
  return { context, isValid };
}

/**
 * Main Lambda handler for Alexa LLM Chat skill
 * Implements proper request routing, global error handling, and logging
 */
export const handler: Handler = async (event, context) => {
  let middlewareContext: MiddlewareContext | undefined;
  let serviceContainer: ServiceContainer | undefined;
  
  try {
    // Initialize service container
    serviceContainer = ServiceContainer.getInstance();
    await serviceContainer.initialize();
    
    // Process request through middleware pipeline
    const { context: mwContext, isValid } = await processRequestWithMiddleware(
      event as RequestEnvelope, 
      serviceContainer
    );
    middlewareContext = mwContext;
    
    // Check if request passed middleware validation
    if (!isValid) {
      logger.warn('Request failed middleware validation', {
        userId: middlewareContext.userId,
        sessionId: middlewareContext.sessionId,
        requestId: middlewareContext.requestId,
        validationErrors: middlewareContext.validationErrors
      });
      return createMiddlewareErrorResponse(middlewareContext);
    }
    
    // Log incoming request for debugging (after middleware processing)
    const requestLogContext: LogContext = {
      userId: middlewareContext.userId,
      sessionId: middlewareContext.sessionId,
      requestId: middlewareContext.requestId,
      requestType: middlewareContext.requestEnvelope.request.type,
      intentName: middlewareContext.requestEnvelope.request.type === 'IntentRequest' 
        ? (middlewareContext.requestEnvelope.request as any).intent?.name 
        : undefined,
      isAuthenticated: middlewareContext.isAuthenticated
    };
    
    logger.info('Processing validated Alexa request', requestLogContext);
    
    // Create skill builder with initialized services
    const skillBuilder = await createSkillBuilder();
    const skill = skillBuilder.lambda();
    
    // Process the request through ASK SDK
    const response = await skill(event, context, () => {});
    
    // Log response through middleware
    if (middlewareContext && serviceContainer) {
      try {
        const analyticsService = serviceContainer.getService('analyticsService') as any;
        const loggingMiddleware = new LoggingMiddleware(analyticsService);
        const responseEnvelope: ResponseEnvelope = {
          version: '1.0',
          response: response as any
        };
        const responseMiddleware = loggingMiddleware.logResponse(responseEnvelope);
        await responseMiddleware(middlewareContext, async () => {});
      } catch (loggingError) {
        logger.error('Response logging failed', loggingError instanceof Error ? loggingError : new Error(String(loggingError)));
      }
    }
    
    // Log outgoing response for debugging
    const responseLogContext: LogContext = {
      ...requestLogContext,
      responseType: (response as any)?.outputSpeech?.type,
      shouldEndSession: (response as any)?.shouldEndSession,
      hasCard: !!(response as any)?.card,
      hasReprompt: !!(response as any)?.reprompt,
      processingTime: middlewareContext ? Date.now() - middlewareContext.processingStartTime : undefined
    };
    
    logger.info('Outgoing Alexa response', responseLogContext);
    
    return response;
  } catch (error) {
    // Log error with context if available
    if (middlewareContext?.userId && serviceContainer) {
      try {
        const analyticsService = serviceContainer.getService('analyticsService') as any;
        await analyticsService.logError(error as Error, {
          userId: middlewareContext.userId,
          errorType: 'LambdaHandler',
          timestamp: new Date(),
          additionalData: {
            requestId: middlewareContext.requestId,
            sessionId: middlewareContext.sessionId,
            processingTime: Date.now() - middlewareContext.processingStartTime
          }
        });
      } catch (analyticsError) {
        logger.error('Failed to log error to analytics', analyticsError instanceof Error ? analyticsError : new Error(String(analyticsError)));
      }
    }
    
    // Global error handling - this should rarely be reached due to ErrorHandler
    logger.error('Critical error in Lambda handler', error instanceof Error ? error : new Error(String(error)), {
      requestId: middlewareContext?.requestId,
      sessionId: middlewareContext?.sessionId,
      userId: middlewareContext?.userId
    });
    
    // Return appropriate error response
    if (middlewareContext) {
      return createMiddlewareErrorResponse(middlewareContext, error as Error);
    }
    
    // Fallback error response when no middleware context is available
    return {
      version: '1.0',
      response: {
        outputSpeech: {
          type: 'PlainText',
          text: 'I\'m sorry, I\'m experiencing technical difficulties. Please try again later.'
        },
        card: {
          type: 'Simple',
          title: 'Technical Error',
          content: 'Please try your request again. If the problem persists, try again later.'
        },
        shouldEndSession: true
      }
    };
  }
};