import assert from 'node:assert/strict';
import { describeGame, runGame } from './sandbox.mjs';

/** A small seeded generator, so a failing run can be reproduced. */
const generator = (seed) => () => {
  seed = (seed * 1103515245 + 12345) & 0x7fffffff;
  return seed / 0x7fffffff;
};

async function play(game, mode, count, seed) {
  const players = Array.from({ length: count }, (_, i) => `p${i + 1}`);
  const { actions } = await describeGame(game.logic);
  const random = generator(seed);
  const pick = (values) => values[Math.floor(random() * values.length)];
  const requests = [{ op: 'setup', mode, players, locale: 'en', seed }];
  let outcome = await runGame(game.logic, requests[0]);
  assert.equal(outcome.ok, true, 'setup must succeed');
  // Everything a player can observe, so replays compare views and turns too.
  const outcomes = [];
  for (let step = 0; step < 150 && outcome.ok && 'state' in outcome; step++) {
    const done = outcome;
    outcomes.push(JSON.stringify([done.state, done.views, done.turn ?? null, done.ended ?? null]));
    for (const player of players)
      assert.equal(typeof done.views[player], 'string', `view for ${player}`);
    if (mode !== 'phones') assert.equal(typeof done.views['*'], 'string', 'shared view');
    if (mode === 'pass') assert.ok(done.turn === null || players.includes(done.turn));
    if (done.ended !== undefined) break;
    const actor = mode === 'phones' ? pick(players) : mode === 'pass' ? (done.turn ?? null) : null;
    const payload = pick([
      null,
      { target: pick(players) },
      { value: 1 + Math.floor(random() * 100) },
      { target: pick(players), value: Math.floor(random() * 10) },
    ]);
    const request = {
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
    const next = await runGame(game.logic, request);
    if (next.ok) outcome = next;
  }
  return { requests, outcomes };
}

/** Checks every advertised mode, replay determinism and departures in the real sandbox. */
export async function verifyGame(game) {
  for (const mode of game.modes)
    for (const count of new Set([game.players.min, Math.min(game.players.max, 5)])) {
      const first = await play(game, mode, count, 7);
      const again = await play(game, mode, count, 7);
      assert.deepEqual(
        again.outcomes,
        first.outcomes,
        `${game.slug}: ${mode} must be deterministic`,
      );
    }
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
  assert.ok(setup.ok && 'state' in setup);
  const left = await runGame(game.logic, {
    op: 'leave',
    mode: 'phones',
    state: setup.state,
    players: players.slice(1),
    playerId: players[0],
    seed: 4,
  });
  assert.equal(left.ok, true, `${game.slug}: departure must succeed`);
}
