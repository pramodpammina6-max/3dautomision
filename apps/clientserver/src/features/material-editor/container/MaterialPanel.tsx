'use client';
import { useState } from 'react';
import { MousePointerClick } from 'lucide-react';
import { Field, PanelSection } from '@/common/components/ui/panel';
import { cn } from '@/common/lib/utils';
import { useProjectStore } from '@/common/store/projectStore';
import type { Material } from '@/common/types';
import { MATERIAL_LIBRARY } from '../service/materialLibrary';
import { applyPreset, editMaterial, materialIdOf, type Scope } from '../service/materialAssign';
import { materialStyles as s } from '../styles/material.styles';

const KIND_LABEL = { wall: 'Wall', opening: 'Door / window', room: 'Floor', furniture: 'Furniture' } as const;
const SIMILAR_LABEL = { wall: 'All walls', opening: 'All of this type', room: 'All floors', furniture: 'All of this item' } as const;

function chipStyle(m: Pick<Material, 'color' | 'kind' | 'metalness' | 'roughness'>) {
  const shine = m.metalness > 0.5 || m.roughness < 0.3;
  return {
    background: shine
      ? `radial-gradient(circle at 30% 30%, #ffffffaa, ${m.color} 45%, ${m.color})`
      : m.kind === 'wood'
        ? `repeating-linear-gradient(100deg, ${m.color}, ${m.color} 4px, #00000022 5px, ${m.color} 7px)`
        : m.color,
  };
}

/** Coohom-style material editor: pick a surface in 2D/3D, then apply a preset or tweak PBR values. */
export function MaterialPanel() {
  const plan = useProjectStore((st) => st.plan);
  const sel = useProjectStore((st) => st.selection);
  const { mutate } = useProjectStore.getState();
  const [scope, setScope] = useState<Scope>('one');
  const [category, setCategory] = useState(MATERIAL_LIBRARY[0].category);
  if (!plan) return null;

  if (!sel) {
    return (
      <PanelSection title="Materials">
        <p className="flex items-start gap-2 text-xs text-slate-400">
          <MousePointerClick className="mt-0.5 size-4 shrink-0" />
          Click a wall, floor, door, window or furniture item in the 3D view (or the 2D plan) to edit its material.
        </p>
      </PanelSection>
    );
  }

  const id = materialIdOf(plan, sel);
  const mat = plan.materials.find((m) => m.id === id);
  const items = MATERIAL_LIBRARY.find((c) => c.category === category)!.items;
  const tweak = (patch: Partial<Material>) => mutate((p) => editMaterial(p, sel, patch, scope));

  return (
    <PanelSection title={`Material · ${KIND_LABEL[sel.kind]}`}>
      <div className="flex gap-1 rounded-lg bg-slate-950 p-1">
        {(['one', 'similar'] as const).map((sc) => (
          <button
            key={sc}
            className={cn(s.scopeBtn, scope === sc ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white')}
            onClick={() => setScope(sc)}
          >
            {sc === 'one' ? 'This object' : SIMILAR_LABEL[sel.kind]}
          </button>
        ))}
      </div>

      {mat && (
        <div className="space-y-2 rounded-lg border border-slate-800 p-3">
          <div className="flex items-center gap-3">
            <span className={s.chip} style={chipStyle(mat)} />
            <div className="min-w-0">
              <p className="truncate text-sm text-white">{mat.name}</p>
              <p className="text-xs capitalize text-slate-500">{mat.kind}</p>
            </div>
          </div>
          <Field label="Colour">
            <input type="color" value={mat.color} onChange={(e) => tweak({ color: e.target.value })} className="h-7 w-14 cursor-pointer rounded border-0 bg-transparent" />
          </Field>
          <Field label="Roughness">
            <input type="range" min={0} max={1} step={0.01} value={mat.roughness} className={s.slider} onChange={(e) => tweak({ roughness: +e.target.value })} />
          </Field>
          <Field label="Metalness">
            <input type="range" min={0} max={1} step={0.01} value={mat.metalness} className={s.slider} onChange={(e) => tweak({ metalness: +e.target.value })} />
          </Field>
          <Field label="Texture scale">
            <input type="range" min={0.2} max={4} step={0.1} value={mat.textureScale} className={s.slider} onChange={(e) => tweak({ textureScale: +e.target.value })} />
          </Field>
          {mat.kind === 'glass' && (
            <Field label="Opacity">
              <input type="range" min={0.05} max={1} step={0.05} value={mat.opacity} className={s.slider} onChange={(e) => tweak({ opacity: +e.target.value })} />
            </Field>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        {MATERIAL_LIBRARY.map((c) => (
          <button
            key={c.category}
            className={cn('rounded-full px-2.5 py-1 text-[11px]', category === c.category ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700')}
            onClick={() => setCategory(c.category)}
          >
            {c.category}
          </button>
        ))}
      </div>
      <div className={s.swatchGrid}>
        {items.map((preset) => (
          <button key={preset.name} className={s.swatch} onClick={() => mutate((p) => applyPreset(p, sel, preset, scope))} title={preset.name}>
            <span className={s.chip} style={chipStyle(preset)} />
            {preset.name}
          </button>
        ))}
      </div>
    </PanelSection>
  );
}
