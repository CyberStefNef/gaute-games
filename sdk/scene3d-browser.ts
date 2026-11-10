import { WebGLRenderer, SRGBColorSpace, NoToneMapping, PCFShadowMap } from 'three';
import { sceneGestures, type SceneTouch } from './scene3d-gestures';
import { createSceneWorld } from './scene3d-core';
import { SCENE3D_MARKER, type SceneFactory } from './scene3d-protocol';
const global = globalThis as unknown as Record<string, SceneFactory>;
let active = false;
const createBrowserScene: SceneFactory = async (element, options) => {
  if (active) throw Error('Only one 3D viewport is supported per game page');
  active = true;
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' });
  } catch (error) {
    active = false;
    throw error;
  }
  renderer.setPixelRatio(Math.min(1.5, devicePixelRatio || 1));
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.toneMapping = NoToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = PCFShadowMap;
  const world = createSceneWorld(
    (bytes, mime) =>
      new Promise((resolve, reject) => {
        const url = URL.createObjectURL(
          new Blob([bytes as Uint8Array<ArrayBuffer>], { type: mime }),
        );
        const image = new Image();
        image.onload = () => {
          URL.revokeObjectURL(url);
          resolve(image);
        };
        image.onerror = () => {
          URL.revokeObjectURL(url);
          reject(Error('Could not decode model image'));
        };
        image.src = url;
      }),
  );
  element.append(canvas);
  const size = () => {
    const b = element.getBoundingClientRect();
    renderer.setPixelRatio(
      Math.min(1.5, devicePixelRatio || 1, Math.sqrt(2500000 / Math.max(1, b.width * b.height))),
    );
    renderer.setSize(Math.max(1, b.width), Math.max(1, b.height), false);
    world.resize(b.width, b.height);
  };
  const observer = new ResizeObserver(size);
  observer.observe(element);
  size();
  let visible = true;
  let last = performance.now(),
    dead = false;
  const fail = (reason: string) => options.onError?.(reason);
  const lost = (event: Event) => {
    event.preventDefault();
    renderer.setAnimationLoop(null);
    fail('3D context lost. Reload this game.');
  };
  canvas.addEventListener('webglcontextlost', lost);
  const pointers = new Map<number, SceneTouch>();
  const gestures = sceneGestures((gesture) => options.onGesture?.(gesture));
  const down = (event: PointerEvent) => {
    canvas.setPointerCapture(event.pointerId);
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    gestures.start([...pointers.values()]);
  };
  const move = (event: PointerEvent) => {
    if (!pointers.has(event.pointerId)) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const b = canvas.getBoundingClientRect();
    gestures.move([...pointers.values()], b.width, b.height);
  };
  const up = (event: PointerEvent) => {
    pointers.delete(event.pointerId);
    const tap = gestures.end([...pointers.values()]);
    if (tap && event.type === 'pointerup') {
      const b = canvas.getBoundingClientRect();
      options.onPick?.(
        world.pick(
          ((event.clientX - b.left) / b.width) * 2 - 1,
          1 - ((event.clientY - b.top) / b.height) * 2,
        ),
      );
    }
  };
  const wheel = (event: WheelEvent) => {
    event.preventDefault();
    options.onGesture?.({
      type: 'zoom',
      factor: Math.exp(Math.max(-1, Math.min(1, -event.deltaY / 400))),
    });
  };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', wheel, { passive: false });
  renderer.setAnimationLoop(() => {
    if (dead) return;
    const now = performance.now(),
      delta = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (document.hidden || !visible) return;
    try {
      world.tick(delta);
      renderer.render(world.scene, world.camera);
    } catch (error) {
      renderer.setAnimationLoop(null);
      fail(String(error instanceof Error ? error.message : error));
    }
  });
  const dispose = () => {
    if (dead) return;
    dead = true;
    active = false;
    observer.disconnect();
    renderer.setAnimationLoop(null);
    canvas.removeEventListener('pointerdown', down);
    canvas.removeEventListener('pointermove', move);
    canvas.removeEventListener('pointerup', up);
    canvas.removeEventListener('pointercancel', up);
    canvas.removeEventListener('wheel', wheel);
    canvas.removeEventListener('webglcontextlost', lost);
    world.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
  };
  return {
    backend: 'webgl2',
    load: world.load,
    update: async (state) => world.update(state),
    setCamera: async (camera) => world.setCamera(camera),
    setColors: async (model, rgba) => world.setColors(model, rgba),
    setVisible: async (value) => {
      if (typeof value !== 'boolean') throw Error('Invalid visibility');
      visible = value;
      canvas.style.visibility = value ? 'visible' : 'hidden';
    },
    dispose,
  };
};
global[SCENE3D_MARKER] = createBrowserScene;
