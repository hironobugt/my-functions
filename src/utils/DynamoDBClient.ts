import { DynamoDB } from 'aws-sdk';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

export interface DynamoDBConfig {
  region?: string;
  endpoint?: string;
  maxRetries?: number;
  retryDelayOptions?: {
    base?: number;
    customBackoff?: (retryCount: number) => number;
  };
}

export class DynamoDBClientManager {
  private static instance: DynamoDBClientManager;
  private documentClient: DocumentClient;
  private config: DynamoDBConfig;

  private constructor(config: DynamoDBConfig = {}) {
    this.config = {
      region: config.region || process.env.AWS_REGION || 'us-east-1',
      maxRetries: config.maxRetries || 3,
      retryDelayOptions: {
        base: 300,
        ...config.retryDelayOptions
      },
      ...config
    };

    this.documentClient = this.createDocumentClient();
  }

  public static getInstance(config?: DynamoDBConfig): DynamoDBClientManager {
    if (!DynamoDBClientManager.instance) {
      DynamoDBClientManager.instance = new DynamoDBClientManager(config);
    }
    return DynamoDBClientManager.instance;
  }

  private createDocumentClient(): DocumentClient {
    const dynamoConfig: DynamoDB.ClientConfiguration = {
      region: this.config.region,
      maxRetries: this.config.maxRetries,
      retryDelayOptions: this.config.retryDelayOptions
    };

    // Add endpoint for local development
    if (this.config.endpoint) {
      dynamoConfig.endpoint = this.config.endpoint;
    }

    return new DocumentClient(dynamoConfig);
  }

  public getDocumentClient(): DocumentClient {
    return this.documentClient;
  }

  public async healthCheck(): Promise<boolean> {
    try {
      // Simple operation to test connection
      await this.documentClient.scan({
        TableName: 'test-connection',
        Limit: 1
      }).promise();
      return true;
    } catch (error: any) {
      // If table doesn't exist, that's still a valid connection
      if (error.code === 'ResourceNotFoundException') {
        return true;
      }
      return false;
    }
  }
}

export interface RetryOptions {
  maxRetries?: number;
  baseDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
}

export class DynamoDBError extends Error {
  public readonly code: string;
  public readonly statusCode?: number;
  public readonly retryable: boolean;

  constructor(message: string, code: string, statusCode?: number, retryable: boolean = false) {
    super(message);
    this.name = 'DynamoDBError';
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
  }
}

export class DynamoDBRetryHandler {
  private static readonly RETRYABLE_ERRORS = [
    'ProvisionedThroughputExceededException',
    'ThrottlingException',
    'ServiceUnavailable',
    'InternalServerError',
    'RequestLimitExceeded'
  ];

  public static async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      baseDelay = 100,
      maxDelay = 5000,
      backoffMultiplier = 2
    } = options;

    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error: any) {
        lastError = error;

        // Don't retry on the last attempt
        if (attempt === maxRetries) {
          break;
        }

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          throw new DynamoDBError(
            error.message || 'Unknown error',
            error.code || 'UnknownError',
            error.statusCode,
            false
          );
        }

        // Calculate delay with exponential backoff
        const delay = Math.min(
          baseDelay * Math.pow(backoffMultiplier, attempt),
          maxDelay
        );

        // Add jitter to prevent thundering herd
        const jitteredDelay = delay + Math.random() * delay * 0.1;

        await this.sleep(jitteredDelay);
      }
    }

    // If we get here, all retries failed
    throw new DynamoDBError(
      `Operation failed after ${maxRetries + 1} attempts: ${lastError?.message || 'Unknown error'}`,
      lastError?.code || 'MaxRetriesExceeded',
      lastError?.statusCode,
      false
    );
  }

  private static isRetryableError(error: any): boolean {
    // Check for retryable error codes
    if (error.code && this.RETRYABLE_ERRORS.includes(error.code)) {
      return true;
    }

    // Check for 5xx status codes
    if (error.statusCode && error.statusCode >= 500) {
      return true;
    }

    return false;
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export class DynamoDBOperations {
  private documentClient: DocumentClient;
  private retryOptions: RetryOptions;

  constructor(documentClient: DocumentClient, retryOptions: RetryOptions = {}) {
    this.documentClient = documentClient;
    this.retryOptions = retryOptions;
  }

  public async get(params: DocumentClient.GetItemInput): Promise<DocumentClient.GetItemOutput> {
    return DynamoDBRetryHandler.executeWithRetry(
      () => this.documentClient.get(params).promise(),
      this.retryOptions
    );
  }

  public async put(params: DocumentClient.PutItemInput): Promise<DocumentClient.PutItemOutput> {
    return DynamoDBRetryHandler.executeWithRetry(
      () => this.documentClient.put(params).promise(),
      this.retryOptions
    );
  }

  public async update(params: DocumentClient.UpdateItemInput): Promise<DocumentClient.UpdateItemOutput> {
    return DynamoDBRetryHandler.executeWithRetry(
      () => this.documentClient.update(params).promise(),
      this.retryOptions
    );
  }

  public async delete(params: DocumentClient.DeleteItemInput): Promise<DocumentClient.DeleteItemOutput> {
    return DynamoDBRetryHandler.executeWithRetry(
      () => this.documentClient.delete(params).promise(),
      this.retryOptions
    );
  }

  public async query(params: DocumentClient.QueryInput): Promise<DocumentClient.QueryOutput> {
    return DynamoDBRetryHandler.executeWithRetry(
      () => this.documentClient.query(params).promise(),
      this.retryOptions
    );
  }

  public async scan(params: DocumentClient.ScanInput): Promise<DocumentClient.ScanOutput> {
    return DynamoDBRetryHandler.executeWithRetry(
      () => this.documentClient.scan(params).promise(),
      this.retryOptions
    );
  }
}