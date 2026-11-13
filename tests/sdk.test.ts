// The SDK's contract with the Gaute app: message validation, the game page and
// the rules runtime.
import { expect, test } from 'vite-plus/test';
import { GAME_LIMITS } from '../sdk/limits.mjs';
import { runGame } from '../tools/sandbox.mjs';
import { gameDocument } from '../sdk/document.ts';
import {
  GAME_MESSAGE_LIMIT,
  PROTOCOL,
  parseGameMessage,
  parseHostMessage,
  type Theme,
} from '../sdk/protocol.ts';

const theme = { dark: false, colors: {}, radius: '0.5rem' } as Theme;

test('the largest view the server allows still reaches a game as one string', () => {
  const view = { text: 'x'.repeat(GAME_LIMITS.viewBytes - 20) };
  const snapshot = { mode: 'phones', status: 'playing', version: 1, you: 'p1', players: [], view };
  const sent = JSON.stringify({ gaute: PROTOCOL, type: 'init', locale: 'en', theme, snapshot });
  expect(sent.length).toBeGreaterThan(GAME_MESSAGE_LIMIT);
  expect(parseHostMessage(sent)?.type).toBe('init');
  // Messages from a game stay small.
  expect(
    parseGameMessage(
      JSON.stringify({
        gaute: PROTOCOL,
        type: 'act',
        id: 1,
        action: 'go',
        payload: 'x'.repeat(GAME_MESSAGE_LIMIT),
      }),
    ),
  ).toBeNull();
});

test('a page that fails before drawing reports it, and the report is bounded', () => {
  expect(parseGameMessage({ gaute: PROTOCOL, type: 'failed', reason: 'y'.repeat(500) })).toEqual({
    gaute: PROTOCOL,
    type: 'failed',
    reason: 'y'.repeat(200),
  });
  const page = gameDocument({ script: 'start()', style: '' }, 'en', theme);
  expect(page.indexOf("type: 'failed'")).toBeGreaterThan(-1);
  expect(page.indexOf("type: 'failed'")).toBeLessThan(page.indexOf('start()'));
});

test('async rules are rejected instead of silently losing their changes', async () => {
  const logic =
    '__gaute.defineGame({ setup: () => ({ n: 0 }), actions: { go: async (s) => { s.n++; } }, view: (s) => s });';
  const setup = await runGame(logic, {
    op: 'setup',
    mode: 'phones',
    players: ['p1'],
    locale: 'en',
    seed: 1,
  });
  expect(setup.ok).toBe(true);
  await expect(
    runGame(logic, {
      op: 'action',
      mode: 'phones',
      state: (setup as { state: string }).state,
      players: ['p1'],
      playerId: 'p1',
      action: 'go',
      payload: null,
      seed: 2,
    }),
  ).rejects.toThrow(/must not be async/);
});

const PRELUDE_GAME = (actions: string) =>
  `__gaute.defineGame({ setup: () => ({ log: [] }), actions: { ${actions} }, view: (s) => s });`;
const request = (action: string, payload: unknown) => ({
  op: 'action' as const,
  mode: 'phones' as const,
  state: JSON.stringify({ log: [] }),
  players: ['p1', 'p2'],
  playerId: 'p1',
  action,
  payload,
  seed: 1,
});
const logged = (outcome: Awaited<ReturnType<typeof runGame>>) =>
  outcome.ok && 'state' in outcome
    ? (JSON.parse(outcome.state) as { log: unknown[] }).log
    : outcome;

test('payload validators run before the action, and actions without one get null', async () => {
  const logic = PRELUDE_GAME(`
    pick: { payload: (p) => { if (!p || typeof p.target !== 'string') __gaute.invalid('Choose a player.'); return { target: p.target }; },
            run: (s, { payload }) => { s.log.push(payload); } },
    plain: { run: (s, { payload }) => { s.log.push(payload); } },
    legacy: (s, { payload }) => { s.log.push(payload); },
    schema: { payload: { '~standard': { version: 1, vendor: 'test', validate: (v) => typeof v === 'number' ? { value: v * 2 } : { issues: [{ message: 'A number, please.' }] } } },
              run: (s, { payload }) => { s.log.push(payload); } },
  `);
  expect(logged(await runGame(logic, request('pick', { target: 'p2', extra: 1 })))).toEqual([
    { target: 'p2' },
  ]);
  expect(await runGame(logic, request('pick', { target: 2 }))).toEqual({
    ok: false,
    reason: 'Choose a player.',
  });
  expect(logged(await runGame(logic, request('plain', { anything: true })))).toEqual([null]);
  expect(logged(await runGame(logic, request('legacy', { raw: 1 })))).toEqual([{ raw: 1 }]);
  expect(logged(await runGame(logic, request('schema', 21)))).toEqual([42]);
  expect(await runGame(logic, request('schema', 'x'))).toEqual({
    ok: false,
    reason: 'A number, please.',
  });
});

