import { el, qs } from '../core/dom.js';
import { ROUND_DURATION } from '../data/catalog.js';
import { clamp, formatTime, round, uid } from '../core/geometry.js';
import { defaultFloor, getMap } from '../data/maps.js';
import { entityPosition } from '../render/tokens.js';

export function createTimeline({ store, bus }) {
  const slider = qs('#timeline');
  const playBtn = qs('#btnPlay');
  const stopBtn = qs('#btnStop');
  const playIcon = qs('#playIcon');
  const timeNow = qs('#timeNow');
  const timeTotal = qs('#timeTotal');
  const marks = qs('#timelineMarks');
  const recordBox = qs('#recordKeys');
  const keyAdd = qs('#btnKeyAdd');
  const keyClear = qs('#btnKeyClear');

  let raf = null;
  let lastTick = 0;

  function renderMarks() {
    const duration = store.get().duration;
    marks.textContent = '';
    for (let t = 0; t <= duration; t += 15) {
      marks.append(el('i', {
        style: { left: `${(t / duration) * 100}%` },
        dataset: { label: formatTime(t) }
      }));
    }
  }

  function setTime(value, silent) {
    const duration = store.get().duration;
    const time = clamp(Number(value) || 0, 0, duration);
    store.set({ time }, { throttle: true });
    if (!silent && slider) slider.value = String(time);
    if (timeNow) timeNow.textContent = formatTime(time);
  }

  function tick(now) {
    const state = store.get();
    if (!state.playing) return;
    const delta = (now - lastTick) / 1000;
    lastTick = now;
    const next = state.time + delta;
    if (next >= state.duration) {
      setTime(state.duration);
      pause();
      return;
    }
    setTime(next);
    raf = requestAnimationFrame(tick);
  }

  function play() {
    if (store.get().playing) return;
    if (store.get().time >= store.get().duration) setTime(0);
    store.set({ playing: true });
    lastTick = performance.now();
    raf = requestAnimationFrame(tick);
    if (playIcon) playIcon.innerHTML = '<path d="M8 5v14"></path><path d="M16 5v14"></path>';
  }

  function pause() {
    if (raf) cancelAnimationFrame(raf);
    raf = null;
    store.set({ playing: false });
    if (playIcon) playIcon.innerHTML = '<path d="M7 4l12 8-12 8z"></path>';
  }

  function toggle() {
    if (store.get().playing) pause();
    else play();
  }

  function stop() {
    pause();
    setTime(0);
  }

  function addKeyframe() {
    const state = store.get();
    const entity = state.entities.find(item => item.id === state.selectedId);
    if (!entity) return;
    const pos = entityPosition(entity, state.time);
    const keys = (entity.keys || []).filter(key => Math.abs(key[0] - state.time) > 0.35);
    keys.push([round(state.time, 2), round(pos.x), round(pos.y)]);
    keys.sort((a, b) => a[0] - b[0]);
    store.set({ entities: state.entities.map(item => (item.id === entity.id ? { ...item, keys } : item)) });
    bus.emit('history:commit', { reason: 'keyframe' });
  }

  function clearKeys() {
    const state = store.get();
    const entities = state.entities.map(entity => {
      if (state.selectedId && entity.id !== state.selectedId) return entity;
      if (!entity.keys || !entity.keys.length) return entity;
      const pos = entityPosition(entity, 0);
      return { ...entity, x: pos.x, y: pos.y, keys: [] };
    });
    store.set({ entities });
    bus.emit('history:commit', { reason: 'keyframe:clear' });
  }

  if (slider) slider.addEventListener('input', event => {
    pause();
    setTime(event.target.value, true);
  });
  if (playBtn) playBtn.addEventListener('click', toggle);
  if (stopBtn) stopBtn.addEventListener('click', stop);
  if (recordBox) recordBox.addEventListener('change', event => store.set({ recording: event.target.checked }));
  if (keyAdd) keyAdd.addEventListener('click', addKeyframe);
  if (keyClear) keyClear.addEventListener('click', clearKeys);

  store.subscribe(state => {
    if (slider) {
      if (slider.max !== String(state.duration)) {
        slider.max = String(state.duration);
        renderMarks();
        if (timeTotal) timeTotal.textContent = formatTime(state.duration);
      }
      if (document.activeElement !== slider) slider.value = String(state.time);
    }
    if (timeNow) timeNow.textContent = formatTime(state.time);
  });

  renderMarks();
  if (timeTotal) timeTotal.textContent = formatTime(store.get().duration);

  return { play, pause, toggle, stop, setTime, addKeyframe };
}

export function seedRoundDemo(store) {
  const state = store.get();
  const map = getMap(state.mapId);
  const floor = defaultFloor(map);
  const tSpawn = map.spawns.t;
  const ctSpawn = map.spawns.ct;
  const siteA = map.sites.a;
  const mid = [(tSpawn[0] + siteA[0]) / 2, (tSpawn[1] + siteA[1]) / 2];
  const hold = [siteA[0] + 40, siteA[1] + 55];

  const attacker = {
    id: uid('e'),
    type: 't',
    floor,
    label: 'T1',
    color: '',
    x: tSpawn[0],
    y: tSpawn[1],
    keys: [
      [0, tSpawn[0], tSpawn[1]],
      [18, round(mid[0] + 30), round(mid[1])],
      [38, round((mid[0] + siteA[0]) / 2), round((mid[1] + siteA[1]) / 2)],
      [62, round(siteA[0] - 30), round(siteA[1] + 20)],
      [ROUND_DURATION, round(siteA[0]), round(siteA[1])]
    ]
  };

  const defender = {
    id: uid('e'),
    type: 'ct',
    floor,
    label: 'CT1',
    color: '',
    x: ctSpawn[0],
    y: ctSpawn[1],
    keys: [
      [0, ctSpawn[0], ctSpawn[1]],
      [12, round((ctSpawn[0] + hold[0]) / 2), round((ctSpawn[1] + hold[1]) / 2)],
      [30, round(hold[0]), round(hold[1])],
      [70, round(hold[0] - 50), round(hold[1] - 30)],
      [ROUND_DURATION, round(hold[0] + 20), round(hold[1] + 10)]
    ]
  };

  store.set({ entities: [...state.entities, attacker, defender] });
}
