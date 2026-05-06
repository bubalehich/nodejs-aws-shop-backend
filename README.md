# Product Service

Backend service for the AWS shop application — a serverless REST API built with AWS Lambda, API Gateway, and DynamoDB, deployed via AWS CDK.

## API

Base URL: `https://mv9r6b0fml.execute-api.us-east-1.amazonaws.com/prod`

### Endpoints

- `GET /products` — list all products (joined with stock counts)
- `GET /products/{productId}` — get one product by ID (joined with its stock), 404 if not found
- `POST /products` — create a new product (and its stock entry) transactionally; 400 on invalid payload

Full API specification: [`openapi.yaml`](./openapi.yaml) (paste into [editor.swagger.io](https://editor.swagger.io/) to render).

## Stack

- AWS CDK (TypeScript)
- AWS Lambda (Node.js 20)
- AWS API Gateway (REST)
- DynamoDB (`products`, `stocks` tables)

## Setup and deploy

```bash
npm install
npm run seed      # populate DynamoDB tables with sample products + stocks
npm run deploy    # provisions Lambdas + API Gateway
npm run destroy   # tears down all AWS resources
```

DynamoDB tables `products` and `stocks` must be created in advance via AWS Console (see Task 4.1):

- `products` — partition key `id` (String)
- `stocks` — partition key `product_id` (String)
