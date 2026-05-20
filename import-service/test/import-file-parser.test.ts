import { Readable } from 'stream';

const sendMock = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: sendMock })),
  GetObjectCommand: jest.fn().mockImplementation((args) => ({ __type: 'Get', ...args })),
  CopyObjectCommand: jest.fn().mockImplementation((args) => ({ __type: 'Copy', ...args })),
  DeleteObjectCommand: jest.fn().mockImplementation((args) => ({ __type: 'Delete', ...args })),
}));

import { handler } from '../lambda/import-file-parser';
import type { S3Event, Context, Callback } from 'aws-lambda';

const makeEvent = (key: string): S3Event => ({
  Records: [
    {
      s3: {
        bucket: { name: 'test-bucket' } as S3Event['Records'][0]['s3']['bucket'],
        object: { key } as S3Event['Records'][0]['s3']['object'],
      } as S3Event['Records'][0]['s3'],
    } as S3Event['Records'][0],
  ],
});

const csvStream = () => Readable.from('title,price\nA,10\nB,20\n');

describe('importFileParser', () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it('parses the CSV and moves the file from uploaded/ to parsed/', async () => {
    sendMock
      .mockResolvedValueOnce({ Body: csvStream() })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});

    await handler(makeEvent('uploaded/test.csv'), {} as Context, {} as Callback);

    const calls = sendMock.mock.calls.map(([cmd]) => cmd);
    expect(calls[0]).toMatchObject({ __type: 'Get', Bucket: 'test-bucket', Key: 'uploaded/test.csv' });
    expect(calls[1]).toMatchObject({ __type: 'Copy', Bucket: 'test-bucket', Key: 'parsed/test.csv' });
    expect(calls[2]).toMatchObject({ __type: 'Delete', Bucket: 'test-bucket', Key: 'uploaded/test.csv' });
  });

  it('propagates errors from S3', async () => {
    sendMock.mockRejectedValue(new Error('boom'));

    await expect(
      handler(makeEvent('uploaded/test.csv'), {} as Context, {} as Callback)
    ).rejects.toThrow('boom');
  });
});
