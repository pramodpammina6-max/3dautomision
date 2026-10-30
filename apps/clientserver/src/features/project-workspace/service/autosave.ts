'use client';
import { useEffect, useState } from 'react';
import { useProjectStore } from '@/common/store/projectStore';
import { projectService } from '@/features/dashboard';

export type SaveStatus = 'saved' | 'pending' | 'saving' | 'error';

/** Debounced autosave of the shared plan to MongoDB via the projects API. */
export function useAutosave(delay = 1200): SaveStatus {
  const revision = useProjectStore((s) => s.revision);
  const [savedRevision, setSavedRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (revision === 0) return;
    const timer = setTimeout(async () => {
      const { projectId, name, plan } = useProjectStore.getState();
      if (!projectId || !plan) return;
      setSaving(true);
      try {
        await projectService.update(projectId, { name, plan: { ...plan, name } });
        setSavedRevision(revision);
        setFailed(false);
      } catch {
        setFailed(true);
      } finally {
        setSaving(false);
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [revision, delay]);

  if (failed) return 'error';
  if (saving) return 'saving';
  return revision > savedRevision ? 'pending' : 'saved';
}
