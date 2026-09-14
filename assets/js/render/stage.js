import { qs } from '../core/dom.js';
import { clamp, MAP_SIZE, round } from '../core/geometry.js';

export function createStage({ store, bus }) {
  const root = qs('#stage');
  const viewport = qs('#viewport');
  const mapLayer = qs('#mapLayer');
  const drawLayer = qs('#drawLayer');
  const tokenLayer = qs('#tokenLayer');

  const view = { zoom: 1, panX: 0, panY: 0, size: 600 };
  let panning = null;
  let preview = null;
  let activePointer = null;

  function layout() {
    const rect = root.getBoundingClientRect();
    const size = Math.max(240, Math.min(rect.width, rect.height) - 28);
    view.size = size;
    viewport.style.width = `${size}px`;
    viewport.style.height = `${size}px`;
    applyTransform();
    bus.emit('stage:resize', { size });
  }

  function applyTransform() {
    viewport.style.transform = `translate(-50%, -50%) translate(${view.panX}px, ${view.panY}px) scale(${view.zoom})`;
    const zoomOut = qs('#hudZoom');
    if (zoomOut) zoomOut.textContent = `${Math.round(view.zoom * 100)}%`;
    bus.emit('view:change', { ...view });
  }

  function setZoom(nextZoom, anchor) {
    const zoom = clamp(nextZoom, 0.5, 5);
    if (anchor) {
      const rect = root.getBoundingClientRect();
      const cx = anchor.clientX - rect.left - rect.width / 2;
      const cy = anchor.clientY - rect.top - rect.height / 2;
      const ratio = zoom / view.zoom;
      view.panX = cx - (cx - view.panX) * ratio;
      view.panY = cy - (cy - view.panY) * ratio;
    }
    view.zoom = zoom;
    applyTransform();
  }

  function resetView() {
    view.zoom = 1;
    view.panX = 0;
    view.panY = 0;
    applyTransform();
  }

  function toMap(clientX, clientY) {
    const rect = viewport.getBoundingClientRect();
    return {
      x: clamp(((clientX - rect.left) / rect.width) * MAP_SIZE, 0, MAP_SIZE),
      y: clamp(((clientY - rect.top) / rect.height) * MAP_SIZE, 0, MAP_SIZE)
    };
  }

  function setPreview(next) {
    preview = next;
    bus.emit('render:overlay');
  }

  function getPreview() {
    return preview;
  }

  function showTip(text) {
    const tip = qs('#stageTip');
    if (!tip) return;
    if (!text) {
      tip.classList.remove('show');
      return;
    }
    tip.textContent = text;
    tip.classList.add('show');
  }

  function isPanGesture(event) {
    return event.button === 1 || event.button === 2 || (event.button === 0 && event.altKey);
  }

  root.addEventListener('contextmenu', event => event.preventDefault());

  root.addEventListener('pointerdown', event => {
    if (event.target.closest('.stage-actions')) return;
    if (isPanGesture(event)) {
      panning = { x: event.clientX, y: event.clientY, panX: view.panX, panY: view.panY, id: event.pointerId };
      root.classList.add('panning');
      root.setPointerCapture(event.pointerId);
      event.preventDefault();
      return;
    }
    if (event.button !== 0) return;
    if (event.target.closest('.token')) return;
    activePointer = event.pointerId;
    root.setPointerCapture(event.pointerId);
    bus.emit('pointer:down', { point: toMap(event.clientX, event.clientY), event });
  });

  root.addEventListener('pointermove', event => {
    const point = toMap(event.clientX, event.clientY);
    const coords = qs('#hudCoords');
    if (coords) coords.textContent = `${Math.round(point.x)} · ${Math.round(point.y)}`;

    if (panning && panning.id === event.pointerId) {
      view.panX = panning.panX + (event.clientX - panning.x);
      view.panY = panning.panY + (event.clientY - panning.y);
      applyTransform();
      return;
    }
    bus.emit('pointer:move', { point, event, active: activePointer === event.pointerId });
  });

  function endPointer(event) {
    if (panning && panning.id === event.pointerId) {
      panning = null;
      root.classList.remove('panning');
      return;
    }
    if (activePointer !== event.pointerId) return;
    activePointer = null;
    bus.emit('pointer:up', { point: toMap(event.clientX, event.clientY), event });
  }

  root.addEventListener('pointerup', endPointer);
  root.addEventListener('pointercancel', endPointer);

  root.addEventListener('wheel', event => {
    event.preventDefault();
    setZoom(view.zoom * (event.deltaY < 0 ? 1.12 : 0.89), event);
  }, { passive: false });

  root.addEventListener('dragover', event => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  });

  root.addEventListener('drop', event => {
    event.preventDefault();
    const type = event.dataTransfer.getData('text/tacmap-token');
    if (!type) return;
    const point = toMap(event.clientX, event.clientY);
    bus.emit('stage:drop', { type, x: round(point.x), y: round(point.y) });
  });

  const observer = new ResizeObserver(() => layout());
  observer.observe(root);

  store.subscribe(state => {
    root.dataset.tool = state.tool;
  });

  qs('#btnZoomIn').addEventListener('click', () => setZoom(view.zoom * 1.2));
  qs('#btnZoomOut').addEventListener('click', () => setZoom(view.zoom / 1.2));
  qs('#btnZoomReset').addEventListener('click', resetView);

  layout();

  return {
    root,
    viewport,
    mapLayer,
    drawLayer,
    tokenLayer,
    view,
    toMap,
    layout,
    setZoom,
    resetView,
    setPreview,
    getPreview,
    showTip
  };
}

export function isEditable(node) {
  if (!node) return false;
  const tag = node.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable;
}
