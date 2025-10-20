import { DynamoDBClientManager, DynamoDBRetryHandler, DynamoDBOperations, DynamoDBError } from '../utils/DynamoDBClient';
import { DocumentClient } from 'aws-sdk/clients/dynamodb';

// Mock AWS SDK
jest.mock('aws-sdk', () => ({
  DynamoDB: {
    DocumentClient: jest.fn().mockImplementation(() => ({
      get: jest.fn(),
      put: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      query: jest.fn(),
      scan: jest.fn()
    }))
  }
}));

describe('DynamoDBClientManager', () => {
  beforeEach(() => {
    // Reset singleton instance
    (DynamoDBClientManager as any).instance = undefined;
  });

  it('should create singleton instance', () => {
    const instance1 = DynamoDBClientManager.getInstance();
    const instance2 = DynamoDBClientManager.getInstance();
    
    expect(instance1).toBe(instance2);
  });

  it('should use default configuration', () => {
    const instance = DynamoDBClientManager.getInstance();
    const client = instance.getDocumentClient();
    
    expect(client).toBeDefined();
  });

  it('should use custom configuration', () => {
    const config = {
      region: 'us-west-2',
      maxRetries: 5,
      endpoint: 'http://localhost:8000'
    };
    
    const instance = DynamoDBClientManager.getInstance(config);
    expect(instance).toBeDefined();
  });

  it('should perform health check successfully', async () => {
    const mockScan = jest.fn().mockReturnValue({
      promise: () => Promise.resolve({ Items: [] })
    });
    
    const mockDocumentClient = {
      scan: mockScan
    } as any;
    
    jest.spyOn(DynamoDBClientManager.prototype as any, 'createDocumentClient')
      .mockReturnValue(mockDocumentClient);
    
    const instance = DynamoDBClientManager.getInstance();
    const result = await instance.healthCheck();
    
    expect(result).toBe(true);
  });

  it('should handle health check with ResourceNotFoundException', async () => {
    const mockScan = jest.fn().mockReturnValue({
      promise: () => Promise.reject({ code: 'ResourceNotFoundException' })
    });
    
    const mockDocumentClient = {
      scan: mockScan
    } as any;
    
    jest.spyOn(DynamoDBClientManager.prototype as any, 'createDocumentClient')
      .mockReturnValue(mockDocumentClient);
    
    const instance = DynamoDBClientManager.getInstance();
    const result = await instance.healthCheck();
    
    expect(result).toBe(true);
  });
});

describe('DynamoDBRetryHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should execute operation successfully on first try', async () => {
    const mockOperation = jest.fn().mockResolvedValue('success');
    
    const result = await DynamoDBRetryHandler.executeWithRetry(mockOperation);
    
    expect(result).toBe('success');
    expect(mockOperation).toHaveBeenCalledTimes(1);
  });

  it('should retry on retryable errors', async () => {
    const mockOperation = jest.fn()
      .mockRejectedValueOnce({ code: 'ProvisionedThroughputExceededException', message: 'Throttled' })
      .mockResolvedValue('success');
    
    const result = await DynamoDBRetryHandler.executeWithRetry(mockOperation, { baseDelay: 1 });
    
    expect(result).toBe('success');
    expect(mockOperation).toHaveBeenCalledTimes(2);
  });

  it('should not retry on non-retryable errors', async () => {
    const mockOperation = jest.fn()
      .mockRejectedValue({ code: 'ValidationException', message: 'Invalid input' });
    
    await expect(DynamoDBRetryHandler.executeWithRetry(mockOperation))
      .rejects.toThrow(DynamoDBError);
    
    expect(mockOperation).toHaveBeenCalledTimes(1);
  });

  it('should fail after max retries', async () => {
    const mockOperation = jest.fn()
      .mockRejectedValue({ code: 'ProvisionedThroughputExceededException', message: 'Throttled' });
    
    await expect(DynamoDBRetryHandler.executeWithRetry(mockOperation, { 
      maxRetries: 2, 
      baseDelay: 1 
    })).rejects.toThrow('Operation failed after 3 attempts');
    
    expect(mockOperation).toHaveBeenCalledTimes(3);
  });

  it('should retry on 5xx status codes', async () => {
    const mockOperation = jest.fn()
      .mockRejectedValueOnce({ statusCode: 500, message: 'Internal Server Error' })
      .mockResolvedValue('success');
    
    const result = await DynamoDBRetryHandler.executeWithRetry(mockOperation, { baseDelay: 1 });
    
    expect(result).toBe('success');
    expect(mockOperation).toHaveBeenCalledTimes(2);
  });
});

