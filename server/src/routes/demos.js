import { Router } from 'express';
import multer from 'multer';
import { extname } from 'node:path';
import { config } from '../config.js';
import { store, id } from '../store.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { HttpError } from '../middleware/errors.js';
import { PARSER_STATUS, detectSource, plannedPipeline, validateDemoLink } from '../services/demoParser.js';

export const demosRouter = Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, config.uploadDir),
    filename: (req, file, cb) => cb(null, `${Date.now().toString(36)}_${id(6)}.dem`)
  }),
  limits: { fileSize: config.maxDemoMb * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (extname(file.originalname).toLowerCase() !== '.dem') {
      cb(new HttpError(415, 'bad_format', 'Поддерживаются только файлы .dem'));
      return;
    }
    cb(null, true);
  }
});

function createJob(payload) {
  return store.jobs.create({
    id: id(8),
    status: PARSER_STATUS,
    pipeline: plannedPipeline(),
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...payload
  });
}

demosRouter.post('/upload', rateLimit({ max: 6, key: 'demo' }), upload.single('demo'), (req, res) => {
  if (!req.file) throw new HttpError(400, 'no_file', 'Файл .dem не получен');
  const job = createJob({
    kind: 'file',
    userId: req.user ? req.user.id : null,
    fileName: req.file.originalname,
    storedAs: req.file.filename,
    size: req.file.size,
    source: 'local_file'
  });

  res.status(202).json({
    jobId: job.id,
    status: job.status,
    message: 'Файл сохранён. Парсинг демок находится в разработке.',
    pipeline: job.pipeline
  });
});

demosRouter.post('/link', rateLimit({ max: 20, key: 'demo' }), (req, res) => {
  const url = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
  if (!url) throw new HttpError(400, 'no_url', 'Не передана ссылка на матч');
  if (!validateDemoLink(url)) throw new HttpError(400, 'bad_url', 'Ссылка должна быть http(s) или steam://');

  const job = createJob({
    kind: 'link',
    userId: req.user ? req.user.id : null,
    url: url.slice(0, 500),
    source: detectSource(url)
  });

  res.status(202).json({
    jobId: job.id,
    status: job.status,
    source: job.source,
    message: 'Ссылка принята. Парсинг демок находится в разработке.',
    pipeline: job.pipeline
  });
});

demosRouter.get('/jobs/:id', (req, res) => {
  const job = store.jobs.get(req.params.id);
  if (!job) throw new HttpError(404, 'not_found', 'Задача не найдена');
  if (job.userId && (!req.user || req.user.id !== job.userId)) throw new HttpError(403, 'forbidden', 'Нет доступа к задаче');
  res.json({ job });
});

demosRouter.get('/jobs', (req, res) => {
  if (!req.user) throw new HttpError(401, 'unauthorized', 'Требуется вход через Discord');
  res.json({ items: store.jobs.byUser(req.user.id) });
});
