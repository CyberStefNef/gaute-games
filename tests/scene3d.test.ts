import { Script } from 'node:vm';
import { expect, test } from 'vite-plus/test';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createSceneWorld } from '../sdk/scene3d-core';
import { decodeBase64, inspectGLB, MODEL_LIMITS, type ModelAsset } from '../sdk/glb.mjs';
import {
  parseSceneCommand,
  parseSceneReply,
  validSceneState,
  type SceneState,
} from '../sdk/scene3d-protocol';
import { scene3dDocument } from '../sdk/scene3d-document';
import { gameDocument } from '../sdk/document';
import { THEMES } from '../simulator/theme';
import { bundleGame, ROOT } from '../tools/games.mjs';
import { createProject } from '../tools/creator.mjs';
function glb(json: object, bin = Buffer.alloc(4)) {
  const data = Buffer.from(JSON.stringify(json));
  const jl = Math.ceil(data.length / 4) * 4,
    bl = Math.ceil(bin.length / 4) * 4;
  const out = Buffer.alloc(28 + jl + bl);
  out.writeUInt32LE(0x46546c67);
  out.writeUInt32LE(2, 4);
  out.writeUInt32LE(out.length, 8);
  out.writeUInt32LE(jl, 12);
  out.writeUInt32LE(0x4e4f534a, 16);
  out.fill(32, 20, 20 + jl);
  data.copy(out, 20);
  out.writeUInt32LE(bl, 20 + jl);
  out.writeUInt32LE(0x004e4942, 24 + jl);
  bin.copy(out, 28 + jl);
  return out;
}
const basic = () => ({
  asset: { version: '2.0' },
  buffers: [{ byteLength: 4 }],
  nodes: [{}],
  scenes: [{ nodes: [0] }],
  scene: 0,
});
const asset = (name: string): ModelAsset => ({
  format: 'glb',
  data: readFileSync(path.join(ROOT, 'examples/models3d/assets', name + '.glb')).toString('base64'),
});
const camera = { position: [6, 8, 10] as const, target: [0, 0, 0] as const };

test('GLB inspection rejects external resources, cycles, malformed chunks and allocation bombs', () => {
  expect(inspectGLB(glb(basic())).bin.length).toBe(4);
  for (const json of [
    { ...basic(), buffers: [{ byteLength: 4, uri: 'https://example.invalid/mesh.bin' }] },
    { ...basic(), images: [{ uri: 'file:///private.jpg', mimeType: 'image/jpeg' }] },
    { ...basic(), nodes: [{ children: [1] }, { children: [0] }] },
    { ...basic(), accessors: [{ type: 'VEC3', count: 100001 }] },
    { ...basic(), extensionsRequired: ['KHR_draco_mesh_compression'] },
    { ...basic(), bufferViews: [{ buffer: 0, byteOffset: 1, byteLength: 8 }] },
  ])
    expect(() => inspectGLB(glb(json))).toThrow();
  const invalid = glb(basic());
  invalid.writeUInt32LE(0xffffffff, 12);
  expect(() => inspectGLB(invalid)).toThrow();
  for (const data of ['%%%=', 'AAAAA', 'a'.repeat(Math.ceil(MODEL_LIMITS.bytes / 3) * 4 + 4)])
    expect(() => decodeBase64(data)).toThrow();
});

test('the same bounded state parser protects browser and native rendering', () => {
  const state: SceneState = {
    nodes: [{ id: 'maker', model: 'brewer', position: [0, 0, 0] }],
    camera,
  };
  expect(validSceneState(state)).toBe(true);
  expect(validSceneState({ ...state, nodes: [...state.nodes, ...state.nodes] })).toBe(false);
  expect(validSceneState({ ...state, camera: { ...camera, span: Infinity } })).toBe(false);
  expect(validSceneState({ ...state, nodes: [{ ...state.nodes[0], position: [NaN, 0, 0] }] })).toBe(
    false,
  );
  const command = { scene3d: 1, scene: 's1', request: 1, type: 'update', state };
  expect(parseSceneCommand(JSON.stringify(command))).toEqual(command);
  expect(
    parseSceneCommand(
      JSON.stringify({
        ...command,
        state: { ...state, nodes: Array.from({ length: 1025 }, () => state.nodes[0]) },
      }),
    ),
  ).toBeNull();
  expect(parseSceneCommand(JSON.stringify({ ...command, type: 'eval', code: 'bad' }))).toBeNull();
  expect(parseSceneCommand('x'.repeat(400000))).toBeNull();
  expect(
    parseSceneReply({
      scene3d: 1,
      scene: 's1',
      type: 'pick',
      pick: { id: 'maker', point: [0, 0, 0] },
    })?.type,
  ).toBe('pick');
  expect(
    parseSceneReply({
      scene3d: 1,
      scene: 's1',
      type: 'pick',
      pick: { id: 'maker', point: [0, Infinity, 0] },
    }),
  ).toBeNull();
});

