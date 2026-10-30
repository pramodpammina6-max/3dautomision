import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import type { FloorPlan, Selection } from '@/common/types';
import { planBounds } from '@/common/geometry/plan';
import { toThreeMaterial } from '@/features/material-editor/service/threeMaterials';
import { buildPlanGroup, disposeGroup } from './buildScene';

export type Quality = 'draft' | 'high' | 'ultra';
export type TransformMode = 'translate' | 'rotate';

export interface FurnitureTransform {
  id: string;
  x: number;
  y: number;
  rotation: number;
}

/**
 * Owns the WebGL renderer, scene, cameras and controls. One Engine per mounted viewer;
 * walkthrough, XR and render features plug into it through updaters and accessors.
 */
export class Engine {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly orbit: OrbitControls;
  readonly transform: TransformControls;
  planGroup = new THREE.Group();

  onSelect?: (sel: Selection | null) => void;
  onFurnitureTransform?: (t: FurnitureTransform) => void;
  /** Disabled during walkthrough so clicks don't select things. */
  pickingEnabled = true;

  private plan: FloorPlan | null = null;
  private ceilings = false;
  private quality: Quality = 'high';
  private composer: EffectComposer | null = null;
  private materials = new Map<string, { key: string; mat: THREE.Material }>();
  private updaters = new Set<(dt: number) => void>();
  private selection: Selection | null = null;
  private selectionBox: THREE.BoxHelper | null = null;
  private sun: THREE.DirectionalLight;
  private timer = new THREE.Timer();
  private resizeObserver: ResizeObserver;
  private fitted = false;
  private downAt = { x: 0, y: 0 };

