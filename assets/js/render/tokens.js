import { clear, el } from '../core/dom.js';
import { MAP_SIZE, clamp, round } from '../core/geometry.js';
import { TOKEN_TYPES } from '../data/catalog.js';

export function entityPosition(entity, time) {
  const keys = entity.keys;
  if (!keys || keys.length === 0) return { x: entity.x, y: entity.y };
  if (keys.length === 1 || time <= keys[0][0]) return { x: keys[0][1], y: keys[0][2] };
  const last = keys[keys.length - 1];
  if (time >= last[0]) return { x: last[1], y: last[2] };
  for (let i = 0; i < keys.length - 1; i += 1) {
    const a = keys[i];
    const b = keys[i + 1];
    if (time >= a[0] && time <= b[0]) {
      const span = b[0] - a[0] || 1;
      const raw = (time - a[0]) / span;
      const t = raw * raw * (3 - 2 * raw);
      return { x: a[1] + (b[1] - a[1]) * t, y: a[2] + (b[2] - a[2]) * t };
    }
  }
  return { x: entity.x, y: entity.y };
}

export function createTokenLayer({ stage, store, bus }) {
  const layer = stage.tokenLayer;
  const nodes = new Map();
  let drag = null;

  function sync(state) {
    const visible = state.entities.filter(entity => entity.floor === state.floor);
    const seen = new Set();

    for (const entity of visible) {
      seen.add(entity.id);
      let node = nodes.get(entity.id);
      if (!node) {
        node = createNode(entity);
        nodes.set(entity.id, node);
        layer.append(node);
      }
      updateNode(node, entity, state);
    }

    for (const [id, node] of nodes) {
      if (!seen.has(id)) {
        node.remove();
        nodes.delete(id);
      }
    }
  }

  function createNode(entity) {
    const node = el('div', {
      class: 'token',
      dataset: { id: entity.id },
      title: 'ЛКМ — перетащить, двойной клик — подпись'
    }, [el('span', { class: 'token-glyph' })]);
    node.addEventListener('pointerdown', onPointerDown);
    node.addEventListener('dblclick', onRename);
    return node;
  }

  function updateNode(node, entity, state) {
    const meta = TOKEN_TYPES[entity.type] || TOKEN_TYPES.mark;
    const pos = entityPosition(entity, state.time);
    node.style.left = `${(pos.x / MAP_SIZE) * 100}%`;
    node.style.top = `${(pos.y / MAP_SIZE) * 100}%`;
    node.style.color = entity.color || meta.color;
    node.dataset.shape = meta.shape;
    node.classList.toggle('selected', state.selectedId === entity.id);
    node.querySelector('.token-glyph').textContent = meta.glyph;

    let label = node.querySelector('.token-label');
    if (entity.label) {
      if (!label) {
        label = el('span', { class: 'token-label' });
        node.append(label);
      }
      label.textContent = entity.label;
    } else if (label) {
      label.remove();
    }
  }

  function onPointerDown(event) {
    if (store.get().tool !== 'select' || event.button !== 0) return;
    event.stopPropagation();
    const node = event.currentTarget;
    const id = node.dataset.id;
    const state = store.get();
    const entity = state.entities.find(item => item.id === id);
    if (!entity) return;

    const pos = entityPosition(entity, state.time);
    const point = stage.toMap(event.clientX, event.clientY);
    drag = { id, dx: pos.x - point.x, dy: pos.y - point.y, moved: false };
    node.setPointerCapture(event.pointerId);
    node.classList.add('dragging');
    store.set({ selectedId: id });
  }

  function onPointerMove(event) {
    if (!drag) return;
    const point = stage.toMap(event.clientX, event.clientY);
    const x = round(clamp(point.x + drag.dx, 0, MAP_SIZE));
    const y = round(clamp(point.y + drag.dy, 0, MAP_SIZE));
    drag.moved = true;
    applyPosition(drag.id, x, y);
  }

  function onPointerUp() {
    if (!drag) return;
    const node = nodes.get(drag.id);
    if (node) node.classList.remove('dragging');
    if (drag.moved) bus.emit('history:commit', { reason: 'token:move' });
    drag = null;
  }

  function applyPosition(id, x, y) {
    const state = store.get();
    const entities = state.entities.map(entity => {
      if (entity.id !== id) return entity;
      if (state.recording && state.time > 0) {
        const keys = (entity.keys || []).filter(key => Math.abs(key[0] - state.time) > 0.35);
        keys.push([round(state.time, 2), x, y]);
        keys.sort((a, b) => a[0] - b[0]);
        return { ...entity, keys };
      }
      return { ...entity, x, y, keys: entity.keys && entity.keys.length ? shiftKeys(entity, x, y, state.time) : entity.keys };
    });
    store.set({ entities });
  }

  function shiftKeys(entity, x, y, time) {
    const pos = entityPosition(entity, time);
    const dx = x - pos.x;
    const dy = y - pos.y;
    return entity.keys.map(key => [key[0], round(key[1] + dx), round(key[2] + dy)]);
  }

  function onRename(event) {
    event.stopPropagation();
    const id = event.currentTarget.dataset.id;
    const state = store.get();
    const entity = state.entities.find(item => item.id === id);
    if (!entity) return;
    const label = window.prompt('Подпись для иконки', entity.label || '');
    if (label === null) return;
    store.set({ entities: state.entities.map(item => (item.id === id ? { ...item, label: label.slice(0, 24) } : item)) });
    bus.emit('history:commit', { reason: 'token:label' });
  }

  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  store.subscribe(sync);
  bus.on('tokens:reset', () => {
    clear(layer);
    nodes.clear();
  });

  sync(store.get());

  return { sync };
}
