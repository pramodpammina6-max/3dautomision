'use client';
import { useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { DoorOpen, Focus, Grid3x3, MousePointer2, PenLine, Redo2, Square, Trash2, Undo2, AppWindow } from 'lucide-react';
import { useProjectStore } from '@/common/store/projectStore';
import { clampOpening, dist, projectOnWall, roomAt } from '@/common/geometry/plan';
import { cn } from '@/common/lib/utils';
import type { SelectionKind, Vec2 } from '@/common/types';
import {
  endpointsAt,
  fitViewport,
  nearestWall,
  newOpening,
  newRoom,
  newWall,
  snapPoint,
  toWorld,
  zoomAt,
  type Tool,
  type Viewport,
} from '../service/editorTools';
import { editorStyles as s } from '../styles/editor.styles';
import { PlanLayers } from './PlanLayers';

type Drag =
  | { type: 'pan'; start: Vec2; view: Viewport }
  | { type: 'furniture'; id: string; offset: Vec2 }
  | { type: 'endpoint'; refs: { wallId: string; end: 'a' | 'b' }[] }
  | { type: 'opening'; id: string };

const TOOLS: { id: Tool; label: string; icon: typeof PenLine; hint: string }[] = [
  { id: 'select', label: 'Select', icon: MousePointer2, hint: 'Click to select · drag furniture/openings · drag wall handles · drag empty space to pan' },
  { id: 'wall', label: 'Wall', icon: PenLine, hint: 'Click to start, click to add segments · Esc to finish' },
  { id: 'room', label: 'Room', icon: Square, hint: 'Click corners · click the first point or double-click to close' },
  { id: 'door', label: 'Door', icon: DoorOpen, hint: 'Click on a wall to place a door' },
  { id: 'window', label: 'Window', icon: AppWindow, hint: 'Click on a wall to place a window' },
];

export function FloorplanEditor() {
  const svgRef = useRef<SVGSVGElement>(null);
  const plan = useProjectStore((st) => st.plan);
  const selection = useProjectStore((st) => st.selection);
  const canUndo = useProjectStore((st) => st.past.length > 0);
  const canRedo = useProjectStore((st) => st.future.length > 0);
  const { mutate, checkpoint, select, undo, redo, deleteSelection } = useProjectStore.getState();

  const [tool, setTool] = useState<Tool>('select');
  const [view, setView] = useState<Viewport>({ k: 50, tx: 60, ty: 60 });
  const [gridSnap, setGridSnap] = useState(true);
  const [draft, setDraft] = useState<Vec2[]>([]);
  const [hover, setHover] = useState<Vec2 | null>(null);
  const drag = useRef<Drag | null>(null);

  const fit = useCallback(() => {
    const el = svgRef.current;
    const p = useProjectStore.getState().plan;
    if (el && p) setView(fitViewport(p, el.clientWidth, el.clientHeight));
  }, []);

  useEffect(fit, [fit]);

  const local = (e: { clientX: number; clientY: number }) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const world = (e: { clientX: number; clientY: number }) => {
    const l = local(e);
    return toWorld(view, l.x, l.y);
  };
  const snapped = (p: Vec2) => (plan ? snapPoint(plan, p, gridSnap ? 0.05 : null) : p);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select')) return;
      if (e.key === 'Escape') {
        setDraft([]);
        setTool('select');
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelection();
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deleteSelection, redo, undo]);

  // Wheel zoom (non-passive so the page does not scroll)
  useEffect(() => {
    const el = svgRef.current!;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      setView((v) => zoomAt(v, e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.12 : 1 / 1.12));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  if (!plan) return null;
  const doc = plan;

  function closeRoom(points: Vec2[]) {
    if (points.length < 3) return;
    mutate((p) => {
      p.rooms.push(newRoom(points, p.rooms.length + 1));
    });
    const rooms = useProjectStore.getState().plan!.rooms;
    select({ kind: 'room', id: rooms[rooms.length - 1].id });
    setDraft([]);
    setTool('select');
  }

  function onPointerDown(e: RPointerEvent<SVGSVGElement>) {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const w = world(e);
    const target = e.target as SVGElement;
    const kind = target.dataset.kind as SelectionKind | 'handle' | undefined;
    const id = target.dataset.id;

    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      drag.current = { type: 'pan', start: local(e), view };
      return;
    }

    if (tool === 'wall') {
      const p = snapped(w);
      if (draft.length && dist(draft[0], p) > 0.05) {
        const a = draft[0];
        mutate((pl) => {
          pl.walls.push(newWall(a, p));
        });
      }
      setDraft([p]);
      return;
    }

    if (tool === 'room') {
      const p = snapped(w);
      if (draft.length >= 3 && dist(draft[0], p) < 0.25) closeRoom(draft);
      else setDraft([...draft, p]);
      return;
    }

    if (tool === 'door' || tool === 'window') {
      const hit = nearestWall(doc, w);
      if (!hit) return;
      const o = newOpening(tool, hit.wall, hit.offset);
      mutate((pl) => {
        pl.openings.push(o);
      });
      select({ kind: 'opening', id: o.id });
      setTool('select');
      return;
    }

    // select tool
    if (kind === 'handle' && id) {
      const [wallId, end] = id.split(':') as [string, 'a' | 'b'];
      const wall = doc.walls.find((x) => x.id === wallId)!;
      checkpoint();
      drag.current = { type: 'endpoint', refs: endpointsAt(doc, wall[end]) };
      return;
    }
    if (kind === 'furniture' && id) {
      const f = doc.furniture.find((x) => x.id === id)!;
      select({ kind, id });
      checkpoint();
      drag.current = { type: 'furniture', id, offset: { x: w.x - f.x, y: w.y - f.y } };
      return;
    }
    if (kind === 'opening' && id) {
      select({ kind, id });
      checkpoint();
      drag.current = { type: 'opening', id };
      return;
    }
    if ((kind === 'wall' || kind === 'room') && id) {
      select({ kind, id });
      return;
    }
    select(null);
    drag.current = { type: 'pan', start: local(e), view };
  }

  function onPointerMove(e: RPointerEvent<SVGSVGElement>) {
    const w = world(e);
    setHover(tool === 'select' ? null : snapped(w));
    const d = drag.current;
    if (!d) return;
    if (d.type === 'pan') {
      const l = local(e);
      setView({ ...d.view, tx: d.view.tx + l.x - d.start.x, ty: d.view.ty + l.y - d.start.y });
    } else if (d.type === 'furniture') {
      const grid = gridSnap ? 0.05 : 0.001;
      const nx = Math.round((w.x - d.offset.x) / grid) * grid;
      const ny = Math.round((w.y - d.offset.y) / grid) * grid;
      mutate(
        (p) => {
          const f = p.furniture.find((x) => x.id === d.id);
          if (f) Object.assign(f, { x: +nx.toFixed(3), y: +ny.toFixed(3) });
        },
        { history: false },
      );
    } else if (d.type === 'endpoint') {
      const p = gridSnap ? { x: Math.round(w.x * 20) / 20, y: Math.round(w.y * 20) / 20 } : w;
      mutate(
        (pl) => {
          for (const r of d.refs) {
            const wall = pl.walls.find((x) => x.id === r.wallId);
            if (wall) wall[r.end] = { ...p };
          }
        },
        { history: false },
      );
    } else if (d.type === 'opening') {
      mutate(
        (pl) => {
          const o = pl.openings.find((x) => x.id === d.id);
          const wall = o && pl.walls.find((x) => x.id === o.wallId);
          if (o && wall) Object.assign(o, clampOpening({ ...o, offset: projectOnWall(wall, w).offset }, wall));
        },
        { history: false },
      );
    }
  }

  function onPointerUp() {
    const d = drag.current;
    drag.current = null;
    if (d?.type === 'furniture') {
      mutate(
        (p) => {
          const f = p.furniture.find((x) => x.id === d.id);
          if (f) f.roomId = roomAt(p, f)?.id ?? null;
        },
        { history: false },
      );
    }
  }

  const selectedWall = selection?.kind === 'wall' ? plan.walls.find((w) => w.id === selection.id) : undefined;
  const hint = TOOLS.find((t) => t.id === tool)!.hint;
  const px = (n: number) => n / view.k;

  return (
    <div className={s.root}>
      <div className={s.toolbar}>
        {TOOLS.map((t) => (
          <button
            key={t.id}
            className={cn(s.toolBtn, tool === t.id && s.toolBtnActive)}
            onClick={() => {
              setTool(t.id);
              setDraft([]);
            }}
          >
            <t.icon /> {t.label}
          </button>
        ))}
        <span className={s.divider} />
        <button className={s.toolBtn} onClick={undo} disabled={!canUndo} title="Undo (Ctrl+Z)">
          <Undo2 />
        </button>
        <button className={s.toolBtn} onClick={redo} disabled={!canRedo} title="Redo (Ctrl+Shift+Z)">
          <Redo2 />
        </button>
        <button className={s.toolBtn} onClick={deleteSelection} disabled={!selection} title="Delete (Del)">
          <Trash2 />
        </button>
        <span className={s.divider} />
        <button className={cn(s.toolBtn, gridSnap && 'text-indigo-300')} onClick={() => setGridSnap(!gridSnap)} title="Snap to 5 cm grid">
          <Grid3x3 /> Snap
        </button>
        <button className={s.toolBtn} onClick={fit} title="Fit to screen">
          <Focus />
        </button>
      </div>

      <svg
        ref={svgRef}
        className={s.svg}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={() => tool === 'room' && closeRoom(draft)}
        onContextMenu={(e) => {
          e.preventDefault();
          setDraft([]);
        }}
        style={{ cursor: tool === 'select' ? 'default' : 'crosshair' }}
      >
        <defs>
          <pattern id="grid-minor" width={view.k / 2} height={view.k / 2} patternUnits="userSpaceOnUse" x={view.tx} y={view.ty}>
            <path d={`M ${view.k / 2} 0 L 0 0 0 ${view.k / 2}`} fill="none" stroke="#1e293b" strokeWidth={0.5} />
          </pattern>
          <pattern id="grid-major" width={view.k} height={view.k} patternUnits="userSpaceOnUse" x={view.tx} y={view.ty}>
            <rect width={view.k} height={view.k} fill="url(#grid-minor)" />
            <path d={`M ${view.k} 0 L 0 0 0 ${view.k}`} fill="none" stroke="#273449" strokeWidth={1} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-major)" />

        <g transform={`translate(${view.tx} ${view.ty}) scale(${view.k})`}>
          <PlanLayers plan={plan} selection={selection} k={view.k} />

          {selectedWall &&
            (['a', 'b'] as const).map((end) => (
              <circle
                key={end}
                data-kind="handle"
                data-id={`${selectedWall.id}:${end}`}
                cx={selectedWall[end].x}
                cy={selectedWall[end].y}
                r={px(7)}
                fill="#6366f1"
                stroke="#fff"
                strokeWidth={px(2)}
                style={{ cursor: 'move' }}
              />
            ))}

          {draft.length > 0 && hover && (
            <g pointerEvents="none">
              {tool === 'room' ? (
                <polyline
                  points={[...draft, hover].map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="#6366f133"
                  stroke="#818cf8"
                  strokeWidth={px(2)}
                  strokeDasharray={`${px(6)} ${px(4)}`}
                />
              ) : (
                <>
                  <line x1={draft[0].x} y1={draft[0].y} x2={hover.x} y2={hover.y} stroke="#818cf8" strokeWidth={0.12} strokeOpacity={0.7} />
                  <text x={(draft[0].x + hover.x) / 2} y={(draft[0].y + hover.y) / 2 - px(10)} fontSize={px(12)} fill="#c7d2fe" textAnchor="middle">
                    {dist(draft[0], hover).toFixed(2)} m
                  </text>
                </>
              )}
            </g>
          )}
          {hover && <circle cx={hover.x} cy={hover.y} r={px(4)} fill="#a5b4fc" pointerEvents="none" />}
        </g>
      </svg>
      <div className={s.hint}>{hint}</div>
    </div>
  );
}
