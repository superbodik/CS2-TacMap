import { API_BASE } from '../config.js';

const API_KEY = 'tacmap.api';
const TOKEN_KEY = 'tacmap.token';

export function loadApiBase() {
  const fromQuery = new URLSearchParams(window.location.search).get('api');
  if (fromQuery) return saveApiBase(fromQuery);
  const stored = localStorage.getItem(API_KEY);
  if (stored) return stored.replace(/\/+$/, '');
  const origin = window.location.origin;
  if (/^https?:\/\/(localhost|127\.0\.0\.1)/.test(origin)) return 'http://localhost:8787';
  return (API_BASE || '').replace(/\/+$/, '');
}

export function saveApiBase(value) {
  const clean = (value || '').trim().replace(/\/+$/, '');
  if (clean) localStorage.setItem(API_KEY, clean);
  else localStorage.removeItem(API_KEY);
  return clean;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function createApi({ store }) {
  function base() {
    return store.get().apiBase;
  }

  function available() {
    return Boolean(base());
  }

  async function request(path, { method = 'GET', body, auth = false, raw = false, timeout = 15000 } = {}) {
    if (!available()) throw new Error('API base URL не задан');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    const headers = {};
    if (!raw && body !== undefined) headers['Content-Type'] = 'application/json';
    if (auth) {
      const token = getToken();
      if (!token) throw new Error('Требуется вход через Discord');
      headers.Authorization = `Bearer ${token}`;
    }
    try {
      const response = await fetch(base() + path, {
        method,
        headers,
        signal: controller.signal,
        body: raw ? body : body === undefined ? undefined : JSON.stringify(body)
      });
      const text = await response.text();
      const data = text ? safeJson(text) : null;
      if (!response.ok) {
        const message = (data && (data.message || data.error)) || `HTTP ${response.status}`;
        const error = new Error(message);
        error.status = response.status;
        throw error;
      }
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  function safeJson(text) {
    try {
      return JSON.parse(text);
    } catch (error) {
      return { raw: text };
    }
  }

  return {
    available,
    base,
    health: () => request('/api/health'),
    me: () => request('/api/auth/me', { auth: true }),
    logout: () => request('/api/auth/logout', { method: 'POST', auth: true }),
    loginUrl: redirect => `${base()}/api/auth/discord?redirect=${encodeURIComponent(redirect)}`,
    createStrat: payload => request('/api/strats', { method: 'POST', body: payload, auth: Boolean(getToken()) }),
    updateStrat: (id, payload) => request(`/api/strats/${id}`, { method: 'PUT', body: payload, auth: true }),
    deleteStrat: id => request(`/api/strats/${id}`, { method: 'DELETE', auth: true }),
    getStrat: id => request(`/api/strats/${id}`),
    listMine: () => request('/api/strats/mine', { auth: true }),
    revisions: id => request(`/api/strats/${id}/revisions`, { auth: true }),
    uploadDemo: file => {
      const form = new FormData();
      form.append('demo', file);
      return request('/api/demos/upload', { method: 'POST', body: form, raw: true, auth: Boolean(getToken()), timeout: 120000 });
    },
    submitDemoLink: url => request('/api/demos/link', { method: 'POST', body: { url }, auth: Boolean(getToken()) })
  };
}
