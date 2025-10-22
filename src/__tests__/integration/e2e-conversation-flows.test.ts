import { handler } from '../../index';
import { RequestEnvelope, LaunchRequest, IntentRequest, ResponseEnvelope } from 'ask-sdk-model';
import { Context } from 'aws-lambda';

// Mock environment variables for integration tests
process.env.OPENROUTER_API_KEY = 'test-api-key';
process.env.OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
process.env.FREE_USER_DAILY_LIMIT = '5';
process.env.FREE_USER_MODEL = 'openai/gpt-3.5-turbo';
process.env.PREMIUM_USER_MODEL = 'openai/gpt-4';
process.env.MAX_CONTEXT_TOKENS = '4000';
process.env.RESPONSE_TIMEOUT_MS = '7000';
process.env.CONVERSATION_CONTEXT_TABLE = 'test-conversation-contexts';
process.env.SUBSCRIPTION_STATUS_TABLE = 'test-subscription-status';
process.env.ALEXA_SKILL_ID = 'amzn1.ask.skill.test';
process.env.ALEXA_STAGE = 'development';
process.env.PREMIUM_MONTHLY_PRODUCT_ID = 'premium_monthly_test';

// Mock AWS SDK and external services for integration tests
jest.mock('aws-sdk', () => ({
  DynamoDB: {
    DocumentClient: jest.fn(() => ({
      get: jest.fn(),
      put: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      scan: jest.fn(),
      query: jest.fn()
    }))
  },
  config: {
    update: jest.fn()
  }
}));

jest.mock('axios');

