import { requireSession } from '@/common/server/auth';
import { handle, ok } from '@/common/server/http';

export const GET = handle(async () => {
  const s = await requireSession();
  return ok({ user: { id: s.userId, name: s.name, email: s.email } });
});
