import { LoggingService, LogLevel, LogContext, PerformanceMetric, ErrorMetric } from '../services/LoggingService';
import { CloudWatchLogs } from 'aws-sdk';

// Mock AWS SDK
jest.mock('aws-sdk');

describe('LoggingService', () => {
  let loggingService: LoggingService;
  let mockCloudWatchLogs: jest.Mocked<CloudWatchLogs>;
  let consoleSpy: jest.SpyInstance;
  let consoleWarnSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    // Mock CloudWatchLogs
    mockCloudWatchLogs = {
      putLogEvents: jest.fn().mockReturnValue({
        promise: jest.fn().mockResolvedValue({})
      })
    } as any;

    (CloudWatchLogs as unknown as jest.Mock).mockImplementation(() => mockCloudWatchLogs);

    // Spy on console methods
    consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Set test environment
    process.env.NODE_ENV = 'test';
    process.env.LOG_LEVEL = 'DEBUG';

    loggingService = new LoggingService();
  });

  afterEach(() => {
    jest.clearAllMocks();
    consoleSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    delete process.env.LOG_LEVEL;
  });

  describe('constructor', () => {
    it('should initialize with correct default values', () => {
      expect(CloudWatchLogs).toHaveBeenCalledWith({ region: 'us-east-1' });
    });

    it('should use environment variables when available', () => {
      process.env.AWS_REGION = 'us-west-2';
      process.env.LOG_GROUP_NAME = '/custom/log/group';
      
      new LoggingService();
      
      expect(CloudWatchLogs).toHaveBeenCalledWith({ region: 'us-west-2' });
      
      // Clean up environment variables
      delete process.env.AWS_REGION;
      delete process.env.LOG_GROUP_NAME;
    });
  });

  describe('log level filtering', () => {
    it('should log debug messages when log level is DEBUG', () => {
      loggingService.debug('Test debug message');
      expect(consoleSpy).toHaveBeenCalled();
    });

    it('should not log debug messages when log level is INFO', () => {
      process.env.LOG_LEVEL = 'INFO';
      const service = new LoggingService();
      
      service.debug('Test debug message');
      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should always log error messages regardless of log level', () => {
      process.env.LOG_LEVEL = 'ERROR';
      const service = new LoggingService();
      
      service.error('Test error message');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('structured logging', () => {
    it('should format log messages with proper structure', () => {
      const context: LogContext = {
        userId: 'user123',
        sessionId: 'session456',
        intentName: 'ChatIntent'
      };

      loggingService.info('Test message', context);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"level":"INFO"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Test message"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"userId":"user123"')
      );
    });

    it('should include timestamp in log messages', () => {
      loggingService.info('Test message');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"timestamp":')
      );
    });

    it('should include environment in log messages', () => {
      loggingService.info('Test message');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"environment":"test"')
      );
    });
  });

  describe('error logging', () => {
    it('should log error with stack trace', () => {
      const error = new Error('Test error');
      const context: LogContext = { userId: 'user123' };

      loggingService.error('Operation failed', error, context);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('"name":"Error"')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Test error"')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('"stack":')
      );
    });

    it('should log error without Error object', () => {
      loggingService.error('Simple error message');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Simple error message"')
      );
    });
  });

  describe('performance metrics', () => {
    it('should log performance metrics correctly', () => {
      const metric: PerformanceMetric = {
        operation: 'API_CALL',
        duration: 150,
        success: true,
        context: { userId: 'user123' }
      };

      loggingService.logPerformanceMetric(metric);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Performance: API_CALL completed in 150ms')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"operation":"API_CALL"')
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"duration":150')
      );
    });

    it('should log failed operations as warnings', () => {
      const metric: PerformanceMetric = {
        operation: 'API_CALL',
        duration: 5000,
        success: false
      };

      loggingService.logPerformanceMetric(metric);

      expect(consoleWarnSpy).toHaveBeenCalled();
    });
  });

  describe('timer functionality', () => {
    it('should measure operation duration correctly', (done) => {
      const timer = loggingService.startTimer('TEST_OPERATION');

      setTimeout(() => {
        const endTimer = timer as (success?: boolean, context?: LogContext) => PerformanceMetric;
        const metric = endTimer(true, { userId: 'user123' });

        expect(metric.operation).toBe('TEST_OPERATION');
        expect(metric.duration).toBeGreaterThan(0);
        expect(metric.success).toBe(true);
        expect(metric.context?.userId).toBe('user123');
        done();
      }, 10);
    });
  });

  describe('error metrics', () => {
    it('should log error metrics with proper context', () => {
      const error = new Error('API timeout');
      const errorMetric: ErrorMetric = {
        error,
        operation: 'OPENROUTER_API_CALL',
        context: { userId: 'user123', requestId: 'req456' }
      };

      loggingService.logErrorMetric(errorMetric);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error in OPENROUTER_API_CALL: API timeout')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('"operation":"OPENROUTER_API_CALL"')
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('"errorType":"Error"')
      );
    });
  });

  describe('CloudWatch integration', () => {
    it('should send logs to CloudWatch successfully', async () => {
      // Create a fresh service instance to ensure clean state
      const freshService = new LoggingService();
      await freshService.logToCloudWatch('Test CloudWatch message', LogLevel.INFO);

      expect(mockCloudWatchLogs.putLogEvents).toHaveBeenCalledWith({
        logGroupName: '/aws/lambda/alexa-llm-chat',
        logStreamName: expect.any(String),
        logEvents: [{
          timestamp: expect.any(Number),
          message: expect.stringContaining('"message":"Test CloudWatch message"')
        }]
      });
    });

    it('should fallback to console logging when CloudWatch fails', async () => {
      mockCloudWatchLogs.putLogEvents.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('CloudWatch error'))
      } as any);

      await loggingService.logToCloudWatch('Test message', LogLevel.INFO);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to log to CloudWatch:',
        expect.any(Error)
      );
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('"message":"Test message"')
      );
    });

    it('should respect log level filtering for CloudWatch', async () => {
      process.env.LOG_LEVEL = 'ERROR';
      const service = new LoggingService();

      await service.logToCloudWatch('Debug message', LogLevel.DEBUG);

      expect(mockCloudWatchLogs.putLogEvents).not.toHaveBeenCalled();
    });
  });
});