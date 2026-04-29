import { handler } from '../lambda/get-products-list';
import { products } from '../lambda/products-data';
import { APIGatewayProxyEvent, Context, Callback, APIGatewayProxyResult } from 'aws-lambda';

const invoke = async () => {
  const result = await handler({} as APIGatewayProxyEvent, {} as Context, {} as Callback);
  return result as APIGatewayProxyResult;
};

describe('getProductsList', () => {
  it('returns 200 status code', async () => {
    const result = await invoke();
    expect(result.statusCode).toBe(200);
  });

  it('returns all products', async () => {
    const result = await invoke();
    expect(JSON.parse(result.body)).toEqual(products);
  });

  it('includes CORS headers', async () => {
    const result = await invoke();
    expect(result.headers).toMatchObject({
      'Access-Control-Allow-Origin': '*',
    });
  });
});
