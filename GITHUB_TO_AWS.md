# Move Solution from GitHub to AWS

## Step 1: Configure GitHub Secrets

1. Go to: https://github.com/Shuvam-Das/Cortex-Performance-Engine/settings/secrets/actions
2. Click "New repository secret"
3. Add these two secrets:

   **Secret 1:**
   - Name: `AWS_ACCESS_KEY_ID`
   - Value: Your AWS access key

   **Secret 2:**
   - Name: `AWS_SECRET_ACCESS_KEY`
   - Value: Your AWS secret key

## Step 2: Bootstrap AWS CDK (One-time)

Run locally or in AWS CloudShell:
```bash
npx cdk bootstrap aws://YOUR-ACCOUNT-ID/us-east-1
```

## Step 3: Push to GitHub

```bash
git add .
git commit -m "Add AWS deployment configuration"
git push origin main
```

## Step 4: Monitor Deployment

Watch the deployment at:
https://github.com/Shuvam-Das/Cortex-Performance-Engine/actions

## What Happens

When you push to `main`:
1. GitHub Actions triggers automatically
2. Installs dependencies
3. Deploys infrastructure to AWS using CDK
4. Creates all AWS resources

## Manual Trigger

You can also trigger deployment manually:
1. Go to Actions tab
2. Select "Deploy to AWS" workflow
3. Click "Run workflow"
