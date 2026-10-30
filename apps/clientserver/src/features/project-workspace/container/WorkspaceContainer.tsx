'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowLeft, Box, Clapperboard, Columns2, Footprints, Loader2, PencilRuler } from 'lucide-react';
import { cn } from '@/common/lib/utils';
import { ROUTES } from '@/common/routes';
import { useProjectStore } from '@/common/store/projectStore';
import { projectService } from '@/features/dashboard';
import { FloorplanEditor, PropertiesPanel } from '@/features/floorplan-editor';
import { FurniturePanel } from '@/features/furniture';
import { MaterialPanel } from '@/features/material-editor';
import { ModelViewer } from '@/features/model-generation';
import { RenderContainer } from '@/features/render';
import { WalkthroughContainer } from '@/features/walkthrough';
import { useAutosave } from '../service/autosave';
import { workspaceStyles as s } from '../styles/workspace.styles';

export type WorkspaceTab = '2d' | 'split' | '3d' | 'walk' | 'render';

const TABS: { id: WorkspaceTab; label: string; icon: typeof Box }[] = [
  { id: '2d', label: '2D Plan', icon: PencilRuler },
  { id: 'split', label: '2D ⇄ 3D', icon: Columns2 },
  { id: '3d', label: '3D & Materials', icon: Box },
  { id: 'walk', label: 'Walkthrough & VR', icon: Footprints },
  { id: 'render', label: 'Render', icon: Clapperboard },
];

const STATUS = {
  saved: { text: 'All changes saved', cls: 'text-slate-500' },
  pending: { text: 'Unsaved…', cls: 'text-amber-400' },
  saving: { text: 'Saving…', cls: 'text-slate-400' },
  error: { text: 'Save failed', cls: 'text-rose-400' },
};

export function WorkspaceContainer({ projectId, initialTab = '2d' }: { projectId: string; initialTab?: WorkspaceTab }) {
  const [tab, setTab] = useState<WorkspaceTab>(initialTab);
  const [error, setError] = useState<string | null>(null);
  const loaded = useProjectStore((st) => st.projectId === projectId && !!st.plan);
  const name = useProjectStore((st) => st.name);
  const status = useAutosave();

  useEffect(() => {
    projectService
      .get(projectId)
      .then((p) => useProjectStore.getState().load(p.id, p.name, p.plan))
      .catch((e) => setError(e.message));
  }, [projectId]);

  if (error) {
    return (
      <div className="grid h-screen place-items-center text-slate-300">
        <div className="text-center">
          <p className="mb-4">{error}</p>
          <Link href={ROUTES.dashboard} className="text-indigo-400">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }
  if (!loaded) {
    return (
      <div className="grid h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-slate-500" />
      </div>
    );
  }

  return (
    <div className={s.shell}>
      <header className={s.header}>
        <Link href={ROUTES.dashboard} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Back">
          <ArrowLeft className="size-4" />
        </Link>
        <input className={s.nameInput} value={name} onChange={(e) => useProjectStore.getState().rename(e.target.value)} aria-label="Project name" />
        <nav className={s.tabs}>
          {TABS.map((t) => (
            <button key={t.id} className={cn(s.tab, tab === t.id && s.tabActive)} onClick={() => setTab(t.id)}>
              <t.icon /> <span className="hidden md:inline">{t.label}</span>
            </button>
          ))}
        </nav>
        <span className={cn(s.status, STATUS[status].cls)}>{STATUS[status].text}</span>
      </header>

      <div className={s.body}>
        {tab === '2d' && (
          <>
            <main className={s.main}>
              <FloorplanEditor />
            </main>
            <aside className={s.side}>
              <PropertiesPanel />
              <FurniturePanel />
            </aside>
          </>
        )}
        {tab === 'split' && (
          <>
            <main className={cn(s.main, 'grid grid-cols-2 gap-px bg-slate-800')}>
              <div className="relative">
                <FloorplanEditor />
              </div>
              <div className="relative">
                <ModelViewer hint="Select or move furniture here or in 2D — both stay in sync" />
              </div>
            </main>
            <aside className={s.side}>
              <PropertiesPanel />
              <MaterialPanel />
            </aside>
          </>
        )}
        {tab === '3d' && (
          <>
            <main className={s.main}>
              <ModelViewer hint="Click any surface or item to edit its material · drag the gizmo to move furniture" />
            </main>
            <aside className={s.side}>
              <MaterialPanel />
              <PropertiesPanel />
              <FurniturePanel />
            </aside>
          </>
        )}
        {tab === 'walk' && (
          <main className={s.main}>
            <WalkthroughContainer />
          </main>
        )}
        {tab === 'render' && (
          <main className={s.main}>
            <RenderContainer />
          </main>
        )}
      </div>
    </div>
  );
}
