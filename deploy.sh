#!/bin/bash
set -e

AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

echo "🚀 Starting deployment to AWS Account: $AWS_ACCOUNT_ID in region: $AWS_REGION"

# Install CDK dependencies
echo "📦 Installing CDK dependencies..."
npm install

# Deploy the stack
echo "🏗️  Deploying Cortex Performance Engine Stack..."
npx cdk deploy --all --require-approval never

echo "✅ Deployment complete!"
echo "📊 Check AWS Console for CloudFormation outputs"
