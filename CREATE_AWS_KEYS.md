# Create AWS Access Keys for GitHub Actions

## Option 1: IAM User (Simple)

### Step 1: Create IAM User
```bash
# In AWS CloudShell
aws iam create-user --user-name github-actions-deployer
```

### Step 2: Attach Admin Policy
```bash
aws iam attach-user-policy \
  --user-name github-actions-deployer \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess
```

### Step 3: Create Access Keys
```bash
aws iam create-access-key --user-name github-actions-deployer
```

**Copy the output:**
- `AccessKeyId` → Use as `AWS_ACCESS_KEY_ID`
- `SecretAccessKey` → Use as `AWS_SECRET_ACCESS_KEY`

## Option 2: OIDC (Recommended - No Keys Needed)

Use the OIDC setup already in your deploy.yml file. Just create the role:

```bash
# Get your GitHub repo details
GITHUB_ORG="Shuvam-Das"
GITHUB_REPO="Cortex-Performance-Engine"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Create trust policy
cat > trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:${GITHUB_ORG}/${GITHUB_REPO}:ref:refs/heads/main"
        }
      }
    }
  ]
}
EOF

# Create OIDC provider (if not exists)
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 \
  2>/dev/null || echo "OIDC provider already exists"

# Create role
aws iam create-role \
  --role-name GitHubActionsDeployRole \
  --assume-role-policy-document file://trust-policy.json

# Attach admin policy
aws iam attach-role-policy \
  --role-name GitHubActionsDeployRole \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess

# Get role ARN
aws iam get-role --role-name GitHubActionsDeployRole --query 'Role.Arn' --output text
```

Then update `.github/workflows/deploy.yml` with the role ARN.

## Quick Choice

**Use Option 1** if you want to deploy now (5 minutes).
**Use Option 2** for production (more secure, no keys to manage).
