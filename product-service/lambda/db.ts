import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE!;
export const STOCKS_TABLE = process.env.STOCKS_TABLE!;

export const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}));

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
}

export interface Stock {
  product_id: string;
  count: number;
}

export interface JoinedProduct extends Product {
  count: number;
}

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};
