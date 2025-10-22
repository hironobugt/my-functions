#!/bin/bash

# Alexa Skill Deployment Script
# This script deploys the Alexa skill configuration using ASK CLI

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if ASK CLI is installed
check_ask_cli() {
    print_status "Checking ASK CLI installation..."
    if ! command -v ask &> /dev/null; then
        print_error "ASK CLI is not installed. Please install it first:"
        echo "npm install -g ask-cli"
        echo "ask configure"
        exit 1
    fi
    print_success "ASK CLI is installed"
}

# Check if user is logged in to ASK CLI
check_ask_auth() {
    print_status "Checking ASK CLI authentication..."
    if ! ask util get-profile &> /dev/null; then
        print_error "ASK CLI is not configured. Please run:"
        echo "ask configure"
        exit 1
    fi
    print_success "ASK CLI is authenticated"
}

# Validate skill package
validate_skill_package() {
    print_status "Validating skill package..."
    
    # Check required files
    local required_files=(
        "skill-package/skill.json"
        "skill-package/interactionModels/custom/en-US.json"
        "skill-package/isps/entitlement/premium_subscription.json"
    )
    
    for file in "${required_files[@]}"; do
        if [[ ! -f "$file" ]]; then
            print_error "Required file missing: $file"
            exit 1
        fi
    done
    
    print_success "Skill package validation passed"
}

# Update Lambda endpoint in skill.json
update_lambda_endpoint() {
    local environment=${1:-dev}
    print_status "Updating Lambda endpoint for environment: $environment"
    
    # Get Lambda function ARN from AWS
    local function_name="alexa-llm-chat-${environment}"
    local lambda_arn
    
    if lambda_arn=$(aws lambda get-function --function-name "$function_name" --query 'Configuration.FunctionArn' --output text 2>/dev/null); then
        print_status "Found Lambda function ARN: $lambda_arn"
        
        # Update skill.json with the correct ARN
        # Note: This is a simplified approach. In production, you might want to use jq or a more robust JSON parser
        sed -i.bak "s|arn:aws:lambda:us-east-1:YOUR_ACCOUNT_ID:function:alexa-llm-chat-dev|$lambda_arn|g" skill-package/skill.json
        
        print_success "Updated Lambda endpoint in skill.json"
    else
        print_warning "Could not find Lambda function: $function_name"
        print_warning "Please update the Lambda ARN manually in skill-package/skill.json"
    fi
}

# Deploy skill
deploy_skill() {
    local environment=${1:-dev}
    print_status "Deploying Alexa skill for environment: $environment"
    
    # Create or update skill
    if [[ -f ".ask/ask-states.json" ]]; then
        print_status "Updating existing skill..."
        ask deploy --target skill
    else
        print_status "Creating new skill..."
        ask deploy --target skill
        
        # Save skill ID for later use
        local skill_id
        if skill_id=$(ask util get-skill-id); then
            print_success "Skill created with ID: $skill_id"
            
            # Update AWS Parameter Store with skill ID
            aws ssm put-parameter \
                --name "/alexa-llm-chat/${environment}/skill-id" \
                --value "$skill_id" \
                --overwrite \
                --type "String" || print_warning "Could not update Parameter Store with skill ID"
        fi
    fi
}

# Deploy ISP products
deploy_isp() {
    print_status "Deploying In-Skill Purchase products..."
    
    # Deploy ISP products
    ask deploy --target isp
    
    print_success "ISP products deployed"
}

# Enable skill for testing
enable_skill_testing() {
    print_status "Enabling skill for testing..."
    
    local skill_id
    if skill_id=$(ask util get-skill-id); then
        ask api enable-skill --skill-id "$skill_id" --stage development
        print_success "Skill enabled for testing"
    else
        print_warning "Could not get skill ID for testing enablement"
    fi
}

# Main deployment function
main() {
    local environment=${1:-dev}
    
    echo "=================================================="
    echo "🚀 Alexa Skill Deployment"
    echo "Environment: $environment"
    echo "=================================================="
    
    # Pre-deployment checks
    check_ask_cli
    check_ask_auth
    validate_skill_package
    
    # Update configuration
    update_lambda_endpoint "$environment"
    
    # Deploy components
    deploy_skill "$environment"
    deploy_isp
    enable_skill_testing
    
    print_success "Alexa skill deployment completed!"
    echo ""
    echo "Next steps:"
    echo "1. Test your skill in the Alexa Developer Console"
    echo "2. Test voice interactions using 'ask dialog'"
    echo "3. Submit for certification when ready"
    echo ""
    echo "Useful commands:"
    echo "- ask dialog --locale en-US (test conversations)"
    echo "- ask api get-skill-status --skill-id <skill-id> (check status)"
    echo "- ask api simulate-skill --skill-id <skill-id> --text 'open ai chat' (simulate)"
}

# Show usage if no arguments provided
if [[ $# -eq 0 ]]; then
    echo "Usage: $0 [environment]"
    echo "Environment: dev (default), staging, prod"
    echo ""
    echo "Example: $0 dev"
    exit 1
fi

# Run main function with provided arguments
main "$@"