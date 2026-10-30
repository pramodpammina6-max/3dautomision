import { apiFetch } from '@/common/lib/apiClient';
import { API } from '@/common/routes';
import type { FloorPlan } from '@/common/types';
import type { GenerateFloorPlanInput } from './floorplanAi.schemas';

export const floorplanAiService = {
  generate: (input: GenerateFloorPlanInput) =>
    apiFetch<{ plan: FloorPlan; source: 'openai' | 'demo' }>(API.aiFloorplan, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  readFile: (file: File) =>
    new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    }),
};
