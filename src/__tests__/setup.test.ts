/**
 * Basic setup test to verify Jest configuration
 */
describe('Project Setup', () => {
  it('should have TypeScript compilation working', () => {
    expect(true).toBe(true);
  });

  it('should be able to import models', () => {
    const models = require('../models/ConversationContext');
    expect(models).toBeDefined();
  });
});