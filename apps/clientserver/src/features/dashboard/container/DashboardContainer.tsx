'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Armchair,
  Box,
  Clapperboard,
  FilePlus2,
  Footprints,
  Glasses,
  Loader2,
  Palette,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { emptyFloorPlan, sampleFloorPlan } from '@metaverse/floorplan-schema';
import { Button } from '@/common/components/ui/button';
import { ROUTES } from '@/common/routes';
import type { ProjectSummary } from '@/common/types';
import { projectService } from '../service/projectService';
import { dashboardStyles as s } from '../styles/dashboard.styles';

const FEATURES = [
  { icon: Upload, title: '2D floor plan → 3D', text: 'Upload a floor plan image; AI converts it to an editable 3D model.' },
  { icon: Box, title: '2D customisation & 3D generation', text: 'Draw walls, rooms, doors and windows; the 3D model rebuilds live.' },
  { icon: Armchair, title: 'Auto furniture population', text: 'Furnish every room automatically; move items in 2D or 3D.' },
  { icon: Palette, title: 'Material customisation', text: 'Swap paint, wood, tile, marble and fabric on any surface.' },
  { icon: Footprints, title: 'Walkthrough & avatar', text: 'Explore first-person or as an avatar with collision.' },
  { icon: Glasses, title: 'WebXR / VR', text: 'Step inside on Meta Quest 3 with teleport locomotion.' },
  { icon: Sparkles, title: 'Realistic 4K view', text: 'ACES tone mapping, IBL, soft shadows and ambient occlusion.' },
  { icon: Clapperboard, title: 'Render image & video', text: 'Export up to 4K stills and fly-through videos.' },
];

export function DashboardContainer({ userName }: { userName: string }) {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectSummary[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    projectService.list().then(setProjects).catch((e) => setError(e.message));
  }, []);

  async function create(kind: 'blank' | 'sample') {
    setBusy(kind);
    try {
      const plan = kind === 'sample' ? sampleFloorPlan() : emptyFloorPlan();
      const project = await projectService.create(plan.name, plan);
      router.push(ROUTES.project(project.id));
    } catch (e) {
      setError((e as Error).message);
      setBusy(null);
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete this project?')) return;
    await projectService.remove(id);
    setProjects((p) => p?.filter((x) => x.id !== id) ?? null);
  }

  return (
    <div className={s.page}>
      <div className={s.header}>
        <div>
          <h1 className={s.title}>Hi {userName.split(' ')[0]} 👋</h1>
          <p className={s.sub}>Start a new space or continue where you left off.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => router.push(ROUTES.importPlan)}>
            <Upload /> Import 2D plan (AI)
          </Button>
          <Button variant="secondary" onClick={() => create('sample')} disabled={!!busy}>
            {busy === 'sample' ? <Loader2 className="animate-spin" /> : <Sparkles />} Sample apartment
          </Button>
          <Button variant="outline" onClick={() => create('blank')} disabled={!!busy}>
            {busy === 'blank' ? <Loader2 className="animate-spin" /> : <FilePlus2 />} Blank plan
          </Button>
        </div>
      </div>

      {error && <p className="mb-6 rounded-lg bg-rose-950/60 p-3 text-sm text-rose-300">{error}</p>}

      <div className={s.featureGrid}>
        {FEATURES.map((f) => (
          <div key={f.title} className={s.featureCard}>
            <span className={s.featureIcon}>
              <f.icon className="size-5" />
            </span>
            <div>
              <p className="font-medium text-white">{f.title}</p>
              <p className="mt-1 text-sm text-slate-400">{f.text}</p>
            </div>
          </div>
        ))}
      </div>

      <h2 className={s.sectionTitle}>Your projects</h2>
      {projects === null ? (
        <Loader2 className="animate-spin text-slate-500" />
      ) : projects.length === 0 ? (
        <div className={s.empty}>No projects yet — import a floor plan or open the sample apartment.</div>
      ) : (
        <div className={s.projectGrid}>
          {projects.map((p) => (
            <div key={p.id} className={s.projectCard}>
              <Link href={ROUTES.project(p.id)} className="block">
                <p className="font-medium text-white">{p.name}</p>
                <p className="mt-1 text-xs text-slate-500">Updated {new Date(p.updatedAt).toLocaleString()}</p>
                <p className="mt-3 text-sm text-slate-400">
                  {p.stats.rooms} rooms · {p.stats.walls} walls · {p.stats.furniture} items
                </p>
              </Link>
              <button
                className="absolute right-3 top-3 rounded p-1.5 text-slate-500 hover:bg-slate-800 hover:text-rose-400"
                onClick={() => remove(p.id)}
                aria-label="Delete project"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
