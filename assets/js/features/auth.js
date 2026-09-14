import { el, qs, toast } from '../core/dom.js';
import { getToken, setToken } from './api.js';

export function createAuth({ store, bus, api }) {
  const mount = qs('#accountSlot');

  function captureTokenFromUrl() {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const token = params.get('token');
    const error = params.get('auth_error');
    if (token) {
      setToken(token);
      toast('Вход через Discord выполнен', 'ok');
    }
    if (error) toast(`Discord: ${error}`, 'err');
    if (token || error) {
      params.delete('token');
      params.delete('auth_error');
      const rest = params.toString();
      const url = window.location.pathname + window.location.search + (rest ? `#${rest}` : '');
      window.history.replaceState(null, '', url);
    }
  }

  async function refresh() {
    if (!api.available() || !getToken()) {
      store.set({ user: null });
      return null;
    }
    try {
      const data = await api.me();
      store.set({ user: data.user });
      bus.emit('auth:changed', data.user);
      return data.user;
    } catch (error) {
      if (error.status === 401) setToken('');
      store.set({ user: null });
      return null;
    }
  }

  function login() {
    if (!api.available()) {
      toast('Сначала укажите API base URL в панели Backend API', 'err');
      return;
    }
    const redirect = window.location.origin + window.location.pathname + window.location.search;
    window.location.href = api.loginUrl(redirect);
  }

  async function logout() {
    try {
      if (getToken()) await api.logout();
    } catch (error) {
      console.warn('[auth] logout', error);
    }
    setToken('');
    store.set({ user: null });
    bus.emit('auth:changed', null);
    toast('Вы вышли из аккаунта');
  }

  function render(state) {
    if (!mount) return;
    mount.textContent = '';
    const user = state.user;
    if (!user) {
      mount.append(el('button', {
        class: 'btn discord',
        onClick: login,
        title: 'Войти через Discord'
      }, [icon(), el('span', { text: 'Discord' })]));
      return;
    }
    const avatar = user.avatar
      ? el('img', { class: 'avatar', src: user.avatar, alt: '' })
      : el('i', { class: 'avatar fallback', text: (user.username || '?').slice(0, 1).toUpperCase() });
    mount.append(el('div', { class: 'account' }, [
      avatar,
      el('span', { class: 'account-name', text: user.username || 'player' }),
      el('button', { class: 'btn ghost sm', onClick: logout, text: 'Выйти' })
    ]));
  }

  function icon() {
    const wrap = el('span', { class: 'discord-mark' });
    wrap.innerHTML = '<svg viewBox="0 0 24 24"><path d="M8.5 9.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2"/><path d="M15.5 9.5a1 1 0 1 0 0 2 1 1 0 0 0 0-2"/><path d="M7 17c-1.6-2-2.4-4.3-2.2-7.3C6.2 8.4 8 7.6 9.6 7.4l.7 1.2a9 9 0 0 1 3.4 0l.7-1.2c1.6.2 3.4 1 4.8 2.3.2 3-.6 5.3-2.2 7.3-1 .6-2 1-3.1 1.2l-.7-1.3m-4.9 0-.7 1.3c-1.1-.2-2.1-.6-3.1-1.2"/></svg>';
    return wrap;
  }

  captureTokenFromUrl();
  store.subscribe(state => render(state));
  render(store.get());

  return { refresh, login, logout };
}
