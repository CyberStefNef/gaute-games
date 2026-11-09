// Rules of the official games, through the same sandbox Gaute uses.
import { expect, test } from 'vite-plus/test';
import { bundleGame } from '../tools/games.mjs';
import { runGame } from '../tools/sandbox.mjs';
import type { Mode } from '../sdk/logic.ts';

type Outcome = Awaited<ReturnType<typeof runGame>>;
type Played = {
  state: string;
  views: Record<string, string>;
  turn?: string | null;
  ended?: string;
};

/** Plays one game in order, as the app does. */
async function session(slug: string, mode: Mode, players: string[], seed = 9) {
  const { logic } = await bundleGame(slug);
  let current = (await runGame(logic, {
    op: 'setup',
    mode,
    players,
    locale: 'en',
    seed,
  })) as Played & Outcome;
  expect(current.ok).toBe(true);
  let step = 0;
  const view = (viewer: string) => JSON.parse(current.views[viewer]);
  return {
    view,
    get current() {
      return current;
    },
    async act(playerId: string | null, action: string, payload: unknown = null) {
      const outcome = (await runGame(logic, {
        op: 'action',
        mode,
        state: current.state,
        players,
        playerId,
        action,
        payload,
        seed: seed + ++step,
      })) as Played & Outcome;
      if (outcome.ok) current = outcome;
      return outcome;
    },
  };
}

test('Imposter keeps the secret word from the imposter and scores the vote', async () => {
  const players = ['p1', 'p2', 'p3', 'p4'];
  const game = await session('imposter', 'phones', players);
  const imposters = players.filter((p) => game.view(p).role === 'imposter');
  expect(imposters).toHaveLength(1);
  const [imposter] = imposters;
  expect(game.view(imposter).word).toBeNull();
  const words = new Set(players.filter((p) => p !== imposter).map((p) => game.view(p).word));
  expect(words.size).toBe(1);
  expect(JSON.stringify(game.view(imposter))).not.toContain([...words][0]);
  expect(await game.act('p1', 'vote', { target: 'p2' })).toEqual({
    ok: false,
    reason: 'Voting is not open.',
  });
  await game.act('p1', 'startVote');
  for (const voter of players)
    await game.act(voter, 'vote', {
      target: voter === imposter ? players.find((p) => p !== voter) : imposter,
    });
  expect(game.view('p1').reveal.caught).toBe(true);
  await game.act('p1', 'nextRound');
  const crew = players.filter((p) => p !== imposter);
  expect(crew.map((p) => game.view(p).scores[p])).toEqual([1, 1, 1]);
  expect(game.view('p1').round).toBe(2);
});

test('Imposter passes one phone so each player sees only their role, then the group accuses', async () => {
  const players = ['p1', 'p2', 'p3'];
  const game = await session('imposter', 'pass', players);
  const roles: Record<string, string> = {};
  for (const expected of players) {
    expect(game.current.turn).toBe(expected);
    expect(game.view('*').role).toBeNull();
    expect(game.view('*').word).toBeNull();
    roles[expected] = game.view(expected).role;
    const other = players.find((p) => p !== expected)!;
    expect(await game.act(other, 'seen')).toEqual({ ok: false, reason: 'It is not your turn.' });
    await game.act(expected, 'seen');
  }
  expect(game.current.turn).toBeNull();
  const imposter = players.find((p) => roles[p] === 'imposter')!;
  await game.act(null, 'startVote');
  expect(await game.act(null, 'vote', { target: imposter })).toEqual({
    ok: false,
    reason: 'Voting is not open.',
  });
  await game.act(null, 'accuse', { target: imposter });
  expect(game.view('*').reveal).toMatchObject({ caught: true, imposter });
});

test('Tonight Cards reveals votes, ends rules and finishes the deck', async () => {
  const players = ['p1', 'p2', 'p3'];
  const game = await session('tonight-cards', 'phones', players, 5);
  let sawVote = false;
  let sawRuleEnding = false;
  for (let turn = 0; turn < 200 && game.current.ended === undefined; turn++) {
    const view = game.view('p1');
    if (view.card.ending) sawRuleEnding = true;
    if (view.vote && !view.vote.tally) {
      await game.act('p1', 'vote', { target: 'p2' });
      await game.act('p2', 'vote', { target: 'p1' });
      await game.act('p3', 'vote', { target: 'p1' });
      expect(game.view('p3').vote.tally).toEqual({ p1: 2, p2: 1 });
      sawVote = true;
    }
    await game.act('p2', 'next');
  }
  expect(sawVote && sawRuleEnding).toBe(true);
  expect(JSON.parse(game.current.ended!)).toEqual({ cards: 27 });
});

test('Tonight Cards on one shared phone reads vote cards aloud instead of voting in the app', async () => {
  const game = await session('tonight-cards', 'shared', ['p1', 'p2', 'p3']);
  for (let i = 0; i < 40 && game.current.ended === undefined; i++) {
    expect(game.view('*').vote).toBeNull();
    await game.act(null, 'next');
  }
  expect(await game.act(null, 'vote', { target: 'p1' })).toEqual({
    ok: false,
    reason: 'There is no open vote.',
  });
});
