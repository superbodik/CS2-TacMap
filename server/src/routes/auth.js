import { Router } from 'express';
import { config, discordReady } from '../config.js';
import { authorizeUrl, exchangeCode, fetchUser, normalizeUser } from '../services/discord.js';
import { sign, verify } from '../services/jwt.js';
import { store, id } from '../store.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';

export const authRouter = Router();

function allowedRedirect(target) {
  if (!target) return config.appOrigins[0] || '';
  try {
    const url = new URL(target);
    const origin = url.origin;
    const allowed = config.appOrigins.some(item => {
      try {
        return new URL(item).origin === origin;
      } catch (error) {
        return false;
      }
    });
    return allowed ? url.toString() : '';
  } catch (error) {
    return '';
  }
}

function fail(res, redirect, code) {
  if (redirect) {
    res.redirect(`${redirect}#auth_error=${encodeURIComponent(code)}`);
    return;
  }
  res.status(400).json({ error: code, message: 'Не удалось выполнить вход через Discord' });
}

authRouter.get('/discord', rateLimit({ max: 30, key: 'oauth' }), (req, res) => {
  if (!discordReady) {
    res.status(503).json({ error: 'discord_not_configured', message: 'DISCORD_CLIENT_ID / SECRET / REDIRECT_URI не заданы на сервере' });
    return;
  }
  const redirect = allowedRedirect(req.query.redirect);
  if (!redirect) {
    res.status(400).json({ error: 'bad_redirect', message: 'Домен не разрешён в APP_ORIGINS' });
    return;
  }
  const state = sign({ kind: 'oauth', redirect, nonce: id(8) }, config.stateTtl);
  res.redirect(authorizeUrl(state));
});

authRouter.get('/discord/callback', rateLimit({ max: 30, key: 'oauth' }), async (req, res) => {
  const payload = verify(String(req.query.state || ''));
  const redirect = payload && payload.kind === 'oauth' ? allowedRedirect(payload.redirect) : '';

  if (!payload || payload.kind !== 'oauth' || !redirect) {
    fail(res, config.appOrigins[0] || '', 'bad_state');
    return;
  }
  if (req.query.error) {
    fail(res, redirect, String(req.query.error));
    return;
  }
  const code = String(req.query.code || '');
  if (!code) {
    fail(res, redirect, 'missing_code');
    return;
  }

  try {
    const grant = await exchangeCode(code);
    const profile = normalizeUser(await fetchUser(grant.access_token));
    const user = store.users.upsert(profile);
    const token = sign({ kind: 'session', sub: user.id, ver: user.tokenVersion || 1 }, config.tokenTtl);
    res.redirect(`${redirect}#token=${token}`);
  } catch (error) {
    console.error('[auth] discord callback', error);
    fail(res, redirect, 'discord_failed');
  }
});

authRouter.get('/me', requireAuth, (req, res) => {
  const { id: userId, username, handle, avatar, createdAt } = req.user;
  res.json({ user: { id: userId, username, handle, avatar, createdAt }, strats: store.strats.countByOwner(userId) });
});

authRouter.post('/logout', requireAuth, (req, res) => {
  store.users.bumpTokenVersion(req.user.id);
  res.json({ ok: true });
});
