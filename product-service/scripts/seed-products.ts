import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';

const REGION = process.env.AWS_REGION || 'us-east-1';
const PRODUCTS_TABLE = process.env.PRODUCTS_TABLE || 'products';
const STOCKS_TABLE = process.env.STOCKS_TABLE || 'stocks';

const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }));

const seed = [
  { title: 'The One Ring', description: 'Forged in the fires of Mount Doom. One ring to rule them all.', price: 9999, count: 1 },
  { title: 'Sting', description: 'Elven dagger that glows blue when orcs are near. Wielded by Bilbo and Frodo.', price: 450, count: 3 },
  { title: 'Andúril, Flame of the West', description: 'Reforged from the shards of Narsil. Sword of the King of Gondor.', price: 1200, count: 1 },
  { title: 'Mithril Shirt', description: 'Lightweight chainmail forged in Moria. Worth more than the Shire.', price: 5000, count: 2 },
  { title: 'Lembas Bread', description: 'Elven waybread from Lothlórien. One bite fills the stomach of a grown man.', price: 12, count: 50 },
  { title: 'Pipe-weed (Longbottom Leaf)', description: 'The finest weed in the Southfarthing. A hobbit\'s best friend.', price: 8, count: 100 },
  { title: 'Galadriel\'s Phial', description: 'A crystal phial containing the light of Eärendil\'s star.', price: 2200, count: 1 },
  { title: 'Elven Cloak', description: 'Grey cloak from Lothlórien. Hides the wearer from unfriendly eyes.', price: 180, count: 9 },
  { title: 'Palantír', description: 'A seeing-stone of Númenor. Use with caution — Sauron is watching.', price: 7500, count: 2 },
  { title: 'Horn of Gondor', description: 'Bound with silver. Sounds across the lands of the Steward.', price: 350, count: 1 },
];

async function run() {
  const products = seed.map((p) => ({
    id: randomUUID(),
    title: p.title,
    description: p.description,
    price: p.price,
  }));
  const stocks = products.map((p, i) => ({
    product_id: p.id,
    count: seed[i].count,
  }));

  await client.send(
    new BatchWriteCommand({
      RequestItems: {
        [PRODUCTS_TABLE]: products.map((Item) => ({ PutRequest: { Item } })),
      },
    })
  );
  await client.send(
    new BatchWriteCommand({
      RequestItems: {
        [STOCKS_TABLE]: stocks.map((Item) => ({ PutRequest: { Item } })),
      },
    })
  );

  console.log(`Inserted ${products.length} products and ${stocks.length} stocks`);
  console.log('Sample IDs:', products.slice(0, 2).map((p) => p.id));
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
