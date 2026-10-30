export const viewerStyles = {
  root: 'relative h-full w-full overflow-hidden bg-slate-200',
  canvasHost: 'absolute inset-0',
  toolbar:
    'absolute left-3 top-3 z-10 flex flex-wrap items-center gap-1 rounded-xl border border-slate-700/60 bg-slate-950/85 p-1 shadow-lg backdrop-blur',
  toolBtn:
    'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white [&_svg]:size-4',
  toolBtnActive: 'bg-indigo-600 text-white hover:bg-indigo-500',
  select: 'h-8 rounded-lg border-0 bg-slate-800 px-2 text-xs text-slate-100',
  hint: 'pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-slate-950/80 px-4 py-1.5 text-xs text-slate-300',
};
