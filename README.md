# Product Service

Backend service for the AWS shop application — a serverless REST API built with AWS Lambda and API Gateway, deployed via AWS CDK.

## Endpoints

- `GET /products` — returns the full list of products
- `GET /products/{productId}` — returns a single product by ID

## Stack

- AWS CDK (TypeScript)
- AWS Lambda (Node.js)
- AWS API Gateway

## Deploy

```bash
npm install
npm run deploy
```
