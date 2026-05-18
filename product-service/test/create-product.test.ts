import { APIGatewayProxyEvent, Context, Callback, APIGatewayProxyResult } from 'aws-lambda';

const sendMock = jest.fn();

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: sendMock }) },
  TransactWriteCommand: jest.fn().mockImplementation((args) => ({ __type: 'Transact', ...args })),
}));

process.env.PRODUCTS_TABLE = 'products';
process.env.STOCKS_TABLE = 'stocks';

import { handler } from '../lambda/create-product';

const invoke = async (body: unknown) => {
  const event = { body: typeof body === 'string' ? body : JSON.stringify(body) } as unknown as APIGatewayProxyEvent;
  const result = await handler(event, {} as Context, {} as Callback);
  return result as APIGatewayProxyResult;
};

describe('createProduct', () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it('creates a product with valid input and returns 201', async () => {
    sendMock.mockResolvedValue({});

    const result = await invoke({ title: 'New', description: 'd', price: 50, count: 3 });

    expect(result.statusCode).toBe(201);
    const parsed = JSON.parse(result.body);
    expect(parsed).toMatchObject({ title: 'New', description: 'd', price: 50, count: 3 });
    expect(parsed.id).toEqual(expect.any(String));
  });

  it('returns 400 on missing title', async () => {
    const result = await invoke({ price: 10 });
    expect(result.statusCode).toBe(400);
  });

  it('returns 400 on negative price', async () => {
    const result = await invoke({ title: 'X', price: -1 });
    expect(result.statusCode).toBe(400);
  });

  it('returns 400 on invalid JSON', async () => {
    const result = await invoke('not-json');
    expect(result.statusCode).toBe(400);
  });

  it('returns 500 on DynamoDB failure', async () => {
    sendMock.mockRejectedValue(new Error('boom'));
    const result = await invoke({ title: 'X', price: 1 });
    expect(result.statusCode).toBe(500);
  });
});
