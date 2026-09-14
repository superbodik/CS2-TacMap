import { config } from '../config.js';

const API = 'https://discord.com/api/v10';

export function authorizeUrl(state) {
  const params = new URLSearchParams({
    client_id: config.discord.clientId,
    redirect_uri: config.discord.redirectUri,
    response_type: 'code',
    scope: config.discord.scope,
    state,
    prompt: 'none'
  });
  return `${API}/oauth2/authorize?${params.toString()}`;
}

export async function exchangeCode(code) {
  const body = new URLSearchParams({
    client_id: config.discord.clientId,
    client_secret: config.discord.clientSecret,
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.discord.redirectUri
  });

  const response = await fetch(`${API}/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`token_exchange_failed: ${response.status} ${detail.slice(0, 200)}`);
  }
  return response.json();
}

export async function fetchUser(accessToken) {
  const response = await fetch(`${API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!response.ok) throw new Error(`user_fetch_failed: ${response.status}`);
  return response.json();
}

export function avatarUrl(user) {
  if (user.avatar) {
    const ext = user.avatar.startsWith('a_') ? 'gif' : 'png';
    return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.${ext}?size=64`;
  }
  const index = Number(BigInt(user.id) >> 22n) % 6;
  return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
}

export function normalizeUser(user) {
  return {
    id: user.id,
    username: user.global_name || user.username,
    handle: user.username,
    avatar: avatarUrl(user),
    locale: user.locale || null
  };
}
