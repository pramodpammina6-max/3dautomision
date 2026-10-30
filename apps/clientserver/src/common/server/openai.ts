import 'server-only';
import OpenAI from 'openai';
import { Ajv } from 'ajv';
import { env } from '@/common/config/env';
import { HttpError } from './http';

let client: OpenAI | null = null;

export function isAiEnabled() {
  return Boolean(env().OPENAI_API_KEY);
}

function openai() {
  client ??= new OpenAI({ apiKey: env().OPENAI_API_KEY });
  return client;
}

const ajv = new Ajv({ allErrors: true, strict: false });

type InputContent =
  | { type: 'input_text'; text: string }
  | { type: 'input_image'; image_url: string; detail: 'high' | 'low' | 'auto' };

/**
 * Calls the OpenAI Responses API with a strict JSON schema and validates the result with Ajv
 * before returning it, so callers always receive schema-conformant JSON.
 */
export async function generateJson<T>(opts: {
  schemaName: string;
  schema: Record<string, unknown>;
  instructions: string;
  content: InputContent[];
}): Promise<T> {
  const response = await openai().responses.create({
    model: env().OPENAI_MODEL,
    instructions: opts.instructions,
    input: [{ role: 'user', content: opts.content }],
    text: {
      format: { type: 'json_schema', name: opts.schemaName, schema: opts.schema, strict: true },
    },
  });

  let parsed: unknown;
  try {
    parsed = JSON.parse(response.output_text);
  } catch {
    throw new HttpError(502, 'AI returned malformed JSON');
  }
  const validate = ajv.compile(opts.schema);
  if (!validate(parsed)) {
    throw new HttpError(502, `AI output failed schema validation: ${ajv.errorsText(validate.errors)}`);
  }
  return parsed as T;
}
