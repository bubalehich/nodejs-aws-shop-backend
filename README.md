# AWS Shop Backend

Backend services for the AWS shop application. Two independent services, each in its own folder with its own CDK app, deployable separately.

```
nodejs-aws-shop-backend/
├── product-service/       # DynamoDB-backed product catalog REST API
└── import-service/        # CSV upload via S3 with pre-signed URLs
```

## Product Service

REST API for product catalog backed by DynamoDB.

- Base URL: `https://mv9r6b0fml.execute-api.us-east-1.amazonaws.com/prod`
- `GET /products` — list all products (joined with stock counts)
- `GET /products/{productId}` — get one product by ID, 404 if not found
- `POST /products` — create product + stock transactionally; 400 on invalid payload

```bash
cd product-service
npm install
npm run seed       # populate DynamoDB sample data
npm run deploy     # deploy ProductService stack
npm run destroy    # tear down
```

DynamoDB tables `products` (PK `id`) and `stocks` (PK `product_id`) must exist in advance (created via AWS Console).

## Import Service

CSV import via S3 with pre-signed URLs.

- Base URL: `https://etw2b0mtja.execute-api.us-east-1.amazonaws.com/prod`
- `GET /import?name=file.csv` — returns a pre-signed URL for uploading the CSV into `uploaded/`
- On upload, `importFileParser` Lambda is triggered by `s3:ObjectCreated:*` (prefix `uploaded/`), parses CSV via `csv-parser`, then moves the file from `uploaded/` to `parsed/`.

```bash
cd import-service
npm install
npm run deploy     # deploy ImportService stack
npm run destroy    # tear down (S3 bucket stays — it is managed outside CDK)
```

The S3 bucket `bubalehich-shop-import-bucket` is created in advance via AWS Console (Task 5.1 requirement) and referenced by the CDK stack via `s3.Bucket.fromBucketName`.

## Full API specification

See [`openapi.yaml`](./openapi.yaml) — paste into [editor.swagger.io](https://editor.swagger.io/) to render.
