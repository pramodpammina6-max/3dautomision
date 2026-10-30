import * as THREE from 'three';
import type { MaterialKind } from '@/common/types';

const SIZE = 512;

function rand(seed: number) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
}

function canvas(draw: (ctx: CanvasRenderingContext2D, r: () => number) => void) {
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const ctx = c.getContext('2d')!;
  draw(ctx, rand(42));
  return c;
}

/**
 * Greyscale detail maps; the material colour tints them, so one texture serves every colour
 * of a given kind. Returned textures are cached per kind.
 */
const painters: Partial<Record<MaterialKind, (ctx: CanvasRenderingContext2D, r: () => number) => void>> = {
  wood(ctx, r) {
    ctx.fillStyle = '#d9d9d9';
    ctx.fillRect(0, 0, SIZE, SIZE);
    const planks = 4;
    const ph = SIZE / planks;
    for (let i = 0; i < planks; i++) {
      const shade = 200 + Math.floor(r() * 50);
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      ctx.fillRect(0, i * ph, SIZE, ph);
      for (let k = 0; k < 40; k++) {
        const y = i * ph + r() * ph;
        const g = 150 + Math.floor(r() * 80);
        ctx.strokeStyle = `rgba(${g},${g},${g},0.35)`;
        ctx.lineWidth = 0.5 + r() * 1.5;
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= SIZE; x += 32) ctx.lineTo(x, y + Math.sin(x / 60 + k) * 2);
        ctx.stroke();
      }
      ctx.fillStyle = 'rgba(60,60,60,0.6)';
      ctx.fillRect(0, i * ph, SIZE, 2);
      const seam = r() * SIZE;
      ctx.fillRect(seam, i * ph, 2, ph);
    }
  },
  tile(ctx) {
    ctx.fillStyle = '#9a9a9a';
    ctx.fillRect(0, 0, SIZE, SIZE);
    const n = 2;
    const t = SIZE / n;
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const g = 238 + ((i + j) % 2) * 8;
        ctx.fillStyle = `rgb(${g},${g},${g})`;
        ctx.fillRect(i * t + 3, j * t + 3, t - 6, t - 6);
      }
  },
  marble(ctx, r) {
    ctx.fillStyle = '#f2f2f2';
    ctx.fillRect(0, 0, SIZE, SIZE);
    for (let k = 0; k < 18; k++) {
      ctx.strokeStyle = `rgba(110,110,110,${0.1 + r() * 0.3})`;
      ctx.lineWidth = 0.5 + r() * 2.5;
      ctx.beginPath();
      let x = r() * SIZE;
      let y = 0;
      ctx.moveTo(x, y);
      while (y < SIZE) {
        x += (r() - 0.5) * 40;
        y += 10 + r() * 30;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  },
  fabric(ctx, r) {
    ctx.fillStyle = '#e0e0e0';
    ctx.fillRect(0, 0, SIZE, SIZE);
    for (let y = 0; y < SIZE; y += 3) {
      ctx.fillStyle = `rgba(0,0,0,${0.04 + r() * 0.05})`;
      ctx.fillRect(0, y, SIZE, 1);
    }
    for (let x = 0; x < SIZE; x += 3) {
      ctx.fillStyle = `rgba(255,255,255,${0.04 + r() * 0.05})`;
      ctx.fillRect(x, 0, 1, SIZE);
    }
  },
  concrete(ctx, r) {
    ctx.fillStyle = '#d0d0d0';
    ctx.fillRect(0, 0, SIZE, SIZE);
    for (let i = 0; i < 9000; i++) {
      const g = 150 + Math.floor(r() * 100);
      ctx.fillStyle = `rgba(${g},${g},${g},0.25)`;
      ctx.fillRect(r() * SIZE, r() * SIZE, 1 + r() * 3, 1 + r() * 3);
    }
  },
};
painters.carpet = painters.concrete;
painters.leather = painters.concrete;

const cache = new Map<MaterialKind, THREE.Texture | null>();

export function detailTexture(kind: MaterialKind): THREE.Texture | null {
  if (cache.has(kind)) return cache.get(kind)!;
  const painter = painters[kind];
  const tex = painter ? new THREE.CanvasTexture(canvas(painter)) : null;
  if (tex) {
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
  }
  cache.set(kind, tex);
  return tex;
}
