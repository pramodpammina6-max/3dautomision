'use client';
import { create } from 'zustand';
import type { FloorPlan, Selection } from '@/common/types';

const HISTORY_LIMIT = 100;

interface MutateOptions {
  /** false while dragging: the caller pushed one snapshot at drag start via `checkpoint`. */
  history?: boolean;
}

interface ProjectState {
  projectId: string | null;
  name: string;
  plan: FloorPlan | null;
  selection: Selection | null;
  past: FloorPlan[];
  future: FloorPlan[];
  /** Increments on every change; autosave watches it. */
  revision: number;
  load: (projectId: string, name: string, plan: FloorPlan) => void;
  rename: (name: string) => void;
  mutate: (fn: (draft: FloorPlan) => void, opts?: MutateOptions) => void;
  checkpoint: () => void;
  undo: () => void;
  redo: () => void;
  select: (selection: Selection | null) => void;
  deleteSelection: () => void;
}

/**
 * The single shared document store. The 2D editor, 3D viewer, material editor and
 * furniture tools all read and write this plan, which is what keeps 2D and 3D in sync.
 */
export const useProjectStore = create<ProjectState>((set, get) => ({
  projectId: null,
  name: '',
  plan: null,
  selection: null,
  past: [],
  future: [],
  revision: 0,

  load: (projectId, name, plan) =>
    set({ projectId, name, plan, selection: null, past: [], future: [], revision: 0 }),

  rename: (name) => set((s) => ({ name, revision: s.revision + 1 })),

  checkpoint: () => {
    const { plan, past } = get();
    if (plan) set({ past: [...past, structuredClone(plan)].slice(-HISTORY_LIMIT), future: [] });
  },

  mutate: (fn, opts) => {
    const { plan } = get();
    if (!plan) return;
    if (opts?.history !== false) get().checkpoint();
    const draft = structuredClone(plan);
    fn(draft);
    set((s) => ({ plan: draft, revision: s.revision + 1 }));
  },

  undo: () => {
    const { past, plan, future } = get();
    if (!past.length || !plan) return;
    set((s) => ({
      plan: past[past.length - 1],
      past: past.slice(0, -1),
      future: [plan, ...future],
      revision: s.revision + 1,
    }));
  },

  redo: () => {
    const { past, plan, future } = get();
    if (!future.length || !plan) return;
    set((s) => ({
      plan: future[0],
      past: [...past, plan],
      future: future.slice(1),
      revision: s.revision + 1,
    }));
  },

  select: (selection) => set({ selection }),

  deleteSelection: () => {
    const sel = get().selection;
    if (!sel) return;
    get().mutate((p) => {
      if (sel.kind === 'wall') {
        p.walls = p.walls.filter((w) => w.id !== sel.id);
        p.openings = p.openings.filter((o) => o.wallId !== sel.id);
      } else if (sel.kind === 'opening') {
        p.openings = p.openings.filter((o) => o.id !== sel.id);
      } else if (sel.kind === 'room') {
        p.rooms = p.rooms.filter((r) => r.id !== sel.id);
      } else {
        p.furniture = p.furniture.filter((f) => f.id !== sel.id);
      }
    });
    set({ selection: null });
  },
}));
