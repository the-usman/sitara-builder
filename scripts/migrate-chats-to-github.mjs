#!/usr/bin/env node
/*
 * Backfills existing chats (created before GitHub auto-push existed) onto GitHub, using
 * the same shared token / repo-naming / push logic as app/routes/api.github-push.ts:
 * repo name = trackingId, one push per chat, then metadata.githubUrl is set on the chat
 * doc and its Mongo snapshot blob is dropped (GitHub becomes the source of truth, same
 * policy the live auto-push already applies to new changes).
 *
 * Safe by default: running with no flags is a DRY RUN — it reports what it would do and
 * makes zero network/DB writes. Pass --apply to actually push to GitHub and update Mongo.
 *
 * Usage:
 *   node scripts/migrate-chats-to-github.mjs                 # dry run, first 5 unmigrated chats
 *   node scripts/migrate-chats-to-github.mjs --limit 10       # dry run, first 10
 *   node scripts/migrate-chats-to-github.mjs --chat <trackingId>  # dry run, one specific chat
 *   node scripts/migrate-chats-to-github.mjs --apply --limit 5    # actually migrate 5 chats
 *   node scripts/migrate-chats-to-github.mjs --apply --chat <trackingId>
 */
import 'dotenv/config';
import { MongoClient, Binary } from 'mongodb';
import { gunzipSync } from 'node:zlib';

const DB_NAME = 'project_db_client';
const CHATS_COLLECTION = 'chat_history';
const PROJECTS_COLLECTION = 'web_builders';
const GITHUB_API = 'https://api.github.com';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const limitArg = args.indexOf('--limit');
const limit = limitArg !== -1 ? parseInt(args[limitArg + 1], 10) : 5;
const chatArg = args.indexOf('--chat');
const onlyChat = chatArg !== -1 ? args[chatArg + 1] : undefined;

const uri = process.env.MONGODB_URI;
const token = process.env.GITHUB_TOKEN || process.env.GITHUB_ACCESS_TOKEN;

if (!uri) {
  console.error('MONGODB_URI is not set (checked .env / process.env).');
  process.exit(1);
}

if (!token) {
  console.error('GITHUB_TOKEN is not set (checked .env / process.env).');
  process.exit(1);
}

function toGithubRepoName(trackingId) {
  const cleaned = trackingId.replace(/[^A-Za-z0-9._-]/g, '-').replace(/^\.+/, '').slice(0, 100);
  return cleaned || `chat-${Date.now()}`;
}

function ghHeaders() {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'sitara-builder-migration',
    'Content-Type': 'application/json',
  };
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

/** Same replay logic as scripts/recover-chat-files.mjs — the proven fallback source of truth. */
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

/** Prefers the stored snapshot; falls back to transcript replay when it's missing/empty (the bug we found earlier). */
function resolveFiles(doc) {
  if (doc.snapshot?.filesGzip) {
    try {
      const buf = doc.snapshot.filesGzip.buffer
        ? Buffer.from(doc.snapshot.filesGzip.buffer)
        : Buffer.from(doc.snapshot.filesGzip);
      const parsed = JSON.parse(gunzipSync(buf).toString('utf-8'));
      const files = new Map();

      for (const [p, entry] of Object.entries(parsed)) {
        if (entry?.type === 'file' && !entry.isBinary) {
          files.set(p, entry.content);
        }
      }

      if (files.size > 0) {
        return { files, source: 'snapshot' };
      }
    } catch (error) {
      console.warn(`  snapshot unreadable, falling back to transcript replay: ${error.message}`);
    }
  }

  return { files: reconstructFilesFromMessages(doc.messages), source: 'transcript' };
}

