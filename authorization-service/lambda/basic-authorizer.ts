import {
  APIGatewayTokenAuthorizerEvent,
  APIGatewayAuthorizerResult,
  Context,
  Callback,
} from 'aws-lambda';

const generatePolicy = (
  principalId: string,
  effect: 'Allow' | 'Deny',
  resource: string
): APIGatewayAuthorizerResult => ({
  principalId,
  policyDocument: {
    Version: '2012-10-17',
    Statement: [
      {
        Action: 'execute-api:Invoke',
        Effect: effect,
        Resource: resource,
      },
    ],
  },
});

export const handler = (
  event: APIGatewayTokenAuthorizerEvent,
  _context: Context,
  callback: Callback
): void => {
  console.log('basicAuthorizer event:', JSON.stringify({ methodArn: event.methodArn, type: event.type }));

  const authHeader = event.authorizationToken;

  if (!authHeader) {
    callback('Unauthorized');
    return;
  }

  try {
    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Basic' || !token) {
      callback('Unauthorized');
      return;
    }

    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [login, password] = decoded.split(':');

    const expectedPassword = process.env[login];
    const effect: 'Allow' | 'Deny' =
      expectedPassword !== undefined && expectedPassword === password ? 'Allow' : 'Deny';

    console.log(`Authorization for "${login}": ${effect}`);
    callback(null, generatePolicy(login, effect, event.methodArn));
  } catch (err) {
    console.error('basicAuthorizer error:', err);
    callback('Unauthorized');
  }
};
