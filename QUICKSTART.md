# Quick Start - Deploy to AWS

## Prerequisites Check

```bash
# Check Node.js (need 18+)
node --version

# Check AWS CLI
aws --version

# Check if AWS is configured
aws sts get-caller-identity
```

## Deploy in 3 Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Bootstrap CDK (First time only)
```bash
# Get your account ID
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Bootstrap
cdk bootstrap aws://$AWS_ACCOUNT_ID/us-east-1
```

### 3. Deploy
```bash
# Option A: Use the script
chmod +x deploy.sh
./deploy.sh

# Option B: Direct CDK command
npx cdk deploy --all
```

## What Gets Deployed?

- ✅ S3 Bucket for test artifacts
- ✅ SNS Topic for notifications
- ✅ VPC with 2 availability zones
- ✅ ECS Cluster with n8n workflow automation
- ✅ Lambda functions for AI agents
- ✅ Step Functions state machine
- ✅ CloudWatch log groups

## After Deployment

Check the outputs:
```bash
aws cloudformation describe-stacks \
  --stack-name CortexPerformancePlatformStack \
  --query 'Stacks[0].Outputs' \
  --output table
```

## Troubleshooting

**Error: "Unable to resolve AWS account"**
```bash
aws configure
```

**Error: "Need to perform AWS calls for account"**
```bash
cdk bootstrap
```

**Error: "Stack already exists"**
```bash
npx cdk deploy --all --force
```

## Clean Up

Remove all resources:
```bash
npx cdk destroy --all
```
