import Link from 'next/link';
import { buttonVariants } from '@/common/components/ui/button';
import { Logo } from '@/common/components/Logo';
import { ROUTES } from '@/common/routes';
import { LANDING_FEATURES } from '../service/content';
import { landingStyles as s } from '../styles/landing.styles';

export function LandingContainer({ signedIn }: { signedIn: boolean }) {
  return (
    <main className={s.page}>
      <nav className={s.nav}>
        <Logo />
        <div className="flex gap-2">
          {signedIn ? (
            <Link href={ROUTES.dashboard} className={buttonVariants()}>
              Open dashboard
            </Link>
          ) : (
            <>
              <Link href={ROUTES.login} className={buttonVariants({ variant: 'ghost' })}>
                Sign in
              </Link>
              <Link href={ROUTES.signup} className={buttonVariants()}>
                Get started
              </Link>
            </>
          )}
        </div>
      </nav>
      <section className={s.hero}>
        <h1 className={s.h1}>From floor plan to metaverse in minutes</h1>
        <p className={s.lead}>
          Upload a 2D floor plan, let AI build the 3D model, furnish it, restyle every surface, then walk through it
          as an avatar or in VR — and export 4K renders.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link href={signedIn ? ROUTES.dashboard : ROUTES.signup} className={buttonVariants({ size: 'lg' })}>
            {signedIn ? 'Go to projects' : 'Create free account'}
          </Link>
        </div>
      </section>
      <section className={s.grid}>
        {LANDING_FEATURES.map(([title, text]) => (
          <div key={title} className={s.card}>
            <p className="font-medium text-white">{title}</p>
            <p className="mt-2 text-sm text-slate-400">{text}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
