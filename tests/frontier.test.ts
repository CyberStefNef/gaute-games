import { beforeAll, expect, test } from 'vite-plus/test';
import { bundleGame } from '../tools/games.mjs';
import { runGame } from '../tools/sandbox.mjs';
import { neighbors, distance, type State } from '../official/frontier/model';
import type { Mode } from '../sdk/logic';
import type { RuntimeOutcome } from '../sdk/runtime';
type Played = Extract<RuntimeOutcome, { state: string }>;
let logic: string;
beforeAll(async () => {
  logic = (await bundleGame('frontier')).logic;
});
const played = (result: RuntimeOutcome): Played => {
  if (!result.ok || !('state' in result)) throw Error(JSON.stringify(result));
  return result;
};
const stateOf = (done: Played): State => JSON.parse(done.state);
const viewOf = (done: Played, player = 'p1') => JSON.parse(done.views[player]);
async function boot(mode: Mode = 'phones', count = 2, size = 12, seed = 7) {
  const players = Array.from({ length: count }, (_, i) => `p${i + 1}`);
  const setup = played(await runGame(logic, { op: 'setup', mode, players, locale: 'en', seed }));
  return played(
    await runGame(logic, {
      op: 'action',
      mode,
      players,
      state: setup.state,
      playerId: 'p1',
      action: 'start',
      payload: { size },
      seed,
    }),
  );
}
function act(
  done: Played,
  action: string,
  payload: unknown = null,
  playerId: string | null = stateOf(done).mode === 'phones'
    ? (stateOf(done).players.find(
        (p) => stateOf(done).realms[p]?.active && !stateOf(done).finished.includes(p),
      ) ?? null)
    : stateOf(done).active,
) {
  const s = stateOf(done);
  return runGame(logic, {
    op: 'action',
    mode: s.mode,
    players: s.players.filter((p) => s.realms[p]?.active),
    state: done.state,
    playerId,
    action,
    payload: action === 'endTurn' && payload === null ? { round: s.round } : payload,
    seed: 9,
  });
}
function fixture(done: Played, change: (s: State) => void) {
  const s = stateOf(done);
  change(s);
  return { ...done, state: JSON.stringify(s) };
}
async function cycle(done: Played) {
  const state = stateOf(done),
    first = state.active,
    round = state.round;
  do {
    done = played(await act(done, 'endTurn'));
  } while (
    !done.ended &&
    (state.mode === 'phones' ? stateOf(done).round === round : stateOf(done).active !== first)
  );
  return done;
}

