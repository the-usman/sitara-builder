#!/usr/bin/env node
/*
 * Verifies every chat that's supposed to be on GitHub actually has real content there —
 * not just that the migration script logged "done". For each chat with
 * metadata.githubUrl set, checks:
 *   1. The repo actually exists and is reachable with the shared token.
 *   2. Its default branch has a non-empty file tree.
 *   3. The file count roughly matches what's reconstructable from the chat's own
 *      transcript (the same ground truth the migration used) — a big mismatch means
 *      something went wrong, not just natural drift.
 *
 * Usage: node scripts/verify-github-migration.mjs
 */
import 'dotenv/config';
import { MongoClient } from 'mongodb';

const DB_NAME = 'project_db_client';
const CHATS_COLLECTION = 'chat_history';
const GITHUB_API = 'https://api.github.com';

const uri = process.env.MONGODB_URI;
const token = process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN;

if (!uri) {
  console.error('MONGODB_URI is not set.');
  process.exit(1);
}

if (!token) {
  console.error('GITHUB_TOKEN is not set.');
  process.exit(1);
}

function ghHeaders() {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'sitara-builder-verify',
  };
}

function getAttr(attrString, name) {
  const match = attrString.match(new RegExp(`${name}="([^"]*)"`));
  return match ? match[1] : undefined;
}

/** Same transcript replay used by the migration — the best available ground truth now that migrated chats no longer keep a Mongo snapshot. */
function reconstructFileCountFromMessages(messages) {
  const files = new Set();

  for (const message of messages) {
    if (message.role !== 'assistant') {
      continue;
    }

    const content = typeof message.content === 'string' ? message.content : '';
    const actionRegex = /<boltAction\b([^>]*)>([\s\S]*?)<\/boltAction>/g;

    let match;

    while ((match = actionRegex.exec(content)) !== null) {
      if (getAttr(match[1], 'type') !== 'file') {
        continue;
      }

      const filePath = getAttr(match[1], 'filePath');

      if (filePath) {
        files.add(filePath);
      }
    }
  }

  return files.size;
}

function parseGithubUrl(repoUrl) {
  try {
    const parsed = new URL(repoUrl);
    const [owner, repo] = parsed.pathname.replace(/^\/+/, '').split('/');
    return owner && repo ? { owner, repo } : undefined;
  } catch {
    return undefined;
  }
}

const client = new MongoClient(uri);

try {
  await client.connect();

  const db = client.db(DB_NAME);
  const collection = db.collection(CHATS_COLLECTION);

  const migrated = await collection.find({ 'metadata.githubUrl': { $exists: true, $ne: null } }).toArray();
  const unmigrated = await collection.find({ 'metadata.githubUrl': { $exists: false } }).toArray();

  console.log(`${migrated.length} chat(s) marked as migrated, ${unmigrated.length} not migrated.\n`);

  const results = [];

  for (const doc of migrated) {
    const parsed = parseGithubUrl(doc.metadata.githubUrl);
    const expectedFiles = reconstructFileCountFromMessages(doc.messages);

    if (!parsed) {
      results.push({ trackingId: doc.trackingId, status: 'BAD_URL', repo: doc.metadata.githubUrl });
      continue;
    }

    const { owner, repo } = parsed;

    try {
      const repoResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, { headers: ghHeaders() });

      if (!repoResponse.ok) {
        results.push({
          trackingId: doc.trackingId,
          status: `REPO_${repoResponse.status}`,
          repo: `${owner}/${repo}`,
          expectedFiles,
          remoteFiles: '-',
        });
        continue;
      }

      const repoData = await repoResponse.json();
      const branch = repoData.default_branch || 'main';

      const treeResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, {
        headers: ghHeaders(),
      });

      if (!treeResponse.ok) {
        results.push({
          trackingId: doc.trackingId,
          status: 'TREE_FETCH_FAILED',
          repo: `${owner}/${repo}`,
          expectedFiles,
          remoteFiles: '-',
        });
        continue;
      }

      const treeData = await treeResponse.json();
      const remoteFiles = treeData.tree.filter((e) => e.type === 'blob').length;

      let status = 'OK';

      if (remoteFiles === 0) {
        status = 'EMPTY_REPO';
      } else if (expectedFiles > 0 && remoteFiles < expectedFiles * 0.5) {
        // Large drift (not just "a few uploaded binaries the transcript doesn't capture") — worth a manual look.
        status = 'FILE_COUNT_MISMATCH';
      }

      results.push({ trackingId: doc.trackingId, status, repo: `${owner}/${repo}`, expectedFiles, remoteFiles });
    } catch (error) {
      results.push({
        trackingId: doc.trackingId,
        status: `ERROR: ${error.message}`,
        repo: `${owner}/${repo}`,
        expectedFiles,
        remoteFiles: '-',
      });
    }
  }

  console.log('Verification results:');
  console.table(results);

  const problems = results.filter((r) => r.status !== 'OK');

  if (unmigrated.length > 0) {
    console.log('\nNot migrated (expected to be empty test chats — verify below):');
    console.table(
      unmigrated.map((d) => ({
        trackingId: d.trackingId,
        description: d.description ?? 'untitled',
        messages: d.messages.length,
        hasSnapshot: Boolean(d.snapshot?.filesGzip),
      })),
    );
  }

  console.log(
    `\n${results.length - problems.length}/${results.length} migrated repos verified OK.` +
      (problems.length ? ` ${problems.length} need a look (see table above).` : ''),
  );
} finally {
  await client.close();
}
