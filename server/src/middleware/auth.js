import { store } from '../store.js';
import { verify } from '../services/jwt.js';

function readToken(req) {
  const header = req.get('authorization') || '';
  if (header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
  if (typeof req.query.token === 'string') return req.query.token;
  return '';
}

export function optionalAuth(req, res, next) {
  const token = readToken(req);
  if (!token) return next();
  const payload = verify(token);
  if (!payload || payload.kind !== 'session') return next();
  const user = store.users.get(payload.sub);
  if (!user) return next();
  if ((user.tokenVersion || 1) !== payload.ver) return next();
  req.user = user;
  next();
}

export function requireAuth(req, res, next) {
  if (req.user) return next();
  res.status(401).json({ error: 'unauthorized', message: 'Требуется вход через Discord' });
}