test('Brewtown uses reciprocal hex neighbors and connected generated destinations in both modes', async () => {
  for (const size of [8, 12, 16, 24]) {
    const done = await boot('pass', 4, size);
    expect(done).toEqual(await boot('pass', 4, size));
    const s = stateOf(done);
    const seen = new Set([s.venues[0].at]),
      queue = [...seen];
    for (let i = 0; i < queue.length; i++)
      for (const n of neighbors(queue[i], size))
        if (!seen.has(n) && s.ground[n] !== 3 && s.ground[n] !== 2) {
          seen.add(n);
          queue.push(n);
        }
    expect(s.venues.every((v) => seen.has(v.at))).toBe(true);
    for (let at = 0; at < s.ground.length; at++)
      for (const n of neighbors(at, size)) {
        expect(neighbors(n, size)).toContain(at);
        expect(distance(at, n, size)).toBe(1);
      }
    expect([5, 6]).toContain(neighbors(size * 4 + 4, size).length);
    expect(done.turn).toBe('p1');
  }
});
test('Brewtown protects private stock, cargo, production and contracts behind the pass gate', async () => {
  let done = fixture(await boot('pass'), (s) => {
    s.realms.p2.coins = 999;
    s.couriers[1].cargo = [{ recipe: 'lager', amount: 4 }];
  });
  done = played(await act(done, 'learn', { skill: 'wayfinding' }));
  const gate = viewOf(done, '*');
  expect(gate).toMatchObject({
    realm: null,
    couriers: [],
    venues: [],
    skills: [],
    batches: [],
    contracts: [],
    production: [],
    upgrades: [],
    gathering: [],
  });
  expect(gate.ground.every((n: number) => n === -1)).toBe(true);
  const own = viewOf(done);
  expect(own.realm.coins).toBe(12);
  expect(own.couriers.every((c: { owner: string }) => c.owner === 'p1')).toBe(true);
  expect(JSON.stringify(own)).not.toContain('999');
});
test('Brewtown rejects forged actors, removed combat actions, invalid recipe ids and negative cargo', async () => {
  const done = await boot();
  for (const [action, payload, player] of [
    ['start', { size: 8 }, 'p2'],
    ['endTurn', null, null],
    ['attack', { id: 1, at: 14 }, 'p1'],
    ['capture', { id: 1 }, 'p1'],
    ['travel', { courier: 2, at: 14 }, 'p1'],
    ['travel', { courier: 1, at: 999 }, 'p1'],
    ['learn', { skill: '__proto__' }, 'p1'],
    ['load', { courier: 1, venue: 13, recipe: 'houseAle', amount: -2 }, 'p1'],
    ['load', { courier: 1, venue: 13, recipe: 'houseAle', amount: 0 }, 'p1'],
    ['produce', { venue: 13, option: 'brew:__proto__' }, 'p1'],
    ['upgrade', { venue: 13, option: 'plot:constructor' }, 'p1'],
  ] as const)
    expect((await act(done, action, payload, player)).ok).toBe(false);
  expect(stateOf(done).realms.p1.coins).toBe(14);
});
test('Brewtown has a connected research tree with genuinely gated recipes and delivery capacities', async () => {
  let done = fixture(await boot(), (s) => {
    s.realms.p1.coins = 100;
    s.realms.p1.knowledge = 100;
  });
  expect((await act(done, 'learn', { skill: 'barrelcraft' })).ok).toBe(false);
  expect((await act(done, 'produce', { venue: 13, option: 'brew:lager' })).ok).toBe(false);
  for (const skill of [
    'hopcraft',
    'coldferment',
    'wildyeast',
    'barrelcraft',
    'wayfinding',
    'cycleways',
    'coldchain',
  ])
    done = played(await act(done, 'learn', { skill }));
  expect((await act(done, 'learn', { skill: 'hopcraft' })).ok).toBe(false);
  done = played(await act(done, 'produce', { venue: 13, option: 'hire:cargo' }));
  const courier = stateOf(done).couriers.at(-1)!;
  expect(courier).toMatchObject({ kind: 'cargo', ready: false });
  expect(viewOf(done).couriers.find((c: { id: number }) => c.id === courier.id).capacity).toBe(6);
});
test('Brewtown gathers twice per turn, requires suitable plots and produces ingredients automatically', async () => {
  let done = await boot();
  const s = stateOf(done),
    home = s.venues[0].at;
  const fields = neighbors(home, s.size).filter((at) => s.resources[at]);
  done = played(await act(done, 'gather', { at: fields[0] }));
  expect((await act(done, 'gather', { at: fields[0] })).ok).toBe(false);
  done = played(await act(done, 'gather', { at: fields[1] }));
  expect((await act(done, 'gather', { at: fields[2] })).ok).toBe(false);
  const field = fields.find((at) => s.ground[at] === 0)!;
  done = played(await act(done, 'upgrade', { venue: field, option: 'plot:barleyField' }));
  expect((await act(done, 'upgrade', { venue: field, option: 'plot:barleyField' })).ok).toBe(false);
  const barley = stateOf(done).realms.p1.stock.barley;
  done = await cycle(done);
  expect(stateOf(done).realms.p1.stock.barley).toBe(barley + 2);
  expect((await act(done, 'gather', { at: fields[0] })).ok).toBe(true);
});
test('Brewtown ferments in limited vessels, matures over owner turns and conserves loaded inventory', async () => {
  let done = await boot();
  done = played(await act(done, 'produce', { venue: 13, option: 'brew:houseAle' }));
  expect((await act(done, 'produce', { venue: 13, option: 'brew:houseAle' })).ok).toBe(false);
  expect(
    (await act(done, 'load', { courier: 1, venue: 13, recipe: 'houseAle', amount: 2 })).ok,
  ).toBe(false);
  done = await cycle(done);
  expect(stateOf(done).batches[0]).toMatchObject({ stage: 'mature', turnsLeft: 1 });
  done = await cycle(done);
  expect(stateOf(done).batches[0]).toMatchObject({ stage: 'ready', turnsLeft: 0 });
  done = played(await act(done, 'load', { courier: 1, venue: 13, recipe: 'houseAle', amount: 1 }));
  expect(stateOf(done).batches[0].amount).toBe(1);
  expect(stateOf(done).couriers[0].cargo[0].amount).toBe(1);
  expect(
    (await act(done, 'load', { courier: 1, venue: 13, recipe: 'houseAle', amount: 2 })).ok,
  ).toBe(false);
  done = played(await act(done, 'load', { courier: 1, venue: 13, recipe: 'houseAle', amount: 1 }));
  expect(stateOf(done).batches).toEqual([]);
  expect(stateOf(done).couriers[0].cargo[0].amount).toBe(2);
});
test('Brewtown routes follow true hex steps, reveal territory, and spend one travel opportunity', async () => {
  let done = await boot();
  const initial = viewOf(done),
    path = initial.reach[0].paths;
  const destination = initial.reach[0].tiles.find((at: number) => path[at].length === 3);
  expect(destination).toBeDefined();
  done = played(await act(done, 'travel', { courier: 1, at: destination }));
  expect(stateOf(done).couriers[0]).toMatchObject({ at: destination, ready: false });
  expect((await act(done, 'travel', { courier: 1, at: 13 })).ok).toBe(false);
  expect(viewOf(done).visible.length).toBeGreaterThan(initial.visible.length);
  done = await cycle(done);
  expect(stateOf(done).couriers[0].ready).toBe(true);
});
test('Brewtown completes a real brew-load-route-delivery loop and never pays an order twice', async () => {
  let done = fixture(await boot(), (s) => {
    // Move a synthetic pub to the player's neighborhood; all actions remain real.
    const at = neighbors(13, 12).find((at) => at !== s.couriers[0].at)!;
    const venue = s.venues.find((v) => v.owner === null)!;
    venue.at = at;
    venue.kind = 'festival';
    s.ground[at] = 5;
    const contract = s.contracts.find(
      (c) => c.venue === s.venues.find((v) => v.owner === null)!.at,
    );
    // Replace requests with one locally visible synthetic order.
    s.contracts = [
      {
        id: contract?.id ?? 'test-order',
        venue: at,
        client: 'Neighbourhood festival',
        recipe: 'houseAle',
        amount: 2,
        dueRound: 9,
        reward: { coins: 7, reputation: 8 },
        state: 'open',
        holder: null,
      },
    ];
  });
  done = played(await act(done, 'produce', { venue: 13, option: 'brew:houseAle' }));
  done = await cycle(done);
  done = await cycle(done);
  const contract = stateOf(done).contracts[0];
  done = played(await act(done, 'accept', { contract: contract.id }));
  done = played(await act(done, 'load', { courier: 1, venue: 13, recipe: 'houseAle', amount: 2 }));
  done = played(await act(done, 'travel', { courier: 1, at: contract.venue }));
  const coins = stateOf(done).realms.p1.coins;
  done = played(await act(done, 'deliver', { courier: 1, contract: contract.id }));
  expect(stateOf(done).realms.p1).toMatchObject({
    coins: coins + 7,
    reputation: 8,
    delivered: 1,
    festivals: 1,
    styles: ['houseAle'],
  });
  expect(stateOf(done).couriers[0].cargo).toEqual([]);
  expect((await act(done, 'deliver', { courier: 1, contract: contract.id })).ok).toBe(false);
});
test('Brewtown contract reservation is exclusive, deadlines allow the complete due round, and history stays bounded', async () => {
  let done = fixture(await boot(), (s) => {
    for (const p of s.players) s.realms[p].explored = '1'.repeat(144);
    s.couriers[0].at = s.contracts[0].venue;
    s.contracts[0].dueRound = 1;
  });
  const id = stateOf(done).contracts[0].id;
  done = played(await act(done, 'accept', { contract: id }));
  done = played(await act(done, 'endTurn'));
  expect((await act(done, 'accept', { contract: id })).ok).toBe(false);
  expect(stateOf(done).contracts.find((c) => c.id === id)?.state).toBe('accepted');
  done = played(await act(done, 'endTurn'));
  expect(stateOf(done).contracts.find((c) => c.id === id)?.state).toBe('expired');
  for (let turn = 0; turn < 30; turn++) done = played(await act(done, 'endTurn'));
  expect(
    stateOf(done).contracts.filter((c) => c.state === 'expired' || c.state === 'delivered').length,
  ).toBeLessThanOrEqual(8);
});
test('Brewtown opens neutral venues peacefully, keeps rivals intact and supports season and festival wins', async () => {
  let done = fixture(await boot('pass', 3), (s) => {
    s.realms.p1.coins = 100;
    s.realms.p1.knowledge = 100;
    s.couriers[0].at = s.venues.find((v) => v.kind === 'pub')!.at;
  });
  const at = stateOf(done).couriers[0].at;
  expect((await act(done, 'open', { courier: 1 })).ok).toBe(false);
  done = played(await act(done, 'learn', { skill: 'welcome' }));
  done = played(await act(done, 'open', { courier: 1 }));
  expect(stateOf(done).venues.find((v) => v.at === at)).toMatchObject({
    owner: 'p1',
    kind: 'taproom',
  });
  expect(stateOf(done).realms.p2.active).toBe(true);
  done = fixture(done, (s) => {
    s.round = s.rounds;
    s.active = 'p3';
    s.realms.p1.reputation = 20;
  });
  done = played(await act(done, 'endTurn'));
  expect(done.ended).toBeDefined();
  expect(done.turn).toBeNull();
  expect(JSON.parse(done.ended!)).toMatchObject({ winners: ['p1'], victory: 'season' });
});
test('Brewtown finishes and deterministically replays complete seasons in both advertised modes', async () => {
  for (const mode of ['phones', 'pass'] as const) {
    let done = await boot(mode, 4, 8);
    let moves = 0;
    while (!done.ended) {
      const before = done;
      const s = stateOf(done);
      const actor = mode === 'phones' ? s.players.find((p) => !s.finished.includes(p))! : s.active;
      const view = viewOf(done, actor);
      let action = 'endTurn',
        payload: unknown = null;
      if (stateOf(done).round === 1 && view.production[0]?.options[0]?.blocked === null) {
        action = 'produce';
        payload = { venue: view.production[0].at, option: view.production[0].options[0].key };
      }
      done = played(await act(before, action, payload));
      expect(done).toEqual(played(await act(before, action, payload)));
      moves++;
      expect(moves).toBeLessThan(200);
    }
    expect(moves).toBeGreaterThan(90);
    expect(stateOf(done).victory).toBe('season');
  }
});
test('Brewtown departures release contracts and transfer the active turn without leaking the pass gate', async () => {
  const initial = await boot('pass', 3),
    s = stateOf(initial);
  const done = played(
    await runGame(logic, {
      op: 'leave',
      mode: 'pass',
      state: initial.state,
      players: ['p2', 'p3'],
      playerId: 'p1',
      seed: 9,
    }),
  );
  expect(done.turn).toBe('p2');
  expect(stateOf(done).venues.find((v) => v.at === s.venues[0].at)?.owner).toBeNull();
  expect(viewOf(done, '*').realm).toBeNull();
});

