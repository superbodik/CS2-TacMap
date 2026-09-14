import { MAPS, defaultFloor, getMap } from '../data/maps.js';
import { NADE_TYPES, ROUND_DURATION, TOKEN_TYPES } from '../data/catalog.js';
import { clamp, round, uid } from '../core/geometry.js';

export const DOC_VERSION = 1;

export function toDoc(state) {
  return {
    v: DOC_VERSION,
    name: state.name || '',
    m: state.mapId,
    f: state.floor,
    d: state.duration,
    e: state.entities.map(entity => ({
      i: entity.id,
      t: entity.type,
      x: round(entity.x),
      y: round(entity.y),
      f: entity.floor,
      l: entity.label || undefined,
      c: entity.color || undefined,
      k: entity.keys && entity.keys.length ? entity.keys : undefined
    })),
    s: state.strokes.map(stroke => ({
      i: stroke.id,
      f: stroke.floor,
      c: stroke.color,
      w: stroke.width,
      y: stroke.type === 'arrow' ? 1 : 0,
      p: stroke.points
    })),
    n: state.nades.map(nade => ({
      i: nade.id,
      f: nade.floor,
      t: nade.type,
      a: nade.from,
      b: nade.to,
      d: nade.bend,
      l: nade.label || undefined
    })),
    r: state.rulers.map(ruler => ({
      i: ruler.id,
      f: ruler.floor,
      a: ruler.a,
      b: ruler.b,
      s: ruler.speed
    }))
  };
}

export function fromDoc(doc) {
  if (!doc || typeof doc !== 'object') throw new Error('Пустой документ');
  const mapId = MAPS[doc.m] ? doc.m : Object.keys(MAPS)[0];
  const map = getMap(mapId);
  const floors = map.floors.map(floor => floor.id);
  const floor = floors.includes(doc.f) ? doc.f : defaultFloor(map);
  const pick = value => (floors.includes(value) ? value : floor);
  const point = value => (Array.isArray(value) && value.length === 2 ? [num(value[0]), num(value[1])] : [500, 500]);

  return {
    mapId,
    floor,
    name: typeof doc.name === 'string' ? doc.name.slice(0, 64) : '',
    duration: clamp(Number(doc.d) || ROUND_DURATION, 10, 600),
    entities: asArray(doc.e).map(item => ({
      id: item.i || uid('e'),
      type: TOKEN_TYPES[item.t] ? item.t : 'mark',
      x: num(item.x),
      y: num(item.y),
      floor: pick(item.f),
      label: typeof item.l === 'string' ? item.l.slice(0, 24) : '',
      color: typeof item.c === 'string' ? item.c : '',
      keys: asArray(item.k).filter(key => Array.isArray(key) && key.length === 3).map(key => [Number(key[0]) || 0, num(key[1]), num(key[2])])
    })),
    strokes: asArray(doc.s).map(item => ({
      id: item.i || uid('s'),
      floor: pick(item.f),
      color: typeof item.c === 'string' ? item.c : '#00e5ff',
      width: clamp(Number(item.w) || 5, 1, 40),
      type: item.y ? 'arrow' : 'free',
      points: asArray(item.p).map(value => num(value))
    })).filter(stroke => stroke.points.length >= 4),
    nades: asArray(doc.n).map(item => ({
      id: item.i || uid('n'),
      floor: pick(item.f),
      type: NADE_TYPES[item.t] ? item.t : 'smoke',
      from: point(item.a),
      to: point(item.b),
      bend: clamp(Number(item.d) || 0, -100, 100),
      label: typeof item.l === 'string' ? item.l.slice(0, 48) : ''
    })),
    rulers: asArray(doc.r).map(item => ({
      id: item.i || uid('m'),
      floor: pick(item.f),
      a: point(item.a),
      b: point(item.b),
      speed: clamp(Number(item.s) || 250, 20, 600)
    }))
  };
}

export function emptyDoc(mapId) {
  const map = getMap(mapId);
  return {
    mapId: map.id,
    floor: defaultFloor(map),
    name: '',
    duration: ROUND_DURATION,
    entities: [],
    strokes: [],
    nades: [],
    rulers: []
  };
}

export function docStats(doc) {
  return {
    entities: asArray(doc.e).length,
    strokes: asArray(doc.s).length,
    nades: asArray(doc.n).length,
    rulers: asArray(doc.r).length
  };
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function num(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? clamp(round(parsed), 0, 1000) : 0;
}
