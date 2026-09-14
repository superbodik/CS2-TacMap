export const MAPS = [
  { id: 'de_mirage', name: 'Mirage', floors: ['main'] },
  { id: 'de_inferno', name: 'Inferno', floors: ['main'] },
  { id: 'de_dust2', name: 'Dust II', floors: ['main'] },
  { id: 'de_nuke', name: 'Nuke', floors: ['upper', 'lower'] },
  { id: 'de_vertigo', name: 'Vertigo', floors: ['upper', 'lower'] },
  { id: 'de_ancient', name: 'Ancient', floors: ['main'] },
  { id: 'de_anubis', name: 'Anubis', floors: ['main'] }
];

export const MAP_IDS = MAPS.map(map => map.id);
