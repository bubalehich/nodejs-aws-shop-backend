import { SQSHandler } from 'aws-lambda';
import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { randomUUID } from 'crypto';
import { ddb, PRODUCTS_TABLE, STOCKS_TABLE } from './db';

const sns = new SNSClient({});
const TOPIC_ARN = process.env.CREATE_PRODUCT_TOPIC_ARN!;

interface CsvProduct {
  title: string;
  description?: string;
  price: number;
  count: number;
}

function parseProduct(raw: Record<string, string>): CsvProduct | null {
  const price = Number(raw.price);
  const count = Number(raw.count);
  if (!raw.title || !Number.isFinite(price) || price < 0 || !Number.isFinite(count) || count < 0) {
    return null;
  }
  return {
    title: raw.title.trim(),
    description: raw.description?.trim() ?? '',
    price,
    count: Math.trunc(count),
  };
}

export const handler: SQSHandler = async (event) => {
  console.log('catalogBatchProcess event:', JSON.stringify({ count: event.Records.length }));

  const created: Array<{ id: string; title: string; price: number; count: number }> = [];

  for (const record of event.Records) {
    let parsed: Record<string, string>;
    try {
      parsed = JSON.parse(record.body);
    } catch (err) {
      console.error('Invalid JSON in SQS message body:', record.body, err);
      continue;
    }

    const product = parseProduct(parsed);
    if (!product) {
      console.error('Invalid product payload:', parsed);
      continue;
    }

    const id = randomUUID();
    try {
      await ddb.send(
        new TransactWriteCommand({
          TransactItems: [
            {
              Put: {
                TableName: PRODUCTS_TABLE,
                Item: { id, title: product.title, description: product.description, price: product.price },
              },
            },
            {
              Put: {
                TableName: STOCKS_TABLE,
                Item: { product_id: id, count: product.count },
              },
            },
          ],
        })
      );
      created.push({ id, title: product.title, price: product.price, count: product.count });
      console.log('Created product', id, product.title);
    } catch (err) {
      console.error('Failed to create product', product.title, err);
    }
  }

  if (created.length > 0) {
    try {
      await sns.send(
        new PublishCommand({
          TopicArn: TOPIC_ARN,
          Subject: `Imported ${created.length} product(s)`,
          Message: JSON.stringify({ count: created.length, products: created }, null, 2),
          MessageAttributes: {
            count: { DataType: 'Number', StringValue: String(created.length) },
            maxPrice: {
              DataType: 'Number',
              StringValue: String(Math.max(...created.map((p) => p.price))),
            },
          },
        })
      );
      console.log(`Published SNS notification for ${created.length} products`);
    } catch (err) {
      console.error('Failed to publish SNS notification:', err);
    }
  }
};
