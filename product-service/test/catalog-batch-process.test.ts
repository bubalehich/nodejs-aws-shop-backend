import type { SQSEvent, Context, Callback } from 'aws-lambda';

const ddbSendMock = jest.fn();
const snsSendMock = jest.fn();

jest.mock('@aws-sdk/lib-dynamodb', () => ({
  DynamoDBDocumentClient: { from: () => ({ send: ddbSendMock }) },
  TransactWriteCommand: jest.fn().mockImplementation((args) => ({ __type: 'Transact', ...args })),
}));

jest.mock('@aws-sdk/client-sns', () => ({
  SNSClient: jest.fn().mockImplementation(() => ({ send: snsSendMock })),
  PublishCommand: jest.fn().mockImplementation((args) => ({ __type: 'Publish', ...args })),
}));

process.env.PRODUCTS_TABLE = 'products';
process.env.STOCKS_TABLE = 'stocks';
process.env.CREATE_PRODUCT_TOPIC_ARN = 'arn:aws:sns:us-east-1:000:topic';

import { handler } from '../lambda/catalog-batch-process';

const makeEvent = (records: Array<Record<string, unknown>>): SQSEvent => ({
  Records: records.map((body, i) => ({
    messageId: `msg-${i}`,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })) as SQSEvent['Records'],
});

describe('catalogBatchProcess', () => {
  beforeEach(() => {
    ddbSendMock.mockReset();
    snsSendMock.mockReset();
  });

  it('creates a product per valid SQS record and publishes one SNS notification', async () => {
    ddbSendMock.mockResolvedValue({});
    snsSendMock.mockResolvedValue({});

    const event = makeEvent([
      { title: 'A', price: '10', count: '5', description: 'd' },
      { title: 'B', price: '20', count: '2' },
    ]);

    await handler(event, {} as Context, {} as Callback);

    expect(ddbSendMock).toHaveBeenCalledTimes(2);
    expect(snsSendMock).toHaveBeenCalledTimes(1);

    const publish = snsSendMock.mock.calls[0][0];
    expect(publish.TopicArn).toBe('arn:aws:sns:us-east-1:000:topic');
    expect(publish.MessageAttributes.count.StringValue).toBe('2');
    expect(publish.MessageAttributes.maxPrice.StringValue).toBe('20');
  });

  it('skips invalid records (missing title, bad price) and continues', async () => {
    ddbSendMock.mockResolvedValue({});
    snsSendMock.mockResolvedValue({});

    const event = makeEvent([
      { title: '', price: '10', count: '1' },
      { price: 'NaN', count: '1' },
      { title: 'OK', price: '5', count: '1' },
    ]);

    await handler(event, {} as Context, {} as Callback);

    expect(ddbSendMock).toHaveBeenCalledTimes(1);
    expect(snsSendMock).toHaveBeenCalledTimes(1);
  });

  it('does not publish to SNS when nothing was created', async () => {
    const event = makeEvent([{ title: '', price: '-1', count: '0' }]);

    await handler(event, {} as Context, {} as Callback);

    expect(ddbSendMock).not.toHaveBeenCalled();
    expect(snsSendMock).not.toHaveBeenCalled();
  });

  it('continues processing when DynamoDB write fails for one record', async () => {
    ddbSendMock.mockRejectedValueOnce(new Error('ddb boom')).mockResolvedValueOnce({});
    snsSendMock.mockResolvedValue({});

    const event = makeEvent([
      { title: 'Fails', price: '10', count: '1' },
      { title: 'Works', price: '20', count: '2' },
    ]);

    await handler(event, {} as Context, {} as Callback);

    expect(ddbSendMock).toHaveBeenCalledTimes(2);
    expect(snsSendMock).toHaveBeenCalledTimes(1);
  });

  it('handles malformed JSON in message body gracefully', async () => {
    ddbSendMock.mockResolvedValue({});

    const event = makeEvent(['{not-json' as never]);

    await handler(event, {} as Context, {} as Callback);

    expect(ddbSendMock).not.toHaveBeenCalled();
    expect(snsSendMock).not.toHaveBeenCalled();
  });
});
