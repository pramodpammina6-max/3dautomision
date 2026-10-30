'use client';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';
import { Button } from '@/common/components/ui/button';
import { API, ROUTES } from '@/common/routes';

export function UserMenu({ name }: { name: string }) {
  const router = useRouter();
  return (
    <div className="flex items-center gap-3">
      <span className="hidden text-sm text-slate-400 sm:inline">{name}</span>
      <Button
        variant="ghost"
        size="sm"
        onClick={async () => {
          await fetch(API.logout, { method: 'POST' });
          router.push(ROUTES.login);
          router.refresh();
        }}
      >
        <LogOut /> Sign out
      </Button>
    </div>
  );
}
