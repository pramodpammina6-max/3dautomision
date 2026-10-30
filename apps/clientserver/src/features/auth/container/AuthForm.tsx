'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/common/components/ui/button';
import { Card } from '@/common/components/ui/card';
import { Input, Label } from '@/common/components/ui/input';
import { Logo } from '@/common/components/Logo';
import { ROUTES } from '@/common/routes';
import { LoginSchema, SignupSchema } from '../service/auth.schemas';
import { authService } from '../service/authService';
import { authStyles as s } from '../styles/auth.styles';

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const isSignup = mode === 'signup';

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const raw = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = (isSignup ? SignupSchema : LoginSchema).safeParse(raw);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      return;
    }
    setPending(true);
    try {
      if (isSignup) await authService.signup(parsed.data as never);
      else await authService.login(parsed.data);
      router.push(ROUTES.dashboard);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setPending(false);
    }
  }

  return (
    <main className={s.page}>
      <div className={s.card}>
        <Logo />
        <Card className="space-y-6 p-8">
          <div className="space-y-1">
            <h1 className={s.heading}>{isSignup ? 'Create your account' : 'Welcome back'}</h1>
            <p className={s.sub}>
              {isSignup
                ? 'Turn 2D floor plans into explorable 3D and VR spaces.'
                : 'Sign in to continue to your projects.'}
            </p>
          </div>
          <form className={s.form} onSubmit={onSubmit} noValidate>
            {isSignup && (
              <div className={s.field}>
                <Label htmlFor="name">Full name</Label>
                <Input id="name" name="name" autoComplete="name" placeholder="Ada Lovelace" />
              </div>
            )}
            <div className={s.field}>
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@company.com" />
            </div>
            <div className={s.field}>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete={isSignup ? 'new-password' : 'current-password'}
                placeholder={isSignup ? 'At least 8 characters' : '••••••••'}
              />
            </div>
            {error && <p className={s.error}>{error}</p>}
            <Button type="submit" className="w-full" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {isSignup ? 'Create account' : 'Sign in'}
            </Button>
          </form>
        </Card>
        <p className={s.footer}>
          {isSignup ? 'Already have an account? ' : "Don't have an account? "}
          <Link className={s.link} href={isSignup ? ROUTES.login : ROUTES.signup}>
            {isSignup ? 'Sign in' : 'Sign up'}
          </Link>
        </p>
      </div>
    </main>
  );
}
