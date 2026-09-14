export const MAPS = {
  de_mirage: {
    id: 'de_mirage',
    name: 'Mirage',
    scale: 5120,
    floors: [{ id: 'main', name: 'Main' }],
    spawns: { t: [878, 358], ct: [296, 700] },
    sites: { a: [550, 761], b: [234, 288] },
    waypoint: [470, 470]
  },
  de_inferno: {
    id: 'de_inferno',
    name: 'Inferno',
    scale: 5018,
    floors: [{ id: 'main', name: 'Main' }],
    spawns: { t: [95, 659], ct: [898, 341] },
    sites: { a: [800, 689], b: [504, 220] },
    waypoint: [520, 700]
  },
  de_dust2: {
    id: 'de_dust2',
    name: 'Dust II',
    scale: 4506,
    floors: [{ id: 'main', name: 'Main' }],
    spawns: { t: [375, 902], ct: [599, 219] },
    sites: { a: [799, 163], b: [205, 121] },
    waypoint: [470, 560]
  },
  de_nuke: {
    id: 'de_nuke',
    name: 'Nuke',
    scale: 7168,
    floors: [{ id: 'upper', name: 'Upper' }, { id: 'lower', name: 'Lower' }],
    defaultFloor: 'upper',
    spawns: { t: [205, 545], ct: [820, 463] },
    sites: { a: [578, 500], b: [566, 545] },
    siteFloors: { a: 'upper', b: 'lower' },
    waypoint: [480, 570]
  },
  de_vertigo: {
    id: 'de_vertigo',
    name: 'Vertigo',
    scale: 4096,
    floors: [{ id: 'upper', name: 'Upper' }, { id: 'lower', name: 'Lower' }],
    defaultFloor: 'upper',
    spawns: { t: [420, 745], ct: [545, 240] },
    sites: { a: [700, 700], b: [250, 360] },
    siteFloors: { a: 'upper', b: 'upper' },
    waypoint: [430, 560]
  },
  de_ancient: {
    id: 'de_ancient',
    name: 'Ancient',
    scale: 5120,
    floors: [{ id: 'main', name: 'Main' }],
    spawns: { t: [484, 862], ct: [506, 170] },
    sites: { a: [745, 410], b: [299, 260] },
    waypoint: [500, 560]
  },
  de_overpass: {
    id: 'de_overpass',
    name: 'Overpass',
    scale: 5325,
    floors: [{ id: 'main', name: 'Main' }],
    spawns: { t: [645, 940], ct: [490, 185] },
    sites: { a: [505, 215], b: [715, 320] },
    waypoint: [600, 620]
  },
  de_train: {
    id: 'de_train',
    name: 'Train',
    scale: 4813,
    floors: [{ id: 'main', name: 'Main' }],
    spawns: { t: [145, 232], ct: [875, 775] },
    sites: { a: [630, 500], b: [530, 780] },
    waypoint: [380, 500]
  },
  de_cache: {
    id: 'de_cache',
    name: 'Cache',
    scale: 5632,
    floors: [{ id: 'main', name: 'Main' }],
    spawns: { t: [890, 578], ct: [92, 470] },
    sites: { a: [315, 265], b: [350, 800] },
    waypoint: [480, 560]
  }
};

export const MAP_LIST = Object.values(MAPS);

export function getMap(id) {
  return MAPS[id] || MAP_LIST[0];
}

export function defaultFloor(map) {
  return map.defaultFloor || map.floors[0].id;
}

export function unitsPerPoint(map) {
  return map.scale / 1000;
}

export function siteFloor(map, key) {
  return map.siteFloors ? map.siteFloors[key] : defaultFloor(map);
}