test('Brewtown raids consume supplies, damage income and pause fermentation until repaired', async () => {
  let done = fixture(await boot('phones', 3), (s) => {
    const target = s.venues[1].at;
    s.couriers[0].at = neighbors(target, s.size)[0];
    s.couriers[0].cargo = [{ recipe: 'houseAle', amount: 2 }];
    s.batches.push({
      id: 'defender-batch',
      owner: 'p2',
      venue: target,
      recipe: 'houseAle',
      amount: 2,
      stage: 'ferment',
      turnsLeft: 2,
      turnsTotal: 2,
    });
  });
  const target = stateOf(done).venues[1].at,
    coins = stateOf(done).realms.p1.coins;
  expect((await act(done, 'breach', { courier: 1, at: target, mode: 'demolish' })).ok).toBe(false);
  done = played(await act(done, 'raid', { courier: 1, at: target }));
  expect(stateOf(done).realms.p1.coins).toBe(coins - 2);
  expect(stateOf(done).couriers[0].cargo[0].amount).toBe(1);
  expect(stateOf(done).venues[1].damage).toBe(3);
  expect(stateOf(done).couriers[0].ready).toBe(false);
  expect((await act(done, 'raid', { courier: 1, at: target })).ok).toBe(false);
  done = played(await act(done, 'endTurn'));
  expect(viewOf(done, 'p2').realm.income).toBe(0);
  expect(stateOf(done).batches[0].turnsLeft).toBe(2);
  done = played(await act(done, 'repair', { venue: target }));
  expect(stateOf(done).venues[1].damage).toBe(0);
  expect((await act(done, 'repair', { venue: target })).ok).toBe(false);
});

