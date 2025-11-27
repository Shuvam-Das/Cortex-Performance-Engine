# E-Commerce Suite: Web App & Performance Platform

This repository contains a complete, production-ready e-commerce ecosystem, designed for cost-optimized and automated deployment on AWS. It consists of two main projects:

1.  **`ecommerce-webapp/`**: A modern, serverless e-commerce application built with React and Python (FastAPI).
2.  **`performance-platform/`**: A sophisticated, AI-driven testing platform that uses a chatbot interface to run performance tests and chaos engineering experiments against the web app.

## High-Level Architecture

The **Cortex Performance Platform** is an independent system that intelligently tests the **E-Commerce Web Application**. It reads the application's logs to learn its behavior, generates test scripts, applies load to its public endpoints, and produces an analysis report.

---

## 1. E-Commerce Web Application (`ecommerce-webapp/`)

A fully functional online store.

-   **Backend**: A scalable API built with **Python (FastAPI)**, deployed as a container on AWS.
-   **Deployment**: The entire application is defined as Infrastructure as Code in the `ecommerce-webapp/iac` directory using the **AWS CDK**.

### Key Features
-   Structured JSON logging for easy analysis by the performance platform.
-   Containerized backend for consistent deployments.

---

## 2. Cortex Performance Engine (`performance-platform/`)

An intelligent, agentic system for ensuring the resilience and performance of the e-commerce application.

### Key Features

-   **Chatbot Interface (AWS Lex)**: Users interact with a chatbot to define and launch tests. No complex dashboards needed.
    -   **Example Interaction**: *"Run a stress test with 500 users for 10 minutes."* or *"Inject 200ms of latency into the database for 5 minutes."*
-   **AI-Powered Automation (Amazon Bedrock)**:
    -   **Log Analysis**: Learns user behavior from application logs.
    -   **Script Generation**: Automatically creates complex JMeter test scripts.
    -   **Intelligent Reporting**: Correlates test results with server metrics to produce a report with actionable observations and recommendations.
-   **Decoupled Notifications**: The pipeline publishes completion messages to an **Amazon SNS topic**, allowing any service (like email, Slack via n8n, or Jira) to subscribe and react to test results without being tightly coupled to the system.
-   **Serverless & Cost-Optimized**: The entire platform runs on **AWS Step Functions**, **Lambda**, and **Fargate Spot**, ensuring minimal cost and zero server management.

---

## 🚀 Automated AWS Deployment

This repository is configured for continuous deployment using the `deploy.yml` GitHub Actions workflow.

### Prerequisites

1.  **AWS Account & IAM User**: You need an active AWS account and an IAM user with programmatic access and `AdministratorAccess` permissions for the initial deployment.

2.  **One-Time CDK Bootstrap**: Before the first deployment, you must prepare your AWS account for the CDK by running the bootstrap command. **This only needs to be done once per account/region.**
    ```bash
    # Replace ACCOUNT-ID and REGION with your specific AWS details
    # Example: cdk bootstrap aws://123456789012/us-east-1
    cdk bootstrap aws://ACCOUNT-ID/REGION
    ```
    *Note: You must have Node.js and the AWS CDK installed locally to run this command (`npm install -g aws-cdk`).*

3.  **GitHub Secrets**: You must configure the following secrets in your GitHub repository settings (`Settings > Secrets and variables > Actions`):
    -   `AWS_ACCESS_KEY_ID`: Your IAM user's access key.
    -   `AWS_SECRET_ACCESS_KEY`: Your IAM user's secret key.

### How it Works

On any push to the `main` branch, the `deploy.yml` GitHub Actions workflow will automatically:

1.  **Log in to AWS** and the Amazon Elastic Container Registry (ECR).
2.  **Build Docker Images** for the JMeter test executor and the e-commerce backend.
3.  **Push Images** to their respective ECR repositories.
4.  **Deploy Stacks via AWS CDK**:
    -   Install Node.js dependencies for each `iac` directory.
    -   Run `cdk deploy` to create or update all the AWS resources for both the e-commerce app and the performance platform.

## 🤖 Monitoring

 - **Live Status**: The **AWS Step Functions** console provides a real-time visual graph of the testing pipeline's execution.
 - **Live Logs**: All logs (from both the web app and the testing agents) are streamed to **Amazon CloudWatch** for live monitoring and querying with Logs Insights.
 - **Notification Endpoint**: After deployment, the ARN for the `CortexNotificationsTopic` will be available in the CloudFormation outputs. You can subscribe your `n8n` webhook or an email address to this topic to receive test results automatically.