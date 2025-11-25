import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lex from 'aws-cdk-lib/aws-lex';

export class PerformancePlatformStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 Bucket for artifacts and logs
    const artifactsBucket = new s3.Bucket(this, 'ArtifactsBucket');

    // IAM Role for Lambda Agents
    const lambdaAgentRole = new iam.Role(this, 'LambdaAgentRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMFullAccess'), // For Chaos Agent
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonBedrockFullAccess'), // Grant access to Bedrock
      ],
    });
    artifactsBucket.grantReadWrite(lambdaAgentRole);

    // Lambda Agents
    const createLambdaAgent = (name: string, folder: string) => {
      return new lambda.Function(this, name, {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset(`../agents/${folder}`),
        role: lambdaAgentRole,
        environment: { S3_BUCKET: artifactsBucket.bucketName },
        timeout: cdk.Duration.minutes(2),
      });
    };

    const logAnalyzer = createLambdaAgent('LogAnalyzerAgent', 'log-analyzer');
    const scriptGenerator = createLambdaAgent('ScriptGeneratorAgent', 'script-generator');
    const reportSynthesizer = createLambdaAgent('ReportSynthesizerAgent', 'report-synthesizer');
    const chaosAgent = createLambdaAgent('ChaosAgent', 'chaos-agent');

    // Fargate Task for JMeter Test Executor
    const ecsCluster = new ecs.Cluster(this, 'AgentCluster');
    const testExecutorRepo = ecr.Repository.fromRepositoryName(this, 'TestExecutorRepo', 'test-executor');
    const testExecutorTaskDef = new ecs.FargateTaskDefinition(this, 'TestExecutorTaskDef');
    testExecutorTaskDef.addContainer('TestExecutorContainer', {
      image: ecs.ContainerImage.fromEcrRepository(testExecutorRepo, 'latest'),
      logging: new ecs.AwsLogDriver({ streamPrefix: 'TestExecutor' }),
    });
    artifactsBucket.grantReadWrite(testExecutorTaskDef.taskRole);

    const testExecutorTask = new tasks.EcsRunTask(this, 'RunTestExecutorTask', {
      integrationPattern: sfn.IntegrationPattern.RUN_JOB,
      cluster: ecsCluster,
      taskDefinition: testExecutorTaskDef,
      launchTarget: new tasks.EcsFargateLaunchTarget({ platformVersion: ecs.FargatePlatformVersion.LATEST }),
      capacityProviderStrategies: [{ capacityProvider: 'FARGATE_SPOT', weight: 1 }],
    });

    // Step Function State Machine Definition
    const startTest = new tasks.LambdaInvoke(this, 'RunLogAnalyzer', { lambdaFunction: logAnalyzer })
      .next(new tasks.LambdaInvoke(this, 'RunScriptGenerator', { lambdaFunction: scriptGenerator }))
      .next(testExecutorTask)
      .next(new tasks.LambdaInvoke(this, 'RunReportSynthesizer', { lambdaFunction: reportSynthesizer }));

    const startChaos = new tasks.LambdaInvoke(this, 'RunChaosExperiment', { lambdaFunction: chaosAgent });

    const mainChoice = new sfn.Choice(this, 'TestTypeChoice')
      .when(sfn.Condition.stringEquals('$.testType', 'CHAOS'), startChaos)
      .otherwise(startTest);

    const stateMachine = new sfn.StateMachine(this, 'PerformanceAndChaosMachine', {
      definition: mainChoice,
    });

    // AWS Lex Bot to trigger the State Machine
    const botRole = new iam.Role(this, 'LexBotRole', { assumedBy: new iam.ServicePrincipal('lexv2.amazonaws.com') });
    stateMachine.grantStartExecution(botRole);

    new lex.CfnBot(this, 'PerformanceChatBot', {
      name: 'PerformanceChatBot',
      roleArn: botRole.roleArn,
      dataPrivacy: { ChildDirected: false },
      idleSessionTtlInSeconds: 300,
      locales: [{
        localeId: 'en_US',
        nluConfidenceThreshold: 0.40,
        intents: [
          // In the AWS Lex Console, you will configure this intent.
          // When a user says "run a load test", this intent will be triggered.
          // You will then configure this intent's fulfillment to invoke a Lambda function,
          // which in turn starts the 'PerformanceAndChaosMachine' Step Function
          // with the appropriate input.
        ],
      }],
    });
  }
}

