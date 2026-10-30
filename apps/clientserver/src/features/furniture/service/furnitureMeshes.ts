import * as THREE from 'three';
import type { Furniture } from '@/common/types';

/** Shared accent materials (not user-editable); the item's own material goes on its main body. */
const ACCENT = {
  linen: new THREE.MeshStandardMaterial({ color: '#f4f1ea', roughness: 0.95 }),
  pillow: new THREE.MeshStandardMaterial({ color: '#e6ded1', roughness: 0.95 }),
  dark: new THREE.MeshStandardMaterial({ color: '#2b2b2e', roughness: 0.4, metalness: 0.6 }),
  screen: new THREE.MeshStandardMaterial({ color: '#0b0d12', roughness: 0.15, metalness: 0.3 }),
  steel: new THREE.MeshStandardMaterial({ color: '#c7cbd1', roughness: 0.25, metalness: 0.9 }),
  soil: new THREE.MeshStandardMaterial({ color: '#4a3527', roughness: 1 }),
  pot: new THREE.MeshStandardMaterial({ color: '#d8cfc4', roughness: 0.6 }),
  shade: new THREE.MeshStandardMaterial({ color: '#fff4dc', roughness: 0.9, emissive: '#ffdca0', emissiveIntensity: 0.6 }),
  water: new THREE.MeshPhysicalMaterial({ color: '#bfe3f2', roughness: 0.05, transmission: 0.6, transparent: true, opacity: 0.7 }),
  books: ['#8b3a3a', '#2f4f6f', '#c2a14d', '#3f6b4a', '#5b4a7a'].map(
    (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }),
  ),
};

type Mat = THREE.Material;

function box(w: number, h: number, d: number, x: number, y: number, z: number, mat: Mat) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y + h / 2, z);
  return m;
}

function cyl(rTop: number, rBot: number, h: number, x: number, y: number, z: number, mat: Mat, seg = 24) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
  m.position.set(x, y + h / 2, z);
  return m;
}

function legs(g: THREE.Group, w: number, d: number, h: number, mat: Mat, inset = 0.05, r = 0.025) {
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    g.add(cyl(r, r, h, sx * (w / 2 - inset), 0, sz * (d / 2 - inset), mat, 10));
  }
}

/**
 * Procedural furniture in local space: width on x, depth on z, front facing +z, floor at y=0.
 * Every mesh is tagged so the viewer can pick it and map it back to the plan item.
 */
