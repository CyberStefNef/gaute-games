import { MODEL_LIMITS, type ModelAsset } from './glb.mjs';
export type { ModelAsset } from './glb.mjs';
export const SCENE3D_MARKER = '__GAUTE_SCENE3D_V1__';
export const SCENE3D_MESSAGE_BYTES = 1536 * 1024;
export type Vec3 = readonly [number, number, number];
export type SceneNode = {
  id: string;
  model: string;
  position: Vec3;
  rotation?: Vec3;
  scale?: number;
  animation?: string;
  /** Multiply model colours, including per-instance ownership/fog. */
  tint?: string;
  /** Host interpolates movement, without sending per-frame messages. */
  transitionMs?: number;
  /** Optional intermediate points, followed in order during the transition. */
  path?: readonly Vec3[];
};
export type SceneState = {
  nodes: readonly SceneNode[];
  camera: SceneCamera;
  background?: string;
};
export type SceneCamera = {
  position: Vec3;
  target: Vec3;
  projection?: 'perspective' | 'orthographic';
  span?: number;
};
/** Pan deltas are fractions of the viewport; zoom is a multiplicative factor. */
export type SceneGesture =
  | { type: 'pan'; dx: number; dy: number }
  | { type: 'zoom'; factor: number };
export type ScenePick = { id: string | null; point: Vec3 | null };
export type SceneController = {
  readonly backend: 'webgl2' | 'native-webgpu';
  load: (id: string, model: ModelAsset) => Promise<void>;
  update: (state: SceneState) => Promise<void>;
  setCamera: (camera: SceneCamera) => Promise<void>;
  setVisible: (visible: boolean) => Promise<void>;
  setColors: (model: string, rgba: string) => Promise<void>;
  dispose: () => void;
};
export type SceneOptions = {
  onPick?: (pick: ScenePick) => void;
  onGesture?: (gesture: SceneGesture) => void;
  onError?: (reason: string) => void;
};
export type SceneFactory = (
  element: HTMLElement,
  options: SceneOptions,
) => Promise<SceneController>;
export type SceneRect = { x: number; y: number; width: number; height: number };
export type SceneCommandBody =
  | { type: 'open'; rect: SceneRect }
  | { type: 'rect'; rect: SceneRect }
  | { type: 'load'; id: string; model: ModelAsset }
  | { type: 'update'; state: SceneState }
  | { type: 'camera'; camera: SceneCamera }
  | { type: 'visible'; visible: boolean }
  | { type: 'colors'; model: string; rgba: string }
  | { type: 'dispose' };
export type SceneCommand = { scene3d: 1; scene: string; request: number } & SceneCommandBody;
export type SceneReply = { scene3d: 1; scene: string } & (
  | { type: 'result'; request: number; ok: boolean; reason?: string }
  | { type: 'pick'; pick: ScenePick }
  | { type: 'gesture'; gesture: SceneGesture }
  | { type: 'error'; reason: string }
);
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === 'object' && !Array.isArray(v);
const number = (v: unknown, min = -10000, max = 10000): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;
const id = (v: unknown): v is string => typeof v === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(v);
const vec = (v: unknown): v is Vec3 =>
  Array.isArray(v) && v.length === 3 && v.every((n) => number(n));
