# Complete Deployment Guide

This guide covers the complete deployment process for the Alexa LLM Chat skill, including both AWS infrastructure and Alexa skill configuration.

## Overview

The deployment consists of two main components:
1. **AWS Infrastructure** (Lambda, DynamoDB, IAM) - Task 13.1
2. **Alexa Skill Configuration** (Skill manifest, intents, ISP) - Task 13.2

## Prerequisites

### Required Tools
- **Node.js** 18.x or later
- **AWS CLI** configured with appropriate permissions
- **SAM CLI** for AWS infrastructure deployment
- **ASK CLI** for Alexa skill deployment

### Required Accounts
- **AWS Account** with Lambda and DynamoDB permissions
- **Amazon Developer Account** for Alexa skills
- **OpenRouter Account** with API key

### Installation Commands
```bash
# Install AWS SAM CLI
# Follow instructions at: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html

# Install ASK CLI
npm install -g ask-cli

# Configure AWS CLI
aws configure

# Configure ASK CLI
ask configure
```

## Step-by-Step Deployment

### Phase 1: Prepare Configuration

1. **Set up OpenRouter API Key**:
   ```bash
   # Get your API key from https://openrouter.ai
   # Update parameter files in deploy/ directory
   ```

2. **Validate Configuration**:
   ```bash
   npm run validate:deployment
   ```

### Phase 2: Deploy AWS Infrastructure

1. **Build and Deploy Lambda Function**:
   ```bash
   # Development environment
   npm run deploy:dev
   
   # Production environment
   npm run deploy:prod
   ```

2. **Verify AWS Resources**:
   - Lambda function: `alexa-llm-chat-{env}`
   - DynamoDB tables: conversation context, subscription status, analytics
   - IAM roles and permissions

3. **Note Lambda ARN**:
   ```bash
   # Get Lambda ARN for skill configuration
   aws lambda get-function --function-name alexa-llm-chat-dev --query 'Configuration.FunctionArn'
   ```

### Phase 3: Deploy Alexa Skill

1. **Update Skill Configuration**:
   - Edit `skill-package/skill.json`
   - Replace `YOUR_ACCOUNT_ID` with your AWS account ID
   - Update privacy policy and terms of use URLs
   - Upload skill icons to S3 and update URLs

2. **Deploy Skill**:
   ```bash
   # Development environment
   npm run skill:deploy:dev
   
   # Production environment
   npm run skill:deploy:prod
   ```

3. **Deploy ISP Products**:
   ```bash
   # ISP products are deployed automatically with skill deployment
   # Verify in Alexa Developer Console
   ```

### Phase 4: Complete Deployment (All-in-One)

For convenience, use the complete deployment commands:

```bash
# Deploy everything to development
npm run deploy:full:dev

# Deploy everything to production
npm run deploy:full:prod
```

## Testing and Validation

### 1. Lambda Function Testing

```bash
# View Lambda logs
npm run sam:logs

# Test Lambda locally
npm run sam:local
```

### 2. Alexa Skill Testing

```bash
# Interactive voice testing
npm run skill:test

# Simulate skill invocation
ask api simulate-skill --skill-id <skill-id> --text "open ai chat"
```

### 3. End-to-End Testing

Test these scenarios:

#### Basic Conversation:
1. "Alexa, open AI Chat"
2. "What is artificial intelligence?"
3. "Tell me more about machine learning"
4. "Stop"

#### Subscription Flow:
1. "Alexa, open AI Chat"
2. "What are premium features?"
3. "I want to upgrade"
4. Complete purchase flow
5. Test unlimited usage

#### Usage Limits:
1. Use skill 5+ times as free user
2. Verify limit enforcement
3. Test upgrade prompts

## Environment Management

### Development Environment
- **Purpose**: Testing and development
- **Lambda**: `alexa-llm-chat-dev`
- **DynamoDB**: Tables with `-dev` suffix
- **Skill**: Development stage in Alexa Developer Console

### Staging Environment
- **Purpose**: Pre-production testing
- **Lambda**: `alexa-llm-chat-staging`
- **DynamoDB**: Tables with `-staging` suffix
- **Skill**: Separate skill for staging tests

