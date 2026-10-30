import { z } from 'zod';

export const GenerateFloorPlanSchema = z
  .object({
    imageDataUrl: z
      .string()
      .regex(/^data:image\/(png|jpe?g|webp);base64,/, 'Image must be a PNG, JPEG or WebP data URL')
      .max(12_000_000, 'Image is too large (max ~8 MB)')
      .optional(),
    prompt: z.string().trim().max(2000).optional(),
  })
  .refine((v) => v.imageDataUrl || v.prompt, 'Provide a floor plan image or a description');

export type GenerateFloorPlanInput = z.infer<typeof GenerateFloorPlanSchema>;
