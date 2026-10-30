import { WorkspaceContainer, type WorkspaceTab } from '@/features/project-workspace';

export const metadata = { title: 'Workspace · Metaverse Automation' };

const TABS: WorkspaceTab[] = ['2d', 'split', '3d', 'walk', 'render'];

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const initialTab = TABS.includes(tab as WorkspaceTab) ? (tab as WorkspaceTab) : '2d';
  return <WorkspaceContainer projectId={id} initialTab={initialTab} />;
}
