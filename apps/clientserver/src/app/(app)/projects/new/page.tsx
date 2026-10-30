import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ROUTES } from '@/common/routes';
import { FloorplanImportContainer } from '@/features/floorplan-ai';

export const metadata = { title: 'Import floor plan · Metaverse Automation' };

export default function NewProjectPage() {
  return (
    <>
      <header className="border-b border-slate-800">
        <div className="mx-auto flex h-14 max-w-7xl items-center px-6">
          <Link href={ROUTES.dashboard} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white">
            <ArrowLeft className="size-4" /> Dashboard
          </Link>
        </div>
      </header>
      <FloorplanImportContainer />
    </>
  );
}
