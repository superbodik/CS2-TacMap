import { arrowTool, penTool } from './pen.js';
import { eraserTool } from './eraser.js';
import { nadeTool } from './nade.js';
import { rulerTool } from './ruler.js';
import { selectTool } from './select.js';

export const TOOLS = {
  select: selectTool,
  pen: penTool,
  arrow: arrowTool,
  eraser: eraserTool,
  nade: nadeTool,
  ruler: rulerTool
};

export function createToolRouter({ store, bus, stage }) {
  const contexts = new Map();
  let activeId = null;

  function contextFor(id) {
    if (!contexts.has(id)) contexts.set(id, { store, bus, stage, current: null, pending: null, dirty: false });
    return contexts.get(id);
  }

  function activate(id) {
    if (id === activeId) return;
    const previous = TOOLS[activeId];
    if (previous && previous.onLeave) previous.onLeave(contextFor(activeId));
    activeId = id;
    const tool = TOOLS[id];
    stage.showTip(tool ? tool.tip : '');
    const hud = document.querySelector('#hudTool');
    if (hud && tool) hud.textContent = tool.id;
  }

  bus.on('pointer:down', ({ point, event }) => {
    if (store.get().armedToken) {
      bus.emit('stage:drop', { type: store.get().armedToken, x: point.x, y: point.y });
      return;
    }
    const tool = TOOLS[activeId];
    if (tool && tool.onDown) tool.onDown(contextFor(activeId), point, event);
  });

  bus.on('pointer:move', ({ point, event, active }) => {
    const tool = TOOLS[activeId];
    if (tool && tool.onMove) tool.onMove(contextFor(activeId), point, event, active);
  });

  bus.on('pointer:up', ({ point, event }) => {
    const tool = TOOLS[activeId];
    if (tool && tool.onUp) tool.onUp(contextFor(activeId), point, event);
  });

  bus.on('tool:cancel', () => {
    const tool = TOOLS[activeId];
    if (tool && tool.onCancel) tool.onCancel(contextFor(activeId));
  });

  store.subscribe(state => activate(state.tool));
  activate(store.get().tool);

  return { activate, get active() { return activeId; } };
}
