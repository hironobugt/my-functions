import { validateAppConfig } from './ValidationUtils';

/**
 * Application configuration interface
 */
export interface AppConfig {
  openRouterApiKey: string;
  openRouterBaseUrl: string;
  freeUserDailyLimit: number;
  freeUserModel: string;
  premiumUserModel: string;
  maxContextTokens: number;
  responseTimeoutMs: number;
  conversationContextTable: string;
  subscriptionStatusTable: string;
  analyticsTable: string;
}

/**
 * Default configuration values
 */
export const DEFAULT_CONFIG: Partial<AppConfig> = {
  openRouterBaseUrl: 'https://openrouter.ai/api/v1',
  freeUserDailyLimit: 5,
  freeUserModel: 'openai/gpt-3.5-turbo',
  premiumUserModel: 'openai/gpt-4',
  maxContextTokens: 4000,
  responseTimeoutMs: 7000, // 7 seconds to stay under Alexa's 8-second limit
};

/**
 * Configuration error class
 */
export class ConfigurationError extends Error {
  constructor(message: string, public missingKey?: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/**
 * Configuration manager class for loading and validating app configuration
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig | null = null;

  private constructor() {}

  /**
   * Get singleton instance of ConfigManager
   */
  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Load configuration from environment variables with defaults
   */
  public loadConfig(): AppConfig {
    if (this.config) {
      return this.config;
    }

    const config: AppConfig = {
      openRouterApiKey: this.getRequiredEnvVar('OPENROUTER_API_KEY'),
      openRouterBaseUrl: this.getEnvVar('OPENROUTER_BASE_URL', DEFAULT_CONFIG.openRouterBaseUrl!),
      freeUserDailyLimit: this.getNumberEnvVar('FREE_USER_DAILY_LIMIT', DEFAULT_CONFIG.freeUserDailyLimit!),
      freeUserModel: this.getEnvVar('FREE_USER_MODEL', DEFAULT_CONFIG.freeUserModel!),
      premiumUserModel: this.getEnvVar('PREMIUM_USER_MODEL', DEFAULT_CONFIG.premiumUserModel!),
      maxContextTokens: this.getNumberEnvVar('MAX_CONTEXT_TOKENS', DEFAULT_CONFIG.maxContextTokens!),
      responseTimeoutMs: this.getNumberEnvVar('RESPONSE_TIMEOUT_MS', DEFAULT_CONFIG.responseTimeoutMs!),
      conversationContextTable: this.getRequiredEnvVar('CONVERSATION_CONTEXT_TABLE'),
      subscriptionStatusTable: this.getRequiredEnvVar('SUBSCRIPTION_STATUS_TABLE'),
      analyticsTable: this.getRequiredEnvVar('ANALYTICS_TABLE'),
    };

    // Validate the configuration
    validateAppConfig(config);

    this.config = config;
    return config;
  }

  /**
   * Get current configuration (loads if not already loaded)
   */
  public getConfig(): AppConfig {
    return this.loadConfig();
  }

  /**
   * Reset configuration (useful for testing)
   */
  public resetConfig(): void {
    this.config = null;
  }

  /**
   * Validate current configuration
   */
  public validateConfig(): boolean {
    try {
      const config = this.getConfig();
      validateAppConfig(config);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get configuration summary for logging (without sensitive data)
   */
  public getConfigSummary(): Record<string, any> {
    const config = this.getConfig();
    return {
      openRouterBaseUrl: config.openRouterBaseUrl,
      freeUserDailyLimit: config.freeUserDailyLimit,
      freeUserModel: config.freeUserModel,
      premiumUserModel: config.premiumUserModel,
      maxContextTokens: config.maxContextTokens,
      responseTimeoutMs: config.responseTimeoutMs,
      hasApiKey: !!config.openRouterApiKey,
    };
  }

  /**
   * Get required environment variable
   */
  private getRequiredEnvVar(key: string): string {
    const value = process.env[key];
    if (!value) {
      throw new ConfigurationError(`Required environment variable ${key} is not set`, key);
    }
    return value;
  }

  /**
   * Get optional environment variable with default
   */
  private getEnvVar(key: string, defaultValue: string): string {
    return process.env[key] || defaultValue;
  }

  /**
   * Get numeric environment variable with default
   */
  private getNumberEnvVar(key: string, defaultValue: number): number {
    const value = process.env[key];
    if (!value) {
      return defaultValue;
    }

    const numValue = parseInt(value, 10);
    if (isNaN(numValue)) {
      throw new ConfigurationError(`Environment variable ${key} must be a valid number, got: ${value}`, key);
    }

    return numValue;
  }
}

/**
 * Convenience function to get configuration instance
 */
export function getConfig(): AppConfig {
  return ConfigManager.getInstance().getConfig();
}

/**
 * Convenience function to validate configuration
 */
export function validateConfiguration(): boolean {
  return ConfigManager.getInstance().validateConfig();
}