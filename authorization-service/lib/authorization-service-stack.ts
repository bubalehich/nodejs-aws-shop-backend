import * as cdk from 'aws-cdk-lib/core';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

const GITHUB_LOGIN = 'bubalehich';

export class AuthorizationServiceStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const credentials = process.env[GITHUB_LOGIN];
    if (!credentials) {
      throw new Error(`Missing env var "${GITHUB_LOGIN}" — add it to authorization-service/.env`);
    }

    const basicAuthorizer = new NodejsFunction(this, 'BasicAuthorizerFunction', {
      runtime: lambda.Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../lambda/basic-authorizer.ts'),
      handler: 'handler',
      functionName: 'basicAuthorizer',
      environment: {
        [GITHUB_LOGIN]: credentials,
      },
    });

    new cdk.CfnOutput(this, 'BasicAuthorizerArn', { value: basicAuthorizer.functionArn });
  }
}
