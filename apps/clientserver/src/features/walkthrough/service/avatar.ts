import * as THREE from 'three';
import type { Engine } from '@/features/model-generation';
import { collideAndMove, createKeyState } from './movement';

/** Simple stylised humanoid built from primitives; limbs pivot at the hip/shoulder for walk cycles. */
function buildAvatar(color = '#4f46e5') {
  const skin = new THREE.MeshStandardMaterial({ color: '#e0b48f', roughness: 0.7 });
  const cloth = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
  const pants = new THREE.MeshStandardMaterial({ color: '#1f2937', roughness: 0.9 });
  const root = new THREE.Group();

  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.45, 6, 12), cloth);
  torso.position.y = 1.2;
  root.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 16), skin);
  head.position.y = 1.66;
  root.add(head);

  const limb = (radius: number, length: number, mat: THREE.Material, x: number, y: number) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, y, 0);
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(radius, length, 4, 10), mat);
    m.position.y = -(length / 2 + radius);
    pivot.add(m);
    root.add(pivot);
    return pivot;
  };
  const legL = limb(0.08, 0.62, pants, -0.1, 0.86);
  const legR = limb(0.08, 0.62, pants, 0.1, 0.86);
  const armL = limb(0.06, 0.5, cloth, -0.29, 1.45);
  const armR = limb(0.06, 0.5, cloth, 0.29, 1.45);

  root.traverse((o) => {
    if ((o as THREE.Mesh).isMesh) o.castShadow = true;
  });
  return { root, legL, legR, armL, armR };
}

/**
 * Third-person avatar walkthrough. WASD moves relative to the camera, drag to orbit the
 * camera around the avatar, wheel to zoom.
 */
export function startAvatar(engine: Engine, start: THREE.Vector3, color?: string) {
  const avatar = buildAvatar(color);
  avatar.root.position.set(start.x, 0, start.z);
  engine.scene.add(avatar.root);

  const keys = createKeyState();
  const colliders = engine.collisionMeshes();
  const camera = engine.camera;
  let yaw = 0;
  let pitch = 0.35;
  let distance = 3.2;
  let phase = 0;

  const el = engine.renderer.domElement;
  let dragging = false;
  const onDown = () => (dragging = true);
  const onUp = () => (dragging = false);
  const onMove = (e: PointerEvent) => {
    if (!dragging) return;
    yaw -= e.movementX * 0.005;
    pitch = THREE.MathUtils.clamp(pitch + e.movementY * 0.004, 0.05, 1.2);
  };
  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    distance = THREE.MathUtils.clamp(distance + e.deltaY * 0.003, 1.5, 8);
  };
  el.addEventListener('pointerdown', onDown);
  window.addEventListener('pointerup', onUp);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('wheel', onWheel, { passive: false });

  const target = new THREE.Vector3();
  const desired = new THREE.Vector3();
  const camRay = new THREE.Raycaster();

  const stop = engine.addUpdater((dt) => {
    const { forward, right, run } = keys.axis();
    const moving = forward !== 0 || right !== 0;
    if (moving) {
      const speed = (run ? 3 : 1.5) * dt;
      const fwd = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
      const rgt = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      const delta = fwd.multiplyScalar(forward).add(rgt.multiplyScalar(right)).normalize().multiplyScalar(speed);
      collideAndMove(avatar.root.position, delta, colliders);
      const heading = Math.atan2(delta.x, delta.z);
      avatar.root.rotation.y = THREE.MathUtils.lerp(avatar.root.rotation.y, heading, 0.25);
      phase += dt * (run ? 12 : 8);
    } else {
      phase *= 0.9;
    }
    const swing = Math.sin(phase) * (moving ? 0.6 : 0);
    avatar.legL.rotation.x = swing;
    avatar.legR.rotation.x = -swing;
    avatar.armL.rotation.x = -swing * 0.8;
    avatar.armR.rotation.x = swing * 0.8;

    // Follow camera that pulls in when a wall is between it and the avatar.
    target.copy(avatar.root.position).setY(1.5);
    desired.set(
      target.x + Math.sin(yaw) * Math.cos(pitch) * distance,
      target.y + Math.sin(pitch) * distance,
      target.z + Math.cos(yaw) * Math.cos(pitch) * distance,
    );
    const dir = desired.clone().sub(target);
    const len = dir.length();
    camRay.set(target, dir.normalize());
    camRay.far = len;
    const hit = camRay.intersectObjects(colliders, false)[0];
    if (hit) desired.copy(target).addScaledVector(dir, Math.max(0.4, hit.distance - 0.15));
    camera.position.lerp(desired, 0.2);
    camera.lookAt(target);
  });

  return () => {
    stop();
    keys.dispose();
    el.removeEventListener('pointerdown', onDown);
    window.removeEventListener('pointerup', onUp);
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('wheel', onWheel);
    engine.scene.remove(avatar.root);
    avatar.root.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
  };
}
