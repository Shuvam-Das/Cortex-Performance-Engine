import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as sfn from 'aws-cdk-lib/aws-stepfunctions';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks';
import * as iam from 'aws-cdk-lib/aws-iam';

export class IacStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // === 1. S3 Bucket for all artifacts ===
    const artifactsBucket = new s3.Bucket(this, 'ArtifactsBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // === 2. SNS Topic for Notifications ===
    const notificationsTopic = new sns.Topic(this, 'NotificationsTopic');

    // === 3. IAM Role for Lambda Agents ===
    const lambdaAgentRole = new iam.Role(this, 'LambdaAgentRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
      ],
    });
    artifactsBucket.grantReadWrite(lambdaAgentRole);
    notificationsTopic.grantPublish(lambdaAgentRole);

    // === 4. Lambda Function Agents ===
    const createLambdaAgent = (name: string, folder: string, environment: { [key: string]: string; }) => {
      return new lambda.Function(this, name, {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: 'index.handler',
        code: lambda.Code.fromAsset(`../packages/${folder}`),
        role: lambdaAgentRole,
        environment: {
          S3_BUCKET: artifactsBucket.bucketName,
          ...environment,
        },
        timeout: cdk.Duration.minutes(1),
      });
    };

    const logAnalyzer = createLambdaAgent('LogAnalyzerAgent', '1-log-analyzer', {});
    const workloadModeler = createLambdaAgent('WorkloadModelerAgent', '2-workload-modeler', {});
    const scriptGenerator = createLambdaAgent('ScriptGeneratorAgent', '3-script-generator', {});
    const reportSynthesizer = createLambdaAgent('ReportSynthesizerAgent', '5-report-synthesizer', {});
    const archivist = createLambdaAgent('ArchivistAgent', '7-archivist', {});

    // === 5. Fargate Task for Test Executor ===
    const ecsCluster = new ecs.Cluster(this, 'AgentCluster');
    const ecrRepoName = process.env.ECR_REPO_NAME || 'agentic-performance-tester';
    const imageTag = process.env.TEST_EXECUTOR_IMAGE_TAG || 'latest';
    const testExecutorRepo = ecr.Repository.fromRepositoryName(this, 'TestExecutorRepo', ecrRepoName);
    
    const testExecutorTask = new tasks.EcsRunTask(this, 'RunTestExecutorTask', {
      integrationPattern: sfn.IntegrationPattern.RUN_JOB,
      cluster: ecsCluster,
      taskDefinition: new ecs.FargateTaskDefinition(this, 'TestExecutorTaskDef'),
      launchTarget: new tasks.EcsFargateLaunchTarget({ platformVersion: ecs.FargatePlatformVersion.LATEST }),
      capacityProviderStrategies: [{ capacityProvider: 'FARGATE_SPOT', weight: 1 }],
    });
    testExecutorTask.taskDefinition.addContainer('TestExecutorContainer', {
      image: ecs.ContainerImage.fromEcrRepository(testExecutorRepo, imageTag),
      logging: new ecs.AwsLogDriver({ streamPrefix: 'TestExecutor' }),
    });
    artifactsBucket.grantReadWrite(testExecutorTask.taskDefinition.taskRole);

    // === 6. Step Function Workflow Definition ===
    const definition = new tasks.LambdaInvoke(this, 'RunLogAnalyzer', { lambdaFunction: logAnalyzer })
      .next(new tasks.LambdaInvoke(this, 'RunWorkloadModeler', { lambdaFunction: workloadModeler }))
      .next(new tasks.LambdaInvoke(this, 'RunScriptGenerator', { lambdaFunction: scriptGenerator }))
      .next(testExecutorTask)
      .next(new tasks.LambdaInvoke(this, 'RunReportSynthesizer', { lambdaFunction: reportSynthesizer }))
      .next(new tasks.LambdaInvoke(this, 'RunArchivist', { lambdaFunction: archivist }));

    const stateMachine = new sfn.StateMachine(this, 'PerformanceTestingStateMachine', {
      definition,
      timeout: cdk.Duration.minutes(30),
    });

    // === 7. Scheduled Trigger (No Manual Intervention) ===
    new events.Rule(this, 'DailyTriggerRule', {
      schedule: events.Schedule.rate(cdk.Duration.days(1)),
      targets: [new targets.SfnStateMachine(stateMachine)],
    });
  }
}