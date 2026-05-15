import { APIGatewayProxyEvent, Context, Callback, APIGatewayProxyResult } from 'aws-lambda';

const sendMock = jest.fn();

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: sendMock }) },
  GetCommand: jest.fn().mockImplementation((args) => ({ __type: 'Get', ...args })),
}));

process.env.PRODUCTS_TABLE = 'products';
process.env.STOCKS_TABLE = 'stocks';

import { handler } from '../lambda/get-products-by-id';

const product = { id: 'p1', title: 'A', description: 'Desc', price: 10 };
const stock = { product_id: 'p1', count: 5 };

const invoke = async (productId?: string) => {
  const event = { pathParameters: productId ? { productId } : null } as unknown as APIGatewayProxyEvent;
  const result = await handler(event, {} as Context, {} as Callback);
  return result as APIGatewayProxyResult;
};

describe('getProductsById', () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it('returns 200 with the joined product when found', async () => {
    sendMock
      .mockResolvedValueOnce({ Item: product })
      .mockResolvedValueOnce({ Item: stock });

    const result = await invoke('p1');

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual({ ...product, count: 5 });
  });

  it('returns 404 when product not found', async () => {
    sendMock
      .mockResolvedValueOnce({ Item: undefined })
      .mockResolvedValueOnce({ Item: undefined });

    const result = await invoke('missing');

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toEqual({ message: 'Product not found' });
  });

  it('returns 400 when productId is missing', async () => {
    const result = await invoke();
    expect(result.statusCode).toBe(400);
  });

  it('returns 500 on DynamoDB failure', async () => {
    sendMock.mockRejectedValue(new Error('boom'));
    const result = await invoke('p1');
    expect(result.statusCode).toBe(500);
  });
});
