const RAW = 'r';
const DEFLATE = 'z';

function toBase64Url(bytes) {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
  const normalized = text.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function transform(bytes, stream) {
  const response = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await response.arrayBuffer());
}

export async function encodeDocument(doc) {
  const bytes = new TextEncoder().encode(JSON.stringify(doc));
  if (bytes.length > 512 && typeof CompressionStream === 'function') {
    try {
      const packed = await transform(bytes, new CompressionStream('deflate-raw'));
      if (packed.length < bytes.length) return DEFLATE + toBase64Url(packed);
    } catch (error) {
      console.warn('[codec] compression unavailable', error);
    }
  }
  return RAW + toBase64Url(bytes);
}

export async function decodeDocument(payload) {
  if (!payload || payload.length < 2) return null;
  const flag = payload[0];
  const body = fromBase64Url(payload.slice(1));
  let bytes = body;
  if (flag === DEFLATE) {
    if (typeof DecompressionStream !== 'function') throw new Error('DecompressionStream не поддерживается браузером');
    bytes = await transform(body, new DecompressionStream('deflate-raw'));
  } else if (flag !== RAW) {
    throw new Error('Неизвестный формат страты');
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}
