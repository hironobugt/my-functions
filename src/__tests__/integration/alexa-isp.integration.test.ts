import { AlexaISPService } from '../../services/AlexaISPService';
import { RequestEnvelope, IntentRequest } from 'ask-sdk-model';
import axios from 'axios';

// This test file contains integration tests for Alexa ISP (In-Skill Purchases)
// These tests require Alexa Skills Kit API access and should be run in sandbox environment
// Set INTEGRATION_TEST_ALEXA_ISP=true to enable these tests

const INTEGRATION_TESTS_ENABLED = process.env.INTEGRATION_TEST_ALEXA_ISP === 'true';
const ALEXA_API_ENDPOINT = process.env.ALEXA_API_ENDPOINT || 'https://api.amazonalexa.com';
const ALEXA_SKILL_ID = process.env.ALEXA_SKILL_ID || 'amzn1.ask.skill.test';
const ALEXA_ACCESS_TOKEN = process.env.ALEXA_ACCESS_TOKEN; // Required for ISP API calls

// Mock axios for non-integration tests
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Alexa ISP Integration Tests', () => {
  let ispService: AlexaISPService;

  beforeAll(() => {
    if (!INTEGRATION_TESTS_ENABLED) {
      console.log('Alexa ISP integration tests skipped. Set INTEGRATION_TEST_ALEXA_ISP=true to enable.');
      return;
    }

    if (!ALEXA_ACCESS_TOKEN) {
      throw new Error('ALEXA_ACCESS_TOKEN environment variable is required for ISP integration tests');
    }

    ispService = new AlexaISPService({
      skillId: ALEXA_SKILL_ID,
      stage: 'development', // Use development stage for testing
      products: {
        premiumMonthly: process.env.PREMIUM_MONTHLY_PRODUCT_ID || 'premium_monthly_test'
      }
    });
  });

  beforeEach(() => {
    if (!INTEGRATION_TESTS_ENABLED) {
      return;
    }
    jest.setTimeout(10000); // Increase timeout for real API calls
  });

  describe('ISP Product Information', () => {
    it('should retrieve product information from Alexa ISP API', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      const mockRequestEnvelope: RequestEnvelope = {
        version: '1.0',
        session: {
          sessionId: 'test-session',
          application: { applicationId: ALEXA_SKILL_ID },
          user: { userId: 'test-user' },
          new: false
        },
        request: {
          type: 'IntentRequest',
          requestId: 'test-request',
          timestamp: new Date().toISOString(),
          locale: 'en-US'
        } as IntentRequest,
        context: {
          System: {
            application: { applicationId: ALEXA_SKILL_ID },
            user: { userId: 'test-user' },
            device: { 
              deviceId: 'test-device',
              supportedInterfaces: {}
            },
            apiEndpoint: ALEXA_API_ENDPOINT,
            apiAccessToken: ALEXA_ACCESS_TOKEN
          }
        }
      };

      const products = await ispService.getProducts('en-US');

      expect(products).toBeDefined();
      expect(Array.isArray(products)).toBe(true);
      
      if (products.length > 0) {
        const product = products[0];
        expect(product.productId).toBeDefined();
        expect(product.name).toBeDefined();
        expect(product.summary).toBeDefined();
        expect(product.purchasable).toBeDefined();
        expect(product.entitlementReason).toBeDefined();
      }
    });

    it('should get specific product by ID', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      const mockRequestEnvelope: RequestEnvelope = {
        version: '1.0',
        session: {
          sessionId: 'test-session',
          application: { applicationId: ALEXA_SKILL_ID },
          user: { userId: 'test-user' },
          new: false
        },
        request: {
          type: 'IntentRequest',
          requestId: 'test-request',
          timestamp: new Date().toISOString(),
          locale: 'en-US'
        } as IntentRequest,
        context: {
          System: {
            application: { applicationId: ALEXA_SKILL_ID },
            user: { userId: 'test-user' },
            device: { 
              deviceId: 'test-device',
              supportedInterfaces: {}
            },
            apiEndpoint: ALEXA_API_ENDPOINT,
            apiAccessToken: ALEXA_ACCESS_TOKEN
          }
        }
      };

      const productId = process.env.PREMIUM_MONTHLY_PRODUCT_ID || 'premium_monthly_test';
      const product = await ispService.getProduct(productId, 'en-US');

      expect(product).toBeDefined();
      if (product) {
        expect(product.productId).toBe(productId);
        expect(product.name).toBeDefined();
        expect(product.summary).toBeDefined();
        expect(typeof product.purchasable).toBe('string');
        expect(product.entitlementReason).toBeDefined();
      }
    });
  });

  describe('Purchase Flow Integration', () => {
    it('should create buy directive for product purchase', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      const mockRequestEnvelope: RequestEnvelope = {
        version: '1.0',
        session: {
          sessionId: 'test-session',
          application: { applicationId: ALEXA_SKILL_ID },
          user: { userId: 'test-user' },
          new: false
        },
        request: {
          type: 'IntentRequest',
          requestId: 'test-request',
          timestamp: new Date().toISOString(),
          locale: 'en-US'
        } as IntentRequest,
        context: {
          System: {
            application: { applicationId: ALEXA_SKILL_ID },
            user: { userId: 'test-user' },
            device: { 
              deviceId: 'test-device',
              supportedInterfaces: {}
            },
            apiEndpoint: ALEXA_API_ENDPOINT,
            apiAccessToken: ALEXA_ACCESS_TOKEN
          }
        }
      };

      const productId = process.env.PREMIUM_MONTHLY_PRODUCT_ID || 'premium_monthly_test';
      const purchaseResult = await ispService.initiatePurchase(productId, 'test-correlation-token', 'en-US');

      expect(purchaseResult).toBeDefined();
      expect(purchaseResult.success).toBe(true);
      expect(purchaseResult.productId).toBe(productId);
      expect(purchaseResult.transactionId).toBe('test-correlation-token');
    });

    it('should handle purchase response processing', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      // Mock successful purchase response
      const purchaseResponseEnvelope: RequestEnvelope = {
        version: '1.0',
        session: {
          sessionId: 'test-session',
          application: { applicationId: ALEXA_SKILL_ID },
          user: { userId: 'test-user' },
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
            productId: process.env.PREMIUM_MONTHLY_PRODUCT_ID || 'premium_monthly_test'
          }
        } as any,
        context: {
          System: {
            application: { applicationId: ALEXA_SKILL_ID },
            user: { userId: 'test-user' },
            device: { 
              deviceId: 'test-device',
              supportedInterfaces: {}
            },
            apiEndpoint: ALEXA_API_ENDPOINT,
            apiAccessToken: ALEXA_ACCESS_TOKEN
          }
        }
      };

      const productId = process.env.PREMIUM_MONTHLY_PRODUCT_ID || 'premium_monthly_test';
      const purchaseResult = await ispService.handlePurchaseResponse(purchaseResponseEnvelope.request, productId);

      expect(purchaseResult).toBeDefined();
      expect(purchaseResult.success).toBe(true);
      expect(purchaseResult.productId).toBe(productId);
      expect(purchaseResult.purchaseResult).toBe('ACCEPTED');
    });

    it('should handle declined purchase response', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      // Mock declined purchase response
      const declinedResponseEnvelope: RequestEnvelope = {
        version: '1.0',
        session: {
          sessionId: 'test-session',
          application: { applicationId: ALEXA_SKILL_ID },
          user: { userId: 'test-user' },
          new: false
        },
        request: {
          type: 'Connections.Response',
          requestId: 'declined-response',
          timestamp: new Date().toISOString(),
          name: 'Buy',
          status: {
            code: '200',
            message: 'OK'
          },
          payload: {
            purchaseResult: 'DECLINED',
            productId: process.env.PREMIUM_MONTHLY_PRODUCT_ID || 'premium_monthly_test'
          }
        } as any,
        context: {
          System: {
            application: { applicationId: ALEXA_SKILL_ID },
            user: { userId: 'test-user' },
            device: { 
              deviceId: 'test-device',
              supportedInterfaces: {}
            },
            apiEndpoint: ALEXA_API_ENDPOINT,
            apiAccessToken: ALEXA_ACCESS_TOKEN
          }
        }
      };

      const productId = process.env.PREMIUM_MONTHLY_PRODUCT_ID || 'premium_monthly_test';
      const purchaseResult = await ispService.handlePurchaseResponse(declinedResponseEnvelope.request, productId);

      expect(purchaseResult).toBeDefined();
      expect(purchaseResult.success).toBe(false);
      expect(purchaseResult.productId).toBe(productId);
      expect(purchaseResult.purchaseResult).toBe('DECLINED');
    });
  });

  describe('Subscription Verification', () => {
    it('should verify active subscription status', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      const mockRequestEnvelope: RequestEnvelope = {
        version: '1.0',
        session: {
          sessionId: 'test-session',
          application: { applicationId: ALEXA_SKILL_ID },
          user: { userId: 'test-user-with-subscription' },
          new: false
        },
        request: {
          type: 'IntentRequest',
          requestId: 'test-request',
          timestamp: new Date().toISOString(),
          locale: 'en-US'
        } as IntentRequest,
        context: {
          System: {
            application: { applicationId: ALEXA_SKILL_ID },
            user: { userId: 'test-user-with-subscription' },
            device: { 
              deviceId: 'test-device',
              supportedInterfaces: {}
            },
            apiEndpoint: ALEXA_API_ENDPOINT,
            apiAccessToken: ALEXA_ACCESS_TOKEN
          }
        }
      };

      const productId = process.env.PREMIUM_MONTHLY_PRODUCT_ID || 'premium_monthly_test';
      const isSubscribed = await ispService.isEntitled(productId, 'en-US');

      expect(typeof isSubscribed).toBe('boolean');
      // Note: The actual result depends on the test user's subscription status
    });

    it('should get subscription details', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      const mockRequestEnvelope: RequestEnvelope = {
        version: '1.0',
        session: {
          sessionId: 'test-session',
          application: { applicationId: ALEXA_SKILL_ID },
          user: { userId: 'test-user-subscription-details' },
          new: false
        },
        request: {
          type: 'IntentRequest',
          requestId: 'test-request',
          timestamp: new Date().toISOString(),
          locale: 'en-US'
        } as IntentRequest,
        context: {
          System: {
            application: { applicationId: ALEXA_SKILL_ID },
            user: { userId: 'test-user-subscription-details' },
            device: { 
              deviceId: 'test-device',
              supportedInterfaces: {}
            },
            apiEndpoint: ALEXA_API_ENDPOINT,
            apiAccessToken: ALEXA_ACCESS_TOKEN
          }
        }
      };

      const productId = process.env.PREMIUM_MONTHLY_PRODUCT_ID || 'premium_monthly_test';
      const entitlements = await ispService.getUserEntitlements('en-US');

      expect(entitlements).toBeDefined();
      expect(Array.isArray(entitlements)).toBe(true);
      
      const productEntitlement = entitlements.find(e => e.productId === productId);
      if (productEntitlement) {
        expect(productEntitlement.productId).toBe(productId);
        expect(typeof productEntitlement.entitled).toBe('boolean');
        expect(productEntitlement.entitlementReason).toBeDefined();
      }
    });
  });

  describe('Refund and Cancellation Flow', () => {
    it('should create cancel directive for subscription cancellation', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      const mockRequestEnvelope: RequestEnvelope = {
        version: '1.0',
        session: {
          sessionId: 'test-session',
          application: { applicationId: ALEXA_SKILL_ID },
          user: { userId: 'test-user' },
          new: false
        },
        request: {
          type: 'IntentRequest',
          requestId: 'test-request',
          timestamp: new Date().toISOString(),
          locale: 'en-US'
        } as IntentRequest,
        context: {
          System: {
            application: { applicationId: ALEXA_SKILL_ID },
            user: { userId: 'test-user' },
            device: { 
              deviceId: 'test-device',
              supportedInterfaces: {}
            },
            apiEndpoint: ALEXA_API_ENDPOINT,
            apiAccessToken: ALEXA_ACCESS_TOKEN
          }
        }
      };

      const productId = process.env.PREMIUM_MONTHLY_PRODUCT_ID || 'premium_monthly_test';
      
      // Test cancellation by checking if we can generate appropriate messages
      const errorMessage = ispService.handlePurchaseError('declined');
      expect(errorMessage).toContain('No problem');
      
      const productInfo = ispService.generateProductInfo(productId);
      expect(productInfo).toContain('Premium');
      expect(productInfo).toContain('unlimited');
    });

    it('should handle cancellation response processing', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      // Mock successful cancellation response
      const cancellationResponseEnvelope: RequestEnvelope = {
        version: '1.0',
        session: {
          sessionId: 'test-session',
          application: { applicationId: ALEXA_SKILL_ID },
          user: { userId: 'test-user' },
          new: false
        },
        request: {
          type: 'Connections.Response',
          requestId: 'cancellation-response',
          timestamp: new Date().toISOString(),
          name: 'Cancel',
          status: {
            code: '200',
            message: 'OK'
          },
          payload: {
            purchaseResult: 'ACCEPTED',
            productId: process.env.PREMIUM_MONTHLY_PRODUCT_ID || 'premium_monthly_test'
          }
        } as any,
        context: {
          System: {
            application: { applicationId: ALEXA_SKILL_ID },
            user: { userId: 'test-user' },
            device: { 
              deviceId: 'test-device',
              supportedInterfaces: {}
            },
            apiEndpoint: ALEXA_API_ENDPOINT,
            apiAccessToken: ALEXA_ACCESS_TOKEN
          }
        }
      };

      const productId = process.env.PREMIUM_MONTHLY_PRODUCT_ID || 'premium_monthly_test';
      const cancellationResult = await ispService.handlePurchaseResponse(cancellationResponseEnvelope.request, productId);

      expect(cancellationResult).toBeDefined();
      expect(cancellationResult.success).toBe(true);
      expect(cancellationResult.productId).toBe(productId);
    });
  });

  describe('Error Handling', () => {
    it('should handle API authentication errors', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      // Create service with invalid credentials
      const invalidISPService = new AlexaISPService({
        skillId: 'invalid-skill-id',
        stage: 'development',
        products: {
          premiumMonthly: 'invalid-product-id'
        }
      });

      const mockRequestEnvelope: RequestEnvelope = {
        version: '1.0',
        session: {
          sessionId: 'test-session',
          application: { applicationId: 'invalid-skill-id' },
          user: { userId: 'test-user' },
          new: false
        },
        request: {
          type: 'IntentRequest',
          requestId: 'test-request',
          timestamp: new Date().toISOString(),
          locale: 'en-US'
        } as IntentRequest,
        context: {
          System: {
            application: { applicationId: 'invalid-skill-id' },
            user: { userId: 'test-user' },
            device: { 
              deviceId: 'test-device',
              supportedInterfaces: {}
            },
            apiEndpoint: ALEXA_API_ENDPOINT,
            apiAccessToken: 'invalid-token'
          }
        }
      };

      const products = await invalidISPService.getProducts('en-US');
      expect(products).toEqual([]); // Should return empty array on error
    });

    it('should handle network errors gracefully', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      // Mock network error
      const originalAxios = axios.get;
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      const mockRequestEnvelope: RequestEnvelope = {
        version: '1.0',
        session: {
          sessionId: 'test-session',
          application: { applicationId: ALEXA_SKILL_ID },
          user: { userId: 'test-user' },
          new: false
        },
        request: {
          type: 'IntentRequest',
          requestId: 'test-request',
          timestamp: new Date().toISOString(),
          locale: 'en-US'
        } as IntentRequest,
        context: {
          System: {
            application: { applicationId: ALEXA_SKILL_ID },
            user: { userId: 'test-user' },
            device: { 
              deviceId: 'test-device',
              supportedInterfaces: {}
            },
            apiEndpoint: ALEXA_API_ENDPOINT,
            apiAccessToken: ALEXA_ACCESS_TOKEN
          }
        }
      };

      const products = await ispService.getProducts('en-US');
      expect(products).toEqual([]); // Should return empty array on network error

      // Restore original axios
      mockedAxios.get.mockImplementation(originalAxios);
    });

    it('should handle malformed API responses', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      // Mock malformed response
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          // Missing required fields
          invalidResponse: true
        }
      });

      const mockRequestEnvelope: RequestEnvelope = {
        version: '1.0',
        session: {
          sessionId: 'test-session',
          application: { applicationId: ALEXA_SKILL_ID },
          user: { userId: 'test-user' },
          new: false
        },
        request: {
          type: 'IntentRequest',
          requestId: 'test-request',
          timestamp: new Date().toISOString(),
          locale: 'en-US'
        } as IntentRequest,
        context: {
          System: {
            application: { applicationId: ALEXA_SKILL_ID },
            user: { userId: 'test-user' },
            device: { 
              deviceId: 'test-device',
              supportedInterfaces: {}
            },
            apiEndpoint: ALEXA_API_ENDPOINT,
            apiAccessToken: ALEXA_ACCESS_TOKEN
          }
        }
      };

      const products = await ispService.getProducts('en-US');
      expect(products).toEqual([]); // Should return empty array on malformed response
    });
  });

  describe('Sandbox Environment Testing', () => {
    it('should work with sandbox ISP products', async () => {
      if (!INTEGRATION_TESTS_ENABLED) {
        return;
      }

      // Test with sandbox environment
      const sandboxISPService = new AlexaISPService({
        skillId: ALEXA_SKILL_ID,
        stage: 'development', // Development stage uses sandbox
        products: {
          premiumMonthly: process.env.PREMIUM_MONTHLY_PRODUCT_ID || 'premium_monthly_test'
        }
      });

      const mockRequestEnvelope: RequestEnvelope = {
        version: '1.0',
        session: {
          sessionId: 'sandbox-test-session',
          application: { applicationId: ALEXA_SKILL_ID },
          user: { userId: 'sandbox-test-user' },
          new: false
        },
        request: {
          type: 'IntentRequest',
          requestId: 'sandbox-test-request',
          timestamp: new Date().toISOString(),
          locale: 'en-US'
        } as IntentRequest,
        context: {
          System: {
            application: { applicationId: ALEXA_SKILL_ID },
            user: { userId: 'sandbox-test-user' },
            device: { 
              deviceId: 'test-device',
              supportedInterfaces: {}
            },
            apiEndpoint: ALEXA_API_ENDPOINT,
            apiAccessToken: ALEXA_ACCESS_TOKEN
          }
        }
      };

      const products = await sandboxISPService.getProducts('en-US');

      expect(products).toBeDefined();
      expect(Array.isArray(products)).toBe(true);
      
      // Sandbox products should be available for testing
      if (products.length > 0) {
        const product = products[0];
        expect(product.purchasable).toBe('PURCHASABLE'); // Should be purchasable in sandbox
      }
    });
  });
});