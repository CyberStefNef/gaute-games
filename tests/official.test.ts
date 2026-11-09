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

test('Imposter keeps the word from the imposter, who sees only the category and gets a last chance', async () => {
  const players = ['p1', 'p2', 'p3', 'p4'];
  const game = await session('imposter', 'phones', players);
  const imposters = players.filter((p) => game.view(p).role === 'imposter');
  expect(imposters).toHaveLength(1);
  const [imposter] = imposters;
  expect(game.view(imposter).word).toBeNull();
  expect(game.view(imposter).category).toBe(game.view('p1').category);
  const words = new Set(players.filter((p) => p !== imposter).map((p) => game.view(p).word));
  expect(words.size).toBe(1);
  const word = [...words][0];
  expect(JSON.stringify(game.view(imposter))).not.toContain(word);
  expect(await game.act('p1', 'vote', { target: 'p2' })).toEqual({
    ok: false,
    reason: 'Voting is not open.',
  });
  await game.act('p1', 'startVote');
  for (const voter of players)
    await game.act(voter, 'vote', {
      target: voter === imposter ? players.find((p) => p !== voter) : imposter,
    });
  // Caught: only the imposter gets the six choices, and nobody else can answer.
  expect(game.view(imposter).phase).toBe('guess');
  const options: string[] = game.view(imposter).options;
  expect(options).toHaveLength(6);
  expect(options).toContain(word);
  const crew = players.filter((p) => p !== imposter);
  expect(game.view(crew[0]).options).toEqual([]);
  expect((await game.act(crew[0], 'guessWord', { value: 0 })).ok).toBe(false);
  // A wrong guess: the crew scores.
  await game.act(imposter, 'guessWord', { value: options.findIndex((o) => o !== word) });
  expect(game.view('p1').reveal).toMatchObject({ caught: imposter, stole: false });
  expect(crew.map((p) => game.view(p).scores[p])).toEqual([1, 1, 1]);
  await game.act('p1', 'nextRound');
  expect(game.view('p1').round).toBe(2);
});

test('Imposter passes one phone for roles and the last chance, and a right guess steals the round', async () => {
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
  const crewMember = players.find((p) => roles[p] === 'crew')!;
  const word = game.view(crewMember).word;
  await game.act(null, 'startVote');
  await game.act(null, 'accuse', { target: imposter });
  // The phone goes to the caught imposter for the last chance.
  expect(game.current.turn).toBe(imposter);
  const options: string[] = game.view(imposter).options;
  await game.act(imposter, 'guessWord', { value: options.indexOf(word) });
  expect(game.view('*').reveal).toMatchObject({ caught: imposter, stole: true });
  expect(game.view(imposter).scores[imposter]).toBe(3);
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
  expect(JSON.parse(game.current.ended!)).toEqual({ cards: 39 });
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

test('Werewolves: the witch saves the victim, and a voted-out hunter takes someone down', async () => {
  const players = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7', 'p8', 'p9'];
  const game = await session('werewolves', 'phones', players);
  const role = (p: string) => game.view(p).role as string;
  const with_ = (r: string) => players.filter((p) => role(p) === r);
  const [wolves, [seer], [witch], [hunter]] = [
    with_('wolf'),
    with_('seer'),
    with_('witch'),
    with_('hunter'),
  ];
  expect(wolves).toHaveLength(2);
  expect(with_('doctor')).toHaveLength(0);
  // Nobody but a werewolf learns who the werewolves are.
  expect(game.view(seer).pack).toEqual([]);
  expect(game.view(wolves[0]).pack).toEqual([wolves[1]]);
  // The witch waits for the werewolves' choice.
  expect(game.view(witch).todo).toBeNull();
  const prey = players.find((p) => role(p) === 'villager')!;
  for (const wolf of wolves) await game.act(wolf, 'kill', { target: prey });
  await game.act(seer, 'inspect', { target: wolves[0] });
  expect(game.view(seer).seen[wolves[0]]).toBe(true);
  expect(game.view(witch).witch).toMatchObject({ victim: prey, heal: true, poison: true });
  await game.act(witch, 'brew', { save: true, poison: 'nobody' });
  // Saved: a quiet night, and the healing potion is gone.
  expect(game.view('p1').phase).toBe('day');
  expect(game.view('p1').living).toContain(prey);
  expect(game.view('p1').events.at(-1).kind).toBe('quiet');
  // The village votes out the hunter, who shoots a werewolf.
  for (const p of players) await game.act(p, 'vote', { target: hunter });
  expect(game.view(hunter).todo).toBe('shoot');
  expect(game.view('p1').phase).toBe('hunt');
  await game.act(hunter, 'shoot', { target: wolves[0] });
  expect(game.view('p1').living).not.toContain(wolves[0]);
  expect(game.view('p1').phase).toBe('night');
  expect(game.view(witch).witch).toMatchObject({ heal: false, poison: true });
});

test('Bluff hides who wrote what until the reveal, and scores the truth and every fooled player', async () => {
  const players = ['p1', 'p2', 'p3'];
  const game = await session('bluff', 'phones', players);
  expect(await game.act('p1', 'write', { text: '' })).toEqual({
    ok: false,
    reason: 'Write a short answer.',
  });
  await game.act('p1', 'write', { text: 'Pancake' });
  await game.act('p2', 'write', { text: 'Sausage' });
  await game.act('p3', 'write', { text: 'Moose' });
  const options: { text: string; mine: boolean; authors: string[]; truth: boolean }[] =
    game.view('p1').options;
  expect(options).toHaveLength(4);
  // Before the reveal nobody sees authors or the truth, only their own answer.
  expect(options.every((o) => o.authors.length === 0 && !o.truth)).toBe(true);
  expect(options.filter((o) => o.mine).map((o) => o.text)).toEqual(['Pancake']);
  const own = options.findIndex((o) => o.mine);
  expect(await game.act('p1', 'vote', { value: own })).toEqual({
    ok: false,
    reason: 'That’s your own answer!',
  });
  const index = (text: string) => options.findIndex((o) => o.text === text);
  const truth = options.findIndex((o) => !['Pancake', 'Sausage', 'Moose'].includes(o.text));
  // The truth is capitalised like everyone else's answer.
  expect(options[truth].text[0]).toBe(options[truth].text[0].toLocaleUpperCase());
  await game.act('p1', 'vote', { value: truth });
  await game.act('p2', 'vote', { value: index('Pancake') });
  await game.act('p3', 'vote', { value: index('Pancake') });
  expect(game.view('p1').phase).toBe('reveal');
  // p1 found the truth (2) and fooled two players (2).
  expect(game.view('p1').scores).toEqual({ p1: 4, p2: 0, p3: 0 });
});
