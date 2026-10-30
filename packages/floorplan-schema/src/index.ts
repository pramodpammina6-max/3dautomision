import { z } from 'zod';

/**
 * Shared floor plan document model.
 * Units are metres. Plan space: x → right, y → down (screen-like). In 3D, plan y maps to world z.
 */

export const Vec2Schema = z.object({ x: z.number(), y: z.number() });

export const MATERIAL_KINDS = [
  'paint',
  'wood',
  'tile',
  'marble',
  'fabric',
  'leather',
  'metal',
  'glass',
  'concrete',
  'carpet',
] as const;

export const MaterialSchema = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(MATERIAL_KINDS),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  roughness: z.number().min(0).max(1),
  metalness: z.number().min(0).max(1),
  opacity: z.number().min(0).max(1).default(1),
  /** Metres covered by one texture tile. */
  textureScale: z.number().positive().default(1),
});

export const WallSchema = z.object({
  id: z.string(),
  a: Vec2Schema,
  b: Vec2Schema,
  thickness: z.number().positive(),
  materialId: z.string(),
});

export const OpeningSchema = z.object({
  id: z.string(),
  wallId: z.string(),
  kind: z.enum(['door', 'window']),
  /** Distance from wall.a to the opening centre, measured along the wall. */
  offset: z.number().min(0),
  width: z.number().positive(),
  height: z.number().positive(),
  sill: z.number().min(0),
  materialId: z.string(),
});

export const ROOM_TYPES = [
  'living',
  'bedroom',
  'kitchen',
  'bathroom',
  'dining',
  'office',
  'hallway',
  'balcony',
  'other',
] as const;

export const RoomSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(ROOM_TYPES),
  points: z.array(Vec2Schema).min(3),
  floorMaterialId: z.string(),
});

export const FURNITURE_TYPES = [
  'bed',
  'nightstand',
  'wardrobe',
  'sofa',
  'armchair',
  'coffee_table',
  'tv_unit',
  'dining_table',
  'chair',
  'desk',
  'bookshelf',
  'kitchen_counter',
  'fridge',
  'toilet',
  'sink',
  'bathtub',
  'plant',
  'rug',
  'lamp',
] as const;

export const FurnitureSchema = z.object({
  id: z.string(),
  type: z.enum(FURNITURE_TYPES),
  roomId: z.string().nullable(),
  x: z.number(),
  y: z.number(),
  /** Degrees, clockwise when viewed from above (matches SVG rotate). */
  rotation: z.number(),
  width: z.number().positive(),
  depth: z.number().positive(),
  height: z.number().positive(),
  materialId: z.string(),
});

export const FloorPlanSchema = z.object({
  version: z.literal(1),
  name: z.string(),
  wallHeight: z.number().positive(),
  walls: z.array(WallSchema),
  openings: z.array(OpeningSchema),
  rooms: z.array(RoomSchema),
  furniture: z.array(FurnitureSchema),
  materials: z.array(MaterialSchema),
});

export type Vec2 = z.infer<typeof Vec2Schema>;
export type MaterialKind = (typeof MATERIAL_KINDS)[number];
export type Material = z.infer<typeof MaterialSchema>;
export type Wall = z.infer<typeof WallSchema>;
export type Opening = z.infer<typeof OpeningSchema>;
export type RoomType = (typeof ROOM_TYPES)[number];
export type Room = z.infer<typeof RoomSchema>;
export type FurnitureType = (typeof FURNITURE_TYPES)[number];
export type Furniture = z.infer<typeof FurnitureSchema>;
export type FloorPlan = z.infer<typeof FloorPlanSchema>;

/**
 * JSON Schema handed to the OpenAI Responses API (structured outputs, strict mode).
 * Strict mode needs every property required and additionalProperties: false, so the
 * AI shape is a flat subset of FloorPlan; `fromAiFloorPlan` expands it.
 */
export const AI_FLOORPLAN_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['name', 'wallHeight', 'walls', 'openings', 'rooms'],
  properties: {
    name: { type: 'string' },
    wallHeight: { type: 'number' },
    walls: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'ax', 'ay', 'bx', 'by', 'thickness'],
        properties: {
          id: { type: 'string' },
          ax: { type: 'number' },
          ay: { type: 'number' },
          bx: { type: 'number' },
          by: { type: 'number' },
          thickness: { type: 'number' },
        },
      },
    },
    openings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'wallId', 'kind', 'offset', 'width', 'height', 'sill'],
        properties: {
          id: { type: 'string' },
          wallId: { type: 'string' },
          kind: { type: 'string', enum: ['door', 'window'] },
          offset: { type: 'number' },
          width: { type: 'number' },
          height: { type: 'number' },
          sill: { type: 'number' },
        },
      },
    },
    rooms: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'name', 'type', 'points'],
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          type: { type: 'string', enum: [...ROOM_TYPES] },
          points: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['x', 'y'],
              properties: { x: { type: 'number' }, y: { type: 'number' } },
            },
          },
        },
      },
    },
  },
} as const;

