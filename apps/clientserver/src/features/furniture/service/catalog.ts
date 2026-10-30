import type { FurnitureType } from '@/common/types';

export interface CatalogItem {
  type: FurnitureType;
  label: string;
  /** width (x), depth (y in plan), height — metres */
  size: [number, number, number];
  materialId: string;
  /** 2D plan fill colour */
  color: string;
}

/** Local convention: the front of every item faces +y in plan (+z in 3D) at rotation 0. */
export const CATALOG: Record<FurnitureType, CatalogItem> = {
  bed: { type: 'bed', label: 'Double bed', size: [1.6, 2.05, 0.55], materialId: 'mat-furniture-wood', color: '#93c5fd' },
  nightstand: { type: 'nightstand', label: 'Nightstand', size: [0.45, 0.4, 0.5], materialId: 'mat-furniture-wood', color: '#c4b5fd' },
  wardrobe: { type: 'wardrobe', label: 'Wardrobe', size: [1.6, 0.6, 2.1], materialId: 'mat-furniture-wood', color: '#a78bfa' },
  sofa: { type: 'sofa', label: '3-seat sofa', size: [2.1, 0.9, 0.85], materialId: 'mat-fabric', color: '#fca5a5' },
  armchair: { type: 'armchair', label: 'Armchair', size: [0.85, 0.85, 0.85], materialId: 'mat-fabric', color: '#fdba74' },
  coffee_table: { type: 'coffee_table', label: 'Coffee table', size: [1.1, 0.6, 0.42], materialId: 'mat-furniture-wood', color: '#fcd34d' },
  tv_unit: { type: 'tv_unit', label: 'TV unit', size: [1.8, 0.42, 0.5], materialId: 'mat-furniture-wood', color: '#94a3b8' },
  dining_table: { type: 'dining_table', label: 'Dining table', size: [1.6, 0.9, 0.75], materialId: 'mat-furniture-wood', color: '#fde68a' },
  chair: { type: 'chair', label: 'Chair', size: [0.45, 0.5, 0.9], materialId: 'mat-furniture-wood', color: '#fef08a' },
  desk: { type: 'desk', label: 'Desk', size: [1.4, 0.7, 0.75], materialId: 'mat-furniture-wood', color: '#bef264' },
  bookshelf: { type: 'bookshelf', label: 'Bookshelf', size: [1, 0.35, 1.9], materialId: 'mat-furniture-wood', color: '#86efac' },
  kitchen_counter: { type: 'kitchen_counter', label: 'Kitchen counter', size: [2.4, 0.62, 0.9], materialId: 'mat-ceramic', color: '#67e8f9' },
  fridge: { type: 'fridge', label: 'Fridge', size: [0.7, 0.7, 1.85], materialId: 'mat-ceramic', color: '#a5f3fc' },
  toilet: { type: 'toilet', label: 'Toilet', size: [0.4, 0.68, 0.78], materialId: 'mat-ceramic', color: '#e0f2fe' },
  sink: { type: 'sink', label: 'Vanity sink', size: [0.7, 0.48, 0.85], materialId: 'mat-ceramic', color: '#bae6fd' },
  bathtub: { type: 'bathtub', label: 'Bathtub', size: [1.7, 0.75, 0.58], materialId: 'mat-ceramic', color: '#7dd3fc' },
  plant: { type: 'plant', label: 'Plant', size: [0.45, 0.45, 1.2], materialId: 'mat-plant', color: '#4ade80' },
  rug: { type: 'rug', label: 'Rug', size: [2, 1.4, 0.01], materialId: 'mat-fabric', color: '#e2e8f0' },
  lamp: { type: 'lamp', label: 'Floor lamp', size: [0.4, 0.4, 1.6], materialId: 'mat-furniture-wood', color: '#fef3c7' },
};

export const CATALOG_LIST = Object.values(CATALOG);
