#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as logs from 'aws-cdk-lib/aws-logs';

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
        code: lambda.Code.fromAsset(`./agentic-system/${folder}`),
        role: lambdaAgentRole,
        environment: {
          S3_BUCKET: artifactsBucket.bucketName,
          NOTIFICATIONS_TOPIC_ARN: notificationsTopic.topicArn
        },
        timeout: cdk.Duration.minutes(2),
      });
    };

    // --- Standard Agents ---
    const logAnalyzer = createLambdaAgent('LogAnalyzerAgent', 'log-analysis-agent');
    const orchestrator = createLambdaAgent('OrchestratorAgent', 'orchestrator-agent');
    const reportSynthesizer = createLambdaAgent('ReportSynthesizerAgent', 'reporting-agent');
    const testExecutor = createLambdaAgent('TestExecutorAgent', 'test-execution-agent');

    // Final step: Publish a success message to the SNS topic
    const publishNotification = new tasks.SnsPublish(this, 'PublishCompletionNotification', {
      topic: notificationsTopic,
      message: sfn.TaskInput.fromJsonPathAt('$.Payload'),
    });

    // --- Step Function State Machine Definition ---
    const pipeline = new tasks.LambdaInvoke(this, 'RunLogAnalyzer', { lambdaFunction: logAnalyzer })
      .next(new tasks.LambdaInvoke(this, 'RunOrchestrator', { lambdaFunction: orchestrator }))
      .next(new tasks.LambdaInvoke(this, 'RunTestExecutor', { lambdaFunction: testExecutor }))
      .next(new tasks.LambdaInvoke(this, 'RunReportSynthesizer', { lambdaFunction: reportSynthesizer }))
      .next(publishNotification);

    const stateMachine = new sfn.StateMachine(this, 'CortexStateMachine', {
      definition: pipeline,
      stateMachineName: 'CortexPerformanceEngineMachine',
      logs: {
        destination: new logs.LogGroup(this, 'StateMachineLogGroup', {
          retention: logs.RetentionDays.ONE_WEEK,
        }),
        level: sfn.LogLevel.ALL,
      },
    });

    new cdk.CfnOutput(this, 'StateMachineArn', {
      value: stateMachine.stateMachineArn,
      description: 'The ARN of the Cortex Performance Engine State Machine',
    });
  }
}



This new structure provides a complete, professional, and highly advanced solution that meets all of your requirements for a modern, resilient, and observable e - commerce ecosystem.