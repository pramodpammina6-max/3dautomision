import type { FloorPlan, Opening, Room, Vec2, Wall } from '@/common/types';
import { clampOpening, dist, planBounds, projectOnWall, snap } from '@/common/geometry/plan';
import { uid } from '@/common/lib/utils';
import { defaultFloorMaterial } from '@metaverse/floorplan-schema';

export type Tool = 'select' | 'wall' | 'room' | 'door' | 'window';

export interface Viewport {
  /** pixels per metre */
  k: number;
  tx: number;
  ty: number;
}

export const toWorld = (v: Viewport, sx: number, sy: number): Vec2 => ({ x: (sx - v.tx) / v.k, y: (sy - v.ty) / v.k });

export function fitViewport(plan: FloorPlan, width: number, height: number, pad = 60): Viewport {
  const b = planBounds(plan);
  const w = Math.max(b.maxX - b.minX, 2);
  const h = Math.max(b.maxY - b.minY, 2);
  const k = Math.min((width - pad * 2) / w, (height - pad * 2) / h);
  return { k, tx: (width - w * k) / 2 - b.minX * k, ty: (height - h * k) / 2 - b.minY * k };
}

export function zoomAt(v: Viewport, sx: number, sy: number, factor: number): Viewport {
  const k = Math.min(400, Math.max(8, v.k * factor));
  const f = k / v.k;
  return { k, tx: sx - (sx - v.tx) * f, ty: sy - (sy - v.ty) * f };
}

/** Snap to existing wall endpoints first (within 0.2 m), then to the grid. */
export function snapPoint(plan: FloorPlan, p: Vec2, grid: number | null): Vec2 {
  let best: Vec2 | null = null;
  let bestD = 0.2;
  for (const w of plan.walls) {
    for (const e of [w.a, w.b]) {
      const d = dist(e, p);
      if (d < bestD) {
        best = e;
        bestD = d;
      }
    }
  }
  if (best) return { ...best };
  return grid ? { x: +snap(p.x, grid).toFixed(3), y: +snap(p.y, grid).toFixed(3) } : p;
}

export function nearestWall(plan: FloorPlan, p: Vec2, maxDistance = 0.4) {
  let best: { wall: Wall; offset: number; distance: number } | null = null;
  for (const wall of plan.walls) {
    const r = projectOnWall(wall, p);
    if (r.distance <= maxDistance && (!best || r.distance < best.distance)) best = { wall, offset: r.offset, distance: r.distance };
  }
  return best;
}

export function newWall(a: Vec2, b: Vec2, thickness = 0.12): Wall {
  return { id: uid('w'), a, b, thickness, materialId: 'mat-wall' };
}

export function newOpening(kind: Opening['kind'], wall: Wall, offset: number): Opening {
  const o: Opening =
    kind === 'door'
      ? { id: uid('o'), wallId: wall.id, kind, offset, width: 0.9, height: 2.1, sill: 0, materialId: 'mat-door' }
      : { id: uid('o'), wallId: wall.id, kind, offset, width: 1.2, height: 1.3, sill: 0.9, materialId: 'mat-window' };
  return clampOpening(o, wall);
}

export function newRoom(points: Vec2[], index: number): Room {
  return { id: uid('r'), name: `Room ${index}`, type: 'other', points, floorMaterialId: defaultFloorMaterial('other') };
}

/** Every wall endpoint sitting at `p` — moved together so joined walls stay joined. */
export function endpointsAt(plan: FloorPlan, p: Vec2) {
  const refs: { wallId: string; end: 'a' | 'b' }[] = [];
  for (const w of plan.walls) {
    if (dist(w.a, p) < 0.01) refs.push({ wallId: w.id, end: 'a' });
    if (dist(w.b, p) < 0.01) refs.push({ wallId: w.id, end: 'b' });
  }
  return refs;
}

export const ROOM_COLORS: Record<Room['type'], string> = {
  living: '#fde68a',
  bedroom: '#bfdbfe',
  kitchen: '#fecaca',
  bathroom: '#a5f3fc',
  dining: '#fed7aa',
  office: '#d9f99d',
  hallway: '#e5e7eb',
  balcony: '#bbf7d0',
  other: '#e9d5ff',
};
