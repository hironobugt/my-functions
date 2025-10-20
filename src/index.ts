import { SkillBuilders } from 'ask-sdk-core';
import { Handler } from 'aws-lambda';

/**
 * Main Lambda handler for Alexa LLM Chat skill
 * This will be implemented in later tasks with actual intent handlers
 */
export const handler: Handler = SkillBuilders.custom()
  .addRequestHandlers(
  // Intent handlers will be added in subsequent tasks
)
  .addErrorHandlers(
  // Error handlers will be added in subsequent tasks
)
  .lambda();