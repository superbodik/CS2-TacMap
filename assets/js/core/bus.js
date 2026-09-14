export function createBus() {
  const channels = new Map();

  function on(event, handler) {
    if (!channels.has(event)) channels.set(event, new Set());
    channels.get(event).add(handler);
    return () => off(event, handler);
  }

  function off(event, handler) {
    const set = channels.get(event);
    if (set) set.delete(handler);
  }

  function once(event, handler) {
    const dispose = on(event, payload => {
      dispose();
      handler(payload);
    });
    return dispose;
  }

  function emit(event, payload) {
    const set = channels.get(event);
    if (!set) return;
    for (const handler of [...set]) {
      try {
        handler(payload);
      } catch (error) {
        console.error('[bus]', event, error);
      }
    }
  }

  return { on, off, once, emit };
}
