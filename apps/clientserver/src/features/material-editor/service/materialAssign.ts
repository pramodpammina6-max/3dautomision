import type { FloorPlan, Material, Selection } from '@/common/types';
import { uid } from '@/common/lib/utils';

export type Scope = 'one' | 'similar';

export function materialIdOf(plan: FloorPlan, sel: Selection): string | undefined {
  switch (sel.kind) {
    case 'wall':
      return plan.walls.find((x) => x.id === sel.id)?.materialId;
    case 'opening':
      return plan.openings.find((x) => x.id === sel.id)?.materialId;
    case 'room':
      return plan.rooms.find((x) => x.id === sel.id)?.floorMaterialId;
    case 'furniture':
      return plan.furniture.find((x) => x.id === sel.id)?.materialId;
  }
}

/** Every object that should change together under scope "similar". */
function targets(plan: FloorPlan, sel: Selection, scope: Scope): Selection[] {
  if (scope === 'one') return [sel];
  switch (sel.kind) {
    case 'wall':
      return plan.walls.map((w) => ({ kind: 'wall', id: w.id }));
    case 'room':
      return plan.rooms.map((r) => ({ kind: 'room', id: r.id }));
    case 'opening': {
      const kind = plan.openings.find((o) => o.id === sel.id)?.kind;
      return plan.openings.filter((o) => o.kind === kind).map((o) => ({ kind: 'opening', id: o.id }));
    }
    case 'furniture': {
      const type = plan.furniture.find((f) => f.id === sel.id)?.type;
      return plan.furniture.filter((f) => f.type === type).map((f) => ({ kind: 'furniture', id: f.id }));
    }
  }
}

function assign(plan: FloorPlan, sel: Selection, materialId: string) {
  if (sel.kind === 'wall') plan.walls.find((x) => x.id === sel.id)!.materialId = materialId;
  if (sel.kind === 'opening') plan.openings.find((x) => x.id === sel.id)!.materialId = materialId;
  if (sel.kind === 'room') plan.rooms.find((x) => x.id === sel.id)!.floorMaterialId = materialId;
  if (sel.kind === 'furniture') plan.furniture.find((x) => x.id === sel.id)!.materialId = materialId;
}

export function usageCount(plan: FloorPlan, materialId: string) {
  return (
    plan.walls.filter((x) => x.materialId === materialId).length +
    plan.openings.filter((x) => x.materialId === materialId).length +
    plan.rooms.filter((x) => x.floorMaterialId === materialId).length +
    plan.furniture.filter((x) => x.materialId === materialId).length
  );
}

/** Drops materials nothing references any more (keeps the plan document small). */
export function pruneMaterials(plan: FloorPlan) {
  plan.materials = plan.materials.filter((m) => m.id.startsWith('mat-') || usageCount(plan, m.id) > 0);
}

/** Applies a library preset as a fresh material to the selection (or all similar objects). */
export function applyPreset(plan: FloorPlan, sel: Selection, preset: Omit<Material, 'id'>, scope: Scope) {
  const mat: Material = { ...preset, id: uid('m') };
  plan.materials.push(mat);
  for (const t of targets(plan, sel, scope)) assign(plan, t, mat.id);
  pruneMaterials(plan);
}

/**
 * Tweaks the selection's material. Shared materials are forked first (scope "one"),
 * so recolouring one sofa does not recolour every fabric item.
 */
export function editMaterial(plan: FloorPlan, sel: Selection, patch: Partial<Material>, scope: Scope) {
  const id = materialIdOf(plan, sel);
  const current = plan.materials.find((m) => m.id === id);
  if (!current) return;
  const group = targets(plan, sel, scope);
  if (usageCount(plan, current.id) > group.length || current.id.startsWith('mat-')) {
    const fork: Material = { ...current, ...patch, id: uid('m'), name: `${current.name} (custom)` };
    plan.materials.push(fork);
    for (const t of group) assign(plan, t, fork.id);
  } else {
    Object.assign(current, patch);
  }
  pruneMaterials(plan);
}
