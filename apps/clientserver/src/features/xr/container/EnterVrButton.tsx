'use client';
import { useEffect, useState } from 'react';
import { Glasses } from 'lucide-react';
import type { Engine } from '@/features/model-generation';
import * as THREE from 'three';
import { spawnPoint2d } from '@/common/geometry/plan';
import { enterVr, isVrSupported } from '../service/xrSession';
import { xrStyles as s } from '../styles/xr.styles';

export function EnterVrButton({ engine, onStart, onEnd }: { engine: Engine | null; onStart?: () => void; onEnd?: () => void }) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    isVrSupported().then(setSupported);
  }, []);

  async function start() {
    const plan = engine?.getPlan();
    if (!engine || !plan) return;
    setError(null);
    try {
      onStart?.();
      const p = spawnPoint2d(plan);
      const session = await enterVr(engine, new THREE.Vector3(p.x, 0, p.y), () => {
        setActive(false);
        onEnd?.();
      });
      setActive(true);
      return session;
    } catch (e) {
      setError((e as Error).message);
      onEnd?.();
    }
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button
        className={s.button}
        disabled={!supported || active || !engine}
        onClick={start}
        title={supported ? 'Enter immersive VR (Meta Quest 3)' : 'WebXR VR not available — open this page in the Meta Quest browser, or use the Immersive Web Emulator extension'}
      >
        <Glasses /> {active ? 'In VR' : supported === false ? 'VR unavailable' : 'Enter VR'}
      </button>
      {error && <span className="text-xs text-rose-300">{error}</span>}
    </span>
  );
}
