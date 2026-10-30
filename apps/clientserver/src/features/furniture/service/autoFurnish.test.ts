import { describe, expect, it } from 'vitest';
import { sampleFloorPlan } from '@metaverse/floorplan-schema';
import { autoFurnish, fitsInRoom } from './autoFurnish';

describe('autoFurnish', () => {
  const plan = sampleFloorPlan();
  const items = autoFurnish(plan);

  it('furnishes every room type in the sample', () => {
    const types = new Set(items.map((f) => f.type));
    for (const t of ['bed', 'sofa', 'kitchen_counter', 'dining_table', 'toilet']) {
      expect(types.has(t as never)).toBe(true);
    }
  });

  it('keeps every item inside its room', () => {
    for (const f of items) {
      const room = plan.rooms.find((r) => r.id === f.roomId)!;
      expect(fitsInRoom(f, room)).toBe(true);
    }
  });
});
