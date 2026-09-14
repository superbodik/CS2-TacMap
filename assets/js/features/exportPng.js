import { toast } from '../core/dom.js';
import { MAP_SIZE } from '../core/geometry.js';
import { TOKEN_TYPES } from '../data/catalog.js';
import { entityPosition } from '../render/tokens.js';
import { getMap } from '../data/maps.js';

const SIZE = 1400;

export function createExport({ store, stage }) {
  async function toPng() {
    const state = store.get();
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');
    const k = SIZE / MAP_SIZE;

    ctx.fillStyle = '#101216';
    ctx.fillRect(0, 0, SIZE, SIZE);

    try {
      const image = await svgImage(stage.mapLayer);
      ctx.drawImage(image, 0, 0, SIZE, SIZE);
    } catch (error) {
      console.warn('[export] map layer', error);
    }

    ctx.drawImage(stage.drawLayer, 0, 0, SIZE, SIZE);

    for (const entity of state.entities) {
      if (entity.floor !== state.floor) continue;
      const meta = TOKEN_TYPES[entity.type] || TOKEN_TYPES.mark;
      const pos = entityPosition(entity, state.time);
      const x = pos.x * k;
      const y = pos.y * k;
      const r = 21;
      ctx.save();
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(20, 22, 26, .92)';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = entity.color || meta.color;
      ctx.stroke();
      ctx.fillStyle = entity.color || meta.color;
      ctx.font = '600 15px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(meta.glyph, x, y + 1);
      if (entity.label) {
        ctx.font = '500 12px Inter, sans-serif';
        ctx.fillStyle = '#dce3ee';
        ctx.fillText(entity.label, x, y + r + 11);
      }
      ctx.restore();
    }

    ctx.fillStyle = 'rgba(160, 166, 176, .9)';
    ctx.font = '500 18px Inter, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('CS2 TacMap · mineDres-Team', 22, SIZE - 22);

    const map = getMap(state.mapId);
    const name = `${map.id}_${state.floor}_${(state.name || 'strat').replace(/[^\w-]+/g, '_')}.png`;
    canvas.toBlob(blob => {
      if (!blob) {
        toast('Экспорт не удался', 'err');
        return;
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 3000);
      toast('PNG сохранён', 'ok');
    }, 'image/png');
  }

  function svgImage(svg) {
    return new Promise((resolve, reject) => {
      const clone = svg.cloneNode(true);
      clone.setAttribute('width', SIZE);
      clone.setAttribute('height', SIZE);
      const markup = new XMLSerializer().serializeToString(clone);
      const blob = new Blob([markup], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const image = new Image();
      image.onload = () => {
        URL.revokeObjectURL(url);
        resolve(image);
      };
      image.onerror = error => {
        URL.revokeObjectURL(url);
        reject(error);
      };
      image.src = url;
    });
  }

  return { toPng };
}
