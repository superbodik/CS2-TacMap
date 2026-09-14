import { dist, round, uid } from '../core/geometry.js';
import { getMap, unitsPerPoint } from '../data/maps.js';

function measure(state, a, b) {
  const units = dist(a[0], a[1], b[0], b[1]) * unitsPerPoint(getMap(state.mapId));
  return { units: Math.round(units), seconds: round(units / state.speed, 1) };
}

export const rulerTool = {
  id: 'ruler',
  tip: 'Клик 1 — старт, клик 2 — финиш. Получите дистанцию и тайминг.',
  onDown(ctx, point) {
    const state = ctx.store.get();
    if (!ctx.pending) {
      ctx.pending = { a: [round(point.x), round(point.y)] };
      return;
    }
    const ruler = {
      id: uid('m'),
      floor: state.floor,
      a: ctx.pending.a,
      b: [round(point.x), round(point.y)],
      speed: state.speed
    };
    ctx.pending = null;
    ctx.stage.setPreview(null);
    ctx.store.set({ rulers: [...state.rulers, ruler] });
    ctx.bus.emit('ruler:measure', measure(state, ruler.a, ruler.b));
    ctx.bus.emit('history:commit', { reason: 'ruler' });
  },
  onMove(ctx, point) {
    if (!ctx.pending) return;
    const state = ctx.store.get();
    const b = [round(point.x), round(point.y)];
    ctx.stage.setPreview({ kind: 'ruler', data: { floor: state.floor, a: ctx.pending.a, b, speed: state.speed } });
    ctx.bus.emit('ruler:measure', measure(state, ctx.pending.a, b));
  },
  onCancel(ctx) {
    ctx.pending = null;
    ctx.stage.setPreview(null);
  },
  onLeave(ctx) {
    this.onCancel(ctx);
  }
};
