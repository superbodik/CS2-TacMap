import { Router } from 'express';
import { config } from '../config.js';
import { store, id } from '../store.js';
import { requireAuth } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { HttpError } from '../middleware/errors.js';
import { MAP_IDS } from '../data/maps.js';

export const stratsRouter = Router();

const MAX_ITEMS = { e: 200, s: 2000, n: 300, r: 200 };

function validateDoc(doc) {
  if (!doc || typeof doc !== 'object' || Array.isArray(doc)) throw new HttpError(400, 'bad_doc', 'Документ страты должен быть объектом');
  const size = Buffer.byteLength(JSON.stringify(doc), 'utf8');
  if (size > config.maxStratBytes) throw new HttpError(413, 'doc_too_large', `Документ больше ${Math.round(config.maxStratBytes / 1024)} КБ`);
  for (const [key, limit] of Object.entries(MAX_ITEMS)) {
    const value = doc[key];
    if (value === undefined) continue;
    if (!Array.isArray(value)) throw new HttpError(400, 'bad_doc', `Поле ${key} должно быть массивом`);
    if (value.length > limit) throw new HttpError(400, 'doc_too_many', `Слишком много элементов в ${key} (максимум ${limit})`);
  }
  if (doc.m && !MAP_IDS.includes(doc.m)) throw new HttpError(400, 'bad_map', `Неизвестная карта ${doc.m}`);
  return size;
}

function sanitizeName(value, fallback) {
  const name = typeof value === 'string' ? value.trim().slice(0, 64) : '';
  return name || fallback;
}

function publicView(strat) {
  return {
    id: strat.id,
    name: strat.name,
    map: strat.map,
    doc: strat.doc,
    visibility: strat.visibility,
    ownerId: strat.ownerId || null,
    revision: strat.revision,
    views: strat.views,
    createdAt: strat.createdAt,
    updatedAt: strat.updatedAt
  };
}

function listView(strat) {
  const { doc, ...rest } = publicView(strat);
  return { ...rest, size: Buffer.byteLength(JSON.stringify(doc), 'utf8') };
}

stratsRouter.get('/mine', requireAuth, (req, res) => {
  res.json({ items: store.strats.byOwner(req.user.id).map(listView) });
});

stratsRouter.post('/', rateLimit({ max: 40, key: 'strat-write' }), (req, res) => {
  const { name, map, doc, visibility } = req.body || {};
  const size = validateDoc(doc);
  const ownerId = req.user ? req.user.id : null;

  if (ownerId && store.strats.countByOwner(ownerId) >= config.maxStratsPerUser) {
    throw new HttpError(409, 'quota_exceeded', 'Достигнут лимит сохранённых страт');
  }

  const now = Date.now();
  const strat = {
    id: id(7),
    name: sanitizeName(name, 'strat'),
    map: MAP_IDS.includes(map) ? map : doc.m || MAP_IDS[0],
    doc,
    ownerId,
    editToken: ownerId ? null : id(16),
    visibility: visibility === 'private' && ownerId ? 'private' : 'public',
    revision: 1,
    views: 0,
    size,
    createdAt: now,
    updatedAt: now
  };

  store.strats.create(strat);
  if (ownerId) {
    store.revisions.push(strat.id, { id: id(6), revision: 1, doc, at: now }, config.maxRevisions);
  }

  res.status(201).json({
    id: strat.id,
    url: `${config.publicUrl}/api/strats/${strat.id}`,
    editToken: strat.editToken,
    revision: strat.revision
  });
});

stratsRouter.get('/:id', (req, res) => {
  const strat = store.strats.get(req.params.id);
  if (!strat) throw new HttpError(404, 'not_found', 'Страта не найдена');
  if (strat.visibility === 'private' && (!req.user || req.user.id !== strat.ownerId)) {
    throw new HttpError(403, 'forbidden', 'Страта приватная');
  }
  store.strats.update(strat.id, { views: (strat.views || 0) + 1 });
  res.json({ strat: publicView(store.strats.get(strat.id)) });
});

stratsRouter.put('/:id', rateLimit({ max: 60, key: 'strat-write' }), (req, res) => {
  const strat = store.strats.get(req.params.id);
  if (!strat) throw new HttpError(404, 'not_found', 'Страта не найдена');

  const byOwner = req.user && strat.ownerId === req.user.id;
  const byToken = strat.editToken && req.get('x-edit-token') === strat.editToken;
  if (!byOwner && !byToken) throw new HttpError(403, 'forbidden', 'Нет прав на изменение страты');

  const { name, doc, map, visibility } = req.body || {};
  const size = validateDoc(doc);
  const revision = (strat.revision || 1) + 1;

  const next = store.strats.update(strat.id, {
    name: sanitizeName(name, strat.name),
    map: MAP_IDS.includes(map) ? map : strat.map,
    doc,
    size,
    revision,
    visibility: visibility === 'private' && strat.ownerId ? 'private' : strat.visibility
  });

  store.revisions.push(strat.id, { id: id(6), revision, doc, at: Date.now() }, config.maxRevisions);
  res.json({ id: next.id, revision: next.revision, updatedAt: next.updatedAt });
});

stratsRouter.delete('/:id', requireAuth, (req, res) => {
  const strat = store.strats.get(req.params.id);
  if (!strat) throw new HttpError(404, 'not_found', 'Страта не найдена');
  if (strat.ownerId !== req.user.id) throw new HttpError(403, 'forbidden', 'Нет прав на удаление');
  store.strats.remove(strat.id);
  res.json({ ok: true });
});

stratsRouter.get('/:id/revisions', requireAuth, (req, res) => {
  const strat = store.strats.get(req.params.id);
  if (!strat) throw new HttpError(404, 'not_found', 'Страта не найдена');
  if (strat.ownerId !== req.user.id) throw new HttpError(403, 'forbidden', 'Нет прав на историю');
  res.json({
    items: store.revisions.list(strat.id).map(item => ({ id: item.id, revision: item.revision, at: item.at }))
  });
});

stratsRouter.get('/:id/revisions/:revisionId', requireAuth, (req, res) => {
  const strat = store.strats.get(req.params.id);
  if (!strat) throw new HttpError(404, 'not_found', 'Страта не найдена');
  if (strat.ownerId !== req.user.id) throw new HttpError(403, 'forbidden', 'Нет прав на историю');
  const revision = store.revisions.find(strat.id, req.params.revisionId);
  if (!revision) throw new HttpError(404, 'not_found', 'Ревизия не найдена');
  res.json({ revision });
});
