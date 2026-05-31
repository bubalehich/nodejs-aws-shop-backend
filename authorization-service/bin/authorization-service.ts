#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib/core';
import { AuthorizationServiceStack } from '../lib/authorization-service-stack';

const app = new cdk.App();
new AuthorizationServiceStack(app, 'AuthorizationServiceStack');
