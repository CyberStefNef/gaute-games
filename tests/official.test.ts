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
  players = [...players];
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
    async leave(playerId: string) {
      players = players.filter((p) => p !== playerId);
      const outcome = (await runGame(logic, {
        op: 'leave',
        mode,
        state: current.state,
        players,
        playerId,
        seed: seed + ++step,
      })) as Played & Outcome;
      expect(outcome.ok).toBe(true);
      if (outcome.ok) current = outcome;
      return outcome;
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
  expect(game.view('p1').scores).toEqual({ p1: 0, p2: 0, p3: 0 });
  expect(game.view('p1').options.every((o: { truth: boolean }) => !o.truth)).toBe(true);
  expect(game.view('p1').awards).toEqual([]);
  expect((await game.act('p2', 'showAll')).ok).toBe(false);
  expect((await game.act('p1', 'next')).ok).toBe(false);
  for (let i = 0; i < options.length - 1; i++) {
    expect((await game.act('p1', 'showNext')).ok).toBe(true);
    const shown = game.view('p2').options.filter((o: { revealed: boolean }) => o.revealed);
    expect(shown).toHaveLength(i + 1);
    expect(shown.every((o: { truth: boolean }) => !o.truth)).toBe(true);
    expect(game.view('p2').scores).toEqual({ p1: 0, p2: 0, p3: 0 });
  }
  await game.act('p1', 'showNext');
  expect(game.view('p1').revealComplete).toBe(true);
  expect(game.view('p1').options[truth].truth).toBe(true);
  // p1 found the truth (2) and fooled two players (2).
  expect(game.view('p1').scores).toEqual({ p1: 4, p2: 0, p3: 0 });
});

test('Never Have I Ever keeps everyone answering through ten rounds, including after five confessions', async () => {
  const players = ['p1', 'p2', 'p3'];
  const game = await session('never-have-i-ever', 'phones', players);
  await game.act('p1', 'addOwn', { text: 'tried this synthetic test prompt.' });
  await game.act('p1', 'pick', { value: 0 });
  expect(game.view('p2').statement).toBe('tried this synthetic test prompt.');
  for (let round = 1; round <= 10; round++) {
    expect(game.view('p1').round).toBe(round);
    expect(game.current.ended).toBeUndefined();
    expect((await game.act('p1', 'answer', { value: 1 })).ok).toBe(true);
    expect(game.view('p2').haveDone).toEqual([]);
    await game.act('p2', 'answer', { value: 0 });
    await game.act('p3', 'answer', { value: 0 });
    expect(game.view('p1').storyTime).toBe('p1');
    expect(game.view('p1').have.p1).toBe(round);
    await game.act('p1', 'next');
  }
  expect(JSON.parse(game.current.ended!)).toMatchObject({ have: { p1: 10 } });
  expect(game.view('p1').awards).toContainEqual({ title: 'storyteller', player: 'p1', count: 10 });
});

test('Never Have I Ever shared play finishes after ten prompts, and departures unblock answers', async () => {
  const shared = await session('never-have-i-ever', 'shared', ['p1', 'p2']);
  await shared.act(null, 'pick', { value: 2 });
  for (let i = 0; i < 10; i++) await shared.act(null, 'next');
  expect(shared.current.ended).toBeDefined();
  const phones = await session('never-have-i-ever', 'phones', ['p1', 'p2', 'p3']);
  await phones.act('p1', 'pick', { value: 0 });
  await phones.act('p1', 'answer', { value: 1 });
  await phones.act('p2', 'answer', { value: 0 });
  await phones.leave('p3');
  expect(phones.view('p1').revealed).toBe(true);
  expect(phones.view('p1').inPlay).toBe(2);
});

const statements = (player: string) => ({
  statements: [`${player} truth one`, `${player} truth two`, `${player} lie`],
  lie: 2,
});

test('Two Truths prepares simultaneously, keeps future stories secret, and scores each teller', async () => {
  const players = ['p1', 'p2', 'p3'];
  const game = await session('two-truths', 'phones', players);
  for (const player of ['p3', 'p1']) {
    expect((await game.act(player, 'submit', statements(player))).ok).toBe(true);
    expect(game.view('p2').phase).toBe('write');
    expect(game.view('p2').statements).toEqual([]);
    expect(JSON.stringify(game.view('p2'))).not.toContain('p3 truth one');
  }
  await game.act('p2', 'submit', statements('p2'));
  expect(game.view('p2').lie).toBeNull();
  for (const teller of players) {
    expect(game.view(teller).phase).toBe('guess');
    expect(game.view(teller).teller).toBe(teller);
    expect(game.view(teller).statements).toEqual(statements(teller).statements);
    expect((await game.act(teller, 'guess', { value: 2 })).ok).toBe(false);
    for (const guesser of players.filter((p) => p !== teller))
      await game.act(guesser, 'guess', { value: 2 });
    expect(game.view('p1').phase).toBe('reveal');
    await game.act(teller, 'next');
  }
  expect(JSON.parse(game.current.ended!)).toEqual({ scores: { p1: 2, p2: 2, p3: 2 } });
});

test('Two Truths handles a departure during preparation and during presentation', async () => {
  const game = await session('two-truths', 'phones', ['p1', 'p2', 'p3', 'p4']);
  for (const player of ['p1', 'p2', 'p3']) await game.act(player, 'submit', statements(player));
  await game.leave('p4');
  expect(game.view('p2').phase).toBe('guess');
  await game.leave('p1');
  expect(game.view('p2').teller).toBe('p2');
  expect(game.view('p3').statements).toEqual(statements('p2').statements);
  expect(game.view('p3').lie).toBeNull();
});

