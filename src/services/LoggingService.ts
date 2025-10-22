import { CloudWatchLogs } from 'aws-sdk';

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

export interface LogContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  intentName?: string;
  userTier?: string;
  [key: string]: any;
}

export interface PerformanceMetric {
  operation: string;
  duration: number;
  success: boolean;
  context?: LogContext;
}

export interface ErrorMetric {
  error: Error;
  operation: string;
  context?: LogContext;
}

export class LoggingService {
  private cloudWatchLogs: CloudWatchLogs;
  private logGroupName: string;
  private logStreamName: string;
  private environment: string;
  private minLogLevel: LogLevel;

  constructor() {
    this.cloudWatchLogs = new CloudWatchLogs({ region: process.env.AWS_REGION || 'us-east-1' });
    this.logGroupName = process.env.LOG_GROUP_NAME || '/aws/lambda/alexa-llm-chat';
    this.logStreamName = this.generateLogStreamName();
    this.environment = process.env.NODE_ENV || 'development';
    this.minLogLevel = this.getMinLogLevel();
  }

  private generateLogStreamName(): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const randomId = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${randomId}`;
  }

  private getMinLogLevel(): LogLevel {
    const envLogLevel = process.env.LOG_LEVEL?.toUpperCase() as LogLevel;
    return envLogLevel || (this.environment === 'production' ? LogLevel.INFO : LogLevel.DEBUG);
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(this.minLogLevel);
    const messageLevelIndex = levels.indexOf(level);
    return messageLevelIndex >= currentLevelIndex;
  }

  private formatLogMessage(level: LogLevel, message: string, context?: LogContext): string {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      environment: this.environment,
      context: context || {}
    };
    return JSON.stringify(logEntry);
  }

  public debug(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.log(this.formatLogMessage(LogLevel.DEBUG, message, context));
    }
  }

  public info(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.log(this.formatLogMessage(LogLevel.INFO, message, context));
    }
  }

  public warn(message: string, context?: LogContext): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatLogMessage(LogLevel.WARN, message, context));
    }
  }

  public error(message: string, error?: Error, context?: LogContext): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      const errorContext = {
        ...context,
        error: error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : undefined
      };
      console.error(this.formatLogMessage(LogLevel.ERROR, message, errorContext));
    }
  }

  public logPerformanceMetric(metric: PerformanceMetric): void {
    const message = `Performance: ${metric.operation} completed in ${metric.duration}ms`;
    const context = {
      ...metric.context,
      performance: {
        operation: metric.operation,
        duration: metric.duration,
        success: metric.success
      }
    };
    
    if (metric.success) {
      this.info(message, context);
    } else {
      this.warn(message, context);
    }
  }

  public logErrorMetric(errorMetric: ErrorMetric): void {
    const message = `Error in ${errorMetric.operation}: ${errorMetric.error.message}`;
    const context = {
      ...errorMetric.context,
      errorMetric: {
        operation: errorMetric.operation,
        errorType: errorMetric.error.name
      }
    };
    
    this.error(message, errorMetric.error, context);
  }

  public startTimer(operation: string): () => PerformanceMetric {
    const startTime = Date.now();
    
    return (success: boolean = true, context?: LogContext): PerformanceMetric => {
      const duration = Date.now() - startTime;
      const metric: PerformanceMetric = {
        operation,
        duration,
        success,
        context
      };
      
      this.logPerformanceMetric(metric);
      return metric;
    };
  }

  public async logToCloudWatch(message: string, level: LogLevel = LogLevel.INFO): Promise<void> {
    if (!this.shouldLog(level)) {
      return;
    }

    try {
      const params = {
        logGroupName: this.logGroupName,
        logStreamName: this.logStreamName,
        logEvents: [{
          timestamp: Date.now(),
          message: this.formatLogMessage(level, message)
        }]
      };

      await this.cloudWatchLogs.putLogEvents(params).promise();
    } catch (error) {
      // Fallback to console logging if CloudWatch fails
      console.error('Failed to log to CloudWatch:', error);
      console.log(this.formatLogMessage(level, message));
    }
  }
}

// Singleton instance
export const logger = new LoggingService();