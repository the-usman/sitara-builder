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

/**
 * Opens a MongoDB connection, runs `fn`, and always closes the client.
 * Every Mongo access in the app should go through here so connection setup
 * and teardown stay in one place.
 */
export async function withMongo<T>(env: ServerEnv, fn: (db: Db) => Promise<T>): Promise<T> {
  const client = new MongoClient(getMongoUri(env));

  try {
    await client.connect();
    return await fn(client.db(DB_NAME));
  } finally {
    await client.close();
  }
}
