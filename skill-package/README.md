# Alexa Skill Configuration Guide

This directory contains the complete Alexa skill configuration for the AI Chat skill.

## Directory Structure

```
skill-package/
├── skill.json                           # Skill manifest
├── interactionModels/
│   └── custom/
│       └── en-US.json                   # Interaction model (intents, utterances)
├── isps/
│   └── entitlement/
│       └── premium_subscription.json    # Premium subscription ISP
└── README.md                           # This file
```

## Prerequisites

1. **ASK CLI**: Install and configure the Alexa Skills Kit CLI
   ```bash
   npm install -g ask-cli
   ask configure
   ```

2. **AWS CLI**: Configure with appropriate permissions
   ```bash
   aws configure
   ```

3. **Lambda Function**: Deploy the Lambda function first (task 13.1)

## Configuration Steps

### 1. Update Skill Manifest

Edit `skill.json` and update the following placeholders:

- **Lambda ARN**: Replace `YOUR_ACCOUNT_ID` with your AWS account ID
- **Icons**: Upload skill icons to S3 and update URLs
- **Privacy Policy**: Update with your actual privacy policy URL
- **Terms of Use**: Update with your actual terms of use URL

### 2. Customize Interaction Model

The interaction model in `interactionModels/custom/en-US.json` includes:

#### Intents:
- **ChatIntent**: Main conversation intent with question slot
- **SubscriptionIntent**: Handle premium subscription inquiries
- **UsageStatusIntent**: Check usage limits and subscription status
- **NewConversationIntent**: Start fresh conversation
- **Built-in intents**: Help, Stop, Cancel, Yes, No

#### Sample Utterances:
- Natural conversation starters
- Question patterns
- Subscription-related phrases
- Usage checking phrases

### 3. Configure ISP Products

The premium subscription ISP includes:

- **Monthly subscription**: $4.99/month (USD)
- **7-day free trial**
- **Multi-region pricing**
- **Automatic renewal**

Update pricing and terms in `premium_subscription.json` as needed.

## Deployment

### Automated Deployment

Use the deployment script:

```bash
# Deploy to development
./scripts/deploy-skill.sh dev

# Deploy to production
./scripts/deploy-skill.sh prod
```

### Manual Deployment

1. **Deploy skill configuration**:
   ```bash
   ask deploy --target skill
   ```

2. **Deploy ISP products**:
   ```bash
   ask deploy --target isp
   ```

3. **Enable for testing**:
   ```bash
   ask api enable-skill --skill-id <your-skill-id> --stage development
   ```

## Testing

### Voice Testing

1. **ASK CLI Dialog**:
   ```bash
   ask dialog --locale en-US
   ```

2. **Skill Simulation**:
   ```bash
   ask api simulate-skill --skill-id <skill-id> --text "open ai chat"
   ```

### Test Scenarios

#### Basic Conversation Flow:
1. "Alexa, open AI Chat"
2. "What is artificial intelligence?"
3. "Tell me more about machine learning"
4. "Stop"

#### Subscription Flow:
1. "Alexa, open AI Chat"
2. "What are premium features?"
3. "I want to upgrade"
4. Follow purchase prompts
5. Test unlimited usage

#### Usage Limit Testing:
1. Use skill 5+ times as free user
2. Verify limit enforcement
3. Test upgrade prompts

## Skill Certification

### Pre-certification Checklist

- [ ] Test all intents and utterances
- [ ] Verify ISP purchase flow
- [ ] Test error scenarios
- [ ] Check privacy policy compliance
- [ ] Validate content guidelines
- [ ] Test on multiple devices
- [ ] Verify accessibility features

### Certification Requirements

1. **Functionality**: All features work as described
2. **User Experience**: Clear, helpful responses
3. **Privacy**: Compliant with Alexa privacy requirements
4. **Content**: Appropriate for all audiences
5. **ISP**: Purchase flow works correctly
6. **Performance**: Responds within time limits

## Monitoring and Analytics

### Alexa Developer Console

- **Usage metrics**: Track user engagement
- **Error rates**: Monitor skill health
- **ISP analytics**: Track subscription conversions
- **User feedback**: Review ratings and comments

### CloudWatch Integration

The Lambda function logs to CloudWatch for detailed monitoring:

- **Conversation metrics**: Response times, success rates
- **Error tracking**: Failed requests, API errors
- **Usage patterns**: Peak times, popular features

## Troubleshooting

### Common Issues

1. **Lambda Permission Errors**:
   - Ensure Lambda has Alexa Skills Kit trigger
   - Verify IAM permissions for DynamoDB access

2. **ISP Purchase Failures**:
   - Check ISP product status in developer console
   - Verify payment method in test account

3. **Intent Recognition Issues**:
   - Review and expand sample utterances
   - Test with different phrasings
   - Check slot value resolution

4. **Response Timeouts**:
   - Optimize Lambda cold start performance
   - Implement proper error handling
   - Monitor API response times

### Debug Commands

```bash
# Check skill status
ask api get-skill-status --skill-id <skill-id>

# View skill logs
ask logs --skill-id <skill-id>

# Test specific utterances
ask api nlu-profile --utterance "what is AI" --locale en-US

# Validate interaction model
ask api validate-skill --skill-id <skill-id>
```

## Security Considerations

1. **API Keys**: Never commit API keys to version control
2. **User Data**: Follow Alexa data handling guidelines
3. **ISP Security**: Implement proper purchase verification
4. **Lambda Security**: Use least privilege IAM policies

## Support and Resources

- [Alexa Skills Kit Documentation](https://developer.amazon.com/docs/ask-overviews/build-skills-with-the-alexa-skills-kit.html)
- [ASK CLI Reference](https://developer.amazon.com/docs/smapi/ask-cli-intro.html)
- [ISP Documentation](https://developer.amazon.com/docs/in-skill-purchase/isp-overview.html)
- [Skill Certification Guide](https://developer.amazon.com/docs/custom-skills/certification-requirements-for-custom-skills.html)