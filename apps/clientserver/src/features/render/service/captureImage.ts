import type { Engine } from '@/features/model-generation';

export const IMAGE_SIZES = {
  '1080p': { width: 1920, height: 1080 },
  '1440p': { width: 2560, height: 1440 },
  '4K': { width: 3840, height: 2160 },
} as const;
export type ImageSize = keyof typeof IMAGE_SIZES;

/** Photoreal still: ultra pipeline (GTAO + SMAA + ACES) at the exact output resolution. */
export function captureImage(engine: Engine, size: ImageSize) {
  const { width, height } = IMAGE_SIZES[size];
  return engine.renderImage(width, height);
}
