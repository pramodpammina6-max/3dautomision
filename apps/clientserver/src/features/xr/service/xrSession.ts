import * as THREE from 'three';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';
import type { Engine } from '@/features/model-generation';

export async function isVrSupported() {
  if (typeof navigator === 'undefined' || !('xr' in navigator) || !navigator.xr) return false;
  try {
    return await navigator.xr.isSessionSupported('immersive-vr');
  } catch {
    return false;
  }
}

/**
 * Immersive VR (tested target: Meta Quest 3 browser).
 * - Camera is parented to a "dolly" that locomotion moves.
 * - Trigger: point at the floor and release to teleport.
 * - Left stick: smooth move relative to head direction. Right stick: 30° snap turn.
 */
export async function enterVr(engine: Engine, spawn: THREE.Vector3, onEnd: () => void) {
  const session = await navigator.xr!.requestSession('immersive-vr', {
    optionalFeatures: ['local-floor', 'bounded-floor', 'hand-tracking'],
  });
  const { renderer, scene, camera } = engine;
  renderer.xr.setReferenceSpaceType('local-floor');
  await renderer.xr.setSession(session);

  const savedPos = camera.position.clone();
  const savedQuat = camera.quaternion.clone();
  engine.setOrbitEnabled(false);
  engine.setPicking(false);

  const dolly = new THREE.Group();
  dolly.position.copy(spawn).setY(0);
  scene.add(dolly);
  dolly.add(camera);
  camera.position.set(0, 0, 0);

  const floors = engine.floorMeshes();
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(0.18, 0.25, 32).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color: '#818cf8' }),
  );
  marker.visible = false;
  scene.add(marker);

  const factory = new XRControllerModelFactory();
  const ray = new THREE.Raycaster();
  const controllers = [0, 1].map((i) => {
    const controller = renderer.xr.getController(i);
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, -1)]),
      new THREE.LineBasicMaterial({ color: '#a5b4fc' }),
    );
    line.scale.z = 5;
    controller.add(line);
    const state = { aiming: false };
    controller.addEventListener('selectstart', () => (state.aiming = true));
    controller.addEventListener('selectend', () => {
      state.aiming = false;
      if (marker.visible) dolly.position.set(marker.position.x, 0, marker.position.z);
      marker.visible = false;
    });
    dolly.add(controller);
    const grip = renderer.xr.getControllerGrip(i);
    grip.add(factory.createControllerModel(grip));
    dolly.add(grip);
    return { controller, state };
  });

  let snapReady = true;
  const head = new THREE.Vector3();
  const stop = engine.addUpdater((dt) => {
    for (const { controller, state } of controllers) {
      if (!state.aiming) continue;
      const m = new THREE.Matrix4().extractRotation(controller.matrixWorld);
      ray.ray.origin.setFromMatrixPosition(controller.matrixWorld);
      ray.ray.direction.set(0, 0, -1).applyMatrix4(m);
      const hit = ray.intersectObjects(floors, false)[0];
      marker.visible = !!hit;
      if (hit) marker.position.copy(hit.point).setY(0.01);
    }
    for (const source of session.inputSources) {
      const axes = source.gamepad?.axes;
      if (!axes || axes.length < 4) continue;
      const [x, y] = [axes[2], axes[3]];
      if (source.handedness === 'left' && (Math.abs(x) > 0.15 || Math.abs(y) > 0.15)) {
        camera.getWorldDirection(head);
        head.y = 0;
        head.normalize();
        const right = new THREE.Vector3().crossVectors(head, THREE.Object3D.DEFAULT_UP);
        dolly.position.addScaledVector(head, -y * 1.5 * dt).addScaledVector(right, x * 1.5 * dt);
      }
      if (source.handedness === 'right') {
        if (Math.abs(x) > 0.7 && snapReady) {
          dolly.rotateY((-Math.sign(x) * Math.PI) / 6);
          snapReady = false;
        } else if (Math.abs(x) < 0.3) snapReady = true;
      }
    }
  });

  session.addEventListener('end', () => {
    stop();
    controllers.forEach(({ controller }) => dolly.remove(controller));
    scene.remove(marker);
    scene.attach(camera);
    scene.remove(dolly);
    camera.position.copy(savedPos);
    camera.quaternion.copy(savedQuat);
    engine.setPicking(true);
    onEnd();
  });

  return session;
}
