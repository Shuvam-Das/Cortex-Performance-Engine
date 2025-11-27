#!/bin/bash
# Run this in AWS CloudShell

ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

cat > trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": {
      "Federated": "arn:aws:iam::${ACCOUNT_ID}:oidc-provider/token.actions.githubusercontent.com"
    },
    "Action": "sts:AssumeRoleWithWebIdentity",
    "Condition": {
      "StringEquals": {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
        "token.actions.githubusercontent.com:sub": "repo:Shuvam-Das/Cortex-Performance-Engine:ref:refs/heads/main"
      }
    }
  }]
}
EOF

aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1 \
  2>/dev/null || echo "✓ OIDC provider exists"

aws iam create-role \
  --role-name GitHubActionsDeployRole \
  --assume-role-policy-document file://trust-policy.json

aws iam attach-role-policy \
  --role-name GitHubActionsDeployRole \
  --policy-arn arn:aws:iam::aws:policy/AdministratorAccess

echo ""
echo "✓ Role created. Use this ARN in deploy.yml:"
aws iam get-role --role-name GitHubActionsDeployRole --query 'Role.Arn' --output text
