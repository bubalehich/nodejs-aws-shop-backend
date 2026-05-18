import { S3Event, S3Handler } from 'aws-lambda';
import { S3Client, GetObjectCommand, CopyObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import csvParser = require('csv-parser');

const s3 = new S3Client({});
const PARSED_PREFIX = 'parsed';

const parseRecord = (stream: Readable): Promise<void> =>
  new Promise((resolve, reject) => {
    stream
      .pipe(csvParser())
      .on('data', (record: Record<string, string>) => {
        console.log('CSV record:', JSON.stringify(record));
      })
      .on('end', () => resolve())
      .on('error', (err: Error) => reject(err));
  });

export const handler: S3Handler = async (event: S3Event) => {
  console.log('importFileParser event:', JSON.stringify(event));

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name;
    const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));

    console.log(`Processing s3://${bucket}/${key}`);

    try {
      const response = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      const body = response.Body as Readable;

      await parseRecord(body);

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
