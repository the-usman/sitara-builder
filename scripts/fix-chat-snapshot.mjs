#!/usr/bin/env node
/*
 * Repairs a chat's stored `snapshot.filesGzip` in MongoDB by rebuilding it from the
 * chat's own message transcript (replaying every <boltAction type="file"> block, in
 * order — same approach as scripts/recover-chat-files.mjs).
 *
 * Why this is needed: useChatHistory.ts trusts the snapshot completely once its
 * `chatIndex` matches a message id in the chat — it skips re-rendering every message
 * before that point and archives them, showing only what's in the snapshot. If the
 * snapshot was captured with an empty file set (e.g. pushed while the workbench hadn't
 * loaded files yet), the chat is stuck showing an empty "Restoring Project..." artifact
 * forever, even though the real files are still sitting in the message transcript.
 *
 * This writes a correct snapshot back to Mongo so the normal in-app flow (opening the
 * chat URL, which pulls it into IndexedDB via chat-sync.client.ts) restores properly.
 *
 * Usage: node scripts/fix-chat-snapshot.mjs <chatId>
 */
import 'dotenv/config';
import { MongoClient, Binary } from 'mongodb';
import { gzipSync, gunzipSync } from 'node:zlib';

const DB_NAME = 'project_db_client';
const COLLECTION = 'chat_history';

const chatId = process.argv[2];

if (!chatId) {
  console.error('Usage: node scripts/fix-chat-snapshot.mjs <chatId>');
  process.exit(1);
}

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('MONGODB_URI is not set (checked .env / process.env).');
  process.exit(1);
}

function stripMarkdownFence(content) {
  const match = content.match(/^\s*```\w*\n([\s\S]*?)\n\s*```\s*$/);
  return match ? match[1] : content;
}

function unescapeTags(content) {
  return content.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

function getAttr(attrString, name) {
  const match = attrString.match(new RegExp(`${name}="([^"]*)"`));
  return match ? match[1] : undefined;
}

/** Replays every <boltAction type="file"> block across all assistant messages, in order. */
function reconstructFilesFromMessages(messages) {
  const files = new Map();

  for (const message of messages) {
    if (message.role !== 'assistant') {
      continue;
    }

    const content = typeof message.content === 'string' ? message.content : '';
    const actionRegex = /<boltAction\b([^>]*)>([\s\S]*?)<\/boltAction>/g;

    let match;

    while ((match = actionRegex.exec(content)) !== null) {
      const [, attrString, rawInner] = match;

      if (getAttr(attrString, 'type') !== 'file') {
        continue;
      }

      const filePath = getAttr(attrString, 'filePath');

      if (!filePath) {
        continue;
      }

      let inner = rawInner.trim();

      if (!filePath.endsWith('.md')) {
        inner = stripMarkdownFence(inner);
        inner = unescapeTags(inner);
      }

      files.set(filePath, inner + '\n');
    }
  }

  return files;
}

const client = new MongoClient(uri);

try {
  await client.connect();

  const db = client.db(DB_NAME);
  const collection = db.collection(COLLECTION);

  const doc = await collection.findOne({ $or: [{ trackingId: chatId }, { urlId: chatId }] });

  if (!doc) {
    console.error(`No chat found for id "${chatId}" (checked trackingId and urlId).`);
    process.exit(1);
  }

  const existingFileCount = (() => {
    try {
      if (!doc.snapshot?.filesGzip) {
        return 0;
      }

      const buf = doc.snapshot.filesGzip.buffer
        ? Buffer.from(doc.snapshot.filesGzip.buffer)
        : Buffer.from(doc.snapshot.filesGzip);

      return Object.keys(JSON.parse(gunzipSync(buf).toString('utf-8'))).length;
    } catch {
      return -1; // unreadable
    }
  })();

  const replayed = reconstructFilesFromMessages(doc.messages);

  console.log(`Chat: "${doc.description ?? 'untitled'}"`);
  console.log(`Current snapshot file count: ${existingFileCount}`);
  console.log(`Reconstructed from transcript: ${replayed.size} file(s)`);

  if (replayed.size === 0) {
    console.error('Nothing to write: transcript replay found no file actions. Aborting, snapshot left untouched.');
    process.exit(1);
  }

  const fileMap = {};

  for (const [filePath, content] of replayed) {
    fileMap[filePath] = { type: 'file', content, isBinary: false };
  }

  const json = JSON.stringify(fileMap);
  const gzipBuffer = gzipSync(Buffer.from(json, 'utf-8'));

  const lastMessage = doc.messages[doc.messages.length - 1];

  const newSnapshot = {
    chatIndex: doc.snapshot?.chatIndex ?? lastMessage?.id ?? '',
    summary: doc.snapshot?.summary,
    filesGzip: new Binary(gzipBuffer),
    uncompressedBytes: Buffer.byteLength(json, 'utf-8'),
  };

  const result = await collection.updateOne(
    { _id: doc._id },
    { $set: { snapshot: newSnapshot, updatedAt: new Date() } },
  );

  console.log(`\nUpdated ${result.modifiedCount} document. Snapshot now has ${replayed.size} file(s).`);
  console.log('Reopen the chat in the web builder — it will pull this corrected snapshot into IndexedDB.');
} finally {
  await client.close();
}
