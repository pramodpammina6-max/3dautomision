'use client';
import type { FloorPlan } from '@/common/types';
import { planBounds } from '@/common/geometry/plan';
import { PlanLayers } from './PlanLayers';

/** Read-only, auto-fitted plan drawing (used by the AI import preview). */
export function PlanPreview({ plan }: { plan: FloorPlan }) {
  const b = planBounds(plan);
  const pad = 1;
  const w = b.maxX - b.minX + pad * 2;
  const h = b.maxY - b.minY + pad * 2;
  return (
    <svg viewBox={`${b.minX - pad} ${b.minY - pad} ${w} ${h}`} className="h-full max-h-[600px] w-full bg-[#0b1020]">
      <PlanLayers plan={plan} k={600 / Math.max(w, h)} />
    </svg>
  );
}
