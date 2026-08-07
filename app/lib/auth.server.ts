import { SignJWT, jwtVerify } from 'jose';
import { redirect } from '@remix-run/cloudflare';
import { randomBytes, scrypt, timingSafeEqual } from 'crypto';
import { requireServerSecret, withMongo, type ServerEnv } from '~/lib/mongo.server';

function scryptAsync(password: string | Buffer, salt: Buffer, keylen: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, (err, key) => {
      if (err) {
        reject(err);
      } else {
        resolve(key);
      }
    });
  });
}

const SALT_BYTES = 16;
const KEY_LENGTH = 64;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES);
  const derived = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;

  return `scrypt:${salt.toString('base64')}:${derived.toString('base64')}`;
}

const COLLECTION = 'users';
const AUTH_COOKIE = 'auth_token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

interface UserDoc {
  _id: any;
  email: string;
  passwordHash: string;
  role: 'super_admin' | 'operator' | string;
  automations?: string[];
  active: boolean;
  name?: string;
}

export interface AuthUser {
  userId: string;
  email: string;
  name?: string;
  role: string;
  automations?: string[];
}

function getJwtSecret(env?: ServerEnv): Uint8Array {
  // No literal fallback: a shared default secret would let anyone forge a session cookie.
  return new TextEncoder().encode(requireServerSecret('JWT_SECRET', env));
}

export async function findUserByEmail(email: string, env?: ServerEnv): Promise<UserDoc | null> {
  return withMongo(env, (db) => db.collection<UserDoc>(COLLECTION).findOne({ email: email.toLowerCase().trim() }));
}

export function checkAccess(user: { role: string; active: boolean; automations?: string[] }): {
  allowed: boolean;
  reason?: string;
} {
  if (!user.active) {
    return { allowed: false, reason: 'Your account has been deactivated.' };
  }

  if (user.role === 'super_admin') {
    return { allowed: true };
  }

  if (user.role === 'operator') {
    if (Array.isArray(user.automations) && user.automations.includes('web_builder')) {
      return { allowed: true };
    }

    return {
      allowed: false,
      reason: 'Access denied. Your account does not have web builder permissions.',
    };
  }

  return { allowed: false, reason: 'Access denied. Unrecognised role.' };
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split(':');

  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    // bcrypt legacy
    if (stored.startsWith('$2b$') || stored.startsWith('$2a$')) {
      const { default: bcrypt } = await import('bcryptjs');
      return bcrypt.compare(password, stored);
    }

    // plaintext fallback (dev / test accounts)
    return password === stored;
  }

  try {
    const salt = Buffer.from(parts[1], 'base64');
    const expected = Buffer.from(parts[2], 'base64');
    const derived = (await scryptAsync(password, salt, expected.length)) as Buffer;

    if (derived.length !== expected.length) {
      return false;
    }

    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export async function signJwt(payload: AuthUser, env?: ServerEnv): Promise<string> {
  const secret = getJwtSecret(env);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyJwt(token: string, env?: ServerEnv): Promise<AuthUser | null> {
  /*
   * Resolved outside the try so a misconfigured JWT_SECRET surfaces as a real error
   * rather than being swallowed into an endless redirect back to /login.
   */
  const secret = getJwtSecret(env);

  try {
    const { payload } = await jwtVerify(token, secret);
    return payload as unknown as AuthUser;
  } catch {
    return null;
  }
}

export function getAuthToken(request: Request): string | null {
  const cookie = request.headers.get('Cookie') || '';
  const match = cookie.match(/(?:^|;\s*)auth_token=([^;]+)/);

  return match ? decodeURIComponent(match[1]) : null;
}

export function setAuthCookie(token: string): string {
  return `${AUTH_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${COOKIE_MAX_AGE}`;
}

export function clearAuthCookie(): string {
  return `${AUTH_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0`;
}

export async function requireAuth(request: Request, env?: ServerEnv): Promise<AuthUser> {
  const token = getAuthToken(request);

  if (!token) {
    throw redirect('/login');
  }

  const user = await verifyJwt(token, env);

  if (!user) {
    throw redirect('/login');
  }

  return user;
}

/**
 * Returns the current user only if they are still a super admin *right now*.
 *
 * The role is re-read from the database rather than taken from the JWT: tokens
 * live for 7 days, so a demoted or deactivated admin would otherwise keep write
 * access to shared credentials until their session happened to expire.
 *
 * Responds 403 JSON instead of redirecting, because every caller is an API
 * route rather than a page.
 */
export async function requireSuperAdmin(request: Request, env?: ServerEnv): Promise<AuthUser> {
  const user = await requireAuth(request, env);
  const fresh = await findUserByEmail(user.email, env);

  if (!fresh || !fresh.active || fresh.role !== 'super_admin') {
    throw new Response(JSON.stringify({ error: 'Super admin access required.' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return { ...user, role: fresh.role };
}

/** Non-throwing variant, for deciding whether to send editable or masked data. */
export async function isSuperAdmin(user: AuthUser, env?: ServerEnv): Promise<boolean> {
  const fresh = await findUserByEmail(user.email, env);
  return Boolean(fresh?.active && fresh.role === 'super_admin');
}
