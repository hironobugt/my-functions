import { LLMService, ModelConfig } from '../interfaces/LLMService';
import { ConversationContext, ChatMessage } from '../models/ConversationContext';
import { UserTier } from '../models/SubscriptionStatus';
import { AppConfig, getConfig } from '../models/AppConfig';
import { logger, LogContext } from './LoggingService';

/**
 * OpenRouter API response interface
 */
interface OpenRouterResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * OpenRouter API error response
 */
interface OpenRouterError {
  error: {
    message: string;
    type: string;
    code?: string;
  };
}

/**
 * Custom error class for LLM service errors
 */
export class LLMServiceError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorType?: string,
    public originalError?: any,
    public isRetryable: boolean = false
  ) {
    super(message);
    this.name = 'LLMServiceError';
  }
}

/**
 * Error types for different API scenarios
 */
export enum ApiErrorType {
  AUTHENTICATION = 'authentication_error',
  RATE_LIMIT = 'rate_limit_error',
  TIMEOUT = 'timeout_error',
  NETWORK = 'network_error',
  SERVER = 'server_error',
  VALIDATION = 'validation_error',
  QUOTA_EXCEEDED = 'quota_exceeded',
  MODEL_UNAVAILABLE = 'model_unavailable',
  CONTENT_FILTER = 'content_filter_error',
  UNKNOWN = 'unknown_error'
}

/**
 * Retry configuration for different error types
 */
interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableErrors: Set<number>;
}

/**
 * OpenRouter LLM Service implementation
 */
export class OpenRouterLLMService implements LLMService {
  private config: AppConfig;
  private baseUrl: string;
  private apiKey: string;
  private retryConfig: RetryConfig;

  constructor() {
    this.config = getConfig();
    this.baseUrl = this.config.openRouterBaseUrl;
    this.apiKey = this.config.openRouterApiKey;
    
    // Configure retry behavior for different error scenarios
    this.retryConfig = {
      maxRetries: 2,
      baseDelayMs: 500,
      maxDelayMs: 2000,
      retryableErrors: new Set([429, 500, 502, 503, 504]), // Rate limit and server errors
    };
  }

  /**
   * Generate response from LLM based on user input and context
   */
  async generateResponse(
    prompt: string,
    context: ConversationContext | null,
    userTier: UserTier
  ): Promise<string> {
    const timer = logger.startTimer('OPENROUTER_GENERATE_RESPONSE');
    const logContext: LogContext = {
      userId: context?.userId,
      sessionId: context?.sessionId,
      userTier,
      promptLength: prompt.length,
      contextMessageCount: context?.messages?.length || 0
    };

    logger.info('Starting LLM response generation', logContext);

    try {
      const modelConfig = this.getModelConfig(userTier);
      const messages = this.formatMessagesForApi(prompt, context, userTier);

      const requestBody = {
        model: modelConfig.model,
        messages,
        max_tokens: modelConfig.maxTokens,
        temperature: modelConfig.temperature,
        top_p: modelConfig.topP,
      };

      logger.debug('Making OpenRouter API request', {
        ...logContext,
        model: modelConfig.model,
        messageCount: messages.length,
        maxTokens: modelConfig.maxTokens
      });

      const response = await this.makeApiRequest('/chat/completions', requestBody);
      
      if (!response.choices || response.choices.length === 0) {
        throw new LLMServiceError('No response choices returned from API');
      }

      const assistantMessage = response.choices[0].message;
      if (!assistantMessage || !assistantMessage.content) {
        throw new LLMServiceError('Invalid response format from API');
      }

      const responseContent = assistantMessage.content.trim();
      const metric = timer(true, {
        ...logContext,
        responseLength: responseContent.length,
        tokensUsed: response.usage?.total_tokens,
        finishReason: response.choices[0].finish_reason
      });

      logger.info('LLM response generated successfully', {
        ...logContext,
        responseLength: responseContent.length,
        tokensUsed: response.usage?.total_tokens,
        duration: metric.duration
      });

      return responseContent;
    } catch (error) {
      timer(false, logContext);
      
      logger.logErrorMetric({
        error: error instanceof Error ? error : new Error(String(error)),
        operation: 'OPENROUTER_GENERATE_RESPONSE',
        context: logContext
      });

      if (error instanceof LLMServiceError) {
        throw error;
      }
      throw new LLMServiceError(
        'Failed to generate response from LLM',
        undefined,
        'generation_error',
        error
      );
    }
  }

