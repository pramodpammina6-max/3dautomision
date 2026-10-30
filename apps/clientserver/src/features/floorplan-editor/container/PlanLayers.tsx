import type { FloorPlan, Selection } from '@/common/types';
import { pointOnWall, polygonArea, polygonCentroid, wallDir } from '@/common/geometry/plan';
import { CATALOG } from '@/features/furniture/service/catalog';
import { ROOM_COLORS } from '../service/editorTools';

const SEL = '#6366f1';

/** Pure SVG rendering of a plan in world units (metres). data-kind/data-id drive hit-testing. */
export function PlanLayers({ plan, selection, k = 50 }: { plan: FloorPlan; selection?: Selection | null; k?: number }) {
  const isSel = (kind: Selection['kind'], id: string) => selection?.kind === kind && selection.id === id;
  const px = (n: number) => n / k; // screen pixels → metres
  return (
    <>
      {plan.rooms.map((r) => (
        <polygon
          key={r.id}
          data-kind="room"
          data-id={r.id}
          points={r.points.map((p) => `${p.x},${p.y}`).join(' ')}
          fill={ROOM_COLORS[r.type]}
          fillOpacity={isSel('room', r.id) ? 0.55 : 0.28}
          stroke={isSel('room', r.id) ? SEL : 'none'}
          strokeWidth={px(2)}
        />
      ))}

      {plan.walls.map((w) => (
        <line
          key={w.id}
          data-kind="wall"
          data-id={w.id}
          x1={w.a.x}
          y1={w.a.y}
          x2={w.b.x}
          y2={w.b.y}
          stroke={isSel('wall', w.id) ? SEL : '#e2e8f0'}
          strokeWidth={w.thickness}
          strokeLinecap="square"
        />
      ))}

      {plan.openings.map((o) => {
        const w = plan.walls.find((x) => x.id === o.wallId);
        if (!w) return null;
        const c = pointOnWall(w, o.offset);
        const d = wallDir(w);
        const n = { x: -d.y, y: d.x };
        const p0 = { x: c.x - (d.x * o.width) / 2, y: c.y - (d.y * o.width) / 2 };
        const p1 = { x: c.x + (d.x * o.width) / 2, y: c.y + (d.y * o.width) / 2 };
        const color = isSel('opening', o.id) ? SEL : o.kind === 'door' ? '#fbbf24' : '#38bdf8';
        return (
          <g key={o.id} data-kind="opening" data-id={o.id}>
            <line data-kind="opening" data-id={o.id} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke="#0b1020" strokeWidth={w.thickness + 0.02} />
            {o.kind === 'door' ? (
              <path
                data-kind="opening"
                data-id={o.id}
                d={`M ${p0.x} ${p0.y} L ${p0.x + n.x * o.width} ${p0.y + n.y * o.width} A ${o.width} ${o.width} 0 0 0 ${p1.x} ${p1.y}`}
                fill="none"
                stroke={color}
                strokeWidth={px(1.5)}
              />
            ) : (
              <>
                {[-1, 1].map((s) => (
                  <line
                    key={s}
                    data-kind="opening"
                    data-id={o.id}
                    x1={p0.x + (n.x * s * w.thickness) / 4}
                    y1={p0.y + (n.y * s * w.thickness) / 4}
                    x2={p1.x + (n.x * s * w.thickness) / 4}
                    y2={p1.y + (n.y * s * w.thickness) / 4}
                    stroke={color}
                    strokeWidth={px(2)}
                  />
                ))}
              </>
            )}
            <line data-kind="opening" data-id={o.id} x1={p0.x} y1={p0.y} x2={p1.x} y2={p1.y} stroke="transparent" strokeWidth={w.thickness + 0.1} />
          </g>
        );
      })}

      {plan.furniture.map((f) => (
        <g key={f.id} transform={`translate(${f.x} ${f.y}) rotate(${f.rotation})`} data-kind="furniture" data-id={f.id}>
          <rect
            data-kind="furniture"
            data-id={f.id}
            x={-f.width / 2}
            y={-f.depth / 2}
            width={f.width}
            height={f.depth}
            rx={0.04}
            fill={CATALOG[f.type].color}
            fillOpacity={f.type === 'rug' ? 0.35 : 0.85}
            stroke={isSel('furniture', f.id) ? SEL : '#1e293b'}
            strokeWidth={px(isSel('furniture', f.id) ? 2.5 : 1)}
          />
          {f.type !== 'rug' && (
            <line x1={-f.width / 2 + 0.04} y1={f.depth / 2 - 0.05} x2={f.width / 2 - 0.04} y2={f.depth / 2 - 0.05} stroke="#1e293b" strokeWidth={px(1)} strokeOpacity={0.6} pointerEvents="none" />
          )}
        </g>
      ))}

      {plan.rooms.map((r) => {
        const c = polygonCentroid(r.points);
        return (
          <g key={`label-${r.id}`} pointerEvents="none">
            <text x={c.x} y={c.y} textAnchor="middle" fontSize={px(13)} fontWeight={600} fill="#f8fafc">
              {r.name}
            </text>
            <text x={c.x} y={c.y + px(16)} textAnchor="middle" fontSize={px(11)} fill="#94a3b8">
              {polygonArea(r.points).toFixed(1)} m²
            </text>
          </g>
        );
      })}
    </>
  );
}
