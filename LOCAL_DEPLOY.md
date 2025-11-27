# Deploy from Local Machine - Easiest Method

## Prerequisites (5 minutes)

1. **Install Node.js 18+**: https://nodejs.org
2. **Install AWS CLI**: https://aws.amazon.com/cli/
3. **Configure AWS CLI**:
   ```bash
   aws configure
   ```
   Enter your AWS credentials when prompted.

## Deploy (3 commands)

```bash
# 1. Install dependencies
npm install

# 2. Bootstrap CDK (one-time)
npx cdk bootstrap

# 3. Deploy
npx cdk deploy --all
```

That's it! No GitHub secrets needed.

## Full Steps

### 1. Clone Repository
```bash
git clone https://github.com/Shuvam-Das/Cortex-Performance-Engine.git
cd Cortex-Performance-Engine
```

### 2. Configure AWS
```bash
aws configure
# Enter:
# - AWS Access Key ID
# - AWS Secret Access Key  
# - Region: us-east-1
# - Output: json
```

### 3. Deploy
```bash
npm install
npx cdk bootstrap
npx cdk deploy --all
```

### 4. Monitor
Watch the deployment in your terminal. Takes ~10-15 minutes.

## Verify Deployment

```bash
aws cloudformation describe-stacks --stack-name CortexPerformancePlatformStack
```

## Update Later

```bash
git pull
npx cdk deploy --all
```

## Remove Everything

```bash
npx cdk destroy --all
```

## Why This is Easier

✅ No GitHub secrets setup
✅ No GitHub Actions configuration
✅ Uses your existing AWS credentials
✅ Faster feedback (see errors immediately)
✅ Works with restricted corporate AWS accounts
