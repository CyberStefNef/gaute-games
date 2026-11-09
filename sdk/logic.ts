// Gaute game logic SDK. Logic runs in a sandbox (on the server for own-phone play,
// on the device for pass-the-phone and shared-phone play); these functions forward
// to the bindings installed there. Logic must be synchronous and deterministic:
// no timers, network, clocks or module-level mutable state. Use `random` (or
// Math.random, which the sandbox seeds) for randomness.

/** A JSON value. State, payloads, views and results must be JSON. */
export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
/** Session-scoped player handle such as `p1`. Never an account or member ID. */
export type PlayerHandle = string;
/**
 * How a game is played. A manifest lists the modes the game supports.
 * - `phones`: everyone uses their own phone in a Gaute group.
 * - `pass`: one phone is passed around; `turn` says who holds it.
 * - `shared`: one phone for the whole group; everyone sees the shared view.
 */
export type Mode = 'phones' | 'pass' | 'shared';

export type SetupContext = {
  /** Players in join order. */
  players: PlayerHandle[];
  /** The language of the player who opened the game, such as `en` or `nb`. */
  locale: string;
  mode: Mode;
  random: () => number;
};
export type ActionContext<Payload> = {
  /** The acting player. Null on a shared phone, where the group acts together. */
  playerId: PlayerHandle | null;
  payload: Payload;
  /** Players still in the game. */
  players: PlayerHandle[];
  random: () => number;
};
export type LeaveContext = {
  playerId: PlayerHandle;
  players: PlayerHandle[];
  random: () => number;
};

export type GameDefinition<State, View> = {
  setup: (context: SetupContext) => State;
  /** Actions change `state` in place. Call `invalid()` to reject one without effect. */
  actions: Record<string, (state: State, context: ActionContext<any>) => void>;
  /**
   * What one player may see; anything left out stays secret. `null` asks for the
   * shared screen everyone may look at (pass-the-phone and shared-phone play).
   */
  view: (state: State, playerId: PlayerHandle | null) => View;
  /** Required for `pass`: who should hold the phone now, or null for the whole group. */
  turn?: (state: State) => PlayerHandle | null;
  /** Optional: keep playing when someone leaves. Without it, the game ends below its minimum. */
  playerLeft?: (state: State, context: LeaveContext) => void;
};

type Host = {
  defineGame(definition: GameDefinition<unknown, unknown>): void;
  invalid(reason: string): never;
  endGame(result: Json): void;
};
const host = () => (globalThis as unknown as { __gaute: Host }).__gaute;

export function defineGame<State, View>(definition: GameDefinition<State, View>) {
  host().defineGame(definition as GameDefinition<unknown, unknown>);
}
/** Reject the current action. The player sees `reason`. */
export function invalid(reason: string): never {
  return host().invalid(reason);
}
/** Finish the game after this action, for example with `{ winners: ['p2'] }`. */
export function endGame(result: Json) {
  host().endGame(result);
}
