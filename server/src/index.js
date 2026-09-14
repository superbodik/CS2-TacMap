import express from 'express';
import cors from 'cors';
import { config, discordReady } from './config.js';
import { optionalAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { rateLimit } from './middleware/rateLimit.js';
import { authRouter } from './routes/auth.js';
import { stratsRouter } from './routes/strats.js';
import { demosRouter } from './routes/demos.js';
import { MAPS } from './data/maps.js';
import { store } from './store.js';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', true);

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const allowed = config.appOrigins.some(item => {
      try {
        return new URL(item).origin === origin;
      } catch (error) {
        return false;
      }
    });
    callback(null, allowed);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Edit-Token'],
  maxAge: 86400
}));

app.use(express.json({ limit: `${Math.ceil(config.maxStratBytes / 1024) + 64}kb` }));
app.use(express.urlencoded({ extended: false, limit: '64kb' }));
app.use(optionalAuth);
app.use(rateLimit());

app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    service: 'cs2-tacmap-api',
    version: config.version,
    discord: discordReady,
    uptime: Math.round(process.uptime()),
    strats: Object.keys(store.data.strats).length,
    users: Object.keys(store.data.users).length
  });
});

app.get('/api/maps', (req, res) => {
  res.json({ items: MAPS });
});

app.use('/api/auth', authRouter);
app.use('/api/strats', stratsRouter);
app.use('/api/demos', demosRouter);

app.use(notFound);
app.use(errorHandler);

const server = app.listen(config.port, config.host, () => {
  console.log(`[api] CS2 TacMap API слушает http://${config.host}:${config.port}`);
  console.log(`[api] публичный адрес: ${config.publicUrl}`);
  console.log(`[api] разрешённые origin: ${config.appOrigins.join(', ') || 'нет'}`);
  console.log(`[api] Discord OAuth: ${discordReady ? 'готов' : 'не настроен'}`);
  if (discordReady) console.log(`[api] redirect uri: ${config.discord.redirectUri}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  });
}

export { app, server };
