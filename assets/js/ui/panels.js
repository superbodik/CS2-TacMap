import { clear, el, qs, qsa, toast } from '../core/dom.js';
import { DRAW_COLORS, NADE_LIST, NADE_TYPES, SPEEDS, TOKEN_LIST, TOKEN_TYPES } from '../data/catalog.js';
import { MAP_LIST, defaultFloor, getMap } from '../data/maps.js';
import { LIMITS } from '../config.js';
import { emptyDoc } from '../features/document.js';
import { round, uid } from '../core/geometry.js';
import { saveApiBase } from '../features/api.js';
import { isEditable } from '../render/stage.js';

export function createPanels({ store, bus, stage, share, exporter, api, timeline }) {
  buildMapSelect();
  buildFloors();
  buildRadarToggle();
  buildTools();
  buildSwatches();
  buildPalette();
  buildNadePanel();
  buildSpeedSelect();
  buildActions();
  buildApiPanel();
  bindKeyboard();

  function buildMapSelect() {
    const select = qs('#mapSelect');
    for (const map of MAP_LIST) {
      select.append(el('option', { value: map.id, text: map.name }));
    }
    select.value = store.get().mapId;
    select.addEventListener('change', () => {
      const map = getMap(select.value);
      store.set({ mapId: map.id, floor: defaultFloor(map), selectedId: null }, { force: true });
      bus.emit('map:changed');
      bus.emit('history:commit', { reason: 'map' });
    });
  }

  function buildRadarToggle() {
    const button = qs('#btnRadar');
    if (!button) return;
    button.addEventListener('click', () => {
      const radar = !store.get().radar;
      store.set({ radar });
      bus.emit('map:changed');
      toast(radar ? 'Радар Simple Radar' : 'Схематичная карта');
    });
    store.subscribe(state => {
      button.classList.toggle('active', state.radar);
      button.textContent = state.radar ? 'Радар' : 'Схема';
    });
  }

  function buildFloors() {
    const host = qs('#floorSwitch');
    function render(state) {
      const map = getMap(state.mapId);
      host.hidden = map.floors.length < 2;
      clear(host);
      if (host.hidden) return;
      for (const floor of map.floors) {
        host.append(el('button', {
          text: floor.name,
          class: floor.id === state.floor ? 'active' : '',
          onClick: () => {
            store.set({ floor: floor.id, selectedId: null });
            bus.emit('map:changed');
          }
        }));
      }
    }
    store.subscribe(render);
    render(store.get());
  }

  function buildTools() {
    const buttons = qsa('#toolbar .tool');
    for (const button of buttons) {
      button.addEventListener('click', () => store.set({ tool: button.dataset.tool, armedToken: null }));
    }
    store.subscribe(state => {
      for (const button of buttons) button.classList.toggle('active', button.dataset.tool === state.tool);
    });
  }

  function buildSwatches() {
    const host = qs('#swatches');
    for (const color of DRAW_COLORS) {
      host.append(el('button', {
        class: 'swatch',
        style: { background: color, color },
        dataset: { color },
        title: color,
        onClick: () => store.set({ color })
      }));
    }
    const size = qs('#brushSize');
    const out = qs('#brushOut');
    size.addEventListener('input', () => {
      store.set({ brush: Number(size.value) });
      out.textContent = size.value;
    });
    store.subscribe(state => {
      for (const node of host.children) node.classList.toggle('active', node.dataset.color === state.color);
    });
  }

  function buildPalette() {
    const host = qs('#palette');
    for (const token of TOKEN_LIST) {
      const node = el('div', {
        class: 'pal-item',
        draggable: 'true',
        dataset: { type: token.id },
        title: token.name
      }, [
        el('span', { class: 'pal-glyph', style: { color: token.color, borderRadius: token.shape === 'square' ? '6px' : '50%' }, text: token.glyph }),
        el('span', { class: 'pal-name', text: token.name })
      ]);
      node.addEventListener('dragstart', event => {
        event.dataTransfer.setData('text/tacmap-token', token.id);
        event.dataTransfer.effectAllowed = 'copy';
      });
      node.addEventListener('click', () => {
        const armed = store.get().armedToken === token.id ? null : token.id;
        store.set({ armedToken: armed });
        stage.showTip(armed ? `Кликните по карте, чтобы поставить ${token.name}` : '');
      });
      host.append(node);
    }
    store.subscribe(state => {
      for (const node of host.children) node.classList.toggle('armed', node.dataset.type === state.armedToken);
    });

    bus.on('stage:drop', ({ type, x, y }) => addEntity(type, x, y));
  }

  function addEntity(type, x, y) {
    const state = store.get();
    if (!TOKEN_TYPES[type]) return;
    if (state.entities.length >= LIMITS.maxEntities) {
      toast('Достигнут лимит иконок на карте', 'err');
      return;
    }
    const entity = {
      id: uid('e'),
      type,
      floor: state.floor,
      x: round(x),
      y: round(y),
      label: '',
      color: '',
      keys: []
    };
    store.set({ entities: [...state.entities, entity], selectedId: entity.id, armedToken: null });
    bus.emit('history:commit', { reason: 'token:add' });
  }

  function buildNadePanel() {
    const host = qs('#nadeTypes');
    for (const nade of NADE_LIST) {
      host.append(el('button', {
        class: 'chip',
        style: { color: nade.color },
        dataset: { type: nade.id },
        onClick: () => store.set({ nadeType: nade.id, tool: 'nade' })
      }, [el('i'), el('span', { text: nade.name })]));
    }

    const bend = qs('#nadeBend');
    const bendOut = qs('#nadeBendOut');
    bend.addEventListener('input', () => {
      store.set({ nadeBend: Number(bend.value) });
      bendOut.textContent = bend.value;
    });

    const label = qs('#nadeLabel');
    label.addEventListener('input', () => store.set({ nadeLabel: label.value }));

    store.subscribe(state => {
      for (const node of host.children) node.classList.toggle('active', node.dataset.type === state.nadeType);
    });
  }

  function buildSpeedSelect() {
    const select = qs('#speedSelect');
    for (const speed of SPEEDS) {
      select.append(el('option', { value: speed.value, text: speed.name }));
    }
    select.value = String(store.get().speed);
    select.addEventListener('change', () => store.set({ speed: Number(select.value) }));

    bus.on('ruler:measure', ({ units, seconds }) => {
      qs('#statDist').textContent = `${units} u`;
      qs('#statTime').textContent = `${seconds} s`;
    });
  }

  function buildObjectList(state) {
    const host = qs('#objectList');
    clear(host);
    const entities = state.entities.filter(entity => entity.floor === state.floor);
    const nades = state.nades.filter(nade => nade.floor === state.floor);

    if (!entities.length && !nades.length) {
      host.append(el('p', { class: 'empty', text: 'На этом этаже пока пусто' }));
      return;
    }

    for (const entity of entities) {
      const meta = TOKEN_TYPES[entity.type] || TOKEN_TYPES.mark;
      host.append(el('div', {
        class: `obj${state.selectedId === entity.id ? ' active' : ''}`,
        onClick: () => store.set({ selectedId: entity.id })
      }, [
        el('i', { class: 'obj-dot', style: { background: entity.color || meta.color } }),
        el('span', { class: 'obj-name', text: entity.label || meta.name }),
        el('span', { class: 'obj-meta', text: entity.keys && entity.keys.length ? `${entity.keys.length}k` : '' }),
        el('button', {
          class: 'obj-del',
          text: '×',
          title: 'Удалить',
          onClick: event => {
            event.stopPropagation();
            store.set({ entities: store.get().entities.filter(item => item.id !== entity.id), selectedId: null });
            bus.emit('history:commit', { reason: 'token:remove' });
          }
        })
      ]));
    }

    for (const nade of nades) {
      const meta = NADE_TYPES[nade.type] || NADE_TYPES.smoke;
      host.append(el('div', { class: 'obj' }, [
        el('i', { class: 'obj-dot', style: { background: meta.color } }),
        el('span', { class: 'obj-name', text: nade.label || `${meta.name} → ${Math.round(nade.to[0])}·${Math.round(nade.to[1])}` }),
        el('button', {
          class: 'obj-del',
          text: '×',
          title: 'Удалить',
          onClick: () => {
            store.set({ nades: store.get().nades.filter(item => item.id !== nade.id) });
            bus.emit('history:commit', { reason: 'nade:remove' });
          }
        })
      ]));
    }
  }

  function buildActions() {
    qs('#stratName').addEventListener('input', event => store.set({ name: event.target.value }));

    qs('#btnUndo').addEventListener('click', () => bus.emit('history:undo'));
    qs('#btnRedo').addEventListener('click', () => bus.emit('history:redo'));
    qs('#btnShare').addEventListener('click', () => share.shareUrl());
    qs('#btnShort').addEventListener('click', () => share.shortUrl());
    qs('#btnExport').addEventListener('click', () => exporter.toPng());

    qs('#btnClearDraw').addEventListener('click', () => {
      const state = store.get();
      store.set({ strokes: state.strokes.filter(stroke => stroke.floor !== state.floor) });
      bus.emit('history:commit', { reason: 'clear:draw' });
    });

    qs('#btnClearNades').addEventListener('click', () => {
      const state = store.get();
      store.set({ nades: state.nades.filter(nade => nade.floor !== state.floor) });
      bus.emit('history:commit', { reason: 'clear:nades' });
    });

    qs('#btnClearRulers').addEventListener('click', () => {
      const state = store.get();
      store.set({ rulers: state.rulers.filter(ruler => ruler.floor !== state.floor) });
      qs('#statDist').textContent = '—';
      qs('#statTime').textContent = '—';
      bus.emit('history:commit', { reason: 'clear:rulers' });
    });

    qs('#btnReset').addEventListener('click', () => {
      if (!window.confirm('Полностью очистить доску?')) return;
      store.set({ ...emptyDoc(store.get().mapId), stratId: null, selectedId: null, time: 0 }, { force: true });
      bus.emit('tokens:reset');
      bus.emit('map:changed');
      bus.emit('history:commit', { reason: 'reset' });
      window.history.replaceState(null, '', window.location.pathname);
      toast('Доска очищена');
    });

    bus.on('history:changed', ({ canUndo, canRedo }) => {
      qs('#btnUndo').disabled = !canUndo;
      qs('#btnRedo').disabled = !canRedo;
    });
  }

  function buildApiPanel() {
    const input = qs('#apiBase');
    const status = qs('#apiStatus');
    input.value = store.get().apiBase;

    async function check(silent) {
      const label = status.querySelector('span');
      if (!api.available()) {
        status.className = 'api-status';
        label.textContent = 'не подключено';
        return;
      }
      try {
        const data = await api.health();
        status.className = 'api-status ok';
        label.textContent = `online · ${data.service || 'api'} ${data.version || ''}`.trim();
      } catch (error) {
        status.className = 'api-status err';
        label.textContent = `офлайн: ${error.message}`;
        if (!silent) toast('API недоступен', 'err');
      }
    }

    input.addEventListener('change', () => {
      const clean = saveApiBase(input.value);
      input.value = clean;
      store.set({ apiBase: clean });
      check(true);
    });

    qs('#btnApiCheck').addEventListener('click', () => check(false));
    check(true);
  }

  function bindKeyboard() {
    const keys = { KeyV: 'select', KeyP: 'pen', KeyA: 'arrow', KeyE: 'eraser', KeyN: 'nade', KeyR: 'ruler' };
    window.addEventListener('keydown', event => {
      if (isEditable(event.target)) return;

      if ((event.ctrlKey || event.metaKey) && event.code === 'KeyZ') {
        event.preventDefault();
        bus.emit(event.shiftKey ? 'history:redo' : 'history:undo');
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.code === 'KeyY') {
        event.preventDefault();
        bus.emit('history:redo');
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.code === 'KeyS') {
        event.preventDefault();
        share.shareUrl();
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      if (keys[event.code]) {
        store.set({ tool: keys[event.code], armedToken: null });
        return;
      }
      if (event.code === 'Space') {
        event.preventDefault();
        timeline.toggle();
        return;
      }
      if (event.code === 'Escape') {
        bus.emit('tool:cancel');
        store.set({ selectedId: null, armedToken: null });
        stage.showTip('');
        return;
      }
      if (event.code === 'Delete' || event.code === 'Backspace') {
        const state = store.get();
        if (!state.selectedId) return;
        store.set({ entities: state.entities.filter(item => item.id !== state.selectedId), selectedId: null });
        bus.emit('history:commit', { reason: 'token:remove' });
        return;
      }
      if (event.code === 'Digit0') stage.resetView();
    });
  }

  store.subscribe(state => {
    const name = qs('#stratName');
    if (document.activeElement !== name && name.value !== state.name) name.value = state.name;
    const map = qs('#mapSelect');
    if (map.value !== state.mapId) map.value = state.mapId;
    buildObjectList(state);
  });

  buildObjectList(store.get());

  return { addEntity };
}
