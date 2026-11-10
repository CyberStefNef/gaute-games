// Shared scene implementation. The native host maps 'three' to 'three/webgpu'.
import {
  Scene,
  InstancedMesh,
  Matrix4,
  Quaternion,
  Euler,
  Object3D,
  PerspectiveCamera,
  OrthographicCamera,
  HemisphereLight,
  DirectionalLight,
  AnimationMixer,
  Raycaster,
  Vector2,
  Vector3,
  Texture,
  Color,
  RepeatWrapping,
  LinearFilter,
  LinearMipmapLinearFilter,
  type Material,
  type BufferGeometry,
  type MinificationTextureFilter,
  type MagnificationTextureFilter,
  type Wrapping,
} from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { prepareStaticModel, type StaticPart } from './scene3d-batches';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { decodeBase64, inspectGLB, MODEL_LIMITS, type ModelAsset } from './glb.mjs';
import {
  validSceneState,
  validCamera,
  type SceneCamera,
  type SceneState,
  type SceneNode,
  type ScenePick,
} from './scene3d-protocol';
export type DecodeModelImage = (bytes: Uint8Array, mime: string) => Promise<TexImageSource>;
export function createSceneWorld(decodeImage: DecodeModelImage) {
  const scene = new Scene();
  scene.background = new Color('#f5f0e8');
  scene.add(new HemisphereLight('#ffffff', '#75647d', 0.85));
  const sun = new DirectionalLight('#fff5e8', 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.025;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 140;
  sun.position.set(4, 8, 6);
  scene.add(sun, sun.target);
  const models = new Map<string, GLTF>();
  const items = new Map<
    string,
    {
      node: SceneNode;
      object: Object3D;
      mixer: AnimationMixer;
      from: Vector3;
      target: Vector3;
      elapsed: number;
      route: Vector3[];
      distance: number;
      fromRotation: Quaternion;
      targetRotation: Quaternion;
      tintMaterials?: { material: Material & { color: Color }; base: Color }[];
    }
  >();
  const batches = new Map<
    string,
    { ids: string[]; meshes: { object: InstancedMesh; transform: Matrix4 }[] }
  >();
  const instanceIds = new WeakMap<Object3D, string[]>();
  const roots = new WeakMap<Object3D, string>();
  const staticModels = new Set<string>();
  const staticParts = new Map<string, StaticPart[]>();
  const mergedGeometries: BufferGeometry[] = [];
  const instanceMatrix = new Matrix4();
  let matricesDirty = false;
  const raycaster = new Raycaster();
  let camera: PerspectiveCamera | OrthographicCamera = new PerspectiveCamera(40, 1, 0.1, 10000);
  camera.position.set(7, 7, 9);
  camera.lookAt(0, 0, 0);
  const pending = new Set<string>();
  const costs = new Map<string, { triangles: number; draws: number }>();
  let texturePixels = 0;
  let aspect = 1,
    disposed = false;
  const images: TexImageSource[] = [];
  const release = (model: GLTF) => {
    const geometries = new Set<BufferGeometry>(),
      materials = new Set<Material>(),
      textures = new Set<Texture>();
    model.scene.traverse((object) => {
      const mesh = object as Object3D & {
        geometry?: BufferGeometry;
        material?: Material | Material[];
      };
      if (mesh.geometry) geometries.add(mesh.geometry);
      for (const m of Array.isArray(mesh.material)
        ? mesh.material
        : mesh.material
          ? [mesh.material]
          : []) {
        materials.add(m);
        for (const value of Object.values(m)) if (value instanceof Texture) textures.add(value);
      }
    });
    geometries.forEach((g) => g.dispose());
    materials.forEach((m) => m.dispose());
    textures.forEach((t) => t.dispose());
  };
  async function load(id: string, asset: ModelAsset) {
    if (disposed) throw Error('Scene disposed');
    if (models.has(id) || pending.has(id) || models.size + pending.size >= MODEL_LIMITS.models)
      throw Error('Duplicate model or model limit exceeded');
    if (asset.format !== 'glb') throw Error('Expected an embedded GLB');
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id)) throw Error('Invalid model id');
    const { json, text, bin, texturePixels: pixels } = inspectGLB(decodeBase64(asset.data));
    if (texturePixels + pixels > 16 * 1024 * 1024) throw Error('Scene texture budget exceeded');
    texturePixels += pixels;
    pending.add(id);
    const modelImages: TexImageSource[] = [];
    try {
      const loader = new GLTFLoader();
      // Parse JSON directly, avoiding TextDecoder/browser fetch assumptions on Hermes.
      // All buffer views and images come from the already validated embedded binary.
      loader.register((parser) => ({
        name: 'GAUTE_embedded_assets',
        loadBufferView(index) {
          const b = json.bufferViews?.[index];
          if (!b) return Promise.reject(Error('Invalid buffer view'));
          return Promise.resolve(
            bin.slice(b.byteOffset ?? 0, (b.byteOffset ?? 0) + b.byteLength).buffer,
          );
        },
        async loadTexture(index) {
          const t = json.textures?.[index],
            image = t && json.images?.[t.source];
          const b = image && json.bufferViews?.[image.bufferView];
          if (!image || !b) throw Error('Invalid embedded texture');
          const bitmap = await decodeImage(
            bin.slice(b.byteOffset ?? 0, (b.byteOffset ?? 0) + b.byteLength),
            image.mimeType,
          );
          if (disposed) {
            if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close();
            throw Error('Scene disposed');
          }
          modelImages.push(bitmap);
          const texture = new Texture(bitmap);
          texture.flipY = false;
          const sampler = t?.sampler === undefined ? undefined : json.samplers?.[t.sampler];
          const filter = (n: number | undefined, fallback: number) =>
            ({ 9728: 1003, 9729: 1006, 9984: 1004, 9985: 1007, 9986: 1005, 9987: 1008 })[n ?? 0] ??
            fallback;
          texture.magFilter = filter(
            sampler?.magFilter,
            LinearFilter,
          ) as MagnificationTextureFilter;
          texture.minFilter = filter(
            sampler?.minFilter,
            LinearMipmapLinearFilter,
          ) as MinificationTextureFilter;
          const wrap = (n?: number) => (n === 33071 ? 1001 : n === 33648 ? 1002 : RepeatWrapping);
          texture.wrapS = wrap(sampler?.wrapS) as Wrapping;
          texture.wrapT = wrap(sampler?.wrapT) as Wrapping;
          texture.needsUpdate = true;
          parser.associations.set(texture, { textures: index });
          return texture;
        },
      }));
      const model = await loader.parseAsync(text, '');
      if (disposed) {
        release(model);
        for (const image of modelImages)
          if ('close' in image && typeof image.close === 'function') image.close();
        return;
      }
      let triangles = 0,
        draws = 0;
      model.scene.traverse((object) => {
        const g = (object as Object3D & { geometry?: BufferGeometry }).geometry;
        if (g) {
          triangles += (g.index?.count ?? g.getAttribute('position')?.count ?? 0) / 3;
          draws += Math.max(1, g.groups.length);
        }
      });
      let canInstance = model.animations.length === 0;
      model.scene.traverse((object) => {
        const mesh = object as Object3D & {
          isSkinnedMesh?: boolean;
          morphTargetInfluences?: number[];
        };
        if (mesh.isSkinnedMesh || mesh.morphTargetInfluences?.length) canInstance = false;
      });
      if (canInstance) {
        staticModels.add(id);
        const prepared = prepareStaticModel(model.scene);
        staticParts.set(id, prepared.parts);
        mergedGeometries.push(...prepared.owned);
        draws = prepared.parts.reduce(
          (n, p) => n + (Array.isArray(p.material) ? p.material.length : 1),
          0,
        );
      }
      model.scene.traverse((object) => {
        const mesh = object as Object3D & { material?: Material | Material[] };
        for (const material of Array.isArray(mesh.material)
          ? mesh.material
          : mesh.material
            ? [mesh.material]
            : [])
          if (material.userData.flatShading === true)
            (material as Material & { flatShading: boolean }).flatShading = true;
      });
      costs.set(id, { triangles, draws });
      models.set(id, model);
      images.push(...modelImages);
    } catch (error) {
      texturePixels -= pixels;
      for (const image of modelImages)
        if ('close' in image && typeof image.close === 'function') image.close();
      throw error;
    } finally {
      pending.delete(id);
    }
  }
  function update(state: SceneState) {
    if (disposed) return;
    if (!validSceneState(state)) throw Error('Invalid scene state');
    for (const node of state.nodes)
      if (!models.has(node.model)) throw Error(`Model not loaded: ${node.model}`);
    const triangles = state.nodes.reduce((n, node) => n + costs.get(node.model)!.triangles, 0);
    const staticUsed = new Set(
      state.nodes.filter((node) => staticModels.has(node.model)).map((node) => node.model),
    );
    const draws =
      state.nodes
        .filter((node) => !staticModels.has(node.model))
        .reduce((n, node) => n + costs.get(node.model)!.draws, 0) +
      [...staticUsed].reduce((n, id) => n + costs.get(id)!.draws, 0);
    if (triangles > 500000 || draws > 2048) throw Error('Scene geometry budget exceeded');
    const desired = new Set(state.nodes.map((n) => n.id));
    for (const [id, item] of items)
      if (!desired.has(id) || state.nodes.find((n) => n.id === id)?.model !== item.node.model) {
        item.mixer.stopAllAction();
        item.mixer.uncacheRoot(item.object);
        item.object.traverse((object) => {
          const mesh = object as Object3D & { skeleton?: { dispose: () => void } };
          mesh.skeleton?.dispose();
        });
        item.tintMaterials?.forEach(({ material }) => material.dispose());
        scene.remove(item.object);
        items.delete(id);
      }
    for (const input of state.nodes) {
      const node = { ...input, position: [...input.position] as [number, number, number] };
      let item = items.get(node.id);
      const created = !item;
      if (!item) {
        const object = staticModels.has(node.model)
          ? new Object3D()
          : clone(models.get(node.model)!.scene);
        object.visible = !staticModels.has(node.model);
        object.traverse((child) => {
          child.castShadow = true;
          child.receiveShadow = true;
        });
        roots.set(object, node.id);
        object.userData.sceneNodeId = node.id;
        object.position.fromArray(node.position);
        scene.add(object);
        item = {
          node,
          object,
          mixer: new AnimationMixer(object),
          from: object.position.clone(),
          target: object.position.clone(),
          elapsed: 0,
          route: [],
          distance: 0,
          fromRotation: object.quaternion.clone(),
          targetRotation: object.quaternion.clone(),
        };
        items.set(node.id, item);
      }
      if (item.node.animation !== node.animation || created) {
        item.mixer.stopAllAction();
        const clip = models.get(node.model)!.animations.find((a) => a.name === node.animation);
        if (clip) item.mixer.clipAction(clip).play();
      }
      if (!item.target.equals(new Vector3(...node.position)) || created) {
        item.from.copy(item.object.position);
        item.fromRotation.copy(item.object.quaternion);
        item.target.fromArray(node.position);
        item.elapsed = 0;
        item.route = [
          item.from.clone(),
          ...(node.path ?? []).map((p) => new Vector3(...p)),
          item.target.clone(),
        ];
        item.distance = item.route.reduce(
          (sum, p, i) => sum + (i ? p.distanceTo(item!.route[i - 1]) : 0),
          0,
        );
      }
      if (node.tint || item.tintMaterials) {
        if (!item.tintMaterials) {
          item.tintMaterials = [];
          item.object.traverse((object) => {
            const mesh = object as Object3D & { material?: Material | Material[] };
            if (!mesh.material) return;
            const tintMaterial = (source: Material) => {
              const material = source.clone() as Material & { color?: Color };
              if (material.color)
                item!.tintMaterials!.push({
                  material: material as Material & { color: Color },
                  base: material.color.clone(),
                });
              return material;
            };
            mesh.material = Array.isArray(mesh.material)
              ? mesh.material.map(tintMaterial)
              : tintMaterial(mesh.material);
          });
        }
        for (const { material, base } of item.tintMaterials)
          material.color.copy(base).multiply(new Color(node.tint ?? '#ffffff'));
      }
      item.node = node;
      item.targetRotation.setFromEuler(new Euler(...(node.rotation ?? [0, 0, 0])));
      if (created || !node.transitionMs) item.object.quaternion.copy(item.targetRotation);
      item.object.scale.setScalar(node.scale ?? 1);
      if (!node.transitionMs) item.object.position.fromArray(node.position);
    }
    // Retain instance buffers while IDs are stable. Static models share GPU draws.
    for (const [model, batch] of batches) {
      const ids = state.nodes.filter((n) => n.model === model).map((n) => n.id);
      if (ids.join('|') !== batch.ids.join('|')) {
        batch.meshes.forEach((m) => {
          scene.remove(m.object);
          m.object.dispose();
        });
        batches.delete(model);
      }
    }
    for (const model of staticUsed)
      if (!batches.has(model)) {
        const ids = state.nodes.filter((n) => n.model === model).map((n) => n.id);
        const meshes: { object: InstancedMesh; transform: Matrix4 }[] = [];
        for (const part of staticParts.get(model)!) {
          const object3d = new InstancedMesh(part.geometry, part.material, ids.length);
          object3d.castShadow = (
            Array.isArray(part.material) ? part.material : [part.material]
          ).some((m) => m.userData.castShadow !== false);
          object3d.receiveShadow = true;
          object3d.frustumCulled = false;
          instanceIds.set(object3d, ids);
          scene.add(object3d);
          meshes.push({ object: object3d, transform: part.transform });
        }
        batches.set(model, { ids, meshes });
      }
    matricesDirty = true;
    setCamera(state.camera);
    scene.background = new Color(state.background ?? '#f5f0e8');
  }
  function setCamera(value: SceneCamera) {
    if (!validCamera(value)) throw Error('Invalid scene camera');
    if (value.projection === 'orthographic' && !(camera instanceof OrthographicCamera))
      camera = new OrthographicCamera(-5, 5, 5, -5, 0.1, 10000);
    if (value.projection !== 'orthographic' && !(camera instanceof PerspectiveCamera))
      camera = new PerspectiveCamera(40, aspect, 0.1, 10000);
    camera.position.fromArray(value.position);
    camera.lookAt(...value.target);
    sun.target.position.fromArray(value.target);
    const key = new Vector3(-20, 35, 30).applyQuaternion(camera.quaternion);
    sun.position.copy(sun.target.position).add(key);
    const extent = Math.max(15, Math.min(60, (value.span ?? 20) * 1.25));
    sun.shadow.camera.left = -extent;
    sun.shadow.camera.right = extent;
    sun.shadow.camera.top = extent;
    sun.shadow.camera.bottom = -extent;
    sun.shadow.camera.updateProjectionMatrix();
    if (camera instanceof OrthographicCamera) {
      const span = value.span ?? 10;
      camera.top = span / 2;
      camera.bottom = -span / 2;
      camera.left = (-span * aspect) / 2;
      camera.right = (span * aspect) / 2;
    }
    camera.updateProjectionMatrix();
  }
  function setColors(id: string, rgba: string) {
    const parts = staticParts.get(id);
    if (!parts || parts.length !== 1) throw Error('Colour updates require a single static mesh');
    const color = parts[0].geometry.getAttribute('color');
    if (
      !color ||
      color.itemSize !== 4 ||
      !color.normalized ||
      !(color.array instanceof Uint8Array) ||
      'isInterleavedBufferAttribute' in color
    )
      throw Error('Expected packed RGBA vertex colours');
    const bytes = decodeBase64(rgba);
    if (bytes.length !== color.array.length)
      throw Error('Vertex colour count does not match the model');
    color.array.set(bytes);
    color.needsUpdate = true;
  }
  function resize(width: number, height: number) {
    aspect = width / Math.max(1, height);
    if (camera instanceof PerspectiveCamera) camera.aspect = aspect;
    else {
      camera.left = camera.bottom * aspect;
      camera.right = camera.top * aspect;
    }
    camera.updateProjectionMatrix();
  }
  function tick(delta: number) {
    for (const item of items.values()) {
      const moving = item.node.transitionMs && item.elapsed < item.node.transitionMs;
      item.elapsed += delta * 1000;
      if (item.node.transitionMs && item.route.length) {
        let distance = Math.min(1, item.elapsed / item.node.transitionMs) * item.distance;
        for (let i = 1; i < item.route.length; i++) {
          const length = item.route[i - 1].distanceTo(item.route[i]);
          if (distance <= length || i === item.route.length - 1) {
            item.object.position.lerpVectors(
              item.route[i - 1],
              item.route[i],
              length ? Math.min(1, distance / length) : 1,
            );
            break;
          }
          distance -= length;
        }
      }
      if (item.node.transitionMs && moving)
        item.object.quaternion.slerpQuaternions(
          item.fromRotation,
          item.targetRotation,
          Math.min(1, item.elapsed / item.node.transitionMs),
        );
      item.mixer.update(delta);
      if (moving) matricesDirty = true;
    }
    if (matricesDirty) {
      for (const batch of batches.values())
        for (const mesh of batch.meshes) {
          batch.ids.forEach((id, index) => {
            const item = items.get(id)!;
            item.object.updateMatrixWorld(true);
            instanceMatrix.multiplyMatrices(item.object.matrixWorld, mesh.transform);
            mesh.object.setMatrixAt(index, instanceMatrix);
            mesh.object.setColorAt(index, new Color(item.node.tint ?? '#ffffff'));
          });
          mesh.object.instanceMatrix.needsUpdate = true;
          if (mesh.object.instanceColor) mesh.object.instanceColor.needsUpdate = true;
          mesh.object.boundingSphere = null;
          mesh.object.boundingBox = null;
        }
      matricesDirty = false;
    }
  }
  function pick(x: number, y: number): ScenePick {
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    raycaster.setFromCamera(new Vector2(x, y), camera);
    tick(0);
    for (const item of items.values())
      item.object.traverse((object) => {
        const mesh = object as Object3D & {
          isSkinnedMesh?: boolean;
          computeBoundingSphere?: () => void;
        };
        if (mesh.isSkinnedMesh) mesh.computeBoundingSphere?.();
      });
    const targets = [...items.values()]
      .filter((i) => !staticModels.has(i.node.model))
      .map((i) => i.object);
    for (const batch of batches.values()) targets.push(...batch.meshes.map((m) => m.object));
    const hit = raycaster.intersectObjects(targets, true)[0];
    if (!hit) return { id: null, point: null };
    if (hit.instanceId !== undefined) {
      const ids = instanceIds.get(hit.object);
      if (ids)
        return {
          id: ids[hit.instanceId] ?? null,
          point: hit.point.toArray() as [number, number, number],
        };
    }
    let root: Object3D | null = hit.object;
    while (root && !roots.has(root)) root = root.parent;
    return {
      id: root ? (roots.get(root) ?? null) : null,
      point: hit.point.toArray() as [number, number, number],
    };
  }
  function dispose() {
    disposed = true;
    items.forEach((i) => {
      i.mixer.stopAllAction();
      i.mixer.uncacheRoot(i.object);
      i.object.traverse((object) => {
        const mesh = object as Object3D & { skeleton?: { dispose: () => void } };
        mesh.skeleton?.dispose();
      });
    });
    items.clear();
    batches.forEach((b) => b.meshes.forEach((m) => m.object.dispose()));
    batches.clear();
    mergedGeometries.forEach((g) => g.dispose());
    mergedGeometries.length = 0;
    staticParts.clear();
    models.forEach(release);
    sun.shadow.dispose();
    models.clear();
    scene.clear();
    for (const image of images)
      if ('close' in image && typeof image.close === 'function') image.close();
    images.length = 0;
  }
  return {
    scene,
    get camera() {
      return camera;
    },
    load,
    update,
    setCamera,
    setColors,
    resize,
    tick,
    pick,
    dispose,
  };
}
