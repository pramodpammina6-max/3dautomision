import { apiFetch } from '@/common/lib/apiClient';
import { API } from '@/common/routes';
import type { FloorPlan, Furniture, FurnitureType, Vec2 } from '@/common/types';
import { uid } from '@/common/lib/utils';
import { roomAt } from '@/common/geometry/plan';
import { CATALOG } from './catalog';

export const furnitureService = {
  aiFurnish: (plan: FloorPlan, style?: string) =>
    apiFetch<{ furniture: Furniture[]; source: 'openai' | 'rules' }>(API.aiFurnish, {
      method: 'POST',
      body: JSON.stringify({ plan, style }),
    }),

  create(plan: FloorPlan, type: FurnitureType, at: Vec2): Furniture {
    const c = CATALOG[type];
    return {
      id: uid('f'),
      type,
      roomId: roomAt(plan, at)?.id ?? null,
      x: at.x,
      y: at.y,
      rotation: 0,
      width: c.size[0],
      depth: c.size[1],
      height: c.size[2],
      materialId: c.materialId,
    };
  },
};
