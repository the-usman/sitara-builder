import { readAppConfig } from './app-config.server';
import type { ServerEnv } from '~/lib/mongo.server';
import type { ConfigProvider } from './types';

/*
 * Cloudinary needs three values together (see `getCloudinaryConfig` below), not one
 * token, so it's excluded from the single-token flow these functions implement.
 */
type SingleTokenProvider = Exclude<ConfigProvider, 'cloudinary'>;

/**
 * Environment fallbacks, in precedence order, for installs that configure
 * credentials through deployment variables instead of the settings panel.
 *
 * `VITE_`-prefixed names are read here only for backwards compatibility with
 * existing deployments. They are a poor place for a secret — Vite inlines any
 * `VITE_*` variable into the browser bundle — so prefer the unprefixed names.
 */
const ENV_FALLBACKS: Record<SingleTokenProvider, string[]> = {
  github: ['GITHUB_TOKEN', 'GITHUB_ACCESS_TOKEN', 'VITE_GITHUB_ACCESS_TOKEN'],
  vercel: ['VERCEL_TOKEN', 'VITE_VERCEL_ACCESS_TOKEN'],
  netlify: ['NETLIFY_TOKEN', 'NETLIFY_AUTH_TOKEN', 'VITE_NETLIFY_ACCESS_TOKEN'],
  supabase: ['SUPABASE_ACCESS_TOKEN', 'VITE_SUPABASE_ACCESS_TOKEN'],
};

function fromEnv(provider: SingleTokenProvider, env?: ServerEnv): string | undefined {
  for (const name of ENV_FALLBACKS[provider]) {
    const value = env?.[name] || (typeof process !== 'undefined' ? process.env?.[name] : undefined);

    if (value) {
      return value;
    }
  }

  return undefined;
}

/**
 * Resolves the shared credential for a provider.
 *
 * Tokens come from the super-admin-managed store or from server environment
 * variables — never from the request. That is the whole point of this module:
 * an operator cannot deploy with their own token by editing localStorage or
 * crafting a request, because no code path reads a token off the wire.
 */
export async function getProviderToken(provider: SingleTokenProvider, env?: ServerEnv): Promise<string | undefined> {
  const config = await readAppConfig(env);
  const stored = config[provider]?.token;

  return stored || fromEnv(provider, env);
}

/** Same as `getProviderToken`, but responds 409 when nothing is configured. */
export async function requireProviderToken(provider: SingleTokenProvider, env?: ServerEnv): Promise<string> {
  const token = await getProviderToken(provider, env);

  if (!token) {
    throw new Response(
      JSON.stringify({
        error: `No ${provider} credentials are configured. Ask a super admin to set them up in Settings → Connections.`,
      }),
      { status: 409, headers: { 'Content-Type': 'application/json' } },
    );
  }

  return token;
}

export interface CloudinaryCredentials {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

/*
 * Cloudinary needs three values together, not one token — env fallbacks are deliberately
 * unprefixed only (no `VITE_CLOUDINARY_API_SECRET`-style variant), since Vite inlines any
 * `VITE_*` variable into the client bundle and `apiSecret` must never reach the browser.
 */
function cloudinaryEnvVar(name: string, env?: ServerEnv): string {
  return env?.[name] || (typeof process !== 'undefined' ? process.env?.[name] : undefined) || '';
}

function cloudinaryFromEnv(env?: ServerEnv): CloudinaryCredentials {
  return {
    cloudName: cloudinaryEnvVar('CLOUDINARY_CLOUD_NAME', env),
    apiKey: cloudinaryEnvVar('CLOUDINARY_API_KEY', env),
    apiSecret: cloudinaryEnvVar('CLOUDINARY_API_SECRET', env),
  };
}

/** Resolves the shared Cloudinary credentials: admin-managed store first, then env vars. */
export async function getCloudinaryConfig(env?: ServerEnv): Promise<CloudinaryCredentials> {
  const config = await readAppConfig(env);

  if (config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret) {
    return {
      cloudName: config.cloudinary.cloudName,
      apiKey: config.cloudinary.apiKey,
      apiSecret: config.cloudinary.apiSecret,
    };
  }

  return cloudinaryFromEnv(env);
}

/** Same as `getCloudinaryConfig`, but responds 409 when nothing is fully configured. */
export async function requireCloudinaryConfig(env?: ServerEnv): Promise<CloudinaryCredentials> {
  const creds = await getCloudinaryConfig(env);

  if (!creds.cloudName || !creds.apiKey || !creds.apiSecret) {
    throw new Response(
      JSON.stringify({
        error: 'No Cloudinary credentials are configured. Ask a super admin to set them up in Settings → Connections.',
      }),
      { status: 409, headers: { 'Content-Type': 'application/json' } },
    );
  }

  return creds;
}

/** Supabase project selection lives alongside the token in the shared config. */
export async function getSupabaseTarget(env?: ServerEnv) {
  const config = await readAppConfig(env);

  return {
    token: config.supabase.token || fromEnv('supabase', env),
    projectId: config.supabase.selectedProjectId,
    credentials: config.supabase.credentials,
  };
}
