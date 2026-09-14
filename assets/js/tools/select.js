export const selectTool = {
  id: 'select',
  tip: 'Перетаскивайте иконки. Delete — удалить выбранную.',
  onDown(ctx) {
    if (ctx.store.get().selectedId) ctx.store.set({ selectedId: null });
  }
};