test('Brewtown takeovers transfer venues and plots, discard batches and preserve rival private stock', async () => {
  let done = fixture(await boot('phones', 3), (s) => {
    const target = s.venues[1].at;
    s.realms.p1.coins = 100;
    s.couriers[0].at = neighbors(target, s.size)[0];
    s.couriers[0].cargo = [{ recipe: 'houseAle', amount: 2 }];
    s.couriers[1].at = 0;
    s.plots.push({
      at: neighbors(target, s.size)[1],
      owner: 'p2',
      kind: 'barleyField',
      venue: target,
    });
    s.batches.push({
      id: 'lost-batch',
      owner: 'p2',
      venue: target,
      recipe: 'houseAle',
      amount: 2,
      turnsLeft: 1,
      turnsTotal: 2,
      stage: 'mature',
    });
  });
  const target = stateOf(done).venues[1].at,
    stock = stateOf(done).realms.p2.stock;
  done = played(await act(done, 'raid', { courier: 1, at: target }));
  done = await cycle(done);
  done = played(await act(done, 'raid', { courier: 1, at: target }));
  expect(stateOf(done).venues[1].damage).toBe(8);
  expect((await act(done, 'breach', { courier: 1, at: target, mode: 'takeover' })).ok).toBe(false);
  done = await cycle(done);
  done = played(await act(done, 'breach', { courier: 1, at: target, mode: 'takeover' }));
  expect(stateOf(done).venues[1]).toMatchObject({ owner: 'p1', damage: 0 });
  expect(stateOf(done).plots[0].owner).toBe('p1');
  expect(stateOf(done).batches).toEqual([]);
  expect(stateOf(done).realms.p2.stock.barley).toBe(stock.barley);
  expect(stateOf(done).incidents.at(-1)?.kind).toBe('takeover');
});

