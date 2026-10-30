export const editorStyles = {
  root: 'relative h-full w-full select-none overflow-hidden bg-[#0b1020]',
  svg: 'h-full w-full touch-none',
  toolbar:
    'absolute left-3 top-3 z-10 flex flex-wrap items-center gap-1 rounded-xl border border-slate-700/60 bg-slate-950/90 p-1 shadow-lg backdrop-blur',
  toolBtn:
    'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40 [&_svg]:size-4',
  toolBtnActive: 'bg-indigo-600 text-white hover:bg-indigo-500',
  hint: 'pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-full bg-slate-950/85 px-4 py-1.5 text-xs text-slate-300',
  divider: 'mx-1 h-5 w-px bg-slate-700',
};