  /**
   * Validate API configuration and connectivity
   */
  async validateApiConfiguration(): Promise<boolean> {
    const timer = logger.startTimer('OPENROUTER_VALIDATE_CONFIG');
    
    logger.info('Validating OpenRouter API configuration');

    try {
      // Test with a simple request to validate API key and connectivity
      const testMessages = [
        { role: 'user', content: 'Hello' }
      ];

      const requestBody = {
        model: this.config.freeUserModel,
        messages: testMessages,
        max_tokens: 10,
        temperature: 0.1,
      };

      await this.makeApiRequest('/chat/completions', requestBody);
      
      timer(true);
      logger.info('API configuration validation successful');
      return true;
    } catch (error) {
      timer(false);
      logger.logErrorMetric({
        error: error instanceof Error ? error : new Error(String(error)),
        operation: 'OPENROUTER_VALIDATE_CONFIG'
      });
      return false;
    }
  }

  /**
   * Handle API errors and return user-friendly messages with fallback responses
   */
  handleApiError(error: any): string {
    if (error instanceof LLMServiceError) {
      // Handle by error type first for more specific messages
      switch (error.errorType) {
        case ApiErrorType.AUTHENTICATION:
          return "I'm having trouble with my authentication. Please try again later.";
        
        case ApiErrorType.RATE_LIMIT:
          return "I'm receiving too many requests right now. Please try again in a moment.";
        
        case ApiErrorType.TIMEOUT:
          return "I'm taking too long to respond. Please try asking a shorter question.";
        
        case ApiErrorType.QUOTA_EXCEEDED:
          return "I've reached my usage limit for now. Please try again later or consider upgrading for unlimited access.";
        
        case ApiErrorType.MODEL_UNAVAILABLE:
          return "The AI model I'm trying to use is currently unavailable. Please try again in a few minutes.";
        
        case ApiErrorType.CONTENT_FILTER:
          return "I can't respond to that request due to content policy restrictions. Please try rephrasing your question.";
        
        case ApiErrorType.VALIDATION:
          return "There was an issue with your request. Please try rephrasing your question.";
        
        case ApiErrorType.SERVER:
          return "The AI service is temporarily unavailable. Please try again in a few minutes.";
        
        case ApiErrorType.NETWORK:
          return "I'm having trouble connecting to the AI service. Please check your connection and try again.";
        
        default:
          // Fall back to status code handling for unknown error types
          return this.getStatusCodeErrorMessage(error.statusCode);
      }
    }

    // Handle timeout errors from other sources
    if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
      return "I'm taking too long to respond. Please try asking a shorter question.";
    }

