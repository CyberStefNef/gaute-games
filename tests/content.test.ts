import { expect, test } from 'vite-plus/test';
import { bundleGame } from '../tools/games.mjs';
import { runGame } from '../tools/sandbox.mjs';
import { PILOT as never } from '../official/never-have-i-ever/pilot';
import { PILOT as rather } from '../official/would-you-rather/pilot';
import { PILOT as truth } from '../official/truth-or-dare/pilot';
import { PILOT as facts } from '../official/bluff/pilot';
import type { Mode } from '../sdk/logic';

test('the pilot has 90 distinct bilingual social prompts and ten sourced facts', () => {
  for (const rows of [never, rather, truth]) expect(rows).toHaveLength(30);
  expect(facts).toHaveLength(10);
  const rows = [...never, ...rather, ...truth, ...facts];
  expect(new Set(rows.map((row) => row.id)).size).toBe(100);
  for (const row of rows) {
    expect(row.id).toMatch(/^[a-z0-9-]{1,64}$/);
    expect(row.topic.length).toBeGreaterThan(0);
    const texts =
      'a' in row ? [row.a, row.b] : 'fact' in row ? [row.fact, row.truth, row.explanation] : [row];
    for (const text of texts) {
      expect(text.en.trim().length).toBeGreaterThan(0);
      expect(text.nb.trim().length).toBeGreaterThan(0);
    }
  }
  for (const fact of facts) {
    expect(fact.source.url).toMatch(/^https:\/\//);
    expect(fact.source.checkedAt).toBe('2026-11-10');
    expect(fact.fact.en.match(/___/g)).toHaveLength(1);
    expect(fact.fact.nb.match(/___/g)).toHaveLength(1);
    expect(fact.truth.en.length).toBeLessThanOrEqual(40);
    expect(fact.truth.nb.length).toBeLessThanOrEqual(40);
  }
});

async function session(slug: string, mode: Mode, seen: string[], locale = 'en') {
  const { logic } = await bundleGame(slug);
  const players = ['p1', 'p2', 'p3'];
  let step = 1;
  let current = await runGame(logic, { op: 'setup', mode, players, locale, seed: 7 });
  const good = () => {
    if (!current.ok || 'unsupported' in current) throw Error('Invalid test state');
    return current;
  };
  async function act(action: string, payload: unknown = null, playerId: string | null = null) {
    const next = await runGame(logic, {
      op: 'action',
      mode,
      players,
      state: good().state,
      playerId,
      action,
      payload,
      seed: ++step,
    });
    if (next.ok) current = next;
    return next;
  }
  expect((await act('restoreContent', { seen })).ok).toBe(true);
  return {
    act,
    state: () => JSON.parse(good().state),
    view: (player = '*') => JSON.parse(good().views[player]),
    ended: () => good().ended,
  };
}

for (const slug of ['would-you-rather', 'never-have-i-ever'])
  test(`${slug} avoids actual displayed cards on rematch and excludes queued custom text`, async () => {
    let history: string[] = [];
    const rounds = slug === 'would-you-rather' ? 12 : 10;
    for (let match = 0; match < 2; match++) {
      const game = await session(slug, 'shared', history, match ? 'nb' : 'en');
      await game.act('pick', { value: 0 });
      for (let round = 0; round < rounds; round++) {
        const ids: string[] = game.state().content.seen;
        expect(ids.at(-1)).not.toBeUndefined();
        if (match) expect(history).not.toContain(ids.at(-1));
        await game.act('next');
      }
      expect(game.ended()).toBeDefined();
      expect(game.state().content.seen).toHaveLength((match + 1) * rounds);
      history = game.state().content.seen;
    }
    const again = await session(slug, 'shared', history);
    await again.act('pick', { value: 0 });
    // Would You Rather's first pack has 24 cards after the pilot. Its third
    // game reuses the oldest exposed card once all cards have been shown.
    if (slug === 'would-you-rather') expect(again.state().content.seen.at(-1)).toBe(history[0]);
    expect((await again.act('restoreContent', { seen: [] })).ok).toBe(false);
  });

test('history restores once, rejects player injection, and never records custom statements', async () => {
  const game = await session('never-have-i-ever', 'shared', []);
  expect((await game.act('restoreContent', { seen: [] })).ok).toBe(false);
  await game.act('addOwn', { text: 'this synthetic private statement must not become history' });
  await game.act('pick', { value: 0 });
  expect(game.state().content.seen).toEqual([]);
  await game.act('next');
  expect(game.state().content.seen).toHaveLength(1);
  expect(JSON.stringify(game.state().content)).not.toContain('synthetic');
});

test('Truth or Dare tracks truth and dare exposure independently across rematches', async () => {
  let history: string[] = [];
  for (let match = 0; match < 2; match++) {
    const game = await session('truth-or-dare', 'shared', history);
    await game.act('pick', { value: 0 });
    for (let turn = 0; turn < 20; turn++) {
      await game.act('choose', { value: turn % 2 });
      expect(history).not.toContain(game.state().content.seen.at(-1));
      await game.act(turn % 3 ? 'done' : 'skip');
    }
    expect(game.state().content.seen).toHaveLength((match + 1) * 20);
    history = game.state().content.seen;
  }
});

test('Bluff restores before its first visible fact, keeps history private and completes two distinct games', async () => {
  let history: string[] = [];
  for (let match = 0; match < 2; match++) {
    const game = await session('bluff', 'phones', history);
    for (let round = 0; round < 6; round++) {
      expect(history).not.toContain(game.state().content.seen.at(-1));
      expect(game.view('p1').content).toBeUndefined();
      expect(game.view('p1').explanation).toBeNull();
      for (const [i, p] of ['p1', 'p2', 'p3'].entries())
        await game.act('write', { text: ['Pancake', 'Sausage', 'Moose'][i] }, p);
      for (const p of ['p1', 'p2', 'p3']) {
        const options = game.view(p).options;
        await game.act('vote', { value: options.findIndex((o: { mine: boolean }) => !o.mine) }, p);
      }
      await game.act('showAll', null, 'p1');
      await game.act('next', null, 'p1');
    }
    expect(game.ended()).toBeDefined();
    expect(game.state().content.seen).toHaveLength((match + 1) * 6);
    history = game.state().content.seen;
  }
});

test('new Bluff facts reject correct alternative answers in both languages', async () => {
  const legacy = Array.from({ length: 20 }, (_, i) => `bluff-legacy-${i}`);
  for (const locale of ['en', 'nb'] as const)
    for (const fact of facts) {
      const seen = [
        ...legacy,
        ...facts.filter((other) => other.id !== fact.id).map((other) => other.id),
      ];
      const game = await session('bluff', 'phones', seen, locale);
      expect(game.view('p1').fact).toBe(fact.fact[locale]);
      for (const answer of [fact.truth[locale], ...fact.aliases[locale]]) {
        const rejected = await game.act('write', { text: answer }, 'p1');
        expect(rejected).toEqual({
          ok: false,
          reason: 'That’s the real answer! Write a fake one.',
        });
      }
    }
});

for (const slug of ['would-you-rather', 'never-have-i-ever', 'truth-or-dare'])
  test(`${slug} mixes all packs with stable IDs and avoids themed cards on rematch`, async () => {
    const { PACKS, PROMPTS } = await import(`../official/${slug}/content.ts`);
    const mixed = PACKS.length - 1;
    const ids = (pack: (typeof PROMPTS)[number]) =>
      Array.isArray(pack)
        ? pack.map((p: { id: string }) => p.id)
        : [...pack.truth, ...pack.dare].map((p: { id: string }) => p.id);
    const all: string[] = PROMPTS.slice(0, mixed).flatMap(ids);
    expect(ids(PROMPTS[mixed]).sort()).toEqual([...all].sort());
    expect(new Set(all).size).toBe(all.length);
    const themed = await session(slug, 'shared', []);
    await themed.act('pick', { value: 0 });
    if (slug === 'truth-or-dare') await themed.act('choose', { value: 0 });
    const history = themed.state().content.seen;
    const game = await session(slug, 'shared', history, 'nb');
    expect((await game.act('pick', { value: mixed })).ok).toBe(true);
    if (slug === 'truth-or-dare') await game.act('choose', { value: 0 });
    const current = game.state().content.seen.at(-1);
    expect(all).toContain(current);
    expect(history).not.toContain(current);
  });
