#!/usr/bin/env node
/*
 * Exports one chat from MongoDB into a JSON file shaped exactly like the app's own
 * IndexedDB records (see app/lib/persistence/db.ts), so it can be imported directly
 * into a browser's IndexedDB via the paired console snippet — no server round-trip,
 * no login/ownership check.
 *
 * Usage: node scripts/export-chat-for-browser.mjs <chatId> [outFile]
 */
import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { gunzipSync } from 'node:zlib';
import { writeFile } from 'node:fs/promises';

const DB_NAME = 'project_db_client';
const COLLECTION = 'chat_history';

const chatId = process.argv[2];
const outFile = process.argv[3] || `chat-export-${chatId}.json`;

if (!chatId) {
  console.error('Usage: node scripts/export-chat-for-browser.mjs <chatId> [outFile]');
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
  const doc = await db.collection(COLLECTION).findOne({ $or: [{ trackingId: chatId }, { urlId: chatId }] });

  if (!doc) {
    console.error(`No chat found for id "${chatId}" (checked trackingId and urlId).`);
    process.exit(1);
  }

  let snapshot;

  if (doc.snapshot?.filesGzip) {
    const gzipBuffer = doc.snapshot.filesGzip.buffer
      ? Buffer.from(doc.snapshot.filesGzip.buffer)
      : Buffer.from(doc.snapshot.filesGzip);
    const files = JSON.parse(gunzipSync(gzipBuffer).toString('utf-8'));

    snapshot = {
      chatIndex: doc.snapshot.chatIndex,
      summary: doc.snapshot.summary,
      files,
    };
  }

  const exportRecord = {
    id: doc.trackingId,
    urlId: doc.urlId,
    description: doc.description,
    messages: doc.messages,
    metadata: doc.metadata,
    timestamp: doc.updatedAt?.toISOString?.() ?? new Date().toISOString(),
    snapshot,
  };

  await writeFile(outFile, JSON.stringify(exportRecord), 'utf-8');

  console.log(`Exported chat "${doc.description ?? 'untitled'}" to ${outFile}`);
  console.log(`Messages: ${doc.messages.length}, snapshot files: ${snapshot ? Object.keys(snapshot.files).length : 0}`);
} finally {
  await client.close();
}
