import { APIGatewayProxyHandler } from 'aws-lambda';
import { products } from './products-data';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
};

export const handler: APIGatewayProxyHandler = async (event) => {
  const productId = event.pathParameters?.productId;
  const product = products.find((p) => p.id === productId);

  if (!product) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ message: 'Product not found' }),
    };
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(product),
  };
};
