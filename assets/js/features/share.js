import { copyText, toast } from '../core/dom.js';
import { decodeDocument, encodeDocument } from '../core/codec.js';
import { fromDoc, toDoc } from './document.js';
import { LIMITS } from '../config.js';
import { getToken } from './api.js';

export function createShare({ store, bus, api }) {
  function baseUrl() {
    return window.location.origin + window.location.pathname;
  }

  async function buildUrl() {
    const payload = await encodeDocument(toDoc(store.get()));
    return { url: `${baseUrl()}?strat=${payload}`, size: payload.length };
  }

  async function shareUrl() {
    try {
      const { url, size } = await buildUrl();
      if (size > LIMITS.urlPayload) {
        toast('Страта слишком большая для URL — используйте Short', 'err');
        return null;
      }
      const copied = await copyText(url);
      window.history.replaceState(null, '', url);
      toast(copied ? 'Ссылка скопирована в буфер обмена' : 'Ссылка в адресной строке', copied ? 'ok' : 'info');
      return url;
    } catch (error) {
      toast(`Не удалось собрать ссылку: ${error.message}`, 'err');
      return null;
    }
  }

  async function shortUrl() {
    if (!api.available()) {
      toast('Укажите API base URL — короткие ссылки требуют сервер', 'err');
      return null;
    }
    const state = store.get();
    try {
      const result = await api.createStrat({
        name: state.name || 'shared strat',
        map: state.mapId,
        doc: toDoc(state),
        visibility: 'public'
      });
      const url = `${baseUrl()}?s=${result.id}`;
      if (getToken()) store.set({ stratId: result.id });
      const copied = await copyText(url);
      toast(copied ? `Короткая ссылка скопирована: ${result.id}` : url, 'ok', 5000);
      return url;
    } catch (error) {
      toast(`Сервер не принял страту: ${error.message}`, 'err');
      return null;
    }
  }

  function applyDoc(doc, stratId) {
    const next = fromDoc(doc);
    store.set({ ...next, stratId: stratId || null, selectedId: null, time: 0 }, { force: true });
    bus.emit('history:reset');
    bus.emit('map:changed');
  }

  async function loadFromUrl() {
    const params = new URLSearchParams(window.location.search);
    const inline = params.get('strat');
    const shortId = params.get('s');

    if (inline) {
      try {
        const doc = await decodeDocument(inline);
        applyDoc(doc, null);
        toast('Страта загружена из ссылки', 'ok');
        return true;
      } catch (error) {
        toast(`Ссылка повреждена: ${error.message}`, 'err');
        return false;
      }
    }

    if (shortId && api.available()) {
      try {
        const data = await api.getStrat(shortId);
        applyDoc(data.strat.doc, data.strat.id);
        toast(`Загружена страта «${data.strat.name}»`, 'ok');
        return true;
      } catch (error) {
        toast(`Не удалось загрузить страту: ${error.message}`, 'err');
        return false;
      }
    }

    return false;
  }

  return { shareUrl, shortUrl, loadFromUrl, buildUrl, applyDoc };
}
