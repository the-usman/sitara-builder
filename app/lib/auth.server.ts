import dns from 'dns';
import { MongoClient } from 'mongodb';
import { SignJWT, jwtVerify } from 'jose';
import { redirect } from '@remix-run/cloudflare';
import { randomBytes, scrypt, timingSafeEqual } from 'crypto';

// Cloudflare Workers handles SRV natively. Only fix DNS in local Node.js dev.
if (typeof navigator === 'undefined' || navigator.userAgent !== 'Cloudflare-Workers') {
  try { dns.setServers(['8.8.8.8', '1.1.1.1']); } catch {}
}

function scryptAsync(password: string | Buffer, salt: Buffer, keylen: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keylen, (err, key) => {
      if (err) reject(err);
      else resolve(key);
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

const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb+srv://the-usman:Usm123000@cluster0.gqzyjmn.mongodb.net/';
const DB_NAME = 'project_db_client';
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

function getJwtSecret(env?: any): Uint8Array {
  const secret =
    env?.JWT_SECRET || process.env.JWT_SECRET || 'sitara-builder-jwt-secret-change-in-production';
  return new TextEncoder().encode(secret);
}

export async function findUserByEmail(email: string): Promise<UserDoc | null> {
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    return await client
      .db(DB_NAME)
      .collection<UserDoc>(COLLECTION)
      .findOne({ email: email.toLowerCase().trim() });
  } finally {
    await client.close();
  }
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
    if (derived.length !== expected.length) return false;
    return timingSafeEqual(derived, expected);
  } catch {
    return false;
  }
}

export async function signJwt(payload: AuthUser, env?: any): Promise<string> {
  const secret = getJwtSecret(env);
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret);
}

export async function verifyJwt(token: string, env?: any): Promise<AuthUser | null> {
  try {
    const secret = getJwtSecret(env);
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

export async function requireAuth(request: Request, env?: any): Promise<AuthUser> {
  const token = getAuthToken(request);
  if (!token) throw redirect('/login');
  const user = await verifyJwt(token, env);
  if (!user) throw redirect('/login');
  return user;
}
