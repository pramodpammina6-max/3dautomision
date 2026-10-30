import { requireSession } from '@/common/server/auth';
import { handle, ok } from '@/common/server/http';
import { FurnishSchema, furnishPlan } from '@/features/furniture/service/furnish.server';

export const maxDuration = 120;

export const POST = handle(async (req: Request) => {
  await requireSession();
  const { plan, style } = FurnishSchema.parse(await req.json());
  return ok(await furnishPlan(plan, style));
});
