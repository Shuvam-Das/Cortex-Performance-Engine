# AWS Deployment Guide

## Quick Start

### 1. Install Prerequisites

```bash
# Install Node.js dependencies
npm install

# Install AWS CDK globally (if not already installed)
npm install -g aws-cdk
```

### 2. Configure AWS Credentials

```bash
# Configure AWS CLI with your credentials
aws configure
```

Enter your:
- AWS Access Key ID
- AWS Secret Access Key
- Default region (e.g., us-east-1)
- Default output format (json)

### 3. Bootstrap CDK (One-time only)

```bash
# Get your AWS account ID
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Bootstrap CDK
cdk bootstrap aws://$AWS_ACCOUNT_ID/us-east-1
```

### 4. Deploy

#### Option A: Using the deployment script
```bash
chmod +x deploy.sh
./deploy.sh
```

#### Option B: Manual CDK deployment
```bash
npm install
npx cdk deploy --all
```

## Post-Deployment

After deployment completes, check the CloudFormation outputs:

```bash
aws cloudformation describe-stacks --stack-name PerformancePlatformStack --query 'Stacks[0].Outputs'
```

You'll get:
- **NotificationsTopicArn**: Subscribe to this SNS topic for test notifications
- **CortexEngineStaticEndpoint**: The n8n workflow automation endpoint

## GitHub Actions Deployment

For automated deployment on every push to `main`:

1. Go to your GitHub repository settings
2. Navigate to `Settings > Secrets and variables > Actions`
3. Add these secrets:
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
4. Push to `main` branch - deployment will run automatically

## Monitoring

- **Step Functions**: https://console.aws.amazon.com/states/
- **CloudWatch Logs**: https://console.aws.amazon.com/cloudwatch/
- **ECS Services**: https://console.aws.amazon.com/ecs/

## Cleanup

To remove all resources:

```bash
npx cdk destroy --all
```
