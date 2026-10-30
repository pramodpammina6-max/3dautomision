import 'server-only';
import sharp from 'sharp';
import {
  AI_FLOORPLAN_JSON_SCHEMA,
  fromAiFloorPlan,
  sampleFloorPlan,
  type AiFloorPlan,
  type FloorPlan,
} from '@metaverse/floorplan-schema';
import { HttpError } from '@/common/server/http';
import { generateJson, isAiEnabled } from '@/common/server/openai';
import type { GenerateFloorPlanInput } from './floorplanAi.schemas';

const INSTRUCTIONS = `You are an expert architectural floor plan digitizer.
Convert the supplied floor plan image and/or description into structured JSON.

Coordinate system: metres, origin at the top-left of the plan, x increases to the right, y increases downwards.
- If dimensions are printed on the drawing, use them. Otherwise infer a realistic scale (doors ≈ 0.9 m wide, typical bedroom 3–4 m).
- walls: wall CENTRE-LINES as straight segments (ax,ay)→(bx,by). Exterior walls thickness 0.2, interior 0.12.
  Split walls at every T-junction or corner so endpoints meet exactly (share identical coordinates).
- openings: doors and windows. wallId references a wall id. offset = distance in metres from the wall's (ax,ay)
  end to the CENTRE of the opening. Doors: height 2.1, sill 0. Windows: height ≈ 1.2–1.5, sill ≈ 0.9.
- rooms: closed polygons following the wall centre-lines (clockwise), with a readable name and the best matching type.
- wallHeight: 2.8 unless stated otherwise.
Use short ids like w1, w2, o1, r1. Do not invent rooms that are not on the plan.`;

async function normaliseImage(dataUrl: string): Promise<string> {
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  const jpeg = await sharp(buf)
    .rotate()
    .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
    .flatten({ background: '#ffffff' })
    .jpeg({ quality: 88 })
    .toBuffer();
  return `data:image/jpeg;base64,${jpeg.toString('base64')}`;
}

/** Shift the plan so its bounding box starts at (0,0); AI output is sometimes offset. */
function normaliseOrigin(plan: FloorPlan): FloorPlan {
  const pts = [...plan.walls.flatMap((w) => [w.a, w.b]), ...plan.rooms.flatMap((r) => r.points)];
  if (!pts.length) return plan;
  const dx = Math.min(...pts.map((p) => p.x));
  const dy = Math.min(...pts.map((p) => p.y));
  const shift = (p: { x: number; y: number }) => ({ x: +(p.x - dx).toFixed(3), y: +(p.y - dy).toFixed(3) });
  return {
    ...plan,
    walls: plan.walls.map((w) => ({ ...w, a: shift(w.a), b: shift(w.b) })),
    rooms: plan.rooms.map((r) => ({ ...r, points: r.points.map(shift) })),
  };
}

export async function generateFloorPlan(
  input: GenerateFloorPlanInput,
): Promise<{ plan: FloorPlan; source: 'openai' | 'demo' }> {
  if (!isAiEnabled()) {
    return { plan: sampleFloorPlan(input.prompt?.slice(0, 60) || 'Demo floor plan'), source: 'demo' };
  }

  const content: Parameters<typeof generateJson>[0]['content'] = [
    {
      type: 'input_text',
      text: input.prompt
        ? `Additional notes from the user: ${input.prompt}`
        : 'Digitize this floor plan.',
    },
  ];
  if (input.imageDataUrl) {
    content.push({ type: 'input_image', image_url: await normaliseImage(input.imageDataUrl), detail: 'high' });
  }

  const ai = await generateJson<AiFloorPlan>({
    schemaName: 'floor_plan',
    schema: AI_FLOORPLAN_JSON_SCHEMA as unknown as Record<string, unknown>,
    instructions: INSTRUCTIONS,
    content,
  });
  const plan = normaliseOrigin(fromAiFloorPlan(ai));
  if (!plan.walls.length) throw new HttpError(422, 'No walls could be detected in this floor plan');
  return { plan, source: 'openai' };
}