test('Brewtown demolition leaves ruins with real lost improvements and rebuilding has a cost', async () => {
  let done = fixture(await boot('pass', 3), (s) => {
    const target = s.venues[1];
    target.damage = 8;
    s.couriers[0].at = neighbors(target.at, s.size)[0];
    s.realms.p1.coins = 100;
    s.plots.push({
      at: neighbors(target.at, s.size)[1],
      owner: 'p2',
      kind: 'barleyField',
      venue: target.at,
    });
  });
  const target = stateOf(done).venues[1].at;
  done = played(await act(done, 'breach', { courier: 1, at: target, mode: 'demolish' }));
  expect(stateOf(done).venues.some((v) => v.at === target)).toBe(false);
  expect(stateOf(done).plots).toEqual([]);
  expect(stateOf(done).ruins).toContainEqual({ at: target, previousKind: 'brewhouse' });
  done = await cycle(done);
  const coins = stateOf(done).realms.p1.coins;
  done = played(await act(done, 'rebuild', { courier: 1, at: target }));
  expect(stateOf(done).realms.p1.coins).toBe(coins - 10);
  expect(stateOf(done).venues.find((v) => v.at === target)).toMatchObject({
    owner: 'p1',
    level: 1,
    damage: 0,
  });
  expect(stateOf(done).ruins).toEqual([]);
});

test('Brewtown defenses increase durability, crews protect venues and last-rival takeover wins', async () => {
  let done = fixture(await boot(), (s) => {
    s.realms.p1.coins = 100;
  });
  done = played(await act(done, 'fortify', { venue: 13 }));
  expect(viewOf(done).venues.find((v: { at: number }) => v.at === 13).maxDurability).toBe(12);
  expect((await act(done, 'fortify', { venue: 13 })).ok).toBe(false);
  done = fixture(done, (s) => {
    s.venues[1].damage = 8;
    s.couriers[0].at = neighbors(s.venues[1].at, s.size)[0];
  });
  done = played(
    await act(done, 'breach', { courier: 1, at: stateOf(done).venues[1].at, mode: 'takeover' }),
  );
  expect(JSON.parse(done.ended!)).toMatchObject({ winners: ['p1'], victory: 'takeover' });
});

test('Brewtown operating state with 48 couriers and full venue systems fits the default SDK budgets', async () => {
  let done = fixture(await boot('phones', 4, 24), (s) => {
    for (const p of s.players) {
      s.realms[p].explored = '1'.repeat(s.ground.length);
      s.realms[p].coins = 100;
    }
    s.couriers = Array.from({ length: 48 }, (_, i) => ({
      id: i + 1,
      at: Math.floor(i / 4) * 24 + (i % 4) * 2,
      owner: s.players[i % 4],
      kind: 'bike',
      ready: true,
      cargo: [{ recipe: 'houseAle', amount: 2 }],
      deliveries: 0,
    }));
    s.nextId = 100;
  });
  done = played(await act(done, 'endTurn'));
  expect(done.state.length).toBeLessThan(512 * 1024);
  for (const view of Object.values(done.views)) expect(view.length).toBeLessThan(256 * 1024);
});