test('Bluff early transitions belong to the round leader and transfer when they leave', async () => {
  const game = await session('bluff', 'phones', ['p1', 'p2', 'p3', 'p4']);
  await game.act('p2', 'write', { text: 'Pancake' });
  await game.act('p3', 'write', { text: 'Sausage' });
  expect((await game.act('p2', 'hunt')).ok).toBe(false);
  expect((await game.act('p1', 'hunt')).ok).toBe(true);
  const choices = game.view('p4').options;
  await game.act('p4', 'vote', {
    value: choices.findIndex((o: { text: string }) => o.text === 'Pancake'),
  });
  expect((await game.act('p4', 'reveal')).ok).toBe(false);
  await game.leave('p1');
  expect(game.view('p2').leader).toBe('p2');
  expect((await game.act('p2', 'reveal')).ok).toBe(true);
  expect((await game.act('p2', 'showAll')).ok).toBe(true);
  expect(game.view('p3').revealComplete).toBe(true);
  expect((await game.act('p2', 'next')).ok).toBe(true);
  expect(game.view('p3').round).toBe(2);
});

for (const [slug, mode, yes, no] of [
  ['charades', 'pass', 'guessed', 'skip'],
  ['who-am-i', 'shared', 'correct', 'pass'],
] as const)
  test(`${slug} starts without category selection, mixes topics and keeps turn ownership`, async () => {
    const players = ['p1', 'p2', 'p3'];
    const game = await session(slug, mode, players);
    const deck = JSON.parse(game.current.state).order as number[];
    expect(new Set(deck).size).toBe(deck.length);
    expect(deck.length).toBeGreaterThan(40);
    expect(game.view('*').packs).toBeUndefined();
    expect(game.view('*').word).toBeNull();
    for (const player of players) {
      const actor = mode === 'pass' ? player : null;
      expect((await game.act(actor, 'start')).ok).toBe(true);
      const viewer = actor ?? '*';
      const first = game.view(viewer).word;
      expect(typeof first).toBe('string');
      if (mode === 'pass') {
        expect(game.view('*').word).toBeNull();
        expect(game.view(players.find((p) => p !== player)!).word).toBeNull();
        expect((await game.act(null, yes)).ok).toBe(false);
      }
      expect((await game.act(actor, yes)).ok).toBe(true);
      expect(game.view(viewer).word).not.toBe(first);
      expect(game.view(viewer).turnScore).toBeGreaterThan(0);
      expect((await game.act(actor, no)).ok).toBe(true);
      expect((await game.act(actor, 'timeUp')).ok).toBe(true);
      expect(game.view('*').recap).toHaveLength(2);
    }
    expect(game.current.ended).toBeDefined();
  });

test('Quiz Night doubles speed and streak bonuses as well as the base point', async () => {
  const game = await session('quiz-night', 'phones', ['p1', 'p2']);
  for (let round = 0; round < 3; round++) {
    const state = JSON.parse(game.current.state);
    const { QUESTIONS } = await import('../official/quiz-night/content');
    const value = QUESTIONS[state.order[state.at]].answer;
    await game.act('p1', 'answer', { value, double: true });
    await game.act('p2', 'answer', { value, double: false });
    expect(game.view('p1').gains.p1.points).toBe(round === 2 ? 6 : 4);
    await game.act('p1', 'next');
  }
});

test('Charades refills an exhausted mixed deck without ending the timed turn', async () => {
  const game = await session('charades', 'pass', ['p1', 'p2']);
  await game.act('p1', 'start');
  const size = JSON.parse(game.current.state).order.length;
  const seen: string[] = [];
  for (let i = 0; i < size; i++) {
    seen.push(game.view('p1').word);
    expect((await game.act('p1', 'skip')).ok).toBe(true);
  }
  expect(new Set(seen).size).toBe(size);
  expect(game.view('p1').playing).toBe(true);
  expect(typeof game.view('p1').word).toBe('string');
  expect(game.current.turn).toBe('p1');
  expect(game.current.ended).toBeUndefined();
});

test('Beer Golf hides strokes until the hole is revealed and ends with scores against par', async () => {
  const game = await session('beer-golf', 'phones', ['p1', 'p2']);
  // Only the host sets up; the round then has three holes.
  expect((await game.act('p2', 'setStyle', { value: 1 })).ok).toBe(false);
  expect((await game.act('p1', 'setStyle', { value: 1 })).ok).toBe(true);
  expect((await game.act('p1', 'setHoles', { value: 0 })).ok).toBe(true);
  expect((await game.act('p1', 'start')).ok).toBe(true);
  expect((await game.act('p1', 'setStyle', { value: 0 })).ok).toBe(false);
  const par = game.view('p1').par;
  for (let hole = 0; hole < 3; hole++) {
    const { par } = game.view('p1');
    expect((await game.act('p1', 'submit', { value: par + 5, target: null })).ok).toBe(false);
    expect((await game.act('p1', 'submit', { value: par - 1, target: null })).ok).toBe(true);
    expect(game.view('p2').card.p1).toHaveLength(hole);
    expect(game.view('p2').revealed).toBe(false);
    expect((await game.act('p2', 'submit', { value: 0, target: null })).ok).toBe(true);
    expect(game.view('p1').revealed).toBe(true);
    expect(game.view('p1').card.p1[hole]).toBe(par - 1);
    expect(game.view('p1').card.p2[hole]).toBeNull();
    await game.act('p1', 'next');
  }
  expect(par).toBeGreaterThan(0);
  expect(game.current.ended).toBeDefined();
  expect(JSON.parse(game.current.ended!).toPar).toEqual({ p1: -3, p2: 0 });
});
