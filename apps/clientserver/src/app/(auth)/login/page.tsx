import { AuthForm } from '@/features/auth';

export const metadata = { title: 'Sign in · Metaverse Automation' };

export default function LoginPage() {
  return <AuthForm mode="login" />;
}
