import { describe, expect, it } from 'vitest';
import { FloorPlanSchema, fromAiFloorPlan, sampleFloorPlan } from './index';

describe('floorplan-schema', () => {
  it('sample plan is valid', () => {
    expect(() => FloorPlanSchema.parse(sampleFloorPlan())).not.toThrow();
  });

  it('drops openings that reference unknown walls and forces door sill to 0', () => {
    const plan = fromAiFloorPlan({
      name: 'x',
      wallHeight: 3,
      walls: [{ id: 'w1', ax: 0, ay: 0, bx: 4, by: 0, thickness: 0.2 }],
      openings: [
        { id: 'o1', wallId: 'w1', kind: 'door', offset: 1, width: 0.9, height: 2.1, sill: 0.5 },
        { id: 'o2', wallId: 'ghost', kind: 'window', offset: 1, width: 1, height: 1, sill: 1 },
      ],
      rooms: [],
    });
    expect(plan.openings).toHaveLength(1);
    expect(plan.openings[0].sill).toBe(0);
  });
});