describe('DynamoDBOperations', () => {
  let mockDocumentClient: jest.Mocked<DocumentClient>;
  let operations: DynamoDBOperations;

  beforeEach(() => {
    mockDocumentClient = {
      get: jest.fn(),
      put: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      query: jest.fn(),
      scan: jest.fn()
    } as any;

    operations = new DynamoDBOperations(mockDocumentClient);
  });

  it('should execute get operation', async () => {
    const mockResult = { Item: { id: '123' } };
    mockDocumentClient.get.mockReturnValue({
      promise: () => Promise.resolve(mockResult)
    } as any);

    const params = { TableName: 'test', Key: { id: '123' } };
    const result = await operations.get(params);

    expect(result).toEqual(mockResult);
    expect(mockDocumentClient.get).toHaveBeenCalledWith(params);
  });

  it('should execute put operation', async () => {
    const mockResult = {};
    mockDocumentClient.put.mockReturnValue({
      promise: () => Promise.resolve(mockResult)
    } as any);

    const params = { TableName: 'test', Item: { id: '123', data: 'test' } };
    const result = await operations.put(params);

    expect(result).toEqual(mockResult);
    expect(mockDocumentClient.put).toHaveBeenCalledWith(params);
  });

  it('should execute update operation', async () => {
    const mockResult = { Attributes: { id: '123', updated: true } };
    mockDocumentClient.update.mockReturnValue({
      promise: () => Promise.resolve(mockResult)
    } as any);

    const params = { 
      TableName: 'test', 
      Key: { id: '123' },
      UpdateExpression: 'SET updated = :val',
      ExpressionAttributeValues: { ':val': true }
    };
    const result = await operations.update(params);

    expect(result).toEqual(mockResult);
    expect(mockDocumentClient.update).toHaveBeenCalledWith(params);
  });

  it('should execute delete operation', async () => {
    const mockResult = {};
    mockDocumentClient.delete.mockReturnValue({
      promise: () => Promise.resolve(mockResult)
    } as any);

    const params = { TableName: 'test', Key: { id: '123' } };
    const result = await operations.delete(params);

    expect(result).toEqual(mockResult);
    expect(mockDocumentClient.delete).toHaveBeenCalledWith(params);
  });

  it('should execute query operation', async () => {
    const mockResult = { Items: [{ id: '123' }], Count: 1 };
    mockDocumentClient.query.mockReturnValue({
      promise: () => Promise.resolve(mockResult)
    } as any);

    const params = { 
      TableName: 'test',
      KeyConditionExpression: 'id = :id',
      ExpressionAttributeValues: { ':id': '123' }
    };
    const result = await operations.query(params);

    expect(result).toEqual(mockResult);
    expect(mockDocumentClient.query).toHaveBeenCalledWith(params);
  });

  it('should execute scan operation', async () => {
    const mockResult = { Items: [{ id: '123' }], Count: 1 };
    mockDocumentClient.scan.mockReturnValue({
      promise: () => Promise.resolve(mockResult)
    } as any);

    const params = { TableName: 'test' };
    const result = await operations.scan(params);

    expect(result).toEqual(mockResult);
    expect(mockDocumentClient.scan).toHaveBeenCalledWith(params);
  });
});

describe('DynamoDBError', () => {
  it('should create error with all properties', () => {
    const error = new DynamoDBError('Test error', 'TestCode', 400, true);
    
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TestCode');
    expect(error.statusCode).toBe(400);
    expect(error.retryable).toBe(true);
    expect(error.name).toBe('DynamoDBError');
  });

  it('should create error with minimal properties', () => {
    const error = new DynamoDBError('Test error', 'TestCode');
    
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TestCode');
    expect(error.statusCode).toBeUndefined();
    expect(error.retryable).toBe(false);
  });
});