### Production Environment
- **Purpose**: Live user traffic
- **Lambda**: `alexa-llm-chat-prod`
- **DynamoDB**: Tables with `-prod` suffix
- **Skill**: Published skill in Alexa Skills Store

## Monitoring and Maintenance

### AWS CloudWatch
- **Lambda Metrics**: Invocations, errors, duration
- **DynamoDB Metrics**: Read/write capacity, throttling
- **Custom Metrics**: Conversation counts, subscription events

### Alexa Developer Console
- **Usage Analytics**: User engagement, session duration
- **Error Monitoring**: Failed requests, certification issues
- **ISP Analytics**: Purchase conversions, revenue

### Log Analysis
```bash
# View recent Lambda logs
aws logs tail /aws/lambda/alexa-llm-chat-dev --follow

# Search for specific errors
aws logs filter-log-events --log-group-name /aws/lambda/alexa-llm-chat-dev --filter-pattern "ERROR"
```

## Troubleshooting

### Common Issues

1. **Lambda Permission Errors**:
   ```bash
   # Check Lambda execution role
   aws iam get-role --role-name alexa-llm-chat-dev-AlexaLLMChatFunctionRole-*
   ```

2. **DynamoDB Access Issues**:
   ```bash
   # Test DynamoDB access
   aws dynamodb describe-table --table-name alexa-llm-chat-conversation-context-dev
   ```

3. **Alexa Skill Errors**:
   ```bash
   # Check skill status
   ask api get-skill-status --skill-id <skill-id>
   
   # View skill logs
   ask logs --skill-id <skill-id>
   ```

4. **ISP Purchase Issues**:
   - Verify ISP product status in Developer Console
   - Check payment method in test account
   - Review purchase flow implementation

### Debug Commands

```bash
# Validate SAM template
sam validate

# Test Lambda function locally
sam local invoke AlexaLLMChatFunction --event test-event.json

# Validate Alexa interaction model
ask api validate-skill --skill-id <skill-id>

# Test specific utterances
ask api nlu-profile --utterance "what is AI" --locale en-US
```

## Security Checklist

- [ ] API keys stored securely (not in code)
- [ ] IAM roles follow least privilege principle
- [ ] DynamoDB tables have appropriate access controls
- [ ] Lambda function has minimal required permissions
- [ ] Skill follows Alexa privacy guidelines
- [ ] ISP purchase verification implemented
- [ ] User data handling complies with regulations

## Performance Optimization

### Lambda Optimization
- Monitor cold start times
- Optimize package size
- Use connection pooling for DynamoDB
- Implement proper error handling

### DynamoDB Optimization
- Monitor read/write capacity
- Use appropriate indexes
- Implement TTL for temporary data
- Consider on-demand billing for variable workloads

### Alexa Skill Optimization
- Keep responses under 8 seconds
- Implement proper session management
- Use progressive responses for long operations
- Optimize interaction model for better recognition

## Cost Management

### AWS Costs
- **Lambda**: Pay per invocation and duration
- **DynamoDB**: Pay per read/write operations
- **CloudWatch**: Log storage and metrics

### Optimization Strategies
- Use DynamoDB on-demand pricing for unpredictable workloads
- Implement log retention policies
- Monitor and optimize Lambda memory allocation
- Use reserved capacity for predictable DynamoDB usage

## Support and Resources

### Documentation
- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/)
- [Alexa Skills Kit Documentation](https://developer.amazon.com/docs/ask-overviews/build-skills-with-the-alexa-skills-kit.html)
- [ASK CLI Reference](https://developer.amazon.com/docs/smapi/ask-cli-intro.html)

### Community
- [AWS SAM GitHub](https://github.com/aws/serverless-application-model)
- [Alexa Developer Forums](https://forums.developer.amazon.com/spaces/165/index.html)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/alexa-skills-kit)

### Getting Help
1. Check CloudWatch logs for detailed error information
2. Use ASK CLI debug commands for skill issues
3. Review AWS documentation for infrastructure problems
4. Contact AWS Support for critical production issues