```

---

### **Part 3: Create the Master `README.md`**

Finally, a new root-level `README.md` will explain the entire ecosystem.

```diff
--- /dev/null
+++ b / README.md
@@ -0, 0 + 1, 75 @@
# E - Commerce Suite: Web App & Performance Platform

This repository contains a complete, production - ready e - commerce ecosystem, designed for cost - optimized and automated deployment on AWS.It consists of two main projects:

1. ** `ecommerce-webapp/` **: A modern, serverless e - commerce application built with React and Python(FastAPI).
2. ** `performance-platform/` **: A sophisticated, AI - driven testing platform that uses a chatbot interface to run performance tests and chaos engineering experiments against the web app.

## High - Level Architecture

!Architecture Diagram

---

## 1. E - Commerce Web Application(`ecommerce-webapp/`)

A fully functional online store.

-   ** Frontend **: A responsive user interface built with ** React **.
-   ** Backend **: A scalable API built with ** Python(FastAPI) **.
-   ** Deployment **: Designed for serverless deployment using ** AWS Lambda ** and ** Amazon API Gateway **.

### Key Features
  - Structured JSON logging for easy analysis.
- Separate frontend and backend for independent scaling and deployment.

---

## 2. Performance & Chaos Platform(`performance-platform/`)

An intelligent, agentic system for ensuring the resilience and performance of the e - commerce application.

### Key Features

  -   ** Chatbot Interface(AWS Lex) **: Users interact with a chatbot to define and launch tests.No complex dashboards needed.
    -   ** Example Interaction **: * "Run a stress test with 500 users for 10 minutes." * or * "Inject 200ms of latency into the database for 5 minutes." *
-   ** Automated JMeter Scripting **: Automatically generates complex JMeter scripts with correlation, parameterization, pacing, and think time based on chatbot input and production log analysis.
-   ** Chaos Engineering **: Injects failures(e.g., CPU stress, latency, errors) into the live AWS environment to test system resilience, orchestrated via ** AWS Systems Manager **.
-   ** Intelligent Reporting **: Combines JMeter results with server - side metrics(** CloudWatch **) to produce a report with actionable observations and recommendations.
-   ** Serverless & Cost - Optimized **: The entire platform runs on ** AWS Step Functions **, ** Lambda **, and ** Fargate Spot **, ensuring minimal cost.

---

## 🚀 AWS Deployment

Both applications are designed to be deployed automatically via a CI / CD pipeline(e.g., GitHub Actions) using the ** AWS CDK ** stacks located in their respective `iac/` directories.

### Deployment Steps(High - Level)

1. ** Configure AWS Credentials ** for your CI / CD environment.
2. ** Bootstrap AWS CDK ** in your target account and region.
3. ** Push to `main` branch **: The pipeline will automatically:
-   Build and push container images to ** Amazon ECR **.
    - Deploy the `ecommerce-webapp` stack.
    - Deploy the `performance-platform` stack.

## 🤖 Monitoring

  - ** Live Status **: The ** AWS Step Functions ** console provides a real - time visual graph of the testing pipeline's execution.
    - ** Live Logs **: All logs(from both the web app and the testing agents) are streamed to ** Amazon CloudWatch ** for live monitoring and querying with Logs Insights.

This new structure provides a complete, professional, and highly advanced solution that meets all of your requirements for a modern, resilient, and observable e - commerce ecosystem.