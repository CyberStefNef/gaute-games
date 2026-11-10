import { readFileSync, readdirSync } from 'node:fs';
import { expect, test } from 'vite-plus/test';
import { InstancedMesh, Color, OrthographicCamera, type Quaternion } from 'three';
import { createSceneWorld } from '../sdk/scene3d-core';
import { inspectGLB } from '../sdk/glb.mjs';
import { validSceneState } from '../sdk/scene3d-protocol';
import { sceneGestures } from '../sdk/scene3d-gestures';
import { boardCamera, boardScene, tilePosition } from '../official/frontier/ui/board-scene';
import type { BoardMarks } from '../official/frontier/ui/board';
import { indexView } from '../official/frontier/ui/contract';
import { identities } from '../official/frontier/ui/derived';
import { planet } from '../official/frontier/planet';
import { makeFog } from '../official/frontier/ui/planet-fog';
import { planetModel, planetColors, base64 } from '../official/frontier/ui/planet-mesh';
import { setup, start, view } from '../official/frontier/model';
const marks: BoardMarks = {
  selected: null,
  courierAt: null,
  reach: new Set(),
  gather: new Set(),
  pending: null,
  ready: new Set(),
  siege: new Set(),
};
const camera = { position: [20, 30, 30] as const, target: [0, 0, 0] as const };
const directory = new URL('../official/frontier/assets/models/', import.meta.url);
const asset = (name: string) => ({
  format: 'glb' as const,
  data: readFileSync(new URL(name + '.glb', directory)).toString('base64'),
});
const random = () => {
  let seed = 7;
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
};

test('local globe rotation and zoom keep a continuous camera orientation across southern latitudes', () => {
  const camera = new OrthographicCamera();
  const orientation = (latitude: number, span: number) => {
    const pitch = (latitude * Math.PI) / 180,
      c = boardCamera([0, Math.sin(pitch), Math.cos(pitch)], 11, span, 37);
    camera.position.fromArray(c.position);
    camera.lookAt(...c.target);
    return camera.quaternion.clone();
  };
  // A fixed 38° elevation used to flip lookAt by 180° at latitude -38°.
  for (const span of [15, 20, 37]) {
    let previous: Quaternion | undefined;
    for (let step = -894; step <= 894; step++) {
      const current = orientation(step / 10, span);
      if (previous) expect(current.angleTo(previous)).toBeLessThan(0.002);
      previous = current;
    }
  }
  for (const latitude of [-89.4, -60, -38, 0, 89.4]) {
    let previous: Quaternion | undefined;
    for (let step = 80; step <= 450; step++) {
      const current = orientation(latitude, step / 10);
      if (previous) expect(current.angleTo(previous)).toBeLessThan(0.007);
      previous = current;
    }
  }
});

test('the real Frontier board fits scene and geometry budgets through the 24×24 map', async () => {
  const world = createSceneWorld(async () => {
    throw Error('No external textures');
  });
  for (const file of readdirSync(directory).filter((n) => n.endsWith('.glb'))) {
    inspectGLB(readFileSync(new URL(file, directory)));
    await world.load(file.slice(0, -4), asset(file.slice(0, -4)));
  }
  for (const size of [8, 12, 16, 24]) {
    const s = setup(['p1', 'p2', 'p3', 'p4'], 'phones');
    start(s, size, random());
    s.realms.p1.explored = '1'.repeat(s.ground.length);
    const brew = indexView(view(s, 'p1'));
    const selected = {
      ...marks,
      selected: brew.venues[0].at,
      reach: new Set(brew.reach.values().next().value?.tiles ?? []),
    };
    const globe = planetModel(brew, selected);
    const terrainWorld = createSceneWorld(async () => {
      throw Error('No images');
    });
    await terrainWorld.load('planet', globe);
    terrainWorld.update({
      camera,
      nodes: [{ id: 'planet', model: 'planet', position: [0, 0, 0] }],
    });
    terrainWorld.setColors('planet', base64(planetColors(brew, selected)));
    terrainWorld.dispose();
    const scene = boardScene(brew, selected, identities(s.players));
    expect(validSceneState({ ...scene, camera })).toBe(true);
    expect(() =>
      world.update({
        ...scene,
        nodes: scene.nodes.filter((n) => n.model !== 'planet' && n.model !== 'fog'),
        camera,
      }),
    ).not.toThrow();
    world.tick(0);
    const batches = world.scene.children.filter(
      (o): o is InstancedMesh => o instanceof InstancedMesh,
    );
    expect(batches.length).toBeLessThan(128);
    expect(scene.nodes[0].model).toBe('planet');
    expect(planet(size).cells).toHaveLength(s.ground.length);
    for (let at = 0; at < s.ground.length; at++)
      expect(Math.hypot(...tilePosition(at, size))).toBeCloseTo(planet(size).radius, 3);
  }
  world.dispose();
});

