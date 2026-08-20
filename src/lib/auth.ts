import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';

/**
 * Minimal accounts system for a small shared notebook — not a general
 * multi-tenant auth system. Signup is hard-capped at MAX_USERS so this
 * stays "you and one other person," matching what was asked for. There is
 * no password reset / email verification flow; with only two trusted
 * accounts sharing one deployment, that trade-off is intentional.
 */

export const MAX_USERS = 2;
export const SESSION_COOKIE = 'kd_session';
const SESSION_DAYS = 30;

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      'AUTH_SECRET is not set (or too short). Generate one with `openssl rand -base64 32` and put it in .env.',
    );
  }
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  userId: string;
  email: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    if (typeof payload.userId !== 'string' || typeof payload.email !== 'string') return null;
    return { userId: payload.userId, email: payload.email };
  } catch {
    return null;
  }
}

/** Reads and verifies the session cookie in a server component or route handler. */
export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export const sessionCookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_DAYS * 24 * 60 * 60,
};
