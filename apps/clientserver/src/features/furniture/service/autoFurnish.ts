import type { FloorPlan, Furniture, FurnitureType, Room } from '@/common/types';
import { pointInPolygon, polygonBounds } from '@/common/geometry/plan';
import { uid } from '@/common/lib/utils';
import { CATALOG } from './catalog';

const MARGIN = 0.12;

/**
 * Wall anchors. Rotation turns the item's front (+y) toward the room centre:
 * top wall → 0°, bottom → 180°, left → 270°, right → 90°.
 */
type Anchor = 'top' | 'bottom' | 'left' | 'right' | 'center';
interface Placement {
  type: FurnitureType;
  anchor: Anchor;
  /** 0..1 position along the anchored wall (or x for center) */
  along: number;
  /** extra metres away from the wall (or y fraction for center) */
  inset?: number;
  rotation?: number;
}

const LAYOUTS: Record<Room['type'], Placement[]> = {
  bedroom: [
    { type: 'bed', anchor: 'top', along: 0.5 },
    { type: 'nightstand', anchor: 'top', along: 0.5, inset: 0 },
    { type: 'nightstand', anchor: 'top', along: 0.5, inset: 0 },
    { type: 'wardrobe', anchor: 'bottom', along: 0.75 },
    { type: 'rug', anchor: 'center', along: 0.5, inset: 0.62 },
    { type: 'plant', anchor: 'bottom', along: 0.08 },
  ],
  living: [
    { type: 'tv_unit', anchor: 'top', along: 0.5 },
    { type: 'sofa', anchor: 'bottom', along: 0.5 },
    { type: 'rug', anchor: 'center', along: 0.5, inset: 0.55 },
    { type: 'coffee_table', anchor: 'center', along: 0.5, inset: 0.6 },
    { type: 'armchair', anchor: 'left', along: 0.5 },
    { type: 'plant', anchor: 'top', along: 0.06 },
    { type: 'lamp', anchor: 'bottom', along: 0.06 },
  ],
  kitchen: [
    { type: 'kitchen_counter', anchor: 'top', along: 0.42 },
    { type: 'fridge', anchor: 'top', along: 0.93 },
    { type: 'kitchen_counter', anchor: 'left', along: 0.6 },
  ],
  dining: [
    { type: 'dining_table', anchor: 'center', along: 0.5, inset: 0.5 },
    { type: 'plant', anchor: 'top', along: 0.92 },
  ],
  bathroom: [
    { type: 'bathtub', anchor: 'bottom', along: 0.3 },
    { type: 'toilet', anchor: 'top', along: 0.8 },
    { type: 'sink', anchor: 'top', along: 0.35 },
  ],
  office: [
    { type: 'desk', anchor: 'top', along: 0.5 },
    { type: 'chair', anchor: 'top', along: 0.5, inset: 0.6 },
    { type: 'bookshelf', anchor: 'left', along: 0.5 },
    { type: 'plant', anchor: 'bottom', along: 0.9 },
  ],
  balcony: [
    { type: 'chair', anchor: 'center', along: 0.35, inset: 0.5 },
    { type: 'chair', anchor: 'center', along: 0.65, inset: 0.5 },
    { type: 'plant', anchor: 'top', along: 0.9 },
  ],
  hallway: [{ type: 'plant', anchor: 'top', along: 0.1 }],
  other: [{ type: 'plant', anchor: 'top', along: 0.5 }],
};

function make(type: FurnitureType, roomId: string, x: number, y: number, rotation: number): Furniture {
  const c = CATALOG[type];
  return {
    id: uid('f'),
    type,
    roomId,
    x: +x.toFixed(3),
    y: +y.toFixed(3),
    rotation,
    width: c.size[0],
    depth: c.size[1],
    height: c.size[2],
    materialId: c.materialId,
  };
}

/** Footprint corners after rotation, for the inside-room check. */
function corners(f: Furniture) {
  const r = (f.rotation * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([sx, sy]) => {
    const lx = (sx * f.width) / 2;
    const ly = (sy * f.depth) / 2;
    return { x: f.x + lx * cos - ly * sin, y: f.y + lx * sin + ly * cos };
  });
}

export function fitsInRoom(f: Furniture, room: Room) {
  return corners(f).every((p) => pointInPolygon(p, room.points));
}

export function furnishRoom(room: Room): Furniture[] {
  const b = polygonBounds(room.points);
  const w = b.maxX - b.minX;
  const h = b.maxY - b.minY;
  const out: Furniture[] = [];

  for (const p of LAYOUTS[room.type]) {
    const c = CATALOG[p.type];
    const fd = c.size[1];
    let f: Furniture;
    switch (p.anchor) {
      case 'top':
        f = make(p.type, room.id, b.minX + w * p.along, b.minY + MARGIN + fd / 2 + (p.inset ?? 0), 0);
        break;
      case 'bottom':
        f = make(p.type, room.id, b.minX + w * p.along, b.maxY - MARGIN - fd / 2 - (p.inset ?? 0), 180);
        break;
      case 'left':
        f = make(p.type, room.id, b.minX + MARGIN + fd / 2 + (p.inset ?? 0), b.minY + h * p.along, 270);
        break;
      case 'right':
        f = make(p.type, room.id, b.maxX - MARGIN - fd / 2 - (p.inset ?? 0), b.minY + h * p.along, 90);
        break;
      default:
        f = make(p.type, room.id, b.minX + w * p.along, b.minY + h * (p.inset ?? 0.5), p.rotation ?? 0);
    }
    // Rugs/tables scale down to fit smaller rooms.
    if (p.type === 'rug' || p.type === 'dining_table') {
      f.width = Math.min(f.width, w * 0.6);
      f.depth = Math.min(f.depth, h * 0.5);
    }
    out.push(f);
  }

  // Nightstands sit either side of the bed.
  const bed = out.find((f) => f.type === 'bed');
  const stands = out.filter((f) => f.type === 'nightstand');
  if (bed && stands.length === 2) {
    stands[0].x = bed.x - bed.width / 2 - stands[0].width / 2 - 0.05;
    stands[1].x = bed.x + bed.width / 2 + stands[1].width / 2 + 0.05;
    stands.forEach((s) => (s.y = bed.y - bed.depth / 2 + s.depth / 2));
  }

  // Chairs around the dining table.
  const table = out.find((f) => f.type === 'dining_table');
  if (table) {
    const offY = table.depth / 2 + 0.3;
    for (const dx of [-0.4, 0.4]) {
      out.push(make('chair', room.id, table.x + dx * (table.width / 1.6), table.y - offY, 180));
      out.push(make('chair', room.id, table.x + dx * (table.width / 1.6), table.y + offY, 0));
    }
  }

  return out.filter((f) => fitsInRoom(f, room));
}

/** Rule-based furnishing used offline and as the AI fallback. Replaces existing furniture. */
export function autoFurnish(plan: FloorPlan): Furniture[] {
  return plan.rooms.flatMap(furnishRoom);
}
