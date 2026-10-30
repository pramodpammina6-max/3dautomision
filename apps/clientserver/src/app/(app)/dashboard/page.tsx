import { Logo } from '@/common/components/Logo';
import { UserMenu } from '@/common/components/UserMenu';
import { getSession } from '@/common/server/auth';
import { ROUTES } from '@/common/routes';
import { DashboardContainer } from '@/features/dashboard';

export const metadata = { title: 'Dashboard · Metaverse Automation' };

export default async function DashboardPage() {
  const session = (await getSession())!;
  return (
    <>
      <header className="border-b border-slate-800 bg-slate-950/80">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Logo href={ROUTES.dashboard} />
          <UserMenu name={session.name} />
        </div>
      </header>
      <DashboardContainer userName={session.name} />
    </>
  );
}