function node(v: unknown): v is SceneNode {
  return (
    record(v) &&
    id(v.id) &&
    id(v.model) &&
    vec(v.position) &&
    (v.rotation === undefined || vec(v.rotation)) &&
    (v.scale === undefined || number(v.scale, 0.001, 100)) &&
    (v.tint === undefined || (typeof v.tint === 'string' && /^#[0-9a-f]{6}$/i.test(v.tint))) &&
    (v.animation === undefined || (typeof v.animation === 'string' && v.animation.length <= 128)) &&
    (v.path === undefined || (Array.isArray(v.path) && v.path.length <= 64 && v.path.every(vec))) &&
    (v.transitionMs === undefined || number(v.transitionMs, 0, 5000))
  );
}
export function validSceneState(v: unknown): v is SceneState {
  if (
    !record(v) ||
    !Array.isArray(v.nodes) ||
    v.nodes.length > 1024 ||
    !v.nodes.every(node) ||
    new Set(v.nodes.map((n) => n.id)).size !== v.nodes.length
  )
    return false;
  return (
    validCamera(v.camera) &&
    (v.background === undefined ||
      (typeof v.background === 'string' && /^#[0-9a-f]{6}$/i.test(v.background)))
  );
}
export function validCamera(c: unknown): c is SceneCamera {
  return (
    record(c) &&
    vec(c.position) &&
    vec(c.target) &&
    (c.projection === undefined ||
      c.projection === 'perspective' ||
      c.projection === 'orthographic') &&
    (c.span === undefined || number(c.span, 0.1, 1000))
  );
}
export function validGesture(g: unknown): g is SceneGesture {
  return (
    record(g) &&
    ((g.type === 'pan' && number(g.dx, -2, 2) && number(g.dy, -2, 2)) ||
      (g.type === 'zoom' && number(g.factor, 0.1, 10)))
  );
}

export function validRect(v: unknown): v is SceneRect {
  return (
    record(v) && number(v.x) && number(v.y) && number(v.width, 1, 4096) && number(v.height, 1, 4096)
  );
}
export function parseSceneCommand(raw: unknown): SceneCommand | null {
  if (
    typeof raw !== 'string' ||
    raw.length > SCENE3D_MESSAGE_BYTES ||
    new TextEncoder().encode(raw).byteLength > SCENE3D_MESSAGE_BYTES
  )
    return null;
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch {
    return null;
  }
  if (
    !record(v) ||
    v.scene3d !== 1 ||
    !id(v.scene) ||
    !number(v.request, 1, Number.MAX_SAFE_INTEGER)
  )
    return null;
  const base = { scene3d: 1 as const, scene: v.scene, request: v.request };
  if ((v.type === 'open' || v.type === 'rect') && validRect(v.rect))
    return { ...base, type: v.type, rect: { ...v.rect } };
  if (
    v.type === 'colors' &&
    id(v.model) &&
    typeof v.rgba === 'string' &&
    v.rgba.length <= Math.ceil(MODEL_LIMITS.bytes / 3) * 4
  )
    return { ...base, type: 'colors', model: v.model, rgba: v.rgba };
  if (v.type === 'visible' && typeof v.visible === 'boolean')
    return { ...base, type: 'visible', visible: v.visible };
  if (v.type === 'camera' && validCamera(v.camera))
    return { ...base, type: 'camera', camera: v.camera };
  if (v.type === 'dispose') return { ...base, type: v.type };
  if (v.type === 'update' && validSceneState(v.state))
    return { ...base, type: v.type, state: v.state };
  if (
    v.type === 'load' &&
    id(v.id) &&
    record(v.model) &&
    v.model.format === 'glb' &&
    typeof v.model.data === 'string' &&
    v.model.data.length <= Math.ceil(MODEL_LIMITS.bytes / 3) * 4
  )
    return { ...base, type: v.type, id: v.id, model: { format: 'glb', data: v.model.data } };
  return null;
}
export function parseSceneReply(raw: unknown): SceneReply | null {
  let v: unknown = raw;
  if (typeof raw === 'string') {
    if (raw.length > 2048) return null;
    try {
      v = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!record(v) || v.scene3d !== 1 || !id(v.scene)) return null;
  const base = { scene3d: 1 as const, scene: v.scene };
  if (v.type === 'gesture' && validGesture(v.gesture))
    return { ...base, type: 'gesture', gesture: v.gesture };
  if (v.type === 'error' && typeof v.reason === 'string')
    return { ...base, type: 'error', reason: v.reason.slice(0, 200) };
  if (
    v.type === 'result' &&
    number(v.request, 1, Number.MAX_SAFE_INTEGER) &&
    typeof v.ok === 'boolean'
  )
    return {
      ...base,
      type: v.type,
      request: v.request,
      ok: v.ok,
      reason: typeof v.reason === 'string' ? v.reason.slice(0, 200) : undefined,
    };
  if (
    v.type === 'pick' &&
    record(v.pick) &&
    (v.pick.id === null || id(v.pick.id)) &&
    (v.pick.point === null || vec(v.pick.point))
  )
    return { ...base, type: v.type, pick: { id: v.pick.id, point: v.pick.point } };
  return null;
}
