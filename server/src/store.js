import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { config } from './config.js';

const FILE = resolve(config.dataDir, 'db.json');
const EMPTY = { users: {}, strats: {}, revisions: {}, jobs: {} };

let db = structuredClone(EMPTY);
let dirty = false;
let timer = null;

function ensureDirs() {
  for (const dir of [config.dataDir, config.uploadDir]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
}

function load() {
  ensureDirs();
  if (!existsSync(FILE)) {
    persist();
    return;
  }
  try {
    const parsed = JSON.parse(readFileSync(FILE, 'utf8'));
    db = { ...structuredClone(EMPTY), ...parsed };
  } catch (error) {
    console.error('[store] повреждённый db.json, создаю новый', error);
    db = structuredClone(EMPTY);
    persist();
  }
}

function persist() {
  ensureDirs();
  const temp = `${FILE}.tmp`;
  writeFileSync(temp, JSON.stringify(db), 'utf8');
  renameSync(temp, FILE);
  dirty = false;
}

function schedule() {
  dirty = true;
  if (timer) return;
  timer = setTimeout(() => {
    timer = null;
    if (dirty) persist();
  }, 400);
}

export function id(size = 9) {
  return randomBytes(size).toString('base64url').slice(0, size + 3);
}

export const store = {
  get data() {
    return db;
  },
  users: {
    get: userId => db.users[userId] || null,
    upsert(user) {
      const existing = db.users[user.id];
      const next = {
        ...existing,
        ...user,
        tokenVersion: existing ? existing.tokenVersion : 1,
        createdAt: existing ? existing.createdAt : Date.now(),
        updatedAt: Date.now()
      };
      db.users[user.id] = next;
      schedule();
      return next;
    },
    bumpTokenVersion(userId) {
      const user = db.users[userId];
      if (!user) return null;
      user.tokenVersion = (user.tokenVersion || 1) + 1;
      user.updatedAt = Date.now();
      schedule();
      return user;
    }
  },
  strats: {
    get: stratId => db.strats[stratId] || null,
    create(strat) {
      db.strats[strat.id] = strat;
      schedule();
      return strat;
    },
    update(stratId, patch) {
      const current = db.strats[stratId];
      if (!current) return null;
      const next = { ...current, ...patch, updatedAt: Date.now() };
      db.strats[stratId] = next;
      schedule();
      return next;
    },
    remove(stratId) {
      delete db.strats[stratId];
      delete db.revisions[stratId];
      schedule();
    },
    byOwner(ownerId) {
      return Object.values(db.strats)
        .filter(strat => strat.ownerId === ownerId)
        .sort((a, b) => b.updatedAt - a.updatedAt);
    },
    countByOwner(ownerId) {
      return Object.values(db.strats).filter(strat => strat.ownerId === ownerId).length;
    }
  },
  revisions: {
    list: stratId => db.revisions[stratId] || [],
    push(stratId, revision, limit) {
      const list = db.revisions[stratId] || [];
      list.unshift(revision);
      db.revisions[stratId] = list.slice(0, limit);
      schedule();
      return db.revisions[stratId];
    },
    find(stratId, revisionId) {
      return (db.revisions[stratId] || []).find(item => item.id === revisionId) || null;
    }
  },
  jobs: {
    get: jobId => db.jobs[jobId] || null,
    create(job) {
      db.jobs[job.id] = job;
      schedule();
      return job;
    },
    update(jobId, patch) {
      const current = db.jobs[jobId];
      if (!current) return null;
      const next = { ...current, ...patch, updatedAt: Date.now() };
      db.jobs[jobId] = next;
      schedule();
      return next;
    },
    byUser(userId) {
      return Object.values(db.jobs)
        .filter(job => job.userId === userId)
        .sort((a, b) => b.createdAt - a.createdAt);
    }
  },
  flush: persist
};

load();

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    if (dirty) persist();
    process.exit(0);
  });
}
