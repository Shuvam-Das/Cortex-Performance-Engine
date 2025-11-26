import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as apigw from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';

export class ECommerceWebAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // --- Backend: FastAPI on Lambda with API Gateway ---

    // 1. Reference the ECR repository created by the CI/CD pipeline
    const backendRepo = ecr.Repository.fromRepositoryName(this, 'BackendRepo', 'ecommerce-backend');

    // 2. Create the Lambda function from the container image
    const backendLambda = new lambda.Function(this, 'BackendLambda', {
      runtime: lambda.Runtime.FROM_IMAGE,
      code: lambda.Code.fromEcrImage(backendRepo),
      handler: lambda.Handler.FROM_IMAGE,
      memorySize: 512,
      timeout: cdk.Duration.seconds(30),
      architecture: lambda.Architecture.ARM_64, // More cost-effective
    });

    // 3. Create an HTTP API Gateway to expose the Lambda function
    const httpApi = new apigw.HttpApi(this, 'ECommerceHttpApi', {
      description: 'HTTP API for E-Commerce Backend',
      corsPreflight: {
        allowHeaders: ['Content-Type'],
        allowMethods: [apigw.CorsHttpMethod.GET, apigw.CorsHttpMethod.POST, apigw.CorsHttpMethod.OPTIONS],
        allowOrigins: ['*'], // In production, restrict this to your CloudFront domain
      },
    });

    // 4. Create the integration between the API Gateway and the Lambda
    const lambdaIntegration = new HttpLambdaIntegration('LambdaIntegration', backendLambda);

    // 5. Create a default route to proxy all requests to the Lambda
    httpApi.addRoutes({
      path: '/{proxy+}',
      methods: [apigw.HttpMethod.ANY],
      integration: lambdaIntegration,
    });

    // --- Frontend: React App on S3 with CloudFront ---

    // 1. Create an S3 bucket to host the static website
    const siteBucket = new s3.Bucket(this, 'WebAppBucket', {
      websiteIndexDocument: 'index.html',
      publicReadAccess: false, // Access will be granted via CloudFront
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // For prototype, destroy on stack deletion
      autoDeleteObjects: true, // For prototype
    });

    // 2. Create a CloudFront distribution to serve the S3 content
    const distribution = new cloudfront.Distribution(this, 'WebAppDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(siteBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      },
      defaultRootObject: 'index.html',
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // Most cost-effective
    });

    // 3. Deploy the local frontend build artifacts to the S3 bucket
    new s3deploy.BucketDeployment(this, 'DeployWebApp', {
      sources: [s3deploy.Source.asset('../frontend/build')],
      destinationBucket: siteBucket,
      distribution, // Invalidate CloudFront cache on new deployment
      distributionPaths: ['/*'],
    });

    // --- Outputs ---
    new cdk.CfnOutput(this, 'CloudFrontURL', {
      value: distribution.distributionDomainName,
      description: 'The static endpoint for the E-Commerce Frontend',
    });

    new cdk.CfnOutput(this, 'ApiGatewayUrl', {
      value: httpApi.url!,
      description: 'The static endpoint for the E-Commerce Backend API',
    });
  }
}