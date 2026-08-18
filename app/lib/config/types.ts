/**
 * Shared shapes for the centrally managed integration config.
 *
 * This file must stay free of server-only imports: the settings UI imports the
 * masked types from here, and the server modules import the full ones.
 */

export type ConfigProvider = 'github' | 'vercel' | 'netlify' | 'supabase' | 'cloudinary';

export interface GithubConfig {
  token: string;
  tokenType: 'classic' | 'fine-grained';

  /** Display-only account name, e.g. the org or user the token belongs to. */
  label?: string;
}

export interface TokenConfig {
  token: string;
  label?: string;
}

export interface SupabaseCredentialsConfig {
  supabaseUrl: string;

  /** Supabase publishes the anon key as browser-safe, so it is not a secret. */
  anonKey: string;
}

export interface SupabaseConfig {
  token: string;
  selectedProjectId?: string;
  projectLabel?: string;
  credentials?: SupabaseCredentialsConfig;
}

export interface CloudinaryConfig {
  cloudName: string;

  /** Not secret on its own — Cloudinary's API key is meant to accompany a signed request. */
  apiKey: string;

  /** The actual secret: signs uploads server-side, never sent to the browser. */
  apiSecret: string;
  label?: string;
}

/** Full config, including plaintext secrets. Never send this to a non-admin. */
export interface AppConfig {
  github: GithubConfig;
  vercel: TokenConfig;
  netlify: TokenConfig;
  supabase: SupabaseConfig;
  cloudinary: CloudinaryConfig;

  /** LLM provider name (e.g. "Anthropic") to API key. */
  apiKeys: Record<string, string>;
  updatedAt?: string;
  updatedBy?: string;
}

/**
 * What an operator is allowed to see: presence and a label, never the secret.
 * Named to avoid colliding with the LLM service-health `ProviderStatus` in
 * `@settings/tabs/providers/service-status`.
 */
export interface ConfigProviderStatus {
  configured: boolean;
  label?: string;

  /** Masked tail of the credential, e.g. "••••a1b2". */
  hint?: string;
}

export interface SupabaseConfigStatus extends ConfigProviderStatus {
  selectedProjectId?: string;

  /** Safe to expose — generated projects need it at runtime. */
  credentials?: SupabaseCredentialsConfig;
}

export interface AppConfigStatus {
  github: ConfigProviderStatus;
  vercel: ConfigProviderStatus;
  netlify: ConfigProviderStatus;
  supabase: SupabaseConfigStatus;
  cloudinary: ConfigProviderStatus;

  /** Provider name to whether a key is set. Values are never included. */
  apiKeys: Record<string, boolean>;
  updatedAt?: string;
  updatedBy?: string;

  /** True when the viewer may edit this config. */
  canEdit: boolean;
}

export const EMPTY_APP_CONFIG: AppConfig = {
  github: { token: '', tokenType: 'classic' },
  vercel: { token: '' },
  netlify: { token: '' },
  supabase: { token: '' },
  cloudinary: { cloudName: '', apiKey: '', apiSecret: '' },
  apiKeys: {},
};
