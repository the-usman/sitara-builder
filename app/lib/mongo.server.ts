import dns from 'dns';
import { MongoClient, type Db } from 'mongodb';

// Cloudflare Workers handles SRV natively. Only fix DNS in local Node.js dev.
if (typeof navigator === 'undefined' || navigator.userAgent !== 'Cloudflare-Workers') {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch {}
}

export const DB_NAME = 'project_db_client';

/**
 * The Cloudflare Pages env bag, passed down from `context.cloudflare.env`.
 * On Pages this — not `process.env` — is where deployment variables live.
 */
export type ServerEnv = Record<string, string | undefined> | undefined;

function fromProcessEnv(key: string): string | undefined {
  return typeof process !== 'undefined' ? process.env?.[key] : undefined;
}

/**
 * Resolves a required secret from the Cloudflare env bag, falling back to
 * `process.env` for local dev, Docker, and Electron. Never falls back to a
 * literal — an unset secret must fail loudly rather than connect somewhere
 * unexpected.
 */
export function requireServerSecret(key: string, env?: ServerEnv): string {
  const value = env?.[key] || fromProcessEnv(key);

  if (!value) {
    throw new Error(
      `${key} is not configured. Set it in .env for local development, or as a Cloudflare Pages ` +
        `environment variable (Settings > Environment variables) for deployments.`,
    );
  }

  return value;
}

export function getMongoUri(env?: ServerEnv): string {
  return requireServerSecret('MONGODB_URI', env);
}

/*
 * Workers forbid reusing a socket opened by another request, so on Cloudflare every call must
 * connect and close. On Node (the Docker/Dokploy server) one pooled client is shared by all
 * requests — reconnecting cost a DNS lookup, TLS handshake and auth round-trip per query.
 */
const isWorkersRuntime = typeof navigator !== 'undefined' && navigator.userAgent === 'Cloudflare-Workers';
const sharedClients = new Map<string, Promise<MongoClient>>();

function getSharedClient(uri: string): Promise<MongoClient> {
  let clientPromise = sharedClients.get(uri);

  if (!clientPromise) {
    clientPromise = new MongoClient(uri, { maxPoolSize: 20, maxIdleTimeMS: 60_000 }).connect();

    // A failed connect must not be cached forever — the next call retries.
    clientPromise.catch(() => sharedClients.delete(uri));
    sharedClients.set(uri, clientPromise);
  }

  return clientPromise;
}

/**
 * Returns a connected client plus a `close` that releases it: a no-op for the shared Node
 * client, a real close on Workers. Callers always call `close` and never `client.close()`.
 */
export async function openMongo(env: ServerEnv): Promise<{ client: MongoClient; close: () => Promise<void> }> {
  const uri = getMongoUri(env);

  if (!isWorkersRuntime) {
    return { client: await getSharedClient(uri), close: async () => {} };
  }

  const client = new MongoClient(uri);
  await client.connect();

  return { client, close: () => client.close() };
}

/**
 * Runs `fn` against the app database. Every Mongo access in the app should go through
 * here (or `openMongo`) so connection setup and teardown stay in one place.
 */
export async function withMongo<T>(env: ServerEnv, fn: (db: Db) => Promise<T>): Promise<T> {
  const { client, close } = await openMongo(env);

  try {
    return await fn(client.db(DB_NAME));
  } finally {
    await close();
  }
}
