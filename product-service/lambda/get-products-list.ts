import { APIGatewayProxyHandler } from 'aws-lambda';
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { ddb, PRODUCTS_TABLE, STOCKS_TABLE, corsHeaders, Product, Stock, JoinedProduct } from './db';

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('getProductsList request:', JSON.stringify({ path: event.path, queryStringParameters: event.queryStringParameters }));

  try {
    const [productsResult, stocksResult] = await Promise.all([
      ddb.send(new ScanCommand({ TableName: PRODUCTS_TABLE })),
      ddb.send(new ScanCommand({ TableName: STOCKS_TABLE })),
    ]);

    const products = (productsResult.Items as Product[]) ?? [];
    const stocks = (stocksResult.Items as Stock[]) ?? [];
    const stockByProduct = new Map(stocks.map((s) => [s.product_id, s.count]));

    const joined: JoinedProduct[] = products.map((p) => ({
      ...p,
      count: stockByProduct.get(p.id) ?? 0,
    }));

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(joined),
    };
  } catch (err) {
    console.error('getProductsList error:', err);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};
