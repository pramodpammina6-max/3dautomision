import 'server-only';
import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { FloorPlanSchema, type FloorPlan } from '@metaverse/floorplan-schema';
import { getDb } from '@/common/server/db';
import { HttpError } from '@/common/server/http';
import type { ProjectDetail, ProjectSummary } from '@/common/types';

interface ProjectDoc {
  _id: ObjectId;
  userId: string;
  name: string;
  plan: FloorPlan;
  createdAt: Date;
  updatedAt: Date;
}

export const CreateProjectSchema = z.object({
  name: z.string().trim().min(1).max(120),
  plan: FloorPlanSchema,
});

export const UpdateProjectSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  plan: FloorPlanSchema.optional(),
});

const projects = async () => (await getDb()).collection<ProjectDoc>('projects');

function objectId(id: string) {
  if (!ObjectId.isValid(id)) throw new HttpError(404, 'Project not found');
  return new ObjectId(id);
}

const toDetail = (d: ProjectDoc): ProjectDetail => ({
  id: d._id.toHexString(),
  name: d.name,
  plan: d.plan,
  updatedAt: d.updatedAt.toISOString(),
});

export async function listProjects(userId: string): Promise<ProjectSummary[]> {
  const docs = await (await projects())
    .find({ userId }, { projection: { name: 1, updatedAt: 1, 'plan.rooms': 1, 'plan.walls': 1, 'plan.furniture': 1 } })
    .sort({ updatedAt: -1 })
    .limit(200)
    .toArray();
  return docs.map((d) => ({
    id: d._id.toHexString(),
    name: d.name,
    updatedAt: d.updatedAt.toISOString(),
    stats: {
      rooms: d.plan?.rooms?.length ?? 0,
      walls: d.plan?.walls?.length ?? 0,
      furniture: d.plan?.furniture?.length ?? 0,
    },
  }));
}

export async function createProject(userId: string, input: z.infer<typeof CreateProjectSchema>) {
  const now = new Date();
  const doc: ProjectDoc = { _id: new ObjectId(), userId, name: input.name, plan: input.plan, createdAt: now, updatedAt: now };
  await (await projects()).insertOne(doc);
  return toDetail(doc);
}

export async function getProject(userId: string, id: string): Promise<ProjectDetail> {
  const doc = await (await projects()).findOne({ _id: objectId(id), userId });
  if (!doc) throw new HttpError(404, 'Project not found');
  return toDetail(doc);
}

export async function updateProject(userId: string, id: string, patch: z.infer<typeof UpdateProjectSchema>) {
  const res = await (await projects()).findOneAndUpdate(
    { _id: objectId(id), userId },
    { $set: { ...patch, updatedAt: new Date() } },
    { returnDocument: 'after' },
  );
  if (!res) throw new HttpError(404, 'Project not found');
  return toDetail(res);
}

export async function deleteProject(userId: string, id: string) {
  const res = await (await projects()).deleteOne({ _id: objectId(id), userId });
  if (!res.deletedCount) throw new HttpError(404, 'Project not found');
}
