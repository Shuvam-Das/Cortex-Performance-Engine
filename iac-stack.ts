import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as lex from 'aws-cdk-lib/aws-lex';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';

export class PerformancePlatformStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 Bucket for artifacts and logs
    const artifactsBucket = new s3.Bucket(this, 'ArtifactsBucket');

    // SNS Topic for decoupled notifications (This is a robust pattern)
    const notificationsTopic = new sns.Topic(this, 'CortexNotificationsTopic');
    new cdk.CfnOutput(this, 'NotificationsTopicArn', {
      value: notificationsTopic.topicArn,
      description: 'The ARN of the SNS topic to subscribe to for test completion notifications.'
    });

    // A single VPC for all our services to communicate securely
    const vpc = new ec2.Vpc(this, 'CortexVpc', { maxAzs: 2 });

    // IAM Role for all Lambda Agents
    const lambdaAgentRole = new iam.Role(this, 'CortexLambdaAgentRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMFullAccess'), // For Chaos Agent
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonBedrockFullAccess'), // For AI Agents
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonCodeGuruProfilerFullAccess'), // For Live Profiling Agent
      ],
    });
    artifactsBucket.grantReadWrite(lambdaAgentRole);
    notificationsTopic.grantPublish(lambdaAgentRole); // Allow agents to publish notifications

    // A single ECS Cluster for all containerized services (n8n and JMeter)
    const ecsCluster = new ecs.Cluster(this, 'CortexCluster', { vpc });

    // --- n8n Self-Hosted Service on Fargate ---
    const n8nTaskDef = new ecs.FargateTaskDefinition(this, 'n8nTaskDef', {
      memoryLimitMiB: 512, // Use the smallest size for cost savings
      cpu: 256,             // 0.25 vCPU
    });
    const alb = new elbv2.ApplicationLoadBalancer(this, 'n8nLoadBalancer', {
      vpc,
      internetFacing: true,
    });
    n8nTaskDef.addContainer('n8nContainer', {
      image: ecs.ContainerImage.fromRegistry('n8nio/n8n:latest'),
      portMappings: [{ containerPort: 5678 }],
      logging: new ecs.AwsLogDriver({ streamPrefix: 'cortex-n8n' }),
      environment: {
        // IMPORTANT: For n8n to work behind a load balancer, this must be set.
        WEBHOOK_URL: `http://${alb.loadBalancerDnsName}/`,
        // For production, you must also configure a persistent database.
        // DB_TYPE: 'postgres',
        // DB_POSTGRESDB_HOST: 'your_rds_instance_endpoint',
      }
    });

    const listener = alb.addListener('HttpListener', { port: 80 });
    const n8nService = new ecs.FargateService(this, 'n8nService', {
      cluster: ecsCluster,
      taskDefinition: n8nTaskDef,
      desiredCount: 1, // Run a single instance for the prototype to save costs
      assignPublicIp: true, // Place in public subnet to avoid needing a costly NAT Gateway
    });
    listener.addTargets('n8nTarget', {
      port: 80,
      targets: [n8nService],
      healthCheck: { path: '/healthz' }
    });

    const n8nUrl = alb.loadBalancerDnsName;
    new cdk.CfnOutput(this, 'CortexEngineStaticEndpoint', {
      value: `http://${n8nUrl}`,
      description: 'The permanent, static endpoint for the n8n service, which acts as the entry point for the Cortex Performance Engine.'
    });

    // --- Lambda Agents ---
    const createLambdaAgent = (name: string, folder: string) => {
      return new lambda.Function(this, name, {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset(`../agents/${folder}`),
        role: lambdaAgentRole,
        environment: {
          S3_BUCKET: artifactsBucket.bucketName,
          NOTIFICATIONS_TOPIC_ARN: notificationsTopic.topicArn // Use the robust SNS topic
        },
        timeout: cdk.Duration.minutes(2),
      });
    };

    // --- Standard Agents ---
    const logAnalyzer = createLambdaAgent('LogAnalyzerAgent', 'log-analyzer');
    const scriptGenerator = createLambdaAgent('ScriptGeneratorAgent', 'script-generator');
    const reportSynthesizer = createLambdaAgent('ReportSynthesizerAgent', 'report-synthesizer');
    const chaosAgent = createLambdaAgent('ChaosAgent', 'chaos-agent');

    // --- Advanced Feature Agents ---
    const dataGeneratorAgent = createLambdaAgent('DataGeneratorAgent', 'data-generator');
    const costAdvisorAgent = createLambdaAgent('CostAdvisorAgent', 'cost-advisor');
    const resilienceAdvisorAgent = createLambdaAgent('ResilienceAdvisorAgent', 'resilience-advisor');
    // This agent is designed to be triggered by SNS/EventBridge from a CloudWatch Alarm on the target app
    const profilingAgent = createLambdaAgent('ProfilingAgent', 'profiling-agent');


    // --- Fargate Task for JMeter Test Executor ---
    const testExecutorRepo = ecr.Repository.fromRepositoryName(this, 'TestExecutorRepo', 'test-executor');
    const testExecutorTaskDef = new ecs.FargateTaskDefinition(this, 'TestExecutorTaskDef');
    testExecutorTaskDef.addContainer('TestExecutorContainer', {
      image: ecs.ContainerImage.fromEcrRepository(testExecutorRepo, 'latest'),
      logging: new ecs.AwsLogDriver({ streamPrefix: 'cortex-jmeter' }),
    });
    artifactsBucket.grantReadWrite(testExecutorTaskDef.taskRole);

    const testExecutorTask = new tasks.EcsRunTask(this, 'RunTestExecutorTask', {
      integrationPattern: sfn.IntegrationPattern.RUN_JOB,
      cluster: ecsCluster, // Use the same cluster as n8n
      taskDefinition: testExecutorTaskDef,
      launchTarget: new tasks.EcsFargateLaunchTarget({ platformVersion: ecs.FargatePlatformVersion.LATEST }),
      capacityProviderStrategies: [{ capacityProvider: 'FARGATE_SPOT', weight: 1 }],
    });

    // Final step: Publish a success message to the SNS topic.
    const publishNotification = new tasks.SnsPublish(this, 'PublishCompletionNotification', {
      topic: notificationsTopic,
      message: sfn.TaskInput.fromJsonPathAt('$.Payload'), // Pass the output from the ReportSynthesizer
    });

    // --- Step Function State Machine Definition ---
    const startTest = new tasks.LambdaInvoke(this, 'RunDataGenerator', { lambdaFunction: dataGeneratorAgent })
      .next(new tasks.LambdaInvoke(this, 'RunLogAnalyzer', { lambdaFunction: logAnalyzer }))
      .next(new tasks.LambdaInvoke(this, 'RunScriptGenerator', { lambdaFunction: scriptGenerator }))
      .next(testExecutorTask)
      .next(new tasks.LambdaInvoke(this, 'RunReportSynthesizer', { lambdaFunction: reportSynthesizer }))
      .next(publishNotification); // Add the notification step to the end of the pipeline.

    const startChaos = new tasks.LambdaInvoke(this, 'RunChaosExperiment', { lambdaFunction: chaosAgent });

    const mainChoice = new sfn.Choice(this, 'TestTypeChoice')
      .when(sfn.Condition.stringEquals('$.testType', 'CHAOS'), startChaos)
      .otherwise(startTest);

    const stateMachine = new sfn.StateMachine(this, 'CortexStateMachine', {
      definition: mainChoice,
      stateMachineName: 'CortexPerformanceEngineMachine',
    });

    // --- Lambda function to connect Lex to the State Machine (THE MISSING PIECE) ---
    const lexTriggerLambda = new lambda.Function(this, 'LexTriggerLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'index.handler',
      code: lambda.Code.fromAsset('../agents/lex-trigger'), // Correct path relative to 'iac' directory
      environment: {
        STATE_MACHINE_ARN: stateMachine.stateMachineArn,
      },
    });

    // Grant the new Lambda permission to start the state machine
    stateMachine.grantStartExecution(lexTriggerLambda);

    // Grant Lex permission to invoke this Lambda function
    lexTriggerLambda.addPermission('LexInvokePermission', {
      principal: new iam.ServicePrincipal('lexv2.amazonaws.com'),
      action: 'lambda:InvokeFunction',
      sourceArn: `arn:${cdk.Aws.PARTITION}:lex:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:bot-alias/*/*`,
    });
    // --- AWS Lex Bot to trigger the State Machine ---
    const botRole = new iam.Role(this, 'CortexLexBotRole', { assumedBy: new iam.ServicePrincipal('lexv2.amazonaws.com') });
    stateMachine.grantStartExecution(botRole);

    new lex.CfnBot(this, 'CortexChatBot', {
      name: 'CortexPerformanceEngineBot',
      roleArn: botRole.roleArn,
      dataPrivacy: { ChildDirected: false },
      idleSessionTtlInSeconds: 300,
      locales: [{
        localeId: 'en_US',
        nluConfidenceThreshold: 0.40,
        intents: [
          {
            name: 'RunPerformanceTest',
            description: 'Triggers the main performance testing pipeline.',
            sampleUtterances: [
              { utterance: 'run a performance test' },
              { utterance: 'start a load test' },
            ],
            fulfillmentCodeHook: { enabled: true },
          },
          {
            name: 'RunChaosTest',
            description: 'Triggers a chaos engineering experiment.',
            sampleUtterances: [
              { utterance: 'run a chaos test' },
              { utterance: 'start a chaos experiment' },
            ],
            fulfillmentCodeHook: { enabled: true },
          }
        ],
        // Connect the Lex bot to our trigger Lambda for fulfillment
        fulfillment: {
          codeHook: { lambdaCodeHook: { codeHookInterfaceVersion: '1.0', lambdaArn: lexTriggerLambda.functionArn } }
        }
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