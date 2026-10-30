import { AuthForm } from '@/features/auth';

export const metadata = { title: 'Create account · Metaverse Automation' };

export default function SignupPage() {
  return <AuthForm mode="signup" />;
}
