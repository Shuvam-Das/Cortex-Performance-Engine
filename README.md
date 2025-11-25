# Cortex Performance Engine

This repository contains a complete, production-ready cloud ecosystem, designed for cost-optimized and automated deployment on AWS. It consists of two main, independent projects:

1.  **`ecommerce-webapp/`**: A modern, serverless e-commerce application built with React and Python (FastAPI). This application serves as the target for our testing platform.
2.  **`performance-platform/`**: The **Cortex Performance Engine** itself. A sophisticated, AI-driven testing platform that uses a chatbot interface (**AWS Lex**), generative AI (**Amazon Bedrock**), and a self-hosted workflow engine (**n8n on AWS Fargate**) to run performance and chaos engineering tests.

This architecture ensures a clean separation of concerns between the application being tested and the intelligent tool that tests it.

---

## 1. E-Commerce Web Application (`ecommerce-webapp/`)

A fully functional online store designed for cloud-native deployment. It is built to generate realistic production logs that the performance platform can analyze.

-   **Frontend**: A responsive user interface built with **React**.
-   **Backend**: A scalable API built with **Python (FastAPI)**.
-   **Deployment**: Fully automated via the AWS CDK, deploying to a serverless stack (API Gateway, Lambda, S3, CloudFront) with production-ready caching and security policies.

---

## 2. Cortex Performance Engine (`performance-platform/`)

An intelligent, agentic system for ensuring the resilience and performance of any target application.

### Key Features

-   **Chatbot Interface (AWS Lex)**: Users interact with a chatbot to define and launch tests. No complex dashboards needed.
    -   **Example Interaction**: *"Run a stress test with 500 users for 10 minutes."* or *"Inject 200ms of latency into the database for 5 minutes."*
-   **Generative AI Scripting (Amazon Bedrock)**: The `ScriptGenerator` agent uses a Bedrock model to generate complete, complex JMeter JMX files from natural language and real log data.
-   **AI-Powered Reporting (Amazon Bedrock)**: The `ReportSynthesizer` agent uses Bedrock to analyze test results and server-side metrics, acting as an expert performance engineer to write reports with root cause analysis and actionable recommendations.
-   **Chaos Engineering**: Injects failures (e.g., CPU stress, latency, errors) into the live AWS environment to test system resilience, orchestrated via **AWS Systems Manager**.
-   **Secure, Extensible Notifications (n8n on Fargate)**: A final workflow step calls a webhook on your **private, self-hosted n8n instance** to create Jira tickets, send rich Slack messages, or log results to external systems.
-   **Serverless & Cost-Optimized**: The entire platform runs on **AWS Step Functions**, **Lambda**, and **Fargate Spot**, ensuring minimal cost.

---

## 🚀 Automated AWS Deployment (CI/CD)

Both applications are designed to be deployed automatically via a CI/CD pipeline (e.g., GitHub Actions) using the **AWS CDK** stacks located in their respective `iac/` directories.

### Deployment Steps (High-Level)

1.  **Configure AWS Credentials** for your CI/CD environment.
2.  **Bootstrap AWS CDK** in your target AWS account and region.
3.  **Push to the `main` branch**: A CI/CD pipeline should be configured to automatically:
    -   Build and push any necessary container images to **Amazon ECR**.
    -   Deploy the `ecommerce-webapp` stack.
    -   Deploy the `performance-platform` stack.

## 🤖 Monitoring

 - **Live Status**: The **AWS Step Functions** console provides a real-time, visual graph of the testing pipeline's execution.
 - **Live Logs**: All logs from all agents are streamed to **Amazon CloudWatch** for live monitoring and can be queried using CloudWatch Logs Insights.