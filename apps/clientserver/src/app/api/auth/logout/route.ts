import { destroySession } from '@/common/server/auth';
import { handle, ok } from '@/common/server/http';

export const POST = handle(async () => {
  await destroySession();
  return ok({ ok: true });
});
