import { APIGatewayProxyEvent, Context, Callback, APIGatewayProxyResult } from 'aws-lambda';

const getSignedUrlMock = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({})),
  PutObjectCommand: jest.fn().mockImplementation((args) => ({ __type: 'Put', ...args })),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: (...args: unknown[]) => getSignedUrlMock(...args),
}));

process.env.IMPORT_BUCKET = 'test-bucket';

import { handler } from '../lambda/import/import-products-file';

const invoke = async (name?: string) => {
  const event = { queryStringParameters: name ? { name } : null } as unknown as APIGatewayProxyEvent;
  const result = await handler(event, {} as Context, {} as Callback);
  return result as APIGatewayProxyResult;
};

describe('importProductsFile', () => {
  beforeEach(() => {
    getSignedUrlMock.mockReset();
  });

  it('returns 200 with the signed URL when name is provided', async () => {
    getSignedUrlMock.mockResolvedValue('https://signed-url');

    const result = await invoke('file.csv');

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toBe('https://signed-url');
  });

  it('passes uploaded/<name> as the S3 key', async () => {
    getSignedUrlMock.mockResolvedValue('https://signed-url');

    await invoke('file.csv');

    const [, command] = getSignedUrlMock.mock.calls[0];
    expect(command.Bucket).toBe('test-bucket');
    expect(command.Key).toBe('uploaded/file.csv');
  });

  it('returns 400 when name is missing', async () => {
    const result = await invoke();
    expect(result.statusCode).toBe(400);
  });

  it('returns 500 when signing fails', async () => {
    getSignedUrlMock.mockRejectedValue(new Error('boom'));
    const result = await invoke('file.csv');
    expect(result.statusCode).toBe(500);
  });
});
