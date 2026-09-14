export const TOKEN_TYPES = {
  t: { id: 't', name: 'T', glyph: 'T', color: '#e0a35c', shape: 'circle', group: 'player' },
  ct: { id: 'ct', name: 'CT', glyph: 'CT', color: '#5b8def', shape: 'circle', group: 'player' },
  awp_t: { id: 'awp_t', name: 'AWP T', glyph: 'A', color: '#c98a3f', shape: 'circle', group: 'player' },
  awp_ct: { id: 'awp_ct', name: 'AWP CT', glyph: 'A', color: '#3f6fc4', shape: 'circle', group: 'player' },
  smoke: { id: 'smoke', name: 'Smoke', glyph: 'S', color: '#aab2be', shape: 'circle', group: 'nade' },
  flash: { id: 'flash', name: 'Flash', glyph: 'F', color: '#d8c65c', shape: 'circle', group: 'nade' },
  he: { id: 'he', name: 'HE', glyph: 'HE', color: '#8cc46a', shape: 'circle', group: 'nade' },
  molly: { id: 'molly', name: 'Molly', glyph: 'M', color: '#e0755c', shape: 'circle', group: 'nade' },
  decoy: { id: 'decoy', name: 'Decoy', glyph: 'D', color: '#b98ce0', shape: 'circle', group: 'nade' },
  bomb: { id: 'bomb', name: 'Bomb', glyph: 'C4', color: '#e0575f', shape: 'square', group: 'objective' },
  defuse: { id: 'defuse', name: 'Defuse', glyph: 'DF', color: '#4cb782', shape: 'square', group: 'objective' },
  mark: { id: 'mark', name: 'Point', glyph: 'X', color: '#8a919b', shape: 'diamond', group: 'objective' }
};

export const TOKEN_LIST = Object.values(TOKEN_TYPES);

export const NADE_TYPES = {
  smoke: { id: 'smoke', name: 'Smoke', color: '#aab2be', radius: 30, dash: [] },
  flash: { id: 'flash', name: 'Flash', color: '#d8c65c', radius: 18, dash: [10, 6] },
  molly: { id: 'molly', name: 'Molly', color: '#e0755c', radius: 26, dash: [] },
  he: { id: 'he', name: 'HE', color: '#8cc46a', radius: 20, dash: [4, 5] },
  decoy: { id: 'decoy', name: 'Decoy', color: '#b98ce0', radius: 16, dash: [2, 7] }
};

export const NADE_LIST = Object.values(NADE_TYPES);

export const DRAW_COLORS = [
  '#5b8def', '#e0a35c', '#4cb782', '#e0575f',
  '#b98ce0', '#d8c65c', '#4fb3c4', '#e7e9ec'
];

export const SPEEDS = [
  { id: 'run', name: 'Бег (250 u/s)', value: 250 },
  { id: 'knife', name: 'Нож в руках (260 u/s)', value: 260 },
  { id: 'awp', name: 'С AWP (200 u/s)', value: 200 },
  { id: 'walk', name: 'Шаг / Shift (130 u/s)', value: 130 },
  { id: 'crouch', name: 'Присед (85 u/s)', value: 85 }
];

export const ROUND_DURATION = 115;
