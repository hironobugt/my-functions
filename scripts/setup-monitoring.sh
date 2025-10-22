#!/bin/bash

# Setup monitoring for Alexa LLM Chat skill
# This script deploys CloudWatch dashboards, alarms, and metric filters

set -e

# Default values
ENVIRONMENT="dev"
STACK_NAME=""
EMAIL_NOTIFICATIONS=""
REGION="us-east-1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -e, --environment ENVIRONMENT    Environment (dev, staging, prod) [default: dev]"
    echo "  -s, --stack-name STACK_NAME      CloudFormation stack name [required]"
    echo "  -n, --notifications EMAIL        Email address for alarm notifications"
    echo "  -r, --region REGION              AWS region [default: us-east-1]"
    echo "  -h, --help                       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --stack-name alexa-llm-chat-dev --environment dev"
    echo "  $0 -s alexa-llm-chat-prod -e prod -n admin@example.com"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        -s|--stack-name)
            STACK_NAME="$2"
            shift 2
            ;;
        -n|--notifications)
            EMAIL_NOTIFICATIONS="$2"
            shift 2
            ;;
        -r|--region)
            REGION="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Validate required parameters
if [[ -z "$STACK_NAME" ]]; then
    print_error "Stack name is required. Use --stack-name option."
    show_usage
    exit 1
fi

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(dev|staging|prod)$ ]]; then
    print_error "Environment must be one of: dev, staging, prod"
    exit 1
fi

print_info "Setting up monitoring for Alexa LLM Chat skill..."
print_info "Environment: $ENVIRONMENT"
print_info "Stack Name: $STACK_NAME"
print_info "Region: $REGION"

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    print_error "AWS CLI is not installed. Please install it first."
    exit 1
fi

# Check if user is authenticated
if ! aws sts get-caller-identity &> /dev/null; then
    print_error "AWS CLI is not configured or you're not authenticated."
    print_error "Please run 'aws configure' first."
    exit 1
fi

# Get stack outputs to verify the main stack exists
print_info "Checking if main stack exists..."
if ! aws cloudformation describe-stacks --stack-name "$STACK_NAME" --region "$REGION" &> /dev/null; then
    print_error "Stack '$STACK_NAME' not found in region '$REGION'."
    print_error "Please deploy the main application stack first."
    exit 1
fi

# Get Lambda function name from stack outputs
LAMBDA_FUNCTION_NAME=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='AlexaLLMChatFunction'].OutputValue" \
    --output text)

if [[ -z "$LAMBDA_FUNCTION_NAME" ]]; then
    print_error "Could not find Lambda function in stack outputs."
    exit 1
fi

# Extract function name from ARN
LAMBDA_FUNCTION_NAME=$(echo "$LAMBDA_FUNCTION_NAME" | sed 's/.*function:\([^:]*\).*/\1/')

print_info "Found Lambda function: $LAMBDA_FUNCTION_NAME"

# Get table names from stack outputs
CONVERSATION_TABLE=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='ConversationContextTable'].OutputValue" \
    --output text)

SUBSCRIPTION_TABLE=$(aws cloudformation describe-stacks \
    --stack-name "$STACK_NAME" \
    --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='SubscriptionStatusTable'].OutputValue" \
    --output text)

print_info "Found DynamoDB tables:"
print_info "  Conversation Context: $CONVERSATION_TABLE"
print_info "  Subscription Status: $SUBSCRIPTION_TABLE"

# Check if monitoring stack already exists
MONITORING_STACK_NAME="${STACK_NAME}-monitoring"
if aws cloudformation describe-stacks --stack-name "$MONITORING_STACK_NAME" --region "$REGION" &> /dev/null; then
    print_warning "Monitoring stack '$MONITORING_STACK_NAME' already exists."
    read -p "Do you want to update it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Monitoring setup cancelled."
        exit 0
    fi
    STACK_OPERATION="update-stack"
else
    STACK_OPERATION="create-stack"
fi

