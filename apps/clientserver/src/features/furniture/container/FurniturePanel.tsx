'use client';
import { useState } from 'react';
import { Eraser, Loader2, Wand2, Sparkles } from 'lucide-react';
import { Button } from '@/common/components/ui/button';
import { PanelSection } from '@/common/components/ui/panel';
import { largestRoom, planBounds, polygonCentroid } from '@/common/geometry/plan';
import { useProjectStore } from '@/common/store/projectStore';
import type { FurnitureType } from '@/common/types';
import { autoFurnish } from '../service/autoFurnish';
import { CATALOG_LIST } from '../service/catalog';
import { furnitureService } from '../service/furnitureService';
import { furnitureStyles as s } from '../styles/furniture.styles';

export function FurniturePanel() {
  const plan = useProjectStore((st) => st.plan);
  const selection = useProjectStore((st) => st.selection);
  const { mutate, select } = useProjectStore.getState();
  const [busy, setBusy] = useState(false);
  const [style, setStyle] = useState('');
  const [note, setNote] = useState<string | null>(null);
  if (!plan) return null;

  function add(type: FurnitureType) {
    const p = useProjectStore.getState().plan!;
    const room =
      (selection?.kind === 'room' && p.rooms.find((r) => r.id === selection.id)) || largestRoom(p);
    const b = planBounds(p);
    const at = room ? polygonCentroid(room.points) : { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
    const f = furnitureService.create(p, type, at);
    mutate((d) => {
      d.furniture.push(f);
    });
    select({ kind: 'furniture', id: f.id });
  }

  function rules() {
    const furniture = autoFurnish(plan!);
    mutate((d) => {
      d.furniture = furniture;
    });
    setNote(`Placed ${furniture.length} items with layout rules.`);
  }

  async function ai() {
    setBusy(true);
    setNote(null);
    try {
      const { furniture, source } = await furnitureService.aiFurnish(plan!, style || undefined);
      mutate((d) => {
        d.furniture = furniture;
      });
      setNote(source === 'openai' ? `AI placed ${furniture.length} items.` : `No OPENAI_API_KEY — used layout rules (${furniture.length} items).`);
    } catch (e) {
      setNote((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <PanelSection title="Furniture">
      <div className="space-y-2">
        <input
          className="h-8 w-full rounded-md border border-slate-700 bg-slate-950 px-2 text-xs text-slate-100"
          placeholder="Style (e.g. Scandinavian, luxury, kid-friendly)"
          value={style}
          onChange={(e) => setStyle(e.target.value)}
        />
        <div className="grid grid-cols-2 gap-2">
          <Button size="sm" onClick={ai} disabled={busy || !plan.rooms.length}>
            {busy ? <Loader2 className="animate-spin" /> : <Sparkles />} AI furnish
          </Button>
          <Button size="sm" variant="secondary" onClick={rules} disabled={!plan.rooms.length}>
            <Wand2 /> Auto (rules)
          </Button>
        </div>
        <Button size="sm" variant="ghost" className="w-full" disabled={!plan.furniture.length} onClick={() => mutate((d) => { d.furniture = []; })}>
          <Eraser /> Clear all furniture
        </Button>
        {note && <p className="text-xs text-slate-400">{note}</p>}
      </div>
      <div className={s.grid}>
        {CATALOG_LIST.map((c) => (
          <button key={c.type} className={s.item} onClick={() => add(c.type)} title={`Add ${c.label}`}>
            <span className={s.swatch} style={{ background: c.color }} />
            {c.label}
          </button>
        ))}
      </div>
    </PanelSection>
  );
}
