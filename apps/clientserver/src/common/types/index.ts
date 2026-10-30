export type {
  FloorPlan,
  Wall,
  Opening,
  Room,
  Furniture,
  FurnitureType,
  Material,
  MaterialKind,
  RoomType,
  Vec2,
} from '@metaverse/floorplan-schema';

export type SelectionKind = 'wall' | 'opening' | 'room' | 'furniture';
export interface Selection {
  kind: SelectionKind;
  id: string;
}

export interface ProjectSummary {
  id: string;
  name: string;
  updatedAt: string;
  stats: { rooms: number; walls: number; furniture: number };
}

export interface ProjectDetail {
  id: string;
  name: string;
  plan: import('@metaverse/floorplan-schema').FloorPlan;
  updatedAt: string;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
}