test('separate phones act in the same round, then advance every economy exactly once', async () => {
  let done = await boot('phones', 3);
  const initial = stateOf(done);
  for (const player of initial.players) {
    expect(viewOf(done, player).canAct).toBe(true);
    const field = viewOf(done, player).gathering.find(
      (g: { blocked: string | null }) => !g.blocked,
    ).at;
    done = played(await act(done, 'gather', { at: field }, player));
  }
  // Ready order is independent of roster order; nobody gains an extra turn.
  for (const player of ['p3', 'p1']) {
    done = played(await act(done, 'endTurn', { round: 1 }, player));
    expect(stateOf(done).round).toBe(1);
    expect(viewOf(done, player).canAct).toBe(false);
    expect(viewOf(done, player).reach).toEqual([]);
    expect((await act(done, 'learn', { skill: 'wayfinding' }, player)).ok).toBe(false);
    expect((await act(done, 'endTurn', { round: 1 }, player)).ok).toBe(false);
  }
  expect(viewOf(done, 'p2').canAct).toBe(true);
  done = played(
    await act(done, 'produce', { venue: initial.venues[1].at, option: 'brew:houseAle' }, 'p2'),
  );
  const before = stateOf(done);
  const result = await act(done, 'endTurn', { round: 1 }, 'p2');
  expect(result).toEqual(await act(done, 'endTurn', { round: 1 }, 'p2'));
  done = played(result);
  const after = stateOf(done);
  expect(after.round).toBe(2);
  expect(after.finished).toEqual([]);
  for (const player of initial.players) {
    expect(after.realms[player].coins).toBe(before.realms[player].coins + 2);
    expect(after.realms[player].knowledge).toBe(before.realms[player].knowledge + 1);
    expect(after.realms[player].gathered).toEqual([]);
    expect(viewOf(done, player).canAct).toBe(true);
  }
  expect(after.batches[0].turnsLeft).toBe(1);
  expect(after.couriers.every((c) => c.ready)).toBe(true);
  expect((await act(done, 'endTurn', { round: 1 }, 'p2')).ok).toBe(false);
  expect((await act(done, 'gather', { at: initial.venues[0].at }, 'outsider')).ok).toBe(false);
});

test('a departing phone cannot leave everyone else stuck at the ready barrier', async () => {
  let done = await boot('phones', 3);
  done = played(await act(done, 'endTurn', { round: 1 }, 'p1'));
  done = played(await act(done, 'endTurn', { round: 1 }, 'p2'));
  const next = played(
    await runGame(logic, {
      op: 'leave',
      mode: 'phones',
      state: done.state,
      players: ['p1', 'p2'],
      playerId: 'p3',
      seed: 9,
    }),
  );
  expect(stateOf(next).round).toBe(2);
  expect(viewOf(next, 'p1')).toMatchObject({ canAct: true, finished: [], alive: ['p1', 'p2'] });
  expect(stateOf(next).realms.p1.coins).toBe(16);
  expect(viewOf(next, 'p2').realm.coins).toBe(16);
});

test('competing phone actions revalidate claimed orders and venues without double charges', async () => {
  let done = fixture(await boot('phones', 3), (s) => {
    const venue = s.venues.find((v) => v.owner === null && v.kind === 'pub')!;
    for (const player of ['p1', 'p2']) {
      s.realms[player].tech.push('welcome');
      s.couriers.find((c) => c.owner === player)!.at = venue.at;
    }
    s.contracts = [
      {
        id: 'contested',
        venue: venue.at,
        client: 'Synthetic pub',
        recipe: 'houseAle',
        amount: 2,
        dueRound: 4,
        reward: { coins: 5, reputation: 5 },
        state: 'open',
        holder: null,
      },
    ];
  });
  const venue = stateOf(done).couriers[0].at;
  done = played(await act(done, 'accept', { contract: 'contested' }, 'p2'));
  expect((await act(done, 'accept', { contract: 'contested' }, 'p1')).ok).toBe(false);
  done = played(await act(done, 'open', { courier: 1 }, 'p1'));
  const before = stateOf(done).realms.p2.coins;
  expect((await act(done, 'open', { courier: 2 }, 'p2')).ok).toBe(false);
  expect(stateOf(done).venues.find((v) => v.at === venue)?.owner).toBe('p1');
  expect(stateOf(done).realms.p2.coins).toBe(before);
  expect(stateOf(done).contracts[0].holder).toBe('p2');
});
