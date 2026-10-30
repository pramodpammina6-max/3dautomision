import { requireSession } from '@/common/server/auth';
import { handle, ok } from '@/common/server/http';
import {
  UpdateProjectSchema,
  deleteProject,
  getProject,
  updateProject,
} from '@/features/dashboard/service/project.server';

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (_req: Request, { params }: Ctx) => {
  const { userId } = await requireSession();
  return ok({ project: await getProject(userId, (await params).id) });
});

export const PUT = handle(async (req: Request, { params }: Ctx) => {
  const { userId } = await requireSession();
  const patch = UpdateProjectSchema.parse(await req.json());
  return ok({ project: await updateProject(userId, (await params).id, patch) });
});

export const DELETE = handle(async (_req: Request, { params }: Ctx) => {
  const { userId } = await requireSession();
  await deleteProject(userId, (await params).id);
  return ok({ ok: true });
});
