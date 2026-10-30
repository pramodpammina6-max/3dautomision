'use client';
import { useEffect, useState } from 'react';
import { Footprints, Orbit, PersonStanding, Sparkles } from 'lucide-react';
import { cn } from '@/common/lib/utils';
import { useProjectStore } from '@/common/store/projectStore';
import { ModelViewer, type Engine, type Quality } from '@/features/model-generation';
import { EnterVrButton } from '@/features/xr';
import { startAvatar } from '../service/avatar';
import { startFirstPerson } from '../service/firstPerson';
import { spawnPoint } from '../service/spawn';
import { walkthroughStyles as s } from '../styles/walkthrough.styles';

type Mode = 'orbit' | 'first-person' | 'avatar';

const HINTS: Record<Mode, string> = {
  orbit: 'Drag to orbit · scroll to zoom · pick a walk mode above',
  'first-person': 'Click to look around · WASD to walk · Shift to run · Esc to release mouse',
  avatar: 'WASD to walk the avatar · drag to turn the camera · scroll to zoom · Shift to run',
};

export function WalkthroughContainer() {
  const [engine, setEngine] = useState<Engine | null>(null);
  const [mode, setMode] = useState<Mode>('avatar');
  const [quality, setQuality] = useState<Quality>('high');
  const [color, setColor] = useState('#4f46e5');
  const [inVr, setInVr] = useState(false);
  const hasPlan = useProjectStore((st) => !!st.plan?.rooms.length);

  useEffect(() => {
    const plan = useProjectStore.getState().plan;
    if (!engine || !plan || inVr) return;
    engine.setSelection(null);
    if (mode === 'orbit') {
      engine.setOrbitEnabled(true);
      engine.setPicking(true);
      engine.fitView();
      return;
    }
    engine.setOrbitEnabled(false);
    engine.setPicking(false);
    const start = spawnPoint(plan);
    const stop = mode === 'first-person' ? startFirstPerson(engine, start) : startAvatar(engine, start, color);
    return () => {
      stop();
      engine.setPicking(true);
    };
  }, [engine, mode, color, inVr]);

  return (
    <ModelViewer ceilings={mode !== 'orbit' || inVr} toolbar={false} onEngine={setEngine} hint={hasPlan ? HINTS[mode] : 'Add rooms in the 2D plan to walk through them'}>
      <div className={s.bar}>
        <button className={cn(s.btn, mode === 'avatar' && s.active)} onClick={() => setMode('avatar')}>
          <PersonStanding /> Avatar
        </button>
        <button className={cn(s.btn, mode === 'first-person' && s.active)} onClick={() => setMode('first-person')}>
          <Footprints /> First person
        </button>
        <button className={cn(s.btn, mode === 'orbit' && s.active)} onClick={() => setMode('orbit')}>
          <Orbit /> Orbit
        </button>
        {mode === 'avatar' && (
          <input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-7 w-8 cursor-pointer rounded bg-transparent" title="Avatar colour" />
        )}
        <span className="mx-1 h-5 w-px bg-slate-700" />
        <label className={cn(s.btn, 'pr-1')} title="Realistic view quality">
          <Sparkles />
          <select
            className={s.select}
            value={quality}
            onChange={(e) => {
              const q = e.target.value as Quality;
              setQuality(q);
              engine?.setQuality(q);
            }}
          >
            <option value="draft">Draft</option>
            <option value="high">High</option>
            <option value="ultra">Ultra (4K + AO)</option>
          </select>
        </label>
        <span className="mx-1 h-5 w-px bg-slate-700" />
        <EnterVrButton engine={engine} onStart={() => setInVr(true)} onEnd={() => setInVr(false)} />
      </div>
    </ModelViewer>
  );
}
