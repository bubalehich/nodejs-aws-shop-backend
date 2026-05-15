# AWS Shop Backend

Backend services for the AWS shop application — two AWS CDK stacks deployed independently.

## Services

### Product Service

REST API for product catalog backed by DynamoDB.

- Base URL: `https://mv9r6b0fml.execute-api.us-east-1.amazonaws.com/prod`
- `GET /products` — list all products (joined with stock counts)
- `GET /products/{productId}` — get one product by ID, 404 if not found
- `POST /products` — create product + stock transactionally; 400 on invalid payload

### Import Service

CSV import via S3 with pre-signed URLs.

- Base URL: `https://96rbu86vd3.execute-api.us-east-1.amazonaws.com/prod`
- `GET /import?name=file.csv` — returns a pre-signed URL for uploading the CSV into `uploaded/`
- On upload, `importFileParser` Lambda is triggered by `s3:ObjectCreated:*`, parses CSV via `csv-parser`, and moves the file from `uploaded/` to `parsed/`.

Full API specification: [`openapi.yaml`](./openapi.yaml).

## Stack

- AWS CDK (TypeScript)
- AWS Lambda (Node.js 20)
- AWS API Gateway (REST)
- DynamoDB (`products`, `stocks`)
- S3 (import bucket with `uploaded/` and `parsed/` prefixes)

## Setup and deploy

```bash
npm install

npm run seed                                        # seed DynamoDB sample data
npm run deploy                                      # deploy ProductService
npx cdk deploy ImportServiceStack                   # deploy ImportService
npx cdk deploy --all                                # deploy both
npx cdk destroy --all --force                       # tear down everything
```

DynamoDB tables `products` (PK `id`) and `stocks` (PK `product_id`) must exist in advance (created via AWS Console).
