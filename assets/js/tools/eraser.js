import { controlPoint, dist, hitCurve, hitStroke, pointSegmentDistance } from '../core/geometry.js';

const RADIUS = 18;

function erase(ctx, point) {
  const state = ctx.store.get();
  const strokes = state.strokes.filter(stroke => stroke.floor !== state.floor || !hitStroke(stroke, point.x, point.y, RADIUS + stroke.width / 2));
  const nades = state.nades.filter(nade => {
    if (nade.floor !== state.floor) return true;
    const from = { x: nade.from[0], y: nade.from[1] };
    const to = { x: nade.to[0], y: nade.to[1] };
    return !hitCurve(from, controlPoint(from, to, nade.bend || 0), to, point.x, point.y, RADIUS);
  });
  const rulers = state.rulers.filter(ruler => {
    if (ruler.floor !== state.floor) return true;
    return pointSegmentDistance(point.x, point.y, ruler.a[0], ruler.a[1], ruler.b[0], ruler.b[1]) > RADIUS;
  });
  const entities = state.entities.filter(entity => {
    if (entity.floor !== state.floor) return true;
    return dist(point.x, point.y, entity.x, entity.y) > RADIUS;
  });

  const changed = strokes.length !== state.strokes.length
    || nades.length !== state.nades.length
    || rulers.length !== state.rulers.length
    || entities.length !== state.entities.length;

  if (changed) ctx.store.set({ strokes, nades, rulers, entities });
  return changed;
}

export const eraserTool = {
  id: 'eraser',
  tip: 'Ведите по объектам, чтобы стереть их на текущем этаже.',
  onDown(ctx, point) {
    ctx.dirty = erase(ctx, point);
    ctx.stage.setPreview({ kind: 'eraser', data: { x: point.x, y: point.y, r: RADIUS } });
  },
  onMove(ctx, point, event, active) {
    ctx.stage.setPreview({ kind: 'eraser', data: { x: point.x, y: point.y, r: RADIUS } });
    if (!active) return;
    if (erase(ctx, point)) ctx.dirty = true;
  },
  onUp(ctx) {
    if (ctx.dirty) ctx.bus.emit('history:commit', { reason: 'erase' });
    ctx.dirty = false;
  },
  onLeave(ctx) {
    ctx.stage.setPreview(null);
  }
};
