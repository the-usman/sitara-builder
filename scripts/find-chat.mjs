#!/usr/bin/env node
/*
 * Looks up a chat in the synced MongoDB history by trackingId or urlId.
 * Usage: node scripts/find-chat.mjs <chatId>
 */
import 'dotenv/config';
import { MongoClient } from 'mongodb';

const DB_NAME = 'project_db_client';
const COLLECTION = 'chat_history';

const chatId = process.argv[2];

if (!chatId) {
  console.error('Usage: node scripts/find-chat.mjs <chatId>');
  process.exit(1);
}

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('MONGODB_URI is not set (checked .env / process.env).');
  process.exit(1);
}

const client = new MongoClient(uri);

try {
  await client.connect();

  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION);

  const doc = await collection.findOne(
    { $or: [{ trackingId: chatId }, { urlId: chatId }] },
    { projection: { 'snapshot.filesGzip': 0 } },
  );

  if (!doc) {
    console.log(`No chat found for id "${chatId}" (checked trackingId and urlId).`);

    // Help spot typos / near matches.
    const candidates = await collection
      .find(
        {
          $or: [
            { trackingId: { $regex: chatId.slice(0, 6), $options: 'i' } },
            { urlId: { $regex: chatId.slice(0, 6), $options: 'i' } },
          ],
        },
        { projection: { trackingId: 1, urlId: 1, description: 1, userId: 1, updatedAt: 1 } },
      )
      .limit(10)
      .toArray();

    if (candidates.length > 0) {
      console.log('\nPossible near-matches:');
      console.table(candidates);
    }
  } else {
    console.log('Found chat:');
    console.log(
      JSON.stringify(
        {
          trackingId: doc.trackingId,
          urlId: doc.urlId,
          description: doc.description,
          userId: doc.userId,
          messageCount: Array.isArray(doc.messages) ? doc.messages.length : undefined,
          hasSnapshot: Boolean(doc.snapshot),
          createdAt: doc.createdAt,
          updatedAt: doc.updatedAt,
        },
        null,
        2,
      ),
    );
  }
} finally {
  await client.close();
}
