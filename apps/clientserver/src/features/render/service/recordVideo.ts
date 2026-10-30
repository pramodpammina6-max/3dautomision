import * as THREE from 'three';
import type { Engine } from '@/features/model-generation';
import { planBounds, polygonCentroid } from '@/common/geometry/plan';

export const VIDEO_SIZES = {
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  '4K': { width: 3840, height: 2160 },
} as const;
export type VideoSize = keyof typeof VIDEO_SIZES;
export type VideoPath = 'orbit' | 'tour';

function pickMime() {
  const candidates = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  return candidates.find((m) => MediaRecorder.isTypeSupported(m)) ?? 'video/webm';
}

/**
 * Records a camera animation straight from the WebGL canvas with MediaRecorder.
 * "orbit": exterior 360° fly-around. "tour": eye-level pan inside each room in turn.
 */
export function recordVideo(
  engine: Engine,
  opts: { path: VideoPath; seconds: number; size: VideoSize; onProgress: (p: number) => void },
): Promise<{ blob: Blob; ext: string }> {
  const plan = engine.getPlan();
  if (!plan) return Promise.reject(new Error('No plan loaded'));
  const { camera } = engine;
  const savedPos = camera.position.clone();
  const savedQuat = camera.quaternion.clone();
  const savedFov = camera.fov;

  const b = planBounds(plan);
  const center = new THREE.Vector3((b.minX + b.maxX) / 2, 0, (b.minY + b.maxY) / 2);
  const radius = Math.max(b.maxX - b.minX, b.maxY - b.minY) * 0.95 + 3;
  const rooms = plan.rooms.length ? plan.rooms : [];

  engine.setOrbitEnabled(false);
  engine.setSelection(null);
  if (opts.path === 'tour') engine.setCeilings(true);
  engine.setFixedSize(VIDEO_SIZES[opts.size]);

  const mime = pickMime();
  const stream = engine.renderer.domElement.captureStream(30);
  const recorder = new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond: opts.size === '4K' ? 40_000_000 : opts.size === '1080p' ? 16_000_000 : 8_000_000,
  });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);

  let startedAt = 0;
  const ease = (x: number) => 0.5 - Math.cos(Math.PI * x) / 2;

  return new Promise((resolve) => {
    // Wall-clock time, so the video lasts `seconds` even when frames drop.
    const stopUpdater = engine.addUpdater(() => {
      startedAt ||= performance.now();
      const p = Math.min(1, (performance.now() - startedAt) / 1000 / opts.seconds);
      opts.onProgress(p);
      if (opts.path === 'orbit' || !rooms.length) {
        const a = ease(p) * Math.PI * 2 + Math.PI / 4;
        camera.fov = 45;
        camera.position.set(center.x + Math.cos(a) * radius, radius * 0.55, center.z + Math.sin(a) * radius);
        camera.lookAt(center.x, 0.5, center.z);
      } else {
        const seg = Math.min(rooms.length - 1, Math.floor(p * rooms.length));
        const local = p * rooms.length - seg;
        const c = polygonCentroid(rooms[seg].points);
        const yaw = -Math.PI / 3 + ease(local) * ((2 * Math.PI) / 3) + seg * 1.3;
        camera.fov = 70;
        camera.position.set(c.x, 1.55, c.y);
        camera.lookAt(c.x + Math.sin(yaw), 1.4, c.y + Math.cos(yaw));
      }
      camera.updateProjectionMatrix();
      if (p >= 1 && recorder.state === 'recording') recorder.stop();
    });

    recorder.onstop = () => {
      stopUpdater();
      stream.getTracks().forEach((tr) => tr.stop());
      camera.fov = savedFov;
      camera.position.copy(savedPos);
      camera.quaternion.copy(savedQuat);
      camera.updateProjectionMatrix();
      engine.setFixedSize(null);
      if (opts.path === 'tour') engine.setCeilings(false);
      engine.setOrbitEnabled(true);
      resolve({ blob: new Blob(chunks, { type: mime }), ext: mime.startsWith('video/mp4') ? 'mp4' : 'webm' });
    };
    recorder.start(250);
  });
}
