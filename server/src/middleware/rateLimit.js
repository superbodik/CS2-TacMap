import { config } from '../config.js';

const buckets = new Map();

setInterval(() => {
  const cutoff = Date.now() - config.rateWindowMs;
  for (const [key, hits] of buckets) {
    const fresh = hits.filter(time => time > cutoff);
    if (fresh.length) buckets.set(key, fresh);
    else buckets.delete(key);
  }
}, config.rateWindowMs).unref();

export function rateLimit({ max = config.rateMax, windowMs = config.rateWindowMs, key = 'global' } = {}) {
  return (req, res, next) => {
    const identity = `${key}:${req.user ? req.user.id : req.ip}`;
    const now = Date.now();
    const hits = (buckets.get(identity) || []).filter(time => time > now - windowMs);
    if (hits.length >= max) {
      res.set('Retry-After', String(Math.ceil(windowMs / 1000)));
      res.status(429).json({ error: 'rate_limited', message: 'Слишком много запросов, попробуйте позже' });
      return;
    }
    hits.push(now);
    buckets.set(identity, hits);
    next();
  };
}
