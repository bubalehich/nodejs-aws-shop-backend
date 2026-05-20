import * as cdk from 'aws-cdk-lib/core';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import * as path from 'path';

const IMPORT_BUCKET_NAME = 'bubalehich-shop-import-bucket';
const CATALOG_QUEUE_NAME = 'j-catalogItemsQueue';

export class ImportServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = s3.Bucket.fromBucketName(this, 'ImportBucket', IMPORT_BUCKET_NAME);

    const catalogItemsQueue = sqs.Queue.fromQueueArn(
      this,
      'CatalogItemsQueue',
      `arn:aws:sqs:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:${CATALOG_QUEUE_NAME}`
    );

    const importProductsFile = new NodejsFunction(this, 'ImportProductsFileFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../lambda/import-products-file.ts'),
      handler: 'handler',
      functionName: 'importProductsFile',
      environment: {
        IMPORT_BUCKET: bucket.bucketName,
      },
    });

    const importFileParser = new NodejsFunction(this, 'ImportFileParserFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../lambda/import-file-parser.ts'),
      handler: 'handler',
      functionName: 'importFileParser',
      timeout: cdk.Duration.seconds(30),
      environment: {
        CATALOG_QUEUE_URL: catalogItemsQueue.queueUrl,
      },
      bundling: {
        nodeModules: ['csv-parser'],
      },
    });

    bucket.grantPut(importProductsFile);
    bucket.grantReadWrite(importFileParser);
    bucket.grantDelete(importFileParser);
    catalogItemsQueue.grantSendMessages(importFileParser);

    bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(importFileParser),
      { prefix: 'uploaded/' }
    );

    const api = new apigateway.RestApi(this, 'ImportServiceApi', {
      restApiName: 'Import Service',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['*'],
      },
    });

    const importResource = api.root.addResource('import');
    importResource.addMethod('GET', new apigateway.LambdaIntegration(importProductsFile), {
      requestParameters: {
        'method.request.querystring.name': true,
      },
    });

    new cdk.CfnOutput(this, 'ImportApiUrl', { value: api.url });
    new cdk.CfnOutput(this, 'ImportBucketName', { value: bucket.bucketName });
  }
}
