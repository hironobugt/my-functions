import { AlexaISPService, AlexaISPConfig, ISPProduct, ISPPurchaseResult } from '../services/AlexaISPService';

describe('AlexaISPService', () => {
  let ispService: AlexaISPService;
  let mockClient: any;
  let config: AlexaISPConfig;

  const mockProducts: ISPProduct[] = [
    {
      productId: 'premium-monthly',
      name: 'Premium Monthly',
      summary: 'Monthly premium subscription',
      purchasable: 'PURCHASABLE',
      entitlementReason: 'NOT_PURCHASED'
    },
    {
      productId: 'premium-yearly',
      name: 'Premium Yearly',
      summary: 'Yearly premium subscription',
      purchasable: 'PURCHASABLE',
      entitlementReason: 'PURCHASED'
    }
  ];

  beforeEach(() => {
    mockClient = {
      getInSkillProducts: jest.fn()
    };

    config = {
      monetizationServiceClient: mockClient,
      skillId: 'test-skill-id',
      stage: 'development',
      products: {
        premiumMonthly: 'premium-monthly',
        premiumYearly: 'premium-yearly'
      }
    };

    ispService = new AlexaISPService(config);
  });

  describe('getProducts', () => {
    it('should return products from ISP client', async () => {
      mockClient.getInSkillProducts.mockResolvedValue({
        inSkillProducts: mockProducts
      });

      const result = await ispService.getProducts();

      expect(result).toEqual(mockProducts);
      expect(mockClient.getInSkillProducts).toHaveBeenCalledWith('en-US');
    });

    it('should return empty array when no products available', async () => {
      mockClient.getInSkillProducts.mockResolvedValue({
        inSkillProducts: null
      });

      const result = await ispService.getProducts();

      expect(result).toEqual([]);
    });

    it('should handle client errors gracefully', async () => {
      mockClient.getInSkillProducts.mockRejectedValue(new Error('Client error'));

      const result = await ispService.getProducts();

      expect(result).toEqual([]);
    });

    it('should handle missing client', async () => {
      const serviceWithoutClient = new AlexaISPService({
        ...config,
        monetizationServiceClient: undefined
      });

      const result = await serviceWithoutClient.getProducts();

      expect(result).toEqual([]);
    });
  });

  describe('getProduct', () => {
    it('should return specific product by ID', async () => {
      mockClient.getInSkillProducts.mockResolvedValue({
        inSkillProducts: mockProducts
      });

      const result = await ispService.getProduct('premium-monthly');

      expect(result).toEqual(mockProducts[0]);
    });

    it('should return null for non-existent product', async () => {
      mockClient.getInSkillProducts.mockResolvedValue({
        inSkillProducts: mockProducts
      });

      const result = await ispService.getProduct('non-existent');

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      mockClient.getInSkillProducts.mockRejectedValue(new Error('Product error'));

      const result = await ispService.getProduct('premium-monthly');

      expect(result).toBeNull();
    });
  });

  describe('initiatePurchase', () => {
    it('should initiate purchase for purchasable product', async () => {
      mockClient.getInSkillProducts.mockResolvedValue({
        inSkillProducts: mockProducts
      });

      const result = await ispService.initiatePurchase('premium-monthly', 'test-token');

      expect(result).toEqual({
        success: true,
        productId: 'premium-monthly',
        transactionId: 'test-token',
        message: 'Purchase initiated'
      });
    });

    it('should fail for non-existent product', async () => {
      mockClient.getInSkillProducts.mockResolvedValue({
        inSkillProducts: mockProducts
      });

      const result = await ispService.initiatePurchase('non-existent', 'test-token');

      expect(result).toEqual({
        success: false,
        message: 'Product not found'
      });
    });

    it('should fail for non-purchasable product', async () => {
      const nonPurchasableProducts = [{
        ...mockProducts[0],
        purchasable: 'NOT_PURCHASABLE'
      }];

      mockClient.getInSkillProducts.mockResolvedValue({
        inSkillProducts: nonPurchasableProducts
      });

      const result = await ispService.initiatePurchase('premium-monthly', 'test-token');

      expect(result).toEqual({
        success: false,
        message: 'Product is not available for purchase',
        purchaseResult: 'NOT_ENTITLED'
      });
    });

    it('should handle missing client', async () => {
      const serviceWithoutClient = new AlexaISPService({
        ...config,
        monetizationServiceClient: undefined
      });

      const result = await serviceWithoutClient.initiatePurchase('premium-monthly', 'test-token');

      expect(result).toEqual({
        success: false,
        message: 'Monetization service not available'
      });
    });

    it('should handle errors gracefully', async () => {
      mockClient.getInSkillProducts.mockRejectedValue(new Error('Purchase error'));

      const result = await ispService.initiatePurchase('premium-monthly', 'test-token');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Product not found');
    });
  });

  describe('handlePurchaseResponse', () => {
    it('should handle accepted purchase', async () => {
      const purchaseResponse = {
        payload: {
          purchaseResult: 'ACCEPTED',
          message: 'Purchase successful'
        }
      };

      const result = await ispService.handlePurchaseResponse(purchaseResponse, 'premium-monthly');

      expect(result).toEqual({
        success: true,
        productId: 'premium-monthly',
        purchaseResult: 'ACCEPTED',
        message: 'Purchase completed successfully'
      });
    });

    it('should handle declined purchase', async () => {
      const purchaseResponse = {
        payload: {
          purchaseResult: 'DECLINED',
          message: 'User declined'
        }
      };

      const result = await ispService.handlePurchaseResponse(purchaseResponse, 'premium-monthly');

      expect(result).toEqual({
        success: false,
        productId: 'premium-monthly',
        purchaseResult: 'DECLINED',
        message: 'Purchase was declined by user'
      });
    });

    it('should handle already purchased', async () => {
      const purchaseResponse = {
        payload: {
          purchaseResult: 'ALREADY_PURCHASED'
        }
      };

      const result = await ispService.handlePurchaseResponse(purchaseResponse, 'premium-monthly');

      expect(result).toEqual({
        success: true,
        productId: 'premium-monthly',
        purchaseResult: 'ALREADY_PURCHASED',
        message: 'Product already purchased'
      });
    });

    it('should handle purchase error', async () => {
      const purchaseResponse = {
        payload: {
          purchaseResult: 'ERROR',
          message: 'Payment failed'
        }
      };

      const result = await ispService.handlePurchaseResponse(purchaseResponse, 'premium-monthly');

      expect(result).toEqual({
        success: false,
        productId: 'premium-monthly',
        purchaseResult: 'ERROR',
        message: 'Payment failed'
      });
    });

    it('should handle malformed response', async () => {
      const result = await ispService.handlePurchaseResponse({}, 'premium-monthly');

      expect(result.success).toBe(false);
      expect(result.purchaseResult).toBe('ERROR');
    });

    it('should handle exceptions', async () => {
      const result = await ispService.handlePurchaseResponse(null, 'premium-monthly');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Purchase failed due to an error');
    });
  });

  describe('getUserEntitlements', () => {
    it('should return user entitlements', async () => {
      mockClient.getInSkillProducts.mockResolvedValue({
        inSkillProducts: mockProducts
      });

      const result = await ispService.getUserEntitlements();

      expect(result).toEqual([
        {
          productId: 'premium-monthly',
          entitled: false,
          entitlementReason: 'NOT_PURCHASED'
        },
        {
          productId: 'premium-yearly',
          entitled: true,
          entitlementReason: 'PURCHASED'
        }
      ]);
    });

    it('should handle errors gracefully', async () => {
      mockClient.getInSkillProducts.mockRejectedValue(new Error('Entitlement error'));

      const result = await ispService.getUserEntitlements();

      expect(result).toEqual([]);
    });
  });

  describe('isEntitled', () => {
    it('should return true for purchased product', async () => {
      mockClient.getInSkillProducts.mockResolvedValue({
        inSkillProducts: mockProducts
      });

      const result = await ispService.isEntitled('premium-yearly');

      expect(result).toBe(true);
    });

    it('should return false for not purchased product', async () => {
      mockClient.getInSkillProducts.mockResolvedValue({
        inSkillProducts: mockProducts
      });

      const result = await ispService.isEntitled('premium-monthly');

      expect(result).toBe(false);
    });

    it('should return false for non-existent product', async () => {
      mockClient.getInSkillProducts.mockResolvedValue({
        inSkillProducts: mockProducts
      });

      const result = await ispService.isEntitled('non-existent');

      expect(result).toBe(false);
    });

    it('should handle errors gracefully', async () => {
      mockClient.getInSkillProducts.mockRejectedValue(new Error('Entitlement check error'));

      const result = await ispService.isEntitled('premium-monthly');

      expect(result).toBe(false);
    });
  });

  describe('generatePurchasePrompt', () => {
    it('should generate purchase prompt for monthly product', () => {
      const result = ispService.generatePurchasePrompt('premium-monthly');

      expect(result).toContain('Premium Monthly');
      expect(result).toContain('unlimited conversations');
      expect(result).toContain('Say "yes" to purchase');
    });

    it('should generate purchase prompt for yearly product', () => {
      const result = ispService.generatePurchasePrompt('premium-yearly');

      expect(result).toContain('Premium Yearly');
    });

    it('should generate generic prompt for unknown product', () => {
      const result = ispService.generatePurchasePrompt('unknown');

      expect(result).toContain('Premium Subscription');
    });
  });

  describe('generateProductInfo', () => {
    it('should generate product information', () => {
      const result = ispService.generateProductInfo('premium-monthly');

      expect(result).toContain('Premium Monthly');
      expect(result).toContain('unlimited daily conversations');
      expect(result).toContain('GPT-4');
      expect(result).toContain('Say "buy premium"');
    });
  });

  describe('handlePurchaseError', () => {
    it('should handle not entitled error', () => {
      const result = ispService.handlePurchaseError('not_entitled');

      expect(result).toContain('not available for purchase');
    });

    it('should handle already purchased error', () => {
      const result = ispService.handlePurchaseError('already_purchased');

      expect(result).toContain('already have this subscription');
    });

    it('should handle declined error', () => {
      const result = ispService.handlePurchaseError('declined');

      expect(result).toContain('No problem');
      expect(result).toContain('free version');
    });

    it('should handle generic error', () => {
      const result = ispService.handlePurchaseError('error');

      expect(result).toContain('issue processing your purchase');
    });

    it('should handle unknown error', () => {
      const result = ispService.handlePurchaseError('unknown_error');

      expect(result).toContain('issue processing your purchase');
    });
  });

  describe('validateConfiguration', () => {
    it('should return true for valid configuration', () => {
      const result = ispService.validateConfiguration();

      expect(result).toBe(true);
    });

    it('should return false for missing skill ID', () => {
      const invalidService = new AlexaISPService({
        ...config,
        skillId: ''
      });

      const result = invalidService.validateConfiguration();

      expect(result).toBe(false);
    });

    it('should return false for missing premium product', () => {
      const invalidService = new AlexaISPService({
        ...config,
        products: { premiumMonthly: '' }
      });

      const result = invalidService.validateConfiguration();

      expect(result).toBe(false);
    });

    it('should return false for missing client', () => {
      const invalidService = new AlexaISPService({
        ...config,
        monetizationServiceClient: undefined
      });

      const result = invalidService.validateConfiguration();

      expect(result).toBe(false);
    });
  });
});