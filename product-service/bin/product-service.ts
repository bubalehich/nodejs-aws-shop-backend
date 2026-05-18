#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { NodejsAwsShopBackendStack } from '../lib/product-service-stack';

const app = new cdk.App();
new NodejsAwsShopBackendStack(app, 'NodejsAwsShopBackendStack');
