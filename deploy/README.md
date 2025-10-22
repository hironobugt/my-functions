# Deployment Guide

This guide covers deploying the Alexa LLM Chat skill using AWS SAM.

## Prerequisites

1. **AWS CLI** - Install and configure with appropriate credentials
2. **SAM CLI** - Install AWS SAM CLI
3. **Node.js** - Version 18.x or later
4. **OpenRouter API Key** - Sign up at https://openrouter.ai

## Environment Setup

### 1. Configure AWS Credentials

```bash
aws configure
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Environment Variables

Create environment-specific parameter files or use AWS Systems Manager Parameter Store.

#### Required Parameters:
- `OpenRouterApiKey` - Your OpenRouter API key (sensitive)
- `Environment` - dev/staging/prod

#### Optional Parameters (with defaults):
- `OpenRouterBaseUrl` - Default: https://openrouter.ai/api/v1
- `FreeUserDailyLimit` - Default: 5
- `FreeUserModel` - Default: openai/gpt-3.5-turbo
- `PremiumUserModel` - Default: openai/gpt-4
- `MaxContextTokens` - Default: 4000
- `ResponseTimeoutMs` - Default: 7000

## Deployment Commands

### Development Environment

```bash
# Build and deploy to dev
npm run deploy:dev

# Or step by step:
npm run build
npm run sam:build
npm run sam:deploy:dev
```

### Staging Environment

```bash
npm run deploy:staging
```

### Production Environment

```bash
npm run deploy:prod
```

## Parameter Management

### Using Parameter Overrides

You can override parameters during deployment:

```bash
sam deploy --config-env dev --parameter-overrides \
  OpenRouterApiKey=your-api-key \
  FreeUserDailyLimit=10
```

### Using Parameter Store

Store sensitive parameters in AWS Systems Manager Parameter Store:

```bash
# Store API key securely
aws ssm put-parameter \
  --name "/alexa-llm-chat/dev/openrouter-api-key" \
  --value "your-api-key" \
  --type "SecureString"
```

Then reference in template:

```yaml
OpenRouterApiKey:
  Type: AWS::SSM::Parameter::Value<String>
  Default: /alexa-llm-chat/dev/openrouter-api-key
```

## Post-Deployment Steps

### 1. Update Alexa Skill ID

After creating the Alexa skill (task 13.2), update the parameter:

```bash
aws ssm put-parameter \
  --name "/alexa-llm-chat/dev/skill-id" \
  --value "amzn1.ask.skill.your-skill-id" \
  --overwrite
```

### 2. Configure Alexa Skill Endpoint

Use the Lambda function ARN from the deployment output as the skill endpoint.

### 3. Test Deployment

```bash
# View logs
npm run sam:logs

# Test locally (requires Alexa skill simulator)
npm run sam:local
```

## Monitoring and Troubleshooting

### CloudWatch Logs

Logs are automatically created in CloudWatch with 14-day retention:
- Log Group: `/aws/lambda/alexa-llm-chat-{environment}`

### DynamoDB Tables

Three tables are created:
- `alexa-llm-chat-conversation-context-{environment}`
- `alexa-llm-chat-subscription-status-{environment}`
- `alexa-llm-chat-analytics-{environment}`

### Common Issues

1. **Permission Errors**: Ensure AWS credentials have sufficient permissions
2. **Parameter Missing**: Check all required parameters are provided
3. **Build Failures**: Run `npm run clean` and rebuild
4. **Timeout Issues**: Adjust `ResponseTimeoutMs` parameter if needed

## Security Considerations

1. **API Keys**: Never commit API keys to version control
2. **IAM Permissions**: Use least privilege principle
3. **Encryption**: DynamoDB tables use encryption at rest
4. **VPC**: Consider VPC deployment for production environments

## Rollback

To rollback a deployment:

```bash
# Delete the stack
aws cloudformation delete-stack --stack-name alexa-llm-chat-dev

# Or update to previous version
sam deploy --config-env dev --parameter-overrides Version=previous-version
```