export const AI_FURNITURE_JSON_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['furniture'],
  properties: {
    furniture: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'roomId', 'x', 'y', 'rotation'],
        properties: {
          type: { type: 'string', enum: [...FURNITURE_TYPES] },
          roomId: { type: 'string' },
          x: { type: 'number' },
          y: { type: 'number' },
          rotation: { type: 'number' },
        },
      },
    },
  },
} as const;

export interface AiFloorPlan {
  name: string;
  wallHeight: number;
  walls: { id: string; ax: number; ay: number; bx: number; by: number; thickness: number }[];
  openings: {
    id: string;
    wallId: string;
    kind: 'door' | 'window';
    offset: number;
    width: number;
    height: number;
    sill: number;
  }[];
  rooms: { id: string; name: string; type: RoomType; points: Vec2[] }[];
}

export const DEFAULT_MATERIALS: Material[] = [
  { id: 'mat-wall', name: 'Warm White Paint', kind: 'paint', color: '#f1ede4', roughness: 0.9, metalness: 0, opacity: 1, textureScale: 1 },
  { id: 'mat-floor-wood', name: 'Oak Planks', kind: 'wood', color: '#b98a5a', roughness: 0.6, metalness: 0, opacity: 1, textureScale: 1.2 },
  { id: 'mat-floor-tile', name: 'Ceramic Tile', kind: 'tile', color: '#d9d6cf', roughness: 0.35, metalness: 0, opacity: 1, textureScale: 0.6 },
  { id: 'mat-door', name: 'Walnut Door', kind: 'wood', color: '#6b4a2f', roughness: 0.5, metalness: 0, opacity: 1, textureScale: 1 },
  { id: 'mat-window', name: 'Clear Glass', kind: 'glass', color: '#cfe6f2', roughness: 0.05, metalness: 0, opacity: 0.3, textureScale: 1 },
  { id: 'mat-fabric', name: 'Grey Linen', kind: 'fabric', color: '#8a8f99', roughness: 0.95, metalness: 0, opacity: 1, textureScale: 0.4 },
  { id: 'mat-furniture-wood', name: 'Light Ash', kind: 'wood', color: '#c9a77c', roughness: 0.55, metalness: 0, opacity: 1, textureScale: 0.8 },
  { id: 'mat-ceramic', name: 'White Ceramic', kind: 'paint', color: '#fafafa', roughness: 0.2, metalness: 0, opacity: 1, textureScale: 1 },
  { id: 'mat-plant', name: 'Leaf Green', kind: 'paint', color: '#4f7a3a', roughness: 0.8, metalness: 0, opacity: 1, textureScale: 1 },
];

const WET_ROOMS: RoomType[] = ['bathroom', 'kitchen', 'balcony'];

export function defaultFloorMaterial(type: RoomType): string {
  return WET_ROOMS.includes(type) ? 'mat-floor-tile' : 'mat-floor-wood';
}

