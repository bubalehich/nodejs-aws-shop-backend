import { APIGatewayProxyHandler } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const BUCKET = process.env.IMPORT_BUCKET!;
const UPLOADED_PREFIX = 'uploaded';
const SIGNED_URL_EXPIRES_IN = 60;

const s3 = new S3Client({});

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Methods': 'GET,OPTIONS',
};

export const handler: APIGatewayProxyHandler = async (event) => {
  console.log('importProductsFile request:', JSON.stringify({ queryStringParameters: event.queryStringParameters }));

  const name = event.queryStringParameters?.name;

  if (!name) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ message: 'Query parameter "name" is required' }),
    };
  }

  try {
    const url = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: `${UPLOADED_PREFIX}/${name}`,
        ContentType: 'text/csv',
      }),
      { expiresIn: SIGNED_URL_EXPIRES_IN }
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(url),
    };
  } catch (err) {
    console.error('importProductsFile error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ message: 'Internal server error' }),
    };
  }
};
