import * as THREE from 'three';
import type { FloorPlan, Opening, Wall } from '@/common/types';
import { wallLength } from '@/common/geometry/plan';
import { buildFurnitureMesh } from '@/features/furniture/service/furnitureMeshes';

export interface BuildOptions {
  ceilings: boolean;
  material: (id: string) => THREE.Material;
}

const FRAME = new THREE.MeshStandardMaterial({ color: '#2d2f33', roughness: 0.5, metalness: 0.6 });
const CEILING = new THREE.MeshStandardMaterial({ color: '#fbfaf7', roughness: 0.95, side: THREE.DoubleSide });
const HANDLE = new THREE.MeshStandardMaterial({ color: '#c9cdd2', roughness: 0.25, metalness: 1 });

/** Box whose UVs are in metres so tiling textures keep a real-world scale on every face. */
function meterBox(w: number, h: number, d: number, mat: THREE.Material) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const uv = geo.attributes.uv as THREE.BufferAttribute;
  const dims: [number, number][] = [
    [d, h], [d, h], // ±x
    [w, d], [w, d], // ±y
    [w, h], [w, h], // ±z
  ];
  for (let face = 0; face < 6; face++) {
    for (let v = 0; v < 4; v++) {
      const i = face * 4 + v;
      uv.setXY(i, uv.getX(i) * dims[face][0], uv.getY(i) * dims[face][1]);
    }
  }
  const mesh = new THREE.Mesh(geo, mat);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

/**
 * One wall becomes solid pieces between openings, plus a lintel above and a sill below
 * every opening. Pieces live in a wall-local frame: x along the wall, centred on the centre-line.
 */
function buildWall(wall: Wall, openings: Opening[], height: number, opts: BuildOptions) {
  const g = new THREE.Group();
  const len = wallLength(wall);
  if (len < 0.01) return g;
  const t = wall.thickness;
  const ext = t / 2; // extend past endpoints so corners close
  const mat = opts.material(wall.materialId);

  const piece = (x0: number, x1: number, y0: number, y1: number) => {
    if (x1 - x0 < 0.005 || y1 - y0 < 0.005) return;
    const m = meterBox(x1 - x0, y1 - y0, t, mat);
    m.position.set((x0 + x1) / 2, (y0 + y1) / 2, 0);
    m.userData = { kind: 'wall', id: wall.id };
    g.add(m);
  };

  const sorted = openings
    .map((o) => ({ o, x0: Math.max(0, o.offset - o.width / 2), x1: Math.min(len, o.offset + o.width / 2) }))
    .sort((a, b) => a.x0 - b.x0);

  let cursor = -ext;
  for (const { o, x0, x1 } of sorted) {
    if (x0 < cursor) continue; // overlapping opening — skip rather than produce broken geometry
    piece(cursor, x0, 0, height);
    piece(x0, x1, 0, o.sill);
    piece(x0, x1, Math.min(height, o.sill + o.height), height);
    g.add(buildOpening(o, x1 - x0, t, opts));
    g.children[g.children.length - 1].position.x = (x0 + x1) / 2;
    cursor = x1;
  }
  piece(cursor, len + ext, 0, height);

  const dx = wall.b.x - wall.a.x;
  const dz = wall.b.y - wall.a.y;
  g.position.set(wall.a.x, 0, wall.a.y);
  g.rotation.y = Math.atan2(-dz, dx);
  g.userData = { kind: 'wall', id: wall.id };
  return g;
}

function buildOpening(o: Opening, width: number, t: number, opts: BuildOptions) {
  const g = new THREE.Group();
  const f = 0.05;
  const h = o.height;
  const add = (m: THREE.Mesh, x: number, y: number, z = 0) => {
    m.position.set(x, y, z);
    m.userData = { kind: 'opening', id: o.id };
    g.add(m);
  };
  // frame
  add(meterBox(f, h, t + 0.02, FRAME), -width / 2 + f / 2, o.sill + h / 2);
  add(meterBox(f, h, t + 0.02, FRAME), width / 2 - f / 2, o.sill + h / 2);
  add(meterBox(width, f, t + 0.02, FRAME), 0, o.sill + h - f / 2);
  if (o.kind === 'window') {
    add(meterBox(width, f, t + 0.04, FRAME), 0, o.sill + f / 2);
    add(meterBox(f * 0.6, h, 0.04, FRAME), 0, o.sill + h / 2);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(width - 2 * f, h - 2 * f), opts.material(o.materialId));
    add(glass, 0, o.sill + h / 2);
  } else {
    const leaf = meterBox(width - 2 * f, h - f, 0.04, opts.material(o.materialId));
    add(leaf, 0, (h - f) / 2);
    const handle = meterBox(0.12, 0.02, 0.06, HANDLE);
    add(handle, width / 2 - f - 0.1, 1.0, 0);
  }
  return g;
}

function roomShape(points: { x: number; y: number }[], flipY: boolean) {
  return new THREE.Shape(points.map((p) => new THREE.Vector2(p.x, flipY ? -p.y : p.y)));
}

/** Builds the whole 3D model (walls, openings, floors, ceilings, furniture) from the plan. */
export function buildPlanGroup(plan: FloorPlan, opts: BuildOptions): THREE.Group {
  const root = new THREE.Group();
  root.name = 'plan';

  for (const room of plan.rooms) {
    // Shape (x, -y) rotated −90° about X lands at world (x, 0, y) facing up.
    const floor = new THREE.Mesh(new THREE.ShapeGeometry(roomShape(room.points, true)), opts.material(room.floorMaterialId));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.002;
    floor.receiveShadow = true;
    floor.userData = { kind: 'room', id: room.id };
    root.add(floor);

    if (opts.ceilings) {
      const ceil = new THREE.Mesh(new THREE.ShapeGeometry(roomShape(room.points, false)), CEILING);
      ceil.rotation.x = Math.PI / 2;
      ceil.position.y = plan.wallHeight;
      ceil.userData = { kind: 'ceiling', id: room.id };
      root.add(ceil);
    }
  }

  for (const wall of plan.walls) {
    root.add(buildWall(wall, plan.openings.filter((o) => o.wallId === wall.id), plan.wallHeight, opts));
  }

  for (const f of plan.furniture) {
    root.add(buildFurnitureMesh(f, opts.material(f.materialId)));
  }
  return root;
}

export function disposeGroup(g: THREE.Object3D) {
  g.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (mesh.isMesh) mesh.geometry.dispose();
  });
}
