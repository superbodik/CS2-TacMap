import { round, simplify, uid } from '../core/geometry.js';

export const penTool = {
  id: 'pen',
  tip: 'Зажмите ЛКМ и ведите маршрут. Ctrl+Z — отменить.',
  onDown(ctx, point) {
    const state = ctx.store.get();
    ctx.current = {
      id: uid('s'),
      type: 'free',
      floor: state.floor,
      color: state.color,
      width: state.brush,
      points: [round(point.x), round(point.y)]
    };
    ctx.stage.setPreview({ kind: 'stroke', data: ctx.current });
  },
  onMove(ctx, point) {
    if (!ctx.current) return;
    const pts = ctx.current.points;
    const lastX = pts[pts.length - 2];
    const lastY = pts[pts.length - 1];
    if (Math.hypot(point.x - lastX, point.y - lastY) < 1.2) return;
    pts.push(round(point.x), round(point.y));
    ctx.stage.setPreview({ kind: 'stroke', data: ctx.current });
  },
  onUp(ctx) {
    if (!ctx.current) return;
    const stroke = { ...ctx.current, points: simplify(ctx.current.points) };
    ctx.current = null;
    ctx.stage.setPreview(null);
    if (stroke.points.length < 4) return;
    ctx.store.set({ strokes: [...ctx.store.get().strokes, stroke] });
    ctx.bus.emit('history:commit', { reason: 'draw' });
  }
};

export const arrowTool = {
  id: 'arrow',
  tip: 'Зажмите ЛКМ — прямая стрелка направления.',
  onDown(ctx, point) {
    const state = ctx.store.get();
    ctx.current = {
      id: uid('s'),
      type: 'arrow',
      floor: state.floor,
      color: state.color,
      width: state.brush,
      points: [round(point.x), round(point.y), round(point.x), round(point.y)]
    };
    ctx.stage.setPreview({ kind: 'stroke', data: ctx.current });
  },
  onMove(ctx, point) {
    if (!ctx.current) return;
    ctx.current.points[2] = round(point.x);
    ctx.current.points[3] = round(point.y);
    ctx.stage.setPreview({ kind: 'stroke', data: ctx.current });
  },
  onUp(ctx) {
    if (!ctx.current) return;
    const stroke = ctx.current;
    ctx.current = null;
    ctx.stage.setPreview(null);
    const [ax, ay, bx, by] = stroke.points;
    if (Math.hypot(bx - ax, by - ay) < 8) return;
    ctx.store.set({ strokes: [...ctx.store.get().strokes, stroke] });
    ctx.bus.emit('history:commit', { reason: 'arrow' });
  }
};
