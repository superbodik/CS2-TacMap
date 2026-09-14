const DOC_KEYS = ['mapId', 'floor', 'name', 'duration', 'entities', 'strokes', 'nades', 'rulers'];
const LIMIT = 80;

export function createHistory({ store, bus }) {
  let past = [];
  let future = [];
  let last = snapshot();

  function snapshot() {
    const state = store.get();
    const result = {};
    for (const key of DOC_KEYS) result[key] = state[key];
    return result;
  }

  function same(a, b) {
    return DOC_KEYS.every(key => a[key] === b[key]);
  }

  function commit() {
    const next = snapshot();
    if (same(last, next)) return;
    past.push(last);
    if (past.length > LIMIT) past.shift();
    future = [];
    last = next;
    emit();
  }

  function apply(target) {
    last = target;
    store.set({ ...target, selectedId: null }, { force: true, reason: 'history' });
    emit();
  }

  function undo() {
    if (!past.length) return;
    const previous = past.pop();
    future.push(snapshot());
    apply(previous);
  }

  function redo() {
    if (!future.length) return;
    const next = future.pop();
    past.push(snapshot());
    apply(next);
  }

  function reset() {
    past = [];
    future = [];
    last = snapshot();
    emit();
  }

  function emit() {
    bus.emit('history:changed', { canUndo: past.length > 0, canRedo: future.length > 0 });
  }

  bus.on('history:commit', commit);
  bus.on('history:undo', undo);
  bus.on('history:redo', redo);
  bus.on('history:reset', reset);
  emit();

  return { commit, undo, redo, reset };
}
