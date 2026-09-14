export function createStore(initialState) {
  let state = { ...initialState };
  const listeners = new Set();
  let queued = null;

  function get() {
    return state;
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function notify(meta) {
    for (const listener of [...listeners]) {
      try {
        listener(state, meta);
      } catch (error) {
        console.error('[store]', error);
      }
    }
  }

  function set(patch, meta = {}) {
    const next = typeof patch === 'function' ? patch(state) : patch;
    if (!next) return state;
    let changed = false;
    for (const key of Object.keys(next)) {
      if (state[key] !== next[key]) {
        changed = true;
        break;
      }
    }
    if (!changed && !meta.force) return state;
    state = { ...state, ...next };
    if (meta.silent) return state;
    if (meta.throttle) {
      if (queued) cancelAnimationFrame(queued);
      queued = requestAnimationFrame(() => {
        queued = null;
        notify(meta);
      });
      return state;
    }
    notify(meta);
    return state;
  }

  function select(path, fallback) {
    return state[path] === undefined ? fallback : state[path];
  }

  return { get, set, select, subscribe };
}
