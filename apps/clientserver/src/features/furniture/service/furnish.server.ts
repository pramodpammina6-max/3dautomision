import 'server-only';
import { z } from 'zod';
import { AI_FURNITURE_JSON_SCHEMA, FloorPlanSchema, type FurnitureType } from '@metaverse/floorplan-schema';
import { generateJson, isAiEnabled } from '@/common/server/openai';
import { polygonArea } from '@/common/geometry/plan';
import type { FloorPlan, Furniture } from '@/common/types';
import { autoFurnish, fitsInRoom } from './autoFurnish';
import { CATALOG } from './catalog';
import { uid } from '@/common/lib/utils';

export const FurnishSchema = z.object({ plan: FloorPlanSchema, style: z.string().max(200).optional() });

const INSTRUCTIONS = `You are an interior designer. Furnish each room of the given floor plan.
Coordinates are metres (x right, y down). Rotation is degrees clockwise; at 0° an item's front faces +y (down).
Place large items against walls with their back to the wall, keep 0.8 m walkways and never block doors.
Every item must lie fully inside its room polygon. Use only the furniture types in the schema.
Item footprints (width × depth): ${Object.values(CATALOG)
  .map((c) => `${c.type} ${c.size[0]}×${c.size[1]}`)
  .join(', ')}.`;

export async function furnishPlan(
  plan: FloorPlan,
  style?: string,
): Promise<{ furniture: Furniture[]; source: 'openai' | 'rules' }> {
  if (!isAiEnabled()) return { furniture: autoFurnish(plan), source: 'rules' };

  const rooms = plan.rooms.map((r) => ({
    id: r.id,
    name: r.name,
    type: r.type,
    areaM2: +polygonArea(r.points).toFixed(1),
    points: r.points,
  }));
  const doors = plan.openings.filter((o) => o.kind === 'door').length;
  const ai = await generateJson<{
    furniture: { type: FurnitureType; roomId: string; x: number; y: number; rotation: number }[];
  }>({
    schemaName: 'furniture_layout',
    schema: AI_FURNITURE_JSON_SCHEMA as unknown as Record<string, unknown>,
    instructions: INSTRUCTIONS,
    content: [
      {
        type: 'input_text',
        text: `Style: ${style || 'modern, warm, minimal'}.\nDoors in plan: ${doors}.\nRooms: ${JSON.stringify(rooms)}`,
      },
    ],
  });

  const furniture: Furniture[] = [];
  for (const item of ai.furniture) {
    const room = plan.rooms.find((r) => r.id === item.roomId);
    const c = CATALOG[item.type];
    if (!room || !c) continue;
    const f: Furniture = {
      id: uid('f'),
      type: item.type,
      roomId: room.id,
      x: item.x,
      y: item.y,
      rotation: Math.round(item.rotation / 90) * 90,
      width: c.size[0],
      depth: c.size[1],
      height: c.size[2],
      materialId: c.materialId,
    };
    if (fitsInRoom(f, room)) furniture.push(f);
  }
  // Fall back to rules if the model produced nothing usable.
  return furniture.length ? { furniture, source: 'openai' } : { furniture: autoFurnish(plan), source: 'rules' };
}
