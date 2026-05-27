import * as cdk from 'aws-cdk-lib/core';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as snsSubs from 'aws-cdk-lib/aws-sns-subscriptions';
import * as lambdaEventSources from 'aws-cdk-lib/aws-lambda-event-sources';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import * as path from 'path';

const PRODUCTS_TABLE_NAME = 'products';
const STOCKS_TABLE_NAME = 'stocks';
const CATALOG_QUEUE_NAME = 'j-catalogItemsQueue';
const CREATE_PRODUCT_TOPIC_NAME = 'j-createProductTopic';
const PRIMARY_EMAIL = 'yana.pchelnik@gmail.com';
const EXPENSIVE_EMAIL = 'yana.pchelnik+expensive@gmail.com';
const EXPENSIVE_PRICE_THRESHOLD = 100;

export class NodejsAwsShopBackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const productsTable = dynamodb.Table.fromTableName(this, 'ProductsTable', PRODUCTS_TABLE_NAME);
    const stocksTable = dynamodb.Table.fromTableName(this, 'StocksTable', STOCKS_TABLE_NAME);

    const catalogItemsQueue = new sqs.Queue(this, 'CatalogItemsQueue', {
      queueName: CATALOG_QUEUE_NAME,
      visibilityTimeout: cdk.Duration.seconds(60),
    });

    const createProductTopic = new sns.Topic(this, 'CreateProductTopic', {
      topicName: CREATE_PRODUCT_TOPIC_NAME,
    });

    createProductTopic.addSubscription(new snsSubs.EmailSubscription(PRIMARY_EMAIL));

    createProductTopic.addSubscription(
      new snsSubs.EmailSubscription(EXPENSIVE_EMAIL, {
        filterPolicy: {
          maxPrice: sns.SubscriptionFilter.numericFilter({ greaterThanOrEqualTo: EXPENSIVE_PRICE_THRESHOLD }),
        },
      })
    );

    const lambdaEnv = {
      PRODUCTS_TABLE: PRODUCTS_TABLE_NAME,
      STOCKS_TABLE: STOCKS_TABLE_NAME,
    };

    const getProductsList = new NodejsFunction(this, 'GetProductsListFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../lambda/get-products-list.ts'),
      handler: 'handler',
      functionName: 'getProductsList',
      environment: lambdaEnv,
    });

    const getProductsById = new NodejsFunction(this, 'GetProductsByIdFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../lambda/get-products-by-id.ts'),
      handler: 'handler',
      functionName: 'getProductsById',
      environment: lambdaEnv,
    });

    const createProduct = new NodejsFunction(this, 'CreateProductFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../lambda/create-product.ts'),
      handler: 'handler',
      functionName: 'createProduct',
      environment: lambdaEnv,
    });

    const catalogBatchProcess = new NodejsFunction(this, 'CatalogBatchProcessFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../lambda/catalog-batch-process.ts'),
      handler: 'handler',
      functionName: 'j-catalogBatchProcess',
      timeout: cdk.Duration.seconds(30),
      environment: {
        ...lambdaEnv,
        CREATE_PRODUCT_TOPIC_ARN: createProductTopic.topicArn,
      },
    });

    catalogBatchProcess.addEventSource(
      new lambdaEventSources.SqsEventSource(catalogItemsQueue, {
        batchSize: 5,
      })
    );

    productsTable.grantReadData(getProductsList);
    stocksTable.grantReadData(getProductsList);
    productsTable.grantReadData(getProductsById);
    stocksTable.grantReadData(getProductsById);
    productsTable.grantWriteData(createProduct);
    stocksTable.grantWriteData(createProduct);
    productsTable.grantWriteData(catalogBatchProcess);
    stocksTable.grantWriteData(catalogBatchProcess);
    createProductTopic.grantPublish(catalogBatchProcess);

    const api = new apigateway.RestApi(this, 'ProductServiceApi', {
      restApiName: 'Product Service',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['*'],
      },
    });

    const products = api.root.addResource('products');
    products.addMethod('GET', new apigateway.LambdaIntegration(getProductsList));
    products.addMethod('POST', new apigateway.LambdaIntegration(createProduct));

    const productById = products.addResource('{productId}');
    productById.addMethod('GET', new apigateway.LambdaIntegration(getProductsById));

    new cdk.CfnOutput(this, 'ApiUrl', { value: api.url });
    new cdk.CfnOutput(this, 'CatalogQueueUrl', { value: catalogItemsQueue.queueUrl });
    new cdk.CfnOutput(this, 'CatalogQueueArn', { value: catalogItemsQueue.queueArn });
    new cdk.CfnOutput(this, 'CreateProductTopicArn', { value: createProductTopic.topicArn });
  }
}
