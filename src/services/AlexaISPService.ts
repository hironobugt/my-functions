/**
 * Alexa In-Skill Purchase (ISP) Service
 * Handles integration with Alexa Monetization Service for subscription purchases
 */

export interface ISPProduct {
  productId: string;
  name: string;
  summary: string;
  purchasable: 'PURCHASABLE' | 'NOT_PURCHASABLE';
  entitlementReason?: 'PURCHASED' | 'NOT_PURCHASED';
  activeEntitlementCount?: number;
}

export interface ISPPurchaseResult {
  success: boolean;
  transactionId?: string;
  productId?: string;
  purchaseResult?: 'ACCEPTED' | 'DECLINED' | 'ERROR' | 'NOT_ENTITLED' | 'ALREADY_PURCHASED';
  message?: string;
}

export interface ISPEntitlement {
  productId: string;
  entitled: boolean;
  entitlementReason: 'PURCHASED' | 'NOT_PURCHASED';
  purchaseDate?: Date;
  expiresAt?: Date;
}

/**
 * Configuration for Alexa ISP Service
 */
export interface AlexaISPConfig {
  monetizationServiceClient?: any; // Alexa SDK MonetizationServiceClient
  skillId: string;
  stage: 'development' | 'live';
  products: {
    premiumMonthly: string;
    premiumYearly?: string;
  };
}

/**
 * Service for handling Alexa In-Skill Purchases
 */
export class AlexaISPService {
  private client?: any;
  private config: AlexaISPConfig;

  constructor(config: AlexaISPConfig) {
    this.config = config;
    this.client = config.monetizationServiceClient;
  }

  /**
   * Get all available products for purchase
   */
  public async getProducts(locale: string = 'en-US'): Promise<ISPProduct[]> {
    try {
      if (!this.client) {
        throw new Error('Monetization service client not configured');
      }

      const response = await this.client.getInSkillProducts(locale);
      
      if (!response || !response.inSkillProducts) {
        return [];
      }

      return response.inSkillProducts.map((product: any) => ({
        productId: product.productId,
        name: product.name,
        summary: product.summary,
        purchasable: product.purchasable,
        entitlementReason: product.entitlementReason,
        activeEntitlementCount: product.activeEntitlementCount
      }));
    } catch (error: any) {
      console.error('Failed to get ISP products:', error);
      return [];
    }
  }

  /**
   * Get specific product by ID
   */
  public async getProduct(productId: string, locale: string = 'en-US'): Promise<ISPProduct | null> {
    try {
      const products = await this.getProducts(locale);
      return products.find(p => p.productId === productId) || null;
    } catch (error: any) {
      console.error(`Failed to get product ${productId}:`, error);
      return null;
    }
  }

  /**
   * Initiate purchase for a product
   */
  public async initiatePurchase(
    productId: string, 
    correlationToken: string,
    locale: string = 'en-US'
  ): Promise<ISPPurchaseResult> {
    try {
      if (!this.client) {
        return {
          success: false,
          message: 'Monetization service not available'
        };
      }

      // Check if product is purchasable
      const product = await this.getProduct(productId, locale);
      if (!product) {
        return {
          success: false,
          message: 'Product not found'
        };
      }

      if (product.purchasable !== 'PURCHASABLE') {
        return {
          success: false,
          message: 'Product is not available for purchase',
          purchaseResult: 'NOT_ENTITLED'
        };
      }

      // Generate purchase directive
      const purchaseDirective = {
        type: 'Connections.SendRequest',
        name: 'Buy',
        payload: {
          InSkillProduct: {
            productId: productId
          }
        },
        token: correlationToken
      };

      return {
        success: true,
        productId: productId,
        transactionId: correlationToken,
        message: 'Purchase initiated'
      };
    } catch (error: any) {
      console.error(`Failed to initiate purchase for ${productId}:`, error);
      return {
        success: false,
        message: `Purchase initiation failed: ${error.message || error}`
      };
    }
  }

