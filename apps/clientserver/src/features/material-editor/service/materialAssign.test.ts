import { describe, expect, it } from 'vitest';
import { sampleFloorPlan } from '@metaverse/floorplan-schema';
import { applyPreset, editMaterial, materialIdOf } from './materialAssign';

describe('material assignment', () => {
  it('forks a shared material when editing one wall', () => {
    const plan = sampleFloorPlan();
    const sel = { kind: 'wall' as const, id: 'w1' };
    editMaterial(plan, sel, { color: '#ff0000' }, 'one');
    expect(materialIdOf(plan, sel)).not.toBe('mat-wall');
    expect(plan.walls.find((w) => w.id === 'w2')!.materialId).toBe('mat-wall');
  });

  it('applies a preset to all floors with scope "similar"', () => {
    const plan = sampleFloorPlan();
    applyPreset(plan, { kind: 'room', id: 'r1' }, { name: 'Marble', kind: 'marble', color: '#eeeeee', roughness: 0.1, metalness: 0, opacity: 1, textureScale: 2 }, 'similar');
    expect(new Set(plan.rooms.map((r) => r.floorMaterialId)).size).toBe(1);
  });
});