test('game icons may only contain shapes and gradients', async () => {
  const { iconProblem } = await import('../sdk/icon.ts');
  const ok =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" fill="url(#g)"/></svg>';
  expect(iconProblem(ok)).toBeNull();
  for (const bad of [
    ok.replace('<rect', '<script>alert(1)</script><rect'),
    ok.replace('<rect', '<rect onload="x()"'),
    ok.replace('<rect', '<image href="https://example.com/a.png"/><rect'),
    ok.replace('url(#g)', 'url(https://example.com/a)'),
    ok.replace('<rect', '<text>Hi</text><rect'),
    ok.replace('0 0 96 96', '0 0 96 48'),
    '<?xml version="1.0"?>' + ok,
  ])
    expect(iconProblem(bad)).not.toBeNull();
});

test('games can ask Gaute to react, with known reactions only', () => {
  expect(parseGameMessage({ gaute: PROTOCOL, type: 'companion', reaction: 'celebrate' })).toEqual({
    gaute: PROTOCOL,
    type: 'companion',
    reaction: 'celebrate',
  });
  expect(parseGameMessage({ gaute: PROTOCOL, type: 'companion', reaction: 'dance' })).toBeNull();
});

test('expanded default budgets accept richer state and views without a manifest profile', async () => {
  const logic = `__gaute.defineGame({setup:()=>({text:'x'.repeat(400*1024)}),actions:{},view:s=>({text:s.text.slice(0,180*1024)})});`;
  const result = await runGame(logic, {
    op: 'setup',
    mode: 'phones',
    players: ['p1', 'p2'],
    locale: 'en',
    seed: 1,
  });
  expect(result.ok && 'state' in result).toBe(true);
  if (result.ok && 'state' in result) {
    expect(result.state.length).toBeGreaterThan(256 * 1024);
    expect(result.views.p1.length).toBeGreaterThan(64 * 1024);
  }
});

test('expanded budgets still reject excess state and views and interrupt runaway logic', async () => {
  const setup = {
    op: 'setup' as const,
    mode: 'phones' as const,
    players: ['p1'],
    locale: 'en',
    seed: 1,
  };
  await expect(
    runGame(
      `__gaute.defineGame({setup:()=>({text:'x'.repeat(${GAME_LIMITS.stateBytes})}),actions:{},view:()=>null});`,
      setup,
    ),
  ).rejects.toThrow(/state is larger/);
  await expect(
    runGame(
      `__gaute.defineGame({setup:()=>({}),actions:{},view:()=>({text:'x'.repeat(${GAME_LIMITS.viewBytes})})});`,
      setup,
    ),
  ).rejects.toThrow(/view.*larger/);
  await expect(
    runGame(`__gaute.defineGame({setup:()=>{for(;;){}},actions:{},view:()=>null});`, setup),
  ).rejects.toThrow(/interrupted/);
});

test('host controls are bounded and never accepted as arbitrary navigation', () => {
  for (const action of ['back', 'leave', 'end', 'replay', 'players']) {
    expect(
      parseGameMessage(JSON.stringify({ gaute: PROTOCOL, type: 'host-action', id: 1, action })),
    ).toEqual({ gaute: PROTOCOL, type: 'host-action', id: 1, action });
  }
  for (const action of ['https://evil.example', '/settings', 'delete', null]) {
    expect(parseGameMessage({ gaute: PROTOCOL, type: 'host-action', id: 1, action })).toBeNull();
  }
  expect(
    parseGameMessage({ gaute: PROTOCOL, type: 'host-action', id: 1.5, action: 'back' }),
  ).toBeNull();
  expect(
    parseHostMessage({ gaute: PROTOCOL, type: 'update', snapshot: {}, controls: ['delete'] }),
  ).toBeNull();
  expect(
    parseHostMessage({ gaute: PROTOCOL, type: 'update', snapshot: {}, controls: ['back'] })?.type,
  ).toBe('update');
});

test('the client routes advertised host controls separately from rules and follows permission updates', async () => {
  const { connect } = await import('../sdk/client');
  const sent: unknown[] = [];
  const parent = { postMessage: (message: unknown) => sent.push(message) };
  let receive!: (event: { source: unknown; data: unknown }) => void;
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  Object.assign(globalThis, {
    window: {
      parent,
      addEventListener: (_: string, handler: typeof receive) => {
        receive = handler;
      },
    },
    document: { documentElement: { style: { setProperty() {} }, classList: { toggle() {} } } },
  });
  try {
    const client = connect(() => {});
    const snapshot = {
      mode: 'shared',
      status: 'playing',
      version: 1,
      you: null,
      players: [],
      view: null,
    };
    receive({
      source: parent,
      data: { gaute: PROTOCOL, type: 'init', locale: 'en', theme, snapshot, controls: ['back'] },
    });
    const count = sent.length;
    expect((await client.host('end')).ok).toBe(false);
    expect(sent.length).toBe(count);
    const pending = client.host('back');
    const message = sent.at(-1) as { id: number };
    expect(message).toMatchObject({ type: 'host-action', action: 'back' });
    receive({ source: {}, data: { gaute: PROTOCOL, type: 'result', id: message.id, ok: true } });
    receive({
      source: parent,
      data: { gaute: PROTOCOL, type: 'result', id: message.id, ok: true },
    });
    expect(await pending).toEqual({ ok: true });
    receive({ source: parent, data: { gaute: PROTOCOL, type: 'update', snapshot, controls: [] } });
    expect((await client.host('back')).ok).toBe(false);
  } finally {
    Object.assign(globalThis, { window: previousWindow, document: previousDocument });
  }
});
