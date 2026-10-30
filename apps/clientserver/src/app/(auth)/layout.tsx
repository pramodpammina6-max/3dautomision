import { redirect } from 'next/navigation';
import { getSession } from '@/common/server/auth';
import { ROUTES } from '@/common/routes';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  if (await getSession()) redirect(ROUTES.dashboard);
  return children;
}
