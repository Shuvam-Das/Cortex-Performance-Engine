# ✅ Repository Ready for Local Deployment

## What's Been Prepared

✅ CDK infrastructure code (iac-stack.ts)
✅ Lambda agents (4 agents in agentic-system/)
✅ Package dependencies configured
✅ Deployment scripts ready
✅ Simplified stack (removed complex components for initial deploy)

## Deploy on Your Local Machine

### Prerequisites (Install These First)

1. **Node.js 18+**: https://nodejs.org/
2. **AWS CLI**: https://aws.amazon.com/cli/
3. **Git**: https://git-scm.com/

### Step 1: Clone Repository

```bash
git clone https://github.com/Shuvam-Das/Cortex-Performance-Engine.git
cd Cortex-Performance-Engine
```

### Step 2: Configure AWS

```bash
aws configure
```

Enter when prompted:
- AWS Access Key ID: [Your key]
- AWS Secret Access Key: [Your secret]
- Default region: us-east-1
- Default output format: json

### Step 3: Deploy (3 Commands)

```bash
# Install dependencies
npm install

# Bootstrap CDK (one-time)
npx cdk bootstrap

# Deploy to AWS
npx cdk deploy --all
```

### Step 4: Monitor

Watch the terminal. Deployment takes ~10-15 minutes.

## What Gets Deployed

- ✅ S3 Bucket (for artifacts)
- ✅ SNS Topic (for notifications)
- ✅ VPC (2 availability zones)
- ✅ ECS Cluster
- ✅ 4 Lambda Functions (agents)
- ✅ Step Functions State Machine
- ✅ CloudWatch Logs
- ✅ IAM Roles

## After Deployment

Check outputs:
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

**Error: "Need to perform AWS calls"**
```bash
npx cdk bootstrap
```

**Error: "Stack already exists"**
```bash
npx cdk deploy --all --force
```

## Clean Up (Remove Everything)

```bash
npx cdk destroy --all
```

## Cost Estimate

- Lambda: ~$0.20/month (free tier eligible)
- S3: ~$0.50/month
- VPC: Free
- Step Functions: ~$0.10/month
- Total: ~$1-2/month (mostly free tier)

## Next Steps After Deployment

1. View Step Functions: AWS Console → Step Functions
2. View Lambda Functions: AWS Console → Lambda
3. View Logs: AWS Console → CloudWatch
4. Subscribe to SNS topic for notifications

## Support

Issues? Check:
- AWS credentials are valid
- Node.js version is 18+
- You have internet connection
- AWS account has no restrictions
