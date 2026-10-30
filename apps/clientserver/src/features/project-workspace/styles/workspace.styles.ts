export const workspaceStyles = {
  shell: 'flex h-screen flex-col bg-slate-950',
  header: 'flex h-14 shrink-0 items-center gap-3 border-b border-slate-800 bg-slate-900 px-4',
  nameInput:
    'h-8 w-56 rounded-md border border-transparent bg-transparent px-2 text-sm font-medium text-white hover:border-slate-700 focus:border-indigo-500 focus:outline-none',
  tabs: 'mx-auto flex items-center gap-1 rounded-xl bg-slate-950 p-1',
  tab: 'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-medium text-slate-400 hover:text-white [&_svg]:size-4',
  tabActive: 'bg-slate-800 text-white',
  body: 'flex min-h-0 flex-1',
  main: 'relative min-w-0 flex-1',
  side: 'w-80 shrink-0 overflow-y-auto border-l border-slate-800 bg-slate-900',
  status: 'w-24 text-right text-xs',
};
