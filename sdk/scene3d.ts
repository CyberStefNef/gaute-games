// oxlint-disable-next-line typescript/triple-slash-reference -- Load .glb types without a runtime module.
/// <reference path="./assets.d.ts" />
import { unpackModel } from './scene3d-assets';
import { SCENE3D_MARKER, type SceneFactory, type SceneOptions } from './scene3d-protocol';
export type {
  ModelAsset,
  Vec3,
  SceneNode,
  SceneState,
  ScenePick,
  SceneCamera,
  SceneGesture,
  SceneOptions,
  SceneController,
} from './scene3d-protocol';
/** Create a host-owned viewport. Keep HTML controls outside this element. */
export async function createScene(element: HTMLElement, options: SceneOptions = {}) {
  const factory = (globalThis as unknown as Record<string, SceneFactory>)[SCENE3D_MARKER];
  if (!factory)
    throw Error('This Gaute host does not support scene3d v1. Update the app or simulator.');
  const scene = await factory(element, options);
  return {
    ...scene,
    load: async (id, model) => scene.load(id, await unpackModel(model)),
  } satisfies import('./scene3d-protocol').SceneController;
}
