import { APIGatewayProxyHandler } from 'aws-lambda';
import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, PRODUCTS_TABLE, STOCKS_TABLE, corsHeaders, Product, Stock } from './db';

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('getProductsById request:', JSON.stringify({ pathParameters: event.pathParameters }));

  const productId = event.pathParameters?.productId;

  if (!productId) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'productId is required' }),
    };
  }

  try {
    const [productResult, stockResult] = await Promise.all([
      ddb.send(new GetCommand({ TableName: PRODUCTS_TABLE, Key: { id: productId } })),
      ddb.send(new GetCommand({ TableName: STOCKS_TABLE, Key: { product_id: productId } })),
    ]);

    const product = productResult.Item as Product | undefined;

    if (!product) {
      return {
        statusCode: 404,
        headers: corsHeaders,
        body: JSON.stringify({ message: 'Product not found' }),
      };
    }

    const stock = stockResult.Item as Stock | undefined;

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({ ...product, count: stock?.count ?? 0 }),
    };
  } catch (err) {
    console.error('getProductsById error:', err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};
