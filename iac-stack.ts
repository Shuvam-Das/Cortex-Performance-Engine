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
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';

export class PerformancePlatformStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 Bucket for artifacts and logs
    const artifactsBucket = new s3.Bucket(this, 'ArtifactsBucket');

    // A single VPC for all our services to communicate securely
    const vpc = new ec2.Vpc(this, 'CortexVpc', { maxAzs: 2 });

    // IAM Role for all Lambda Agents
    const lambdaAgentRole = new iam.Role(this, 'CortexLambdaAgentRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMFullAccess'), // For Chaos Agent
        iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonBedrockFullAccess'), // For AI Agents
      ],
    });
    artifactsBucket.grantReadWrite(lambdaAgentRole);

    // A single ECS Cluster for all containerized services (n8n and JMeter)
    const ecsCluster = new ecs.Cluster(this, 'CortexCluster', { vpc });

    // --- n8n Self-Hosted Service on Fargate ---
    const n8nTaskDef = new ecs.FargateTaskDefinition(this, 'n8nTaskDef', {
      memoryLimitMiB: 1024,
      cpu: 512,
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
      desiredCount: 1,
    });
    listener.addTargets('n8nTarget', {
      port: 80,
      targets: [n8nService],
      healthCheck: { path: '/healthz' }
    });

    const n8nUrl = alb.loadBalancerDnsName;
    new cdk.CfnOutput(this, 'n8nUrl', { value: `http://${n8nUrl}` });

    // --- Lambda Agents ---
    const createLambdaAgent = (name: string, folder: string) => {
      return new lambda.Function(this, name, {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset(`../agents/${folder}`),
        role: lambdaAgentRole,
        environment: { 
          S3_BUCKET: artifactsBucket.bucketName, 
          N8N_WEBHOOK_URL: `http://${n8nUrl}/webhook/your-webhook-path` // Update with your actual n8n webhook path
        },
        timeout: cdk.Duration.minutes(2),
      });
    };

    const logAnalyzer = createLambdaAgent('LogAnalyzerAgent', 'log-analyzer');
    const scriptGenerator = createLambdaAgent('ScriptGeneratorAgent', 'script-generator');
    const reportSynthesizer = createLambdaAgent('ReportSynthesizerAgent', 'report-synthesizer');
    const chaosAgent = createLambdaAgent('ChaosAgent', 'chaos-agent');

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

    // --- Step Function State Machine Definition ---
    const startTest = new tasks.LambdaInvoke(this, 'RunLogAnalyzer', { lambdaFunction: logAnalyzer })
        .next(new tasks.LambdaInvoke(this, 'RunScriptGenerator', { lambdaFunction: scriptGenerator }))
        .next(testExecutorTask)
        .next(new tasks.LambdaInvoke(this, 'RunReportSynthesizer', { lambdaFunction: reportSynthesizer }));

    const startChaos = new tasks.LambdaInvoke(this, 'RunChaosExperiment', { lambdaFunction: chaosAgent });

    const mainChoice = new sfn.Choice(this, 'TestTypeChoice')
        .when(sfn.Condition.stringEquals('$.testType', 'CHAOS'), startChaos)
        .otherwise(startTest);

    const stateMachine = new sfn.StateMachine(this, 'CortexStateMachine', {
      definition: mainChoice,
      stateMachineName: 'CortexPerformanceEngineMachine',
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
            // In the AWS Lex Console, you will configure intents (e.g., 'RunLoadTest')
            // to trigger a Lambda function, which in turn starts the 
            // 'CortexPerformanceEngineMachine' Step Function with the appropriate input.
          ],
      }],
    });
  }
}
