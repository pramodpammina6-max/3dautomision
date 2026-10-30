'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Download, Focus, Move3d, Rotate3d, Sparkles } from 'lucide-react';
import { useProjectStore } from '@/common/store/projectStore';
import { roomAt } from '@/common/geometry/plan';
import { cn } from '@/common/lib/utils';
import { Engine, type Quality, type TransformMode } from '../service/engine';
import { exportGlb } from '../service/exportModel';
import { viewerStyles as s } from '../styles/viewer.styles';

interface Props {
  ceilings?: boolean;
  /** Orbit/edit tools. Walkthrough hides them. */
  toolbar?: boolean;
  onEngine?: (engine: Engine | null) => void;
  children?: ReactNode;
  hint?: string;
}

export function ModelViewer({ ceilings = false, toolbar = true, onEngine, children, hint }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [engine, setEngine] = useState<Engine | null>(null);
  const [quality, setQuality] = useState<Quality>('high');
  const [mode, setMode] = useState<TransformMode>('translate');
  const plan = useProjectStore((st) => st.plan);
  const selection = useProjectStore((st) => st.selection);
  const name = useProjectStore((st) => st.name);
  const onEngineRef = useRef(onEngine);
  useEffect(() => {
    onEngineRef.current = onEngine;
  }, [onEngine]);

  useEffect(() => {
    const e = new Engine(hostRef.current!);
    const store = useProjectStore.getState;
    e.onSelect = (sel) => store().select(sel);
    // 3D → 2D sync: furniture moved/rotated with the gizmo is written back to the shared plan.
    e.onFurnitureTransform = (t) =>
      store().mutate((p) => {
        const f = p.furniture.find((x) => x.id === t.id);
        if (!f) return;
        Object.assign(f, { x: t.x, y: t.y, rotation: t.rotation });
        f.roomId = roomAt(p, f)?.id ?? null;
      });
    setEngine(e);
    onEngineRef.current?.(e);
    return () => {
      onEngineRef.current?.(null);
      e.dispose();
    };
  }, []);

  useEffect(() => {
    if (engine && plan) engine.setPlan(plan, ceilings);
  }, [engine, plan, ceilings]);

  useEffect(() => {
    engine?.setSelection(selection);
  }, [engine, selection]);

  return (
    <div className={s.root}>
      <div ref={hostRef} className={s.canvasHost} />
      {toolbar && engine && (
        <div className={s.toolbar}>
          <button className={cn(s.toolBtn, mode === 'translate' && s.toolBtnActive)} onClick={() => { setMode('translate'); engine.setTransformMode('translate'); }} title="Move furniture">
            <Move3d /> Move
          </button>
          <button className={cn(s.toolBtn, mode === 'rotate' && s.toolBtnActive)} onClick={() => { setMode('rotate'); engine.setTransformMode('rotate'); }} title="Rotate furniture">
            <Rotate3d /> Rotate
          </button>
          <span className="mx-1 h-5 w-px bg-slate-700" />
          <button className={s.toolBtn} onClick={() => engine.fitView()} title="Fit view">
            <Focus /> Fit
          </button>
          <label className={cn(s.toolBtn, 'pr-1')} title="Realistic view quality">
            <Sparkles />
            <select className={s.select} value={quality} onChange={(ev) => { const q = ev.target.value as Quality; setQuality(q); engine.setQuality(q); }}>
              <option value="draft">Draft</option>
              <option value="high">High</option>
              <option value="ultra">Ultra (4K + AO)</option>
            </select>
          </label>
          <button className={s.toolBtn} onClick={() => exportGlb(engine.planGroup, name)} title="Download 3D model as GLB">
            <Download /> GLB
          </button>
        </div>
      )}
      {hint && <div className={s.hint}>{hint}</div>}
      {children}
    </div>
  );
}
