#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { NodejsAwsShopBackendStack } from '../lib/nodejs-aws-shop-backend-stack';
import { ImportServiceStack } from '../lib/import-service-stack';

const app = new cdk.App();
new NodejsAwsShopBackendStack(app, 'NodejsAwsShopBackendStack');
new ImportServiceStack(app, 'ImportServiceStack');