/** Expand the compact AI output into a full FloorPlan with default materials. */
export function fromAiFloorPlan(ai: AiFloorPlan): FloorPlan {
  const wallIds = new Set(ai.walls.map((w) => w.id));
  return FloorPlanSchema.parse({
    version: 1,
    name: ai.name || 'Generated plan',
    wallHeight: clamp(ai.wallHeight || 2.8, 2.2, 5),
    walls: ai.walls.map((w) => ({
      id: w.id,
      a: { x: w.ax, y: w.ay },
      b: { x: w.bx, y: w.by },
      thickness: clamp(w.thickness || 0.15, 0.05, 0.6),
      materialId: 'mat-wall',
    })),
    openings: ai.openings
      .filter((o) => wallIds.has(o.wallId))
      .map((o) => ({
        ...o,
        offset: Math.max(0, o.offset),
        sill: o.kind === 'door' ? 0 : Math.max(0, o.sill),
        materialId: o.kind === 'door' ? 'mat-door' : 'mat-window',
      })),
    rooms: ai.rooms
      .filter((r) => r.points.length >= 3)
      .map((r) => ({ ...r, floorMaterialId: defaultFloorMaterial(r.type) })),
    furniture: [],
    materials: DEFAULT_MATERIALS,
  });
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export function emptyFloorPlan(name = 'Untitled plan'): FloorPlan {
  return {
    version: 1,
    name,
    wallHeight: 2.8,
    walls: [],
    openings: [],
    rooms: [],
    furniture: [],
    materials: DEFAULT_MATERIALS.map((m) => ({ ...m })),
  };
}

/** Two-bedroom apartment (10m × 8m) used for demo mode and "start from sample". */
export function sampleFloorPlan(name = 'Sample 2BHK Apartment'): FloorPlan {
  const ai: AiFloorPlan = {
    name,
    wallHeight: 2.8,
    walls: [
      // exterior
      { id: 'w1', ax: 0, ay: 0, bx: 10, by: 0, thickness: 0.2 },
      { id: 'w2', ax: 10, ay: 0, bx: 10, by: 8, thickness: 0.2 },
      { id: 'w3', ax: 10, ay: 8, bx: 0, by: 8, thickness: 0.2 },
      { id: 'w4', ax: 0, ay: 8, bx: 0, by: 0, thickness: 0.2 },
      // interior
      { id: 'w5', ax: 6, ay: 0, bx: 6, by: 4.5, thickness: 0.12 },
      { id: 'w6', ax: 6, ay: 4.5, bx: 10, by: 4.5, thickness: 0.12 },
      { id: 'w7', ax: 0, ay: 5, bx: 3.5, by: 5, thickness: 0.12 },
      { id: 'w8', ax: 3.5, ay: 5, bx: 3.5, by: 8, thickness: 0.12 },
      { id: 'w9', ax: 6, ay: 4.5, bx: 6, by: 8, thickness: 0.12 },
      { id: 'w10', ax: 6, ay: 6.5, bx: 10, by: 6.5, thickness: 0.12 },
    ],
    openings: [
      { id: 'o1', wallId: 'w3', kind: 'door', offset: 5.2, width: 1, height: 2.1, sill: 0 },
      { id: 'o2', wallId: 'w1', kind: 'window', offset: 3, width: 2, height: 1.4, sill: 0.9 },
      { id: 'o3', wallId: 'w1', kind: 'window', offset: 8, width: 1.6, height: 1.4, sill: 0.9 },
      { id: 'o4', wallId: 'w5', kind: 'door', offset: 3.6, width: 0.9, height: 2.1, sill: 0 },
      { id: 'o5', wallId: 'w2', kind: 'window', offset: 5.5, width: 1.2, height: 1.2, sill: 1 },
      { id: 'o6', wallId: 'w4', kind: 'window', offset: 1.5, width: 1.4, height: 1.3, sill: 0.9 },
      { id: 'o7', wallId: 'w8', kind: 'door', offset: 1, width: 0.9, height: 2.1, sill: 0 },
      { id: 'o8', wallId: 'w9', kind: 'door', offset: 1, width: 0.9, height: 2.1, sill: 0 },
      { id: 'o9', wallId: 'w10', kind: 'door', offset: 1, width: 0.8, height: 2.1, sill: 0 },
      { id: 'o10', wallId: 'w2', kind: 'window', offset: 7.3, width: 0.6, height: 0.6, sill: 1.6 },
    ],
    rooms: [
      { id: 'r1', name: 'Living Room', type: 'living', points: [{ x: 0, y: 0 }, { x: 6, y: 0 }, { x: 6, y: 5 }, { x: 0, y: 5 }] },
      { id: 'r2', name: 'Master Bedroom', type: 'bedroom', points: [{ x: 6, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 4.5 }, { x: 6, y: 4.5 }] },
      { id: 'r3', name: 'Kitchen', type: 'kitchen', points: [{ x: 0, y: 5 }, { x: 3.5, y: 5 }, { x: 3.5, y: 8 }, { x: 0, y: 8 }] },
      { id: 'r4', name: 'Dining', type: 'dining', points: [{ x: 3.5, y: 5 }, { x: 6, y: 5 }, { x: 6, y: 8 }, { x: 3.5, y: 8 }] },
      { id: 'r5', name: 'Bedroom 2', type: 'bedroom', points: [{ x: 6, y: 4.5 }, { x: 10, y: 4.5 }, { x: 10, y: 6.5 }, { x: 6, y: 6.5 }] },
      { id: 'r6', name: 'Bathroom', type: 'bathroom', points: [{ x: 6, y: 6.5 }, { x: 10, y: 6.5 }, { x: 10, y: 8 }, { x: 6, y: 8 }] },
    ],
  };
  return fromAiFloorPlan(ai);
}