  /**
   * Handle purchase response from Alexa
   */
  public async handlePurchaseResponse(
    purchaseResult: any,
    productId: string
  ): Promise<ISPPurchaseResult> {
    try {
      const result = purchaseResult?.payload?.purchaseResult;
      const message = purchaseResult?.payload?.message;

      switch (result) {
        case 'ACCEPTED':
          return {
            success: true,
            productId: productId,
            purchaseResult: 'ACCEPTED',
            message: 'Purchase completed successfully'
          };

        case 'DECLINED':
          return {
            success: false,
            productId: productId,
            purchaseResult: 'DECLINED',
            message: 'Purchase was declined by user'
          };

        case 'ALREADY_PURCHASED':
          return {
            success: true,
            productId: productId,
            purchaseResult: 'ALREADY_PURCHASED',
            message: 'Product already purchased'
          };

        case 'ERROR':
        default:
          return {
            success: false,
            productId: productId,
            purchaseResult: 'ERROR',
            message: message || 'Purchase failed due to an error'
          };
      }
    } catch (error: any) {
      console.error(`Failed to handle purchase response for ${productId}:`, error);
      return {
        success: false,
        productId: productId,
        purchaseResult: 'ERROR',
        message: `Failed to process purchase response: ${error.message || error}`
      };
    }
  }

  /**
   * Get user's entitlements for all products
   */
  public async getUserEntitlements(locale: string = 'en-US'): Promise<ISPEntitlement[]> {
    try {
      const products = await this.getProducts(locale);
      
      return products.map(product => ({
        productId: product.productId,
        entitled: product.entitlementReason === 'PURCHASED',
        entitlementReason: product.entitlementReason || 'NOT_PURCHASED',
        // Note: Alexa ISP doesn't provide purchase/expiry dates directly
        // These would need to be tracked separately in your database
      }));
    } catch (error: any) {
      console.error('Failed to get user entitlements:', error);
      return [];
    }
  }

  /**
   * Check if user is entitled to a specific product
   */
  public async isEntitled(productId: string, locale: string = 'en-US'): Promise<boolean> {
    try {
      const product = await this.getProduct(productId, locale);
      return product?.entitlementReason === 'PURCHASED' || false;
    } catch (error: any) {
      console.error(`Failed to check entitlement for ${productId}:`, error);
      return false;
    }
  }

  /**
   * Generate purchase prompt message for users
   */
  public generatePurchasePrompt(productId: string): string {
    const productName = this.getProductDisplayName(productId);
    
    return `Would you like to upgrade to ${productName}? This gives you unlimited conversations, ` +
           `access to advanced AI models, and priority support. Say "yes" to purchase or "no" to continue with the free version.`;
  }

  /**
   * Generate product information message
   */
  public generateProductInfo(productId: string): string {
    const productName = this.getProductDisplayName(productId);
    
    return `${productName} includes unlimited daily conversations, access to GPT-4 and other premium AI models, ` +
           `extended conversation memory, and priority customer support. ` +
           `Say "buy premium" to purchase or "tell me more" for additional details.`;
  }

  /**
   * Handle purchase errors with user-friendly messages
   */
  public handlePurchaseError(error: string): string {
    switch (error.toLowerCase()) {
      case 'not_entitled':
        return 'This product is not available for purchase at this time. Please try again later.';
      
      case 'already_purchased':
        return 'You already have this subscription! Your premium features are now active.';
      
      case 'declined':
        return 'No problem! You can upgrade to premium anytime by saying "buy premium". ' +
               'You can continue using the free version with 5 conversations per day.';
      
      case 'error':
      default:
        return 'There was an issue processing your purchase. Please try again in a few minutes. ' +
               'If the problem persists, you can contact customer support.';
    }
  }

  /**
   * Get display name for product ID
   */
  private getProductDisplayName(productId: string): string {
    if (productId === this.config.products.premiumMonthly) {
      return 'Premium Monthly';
    }
    if (productId === this.config.products.premiumYearly) {
      return 'Premium Yearly';
    }
    return 'Premium Subscription';
  }

  /**
   * Validate ISP configuration
   */
  public validateConfiguration(): boolean {
    return !!(
      this.config.skillId &&
      this.config.products.premiumMonthly &&
      this.client
    );
  }
}