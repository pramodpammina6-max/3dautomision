import { apiFetch } from '@/common/lib/apiClient';
import { API } from '@/common/routes';
import type { FloorPlan, ProjectDetail, ProjectSummary } from '@/common/types';

export const projectService = {
  list: () => apiFetch<{ projects: ProjectSummary[] }>(API.projects).then((r) => r.projects),
  get: (id: string) => apiFetch<{ project: ProjectDetail }>(API.project(id)).then((r) => r.project),
  create: (name: string, plan: FloorPlan) =>
    apiFetch<{ project: ProjectDetail }>(API.projects, {
      method: 'POST',
      body: JSON.stringify({ name, plan }),
    }).then((r) => r.project),
  update: (id: string, patch: { name?: string; plan?: FloorPlan }) =>
    apiFetch<{ project: ProjectDetail }>(API.project(id), {
      method: 'PUT',
      body: JSON.stringify(patch),
    }).then((r) => r.project),
  remove: (id: string) => apiFetch<{ ok: true }>(API.project(id), { method: 'DELETE' }),
};
