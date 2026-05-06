import { handler } from '../lambda/get-products-by-id';
import { products } from '../lambda/products-data';
import { APIGatewayProxyEvent, Context, Callback, APIGatewayProxyResult } from 'aws-lambda';

const invoke = async (productId?: string) => {
  const event = { pathParameters: productId ? { productId } : null } as unknown as APIGatewayProxyEvent;
  const result = await handler(event, {} as Context, {} as Callback);
  return result as APIGatewayProxyResult;
};

describe('getProductsById', () => {
  it('returns 200 and the matching product when ID exists', async () => {
    const expected = products[0];
    const result = await invoke(expected.id);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body)).toEqual(expected);
  });

  it('returns 404 when product does not exist', async () => {
    const result = await invoke('non-existent-id');

    expect(result.statusCode).toBe(404);
    expect(JSON.parse(result.body)).toEqual({ message: 'Product not found' });
  });

  it('returns 404 when productId is missing', async () => {
    const result = await invoke();

    expect(result.statusCode).toBe(404);
  });

  it('includes CORS headers', async () => {
    const result = await invoke(products[0].id);
    expect(result.headers).toMatchObject({
      'Access-Control-Allow-Origin': '*',
    });
  });
});
