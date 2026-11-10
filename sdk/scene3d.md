# 3D scenes

`@gaute/games-sdk/scene3d` provides an optional host-owned 3D viewport. Games keep
the same rules, views and actions as 2D games. They submit model and scene data;
no game JavaScript runs in the app's native runtime. Rendering uses Three.js
0.187.0. A capable native host attempts React Native WebGPU; initialization
failure selects the browser WebGL2 renderer. Web games use WebGL2.

## Create a viewport

```ts
import { createScene } from '@gaute/games-sdk/scene3d';
import brewer from './brewer.glb';

const scene = await createScene(document.querySelector('#world')!, {
  onPick: ({ id, point }) => {
    // Send a typed game action. Rules still decide whether the move is legal.
  },
  onError: (reason) => {
    // Show a retry option. Dispose and recreate after context/device loss.
  },
});
await scene.load('brewer', brewer);
await scene.update({
  nodes: [
    {
      id: 'ana',
      model: 'brewer',
      position: [0, 0, 0],
      animation: 'Idle',
      transitionMs: 400,
    },
  ],
  camera: { position: [7, 8, 9], target: [0, 0, 0] },
  background: '#ede5d6',
});
// Update ana's position after the rules send a new view. The host interpolates.
// On unmount:
scene.dispose();
```

Give `#world` a nonzero width and height. Keep HTML controls outside that element:
the native viewport occupies its rectangle and receives its touch input. One
viewport is supported per page. Use radians for rotation, Y up and model units
for positions. Orthographic cameras accept `projection: 'orthographic'` and
`span` as the visible vertical distance in world units. Pixel ratio is capped at
1.5 and the drawing buffer at 2.5 million pixels.

`load` registers a model once. Both `load` and `update` return promises; handle
rejections to show model or state validation errors. `update` replaces the visible node list; omitted
nodes are removed. Stable IDs retain their objects and animation mixers.
`transitionMs` interpolates position and rotation; scale applies immediately.
Optional `path` waypoints keep transitions on roads or hex routes. `tint` multiplies model colours, including instanced models. Named glTF clips loop. Repeated static models use GPU instancing. Skinned instances have independent skeletons. Missing clip
names leave an instance static. Picking returns the closest node ID and a
world-space point, or null values. Picking never directly changes the game state.

`onGesture` receives drag deltas as viewport fractions and a pinch/wheel zoom
factor on both hosts. `setCamera(camera)` changes only the camera, so panning does
not resend the board or reset instance buffers. Gesture handling suppresses picks
after dragging. Keep map buttons outside the viewport on native hosts.
Call `await scene.setVisible(false)` while an HTML sheet or dialog covers the map,
then `await scene.setVisible(true)` when it closes. This retains loaded geometry
and stops drawing while allowing the WebView to receive input through that area.

The production Frontier/Brewtown game now uses this API for its setup preview and
playable board. Its original Blender props retain their geometry and PBR materials. GLB imports use lossless gzip delivery; decompression runs in the browser/WebView before native rendering. The planetary ground is new geometry with packed vertex colours. `setColors(model, rgbaBase64)` updates those colours without replacing geometry. It requires one static mesh with normalized Uint8 RGBA attributes.

## Blender export

Export glTF Binary `.glb`, with textures embedded as PNG or JPEG. Apply modifiers,
keep meshes small, and include named animation clips. `.glb` imports become typed
`ModelAsset` values at build time. Developers need no renderer dependency or
custom Vite plugin. Importing `scene3d` also registers the TypeScript asset types.

The first version accepts one embedded binary buffer. Supported extensions are
limited to `KHR_materials_unlit`, `KHR_texture_transform` and
`KHR_mesh_quantization`. Draco, Meshopt, KTX2, external buffers, external images
and remote URLs are rejected. These codecs need a separate offline decoder
integration; no worker or network exception is granted.

Other model extensions are rejected in this first version.

Each model is at most 1 MiB after decompression. A viewport accepts 32 models and 1,024 nodes, with
at most 500,000 triangles and 2,048 mesh draws. A model allows 100,000 VEC3
attribute elements, 2,048-pixel image dimensions and four million texture pixels;
a viewport allows sixteen million texture pixels. Material texture references
also count toward the texture budget. Embedded assets count toward
the existing client/code budgets. The shared renderer does not. The bundler and
host validate model data independently.

## Run the example

From the SDK repository:

```sh
node tools/cli.mjs dev examples/models3d
node tools/cli.mjs check examples/models3d
```

The example uses the real Brewtown meadow, brewery and brewer from the original
Blender source. Tap a neighbouring tile to send an authoritative move action;
watch the brewer travel and its idle clip play. Camera controls and theme changes
exercise the same scene API. Source models can be regenerated with:

```sh
blender -b -t 4 -P official/frontier/art/export-models.py
```

## Host integration

`gameDocument` installs the shared renderer only when the client imports the
scene API. `scene3dDocument(html, true)` enables the native bridge in a capable
host. Commands use a separate, versioned `scene3d: 1` envelope; existing game
messages and game rules are unchanged. The native host must parse every command,
bound viewport dimensions and queue length, and send a result or pick event back
to that same WebView. This is a rendering capability, not arbitrary native code
execution. The CSP remains network-disabled.

After changing renderer code, regenerate the committed host bundle:

```sh
node tools/scene3d-runtime.mjs
```

The Gaute app currently snapshots these prototype host modules with
`npm run games:3d:vendor`. This keeps the app's published SDK pin intact until a
reviewed SDK release includes the new exports. Re-run the vendor command after
SDK changes; `node scripts/vendor-game-3d.mjs --check` detects drift locally.

The native adapter needs a new development/release binary containing
`react-native-webgpu`; older binaries use the browser path. The prototype renders
on the native JS thread and pauses GPU submission while backgrounded. It does
not enable experimental Worklets Bundle Mode. Native device execution, memory,
thermals and battery performance must be measured before choosing a production
default. Browser regression checks use software WebGL and establish correctness,
not phone GPU performance.