test('fog, rival ownership, damage, fortification, ruins and route marks use scene geometry', () => {
  const s = setup(['p1', 'p2'], 'phones');
  start(s, 12, random());
  const brew = indexView(view(s, 'p1'));
  const own = brew.venues.find((v) => v.owner === 'p1')!;
  own.durability = 3;
  own.maxDurability = 8;
  own.fortification = 1;
  own.improvements = ['lab', 'warehouse', 'garden'];
  brew.ruins = [{ at: 100, previousKind: 'taproom' }];
  const scene = boardScene(
    brew,
    {
      ...marks,
      selected: own.at,
      siege: new Set([100]),
      pending: { at: 100, kind: 'walker', path: [own.at, 100] },
    },
    identities(s.players),
  );
  const byId = new Map(scene.nodes.map((n) => [n.id, n]));
  const hidden = brew.ground.findIndex((g) => g < 0);
  expect(scene.nodes.some((n) => n.model === 'fog')).toBe(true);
  expect(byId.has(`ground_${hidden}`)).toBe(false);
  expect(byId.get(`owner_${own.at}`)?.model).toBe('owner0');
  expect(byId.has(`damage_${own.at}`)).toBe(true);
  expect(byId.has(`fortify_${own.at}`)).toBe(true);
  expect(byId.has('ruin_100')).toBe(true);
  expect(planetColors(brew, { ...marks, selected: 100 })).not.toEqual(planetColors(brew, marks));
  expect(byId.has('path_1')).toBe(true);
});

test('camera updates retain instances and couriers follow path waypoints without rewinding', async () => {
  const world = createSceneWorld(async () => {
    throw Error('No images');
  });
  await world.load('maker', asset('brewer'));
  await world.load('tile', asset('blank'));
  const ground = { id: 'ground', model: 'tile', position: [0, 0, 0] as const, tint: '#8a3ad6' };
  world.update({ camera, nodes: [ground, { id: 'maker', model: 'maker', position: [0, 0, 0] }] });
  world.tick(0);
  const batch = world.scene.children.find((o) => o instanceof InstancedMesh) as InstancedMesh;
  const color = new Color();
  batch.getColorAt(0, color);
  expect(color.getHexString()).toBe('8a3ad6');
  world.setCamera({ ...camera, position: [25, 35, 30] });
  expect(world.scene.children.includes(batch)).toBe(true);
  const destination = {
    id: 'maker',
    model: 'maker',
    position: [4, 0, 4] as const,
    path: [[0, 0, 4] as const],
    transitionMs: 1000,
  };
  world.update({ camera, nodes: [ground, destination] });
  world.tick(0.5);
  const maker = world.scene.children.find((o) => o.userData.sceneNodeId === 'maker')!;
  expect(maker.position.toArray()).toEqual([0, 0, 4]);
  world.update({ camera, nodes: [ground, destination] });
  world.tick(0.25);
  expect(maker.position.toArray()).toEqual([2, 0, 4]);
  world.tick(0.25);
  expect(maker.position.toArray()).toEqual([4, 0, 4]);
  world.dispose();
});

test('shared gestures distinguish taps from dragging, pinching and cancelled touch sequences', () => {
  const events: unknown[] = [];
  const g = sceneGestures((e) => events.push(e));
  g.start([{ x: 20, y: 20 }]);
  expect(g.end([])).toBe(true);
  g.start([{ x: 20, y: 20 }]);
  g.move([{ x: 50, y: 20 }], 300, 400);
  expect(g.end([])).toBe(false);
  expect(events).toContainEqual({ type: 'pan', dx: 0.1, dy: 0 });
  g.start([
    { x: 0, y: 0 },
    { x: 100, y: 0 },
  ]);
  g.move(
    [
      { x: 0, y: 0 },
      { x: 150, y: 0 },
    ],
    300,
    400,
  );
  expect(events).toContainEqual({ type: 'zoom', factor: 1.5 });
  expect(g.end([{ x: 0, y: 0 }])).toBe(false);
  expect(g.end([])).toBe(false);
});

test('fog is one connected canopy and clears completely over an explored world', () => {
  const s = setup(['p1', 'p2'], 'phones');
  start(s, 24, random());
  const brew = indexView(view(s, 'p1'));
  const fog = makeFog(brew);
  expect(() => inspectGLB(Buffer.from(fog.asset.data, 'base64'))).not.toThrow();
  const alpha = (rgba: Uint8Array) => rgba.filter((_, i) => i % 4 === 3);
  expect(alpha(fog.colors(brew.ground)).some((a) => a === 255)).toBe(true);
  expect(alpha(fog.colors(brew.ground.map(() => 0))).every((a) => a === 0)).toBe(true);
  const scene = boardScene(brew, marks, identities(s.players));
  expect(scene.nodes.filter((n) => n.model === 'fog')).toHaveLength(1);
  expect(scene.nodes.some((n) => n.id.startsWith('cloud_'))).toBe(false);
});

test('lossless model delivery reconstructs the original GLB geometry and material data exactly', async () => {
  const { gzipSync } = await import('node:zlib');
  const { unpackModel } = await import('../sdk/scene3d-assets');
  const { decodeBase64, MODEL_LIMITS } = await import('../sdk/glb.mjs');
  const original = readFileSync(new URL('brewery.glb', directory));
  const result = await unpackModel({
    format: 'glb',
    compression: 'gzip',
    data: gzipSync(original).toString('base64'),
  });
  expect(Buffer.from(decodeBase64(result.data))).toEqual(original);
  const json = JSON.parse(inspectGLB(original).text);
  expect(json.materials.length).toBeGreaterThan(5);
  expect(json.meshes.length).toBeGreaterThan(10);
  await expect(
    unpackModel({
      format: 'glb',
      compression: 'gzip',
      data: gzipSync(Buffer.alloc(MODEL_LIMITS.bytes + 1)).toString('base64'),
    }),
  ).rejects.toThrow('size limit');
});
