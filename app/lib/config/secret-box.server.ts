import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'crypto';
import { requireServerSecret, type ServerEnv } from '~/lib/mongo.server';

/**
 * Envelope format for values encrypted at rest: `encv1:<iv>:<tag>:<ciphertext>`,
 * each part base64. The prefix lets `decryptSecret` tell an already-encrypted
 * value apart from a plaintext one written before this module existed.
 */
const PREFIX = 'encv1';
const ALGORITHM = 'aes-256-gcm';
const IV_BYTES = 12;
const KEY_BYTES = 32;

/**
 * HKDF info string. It domain-separates the config key from every other use of
 * the same base secret, so a config key can never double as a session key.
 */
const HKDF_INFO = 'sitara-builder/app-config/v1';

function resolveBaseSecret(env?: ServerEnv): string {
  const dedicated =
    env?.CONFIG_ENCRYPTION_KEY || (typeof process !== 'undefined' ? process.env?.CONFIG_ENCRYPTION_KEY : undefined);

  if (dedicated) {
    return dedicated;
  }

  /*
   * No dedicated key configured: derive from JWT_SECRET instead. The HKDF info
   * string above keeps the derived key unrelated to the signing key, so this is
   * safe — it just means rotating JWT_SECRET also invalidates stored config.
   */
  return requireServerSecret('JWT_SECRET', env);
}

function deriveKey(env?: ServerEnv): Buffer {
  const base = resolveBaseSecret(env);
  return Buffer.from(hkdfSync('sha256', Buffer.from(base, 'utf8'), Buffer.alloc(0), HKDF_INFO, KEY_BYTES));
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(`${PREFIX}:`);
}

export function encryptSecret(plaintext: string, env?: ServerEnv): string {
  if (!plaintext) {
    return '';
  }

  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, deriveKey(env), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [PREFIX, iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join(':');
}

export function decryptSecret(payload: string, env?: ServerEnv): string {
  if (!payload) {
    return '';
  }

  // Values written before encryption was introduced are stored as plaintext.
  if (!isEncrypted(payload)) {
    return payload;
  }

  const [, ivPart, tagPart, dataPart] = payload.split(':');

  if (!ivPart || !tagPart || !dataPart) {
    throw new Error('Stored config secret is malformed and cannot be decrypted.');
  }

  const decipher = createDecipheriv(ALGORITHM, deriveKey(env), Buffer.from(ivPart, 'base64'));
  decipher.setAuthTag(Buffer.from(tagPart, 'base64'));

  return Buffer.concat([decipher.update(Buffer.from(dataPart, 'base64')), decipher.final()]).toString('utf8');
}

/**
 * Last four characters of a secret, for showing operators which credential is
 * in use without revealing it. Short values are masked entirely.
 */
export function secretHint(secret: string): string {
  if (!secret || secret.length < 8) {
    return '••••';
  }

  return `••••${secret.slice(-4)}`;
}
