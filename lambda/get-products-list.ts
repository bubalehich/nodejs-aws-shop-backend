import { APIGatewayProxyHandler } from 'aws-lambda';
import { products } from './products-data';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
};

export const handler: APIGatewayProxyHandler = async () => {
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(products),
  };
};
