import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { LambdaRestApi, Cors } from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';

export class EcommerceWebAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 1. Backend: FastAPI running on Lambda with explicit memory
    const backendLambda = new lambda.Function(this, 'BackendHandler', {
      runtime: lambda.Runtime.PYTHON_3_9,
      code: lambda.Code.fromAsset('../backend'),
      handler: 'main.handler', // Using a Lambda adapter like Mangum
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
    });

    const api = new LambdaRestApi(this, 'Endpoint', {
      handler: backendLambda,
      proxy: true,
      defaultCorsPreflightOptions: {
        allowOrigins: Cors.ALL_ORIGINS,
        allowMethods: Cors.ALL_METHODS,
      }
    });

    // 2. Frontend: React app hosted on a private S3 bucket
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    new s3deploy.BucketDeployment(this, 'DeployFrontend', {
      sources: [s3deploy.Source.asset('../frontend/build')],
      destinationBucket: frontendBucket,
    });

    // 3. CloudFront Distribution to serve both, with caching and cookie forwarding
    const apiOrigin = new origins.HttpOrigin(cdk.Fn.select(2, cdk.Fn.split('/', api.url)));
    const s3Origin = new origins.S3Origin(frontendBucket);

    new cloudfront.Distribution(this, 'WebAppDistribution', {
      defaultRootObject: 'index.html',
      defaultBehavior: { origin: s3Origin, viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS },
      additionalBehaviors: {
        '/api/*': {
          origin: apiOrigin,
          viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
          allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
          // Production-ready caching policy for APIs
          cachePolicy: new cloudfront.CachePolicy(this, 'ApiCachePolicy', {
            headerBehavior: cloudfront.CacheHeaderBehavior.allowList('Authorization'), // Forward auth headers
            cookieBehavior: cloudfront.CacheCookieBehavior.all(), // Forward cookies for session management
            queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(), // Cache based on query strings
            defaultTtl: cdk.Duration.seconds(0), // Don't cache by default, let backend headers decide
          }),
        },
      },
    });
  }
}