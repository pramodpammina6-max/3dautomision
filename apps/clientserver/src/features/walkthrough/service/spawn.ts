import * as THREE from 'three';
import type { FloorPlan } from '@/common/types';
import { spawnPoint2d } from '@/common/geometry/plan';

export function spawnPoint(plan: FloorPlan) {
  const p = spawnPoint2d(plan);
  return new THREE.Vector3(p.x, 0, p.y);
}
