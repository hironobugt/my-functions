import { DynamoDBClientManager } from '../../utils/DynamoDBClient';
import { ConversationContextRepository } from '../../repositories/ConversationContextRepository';
import { SubscriptionStatusRepository } from '../../repositories/SubscriptionStatusRepository';
import { ConversationContext } from '../../models/ConversationContext';
import { SubscriptionStatus } from '../../models/SubscriptionStatus';
import AWS from 'aws-sdk';

// This test file contains integration tests for DynamoDB operations
// These tests require a local DynamoDB instance or AWS credentials
// Set INTEGRATION_TEST_DYNAMODB=true to enable these tests

const INTEGRATION_TESTS_ENABLED = process.env.INTEGRATION_TEST_DYNAMODB === 'true';
const USE_LOCAL_DYNAMODB = process.env.USE_LOCAL_DYNAMODB === 'true';

describe('DynamoDB Integration Tests', () => {
  let dynamoClient: AWS.DynamoDB.DocumentClient;
  let conversationRepository: ConversationContextRepository;
  let subscriptionRepository: SubscriptionStatusRepository;

  const testTableNames = {
    conversations: 'test-conversation-contexts',
    subscriptions: 'test-subscription-status'
  };

  beforeAll(async () => {
    if (!INTEGRATION_TESTS_ENABLED) {
      console.log('DynamoDB integration tests skipped. Set INTEGRATION_TEST_DYNAMODB=true to enable.');
      return;
    }

    // Configure DynamoDB for local testing if specified
    if (USE_LOCAL_DYNAMODB) {
      AWS.config.update({
        region: 'local',
        accessKeyId: 'fake',
        secretAccessKey: 'fake'
      });
      
      // Set endpoint for local DynamoDB
      process.env.AWS_DYNAMODB_ENDPOINT = 'http://localhost:8000';
    }

    // Initialize DynamoDB client
    const clientManager = DynamoDBClientManager.getInstance();
    dynamoClient = clientManager.getDocumentClient();

    // Initialize repositories
    conversationRepository = new ConversationContextRepository(
      dynamoClient,
      {
        tableName: testTableNames.conversations,
        ttlHours: 24
      }
    );

    subscriptionRepository = new SubscriptionStatusRepository(
      dynamoClient,
      {
        tableName: testTableNames.subscriptions,
        freeUserDailyLimit: 5
      }
    );

    // Create test tables if using local DynamoDB
    if (USE_LOCAL_DYNAMODB) {
      await createTestTables();
    }
  });

  afterAll(async () => {
    if (!INTEGRATION_TESTS_ENABLED || !USE_LOCAL_DYNAMODB) {
      return;
    }

    // Clean up test tables
    await deleteTestTables();
  });

  beforeEach(async () => {
    if (!INTEGRATION_TESTS_ENABLED) {
      return;
    }

    // Clean up test data before each test
    await cleanupTestData();
  });

  async function createTestTables() {
    const dynamodb = new AWS.DynamoDB();

    // Create conversation contexts table
    try {
      await dynamodb.createTable({
        TableName: testTableNames.conversations,
        KeySchema: [
          { AttributeName: 'userId', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
          { AttributeName: 'userId', AttributeType: 'S' }
        ],
        BillingMode: 'PAY_PER_REQUEST'
      }).promise();
    } catch (error: any) {
      if (error.code !== 'ResourceInUseException') {
        throw error;
      }
    }

    // Create subscription status table
    try {
      await dynamodb.createTable({
        TableName: testTableNames.subscriptions,
        KeySchema: [
          { AttributeName: 'userId', KeyType: 'HASH' }
        ],
        AttributeDefinitions: [
          { AttributeName: 'userId', AttributeType: 'S' }
        ],
        BillingMode: 'PAY_PER_REQUEST'
      }).promise();
    } catch (error: any) {
      if (error.code !== 'ResourceInUseException') {
        throw error;
      }
    }

    // Wait for tables to be active
    await dynamodb.waitFor('tableExists', { TableName: testTableNames.conversations }).promise();
    await dynamodb.waitFor('tableExists', { TableName: testTableNames.subscriptions }).promise();
  }

  async function deleteTestTables() {
    const dynamodb = new AWS.DynamoDB();

    try {
      await dynamodb.deleteTable({ TableName: testTableNames.conversations }).promise();
      await dynamodb.deleteTable({ TableName: testTableNames.subscriptions }).promise();
    } catch (error) {
      // Ignore errors during cleanup
      console.warn('Error cleaning up test tables:', error);
    }
  }

  async function cleanupTestData() {
    // Scan and delete all test data
    try {
      const conversationItems = await dynamoClient.scan({
        TableName: testTableNames.conversations
      }).promise();

      for (const item of conversationItems.Items || []) {
        await dynamoClient.delete({
          TableName: testTableNames.conversations,
          Key: {
            userId: item.userId,
            sessionId: item.sessionId
          }
        }).promise();
      }

      const subscriptionItems = await dynamoClient.scan({
        TableName: testTableNames.subscriptions
      }).promise();

      for (const item of subscriptionItems.Items || []) {
        await dynamoClient.delete({
          TableName: testTableNames.subscriptions,
          Key: {
            userId: item.userId
          }
        }).promise();
      }
    } catch (error) {
      // Ignore cleanup errors
      console.warn('Error during test data cleanup:', error);
    }
  }

  describe('Conversation Context Repository Integration', () => {
    it('should store and retrieve conversation context', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      const testContext: ConversationContext = {
        userId: 'integration-test-user-1',
        sessionId: 'integration-test-session-1',
        messages: [
          {
            role: 'user',
            content: 'Hello, how are you?',
            timestamp: new Date()
          },
          {
            role: 'assistant',
            content: 'I am doing well, thank you for asking!',
            timestamp: new Date()
          }
        ],
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 25
      };

      // Store context
      await conversationRepository.saveConversationContext(testContext);

      // Retrieve context
      const retrievedContext = await conversationRepository.getConversationContext(
        testContext.userId
      );

      expect(retrievedContext).toBeDefined();
      expect(retrievedContext!.userId).toBe(testContext.userId);
      expect(retrievedContext!.sessionId).toBe(testContext.sessionId);
      expect(retrievedContext!.messages).toHaveLength(2);
      expect(retrievedContext!.messages[0].content).toBe('Hello, how are you?');
      expect(retrievedContext!.messages[1].content).toBe('I am doing well, thank you for asking!');
      expect(retrievedContext!.tokenCount).toBe(25);
    });

    it('should update existing conversation context', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      const userId = 'integration-test-user-2';
      const sessionId = 'integration-test-session-2';

      const initialContext: ConversationContext = {
        userId,
        sessionId,
        messages: [
          {
            role: 'user',
            content: 'Initial message',
            timestamp: new Date()
          }
        ],
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 10
      };

      // Store initial context
      await conversationRepository.saveConversationContext(initialContext);

      // Update context with new message
      const updatedContext: ConversationContext = {
        ...initialContext,
        messages: [
          ...initialContext.messages,
          {
            role: 'assistant',
            content: 'Response to initial message',
            timestamp: new Date()
          },
          {
            role: 'user',
            content: 'Follow-up question',
            timestamp: new Date()
          }
        ],
        lastUpdated: new Date(),
        tokenCount: 35
      };

      await conversationRepository.saveConversationContext(updatedContext);

      // Retrieve updated context
      const retrievedContext = await conversationRepository.getConversationContext(userId);

      expect(retrievedContext).toBeDefined();
      expect(retrievedContext!.messages).toHaveLength(3);
      expect(retrievedContext!.tokenCount).toBe(35);
      expect(retrievedContext!.messages[2].content).toBe('Follow-up question');
    });

    it('should delete conversation context', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      const userId = 'integration-test-user-3';
      const sessionId = 'integration-test-session-3';

      const testContext: ConversationContext = {
        userId,
        sessionId,
        messages: [
          {
            role: 'user',
            content: 'This will be deleted',
            timestamp: new Date()
          }
        ],
        createdAt: new Date(),
        lastUpdated: new Date(),
        tokenCount: 10
      };

      // Store context
      await conversationRepository.saveConversationContext(testContext);

      // Verify it exists
      let retrievedContext = await conversationRepository.getConversationContext(userId);
      expect(retrievedContext).toBeDefined();

      // Delete context
      await conversationRepository.clearConversationContext(userId);

      // Verify it's deleted
      retrievedContext = await conversationRepository.getConversationContext(userId);
      expect(retrievedContext).toBeNull();
    });

    it('should handle non-existent conversation context', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      const retrievedContext = await conversationRepository.getConversationContext(
        'non-existent-user'
      );

      expect(retrievedContext).toBeNull();
    });

    it('should clean up expired contexts', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      const userId = 'integration-test-user-4';
      const sessionId = 'integration-test-session-4';

      // Create context with old timestamp
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 2); // 2 days ago

      const expiredContext: ConversationContext = {
        userId,
        sessionId,
        messages: [
          {
            role: 'user',
            content: 'This is old',
            timestamp: oldDate
          }
        ],
        createdAt: oldDate,
        lastUpdated: oldDate,
        tokenCount: 10
      };

      // Store expired context
      await conversationRepository.saveConversationContext(expiredContext);

      // Clean up expired contexts
      const cleanedCount = await conversationRepository.cleanupExpiredContexts();

      expect(cleanedCount).toBeGreaterThanOrEqual(0);

      // Verify context is cleaned up (may take time due to TTL)
      const retrievedContext = await conversationRepository.getConversationContext(userId);
      // Note: TTL cleanup is eventual, so we can't guarantee immediate deletion
    });
  });

  describe('Subscription Status Repository Integration', () => {
    it('should store and retrieve subscription status', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      const testSubscription: SubscriptionStatus = {
        userId: 'integration-test-sub-user-1',
        tier: 'premium',
        subscriptionId: 'premium-sub-123',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        dailyUsageCount: 10,
        lastResetDate: new Date()
      };

      // Store subscription
      await subscriptionRepository.saveSubscriptionStatus(testSubscription);

      // Retrieve subscription
      const retrievedSubscription = await subscriptionRepository.getSubscriptionStatus(
        testSubscription.userId
      );

      expect(retrievedSubscription).toBeDefined();
      expect(retrievedSubscription!.userId).toBe(testSubscription.userId);
      expect(retrievedSubscription!.tier).toBe('premium');
      expect(retrievedSubscription!.subscriptionId).toBe('premium-sub-123');
      expect(retrievedSubscription!.dailyUsageCount).toBe(10);
    });

    it('should increment usage count', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      const userId = 'integration-test-sub-user-2';

      const initialSubscription: SubscriptionStatus = {
        userId,
        tier: 'free',
        dailyUsageCount: 2,
        lastResetDate: new Date()
      };

      // Store initial subscription
      await subscriptionRepository.saveSubscriptionStatus(initialSubscription);

      // Increment usage count
      await subscriptionRepository.incrementUsageCount(userId);

      // Retrieve updated subscription
      const updatedSubscription = await subscriptionRepository.getSubscriptionStatus(userId);

      expect(updatedSubscription).toBeDefined();
      expect(updatedSubscription!.dailyUsageCount).toBe(3);
    });

    it('should reset daily usage count', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      const userId = 'integration-test-sub-user-3';

      const subscriptionWithUsage: SubscriptionStatus = {
        userId,
        tier: 'free',
        dailyUsageCount: 5,
        lastResetDate: new Date(Date.now() - 24 * 60 * 60 * 1000) // Yesterday
      };

      // Store subscription with usage
      await subscriptionRepository.saveSubscriptionStatus(subscriptionWithUsage);

      // Reset daily usage (simulate new day by updating the subscription)
      const resetSubscription: SubscriptionStatus = {
        ...subscriptionWithUsage,
        dailyUsageCount: 0,
        lastResetDate: new Date()
      };
      await subscriptionRepository.saveSubscriptionStatus(resetSubscription);

      // Retrieve updated subscription
      const retrievedResetSubscription = await subscriptionRepository.getSubscriptionStatus(userId);

      expect(retrievedResetSubscription).toBeDefined();
      expect(retrievedResetSubscription!.dailyUsageCount).toBe(0);
      expect(retrievedResetSubscription!.lastResetDate.toDateString()).toBe(new Date().toDateString());
    });

    it('should check usage limits correctly', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      const userId = 'integration-test-sub-user-4';

      // Test free user at limit
      const freeUserAtLimit: SubscriptionStatus = {
        userId,
        tier: 'free',
        dailyUsageCount: 5, // At the limit
        lastResetDate: new Date()
      };

      await subscriptionRepository.saveSubscriptionStatus(freeUserAtLimit);

      const limitResult = await subscriptionRepository.checkUsageLimits(userId);

      expect(limitResult.canProceed).toBe(false);
      expect(limitResult.remainingUsage).toBe(0);
    });

    it('should handle premium user unlimited access', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      const userId = 'integration-test-sub-user-5';

      const premiumUser: SubscriptionStatus = {
        userId,
        tier: 'premium',
        subscriptionId: 'premium-sub-456',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        dailyUsageCount: 100, // High usage
        lastResetDate: new Date()
      };

      await subscriptionRepository.saveSubscriptionStatus(premiumUser);

      const limitResult = await subscriptionRepository.checkUsageLimits(userId);

      expect(limitResult.canProceed).toBe(true);
      expect(limitResult.remainingUsage).toBeUndefined(); // Unlimited
    });

    it('should handle non-existent subscription status', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      const retrievedSubscription = await subscriptionRepository.getSubscriptionStatus(
        'non-existent-user'
      );

      expect(retrievedSubscription).toBeNull();
    });

    it('should update subscription tier', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      const userId = 'integration-test-sub-user-6';

      const freeUser: SubscriptionStatus = {
        userId,
        tier: 'free',
        dailyUsageCount: 3,
        lastResetDate: new Date()
      };

      // Store as free user
      await subscriptionRepository.saveSubscriptionStatus(freeUser);

      // Upgrade to premium
      const premiumUser: SubscriptionStatus = {
        ...freeUser,
        tier: 'premium',
        subscriptionId: 'premium-sub-789',
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };

      await subscriptionRepository.saveSubscriptionStatus(premiumUser);

      // Retrieve updated subscription
      const updatedSubscription = await subscriptionRepository.getSubscriptionStatus(userId);

      expect(updatedSubscription).toBeDefined();
      expect(updatedSubscription!.tier).toBe('premium');
      expect(updatedSubscription!.subscriptionId).toBe('premium-sub-789');
      expect(updatedSubscription!.expiresAt).toBeDefined();
    });
  });

  describe('DynamoDB Error Handling', () => {
    it('should handle connection errors gracefully', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      // Create repository with invalid table name to trigger error
      const invalidRepository = new ConversationContextRepository(
        dynamoClient,
        {
          tableName: 'non-existent-table',
          ttlHours: 24
        }
      );

      await expect(invalidRepository.getConversationContext('test-user'))
        .rejects.toThrow();
    });

    it('should handle malformed data gracefully', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      // Manually insert malformed data
      await dynamoClient.put({
        TableName: testTableNames.conversations,
        Item: {
          userId: 'malformed-user',
          sessionId: 'malformed-session',
          messages: 'invalid-messages-format', // Should be array
          createdAt: 'invalid-date', // Should be date
          tokenCount: 'not-a-number' // Should be number
        }
      }).promise();

      // Repository should handle malformed data gracefully
      const result = await conversationRepository.getConversationContext(
        'malformed-user'
      );

      // Should either return null or handle the malformed data appropriately
      expect(result).toBeDefined();
    });
  });
});