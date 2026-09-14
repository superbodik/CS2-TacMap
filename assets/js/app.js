import { createBus } from './core/bus.js';
import { createStore } from './core/store.js';
import { createStage } from './render/stage.js';
import { createMapView } from './render/mapView.js';
import { createOverlay } from './render/overlay.js';
import { createTokenLayer } from './render/tokens.js';
import { createToolRouter } from './tools/index.js';
import { createHistory } from './features/history.js';
import { createApi, loadApiBase } from './features/api.js';
import { createAuth } from './features/auth.js';
import { createShare } from './features/share.js';
import { createLibrary } from './features/library.js';
import { createDemoAnalyzer } from './features/demo.js';
import { createExport } from './features/exportPng.js';
import { createTimeline, seedRoundDemo } from './features/timeline.js';
import { createPanels } from './ui/panels.js';
import { emptyDoc } from './features/document.js';
import { DRAW_COLORS } from './data/catalog.js';
import { DEFAULT_MAP } from './config.js';

function initialState() {
  return {
    ...emptyDoc(DEFAULT_MAP),
    tool: 'select',
    radar: true,
    color: DRAW_COLORS[0],
    brush: 5,
    nadeType: 'smoke',
    nadeBend: 26,
    nadeLabel: '',
    speed: 250,
    time: 0,
    playing: false,
    recording: false,
    selectedId: null,
    armedToken: null,
    apiBase: loadApiBase(),
    stratId: null,
    user: null
  };
}

async function boot() {
  const bus = createBus();
  const store = createStore(initialState());

  const stage = createStage({ store, bus });
  const mapView = createMapView({ stage, store });
  const overlay = createOverlay({ stage, store, bus });
  createTokenLayer({ stage, store, bus });
  createToolRouter({ store, bus, stage });
  createHistory({ store, bus });

  const api = createApi({ store });
  const share = createShare({ store, bus, api });
  const auth = createAuth({ store, bus, api });
  const library = createLibrary({ store, bus, api });
  const exporter = createExport({ store, stage });
  const timeline = createTimeline({ store, bus });
  createDemoAnalyzer({ api });
  createPanels({ store, bus, stage, share, exporter, api, timeline });

  let lastMap = null;
  let lastFloor = null;
  function renderMap() {
    const state = store.get();
    mapView.render(state);
    lastMap = state.mapId;
    lastFloor = state.floor;
    overlay.request();
  }
  store.subscribe(state => {
    if (state.mapId !== lastMap || state.floor !== lastFloor) renderMap();
  });
  bus.on('map:changed', renderMap);
  renderMap();

  const restored = await share.loadFromUrl();
  if (!restored) seedRoundDemo(store);
  bus.emit('history:reset');

  await auth.refresh();
  await library.loadCloud();
  library.render();

  window.addEventListener('beforeunload', event => {
    const state = store.get();
    const dirty = state.strokes.length || state.nades.length || state.entities.length > 2;
    if (!dirty) return;
    event.preventDefault();
    event.returnValue = '';
  });

  window.TacMap = { store, bus, stage, api, share, library, auth, timeline };
}

boot().catch(error => {
  console.error('[tacmap] boot failed', error);
  const host = document.querySelector('#toasts');
  if (host) host.innerHTML = `<div class="toast err">Ошибка запуска: ${error.message}</div>`;
});
