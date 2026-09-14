export class HttpError extends Error {
  constructor(status, code, message) {
    super(message || code);
    this.status = status;
    this.code = code;
  }
}

export function notFound(req, res) {
  res.status(404).json({ error: 'not_found', message: `Маршрут ${req.method} ${req.path} не найден` });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status = error.status || (error.type === 'entity.too.large' ? 413 : 500);
  const code = error.code || (status === 413 ? 'payload_too_large' : 'internal_error');
  if (status >= 500) console.error('[api]', error);
  res.status(status).json({ error: code, message: error.message || 'Внутренняя ошибка сервера' });
}
