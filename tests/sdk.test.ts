// The SDK's contract with the Gaute app: message validation, the game page and
// the rules runtime.
import { expect, test } from 'vite-plus/test';
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
  const view = { text: 'x'.repeat(64 * 1024 - 20) };
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
