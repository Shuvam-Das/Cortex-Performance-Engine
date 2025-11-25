import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';

export class EcommerceWebAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. Backend: FastAPI running on Lambda
    const backendLambda = new lambda.Function(this, 'BackendHandler', {
      runtime: lambda.Runtime.PYTHON_3_9,
      code: lambda.Code.fromAsset('../backend'),
      handler: 'main.app', // Assuming you use a Lambda adapter like Mangum
      timeout: cdk.Duration.seconds(30),
    });

    const api = new apigateway.LambdaRestApi(this, 'Endpoint', {
      handler: backendLambda,
      proxy: true,
    });

    // 2. Frontend: React app hosted on S3
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      websiteIndexDocument: 'index.html',
      publicReadAccess: true,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new s3deploy.BucketDeployment(this, 'DeployFrontend', {
      sources: [s3deploy.Source.asset('../frontend/build')],
      destinationBucket: frontendBucket,
    });

    // 3. CloudFront Distribution to serve both
    new cloudfront.Distribution(this, 'WebAppDistribution', {
      defaultBehavior: { origin: new origins.S3Origin(frontendBucket) },
      additionalBehaviors: {
        '/api/*': { origin: new origins.HttpOrigin(cdk.Fn.select(2, cdk.Fn.split('/', api.url))) },
      },
    });
  }
}