import {
  ConfigManager,
  ConfigurationError,
  getConfig,
  validateConfiguration,
  DEFAULT_CONFIG,
} from '../models/AppConfig';

describe('AppConfig', () => {
  let originalEnv: NodeJS.ProcessEnv;
  let configManager: ConfigManager;

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env };
    
    // Get fresh instance and reset config
    configManager = ConfigManager.getInstance();
    configManager.resetConfig();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
    configManager.resetConfig();
  });

  describe('ConfigManager', () => {
    it('should be a singleton', () => {
      const instance1 = ConfigManager.getInstance();
      const instance2 = ConfigManager.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should load configuration with required environment variables', () => {
      process.env.OPENROUTER_API_KEY = 'sk-test123';
      
      const config = configManager.loadConfig();
      
      expect(config.openRouterApiKey).toBe('sk-test123');
      expect(config.openRouterBaseUrl).toBe(DEFAULT_CONFIG.openRouterBaseUrl);
      expect(config.freeUserDailyLimit).toBe(DEFAULT_CONFIG.freeUserDailyLimit);
    });

    it('should throw error when required environment variable is missing', () => {
      delete process.env.OPENROUTER_API_KEY;
      
      expect(() => configManager.loadConfig()).toThrow(ConfigurationError);
      expect(() => configManager.loadConfig()).toThrow('Required environment variable OPENROUTER_API_KEY is not set');
    });

    it('should use custom environment variables when provided', () => {
      process.env.OPENROUTER_API_KEY = 'sk-test123';
      process.env.OPENROUTER_BASE_URL = 'https://custom.api.com';
      process.env.FREE_USER_DAILY_LIMIT = '10';
      process.env.FREE_USER_MODEL = 'custom-model';
      process.env.PREMIUM_USER_MODEL = 'premium-model';
      process.env.MAX_CONTEXT_TOKENS = '8000';
      process.env.RESPONSE_TIMEOUT_MS = '5000';
      
      const config = configManager.loadConfig();
      
      expect(config.openRouterApiKey).toBe('sk-test123');
      expect(config.openRouterBaseUrl).toBe('https://custom.api.com');
      expect(config.freeUserDailyLimit).toBe(10);
      expect(config.freeUserModel).toBe('custom-model');
      expect(config.premiumUserModel).toBe('premium-model');
      expect(config.maxContextTokens).toBe(8000);
      expect(config.responseTimeoutMs).toBe(5000);
    });

    it('should throw error for invalid numeric environment variables', () => {
      process.env.OPENROUTER_API_KEY = 'sk-test123';
      process.env.FREE_USER_DAILY_LIMIT = 'not-a-number';
      
      expect(() => configManager.loadConfig()).toThrow(ConfigurationError);
      expect(() => configManager.loadConfig()).toThrow('must be a valid number');
    });

    it('should cache configuration after first load', () => {
      process.env.OPENROUTER_API_KEY = 'sk-test123';
      
      const config1 = configManager.loadConfig();
      
      // Change environment variable
      process.env.OPENROUTER_API_KEY = 'sk-different';
      
      const config2 = configManager.getConfig();
      
      // Should return cached config, not reload from env
      expect(config2.openRouterApiKey).toBe('sk-test123');
      expect(config1).toBe(config2); // Same object reference
    });

    it('should reload configuration after reset', () => {
      process.env.OPENROUTER_API_KEY = 'sk-test123';
      
      const config1 = configManager.loadConfig();
      expect(config1.openRouterApiKey).toBe('sk-test123');
      
      // Reset and change environment
      configManager.resetConfig();
      process.env.OPENROUTER_API_KEY = 'sk-different';
      
      const config2 = configManager.loadConfig();
      expect(config2.openRouterApiKey).toBe('sk-different');
    });

    it('should validate configuration correctly', () => {
      process.env.OPENROUTER_API_KEY = 'sk-test123';
      
      expect(configManager.validateConfig()).toBe(true);
    });

    it('should return false for invalid configuration', () => {
      process.env.OPENROUTER_API_KEY = 'sk-test123';
      process.env.OPENROUTER_BASE_URL = 'not-a-url';
      
      expect(configManager.validateConfig()).toBe(false);
    });

    it('should provide configuration summary without sensitive data', () => {
      process.env.OPENROUTER_API_KEY = 'sk-test123';
      
      const summary = configManager.getConfigSummary();
      
      expect(summary.hasApiKey).toBe(true);
      expect(summary.openRouterBaseUrl).toBe(DEFAULT_CONFIG.openRouterBaseUrl);
      expect(summary.freeUserDailyLimit).toBe(DEFAULT_CONFIG.freeUserDailyLimit);
      expect(summary).not.toHaveProperty('openRouterApiKey');
    });
  });

  describe('Convenience functions', () => {
    it('should get configuration through convenience function', () => {
      process.env.OPENROUTER_API_KEY = 'sk-test123';
      
      const config = getConfig();
      
      expect(config.openRouterApiKey).toBe('sk-test123');
    });

    it('should validate configuration through convenience function', () => {
      process.env.OPENROUTER_API_KEY = 'sk-test123';
      
      expect(validateConfiguration()).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should create ConfigurationError with missing key', () => {
      const error = new ConfigurationError('Test error', 'TEST_KEY');
      
      expect(error.name).toBe('ConfigurationError');
      expect(error.message).toBe('Test error');
      expect(error.missingKey).toBe('TEST_KEY');
    });

    it('should handle missing required environment variables gracefully', () => {
      delete process.env.OPENROUTER_API_KEY;
      
      try {
        configManager.loadConfig();
        fail('Should have thrown ConfigurationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ConfigurationError);
        expect((error as ConfigurationError).missingKey).toBe('OPENROUTER_API_KEY');
      }
    });
  });

  describe('Default values', () => {
    it('should use all default values when only required env vars are set', () => {
      process.env.OPENROUTER_API_KEY = 'sk-test123';
      
      const config = configManager.loadConfig();
      
      expect(config.openRouterBaseUrl).toBe(DEFAULT_CONFIG.openRouterBaseUrl);
      expect(config.freeUserDailyLimit).toBe(DEFAULT_CONFIG.freeUserDailyLimit);
      expect(config.freeUserModel).toBe(DEFAULT_CONFIG.freeUserModel);
      expect(config.premiumUserModel).toBe(DEFAULT_CONFIG.premiumUserModel);
      expect(config.maxContextTokens).toBe(DEFAULT_CONFIG.maxContextTokens);
      expect(config.responseTimeoutMs).toBe(DEFAULT_CONFIG.responseTimeoutMs);
    });

    it('should have sensible default values', () => {
      expect(DEFAULT_CONFIG.openRouterBaseUrl).toBe('https://openrouter.ai/api/v1');
      expect(DEFAULT_CONFIG.freeUserDailyLimit).toBe(5);
      expect(DEFAULT_CONFIG.freeUserModel).toBe('openai/gpt-3.5-turbo');
      expect(DEFAULT_CONFIG.premiumUserModel).toBe('openai/gpt-4');
      expect(DEFAULT_CONFIG.maxContextTokens).toBe(4000);
      expect(DEFAULT_CONFIG.responseTimeoutMs).toBe(7000);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty string environment variables', () => {
      process.env.OPENROUTER_API_KEY = '';
      
      expect(() => configManager.loadConfig()).toThrow(ConfigurationError);
    });

    it('should handle zero values for numeric configs', () => {
      process.env.OPENROUTER_API_KEY = 'sk-test123';
      process.env.FREE_USER_DAILY_LIMIT = '0';
      
      // This should fail validation because daily limit must be positive
      expect(() => configManager.loadConfig()).toThrow();
    });

    it('should handle negative values for numeric configs', () => {
      process.env.OPENROUTER_API_KEY = 'sk-test123';
      process.env.RESPONSE_TIMEOUT_MS = '-1000';
      
      // This should fail validation because timeout must be positive
      expect(() => configManager.loadConfig()).toThrow();
    });
  });
});