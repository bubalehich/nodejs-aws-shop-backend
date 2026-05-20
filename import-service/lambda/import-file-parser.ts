import { S3Event, S3Handler } from 'aws-lambda';
import { S3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { SQSClient, SendMessageBatchCommand, SendMessageBatchRequestEntry } from '@aws-sdk/client-sqs';
import { Readable } from 'stream';
import csvParser = require('csv-parser');

const s3 = new S3Client({});
const sqs = new SQSClient({});
const PARSED_PREFIX = 'parsed';
const QUEUE_URL = process.env.CATALOG_QUEUE_URL!;
const SQS_BATCH_LIMIT = 10;

const collectRecords = (stream: Readable): Promise<Record<string, string>[]> =>
  new Promise((resolve, reject) => {
    const records: Record<string, string>[] = [];
    stream
      .pipe(csvParser())
      .on('data', (record: Record<string, string>) => records.push(record))
      .on('end', () => resolve(records))
      .on('error', (err: Error) => reject(err));
  });

const sendBatchesToQueue = async (records: Record<string, string>[]): Promise<void> => {
  for (let i = 0; i < records.length; i += SQS_BATCH_LIMIT) {
    const chunk = records.slice(i, i + SQS_BATCH_LIMIT);
    const entries: SendMessageBatchRequestEntry[] = chunk.map((record, idx) => ({
      Id: String(i + idx),
      MessageBody: JSON.stringify(record),
    }));
    const result = await sqs.send(new SendMessageBatchCommand({ QueueUrl: QUEUE_URL, Entries: entries }));
    if (result.Failed && result.Failed.length > 0) {
      console.error('Failed SQS entries:', JSON.stringify(result.Failed));
      throw new Error(`SQS batch send failed for ${result.Failed.length} entries`);
    }
  }
};

export const handler: S3Handler = async (event: S3Event) => {
  console.log('importFileParser event:', JSON.stringify(event));

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    console.log(`Processing s3://${bucket}/${key}`);

    try {
      const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      const body = response.Body as Readable;

      const records = await collectRecords(body);
      console.log(`Parsed ${records.length} CSV record(s) from ${key}`);

      if (records.length > 0) {
        await sendBatchesToQueue(records);
        console.log(`Sent ${records.length} message(s) to SQS`);
      }

      const parsedKey = key.replace(/^uploaded\//, `${PARSED_PREFIX}/`);
      await s3.send(
        new CopyObjectCommand({
          Bucket: bucket,
          CopySource: `${bucket}/${key}`,
          Key: parsedKey,
        })
      );
      await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));

      console.log(`Moved s3://${bucket}/${key} to s3://${bucket}/${parsedKey}`);
    } catch (err) {
      console.error('importFileParser error for', key, err);
      throw err;
    }
  }
};
