import { svgEl, clear } from '../core/dom.js';
import { getMap, siteFloor } from '../data/maps.js';
import { RADAR_BASE } from '../config.js';

const radarCache = new Map();

export function radarCandidates(map, floor) {
  const suffix = map.floors.length > 1 && floor !== map.floors[0].id ? `_${floor}` : '';
  return [
    `${RADAR_BASE}${map.id}${suffix}.png`,
    `${RADAR_BASE}${map.id}${suffix}_radar.png`,
    `${RADAR_BASE}${map.id}${suffix}_radar_psd.png`,
    `${RADAR_BASE}${map.id}${suffix}.jpg`
  ];
}

function probeRadar(url) {
  if (radarCache.has(url)) return radarCache.get(url);
  const promise = new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
    image.src = url;
  });
  radarCache.set(url, promise);
  return promise;
}

export async function resolveRadar(map, floor) {
  for (const url of radarCandidates(map, floor)) {
    if (await probeRadar(url)) return url;
  }
  return '';
}

export function createMapView({ stage, store }) {
  const svg = stage.mapLayer;

  function grid() {
    return svgEl('defs', {}, [
      svgEl('pattern', { id: 'tac-grid', width: 50, height: 50, patternUnits: 'userSpaceOnUse' }, [
        svgEl('path', { d: 'M 50 0 L 0 0 0 50', fill: 'none', stroke: '#1a1d22', 'stroke-width': 1 })
      ])
    ]);
  }

  function marker(x, y, label, color) {
    return svgEl('g', {}, [
      svgEl('circle', { cx: x, cy: y, r: 20, fill: 'none', stroke: color, 'stroke-width': 1.6, 'stroke-dasharray': '5 5' }),
      svgEl('text', {
        x, y: y + 1, fill: color, 'font-family': 'Inter, sans-serif', 'font-size': 18,
        'font-weight': 600, 'text-anchor': 'middle', 'dominant-baseline': 'middle', text: label
      })
    ]);
  }

  function fallback(map, state) {
    const group = svgEl('g', {});
    group.append(svgEl('text', {
      x: 500, y: 455, fill: '#3a4049', 'font-family': 'Inter, sans-serif', 'font-size': 34,
      'font-weight': 600, 'text-anchor': 'middle', text: map.name.toUpperCase()
    }));
    group.append(svgEl('text', {
      x: 500, y: 495, fill: '#2f353d', 'font-family': 'Inter, sans-serif', 'font-size': 16,
      'text-anchor': 'middle', text: `радар не найден: assets/maps/${map.id}.png`
    }));

    for (const key of ['a', 'b']) {
      const site = map.sites[key];
      if (!site || siteFloor(map, key) !== state.floor) continue;
      group.append(marker(site[0], site[1], key.toUpperCase(), '#5b8def'));
    }
    group.append(marker(map.spawns.t[0], map.spawns.t[1], 'T', '#c09b6c'));
    group.append(marker(map.spawns.ct[0], map.spawns.ct[1], 'CT', '#89a9dc'));
    return group;
  }

  async function render(state) {
    const map = getMap(state.mapId);
    clear(svg);
    svg.append(grid());
    svg.append(svgEl('rect', { x: 0, y: 0, width: 1000, height: 1000, fill: '#101216' }));
    svg.append(svgEl('rect', { x: 0, y: 0, width: 1000, height: 1000, fill: 'url(#tac-grid)', opacity: .8 }));

    const url = state.radar ? await resolveRadar(map, state.floor) : '';
    const current = store.get();
    if (current.mapId !== state.mapId || current.floor !== state.floor || current.radar !== state.radar) return;

    if (!url) {
      svg.append(fallback(map, state));
      return;
    }

    const image = svgEl('image', {
      x: 0, y: 0, width: 1000, height: 1000,
      href: url,
      preserveAspectRatio: 'none',
      opacity: .97
    });
    image.setAttributeNS('http://www.w3.org/1999/xlink', 'href', url);
    svg.append(image);
  }

  return { render };
}
