// Every game in games/ (and the template) must build within the limits and play
// through Gaute's sandbox in each mode it declares, deterministically.
import path from 'node:path';
import { describe, expect, test } from 'vite-plus/test';
import { bundleGame, listGames, ROOT } from '../tools/games.mjs';
import { describeGame, runGame } from '../tools/sandbox.mjs';
import type { Mode } from '../sdk/logic.ts';
import type { RuntimeRequest } from '../sdk/runtime.ts';

type Game = Awaited<ReturnType<typeof bundleGame>>;
type Outcome = Awaited<ReturnType<typeof runGame>>;

/** A small seeded generator, so a failing run can be reproduced. */
const generator = (seed: number) => () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};

async function play(game: Game, mode: Mode, count: number, seed: number) {
  const players = Array.from({ length: count }, (_, i) => `p${i + 1}`);
  const { actions } = await describeGame(game.logic);
  const random = generator(seed);
  const pick = <T>(values: T[]) => values[Math.floor(random() * values.length)];
  const requests: RuntimeRequest[] = [{ op: 'setup', mode, players, locale: 'en', seed }];
  let outcome = (await runGame(game.logic, requests[0])) as Outcome;
  expect(outcome.ok, 'setup must succeed').toBe(true);
  const states: string[] = [];
  for (let step = 0; step < 150 && outcome.ok && 'state' in outcome; step++) {
    const done = outcome;
    states.push(done.state);
    for (const player of players)
      expect(done.views[player], `view for ${player}`).toBeTypeOf('string');
    if (mode !== 'phones') expect(done.views['*'], 'shared view').toBeTypeOf('string');
    if (mode === 'pass') expect(done.turn === null || players.includes(done.turn!)).toBe(true);
    if (done.ended !== undefined) break;
    const actor = mode === 'phones' ? pick(players) : mode === 'pass' ? (done.turn ?? null) : null;
    const payload = pick([
      null,
      { target: pick(players) },
      { value: 1 + Math.floor(random() * 100) },
      { target: pick(players), value: Math.floor(random() * 10) },
    ]);
    const request: RuntimeRequest = {
      op: 'action',
      mode,
      state: done.state,
      players,
      playerId: actor,
      action: pick(actions),
      payload,
      seed: seed + step,
    };
    requests.push(request);
    const next = (await runGame(game.logic, request)) as Outcome;
    if (next.ok) outcome = next;
  }
  return { requests, states };
}

const games: [string, string][] = [
  ...listGames().map((slug): [string, string] => [slug, path.join(ROOT, 'games', slug)]),
  ['template', path.join(ROOT, 'template')],
];

describe.each(games)('%s', (name, dir) => {
  test('builds within the size limits and plays in every declared mode', async () => {
    const game = await bundleGame(name === 'template' ? 'my-game' : name, dir);
    for (const mode of game.modes)
      for (const count of new Set([game.players.min, Math.min(game.players.max, 5)])) {
        const first = await play(game, mode, count, 7);
        const again = await play(game, mode, count, 7);
        // Same seed and moves: same states. Logic must not depend on clocks or globals.
        expect(again.states, `${mode} with ${count} players is deterministic`).toEqual(
          first.states,
        );
      }
  });

  test('handles a player leaving on own phones', async () => {
    const game = await bundleGame(name === 'template' ? 'my-game' : name, dir);
    if (!game.modes.includes('phones')) return;
    const players = Array.from(
      { length: Math.min(game.players.max, game.players.min + 1) },
      (_, i) => `p${i + 1}`,
    );
    const setup = await runGame(game.logic, {
      op: 'setup',
      mode: 'phones',
      players,
      locale: 'en',
      seed: 3,
    });
    expect(setup.ok && 'state' in setup).toBe(true);
    const left = await runGame(game.logic, {
      op: 'leave',
      mode: 'phones',
      state: (setup as { state: string }).state,
      players: players.slice(1),
      playerId: players[0],
      seed: 4,
    });
    expect(left.ok).toBe(true);
  });
});
