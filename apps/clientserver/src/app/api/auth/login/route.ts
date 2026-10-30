import { LoginSchema } from '@/features/auth/service/auth.schemas';
import { authenticate } from '@/features/auth/service/auth.server';
import { createSession } from '@/common/server/auth';
import { handle, ok } from '@/common/server/http';

export const POST = handle(async (req: Request) => {
  const input = LoginSchema.parse(await req.json());
  const user = await authenticate(input);
  await createSession({ userId: user.id, email: user.email, name: user.name });
  return ok({ user });
});