    // Handle network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return "I'm having trouble connecting to the AI service. Please try again later.";
    }

    // Generic error fallback
    return "I'm having trouble processing your request right now. Please try again.";
  }

  /**
   * Get error message based on HTTP status code
   */
  private getStatusCodeErrorMessage(statusCode?: number): string {
    switch (statusCode) {
      case 400:
        return "There was an issue with your request. Please try rephrasing your question.";
      case 401:
        return "I'm having trouble with my authentication. Please try again later.";
      case 403:
        return "I don't have permission to access the AI service right now. Please try again later.";
      case 404:
        return "The AI service I'm trying to reach is not available. Please try again later.";
      case 429:
        return "I'm receiving too many requests right now. Please try again in a moment.";
      case 500:
      case 502:
      case 503:
      case 504:
        return "The AI service is temporarily unavailable. Please try again in a few minutes.";
      default:
        return "I'm experiencing technical difficulties. Please try again later.";
    }
  }

  /**
   * Get fallback response when all else fails
   */
  public getFallbackResponse(): string {
    const fallbackResponses = [
      "I'm sorry, I'm having technical difficulties right now. Please try again in a moment.",
      "I'm experiencing some issues connecting to my AI service. Please try again shortly.",
      "Something went wrong on my end. Please try asking your question again.",
      "I'm temporarily unable to process your request. Please try again in a few minutes.",
    ];
    
    // Return a random fallback response to add variety
    const randomIndex = Math.floor(Math.random() * fallbackResponses.length);
    return fallbackResponses[randomIndex];
  }

  /**
   * Check if API is currently available
   */
  async isApiAvailable(): Promise<boolean> {
    const timer = logger.startTimer('OPENROUTER_AVAILABILITY_CHECK');
    
    logger.debug('Checking OpenRouter API availability');

    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000), // 5 second timeout for availability check
      });

      const isAvailable = response.ok;
      timer(isAvailable);
      
      if (isAvailable) {
        logger.debug('OpenRouter API is available');
      } else {
        logger.warn('OpenRouter API availability check failed', {
          status: response.status,
          statusText: response.statusText
        });
      }

      return isAvailable;
    } catch (error) {
      timer(false);
      logger.logErrorMetric({
        error: error instanceof Error ? error : new Error(String(error)),
        operation: 'OPENROUTER_AVAILABILITY_CHECK'
      });
      return false;
    }
  }

  /**
   * Get appropriate model configuration for user tier
   */
  getModelConfig(userTier: UserTier): ModelConfig {
    const baseConfig = {
      temperature: 0.7,
      topP: 0.9,
    };

    if (userTier === 'premium') {
      return {
        ...baseConfig,
        model: this.config.premiumUserModel,
        maxTokens: 1000,
      };
    } else {
      return {
        ...baseConfig,
        model: this.config.freeUserModel,
        maxTokens: 500,
      };
    }
  }

  /**
   * Format messages for OpenRouter API request with context truncation
   */
  private formatMessagesForApi(
    prompt: string,
    context: ConversationContext | null,
    userTier: UserTier = 'free'
  ): Array<{ role: string; content: string }> {
    const messages: Array<{ role: string; content: string }> = [];
    const modelConfig = this.getModelConfig(userTier);
    
    // Calculate available tokens for context (reserve tokens for current prompt and response)
    const promptTokens = this.estimateTokenCount(prompt);
    const reservedTokens = promptTokens + modelConfig.maxTokens + 100; // 100 buffer tokens
    const availableContextTokens = this.config.maxContextTokens - reservedTokens;

    // Add context messages if available, with truncation
    if (context && context.messages.length > 0) {
      const truncatedMessages = this.truncateContextMessages(
        context.messages,
        availableContextTokens,
        userTier
      );
      
      for (const message of truncatedMessages) {
        messages.push({
          role: message.role,
          content: message.content,
        });
      }
    }

    // Add current user prompt
    messages.push({
      role: 'user',
      content: prompt,
    });

    return messages;
  }

  /**
   * Truncate context messages to fit within token limits
   */
  private truncateContextMessages(
    messages: ChatMessage[],
    maxTokens: number,
    userTier: UserTier
  ): ChatMessage[] {
    if (maxTokens <= 0) {
      return [];
    }

    // For premium users, keep more context
    const maxMessages = userTier === 'premium' ? 20 : 10;
    
    // Start from the most recent messages and work backwards
    const recentMessages = messages.slice(-maxMessages);
    const truncatedMessages: ChatMessage[] = [];
    let currentTokenCount = 0;

    // Add messages from most recent, checking token limits
    for (let i = recentMessages.length - 1; i >= 0; i--) {
      const message = recentMessages[i];
      const messageTokens = this.estimateTokenCount(message.content);
      
      if (currentTokenCount + messageTokens <= maxTokens) {
        truncatedMessages.unshift(message);
        currentTokenCount += messageTokens;
      } else {
        // If we can't fit the whole message, try to fit a truncated version
        const availableTokens = maxTokens - currentTokenCount;
        if (availableTokens > 50) { // Only truncate if we have reasonable space
          const truncatedContent = this.truncateMessageContent(
            message.content,
            availableTokens
          );
          if (truncatedContent) {
            truncatedMessages.unshift({
              ...message,
              content: truncatedContent,
            });
          }
        }
        break;
      }
    }

    return truncatedMessages;
  }

  /**
   * Truncate message content to fit within token limit
   */
  private truncateMessageContent(content: string, maxTokens: number): string | null {
    if (maxTokens < 50) {
      return null; // Not enough space for meaningful content
    }

    // Rough estimation: 1 token ≈ 4 characters for English text
    const maxChars = maxTokens * 3; // Conservative estimate
    
    if (content.length <= maxChars) {
      return content;
    }

    // Truncate and add ellipsis
    const truncated = content.substring(0, maxChars - 10);
    const lastSpace = truncated.lastIndexOf(' ');
    
    if (lastSpace > maxChars * 0.8) {
      return truncated.substring(0, lastSpace) + '...';
    }
    
    return truncated + '...';
  }

  /**
   * Estimate token count for text (rough approximation)
   */
  private estimateTokenCount(text: string): number {
    if (!text) return 0;
    
    // Rough estimation based on OpenAI's tokenization:
    // - 1 token ≈ 4 characters for English text
    // - Punctuation and special characters may use more tokens
    // - This is a conservative estimate to avoid exceeding limits
    
    const charCount = text.length;
    const wordCount = text.split(/\s+/).length;
    
    // Use the higher of character-based or word-based estimation
    const charBasedTokens = Math.ceil(charCount / 3.5);
    const wordBasedTokens = Math.ceil(wordCount * 1.3);
    
    return Math.max(charBasedTokens, wordBasedTokens);
  }

  /**
   * Calculate total token count for a conversation context
   */
  public calculateContextTokenCount(context: ConversationContext): number {
    if (!context || !context.messages) {
      return 0;
    }

    return context.messages.reduce((total, message) => {
      return total + this.estimateTokenCount(message.content);
    }, 0);
  }

  /**
   * Check if context needs truncation for given user tier
   */
  public shouldTruncateContext(
    context: ConversationContext,
    userTier: UserTier,
    additionalPromptTokens: number = 0
  ): boolean {
    const contextTokens = this.calculateContextTokenCount(context);
    const modelConfig = this.getModelConfig(userTier);
    const totalTokens = contextTokens + additionalPromptTokens + modelConfig.maxTokens;
    
    return totalTokens > this.config.maxContextTokens;
  }

  /**
   * Make HTTP request to OpenRouter API with retry logic and comprehensive error handling
   */
  private async makeApiRequest(endpoint: string, body: any): Promise<OpenRouterResponse> {
    return this.makeApiRequestWithRetry(endpoint, body, 0);
  }

  /**
   * Make API request with retry logic for transient failures
   */
  private async makeApiRequestWithRetry(
    endpoint: string, 
    body: any, 
    attempt: number
  ): Promise<OpenRouterResponse> {
    const url = `${this.baseUrl}${endpoint}`;
    const isLastAttempt = attempt >= this.retryConfig.maxRetries;
    
    // Calculate timeout with buffer for retries
    const timeoutMs = isLastAttempt 
      ? this.config.responseTimeoutMs 
      : Math.max(this.config.responseTimeoutMs - (attempt * 1000), 3000);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://alexa-llm-chat.example.com',
          'X-Title': 'Alexa LLM Chat',
          'X-Retry-Attempt': attempt.toString(),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await this.handleHttpError(response);
        
        // Check if we should retry this error
        if (!isLastAttempt && this.shouldRetryError(response.status)) {
          const delay = this.calculateRetryDelay(attempt);
          await this.sleep(delay);
          return this.makeApiRequestWithRetry(endpoint, body, attempt + 1);
        }
        
        throw error;
      }

      const data = await response.json();
      this.validateApiResponse(data);
      return data as OpenRouterResponse;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof LLMServiceError) {
        // Check if we should retry this error type
        if (!isLastAttempt && error.isRetryable) {
          const delay = this.calculateRetryDelay(attempt);
          await this.sleep(delay);
          return this.makeApiRequestWithRetry(endpoint, body, attempt + 1);
        }
        throw error;
      }
      
      // Handle timeout errors
      if (error instanceof Error && error.name === 'AbortError') {
        const timeoutError = new LLMServiceError(
          `Request timeout after ${timeoutMs}ms`,
          408,
          ApiErrorType.TIMEOUT,
          error,
          !isLastAttempt // Retry timeouts unless it's the last attempt
        );
        
        if (!isLastAttempt) {
          const delay = this.calculateRetryDelay(attempt);
          await this.sleep(delay);
          return this.makeApiRequestWithRetry(endpoint, body, attempt + 1);
        }
        
        throw timeoutError;
      }

      // Handle network errors
      const networkError = new LLMServiceError(
        'Network request failed',
        undefined,
        ApiErrorType.NETWORK,
        error,
        !isLastAttempt // Retry network errors unless it's the last attempt
      );
      
      if (!isLastAttempt) {
        const delay = this.calculateRetryDelay(attempt);
        await this.sleep(delay);
        return this.makeApiRequestWithRetry(endpoint, body, attempt + 1);
      }
      
      throw networkError;
    }
  }

  /**
   * Determine if an HTTP status code should trigger a retry
   */
  private shouldRetryError(statusCode: number): boolean {
    return this.retryConfig.retryableErrors.has(statusCode);
  }

  /**
   * Calculate exponential backoff delay for retries
   */
  private calculateRetryDelay(attempt: number): number {
    const exponentialDelay = this.retryConfig.baseDelayMs * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * exponentialDelay; // Add 10% jitter
    return Math.min(exponentialDelay + jitter, this.retryConfig.maxDelayMs);
  }

  /**
   * Sleep for specified milliseconds
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Validate API response structure
   */
  private validateApiResponse(data: any): void {
    if (!data) {
      throw new LLMServiceError(
        'Empty response from API',
        undefined,
        ApiErrorType.VALIDATION
      );
    }

    if (!data.choices || !Array.isArray(data.choices)) {
      throw new LLMServiceError(
        'Invalid response format: missing choices array',
        undefined,
        ApiErrorType.VALIDATION
      );
    }

    if (data.choices.length === 0) {
      throw new LLMServiceError(
        'No response choices returned from API',
        undefined,
        ApiErrorType.VALIDATION
      );
    }

    const choice = data.choices[0];
    if (!choice.message || typeof choice.message.content !== 'string') {
      throw new LLMServiceError(
        'Invalid response format: missing or invalid message content',
        undefined,
        ApiErrorType.VALIDATION
      );
    }
  }

  /**
   * Handle HTTP error responses with comprehensive error classification
   */
  private async handleHttpError(response: Response): Promise<never> {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    let errorType = ApiErrorType.UNKNOWN;
    let isRetryable = false;

    // Classify error based on status code
    switch (response.status) {
      case 400:
        errorType = ApiErrorType.VALIDATION;
        errorMessage = 'Invalid request format or parameters';
        break;
      case 401:
        errorType = ApiErrorType.AUTHENTICATION;
        errorMessage = 'Authentication failed - invalid API key';
        break;
      case 403:
        errorType = ApiErrorType.QUOTA_EXCEEDED;
        errorMessage = 'Access forbidden - quota exceeded or insufficient permissions';
        break;
      case 404:
        errorType = ApiErrorType.MODEL_UNAVAILABLE;
        errorMessage = 'Requested model not found or unavailable';
        break;
      case 429:
        errorType = ApiErrorType.RATE_LIMIT;
        errorMessage = 'Rate limit exceeded';
        isRetryable = true;
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        errorType = ApiErrorType.SERVER;
        errorMessage = 'Server error - service temporarily unavailable';
        isRetryable = true;
        break;
      default:
        errorType = ApiErrorType.UNKNOWN;
        break;
    }

    // Try to get more specific error information from response body
    try {
      const errorData = await response.json() as OpenRouterError;
      if (errorData.error) {
        if (errorData.error.message) {
          errorMessage = errorData.error.message;
        }
        
        // Refine error type based on API response
        if (errorData.error.type) {
          switch (errorData.error.type) {
            case 'insufficient_quota':
            case 'quota_exceeded':
              errorType = ApiErrorType.QUOTA_EXCEEDED;
              break;
            case 'rate_limit_exceeded':
              errorType = ApiErrorType.RATE_LIMIT;
              isRetryable = true;
              break;
            case 'model_not_found':
            case 'model_unavailable':
              errorType = ApiErrorType.MODEL_UNAVAILABLE;
              break;
            case 'content_filter':
              errorType = ApiErrorType.CONTENT_FILTER;
              errorMessage = 'Content was filtered due to policy violations';
              break;
            case 'authentication_error':
              errorType = ApiErrorType.AUTHENTICATION;
              break;
            case 'validation_error':
              errorType = ApiErrorType.VALIDATION;
              break;
          }
        }
      }
    } catch (parseError) {
      // If we can't parse the error response, use the classified error from status code
      console.warn('Failed to parse error response:', parseError);
    }

    throw new LLMServiceError(
      errorMessage,
      response.status,
      errorType,
      undefined,
      isRetryable
    );
  }
}