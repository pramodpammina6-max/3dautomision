import { requireSession } from '@/common/server/auth';
import { handle, ok } from '@/common/server/http';
import {
  CreateProjectSchema,
  createProject,
  listProjects,
} from '@/features/dashboard/service/project.server';

export const GET = handle(async () => {
  const { userId } = await requireSession();
  return ok({ projects: await listProjects(userId) });
});

export const POST = handle(async (req: Request) => {
  const { userId } = await requireSession();
  const input = CreateProjectSchema.parse(await req.json());
  return ok({ project: await createProject(userId, input) }, { status: 201 });
});
