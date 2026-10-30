import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import type { Engine } from '@/features/model-generation';
import { collideAndMove, createKeyState, EYE_HEIGHT } from './movement';

/** First-person walkthrough: click to lock the mouse, WASD to walk, Shift to run. */
export function startFirstPerson(engine: Engine, start: THREE.Vector3) {
  const camera = engine.camera;
  const controls = new PointerLockControls(camera, engine.renderer.domElement);
  const keys = createKeyState();
  const colliders = engine.collisionMeshes();
  const pos = new THREE.Vector3(start.x, EYE_HEIGHT, start.z);

  camera.position.copy(pos);
  camera.rotation.set(0, 0, 0, 'YXZ');
  camera.fov = 70;
  camera.updateProjectionMatrix();

  const lock = () => controls.lock();
  engine.renderer.domElement.addEventListener('click', lock);

  const fwd = new THREE.Vector3();
  const right = new THREE.Vector3();
  const stop = engine.addUpdater((dt) => {
    const { forward, right: r, run } = keys.axis();
    if (!forward && !r) return;
    const speed = (run ? 3.2 : 1.6) * dt;
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    fwd.normalize();
    right.crossVectors(fwd, camera.up).normalize();
    const delta = fwd.multiplyScalar(forward * speed).add(right.multiplyScalar(r * speed));
    pos.copy(camera.position);
    collideAndMove(pos, delta, colliders);
    camera.position.set(pos.x, EYE_HEIGHT, pos.z);
  });

  return () => {
    stop();
    keys.dispose();
    engine.renderer.domElement.removeEventListener('click', lock);
    controls.unlock();
    controls.dispose();
    camera.fov = 50;
    camera.updateProjectionMatrix();
  };
}
