import { APIGatewayProxyHandler } from 'aws-lambda';
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { ddb, PRODUCTS_TABLE, STOCKS_TABLE, corsHeaders } from './db';

interface CreateProductInput {
  title?: unknown;
  description?: unknown;
  price?: unknown;
  count?: unknown;
}

function validate(input: CreateProductInput): string | null {
  if (typeof input.title !== 'string' || input.title.trim() === '') {
    return 'title is required and must be a non-empty string';
  }
  if (input.description !== undefined && typeof input.description !== 'string') {
    return 'description must be a string';
  }
  if (typeof input.price !== 'number' || input.price < 0) {
    return 'price is required and must be a non-negative number';
  }
  if (input.count !== undefined && (typeof input.count !== 'number' || input.count < 0 || !Number.isInteger(input.count))) {
    return 'count must be a non-negative integer';
  }
  return null;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('createProduct request:', JSON.stringify({ body: event.body }));

  let parsed: CreateProductInput;
  try {
    parsed = JSON.parse(event.body ?? '{}');
  } catch {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Invalid JSON body' }),
    };
  }

  const error = validate(parsed);
  if (error) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ message: error }),
    };
  }

  const id = randomUUID();
  const product = {
    id,
    title: (parsed.title as string).trim(),
    description: (parsed.description as string | undefined) ?? '',
    price: parsed.price as number,
  };
  const stock = {
    product_id: id,
    count: (parsed.count as number | undefined) ?? 0,
  };

  try {
    await ddb.send(
      new TransactWriteCommand({
        TransactItems: [
          { Put: { TableName: PRODUCTS_TABLE, Item: product } },
          { Put: { TableName: STOCKS_TABLE, Item: stock } },
        ],
      })
    );

    return {
      statusCode: 201,
      headers: corsHeaders,
      body: JSON.stringify({ ...product, count: stock.count }),
    };
  } catch (err) {
    console.error('createProduct error:', err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};
