import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const TOKEN_COOKIE = 'tg_token';
const MAX_AGE = 60 * 60 * 24 * 7;

export async function hashPassword(plain) {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}
export async function verifyPassword(plain, hash) {
  return bcrypt.compare(plain, hash);
}

export function signJwt(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: MAX_AGE });
}
export function verifyJwt(token) {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

// ⬇⬇⬇ CHANGED: make cookie ops async
export async function setAuthCookie(token) {
  const store = await cookies();
  store.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: MAX_AGE,
    path: '/',
  });
}
export async function clearAuthCookie() {
  const store = await cookies();
  store.set(TOKEN_COOKIE, '', { httpOnly: true, maxAge: 0, path: '/' });
}
export async function getUserFromCookies() {
  const store = await cookies();
  const c = store.get(TOKEN_COOKIE);
  if (!c?.value) return null;
  const data = verifyJwt(c.value);
  if (!data) return null;
  return { id: data.sub, email: data.email };
}
