export const PARSER_STATUS = 'not_implemented';

export const SUPPORTED_SOURCES = ['faceit', 'valve_matchmaking', 'esportal', 'local_file'];

export function detectSource(url) {
  if (/faceit\.com/i.test(url)) return 'faceit';
  if (/^steam:\/\/|steamcommunity\.com|valve/i.test(url)) return 'valve_matchmaking';
  if (/esportal\.com/i.test(url)) return 'esportal';
  return 'unknown';
}

export function validateDemoLink(url) {
  try {
    if (/^steam:\/\//i.test(url)) return true;
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

export async function parseDemo(job) {
  const error = new Error('Парсер демок ещё не реализован: требуется demoinfocs-golang или awpy воркер');
  error.status = 501;
  error.code = PARSER_STATUS;
  error.job = job.id;
  throw error;
}

export function plannedPipeline() {
  return [
    { step: 'download', status: PARSER_STATUS },
    { step: 'parse_header', status: PARSER_STATUS },
    { step: 'extract_rounds', status: PARSER_STATUS },
    { step: 'map_positions_to_tacmap', status: PARSER_STATUS },
    { step: 'build_timeline_keyframes', status: PARSER_STATUS }
  ];
}
