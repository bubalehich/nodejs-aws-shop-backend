import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const REGION = process.env.AWS_REGION || 'us-east-1';
const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE || 'products';
const STOCKS_TABLE = process.env.STOCKS_TABLE || 'stocks';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

const seed = [
  { title: 'ProductOne', description: 'Short Product Description1', price: 24, count: 4 },
  { title: 'ProductNew', description: 'Short Product Description3', price: 10, count: 6 },
  { title: 'ProductTop', description: 'Short Product Description2', price: 23, count: 7 },
  { title: 'ProductTitle', description: 'Short Product Description7', price: 15, count: 12 },
  { title: 'Product', description: 'Short Product Descriptio1', price: 23, count: 7 },
  { title: 'ProductTest', description: 'Short Product Description4', price: 15, count: 8 },
];

async function run() {
  const products = seed.map((p) => ({
    id: randomUUID(),
    title: p.title,
    description: p.description,
    price: p.price,
  }));
  const stocks = products.map((p, i) => ({
    product_id: p.id,
    count: seed[i].count,
  }));

  await client.send(
    new BatchWriteCommand({
      RequestItems: {
        [PRODUCTS_TABLE]: products.map((Item) => ({ PutRequest: { Item } })),
      },
    })
  );
  await client.send(
    new BatchWriteCommand({
      RequestItems: {
        [STOCKS_TABLE]: stocks.map((Item) => ({ PutRequest: { Item } })),
      },
    })
  );

  console.log(`Inserted ${products.length} products and ${stocks.length} stocks`);
  console.log('Sample IDs:', products.slice(0, 2).map((p) => p.id));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
