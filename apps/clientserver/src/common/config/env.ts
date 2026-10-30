import 'server-only';
import { z } from 'zod';

const EnvSchema = z.object({
  MONGODB_URI: z.string().min(1, 'MONGODB_URI is required'),
  MONGODB_DB: z.string().default('metaverse_automation'),
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  OPENAI_API_KEY: z.string().optional().default(''),
  OPENAI_MODEL: z.string().default('gpt-6-astra'),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | null = null;

/** Parsed lazily so `next build` works without runtime secrets. */
export function env(): Env {
  if (!cached) cached = EnvSchema.parse(process.env);
  return cached;
}
