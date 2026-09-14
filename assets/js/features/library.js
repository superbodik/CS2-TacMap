import { clear, el, qs, toast } from '../core/dom.js';
import { LIMITS } from '../config.js';
import { docStats, fromDoc, toDoc } from './document.js';
import { getMap } from '../data/maps.js';
import { getToken } from './api.js';

const LOCAL_KEY = 'tacmap.history';

export function createLibrary({ store, bus, api }) {
  const list = qs('#libraryList');
  const seg = qs('#librarySeg');
  const saveBtn = qs('#btnSaveStrat');
  let source = 'local';
  let cloud = [];
  let autosaveTimer = null;

  function readLocal() {
    try {
      const parsed = JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function writeLocal(items) {
    try {
      localStorage.setItem(LOCAL_KEY, JSON.stringify(items.slice(0, LIMITS.localHistory)));
    } catch (error) {
      console.warn('[library] storage full', error);
    }
  }

  function pushLocal(entry) {
    const items = readLocal().filter(item => item.id !== entry.id);
    items.unshift(entry);
    writeLocal(items);
    if (source === 'local') render();
  }

  function entryFromState(auto) {
    const state = store.get();
    const doc = toDoc(state);
    return {
      id: auto ? 'auto' : `loc_${Date.now().toString(36)}`,
      at: Date.now(),
      auto: Boolean(auto),
      name: state.name || `${getMap(state.mapId).name} strat`,
      map: state.mapId,
      stats: docStats(doc),
      doc
    };
  }

  function scheduleAutosave() {
    if (autosaveTimer) clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      autosaveTimer = null;
      const state = store.get();
      if (!state.entities.length && !state.strokes.length && !state.nades.length && !state.rulers.length) return;
      pushLocal(entryFromState(true));
    }, 2500);
  }

  async function loadCloud() {
    if (!api.available() || !getToken()) {
      cloud = [];
      return;
    }
    try {
      const data = await api.listMine();
      cloud = data.items || [];
    } catch (error) {
      cloud = [];
      if (error.status !== 401) toast(`История аккаунта: ${error.message}`, 'err');
    }
  }

  async function save() {
    const state = store.get();
    const doc = toDoc(state);
    const name = state.name || `${getMap(state.mapId).name} strat`;
    pushLocal({ ...entryFromState(false), name });

    if (!api.available() || !getToken()) {
      toast('Сохранено локально. Войдите через Discord для облачной истории.');
      render();
      return;
    }
    try {
      const payload = { name, map: state.mapId, doc };
      const result = state.stratId
        ? await api.updateStrat(state.stratId, payload)
        : await api.createStrat(payload);
      store.set({ stratId: result.id });
      await loadCloud();
      source = 'cloud';
      syncSeg();
      render();
      toast('Страта сохранена в аккаунте', 'ok');
    } catch (error) {
      toast(`Не удалось сохранить: ${error.message}`, 'err');
      render();
    }
  }

  function applyEntry(doc, stratId) {
    try {
      const next = fromDoc(doc);
      store.set({ ...next, stratId: stratId || null, selectedId: null, time: 0 }, { force: true });
      bus.emit('history:reset');
      bus.emit('map:changed');
      toast('Страта загружена', 'ok');
    } catch (error) {
      toast(`Ошибка загрузки: ${error.message}`, 'err');
    }
  }

  async function openCloud(item) {
    try {
      const data = await api.getStrat(item.id);
      applyEntry(data.strat.doc, data.strat.id);
    } catch (error) {
      toast(`Не удалось открыть: ${error.message}`, 'err');
    }
  }

  async function removeCloud(item) {
    if (!window.confirm(`Удалить «${item.name}» из аккаунта?`)) return;
    try {
      await api.deleteStrat(item.id);
      await loadCloud();
      render();
      toast('Удалено');
    } catch (error) {
      toast(`Не удалось удалить: ${error.message}`, 'err');
    }
  }

  function removeLocal(entry) {
    writeLocal(readLocal().filter(item => item.id !== entry.id));
    render();
  }

  function stamp(ts) {
    const date = new Date(ts);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')} ${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  function row(item, onOpen, onDelete, meta) {
    return el('div', { class: 'obj', onClick: onOpen }, [
      el('i', { class: 'obj-dot', style: { background: item.auto ? '#5d6879' : '#00e5ff' } }),
      el('span', { class: 'obj-name', text: item.name || 'strat' }),
      el('span', { class: 'obj-time', text: meta }),
      el('button', {
        class: 'obj-del',
        title: 'Удалить',
        text: '×',
        onClick: event => {
          event.stopPropagation();
          onDelete();
        }
      })
    ]);
  }

  function render() {
    if (!list) return;
    clear(list);

    if (source === 'local') {
      const items = readLocal();
      if (!items.length) {
        list.append(el('p', { class: 'empty', text: 'Локальная история пуста' }));
        return;
      }
      for (const item of items) {
        list.append(row(item, () => applyEntry(item.doc, null), () => removeLocal(item), `${item.auto ? 'auto ' : ''}${stamp(item.at)}`));
      }
      return;
    }

    if (!getToken()) {
      list.append(el('p', { class: 'empty', text: 'Войдите через Discord, чтобы хранить страты в аккаунте' }));
      return;
    }
    if (!cloud.length) {
      list.append(el('p', { class: 'empty', text: 'В аккаунте пока нет страт' }));
      return;
    }
    for (const item of cloud) {
      list.append(row(item, () => openCloud(item), () => removeCloud(item), `v${item.revision || 1} ${stamp(item.updatedAt)}`));
    }
  }

  function syncSeg() {
    if (!seg) return;
    for (const button of seg.querySelectorAll('button')) {
      button.classList.toggle('active', button.dataset.src === source);
    }
  }

  if (seg) {
    seg.addEventListener('click', async event => {
      const button = event.target.closest('button');
      if (!button) return;
      source = button.dataset.src;
      syncSeg();
      if (source === 'cloud') await loadCloud();
      render();
    });
  }

  if (saveBtn) saveBtn.addEventListener('click', save);

  bus.on('history:commit', scheduleAutosave);
  bus.on('auth:changed', async () => {
    await loadCloud();
    render();
  });

  syncSeg();
  render();

  return { render, save, loadCloud };
}
