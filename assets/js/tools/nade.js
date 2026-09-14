import { round, uid } from '../core/geometry.js';

export const nadeTool = {
  id: 'nade',
  tip: 'Клик 1 — точка броска, клик 2 — точка прилёта. Esc — отмена.',
  onDown(ctx, point) {
    const state = ctx.store.get();
    if (!ctx.pending) {
      ctx.pending = { from: [round(point.x), round(point.y)] };
      return;
    }
    const nade = {
      id: uid('n'),
      floor: state.floor,
      type: state.nadeType,
      from: ctx.pending.from,
      to: [round(point.x), round(point.y)],
      bend: state.nadeBend,
      label: state.nadeLabel || ''
    };
    ctx.pending = null;
    ctx.stage.setPreview(null);
    ctx.store.set({ nades: [...state.nades, nade] });
    ctx.bus.emit('history:commit', { reason: 'nade' });
  },
  onMove(ctx, point) {
    if (!ctx.pending) return;
    const state = ctx.store.get();
    ctx.stage.setPreview({
      kind: 'nade',
      data: {
        floor: state.floor,
        type: state.nadeType,
        from: ctx.pending.from,
        to: [round(point.x), round(point.y)],
        bend: state.nadeBend,
        label: state.nadeLabel || ''
      }
    });
  },
  onCancel(ctx) {
    ctx.pending = null;
    ctx.stage.setPreview(null);
  },
  onLeave(ctx) {
    this.onCancel(ctx);
  }
};
