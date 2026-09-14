import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile() {
  const file = resolve(root, '.env');
  if (!existsSync(file)) return;
  const content = readFileSync(file, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const index = trimmed.indexOf('=');
    if (index < 1) continue;
    const key = trimmed.slice(0, index).trim();
    const value = trimmed.slice(index + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile();

function list(value, fallback = []) {
  if (!value) return fallback;
  return value.split(',').map(item => item.trim()).filter(Boolean);
}

function int(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const config = {
  root,
  port: int(process.env.PORT, 8787),
  host: process.env.HOST || '0.0.0.0',
  publicUrl: (process.env.PUBLIC_URL || `http://localhost:${int(process.env.PORT, 8787)}`).replace(/\/+$/, ''),
  dataDir: process.env.DATA_DIR || resolve(root, 'data'),
  uploadDir: process.env.UPLOAD_DIR || resolve(root, 'data', 'uploads'),
  appOrigins: list(process.env.APP_ORIGINS, ['http://localhost:5173', 'http://localhost:8080', 'http://127.0.0.1:5500']),
  jwtSecret: process.env.JWT_SECRET || randomBytes(32).toString('hex'),
  tokenTtl: int(process.env.TOKEN_TTL, 60 * 60 * 24 * 30),
  stateTtl: int(process.env.STATE_TTL, 600),
  maxStratBytes: int(process.env.MAX_STRAT_BYTES, 512 * 1024),
  maxStratsPerUser: int(process.env.MAX_STRATS_PER_USER, 200),
  maxRevisions: int(process.env.MAX_REVISIONS, 20),
  maxDemoMb: int(process.env.MAX_DEMO_MB, 400),
  rateWindowMs: int(process.env.RATE_WINDOW_MS, 60000),
  rateMax: int(process.env.RATE_MAX, 120),
  discord: {
    clientId: process.env.DISCORD_CLIENT_ID || '',
    clientSecret: process.env.DISCORD_CLIENT_SECRET || '',
    redirectUri: process.env.DISCORD_REDIRECT_URI || '',
    scope: process.env.DISCORD_SCOPE || 'identify'
  },
  version: '1.0.0'
};

export const discordReady = Boolean(config.discord.clientId && config.discord.clientSecret && config.discord.redirectUri);

if (!process.env.JWT_SECRET) {
  console.warn('[config] JWT_SECRET не задан — используется временный ключ, сессии сбросятся при перезапуске');
}