test('real Brewtown models load offline, animate, interpolate and dispose', async () => {
  const world = createSceneWorld(async () => {
    throw Error('These models contain no images');
  });
  await world.load('brewer', asset('brewer'));
  await expect(world.load('brewer', asset('brewer'))).rejects.toThrow('Duplicate');
  const position: [number, number, number] = [0, 0, 0];
  const state: SceneState = {
    nodes: [{ id: 'maker', model: 'brewer', position, animation: 'Idle' }],
    camera,
  };
  world.update(state);
  const maker = world.scene.children.find((c) => c.userData.sceneNodeId === 'maker')!;
  expect(maker).toBeDefined();
  world.tick(0.1);
  const animated = maker.children[0].quaternion.clone();
  world.tick(0.4);
  expect(maker.children[0].quaternion.equals(animated)).toBe(false);
  world.update({
    ...state,
    nodes: [{ ...state.nodes[0], position: [2, 0, 0], transitionMs: 1000 }],
  });
  world.tick(0.5);
  expect(maker.position.x).toBeCloseTo(1);
  world.tick(0.5);
  expect(maker.position.x).toBeCloseTo(2);
  world.update(state);
  position[0] = 100;
  world.tick(0.1);
  expect(maker.position.x).toBe(0);
  world.dispose();
  expect(world.scene.children).toHaveLength(0);
  await expect(world.load('later', asset('brewer'))).rejects.toThrow('disposed');
});

test('scene geometry budgets reject excessive animated draws before creating instances', async () => {
  const world = createSceneWorld(async () => {
    throw Error('No images');
  });
  await world.load('brewery', asset('brewer'));
  expect(() =>
    world.update({
      camera,
      nodes: Array.from({ length: 1024 }, (_, i) => ({
        id: `v${i}`,
        model: 'brewery',
        position: [0, 0, 0],
      })),
    }),
  ).toThrow('budget');
  expect(world.scene.children.filter((c) => c.userData.sceneNodeId)).toHaveLength(0);
  world.dispose();
});

test('3D host injection is opt-in, idempotent and keeps the network CSP', () => {
  const plain = gameDocument({ script: 'console.log("hello")', style: '' }, 'en', THEMES.light);
  expect(plain).not.toContain('gaute-scene3d-runtime');
  const page = gameDocument(
    { script: 'console.log("__GAUTE_SCENE3D_V1__")', style: '' },
    'en',
    THEMES.light,
  );
  expect(page).toContain("connect-src 'none'");
  for (const script of page.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g))
    expect(() => new Script(script[1])).not.toThrow();
  expect(scene3dDocument(page)).toBe(page);
  expect(page.match(/id="gaute-scene3d-runtime"/g)).toHaveLength(1);
  expect(scene3dDocument(page, true)).toContain('ReactNativeWebView');
});

