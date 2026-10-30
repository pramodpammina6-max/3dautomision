import { getSession } from '@/common/server/auth';
import { LandingContainer } from '@/features/landing';

export default async function HomePage() {
  return <LandingContainer signedIn={!!(await getSession())} />;
}
