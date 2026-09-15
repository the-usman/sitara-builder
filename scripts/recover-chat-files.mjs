#!/usr/bin/env node
/*
 * Recovers a chat's project files straight out of MongoDB, bypassing the app/UI
 * entirely (WebContainer, browser, etc).
 *
 * Two sources are tried, in order:
 *  1. The chat's `snapshot.filesGzip` — the fast path the app itself uses to restore a
 *     project. This can legitimately be empty/stale if it was synced before any files
 *     existed (e.g. captured mid-restore while the workbench was still empty).
 *  2. A full replay of every assistant message's <boltAction type="file"> blocks, in
 *     order, so a later edit to a path overwrites an earlier one — the same thing the
 *     app's own message parser (app/lib/runtime/message-parser.ts) does when it renders
 *     these messages. This reconstructs the project from the chat transcript itself, so
 *     it works even when the snapshot is empty.
 *
 * Usage: node scripts/recover-chat-files.mjs <chatId> [outDir]
 *   outDir defaults to ./recovered-<chatId>
 */
import 'dotenv/config';
import { MongoClient } from 'mongodb';
import { gunzipSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const DB_NAME = 'project_db_client';
const COLLECTION = 'chat_history';

const chatId = process.argv[2];
const outDirArg = process.argv[3];

if (!chatId) {
  console.error('Usage: node scripts/recover-chat-files.mjs <chatId> [outDir]');
  process.exit(1);
}

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('MONGODB_URI is not set (checked .env / process.env).');
  process.exit(1);
}

const outDir = path.resolve(outDirArg || `./recovered-${chatId}`);

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
  let fileActionCount = 0;

  for (const message of messages) {
    if (message.role !== 'assistant') {
      continue;
    }

    const content = typeof message.content === 'string' ? message.content : '';
    const actionRegex = /<boltAction\b([^>]*)>([\s\S]*?)<\/boltAction>/g;

    let match;

    while ((match = actionRegex.exec(content)) !== null) {
      const [, attrString, rawInner] = match;
      const type = getAttr(attrString, 'type');

      if (type !== 'file') {
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
      fileActionCount++;
    }
  }

  return { files, fileActionCount };
}

function normalizeRelPath(relPath) {
  return relPath.replace(/^\/?(home\/project\/?)?/, '');
}

async function writeFiles(files, outDir) {
  let written = 0;
  let skipped = 0;

  for (const [relPath, content] of files) {
    const cleanRelPath = normalizeRelPath(relPath);
    const fullPath = path.join(outDir, cleanRelPath);

    if (!fullPath.startsWith(outDir)) {
      console.warn(`Skipping suspicious path outside output dir: ${relPath}`);
      skipped++;
      continue;
    }

    await mkdir(path.dirname(fullPath), { recursive: true });
    await writeFile(fullPath, content, 'utf-8');
    written++;
  }

  return { written, skipped };
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

  console.log(`Chat: "${doc.description ?? 'untitled'}" (${doc.messages.length} messages)`);

  // --- Source 1: stored snapshot ---
  let snapshotFiles = new Map();

  if (doc.snapshot?.filesGzip) {
    const gzipBuffer = doc.snapshot.filesGzip.buffer
      ? Buffer.from(doc.snapshot.filesGzip.buffer)
      : Buffer.from(doc.snapshot.filesGzip);
    const parsed = JSON.parse(gunzipSync(gzipBuffer).toString('utf-8'));

    for (const [p, entry] of Object.entries(parsed)) {
      if (entry?.type === 'file') {
        snapshotFiles.set(p, entry.isBinary ? Buffer.from(entry.content, 'base64') : entry.content);
      }
    }
  }

  console.log(`Snapshot: ${snapshotFiles.size} file(s)`);

  // --- Source 2: replay from message transcript ---
  const { files: replayedFiles, fileActionCount } = reconstructFilesFromMessages(doc.messages);
  console.log(`Transcript replay: ${fileActionCount} file action(s) across all messages -> ${replayedFiles.size} unique file(s)`);

  const useSnapshot = snapshotFiles.size > 0;
  const finalFiles = useSnapshot ? snapshotFiles : replayedFiles;

  console.log(`\nUsing ${useSnapshot ? 'snapshot' : 'transcript replay'} as the source of truth.`);

  const { written, skipped } = await writeFiles(finalFiles, outDir);

  console.log(`\nWrote ${written} file(s) to: ${outDir}`);

  if (skipped) {
    console.log(`Skipped ${skipped} suspicious path(s).`);
  }
} finally {
  await client.close();
}
