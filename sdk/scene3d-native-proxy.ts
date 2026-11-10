// Runs inside the sandbox. Only data crosses into the host-owned native renderer.
import {
  parseSceneReply,
  SCENE3D_MARKER,
  SCENE3D_MESSAGE_BYTES,
  type SceneFactory,
  type SceneCommandBody,
  type SceneRect,
} from './scene3d-protocol';
const global = globalThis as unknown as Record<string, SceneFactory>;
const browser = global[SCENE3D_MARKER];
let nextScene = 0;
let active = false;
const createNativeScene: SceneFactory = async (element, options) => {
  const native = (
    globalThis as unknown as { ReactNativeWebView?: { postMessage: (message: string) => void } }
  ).ReactNativeWebView;
  if (!native) return browser(element, options);
  if (active) throw Error('Only one 3D viewport is supported per game page');
  active = true;
  const scene = `s${Math.random().toString(36).slice(2)}_${++nextScene}`;
  let sequence = 0,
    dead = false;
  const pending = new Map<
    number,
    { resolve: () => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> }
  >();
  const receive = (event: MessageEvent) => {
    const reply = parseSceneReply(event.data);
    if (!reply || reply.scene !== scene || dead) return;
    if (reply.type === 'error') {
      options.onError?.(reply.reason);
      return;
    }
    if (reply.type === 'gesture') {
      options.onGesture?.(reply.gesture);
      return;
    }
    if (reply.type === 'pick') {
      options.onPick?.(reply.pick);
      return;
    }
    const task = pending.get(reply.request);
    if (!task) return;
    pending.delete(reply.request);
    clearTimeout(task.timer);
    if (reply.ok) task.resolve();
    else task.reject(Error(reply.reason ?? '3D command failed'));
  };
  window.addEventListener('message', receive);
  const request = (command: SceneCommandBody, timeout = 15000) =>
    new Promise<void>((resolve, reject) => {
      if (dead) {
        reject(Error('Scene disposed'));
        return;
      }
      const id = ++sequence;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(Error('3D host did not respond'));
      }, timeout);
      pending.set(id, { resolve, reject, timer });
      const message = JSON.stringify({ ...command, scene3d: 1, scene, request: id });
      if (new TextEncoder().encode(message).byteLength > SCENE3D_MESSAGE_BYTES) {
        clearTimeout(timer);
        pending.delete(id);
        reject(Error('3D command exceeds its size limit'));
        return;
      }
      native.postMessage(message);
    });
  const rect = (): SceneRect => {
    const b = element.getBoundingClientRect();
    return { x: b.x, y: b.y, width: Math.max(1, b.width), height: Math.max(1, b.height) };
  };
  const stop = () => {
    dead = true;
    window.removeEventListener('message', receive);
    for (const task of pending.values()) {
      clearTimeout(task.timer);
      task.reject(Error('Scene disposed'));
    }
    pending.clear();
  };
  try {
    await request({ type: 'open', rect: rect() }, 4000);
  } catch {
    native.postMessage(JSON.stringify({ scene3d: 1, scene, request: ++sequence, type: 'dispose' }));
    stop();
    try {
      const fallback = await browser(element, options);
      return {
        ...fallback,
        dispose: () => {
          fallback.dispose();
          active = false;
        },
      };
    } catch (error) {
      active = false;
      throw error;
    }
  }
  let frame = 0;
  const sync = () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      void request({ type: 'rect', rect: rect() }).catch((e) => options.onError?.(String(e)));
    });
  };
  const observer = new ResizeObserver(sync);
  observer.observe(element);
  window.addEventListener('scroll', sync, true);
  window.addEventListener('resize', sync);
  return {
    backend: 'native-webgpu',
    load: (id, model) => request({ type: 'load', id, model }),
    update: (state) => request({ type: 'update', state }),
    setCamera: (camera) => request({ type: 'camera', camera }),
    setVisible: (visible) => request({ type: 'visible', visible }),
    setColors: (model, rgba) => request({ type: 'colors', model, rgba }),
    dispose: () => {
      if (dead) return;
      observer.disconnect();
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', sync, true);
      window.removeEventListener('resize', sync);
      native.postMessage(
        JSON.stringify({ scene3d: 1, scene, request: ++sequence, type: 'dispose' }),
      );
      stop();
      active = false;
    },
  };
};
global[SCENE3D_MARKER] = createNativeScene;
