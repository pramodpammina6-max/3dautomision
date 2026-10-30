import * as THREE from 'three';
import type { Material } from '@/common/types';
import { detailTexture } from './textures';

/** Converts a plan Material into a three.js PBR material. Callers cache per material id. */
export function toThreeMaterial(m: Material): THREE.Material {
  if (m.kind === 'glass') {
    return new THREE.MeshPhysicalMaterial({
      color: m.color,
      roughness: m.roughness,
      metalness: 0,
      transmission: 0.9,
      thickness: 0.01,
      transparent: true,
      opacity: m.opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
  }
  const base = detailTexture(m.kind);
  let map: THREE.Texture | null = null;
  if (base) {
    // Geometry UVs are in metres, so repeat = 1 / metres-per-tile.
    map = base.clone();
    map.repeat.set(1 / m.textureScale, 1 / m.textureScale);
    map.needsUpdate = true;
  }
  const opts: THREE.MeshPhysicalMaterialParameters = {
    color: m.color,
    roughness: m.roughness,
    metalness: m.metalness,
    map,
    transparent: m.opacity < 1,
    opacity: m.opacity,
  };
  if (m.kind === 'marble' || m.kind === 'tile') {
    return new THREE.MeshPhysicalMaterial({ ...opts, clearcoat: 0.4, clearcoatRoughness: 0.15 });
  }
  if (m.kind === 'fabric') {
    return new THREE.MeshPhysicalMaterial({ ...opts, sheen: 0.6, sheenRoughness: 0.8, sheenColor: new THREE.Color(m.color) });
  }
  return new THREE.MeshStandardMaterial(opts);
}
