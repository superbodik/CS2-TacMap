import { MAP_SIZE, angleOf, controlPoint, dist, quadPoint, round } from '../core/geometry.js';
import { NADE_TYPES } from '../data/catalog.js';
import { getMap, unitsPerPoint } from '../data/maps.js';

export function createOverlay({ stage, store, bus }) {
  const canvas = stage.drawLayer;
  const ctx = canvas.getContext('2d');
  let frame = null;

  function resize() {
    const ratio = Math.min(3, (window.devicePixelRatio || 1) * Math.max(1, stage.view.zoom));
    const pixels = Math.round(stage.view.size * ratio);
    if (canvas.width !== pixels || canvas.height !== pixels) {
      canvas.width = pixels;
      canvas.height = pixels;
    }
    draw();
  }

  function request() {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = null;
      draw();
    });
  }

  function scaleFactor() {
    return canvas.width / MAP_SIZE;
  }

  function draw() {
    const state = store.get();
    const k = scaleFactor();
    ctx.setTransform(k, 0, 0, k, 0, 0);
    ctx.clearRect(0, 0, MAP_SIZE, MAP_SIZE);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (const stroke of state.strokes) {
      if (stroke.floor !== state.floor) continue;
      drawStroke(stroke, 1);
    }
    for (const nade of state.nades) {
      if (nade.floor !== state.floor) continue;
      drawNade(nade, 1);
    }
    for (const ruler of state.rulers) {
      if (ruler.floor !== state.floor) continue;
      drawRuler(ruler, state, 1);
    }

    const preview = stage.getPreview();
    if (preview) drawPreview(preview, state);
  }

  function drawPreview(preview, state) {
    if (preview.kind === 'stroke') drawStroke(preview.data, .85);
    else if (preview.kind === 'nade') drawNade(preview.data, .75);
    else if (preview.kind === 'ruler') drawRuler(preview.data, state, .8);
    else if (preview.kind === 'eraser') drawEraser(preview.data);
  }

  function drawStroke(stroke, alpha) {
    const pts = stroke.points;
    if (!pts || pts.length < 2) return;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = stroke.color;
    ctx.lineWidth = stroke.width;
    ctx.beginPath();
    ctx.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]);
    ctx.stroke();
    if (stroke.type === 'arrow' && pts.length >= 4) {
      const n = pts.length;
      drawArrowHead(pts[n - 4], pts[n - 3], pts[n - 2], pts[n - 1], stroke.width, stroke.color);
    }
    ctx.restore();
  }

  function drawArrowHead(ax, ay, bx, by, width, color) {
    const angle = angleOf(ax, ay, bx, by);
    const size = Math.max(10, width * 3);
    ctx.save();
    ctx.fillStyle = color;
    ctx.translate(bx, by);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, size * .5);
    ctx.lineTo(-size * .75, 0);
    ctx.lineTo(-size, -size * .5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawNade(nade, alpha) {
    const type = NADE_TYPES[nade.type] || NADE_TYPES.smoke;
    const from = { x: nade.from[0], y: nade.from[1] };
    const to = { x: nade.to[0], y: nade.to[1] };
    const control = controlPoint(from, to, nade.bend || 0);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = type.color;
    ctx.lineWidth = 2.6;
    ctx.setLineDash(type.dash);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.quadraticCurveTo(control.x, control.y, to.x, to.y);
    ctx.stroke();
    ctx.setLineDash([]);

    const tip = quadPoint(from, control, to, .94);
    drawArrowHead(tip.x, tip.y, to.x, to.y, 3.2, type.color);

    ctx.beginPath();
    ctx.arc(from.x, from.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = '#101216';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.globalAlpha = alpha * .22;
    ctx.beginPath();
    ctx.arc(to.x, to.y, type.radius, 0, Math.PI * 2);
    ctx.fillStyle = type.color;
    ctx.fill();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(to.x, to.y, type.radius, 0, Math.PI * 2);
    ctx.setLineDash([5, 5]);
    ctx.lineWidth = 1.6;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();

    if (nade.label) chip(nade.label, to.x, to.y - type.radius - 12, type.color, alpha);
  }

  function drawRuler(ruler, state, alpha) {
    const map = getMap(state.mapId);
    const [ax, ay] = ruler.a;
    const [bx, by] = ruler.b;
    const units = dist(ax, ay, bx, by) * unitsPerPoint(map);
    const seconds = units / (ruler.speed || 250);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = '#5b8def';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([8, 6]);
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.setLineDash([]);

    for (const [px, py] of [[ax, ay], [bx, by]]) {
      ctx.beginPath();
      ctx.arc(px, py, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = '#5b8def';
      ctx.fill();
    }
    ctx.restore();

    chip(`${Math.round(units)}u · ${round(seconds, 1)}s`, (ax + bx) / 2, (ay + by) / 2 - 10, '#5b8def', alpha);
  }

  function drawEraser(data) {
    ctx.save();
    ctx.strokeStyle = '#e0575f';
    ctx.lineWidth = 1.6;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(data.x, data.y, data.r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  function chip(text, x, y, color, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = '500 15px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const width = ctx.measureText(text).width + 16;
    const height = 22;
    ctx.fillStyle = 'rgba(16, 18, 22, .92)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.2;
    roundRect(x - width / 2, y - height / 2, width, height, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillText(text, x, y + 1);
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  bus.on('stage:resize', resize);
  bus.on('view:change', resize);
  bus.on('render:overlay', request);
  store.subscribe(request);
  resize();

  return { draw, request, resize, canvas };
}
