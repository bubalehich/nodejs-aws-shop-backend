import { APIGatewayProxyEvent, Context, Callback, APIGatewayProxyResult } from 'aws-lambda';

const sendMock = jest.fn();

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: sendMock }) },
  ScanCommand: jest.fn().mockImplementation((args) => ({ __type: 'Scan', ...args })),
}));

process.env.PRODUCTS_TABLE = 'products';
process.env.STOCKS_TABLE = 'stocks';

import { handler } from '../lambda/get-products-list';

const products = [
  { id: 'p1', title: 'A', description: 'Desc', price: 10 },
  { id: 'p2', title: 'B', description: 'Desc', price: 20 },
];
const stocks = [
  { product_id: 'p1', count: 5 },
  { product_id: 'p2', count: 0 },
];

const invoke = async () => {
  const event = { path: '/products', queryStringParameters: null } as unknown as APIGatewayProxyEvent;
  const result = await handler(event, {} as Context, {} as Callback);
  return result as APIGatewayProxyResult;
};

describe('getProductsList', () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  it('returns 200 with joined products and stocks', async () => {
    sendMock
      .mockResolvedValueOnce({ Items: products })
      .mockResolvedValueOnce({ Items: stocks });

    const result = await invoke();

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual([
      { ...products[0], count: 5 },
      { ...products[1], count: 0 },
    ]);
  });

  it('returns 500 on DynamoDB failure', async () => {
    sendMock.mockRejectedValue(new Error('boom'));
    const result = await invoke();
    expect(result.statusCode).toBe(500);
  });
});