  constructor(private container: HTMLElement) {
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.xr.enabled = true;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.touchAction = 'none';
    container.appendChild(this.renderer.domElement);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    this.scene.environmentIntensity = 0.55;
    this.scene.background = new THREE.Color('#dde4ec');
    this.scene.fog = new THREE.Fog('#dde4ec', 60, 160);

    this.scene.add(new THREE.HemisphereLight('#f4f7ff', '#b7a991', 0.6));
    this.sun = new THREE.DirectionalLight('#fff3e0', 2.2);
    this.sun.castShadow = true;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.02;
    this.scene.add(this.sun, this.sun.target);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(120, 64),
      new THREE.MeshStandardMaterial({ color: '#c9d1c3', roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    ground.receiveShadow = true;
    ground.userData = { kind: 'ground' };
    this.scene.add(ground);

    this.camera = new THREE.PerspectiveCamera(50, 1, 0.05, 400);
    this.camera.position.set(12, 14, 18);

    this.orbit = new OrbitControls(this.camera, this.renderer.domElement);
    this.orbit.enableDamping = true;
    this.orbit.maxPolarAngle = Math.PI / 2.05;
    this.orbit.minDistance = 1;
    this.orbit.maxDistance = 120;

    this.transform = new TransformControls(this.camera, this.renderer.domElement);
    this.transform.showY = false;
    this.transform.setTranslationSnap(0.05);
    this.transform.setRotationSnap(THREE.MathUtils.degToRad(15));
    this.transform.addEventListener('dragging-changed', (e) => {
      this.orbit.enabled = !e.value;
      if (!e.value) this.emitFurnitureTransform();
    });
    this.transform.addEventListener('objectChange', () => this.selectionBox?.update());
    this.scene.add(this.transform.getHelper());

    this.scene.add(this.planGroup);

    const el = this.renderer.domElement;
    el.addEventListener('pointerdown', this.onPointerDown);
    el.addEventListener('pointerup', this.onPointerUp);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.resize();
    this.setQuality('high');
    this.renderer.setAnimationLoop(this.tick);
  }

  // ---------- plan ----------

  setPlan(plan: FloorPlan, ceilings = this.ceilings) {
    this.plan = plan;
    this.ceilings = ceilings;
    this.syncMaterials(plan);

    const attachedId = (this.transform.object?.userData as { id?: string } | undefined)?.id;
    this.transform.detach();
    this.scene.remove(this.planGroup);
    disposeGroup(this.planGroup);

    this.planGroup = buildPlanGroup(plan, { ceilings, material: (id) => this.material(id) });
    this.scene.add(this.planGroup);
    this.fitShadows();
    if (!this.fitted && (plan.walls.length || plan.rooms.length)) {
      this.fitView();
      this.fitted = true;
    }
    this.applySelection(this.selection, attachedId);
  }

  getPlan() {
    return this.plan;
  }

  setCeilings(on: boolean) {
    if (this.plan && on !== this.ceilings) this.setPlan(this.plan, on);
  }

  private syncMaterials(plan: FloorPlan) {
    const seen = new Set<string>();
    for (const m of plan.materials) {
      seen.add(m.id);
      const key = JSON.stringify(m);
      const cached = this.materials.get(m.id);
      if (cached?.key === key) continue;
      cached?.mat.dispose();
      this.materials.set(m.id, { key, mat: toThreeMaterial(m) });
    }
    for (const [id, { mat }] of this.materials) {
      if (!seen.has(id)) {
        mat.dispose();
        this.materials.delete(id);
      }
    }
  }

  private fallback = new THREE.MeshStandardMaterial({ color: '#cccccc', roughness: 0.8 });

  private material(id: string) {
    return this.materials.get(id)?.mat ?? this.fallback;
  }

  // ---------- camera ----------

  center() {
    const b = this.plan ? planBounds(this.plan) : { minX: 0, minY: 0, maxX: 10, maxY: 8 };
    return {
      center: new THREE.Vector3((b.minX + b.maxX) / 2, 0, (b.minY + b.maxY) / 2),
      size: Math.max(b.maxX - b.minX, b.maxY - b.minY, 4),
    };
  }

  fitView() {
    const { center, size } = this.center();
    this.camera.position.set(center.x + size * 0.55, size * 1.05, center.z + size * 1.05);
    this.orbit.target.copy(center);
    this.orbit.update();
  }

  private fitShadows() {
    const { center, size } = this.center();
    const s = this.sun.shadow.camera;
    const half = size * 0.8;
    s.left = -half;
    s.right = half;
    s.top = half;
    s.bottom = -half;
    s.near = 0.5;
    s.far = size * 4;
    s.updateProjectionMatrix();
    this.sun.position.set(center.x + size * 0.6, size * 1.4, center.z + size * 0.35);
    this.sun.target.position.copy(center);
  }

  // ---------- quality ----------

  setQuality(q: Quality) {
    this.quality = q;
    const dpr = window.devicePixelRatio || 1;
    const width = this.container.clientWidth || 1;
    const ratio = q === 'draft' ? 1 : q === 'high' ? Math.min(dpr, 2) : Math.min(Math.max(dpr, 3840 / width), 3);
    this.renderer.setPixelRatio(ratio);
    this.renderer.shadowMap.enabled = q !== 'draft';
    const mapSize = q === 'ultra' ? 4096 : 2048;
    if (this.sun.shadow.mapSize.x !== mapSize) {
      this.sun.shadow.mapSize.set(mapSize, mapSize);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
    this.scene.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (m) m.needsUpdate = true;
    });
    this.composer?.dispose();
    this.composer = q === 'ultra' ? this.createComposer() : null;
    this.resize();
  }

  getQuality() {
    return this.quality;
  }

  /** Ultra pipeline: ground-truth ambient occlusion + SMAA, tone mapping in OutputPass. */
  private createComposer() {
    const { clientWidth: w, clientHeight: h } = this.container;
    const composer = new EffectComposer(this.renderer);
    composer.addPass(new RenderPass(this.scene, this.camera));
    const gtao = new GTAOPass(this.scene, this.camera, w, h);
    gtao.blendIntensity = 0.85;
    composer.addPass(gtao);
    composer.addPass(new SMAAPass());
    composer.addPass(new OutputPass());
    return composer;
  }

  // ---------- selection ----------

  setSelection(sel: Selection | null) {
    this.selection = sel;
    this.applySelection(sel);
  }

  setTransformMode(mode: TransformMode) {
    this.transform.setMode(mode);
    this.transform.showX = mode === 'translate';
    this.transform.showZ = mode === 'translate';
    this.transform.showY = mode === 'rotate';
  }

  private findObject(sel: Selection): THREE.Object3D | undefined {
    if (sel.kind === 'opening') {
      let found: THREE.Object3D | undefined;
      this.planGroup.traverse((o) => {
        if (!found && o.userData.kind === 'opening' && o.userData.id === sel.id) found = o.parent ?? o;
      });
      return found;
    }
    return this.planGroup.children.find((o) => o.userData.kind === sel.kind && o.userData.id === sel.id);
  }

  private applySelection(sel: Selection | null, attachId?: string) {
    if (this.selectionBox) {
      this.scene.remove(this.selectionBox);
      this.selectionBox.dispose();
      this.selectionBox = null;
    }
    const obj = sel ? this.findObject(sel) : undefined;
    if (obj) {
      this.selectionBox = new THREE.BoxHelper(obj, '#6366f1');
      this.scene.add(this.selectionBox);
    }
    const furnitureId = sel?.kind === 'furniture' ? sel.id : attachId;
    if (obj && sel?.kind === 'furniture' && furnitureId && this.pickingEnabled) this.transform.attach(obj);
    else this.transform.detach();
  }

  private emitFurnitureTransform() {
    const obj = this.transform.object;
    if (!obj || obj.userData.kind !== 'furniture') return;
    let rotation = Math.round(-THREE.MathUtils.radToDeg(obj.rotation.y));
    rotation = ((rotation % 360) + 360) % 360;
    this.onFurnitureTransform?.({
      id: obj.userData.id,
      x: +obj.position.x.toFixed(3),
      y: +obj.position.z.toFixed(3),
      rotation,
    });
  }

  private raycaster = new THREE.Raycaster();

  pick(clientX: number, clientY: number): Selection | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - rect.left) / rect.width) * 2 - 1, -((clientY - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    for (const hit of this.raycaster.intersectObject(this.planGroup, true)) {
      const { kind, id } = hit.object.userData as { kind?: string; id?: string };
      if (id && (kind === 'wall' || kind === 'opening' || kind === 'room' || kind === 'furniture')) return { kind, id };
    }
    return null;
  }

  private onPointerDown = (e: PointerEvent) => {
    this.downAt = { x: e.clientX, y: e.clientY };
  };

  private onPointerUp = (e: PointerEvent) => {
    if (!this.pickingEnabled || this.transform.dragging) return;
    if (Math.hypot(e.clientX - this.downAt.x, e.clientY - this.downAt.y) > 4) return;
    // TransformControls swallows clicks on its own handles
    if ((this.transform as unknown as { axis: string | null }).axis) return;
    this.onSelect?.(this.pick(e.clientX, e.clientY));
  };

  // ---------- walkthrough support ----------

  /** Meshes that block movement: walls, doors/windows frames, and furniture taller than 0.3 m. */
  collisionMeshes(): THREE.Object3D[] {
    const out: THREE.Object3D[] = [];
    this.planGroup.traverse((o) => {
      const kind = o.userData.kind;
      if (!(o as THREE.Mesh).isMesh) return;
      if (kind === 'wall') out.push(o);
      if (kind === 'opening' && this.plan?.openings.find((x) => x.id === o.userData.id)?.kind === 'window') out.push(o);
      if (kind === 'furniture') {
        const f = this.plan?.furniture.find((x) => x.id === o.userData.id);
        if (f && f.height > 0.3) out.push(o);
      }
    });
    return out;
  }

  floorMeshes(): THREE.Object3D[] {
    return this.planGroup.children.filter((o) => o.userData.kind === 'room');
  }

  addUpdater(fn: (dt: number) => void) {
    this.updaters.add(fn);
    return () => this.updaters.delete(fn);
  }

  setPicking(on: boolean) {
    this.pickingEnabled = on;
  }

  setOrbitEnabled(on: boolean) {
    this.orbit.enabled = on;
    if (!on) this.transform.detach();
  }

  // ---------- rendering ----------

  private resize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    if (this.renderer.xr.isPresenting) return;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.composer?.setPixelRatio(this.renderer.getPixelRatio());
    this.composer?.setSize(w, h);
  }

  private renderFrame() {
    if (this.composer && !this.renderer.xr.isPresenting) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }

  private tick = () => {
    this.timer.update();
    const dt = Math.min(this.timer.getDelta(), 0.1);
    this.updaters.forEach((fn) => fn(dt));
    if (this.orbit.enabled) this.orbit.update();
    this.renderFrame();
  };

  /** Renders one frame at an exact pixel size (e.g. 3840×2160) and returns a PNG data URL. */
  renderImage(width: number, height: number): string {
    const prevQuality = this.quality;
    const prevRatio = this.renderer.getPixelRatio();
    const helpers = [this.transform.getHelper(), this.selectionBox].filter(Boolean) as THREE.Object3D[];
    helpers.forEach((h) => (h.visible = false));

    if (!this.composer) this.composer = this.createComposer();
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(width, height, false);
    this.composer.setPixelRatio(1);
    this.composer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.composer.render();
    const url = this.renderer.domElement.toDataURL('image/png');

    helpers.forEach((h) => (h.visible = true));
    this.renderer.setPixelRatio(prevRatio);
    this.setQuality(prevQuality);
    return url;
  }

  /** Locks the drawing buffer to a fixed size (for video capture); pass null to restore. */
  setFixedSize(size: { width: number; height: number } | null) {
    if (!size) return this.setQuality(this.quality);
    this.renderer.setPixelRatio(1);
    this.renderer.setSize(size.width, size.height, false);
    this.composer?.setPixelRatio(1);
    this.composer?.setSize(size.width, size.height);
    this.camera.aspect = size.width / size.height;
    this.camera.updateProjectionMatrix();
  }

  dispose() {
    this.renderer.setAnimationLoop(null);
    this.resizeObserver.disconnect();
    const el = this.renderer.domElement;
    el.removeEventListener('pointerdown', this.onPointerDown);
    el.removeEventListener('pointerup', this.onPointerUp);
    this.transform.detach();
    this.transform.dispose();
    this.orbit.dispose();
    disposeGroup(this.planGroup);
    this.materials.forEach(({ mat }) => mat.dispose());
    this.composer?.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    el.remove();
  }
}