export function buildFurnitureMesh(f: Furniture, main: Mat): THREE.Group {
  const g = new THREE.Group();
  const { width: w, depth: d, height: h } = f;

  switch (f.type) {
    case 'bed': {
      g.add(box(w, 0.3, d, 0, 0.05, 0, main));
      g.add(box(w - 0.06, 0.22, d - 0.1, 0, 0.35, 0.03, ACCENT.linen));
      g.add(box(w, 1.0, 0.08, 0, 0, -d / 2 + 0.04, main));
      for (const sx of [-1, 1]) g.add(box(w * 0.38, 0.12, 0.4, sx * w * 0.22, 0.57, -d / 2 + 0.32, ACCENT.pillow));
      g.add(box(w - 0.04, 0.05, d * 0.45, 0, 0.57, d * 0.25, main));
      legs(g, w, d, 0.05, ACCENT.dark);
      break;
    }
    case 'sofa': {
      g.add(box(w, 0.42, d, 0, 0.08, 0, main));
      g.add(box(w, h - 0.08, 0.2, 0, 0.08, -d / 2 + 0.1, main));
      for (const sx of [-1, 1]) g.add(box(0.18, 0.62 - 0.08, d, sx * (w / 2 - 0.09), 0.08, 0, main));
      const seats = Math.max(1, Math.round((w - 0.36) / 0.6));
      const sw = (w - 0.36) / seats;
      for (let i = 0; i < seats; i++) {
        g.add(box(sw - 0.02, 0.12, d - 0.24, -w / 2 + 0.18 + sw * (i + 0.5), 0.5, 0.08, main));
      }
      legs(g, w, d, 0.08, ACCENT.dark, 0.06, 0.02);
      break;
    }
    case 'armchair': {
      g.add(box(w, 0.4, d, 0, 0.1, 0, main));
      g.add(box(w, h - 0.1, 0.16, 0, 0.1, -d / 2 + 0.08, main));
      for (const sx of [-1, 1]) g.add(box(0.14, 0.55, d, sx * (w / 2 - 0.07), 0.1, 0, main));
      legs(g, w, d, 0.1, ACCENT.dark, 0.06, 0.02);
      break;
    }
    case 'coffee_table':
    case 'dining_table':
    case 'desk': {
      g.add(box(w, 0.04, d, 0, h - 0.04, 0, main));
      legs(g, w, d, h - 0.04, f.type === 'coffee_table' ? main : ACCENT.dark, 0.06, 0.022);
      if (f.type === 'desk') g.add(box(0.4, 0.5, d - 0.08, w / 2 - 0.24, h - 0.54, 0, main));
      break;
    }
    case 'chair': {
      g.add(box(w, 0.04, d, 0, 0.44, 0, main));
      g.add(box(w, h - 0.48, 0.03, 0, 0.48, -d / 2 + 0.015, main));
      legs(g, w, d, 0.44, main, 0.03, 0.016);
      break;
    }
    case 'nightstand':
    case 'tv_unit': {
      g.add(box(w, h - 0.08, d, 0, 0.08, 0, main));
      g.add(box(w - 0.04, 0.01, 0.005, 0, h * 0.55, d / 2, ACCENT.dark));
      legs(g, w, d, 0.08, ACCENT.dark, 0.04, 0.015);
      if (f.type === 'tv_unit') {
        const tvW = Math.min(1.45, w * 0.85);
        g.add(box(tvW, tvW * 0.56, 0.04, 0, h + 0.15, -d / 2 + 0.1, ACCENT.screen));
        g.add(box(0.3, 0.15, 0.2, 0, h, -d / 2 + 0.12, ACCENT.dark));
      }
      break;
    }
    case 'wardrobe':
    case 'bookshelf': {
      if (f.type === 'wardrobe') {
        g.add(box(w, h, d, 0, 0, 0, main));
        g.add(box(0.01, h - 0.1, 0.005, 0, 0.05, d / 2, ACCENT.dark));
        for (const sx of [-1, 1]) g.add(box(0.02, 0.3, 0.03, sx * 0.06, h * 0.5, d / 2 + 0.015, ACCENT.steel));
      } else {
        const t = 0.025;
        for (const sx of [-1, 1]) g.add(box(t, h, d, sx * (w / 2 - t / 2), 0, 0, main));
        g.add(box(w, h, t, 0, 0, -d / 2 + t / 2, main));
        const shelves = 5;
        for (let i = 0; i <= shelves; i++) {
          const y = (i * (h - t)) / shelves;
          g.add(box(w - 2 * t, t, d, 0, y, 0, main));
          if (i < shelves) {
            let x = -w / 2 + t + 0.02;
            let k = 0;
            while (x < w / 2 - t - 0.06) {
              const bw = 0.025 + ((i * 7 + k * 3) % 4) * 0.008;
              g.add(box(bw, (h / shelves) * 0.7, d * 0.75, x + bw / 2, y + t, 0, ACCENT.books[(i + k) % 5]));
              x += bw + 0.004;
              k++;
              if (k % 9 === 0) x += 0.12;
            }
          }
        }
      }
      break;
    }
    case 'kitchen_counter': {
      g.add(box(w, h - 0.04 - 0.1, d - 0.04, 0, 0.1, -0.02, main));
      g.add(box(w, 0.04, d, 0, h - 0.04, 0, ACCENT.dark));
      g.add(box(0.5, 0.01, 0.38, -w * 0.25, h, 0, ACCENT.steel));
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        g.add(cyl(0.09, 0.09, 0.01, w * 0.25 + sx * 0.15, h, sz * 0.13, ACCENT.screen, 20));
      }
      g.add(box(w, h * 0.6, 0.32, 0, 1.45, -d / 2 + 0.16, main));
      break;
    }
    case 'fridge': {
      g.add(box(w, h, d, 0, 0, 0, main));
      g.add(box(w - 0.02, 0.008, 0.004, 0, h * 0.62, d / 2, ACCENT.dark));
      g.add(box(0.025, 0.4, 0.03, w / 2 - 0.08, h * 0.68, d / 2 + 0.015, ACCENT.steel));
      break;
    }
    case 'toilet': {
      g.add(box(w, 0.4, 0.2, 0, 0.38, -d / 2 + 0.1, main));
      g.add(cyl(0.16, 0.13, 0.4, 0, 0, 0.08, main));
      g.add(cyl(0.2, 0.2, 0.03, 0, 0.4, 0.08, main));
      break;
    }
    case 'sink': {
      g.add(box(w, h - 0.1 - 0.15, d, 0, 0.15, 0, ACCENT.pot));
      g.add(box(w, 0.1, d, 0, h - 0.1, 0, main));
      g.add(cyl(0.015, 0.015, 0.2, 0, h, -d / 2 + 0.08, ACCENT.steel, 10));
      g.add(box(0.6, 0.8, 0.02, 0, h + 0.35, -d / 2 + 0.01, ACCENT.water));
      break;
    }
    case 'bathtub': {
      const t = 0.06;
      g.add(box(w, h, t, 0, 0, -d / 2 + t / 2, main));
      g.add(box(w, h, t, 0, 0, d / 2 - t / 2, main));
      for (const sx of [-1, 1]) g.add(box(t, h, d, sx * (w / 2 - t / 2), 0, 0, main));
      g.add(box(w - 2 * t, 0.05, d - 2 * t, 0, 0, 0, main));
      g.add(box(w - 2 * t, 0.02, d - 2 * t, 0, h * 0.6, 0, ACCENT.water));
      break;
    }
    case 'plant': {
      g.add(cyl(w * 0.38, w * 0.3, 0.38, 0, 0, 0, ACCENT.pot));
      g.add(cyl(w * 0.35, w * 0.35, 0.02, 0, 0.36, 0, ACCENT.soil));
      for (let i = 0; i < 7; i++) {
        const leaf = new THREE.Mesh(new THREE.SphereGeometry(w * 0.32, 10, 8), main);
        const a = (i / 7) * Math.PI * 2;
        leaf.scale.set(0.6, 1.1, 0.6);
        leaf.position.set(Math.cos(a) * w * 0.18, 0.55 + (i % 3) * (h - 0.75) * 0.35, Math.sin(a) * w * 0.18);
        g.add(leaf);
      }
      break;
    }
    case 'rug': {
      g.add(box(w, 0.012, d, 0, 0, 0, main));
      break;
    }
    case 'lamp': {
      g.add(cyl(0.14, 0.16, 0.03, 0, 0, 0, ACCENT.dark));
      g.add(cyl(0.012, 0.012, h - 0.3, 0, 0.03, 0, ACCENT.steel, 8));
      g.add(cyl(0.12, 0.18, 0.28, 0, h - 0.3, 0, ACCENT.shade));
      const light = new THREE.PointLight('#ffd9a0', 1.2, 4, 2);
      light.position.set(0, h - 0.2, 0);
      g.add(light);
      break;
    }
  }

  g.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      o.userData = { kind: 'furniture', id: f.id };
    }
  });
  g.userData = { kind: 'furniture', id: f.id };
  g.position.set(f.x, 0, f.y);
  g.rotation.y = -THREE.MathUtils.degToRad(f.rotation);
  return g;
}
