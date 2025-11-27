# AWS Deployment - Restricted Account Workaround

Your AWS account has Service Control Policies that prevent IAM user creation.

## Solution: Contact Your AWS Administrator

Ask your AWS admin for:

### Option 1: Existing IAM User Credentials
Request access keys for an existing IAM user with these permissions:
- `AdministratorAccess` OR
- Custom policy with: CDK, CloudFormation, Lambda, S3, EC2, VPC, ECS, SNS, Step Functions

### Option 2: Request Admin to Create User
Ask admin to run:
```bash
aws iam create-user --user-name github-deployer-YOUR_NAME
aws iam attach-user-policy --user-name github-deployer-YOUR_NAME --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
aws iam create-access-key --user-name github-deployer-YOUR_NAME
```

### Option 3: Use Your Current Credentials
If you have AWS CLI access locally (not CloudShell):
```bash
# Check if you have credentials
cat ~/.aws/credentials

# If yes, use those values:
# aws_access_key_id = YOUR_KEY
# aws_secret_access_key = YOUR_SECRET
```

## After Getting Credentials

Add to GitHub Secrets:
1. Go to: https://github.com/Shuvam-Das/Cortex-Performance-Engine/settings/secrets/actions
2. Add `AWS_ACCESS_KEY_ID`
3. Add `AWS_SECRET_ACCESS_KEY`
4. Push code to trigger deployment

## Alternative: Deploy Locally

If you can't get credentials for GitHub Actions:
```bash
# On your local machine with AWS configured
npm install
npx cdk bootstrap
npx cdk deploy --all
```
