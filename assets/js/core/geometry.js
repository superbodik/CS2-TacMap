export const MAP_SIZE = 1000;

export function uid(prefix = 'o') {
  return prefix + Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-3);
}

export function clamp(value, min, max) {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function dist(ax, ay, bx, by) {
  return Math.hypot(bx - ax, by - ay);
}

export function quadPoint(a, c, b, t) {
  const inv = 1 - t;
  return {
    x: inv * inv * a.x + 2 * inv * t * c.x + t * t * b.x,
    y: inv * inv * a.y + 2 * inv * t * c.y + t * t * b.y
  };
}

export function controlPoint(a, b, bendPercent) {
  const mx = (a.x + b.x) / 2;
  const my = (a.y + b.y) / 2;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.hypot(dx, dy) || 1;
  const offset = (bendPercent / 100) * length;
  return { x: mx + (-dy / length) * offset, y: my + (dx / length) * offset };
}

export function pointSegmentDistance(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return dist(px, py, ax, ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lengthSq;
  t = clamp(t, 0, 1);
  return dist(px, py, ax + t * dx, ay + t * dy);
}

export function hitStroke(stroke, x, y, tolerance) {
  const pts = stroke.points;
  if (pts.length < 4) return dist(x, y, pts[0] || 0, pts[1] || 0) <= tolerance;
  for (let i = 0; i < pts.length - 2; i += 2) {
    if (pointSegmentDistance(x, y, pts[i], pts[i + 1], pts[i + 2], pts[i + 3]) <= tolerance) return true;
  }
  return false;
}

export function hitCurve(from, control, to, x, y, tolerance) {
  let prev = from;
  for (let i = 1; i <= 24; i += 1) {
    const point = quadPoint(from, control, to, i / 24);
    if (pointSegmentDistance(x, y, prev.x, prev.y, point.x, point.y) <= tolerance) return true;
    prev = point;
  }
  return false;
}

export function simplify(points, tolerance = 1.4) {
  if (points.length <= 6) return points;
  const output = [points[0], points[1]];
  for (let i = 2; i < points.length - 2; i += 2) {
    const lastX = output[output.length - 2];
    const lastY = output[output.length - 1];
    if (dist(lastX, lastY, points[i], points[i + 1]) >= tolerance) {
      output.push(points[i], points[i + 1]);
    }
  }
  output.push(points[points.length - 2], points[points.length - 1]);
  return output;
}

export function formatTime(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function angleOf(ax, ay, bx, by) {
  return Math.atan2(by - ay, bx - ax);
}
