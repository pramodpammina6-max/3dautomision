import { redirect } from 'next/navigation';
import { getSession } from '@/common/server/auth';
import { ROUTES } from '@/common/routes';

/** Every route in this group requires a signed-in user. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  if (!(await getSession())) redirect(ROUTES.login);
  return children;
}
