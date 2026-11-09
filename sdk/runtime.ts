// The rules runtime that hosts a game's logic bundle. The same source runs in the
// server's QuickJS sandbox (own-phone play) and in a hidden sandboxed page on the
// device (pass-the-phone and shared-phone play), so a game behaves identically.
import type { Mode } from './logic';

/** Key of the shared-screen view in `views`. */
export const SHARED_VIEW = '*';

export type RuntimeRequest =
  | { op: 'setup'; mode: Mode; players: string[]; locale: string; seed: number }
  | {
      op: 'action';
      mode: Mode;
      state: string;
      players: string[];
      /** Null on a shared phone, where nobody in particular acts. */
      playerId: string | null;
      action: string;
      payload: unknown;
      seed: number;
    }
  | { op: 'leave'; mode: Mode; state: string; players: string[]; playerId: string; seed: number };

export type RuntimeOutcome =
  | {
      ok: true;
      state: string;
      /** JSON views by player handle, plus SHARED_VIEW outside own-phone play. */
      views: Record<string, string>;
      /** Pass-the-phone: who should hold the phone next; null for the whole group. */
      turn?: string | null;
      /** JSON result when the game ended with this request. */
      ended?: string;
    }
  | { ok: true; unsupported: true }
  | { ok: false; reason: string };

/**
 * Evaluated before the logic bundle. Removes clocks, seeds randomness, collects
 * the definition and installs `__dispatch(requestJson) => outcomeJson`.
 */
export const RUNTIME_PRELUDE = `"use strict";
(() => {
  let game, ended, seed = 0;
  class Invalid extends Error {}
  const random = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  Math.random = random;
  globalThis.Date = undefined;
  globalThis.__gaute = {
    defineGame(definition) { if (game) throw new Error('defineGame called twice'); game = definition; },
    invalid(reason) { throw new Invalid(String(reason)); },
    endGame(result) { ended = { result: result === undefined ? null : result }; },
  };
  // Used by the checker (tools/sandbox.mjs) to exercise every action.
  globalThis.__describe = () =>
    JSON.stringify({ actions: game && game.actions ? Object.keys(game.actions) : [], turn: !!(game && typeof game.turn === 'function') });
  // Rules run synchronously: an async function would change state after the result.
  const sync = (value, what) => {
    if (value !== null && (typeof value === 'object' || typeof value === 'function') && typeof value.then === 'function')
      throw new Error(what + ' must not be async');
    return value;
  };
  // An action's payload comes from a player's page: its validator (a function or a
  // Standard Schema) runs first, and a rejection rejects the action.
  const check = (validator, value) => {
    if (typeof validator === 'function') return sync(validator(value), 'A payload validator');
    const standard = validator && validator['~standard'];
    if (!standard || typeof standard.validate !== 'function') throw new Error('payload must be a function or a Standard Schema');
    const result = sync(standard.validate(value), 'A payload schema');
    if (result.issues) throw new Invalid(String((result.issues[0] && result.issues[0].message) || 'Invalid action'));
    return result.value;
  };
  globalThis.__dispatch = (json) => {
    const r = JSON.parse(json);
    if (!game || typeof game.setup !== 'function' || typeof game.view !== 'function' || !game.actions)
      throw new Error('The game did not define setup, actions and view');
    seed = r.seed | 0;
    ended = undefined;
    try {
      let state;
      if (r.op === 'setup') state = sync(game.setup({ players: r.players, locale: r.locale, mode: r.mode, random }), 'setup');
      else {
        state = JSON.parse(r.state);
        if (r.op === 'leave') {
          if (typeof game.playerLeft !== 'function') return JSON.stringify({ ok: true, unsupported: true });
          sync(game.playerLeft(state, { playerId: r.playerId, players: r.players, random }), 'playerLeft');
        } else {
          const entry = Object.prototype.hasOwnProperty.call(game.actions, r.action) ? game.actions[r.action] : undefined;
          // defineGame makes { payload?, run } entries; a bare function receives the raw payload.
          const run = typeof entry === 'function' ? entry : entry && typeof entry.run === 'function' ? entry.run : undefined;
          if (!run) throw new Invalid('Unknown action');
          const payload = typeof entry === 'function' ? r.payload : entry.payload ? check(entry.payload, r.payload) : null;
          sync(run(state, { playerId: r.playerId, payload, players: r.players, random }), 'Action ' + r.action);
        }
      }
      const stateJson = JSON.stringify(state);
      if (stateJson === undefined) throw new Error('State must be JSON');
      const views = {};
      const show = (p) => JSON.stringify(sync(game.view(JSON.parse(stateJson), p), 'view')) ?? 'null';
      for (const p of r.players) views[p] = show(p);
      if (r.mode !== 'phones') views['${SHARED_VIEW}'] = show(null);
      let turn;
      if (r.mode === 'pass') {
        if (typeof game.turn !== 'function') throw new Error('Pass-the-phone games define turn');
        turn = sync(game.turn(JSON.parse(stateJson)), 'turn');
        if (turn !== null && !r.players.includes(turn)) throw new Error('turn returned an unknown player');
      }
      return JSON.stringify({ ok: true, state: stateJson, views, turn, ended: ended && JSON.stringify(ended.result) });
    } catch (error) {
      if (error instanceof Invalid) return JSON.stringify({ ok: false, reason: error.message });
      throw error;
    }
  };
})();
`;
