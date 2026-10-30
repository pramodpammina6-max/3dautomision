import { requireSession } from '@/common/server/auth';
import { handle, ok } from '@/common/server/http';
import { GenerateFloorPlanSchema } from '@/features/floorplan-ai/service/floorplanAi.schemas';
import { generateFloorPlan } from '@/features/floorplan-ai/service/floorplanAi.server';

export const maxDuration = 120;

export const POST = handle(async (req: Request) => {
  await requireSession();
  const input = GenerateFloorPlanSchema.parse(await req.json());
  return ok(await generateFloorPlan(input));
});
