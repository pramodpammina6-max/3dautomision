import Link from 'next/link';
import { Box } from 'lucide-react';
import { ROUTES } from '@/common/routes';

export function Logo({ href = ROUTES.home }: { href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-semibold text-white">
      <span className="grid size-8 place-items-center rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500">
        <Box className="size-4" />
      </span>
      Metaverse Automation
    </Link>
  );
}
