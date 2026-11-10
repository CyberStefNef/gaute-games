/// <reference types="node" />
// Node 24: node --experimental-strip-types tools/frontier-benchmark.ts [report.json]
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { performance } from 'node:perf_hooks';
import { bundleGame } from './games.mjs';
import { runGame, SANDBOX_LIMITS } from './sandbox.mjs';
import { setup, start, view, type State } from '../official/frontier/model.ts';
import { SKILLS, type Skill } from '../official/frontier/systems.ts';
import type { Mode } from '../sdk/logic.ts';
import type { RuntimeOutcome } from '../sdk/runtime.ts';
type Played = Extract<RuntimeOutcome, { state: string }>;
const played = (result: RuntimeOutcome): Played => {
  if (!result.ok || !('state' in result)) throw Error(JSON.stringify(result));
  return result;
};
function synthetic(size: number, crew: number, venues: number): State {
  const s = setup(['p1', 'p2', 'p3', 'p4'], 'phones');
  let seed = 7;
  start(s, size, () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  });
  s.ground.fill(0);
  s.resources.fill(1);
  for (const p of s.players) {
    const r = s.realms[p];
    r.explored = '1'.repeat(s.ground.length);
    r.coins = 100;
    r.knowledge = 100;
    r.tech = Object.keys(SKILLS) as Skill[];
  }
  // Dense synthetic operating positions, not claims about organic play or balance.
  s.venues = s.venues.slice(0, venues).map((v, i) => ({
    ...v,
    owner: s.players[i % 4],
    kind: v.kind === 'brewhouse' ? 'brewhouse' : 'taproom',
    level: 3,
    upgrades: ['lab', 'warehouse', 'garden'],
  }));
  s.couriers = Array.from({ length: crew }, (_, i) => ({
    id: i + 1,
    at: Math.min(
      s.ground.length - 1,
      Math.floor(i / 4) * size + s.players.indexOf(s.players[i % 4]) * 2,
    ),
    owner: s.players[i % 4],
    kind: 'bike',
    ready: true,
    cargo: [{ recipe: 'houseAle', amount: 2 }],
    deliveries: 0,
  }));
  s.nextId = crew + 100;
  s.batches = s.venues
    .filter((v) => v.kind === 'brewhouse')
    .flatMap((v, i) =>
      Array.from({ length: 3 }, (_, j) => ({
        id: `bench-${i}-${j}`,
        owner: v.owner!,
        venue: v.at,
        recipe: 'lager',
        turnsLeft: 2,
        turnsTotal: 4,
        amount: 4,
        stage: 'ferment',
      })),
    );
  return s;
}
const game = await bundleGame('frontier');
played(
  await runGame(game.logic, {
    op: 'setup',
    mode: 'phones',
    players: ['p1', 'p2'],
    locale: 'en',
    seed: 7,
  }),
);
const rows: Record<string, unknown>[] = [];
async function measure(
  label: string,
  state: State,
  mode: Mode,
  diagnostic = false,
  action = 'endTurn',
  payload: unknown = null,
) {
  const times: number[] = [];
  let last: Played | undefined;
  try {
    for (let i = 0; i < 12; i++) {
      const begin = performance.now();
      last = played(
        await runGame(game.logic, {
          op: 'action',
          mode,
          players: state.players,
          state: JSON.stringify({ ...state, mode }),
          playerId: state.active,
          action,
          payload: action === 'endTurn' ? { round: state.round } : payload,
          seed: 23,
        }),
      );
      times.push(performance.now() - begin);
    }
    times.sort((a, b) => a - b);
    rows.push({
      label,
      size: state.size,
      crew: state.couriers.length,
      venues: state.venues.length,
      mode,
      action,
      diagnostic,
      ok: true,
      stateBytes: Buffer.byteLength(last!.state),
      maxViewBytes: Math.max(...Object.values(last!.views).map((v) => Buffer.byteLength(v))),
      totalViewBytes: Object.values(last!.views).reduce((n, v) => n + Buffer.byteLength(v), 0),
      p50ms: +times[6].toFixed(2),
      p95ms: +times[11].toFixed(2),
      samples: 12,
    });
  } catch (error) {
    rows.push({
      label,
      size: state.size,
      crew: state.couriers.length,
      venues: state.venues.length,
      mode,
      action,
      diagnostic,
      ok: false,
      reason: String(error),
      fields: Object.fromEntries(
        Object.entries(view(state, state.active)).map(([key, value]) => [
          key,
          Buffer.byteLength(JSON.stringify(value) ?? 'null'),
        ]),
      ),
    });
  }
  console.log(JSON.stringify(rows.at(-1)));
}
for (const size of [8, 12, 16, 24]) {
  const s = setup(['p1', 'p2', 'p3', 'p4'], 'phones');
  start(s, size, () => 0.4);
  await measure('opening', s, 'phones');
  await measure('opening', s, 'pass');
}
for (const [size, crew, venues] of [
  [12, 16, 8],
  [16, 32, 16],
  [24, 48, 24],
  [32, 48, 24],
  [48, 48, 24],
  [64, 48, 24],
  [24, 96, 24],
  [32, 192, 40],
])
  await measure('operating', synthetic(size, crew, venues), 'phones', size > 24 || crew > 48);
await measure('operating', synthetic(24, 48, 24), 'pass');
const brewery = synthetic(24, 16, 8);
brewery.batches = [];
await measure('operating-action', brewery, 'phones', false, 'produce', {
  venue: brewery.venues[0].at,
  option: 'brew:houseAle',
});
const report = {
  generatedAt: new Date().toISOString(),
  node: process.version,
  platform: `${os.platform()} ${os.arch()}`,
  cpu: os.cpus()[0]?.model,
  method:
    'Gaute Brewtown. Fresh QuickJS runtime with expanded defaults, warm WASM module, 12 repeated actions per case including serialization and all private views. Local process only; no Convex, transport or device render timing. Operating fixtures are synthetic.',
  limits: SANDBOX_LIMITS,
  logicBytes: Buffer.byteLength(game.logic),
  clientBytes: Buffer.byteLength(game.client.script + game.client.style),
  rows,
};
const target = path.resolve(process.argv[2] ?? 'dist/brewtown-benchmark.json');
mkdirSync(path.dirname(target), { recursive: true });
writeFileSync(target, JSON.stringify(report, null, 2) + '\n');
console.log(`Report: ${target}`);
if (rows.some((row) => !row.diagnostic && !row.ok)) process.exitCode = 1;
