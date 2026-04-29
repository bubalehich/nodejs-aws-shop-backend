# Product Service

Backend service for the AWS shop application — a serverless REST API built with AWS Lambda and API Gateway, deployed via AWS CDK.

## API

Base URL: `https://ycn8ebyjkj.execute-api.us-east-1.amazonaws.com/prod`

### Endpoints

- `GET /products` — returns the full list of products
- `GET /products/{productId}` — returns a single product by ID, or 404 if not found

Full API specification: [`openapi.yaml`](./openapi.yaml) (paste into [editor.swagger.io](https://editor.swagger.io/) to render).

## Stack

- AWS CDK (TypeScript)
- AWS Lambda (Node.js 20)
- AWS API Gateway (REST)

## Deploy / Destroy

```bash
npm install
npm run deploy    # provisions Lambdas + API Gateway
npm run destroy   # tears down all AWS resources
```
