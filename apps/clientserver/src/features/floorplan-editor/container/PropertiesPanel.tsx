'use client';
import { Copy, RotateCw } from 'lucide-react';
import { ROOM_TYPES } from '@metaverse/floorplan-schema';
import { Button } from '@/common/components/ui/button';
import { Field, NumberField, PanelSection } from '@/common/components/ui/panel';
import { clampOpening, polygonArea, wallLength } from '@/common/geometry/plan';
import { uid } from '@/common/lib/utils';
import { useProjectStore } from '@/common/store/projectStore';
import type { FloorPlan } from '@/common/types';
import { CATALOG } from '@/features/furniture/service/catalog';

const inputCls = 'h-7 w-36 rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100';

/** Edits whatever is selected; changes go through the shared store so 2D and 3D both update. */
export function PropertiesPanel() {
  const plan = useProjectStore((s) => s.plan);
  const sel = useProjectStore((s) => s.selection);
  const { mutate, select } = useProjectStore.getState();
  if (!plan) return null;

  const edit = (fn: (p: FloorPlan) => void) => mutate(fn);

  if (!sel) {
    return (
      <PanelSection title="Plan">
        <NumberField label="Wall height (m)" value={plan.wallHeight} step={0.1} min={2.2} max={5} onChange={(v) => edit((p) => { p.wallHeight = v; })} />
        <p className="text-xs text-slate-500">
          {plan.rooms.length} rooms · {plan.walls.length} walls · {plan.openings.length} openings · {plan.furniture.length} items
        </p>
      </PanelSection>
    );
  }

  if (sel.kind === 'wall') {
    const w = plan.walls.find((x) => x.id === sel.id);
    if (!w) return null;
    return (
      <PanelSection title="Wall">
        <Field label="Length">
          <span className="text-slate-200">{wallLength(w).toFixed(2)} m</span>
        </Field>
        <NumberField label="Thickness (m)" value={w.thickness} step={0.01} min={0.05} max={0.6} onChange={(v) => edit((p) => { p.walls.find((x) => x.id === w.id)!.thickness = v; })} />
      </PanelSection>
    );
  }

  if (sel.kind === 'opening') {
    const o = plan.openings.find((x) => x.id === sel.id);
    const wall = o && plan.walls.find((x) => x.id === o.wallId);
    if (!o || !wall) return null;
    const set = (patch: Partial<typeof o>) =>
      edit((p) => {
        const i = p.openings.findIndex((x) => x.id === o.id);
        p.openings[i] = clampOpening({ ...p.openings[i], ...patch }, wall);
      });
    return (
      <PanelSection title={o.kind === 'door' ? 'Door' : 'Window'}>
        <Field label="Type">
          <select className={inputCls} value={o.kind} onChange={(e) => set(e.target.value === 'door' ? { kind: 'door', sill: 0, height: 2.1, materialId: 'mat-door' } : { kind: 'window', sill: 0.9, height: 1.3, materialId: 'mat-window' })}>
            <option value="door">Door</option>
            <option value="window">Window</option>
          </select>
        </Field>
        <NumberField label="Width (m)" value={o.width} onChange={(v) => set({ width: v })} />
        <NumberField label="Height (m)" value={o.height} onChange={(v) => set({ height: Math.min(v, plan.wallHeight - o.sill) })} />
        {o.kind === 'window' && <NumberField label="Sill (m)" value={o.sill} onChange={(v) => set({ sill: Math.max(0, v) })} />}
        <NumberField label="Offset (m)" value={o.offset} onChange={(v) => set({ offset: v })} />
      </PanelSection>
    );
  }

  if (sel.kind === 'room') {
    const r = plan.rooms.find((x) => x.id === sel.id);
    if (!r) return null;
    const set = (patch: Partial<typeof r>) => edit((p) => Object.assign(p.rooms.find((x) => x.id === r.id)!, patch));
    return (
      <PanelSection title="Room">
        <Field label="Name">
          <input className={inputCls} value={r.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="Type">
          <select className={inputCls} value={r.type} onChange={(e) => set({ type: e.target.value as typeof r.type })}>
            {ROOM_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Area">
          <span className="text-slate-200">{polygonArea(r.points).toFixed(2)} m²</span>
        </Field>
      </PanelSection>
    );
  }

  const f = plan.furniture.find((x) => x.id === sel.id);
  if (!f) return null;
  const set = (patch: Partial<typeof f>) => edit((p) => Object.assign(p.furniture.find((x) => x.id === f.id)!, patch));
  return (
    <PanelSection
      title={CATALOG[f.type].label}
      actions={
        <div className="flex gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" title="Rotate 90°" onClick={() => set({ rotation: (f.rotation + 90) % 360 })}>
            <RotateCw />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            title="Duplicate"
            onClick={() => {
              const copy = { ...f, id: uid('f'), x: f.x + 0.3, y: f.y + 0.3 };
              edit((p) => { p.furniture.push(copy); });
              select({ kind: 'furniture', id: copy.id });
            }}
          >
            <Copy />
          </Button>
        </div>
      }
    >
      <NumberField label="X (m)" value={f.x} onChange={(v) => set({ x: v })} />
      <NumberField label="Y (m)" value={f.y} onChange={(v) => set({ y: v })} />
      <NumberField label="Rotation (°)" value={f.rotation} step={15} onChange={(v) => set({ rotation: ((v % 360) + 360) % 360 })} />
      <NumberField label="Width (m)" value={f.width} min={0.1} onChange={(v) => set({ width: Math.max(0.1, v) })} />
      <NumberField label="Depth (m)" value={f.depth} min={0.1} onChange={(v) => set({ depth: Math.max(0.1, v) })} />
      <NumberField label="Height (m)" value={f.height} min={0.01} onChange={(v) => set({ height: Math.max(0.01, v) })} />
    </PanelSection>
  );
}