test('indexed game sources can import self-contained GLBs without bundling the renderer', async () => {
  const folder = mkdtempSync(path.join(tmpdir(), 'gaute-model-build-'));
  try {
    const project = createProject('model-test', path.join(folder, 'model-test'));
    writeFileSync(path.join(project, 'maker.glb'), Buffer.from(decodeBase64(asset('brewer').data)));
    writeFileSync(
      path.join(project, 'client.tsx'),
      `import model from './maker.glb';import {createScene} from '@gaute/games-sdk/scene3d';globalThis.modelProof={model,createScene};`,
    );
    const game = await bundleGame('model-test', project, { sourceRoot: folder });
    expect(game.client.script).toContain('__GAUTE_SCENE3D_V1__');
    expect(game.client.script.length).toBeLessThan(50000);
    expect(game.client.script).not.toContain('WebGLRenderer');
    writeFileSync(
      path.join(project, 'maker.glb'),
      glb({ ...basic(), buffers: [{ uri: 'https://example.invalid/a', byteLength: 4 }] }),
    );
    await expect(bundleGame('model-test', project, { sourceRoot: folder })).rejects.toThrow(
      'embed one binary buffer',
    );
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});

test('embedded textures use the host decoder without fetch, including on native Hermes', async () => {
  const calls: { size: number; mime: string }[] = [];
  const world = createSceneWorld(async (bytes, mime) => {
    calls.push({ size: bytes.length, mime });
    return { width: 2, height: 2 } as TexImageSource;
  });
  const data = readFileSync(path.join(ROOT, 'tests/fixtures/scene3d/textured.glb')).toString(
    'base64',
  );
  await world.load('textured', { format: 'glb', data });
  expect(calls).toHaveLength(1);
  expect(calls[0].mime).toBe('image/png');
  world.update({ camera, nodes: [{ id: 'image', model: 'textured', position: [0, 0, 0] }] });
  world.dispose();
});

test('skinned model instances have independent skeleton animation', async () => {
  const world = createSceneWorld(async () => {
    throw Error('No images');
  });
  const data = readFileSync(path.join(ROOT, 'tests/fixtures/scene3d/skinned.glb')).toString(
    'base64',
  );
  await world.load('skin', { format: 'glb', data });
  world.update({
    camera,
    nodes: [
      { id: 'walking', model: 'skin', position: [0, 0, 0], animation: 'Walk' },
      { id: 'idle', model: 'skin', position: [2, 0, 0] },
    ],
  });
  world.tick(0.5);
  const walking = world.scene.children.find((c) => c.userData.sceneNodeId === 'walking')!;
  const idle = world.scene.children.find((c) => c.userData.sceneNodeId === 'idle')!;
  expect(walking.getObjectByName('bone')!.position.x).toBeCloseTo(0.5);
  expect(idle.getObjectByName('bone')!.position.x).toBe(0);
  world.dispose();
});

test('static models share instance draws and picking preserves each node ID', async () => {
  const world = createSceneWorld(async () => {
    throw Error('No images');
  });
  await world.load('ground', asset('meadow'));
  world.update({
    camera: { position: [0, 8, 10], target: [0, 0, 0] },
    nodes: Array.from({ length: 9 }, (_, i) => ({
      id: `tile${i}`,
      model: 'ground',
      position: [i * 5, 0, 0],
    })),
  });
  world.tick(0);
  const batches = world.scene.children.filter(
    (c) => 'isInstancedMesh' in c,
  ) as import('three').InstancedMesh[];
  expect(batches.length).toBeGreaterThan(0);
  expect(batches.every((b) => b.count === 9)).toBe(true);
  expect(world.pick(0, 0).id).toBe('tile0');
  world.update({
    camera: { position: [0, 8, 10], target: [0, 0, 0] },
    nodes: [{ id: 'tile0', model: 'ground', position: [0, 0, 0] }],
  });
  expect(world.pick(0, 0).id).toBe('tile0');
  world.update({
    camera: { position: [10, 8, 10], target: [10, 0, 0] },
    nodes: [{ id: 'tile0', model: 'ground', position: [10, 0, 0] }],
  });
  expect(world.pick(0, 0).id).toBe('tile0');
  world.dispose();
});

test('the shared runtime includes current scene code and GLB validation policy', async () => {
  const { scene3dRuntimeHash } = await import('../tools/scene3d-runtime.mjs');
  expect(readFileSync(path.join(ROOT, 'sdk/scene3d-runtime.generated.ts'), 'utf8')).toContain(
    `// Source digest: ${scene3dRuntimeHash()}\n`,
  );
});

test('decoded native image resources close after disposal, including an in-flight load', async () => {
  const data = readFileSync(path.join(ROOT, 'tests/fixtures/scene3d/textured.glb')).toString(
    'base64',
  );
  let closed = 0;
  const bitmap = {
    width: 2,
    height: 2,
    close: () => {
      closed++;
    },
  } as unknown as TexImageSource;
  const loaded = createSceneWorld(async () => bitmap);
  await loaded.load('image', { format: 'glb', data });
  loaded.dispose();
  expect(closed).toBe(1);
  let release!: (image: TexImageSource) => void;
  let started!: () => void;
  const began = new Promise<void>((resolve) => {
    started = resolve;
  });
  const pending = createSceneWorld(() => {
    started();
    return new Promise((resolve) => {
      release = resolve;
    });
  });
  const result = pending.load('image', { format: 'glb', data });
  await began;
  pending.dispose();
  release(bitmap);
  await expect(result).rejects.toThrow('disposed');
  expect(closed).toBe(2);
});
