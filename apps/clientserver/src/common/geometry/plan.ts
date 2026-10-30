import type { FloorPlan, Opening, Room, Vec2, Wall } from '@/common/types';

export const dist = (a: Vec2, b: Vec2) => Math.hypot(b.x - a.x, b.y - a.y);

export const wallLength = (w: Wall) => dist(w.a, w.b);

export function wallDir(w: Wall): Vec2 {
  const len = wallLength(w) || 1;
  return { x: (w.b.x - w.a.x) / len, y: (w.b.y - w.a.y) / len };
}

export function pointOnWall(w: Wall, offset: number): Vec2 {
  const d = wallDir(w);
  return { x: w.a.x + d.x * offset, y: w.a.y + d.y * offset };
}

/** Projects p onto the wall segment; returns offset along the wall and distance from it. */
export function projectOnWall(w: Wall, p: Vec2) {
  const len = wallLength(w);
  const d = wallDir(w);
  const t = Math.min(len, Math.max(0, (p.x - w.a.x) * d.x + (p.y - w.a.y) * d.y));
  const q = { x: w.a.x + d.x * t, y: w.a.y + d.y * t };
  return { offset: t, distance: dist(p, q), point: q };
}

export function polygonArea(points: Vec2[]) {
  let s = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    s += a.x * b.y - b.x * a.y;
  }
  return Math.abs(s) / 2;
}

export function polygonCentroid(points: Vec2[]): Vec2 {
  const n = points.length;
  return {
    x: points.reduce((s, p) => s + p.x, 0) / n,
    y: points.reduce((s, p) => s + p.y, 0) / n,
  };
}

export function polygonBounds(points: Vec2[]) {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  return { minX: Math.min(...xs), minY: Math.min(...ys), maxX: Math.max(...xs), maxY: Math.max(...ys) };
}

export function pointInPolygon(p: Vec2, poly: Vec2[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i];
    const b = poly[j];
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) {
      inside = !inside;
    }
  }
  return inside;
}

export function roomAt(plan: FloorPlan, p: Vec2): Room | undefined {
  return plan.rooms.find((r) => pointInPolygon(p, r.points));
}

export function planBounds(plan: FloorPlan) {
  const pts = [
    ...plan.walls.flatMap((w) => [w.a, w.b]),
    ...plan.rooms.flatMap((r) => r.points),
  ];
  if (!pts.length) return { minX: 0, minY: 0, maxX: 10, maxY: 8 };
  return polygonBounds(pts);
}

export function largestRoom(plan: FloorPlan): Room | undefined {
  return [...plan.rooms].sort((a, b) => polygonArea(b.points) - polygonArea(a.points))[0];
}

export const snap = (v: number, step = 0.1) => Math.round(v / step) * step;

/** Openings clamped so they never extend past the wall ends. */
export function clampOpening(o: Opening, w: Wall): Opening {
  const len = wallLength(w);
  const width = Math.min(o.width, Math.max(0.3, len - 0.1));
  const offset = Math.min(len - width / 2, Math.max(width / 2, o.offset));
  return { ...o, width, offset };
}

/** Start point for walkthrough/VR: inside the largest room, so it never begins outside. */
export function spawnPoint2d(plan: FloorPlan): Vec2 {
  const room = largestRoom(plan);
  if (room) return polygonCentroid(room.points);
  const b = planBounds(plan);
  return { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
}