# Prepare CloudFormation parameters
PARAMETERS="ParameterKey=SkillName,ParameterValue=alexa-llm-chat"
PARAMETERS="$PARAMETERS ParameterKey=Environment,ParameterValue=$ENVIRONMENT"
PARAMETERS="$PARAMETERS ParameterKey=LambdaFunctionName,ParameterValue=$LAMBDA_FUNCTION_NAME"
PARAMETERS="$PARAMETERS ParameterKey=ConversationContextTableName,ParameterValue=$CONVERSATION_TABLE"
PARAMETERS="$PARAMETERS ParameterKey=SubscriptionStatusTableName,ParameterValue=$SUBSCRIPTION_TABLE"

# Deploy monitoring stack
print_info "Deploying monitoring stack..."
aws cloudformation $STACK_OPERATION \
    --stack-name "$MONITORING_STACK_NAME" \
    --template-body file://deploy/monitoring-config.yaml \
    --parameters $PARAMETERS \
    --region "$REGION" \
    --capabilities CAPABILITY_IAM

# Wait for stack operation to complete
print_info "Waiting for stack operation to complete..."
aws cloudformation wait stack-${STACK_OPERATION%-stack}-complete \
    --stack-name "$MONITORING_STACK_NAME" \
    --region "$REGION"

if [[ $? -eq 0 ]]; then
    print_info "Monitoring stack deployed successfully!"
else
    print_error "Stack operation failed. Check CloudFormation console for details."
    exit 1
fi

# Get dashboard URL
DASHBOARD_URL=$(aws cloudformation describe-stacks \
    --stack-name "$MONITORING_STACK_NAME" \
    --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='DashboardURL'].OutputValue" \
    --output text)

# Get SNS topic ARNs
ERROR_TOPIC_ARN=$(aws cloudformation describe-stacks \
    --stack-name "$MONITORING_STACK_NAME" \
    --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='ErrorNotificationTopicArn'].OutputValue" \
    --output text)

PERFORMANCE_TOPIC_ARN=$(aws cloudformation describe-stacks \
    --stack-name "$MONITORING_STACK_NAME" \
    --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='PerformanceNotificationTopicArn'].OutputValue" \
    --output text)

print_info "Monitoring setup completed!"
print_info ""
print_info "Dashboard URL: $DASHBOARD_URL"
print_info ""
print_info "SNS Topics created:"
print_info "  Error Notifications: $ERROR_TOPIC_ARN"
print_info "  Performance Notifications: $PERFORMANCE_TOPIC_ARN"

# Subscribe to SNS topics if email provided
if [[ -n "$EMAIL_NOTIFICATIONS" ]]; then
    print_info ""
    print_info "Subscribing $EMAIL_NOTIFICATIONS to notification topics..."
    
    aws sns subscribe \
        --topic-arn "$ERROR_TOPIC_ARN" \
        --protocol email \
        --notification-endpoint "$EMAIL_NOTIFICATIONS" \
        --region "$REGION"
    
    aws sns subscribe \
        --topic-arn "$PERFORMANCE_TOPIC_ARN" \
        --protocol email \
        --notification-endpoint "$EMAIL_NOTIFICATIONS" \
        --region "$REGION"
    
    print_info "Email subscriptions created. Please check your email and confirm the subscriptions."
fi

print_info ""
print_info "Monitoring features enabled:"
print_info "  ✓ CloudWatch Dashboard with key metrics"
print_info "  ✓ Error rate alarms (threshold: 5 errors in 10 minutes)"
print_info "  ✓ High duration alarms (threshold: 6 seconds average)"
print_info "  ✓ Lambda throttle alarms"
print_info "  ✓ Business metrics tracking (conversations, subscriptions, usage limits)"
print_info "  ✓ Log-based metric filters for business intelligence"
print_info ""
print_info "Next steps:"
print_info "  1. Visit the dashboard URL to view metrics"
print_info "  2. Confirm email subscriptions if you provided an email address"
print_info "  3. Customize alarm thresholds if needed via CloudFormation"
print_info "  4. Set up additional monitoring as required"

print_info ""
print_info "Monitoring setup complete! 🎉"