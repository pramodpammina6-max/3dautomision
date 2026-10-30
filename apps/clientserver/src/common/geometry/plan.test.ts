import { describe, expect, it } from 'vitest';
import { sampleFloorPlan } from '@metaverse/floorplan-schema';
import { pointInPolygon, polygonArea, projectOnWall, roomAt } from './plan';

describe('plan geometry', () => {
  const square = [
    { x: 0, y: 0 },
    { x: 4, y: 0 },
    { x: 4, y: 3 },
    { x: 0, y: 3 },
  ];

  it('computes polygon area', () => {
    expect(polygonArea(square)).toBe(12);
  });

  it('tests point in polygon', () => {
    expect(pointInPolygon({ x: 1, y: 1 }, square)).toBe(true);
    expect(pointInPolygon({ x: 5, y: 1 }, square)).toBe(false);
  });

  it('projects onto a wall segment', () => {
    const w = { id: 'w', a: { x: 0, y: 0 }, b: { x: 10, y: 0 }, thickness: 0.2, materialId: 'm' };
    const r = projectOnWall(w, { x: 3, y: 0.5 });
    expect(r.offset).toBeCloseTo(3);
    expect(r.distance).toBeCloseTo(0.5);
  });

  it('finds the room under a point', () => {
    expect(roomAt(sampleFloorPlan(), { x: 8, y: 2 })?.type).toBe('bedroom');
  });
});