async function pushChatToGithub(owner, trackingId, files) {
  const repoName = toGithubRepoName(trackingId);

  let defaultBranch = 'main';
  const repoResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repoName}`, { headers: ghHeaders() });

  if (repoResponse.ok) {
    const repo = await repoResponse.json();
    defaultBranch = repo.default_branch || 'main';
  } else if (repoResponse.status === 404) {
    const createResponse = await fetch(`${GITHUB_API}/user/repos`, {
      method: 'POST',
      headers: ghHeaders(),
      body: JSON.stringify({ name: repoName, private: true, auto_init: true }),
    });

    if (!createResponse.ok) {
      const errorData = await createResponse.json().catch(() => ({}));
      throw new Error(`create repo failed: ${errorData.message || createResponse.status}`);
    }

    const newRepo = await createResponse.json();
    defaultBranch = newRepo.default_branch || 'main';
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } else {
    throw new Error(`repo lookup failed: ${repoResponse.status}`);
  }

  const blobs = await Promise.all(
    Array.from(files.entries()).map(async ([filePath, content]) => {
      const normalizedPath = filePath.startsWith('/') ? filePath.substring(1) : filePath;
      const blobResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repoName}/git/blobs`, {
        method: 'POST',
        headers: ghHeaders(),
        body: JSON.stringify({ content: Buffer.from(content).toString('base64'), encoding: 'base64' }),
      });

      if (!blobResponse.ok) {
        throw new Error(`blob create failed for ${normalizedPath}`);
      }

      const blob = await blobResponse.json();

      return { path: normalizedPath, sha: blob.sha };
    }),
  );

  const refResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repoName}/git/ref/heads/${defaultBranch}`, {
    headers: ghHeaders(),
  });

  if (!refResponse.ok) {
    throw new Error('failed to read default branch ref');
  }

  const ref = await refResponse.json();
  const latestCommitSha = ref.object.sha;

  const treeResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repoName}/git/trees`, {
    method: 'POST',
    headers: ghHeaders(),
    body: JSON.stringify({
      base_tree: latestCommitSha,
      tree: blobs.map((blob) => ({ path: blob.path, mode: '100644', type: 'blob', sha: blob.sha })),
    }),
  });

  if (!treeResponse.ok) {
    throw new Error('tree create failed');
  }

  const newTree = await treeResponse.json();

  const commitResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repoName}/git/commits`, {
    method: 'POST',
    headers: ghHeaders(),
    body: JSON.stringify({
      message: 'Migrate existing chat to GitHub',
      tree: newTree.sha,
      parents: [latestCommitSha],
    }),
  });

  if (!commitResponse.ok) {
    throw new Error('commit create failed');
  }

  const newCommit = await commitResponse.json();

  const updateRefResponse = await fetch(`${GITHUB_API}/repos/${owner}/${repoName}/git/refs/heads/${defaultBranch}`, {
    method: 'PATCH',
    headers: ghHeaders(),
    body: JSON.stringify({ sha: newCommit.sha }),
  });

  if (!updateRefResponse.ok) {
    throw new Error('ref update failed');
  }

  return `https://github.com/${owner}/${repoName}`;
}

const client = new MongoClient(uri);

try {
  await client.connect();

  const db = client.db(DB_NAME);
  const chatsCollection = db.collection(CHATS_COLLECTION);
  const projectsCollection = db.collection(PROJECTS_COLLECTION);

  let owner;

  if (apply) {
    const userResponse = await fetch(`${GITHUB_API}/user`, { headers: ghHeaders() });

    if (!userResponse.ok) {
      console.error('GitHub token is invalid.');
      process.exit(1);
    }

    owner = (await userResponse.json()).login;
    console.log(`GitHub account: ${owner}\n`);
  }

  const filter = {
    ...(onlyChat ? { $or: [{ trackingId: onlyChat }, { urlId: onlyChat }] } : {}),
    'metadata.githubUrl': { $exists: false },
  };

  const docs = await chatsCollection
    .find(filter)
    .limit(onlyChat ? 1 : limit)
    .toArray();

  if (docs.length === 0) {
    console.log('Nothing to migrate — no unmigrated chats match.');
    process.exit(0);
  }

  console.log(`${apply ? 'MIGRATING' : 'DRY RUN — would migrate'} ${docs.length} chat(s):\n`);

  const results = [];

  for (const doc of docs) {
    const { files, source } = resolveFiles(doc);
    const repoName = toGithubRepoName(doc.trackingId);

    console.log(
      `- ${doc.trackingId}  "${doc.description ?? 'untitled'}"  ${files.size} file(s) (from ${source})  -> repo "${repoName}"`,
    );

    if (files.size === 0) {
      console.log('  skipping: no files could be reconstructed');
      results.push({ trackingId: doc.trackingId, status: 'skipped-no-files' });
      continue;
    }

    if (!apply) {
      results.push({ trackingId: doc.trackingId, status: 'dry-run' });
      continue;
    }

    try {
      const repoUrl = await pushChatToGithub(owner, doc.trackingId, files);

      const newMetadata = { ...(doc.metadata || {}), githubUrl: repoUrl };

      await chatsCollection.updateOne(
        { _id: doc._id },
        { $set: { metadata: newMetadata, updatedAt: new Date() }, $unset: { snapshot: '' } },
      );

      await projectsCollection
        .updateOne({ trackingId: doc.trackingId }, { $set: { githubUrl: repoUrl, updatedAt: new Date() } })
        .catch(() => {});

      console.log(`  done: ${repoUrl}`);
      results.push({ trackingId: doc.trackingId, status: 'migrated', repoUrl });

      // Be polite to the GitHub API between chats (repo create + N blob calls each).
      await new Promise((resolve) => setTimeout(resolve, 1500));
    } catch (error) {
      console.log(`  FAILED: ${error.message}`);
      results.push({ trackingId: doc.trackingId, status: 'failed', error: error.message });
    }
  }

  console.log('\nSummary:');
  console.table(results);

  if (!apply) {
    console.log('\nThis was a dry run — nothing was pushed or written. Re-run with --apply to do it for real.');
  }

  const remaining = await chatsCollection.countDocuments({ 'metadata.githubUrl': { $exists: false } });
  console.log(`\nChats still unmigrated: ${remaining}`);
} finally {
  await client.close();
}
