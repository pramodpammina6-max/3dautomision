import * as THREE from 'three';

export const EYE_HEIGHT = 1.62;
const RADIUS = 0.3;

/** WASD / arrow key state shared by first-person and avatar controllers. */
export function createKeyState() {
  const keys = new Set<string>();
  const down = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLElement && e.target.closest('input, textarea, select')) return;
    keys.add(e.code);
  };
  const up = (e: KeyboardEvent) => keys.delete(e.code);
  window.addEventListener('keydown', down);
  window.addEventListener('keyup', up);
  return {
    /** x: strafe (right +), z: forward (+) */
    axis() {
      const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
      const r = (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) - (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);
      return { forward: f, right: r, run: keys.has('ShiftLeft') || keys.has('ShiftRight') };
    },
    dispose() {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    },
  };
}

const ray = new THREE.Raycaster();
const tmp = new THREE.Vector3();

/**
 * Moves `position` by `delta` on the XZ plane, sliding along walls. Casts at knee and
 * chest height so low furniture and window sills both block.
 */
export function collideAndMove(position: THREE.Vector3, delta: THREE.Vector3, colliders: THREE.Object3D[]) {
  const axes = [new THREE.Vector3(delta.x, 0, 0), new THREE.Vector3(0, 0, delta.z)];
  for (const step of axes) {
    const len = step.length();
    if (len < 1e-6) continue;
    const dir = step.clone().normalize();
    let blocked = false;
    for (const h of [0.45, 1.2]) {
      ray.set(tmp.set(position.x, h, position.z), dir);
      ray.far = len + RADIUS;
      if (ray.intersectObjects(colliders, false).length) {
        blocked = true;
        break;
      }
    }
    if (!blocked) position.add(step);
  }
}