describe('End-to-End Conversation Flows Integration Tests', () => {
  let mockContext: Context;
  let mockDynamoClient: any;
  let mockAxios: any;

  beforeAll(() => {
    // Setup mock context for Lambda
    mockContext = {
      callbackWaitsForEmptyEventLoop: false,
      functionName: 'alexa-llm-chat',
      functionVersion: '1',
      invokedFunctionArn: 'arn:aws:lambda:us-east-1:123456789012:function:alexa-llm-chat',
      memoryLimitInMB: '512',
      awsRequestId: 'test-request-id',
      logGroupName: '/aws/lambda/alexa-llm-chat',
      logStreamName: '2023/01/01/[$LATEST]test-stream',
      getRemainingTimeInMillis: () => 5000,
      done: jest.fn(),
      fail: jest.fn(),
      succeed: jest.fn()
    };

    // Setup DynamoDB mocks
    const AWS = require('aws-sdk');
    mockDynamoClient = new AWS.DynamoDB.DocumentClient();
    
    // Setup Axios mocks
    mockAxios = require('axios');
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset DynamoDB mocks
    mockDynamoClient.get.mockReturnValue({
      promise: jest.fn().mockResolvedValue({ Item: null })
    });
    mockDynamoClient.put.mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    });
    mockDynamoClient.update.mockReturnValue({
      promise: jest.fn().mockResolvedValue({})
    });

    // Reset Axios mocks
    mockAxios.post.mockResolvedValue({
      data: {
        choices: [{
          message: {
            content: 'This is a test response from the AI assistant.'
          }
        }],
        usage: {
          total_tokens: 50
        }
      }
    });
  });

  describe('Complete Free User Conversation Flow', () => {
    it('should handle complete conversation flow for new free user', async () => {
      const userId = 'test-free-user-new';
      const sessionId = 'test-session-new';

      // Mock subscription status for new free user
      mockDynamoClient.get.mockReturnValueOnce({
        promise: jest.fn().mockResolvedValue({ Item: null })
      });

      // Step 1: Launch Request
      const launchRequest: RequestEnvelope = {
        version: '1.0',
        session: {
          sessionId,
          application: { applicationId: 'amzn1.ask.skill.test' },
          user: { userId },
          new: true
        },
        request: {
          type: 'LaunchRequest',
          requestId: 'launch-request-id',
          timestamp: new Date().toISOString(),
          locale: 'en-US'
        } as LaunchRequest,
        context: {
          System: {
            application: { applicationId: 'amzn1.ask.skill.test' },
            user: { userId },
            device: { 
              deviceId: 'test-device',
              supportedInterfaces: {}
            },
            apiEndpoint: 'https://api.amazonalexa.com'
          }
        }
      };

      const launchResponse = await handler(launchRequest, mockContext, () => {});
      
      expect(launchResponse).toBeDefined();
      expect((launchResponse as any).response.outputSpeech.text).toContain('Welcome to AI Chat');
      expect((launchResponse as any).response.shouldEndSession).toBe(false);

      // Step 2: First Chat Intent
      const chatRequest: RequestEnvelope = {
        version: '1.0',
        session: {
          sessionId,
          application: { applicationId: 'amzn1.ask.skill.test' },
          user: { userId },
          new: false
        },
        request: {
          type: 'IntentRequest',
          requestId: 'chat-request-id-1',
          timestamp: new Date().toISOString(),
          locale: 'en-US',
          dialogState: 'COMPLETED',
          intent: {
            name: 'ChatIntent',
            confirmationStatus: 'NONE',
            slots: {
              question: {
                name: 'question',
                value: 'What is artificial intelligence?',
                confirmationStatus: 'NONE'
              }
            }
          }
        } as IntentRequest,
        context: {
          System: {
            application: { applicationId: 'amzn1.ask.skill.test' },
            user: { userId },
            device: { 
              deviceId: 'test-device',
              supportedInterfaces: {}
            },
            apiEndpoint: 'https://api.amazonalexa.com'
          }
        }
      };

      const chatResponse = await handler(chatRequest, mockContext, () => {});
      
      expect(chatResponse).toBeDefined();
      expect((chatResponse as any).response.outputSpeech.text).toContain('This is a test response from the AI assistant');
      expect((chatResponse as any).response.shouldEndSession).toBe(false);
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/chat/completions'),
        expect.objectContaining({
          model: 'openai/gpt-3.5-turbo',
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: 'What is artificial intelligence?'
            })
          ])
        }),
        expect.any(Object)
      );

      // Step 3: Follow-up Chat Intent (testing context preservation)
      const followUpRequest: RequestEnvelope = {
        ...chatRequest,
        request: {
          ...chatRequest.request,
          requestId: 'chat-request-id-2',
          intent: {
            name: 'ChatIntent',
            confirmationStatus: 'NONE',
            slots: {
              question: {
                name: 'question',
                value: 'Can you explain that in simpler terms?',
                confirmationStatus: 'NONE'
              }
            }
          }
        } as IntentRequest
      };

      // Mock existing conversation context
      mockDynamoClient.get.mockReturnValueOnce({
        promise: jest.fn().mockResolvedValue({
          Item: {
            userId,
            sessionId,
            messages: [
              {
                role: 'user',
                content: 'What is artificial intelligence?',
                timestamp: new Date().toISOString()
              },
              {
                role: 'assistant',
                content: 'This is a test response from the AI assistant.',
                timestamp: new Date().toISOString()
              }
            ],
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            tokenCount: 50
          }
        })
      });

      const followUpResponse = await handler(followUpRequest, mockContext, () => {});
      
      expect(followUpResponse).toBeDefined();
      expect((followUpResponse as any).response.outputSpeech.text).toContain('This is a test response from the AI assistant');
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/chat/completions'),
        expect.objectContaining({
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: 'What is artificial intelligence?'
            }),
            expect.objectContaining({
              role: 'assistant',
              content: 'This is a test response from the AI assistant.'
            }),
            expect.objectContaining({
              role: 'user',
              content: 'Can you explain that in simpler terms?'
            })
          ])
        }),
        expect.any(Object)
      );

      // Verify DynamoDB interactions
      expect(mockDynamoClient.put).toHaveBeenCalled();
      expect(mockDynamoClient.update).toHaveBeenCalled();
    });

    it('should enforce daily usage limits for free users', async () => {
      const userId = 'test-free-user-limit';
      const sessionId = 'test-session-limit';

      // Mock subscription status for free user at limit
      mockDynamoClient.get.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Item: {
            userId,
            tier: 'free',
            dailyUsageCount: 5, // At the limit
            lastResetDate: new Date().toISOString()
          }
        })
      });

      const chatRequest: RequestEnvelope = {
        version: '1.0',
        session: {
          sessionId,
          application: { applicationId: 'amzn1.ask.skill.test' },
          user: { userId },
          new: false
        },
        request: {
          type: 'IntentRequest',
          requestId: 'chat-request-limit',
          timestamp: new Date().toISOString(),
          locale: 'en-US',
          dialogState: 'COMPLETED',
          intent: {
            name: 'ChatIntent',
            confirmationStatus: 'NONE',
            slots: {
              question: {
                name: 'question',
                value: 'This should be blocked',
                confirmationStatus: 'NONE'
              }
            }
          }
        } as IntentRequest,
        context: {
          System: {
            application: { applicationId: 'amzn1.ask.skill.test' },
            user: { userId },
            device: { 
              deviceId: 'test-device',
              supportedInterfaces: {}
            },
            apiEndpoint: 'https://api.amazonalexa.com'
          }
        }
      };

      const response = await handler(chatRequest, mockContext, () => {});
      
      expect(response).toBeDefined();
      expect((response as any).response.outputSpeech.text).toContain('reached your daily limit');
      expect((response as any).response.card.title).toBe('Daily Limit Reached');
      expect(mockAxios.post).not.toHaveBeenCalled(); // Should not call LLM API
    });

    it('should reset usage count for new day', async () => {
      const userId = 'test-free-user-reset';
      const sessionId = 'test-session-reset';
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      // Mock subscription status with old reset date
      mockDynamoClient.get.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Item: {
            userId,
            tier: 'free',
            dailyUsageCount: 5, // Was at limit yesterday
            lastResetDate: yesterday.toISOString()
          }
        })
      });

      const chatRequest: RequestEnvelope = {
        version: '1.0',
        session: {
          sessionId,
          application: { applicationId: 'amzn1.ask.skill.test' },
          user: { userId },
          new: false
        },
        request: {
          type: 'IntentRequest',
          requestId: 'chat-request-reset',
          timestamp: new Date().toISOString(),
          locale: 'en-US',
          dialogState: 'COMPLETED',
          intent: {
            name: 'ChatIntent',
            confirmationStatus: 'NONE',
            slots: {
              question: {
                name: 'question',
                value: 'This should work after reset',
                confirmationStatus: 'NONE'
              }
            }
          }
        } as IntentRequest,
        context: {
          System: {
            application: { applicationId: 'amzn1.ask.skill.test' },
            user: { userId },
            device: { 
              deviceId: 'test-device',
              supportedInterfaces: {}
            },
            apiEndpoint: 'https://api.amazonalexa.com'
          }
        }
      };

      const response = await handler(chatRequest, mockContext, () => {});
      
      expect(response).toBeDefined();
      expect((response as any).response.outputSpeech.text).toContain('This is a test response from the AI assistant');
      expect(mockAxios.post).toHaveBeenCalled(); // Should call LLM API after reset
      expect(mockDynamoClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          Key: { userId },
          UpdateExpression: expect.stringContaining('dailyUsageCount'),
          ExpressionAttributeValues: expect.objectContaining({
            ':count': 0, // Should reset to 0
            ':resetDate': expect.any(String)
          })
        })
      );
    });
  });

  describe('Premium User Unlimited Access Flow', () => {
    it('should provide unlimited access for premium users', async () => {
      const userId = 'test-premium-user';
      const sessionId = 'test-session-premium';

      // Mock subscription status for premium user
      mockDynamoClient.get.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Item: {
            userId,
            tier: 'premium',
            subscriptionId: 'premium-sub-123',
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            dailyUsageCount: 50, // High usage count
            lastResetDate: new Date().toISOString()
          }
        })
      });

      const chatRequest: RequestEnvelope = {
        version: '1.0',
        session: {
          sessionId,
          application: { applicationId: 'amzn1.ask.skill.test' },
          user: { userId },
          new: false
        },
        request: {
          type: 'IntentRequest',
          requestId: 'chat-request-premium',
          timestamp: new Date().toISOString(),
          locale: 'en-US',
          dialogState: 'COMPLETED',
          intent: {
            name: 'ChatIntent',
            confirmationStatus: 'NONE',
            slots: {
              question: {
                name: 'question',
                value: 'Premium user question',
                confirmationStatus: 'NONE'
              }
            }
          }
        } as IntentRequest,
        context: {
          System: {
            application: { applicationId: 'amzn1.ask.skill.test' },
            user: { userId },
            device: { 
              deviceId: 'test-device',
              supportedInterfaces: {}
            },
            apiEndpoint: 'https://api.amazonalexa.com'
          }
        }
      };

      const response = await handler(chatRequest, mockContext, () => {});
      
      expect(response).toBeDefined();
      expect((response as any).response.outputSpeech.text).toContain('This is a test response from the AI assistant');
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/chat/completions'),
        expect.objectContaining({
          model: 'openai/gpt-4', // Should use premium model
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: 'Premium user question'
            })
          ])
        }),
        expect.any(Object)
      );
    });

    it('should handle expired premium subscription gracefully', async () => {
      const userId = 'test-expired-premium-user';
      const sessionId = 'test-session-expired';

      // Mock subscription status for expired premium user
      mockDynamoClient.get.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Item: {
            userId,
            tier: 'premium',
            subscriptionId: 'premium-sub-expired',
            expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Expired yesterday
            dailyUsageCount: 0,
            lastResetDate: new Date().toISOString()
          }
        })
      });

      const chatRequest: RequestEnvelope = {
        version: '1.0',
        session: {
          sessionId,
          application: { applicationId: 'amzn1.ask.skill.test' },
          user: { userId },
          new: false
        },
        request: {
          type: 'IntentRequest',
          requestId: 'chat-request-expired',
          timestamp: new Date().toISOString(),
          locale: 'en-US',
          dialogState: 'COMPLETED',
          intent: {
            name: 'ChatIntent',
            confirmationStatus: 'NONE',
            slots: {
              question: {
                name: 'question',
                value: 'Question from expired user',
                confirmationStatus: 'NONE'
              }
            }
          }
        } as IntentRequest,
        context: {
          System: {
            application: { applicationId: 'amzn1.ask.skill.test' },
            user: { userId },
            device: { 
              deviceId: 'test-device',
              supportedInterfaces: {}
            },
            apiEndpoint: 'https://api.amazonalexa.com'
          }
        }
      };

      const response = await handler(chatRequest, mockContext, () => {});
      
      expect(response).toBeDefined();
      expect((response as any).response.outputSpeech.text).toContain('This is a test response from the AI assistant');
      expect(mockAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/chat/completions'),
        expect.objectContaining({
          model: 'openai/gpt-3.5-turbo', // Should downgrade to free model
        }),
        expect.any(Object)
      );
      
      // Should update subscription status to reflect downgrade
      expect(mockDynamoClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          Key: { userId },
          UpdateExpression: expect.stringContaining('tier'),
          ExpressionAttributeValues: expect.objectContaining({
            ':tier': 'free'
          })
        })
      );
    });
  });

  describe('Subscription Purchase and Activation Flow', () => {
    it('should handle subscription purchase intent', async () => {
      const userId = 'test-purchase-user';
      const sessionId = 'test-session-purchase';

      // Mock subscription status for free user
      mockDynamoClient.get.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Item: {
            userId,
            tier: 'free',
            dailyUsageCount: 3,
            lastResetDate: new Date().toISOString()
          }
        })
      });

      const subscriptionRequest: RequestEnvelope = {
        version: '1.0',
        session: {
          sessionId,
          application: { applicationId: 'amzn1.ask.skill.test' },
          user: { userId },
          new: false
        },
        request: {
          type: 'IntentRequest',
          requestId: 'subscription-request',
          timestamp: new Date().toISOString(),
          locale: 'en-US',
          dialogState: 'COMPLETED',
          intent: {
            name: 'SubscriptionIntent',
            confirmationStatus: 'NONE',
            slots: {
              action: {
                name: 'action',
                value: 'buy',
                confirmationStatus: 'NONE'
              }
            }
          }
        } as IntentRequest,
        context: {
          System: {
            application: { applicationId: 'amzn1.ask.skill.test' },
            user: { userId },
            device: { 
              deviceId: 'test-device',
              supportedInterfaces: {}
            },
            apiEndpoint: 'https://api.amazonalexa.com'
          }
        }
      };

      const response = await handler(subscriptionRequest, mockContext, () => {});
      
      expect(response).toBeDefined();
      expect((response as any).response.outputSpeech.text).toContain('premium subscription');
      expect((response as any).response.directives).toBeDefined();
      expect((response as any).response.directives[0].type).toBe('Connections.SendRequest');
      expect((response as any).response.directives[0].name).toBe('Buy');
    });

    it('should handle successful subscription activation', async () => {
      const userId = 'test-activation-user';
      const sessionId = 'test-session-activation';

      // Mock successful purchase response
      const purchaseRequest: RequestEnvelope = {
        version: '1.0',
        session: {
          sessionId,
          application: { applicationId: 'amzn1.ask.skill.test' },
          user: { userId },
          new: false
        },
        request: {
          type: 'Connections.Response',
          requestId: 'purchase-response',
          timestamp: new Date().toISOString(),
          name: 'Buy',
          status: {
            code: '200',
            message: 'OK'
          },
          payload: {
            purchaseResult: 'ACCEPTED',
            productId: 'premium_monthly_test'
          }
        } as any,
        context: {
          System: {
            application: { applicationId: 'amzn1.ask.skill.test' },
            user: { userId },
            device: { 
              deviceId: 'test-device',
              supportedInterfaces: {}
            },
            apiEndpoint: 'https://api.amazonalexa.com'
          }
        }
      };

      const response = await handler(purchaseRequest, mockContext, () => {});
      
      expect(response).toBeDefined();
      expect((response as any).response.outputSpeech.text).toContain('successfully upgraded');
      
      // Should update subscription status to premium
      expect(mockDynamoClient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          Key: { userId },
          UpdateExpression: expect.stringContaining('tier'),
          ExpressionAttributeValues: expect.objectContaining({
            ':tier': 'premium'
          })
        })
      );
    });

    it('should handle failed subscription purchase', async () => {
      const userId = 'test-failed-purchase-user';
      const sessionId = 'test-session-failed';

      // Mock failed purchase response
      const failedPurchaseRequest: RequestEnvelope = {
        version: '1.0',
        session: {
          sessionId,
          application: { applicationId: 'amzn1.ask.skill.test' },
          user: { userId },
          new: false
        },
        request: {
          type: 'Connections.Response',
          requestId: 'failed-purchase-response',
          timestamp: new Date().toISOString(),
          name: 'Buy',
          status: {
            code: '200',
            message: 'OK'
          },
          payload: {
            purchaseResult: 'DECLINED',
            productId: 'premium_monthly_test'
          }
        } as any,
        context: {
          System: {
            application: { applicationId: 'amzn1.ask.skill.test' },
            user: { userId },
            device: { 
              deviceId: 'test-device',
              supportedInterfaces: {}
            },
            apiEndpoint: 'https://api.amazonalexa.com'
          }
        }
      };

      const response = await handler(failedPurchaseRequest, mockContext, () => {});
      
      expect(response).toBeDefined();
      expect((response as any).response.outputSpeech.text).toContain('purchase was not completed');
      expect((response as any).response.shouldEndSession).toBe(false);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle DynamoDB connection errors gracefully', async () => {
      const userId = 'test-db-error-user';
      const sessionId = 'test-session-db-error';

      // Mock DynamoDB error
      mockDynamoClient.get.mockReturnValue({
        promise: jest.fn().mockRejectedValue(new Error('DynamoDB connection failed'))
      });

      const chatRequest: RequestEnvelope = {
        version: '1.0',
        session: {
          sessionId,
          application: { applicationId: 'amzn1.ask.skill.test' },
          user: { userId },
          new: false
        },
        request: {
          type: 'IntentRequest',
          requestId: 'chat-request-db-error',
          timestamp: new Date().toISOString(),
          locale: 'en-US',
          dialogState: 'COMPLETED',
          intent: {
            name: 'ChatIntent',
            confirmationStatus: 'NONE',
            slots: {
              question: {
                name: 'question',
                value: 'This should handle DB error',
                confirmationStatus: 'NONE'
              }
            }
          }
        } as IntentRequest,
        context: {
          System: {
            application: { applicationId: 'amzn1.ask.skill.test' },
            user: { userId },
            device: { 
              deviceId: 'test-device',
              supportedInterfaces: {}
            },
            apiEndpoint: 'https://api.amazonalexa.com'
          }
        }
      };

      const response = await handler(chatRequest, mockContext, () => {});
      
      expect(response).toBeDefined();
      expect((response as any).response.outputSpeech.text).toContain('technical issue');
      expect((response as any).response.shouldEndSession).toBe(false);
    });

    it('should handle OpenRouter API errors gracefully', async () => {
      const userId = 'test-api-error-user';
      const sessionId = 'test-session-api-error';

      // Mock successful DynamoDB but failed API
      mockDynamoClient.get.mockReturnValue({
        promise: jest.fn().mockResolvedValue({
          Item: {
            userId,
            tier: 'free',
            dailyUsageCount: 1,
            lastResetDate: new Date().toISOString()
          }
        })
      });

      mockAxios.post.mockRejectedValue(new Error('OpenRouter API unavailable'));

      const chatRequest: RequestEnvelope = {
        version: '1.0',
        session: {
          sessionId,
          application: { applicationId: 'amzn1.ask.skill.test' },
          user: { userId },
          new: false
        },
        request: {
          type: 'IntentRequest',
          requestId: 'chat-request-api-error',
          timestamp: new Date().toISOString(),
          locale: 'en-US',
          dialogState: 'COMPLETED',
          intent: {
            name: 'ChatIntent',
            confirmationStatus: 'NONE',
            slots: {
              question: {
                name: 'question',
                value: 'This should handle API error',
                confirmationStatus: 'NONE'
              }
            }
          }
        } as IntentRequest,
        context: {
          System: {
            application: { applicationId: 'amzn1.ask.skill.test' },
            user: { userId },
            device: { 
              deviceId: 'test-device',
              supportedInterfaces: {}
            },
            apiEndpoint: 'https://api.amazonalexa.com'
          }
        }
      };

      const response = await handler(chatRequest, mockContext, () => {});
      
      expect(response).toBeDefined();
      expect((response as any).response.outputSpeech.text).toContain('trouble connecting to the AI service');
      expect((response as any).response.shouldEndSession).toBe(false);
    });
  });
});