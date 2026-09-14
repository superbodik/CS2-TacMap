import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from '../config.js';

function encode(input) {
  return Buffer.from(JSON.stringify(input)).toString('base64url');
}

function signature(data) {
  return createHmac('sha256', config.jwtSecret).update(data).digest('base64url');
}

export function sign(payload, ttlSeconds) {
  const now = Math.floor(Date.now() / 1000);
  const body = { ...payload, iat: now, exp: now + ttlSeconds };
  const head = encode({ alg: 'HS256', typ: 'JWT' });
  const data = `${head}.${encode(body)}`;
  return `${data}.${signature(data)}`;
}

export function verify(token) {
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const data = `${parts[0]}.${parts[1]}`;
  const expected = Buffer.from(signature(data));
  const received = Buffer.from(parts[2]);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch (error) {
    return null;
  }
}
