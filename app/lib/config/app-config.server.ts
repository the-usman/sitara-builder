import { withMongo, type ServerEnv } from '~/lib/mongo.server';
import { decryptSecret, encryptSecret, secretHint } from './secret-box.server';
import {
  EMPTY_APP_CONFIG,
  type AppConfig,
  type AppConfigStatus,
  type ConfigProviderStatus,
  type GithubConfig,
  type SupabaseConfig,
  type TokenConfig,
} from './types';

const COLLECTION = 'app_config';
const DOC_ID = 'global';

interface AppConfigDoc {
  _id: string;
  github?: GithubConfig;
  vercel?: TokenConfig;
  netlify?: TokenConfig;
  supabase?: SupabaseConfig;
  apiKeys?: Record<string, string>;
  updatedAt?: Date;
  updatedBy?: string;
}

/**
 * A patch omits fields it does not change. `undefined` on a token means "keep
 * the stored one" — only an explicit empty string clears it. Without this the
 * admin renaming a label would silently wipe the credential.
 */
export type AppConfigPatch = {
  github?: Partial<GithubConfig>;
  vercel?: Partial<TokenConfig>;
  netlify?: Partial<TokenConfig>;
  supabase?: Partial<SupabaseConfig>;
  apiKeys?: Record<string, string>;
};

function decryptToken<T extends { token: string }>(stored: T | undefined, fallback: T, env?: ServerEnv): T {
  if (!stored) {
    return fallback;
  }

  return { ...stored, token: decryptSecret(stored.token || '', env) };
}

/**
 * Full config with secrets in plaintext. Server-only — every caller must have
 * already established that the request is allowed to use these credentials.
 */
export async function readAppConfig(env?: ServerEnv): Promise<AppConfig> {
  const doc = await withMongo(env, (db) => db.collection<AppConfigDoc>(COLLECTION).findOne({ _id: DOC_ID }));

  if (!doc) {
    return { ...EMPTY_APP_CONFIG };
  }

  const apiKeys: Record<string, string> = {};

  for (const [provider, value] of Object.entries(doc.apiKeys ?? {})) {
    apiKeys[provider] = decryptSecret(value, env);
  }

  return {
    github: decryptToken(doc.github, EMPTY_APP_CONFIG.github, env),
    vercel: decryptToken(doc.vercel, EMPTY_APP_CONFIG.vercel, env),
    netlify: decryptToken(doc.netlify, EMPTY_APP_CONFIG.netlify, env),
    supabase: decryptToken(doc.supabase, EMPTY_APP_CONFIG.supabase, env),
    apiKeys,
    updatedAt: doc.updatedAt?.toISOString(),
    updatedBy: doc.updatedBy,
  };
}

function mergeToken<T extends { token: string }>(current: T, patch: Partial<T> | undefined): T {
  if (!patch) {
    return current;
  }

  const next = { ...current, ...patch } as T;

  // `undefined` means "unchanged"; an explicit '' clears the credential.
  next.token = patch.token === undefined ? current.token : patch.token;

  return next;
}

function encryptToken<T extends { token: string }>(value: T, env?: ServerEnv): T {
  return { ...value, token: encryptSecret(value.token || '', env) };
}

/**
 * Applies a patch and persists it. Caller must have verified the actor is a
 * super admin — this function does not check authorization itself.
 */
export async function writeAppConfig(patch: AppConfigPatch, actorEmail: string, env?: ServerEnv): Promise<AppConfig> {
  const current = await readAppConfig(env);

  const merged: AppConfig = {
    github: mergeToken(current.github, patch.github),
    vercel: mergeToken(current.vercel, patch.vercel),
    netlify: mergeToken(current.netlify, patch.netlify),
    supabase: mergeToken(current.supabase, patch.supabase),
    apiKeys: { ...current.apiKeys, ...(patch.apiKeys ?? {}) },
  };

  // An empty value in the patch removes the provider key rather than storing ''.
  for (const [provider, value] of Object.entries(merged.apiKeys)) {
    if (!value) {
      delete merged.apiKeys[provider];
    }
  }

  const encryptedApiKeys: Record<string, string> = {};

  for (const [provider, value] of Object.entries(merged.apiKeys)) {
    encryptedApiKeys[provider] = encryptSecret(value, env);
  }

  const updatedAt = new Date();

  await withMongo(env, (db) =>
    db.collection<AppConfigDoc>(COLLECTION).updateOne(
      { _id: DOC_ID },
      {
        $set: {
          github: encryptToken(merged.github, env),
          vercel: encryptToken(merged.vercel, env),
          netlify: encryptToken(merged.netlify, env),
          supabase: encryptToken(merged.supabase, env),
          apiKeys: encryptedApiKeys,
          updatedAt,
          updatedBy: actorEmail,
        },
      },
      { upsert: true },
    ),
  );

  return { ...merged, updatedAt: updatedAt.toISOString(), updatedBy: actorEmail };
}

function statusOf(value: { token: string; label?: string }): ConfigProviderStatus {
  return {
    configured: Boolean(value.token),
    label: value.label,
    hint: value.token ? secretHint(value.token) : undefined,
  };
}

/**
 * Strips every secret from the config so it can be sent to any authenticated
 * user. `canEdit` tells the UI whether to render inputs or a read-only summary.
 */
export function toStatus(config: AppConfig, canEdit: boolean): AppConfigStatus {
  const apiKeys: Record<string, boolean> = {};

  for (const [provider, value] of Object.entries(config.apiKeys)) {
    apiKeys[provider] = Boolean(value);
  }

  return {
    github: statusOf(config.github),
    vercel: statusOf(config.vercel),
    netlify: statusOf(config.netlify),
    supabase: {
      ...statusOf({ token: config.supabase.token, label: config.supabase.projectLabel }),
      selectedProjectId: config.supabase.selectedProjectId,
      credentials: config.supabase.credentials,
    },
    apiKeys,
    updatedAt: config.updatedAt,
    updatedBy: config.updatedBy,
    canEdit,
  };
}
