// Gaute game rules SDK. Rules run in a sandbox (on the server for own-phone play,
// on the device for pass-the-phone and shared-phone play). They must be
// synchronous and deterministic: no timers, network, clocks or module-level
// mutable state. Use `random` (or Math.random, which the sandbox seeds).
//
// Everything is inferred from one definition, as in TanStack Router: the state
// from `setup`, each action's payload from its validator, and what a player sees
// from `view`. The page imports the definition's type, so its actions, payloads
// and view are checked by TypeScript (see `@gaute/games-sdk/react`).

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
  /** The payload, as the action's validator returned it; null without a validator. */
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

/**
 * A Standard Schema (https://standardschema.dev), such as a Zod, Valibot or
 * ArkType schema. It must validate synchronously.
 */
export type StandardSchema<Input = unknown, Output = Input> = {
  readonly '~standard': {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (
      value: unknown,
    ) =>
      | { readonly value: Output; readonly issues?: undefined }
      | { readonly issues: ReadonlyArray<{ readonly message: string }> }
      | Promise<unknown>;
    readonly types?: { readonly input: Input; readonly output: Output } | undefined;
  };
};

/**
 * Checks an action's payload, which comes from a player's page and is untrusted.
 * Either a function that returns the payload or calls `invalid()`, or a Standard
 * Schema. Its output is the action's payload type.
 */
export type PayloadValidator = ((payload: Json) => unknown) | StandardSchema<any, any>;

/** What a page sends for this validator: the schema's input, or the function's result. */
export type ValidatorInput<V> =
  V extends StandardSchema<infer Input, any>
    ? Input
    : V extends (payload: Json) => infer Output
      ? Output
      : never;
/** What the action receives from this validator. */
export type ValidatorOutput<V> =
  V extends StandardSchema<any, infer Output>
    ? Output
    : V extends (payload: Json) => infer Output
      ? Output
      : never;

declare const types: unique symbol;

/** One action of a game, made with the `action` builder `actions` receives. */
export type Action<State, Input, Payload> = {
  readonly payload?: PayloadValidator;
  readonly run: (state: State, context: ActionContext<Payload>) => void;
  /** Type-only: what a page sends. */
  readonly [types]?: { input: Input };
};
type AnyAction = Action<any, any, any>;

/** Makes the actions of one game, typed by its state. */
export type ActionBuilder<State> = {
  /** An action without a payload. */
  (run: (state: State, context: ActionContext<null>) => void): Action<State, null, null>;
  /** An action whose payload `payload` checks; `run` receives the checked value. */
  <Validator extends PayloadValidator>(definition: {
    payload: Validator;
    run: (state: State, context: ActionContext<ValidatorOutput<Validator>>) => void;
  }): Action<State, ValidatorInput<Validator>, ValidatorOutput<Validator>>;
};

export type GameDefinition<State, Actions extends Record<string, AnyAction>, View> = {
  setup: (context: SetupContext) => State;
  /**
   * The moves players can make. Actions change `state` in place; call `invalid()`
   * to reject one without effect.
   */
  actions: (action: ActionBuilder<State>) => Actions;
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

/** A defined game. Pages import its type: `import type { game } from './logic'`. */
export type GameRules<State, Actions extends Record<string, AnyAction>, View> = {
  readonly [types]?: { state: State; actions: Actions; view: View };
};
export type AnyGameRules = GameRules<any, any, any>;

/** What each player's page receives. */
export type ViewOf<Rules> = Rules extends GameRules<any, any, infer View> ? View : never;
/** The game's action names. */
export type ActionName<Rules> =
  Rules extends GameRules<any, infer Actions, any> ? keyof Actions & string : never;
/** What a page sends with `action`. */
export type PayloadOf<Rules, Name extends ActionName<Rules>> =
  Rules extends GameRules<any, infer Actions, any>
    ? Actions[Name] extends Action<any, infer Input, any>
      ? Input
      : never
    : never;

type Host = {
  defineGame(definition: unknown): void;
  invalid(reason: string): never;
  endGame(result: Json): void;
};
const host = () => (globalThis as unknown as { __gaute: Host }).__gaute;

const action = ((
  definition: AnyAction['run'] | { payload: PayloadValidator; run: AnyAction['run'] },
) =>
  typeof definition === 'function' ? { run: definition } : definition) as ActionBuilder<unknown>;

/** Defines the game. Export the result so the page can import its type. */
export function defineGame<State, Actions extends Record<string, AnyAction>, View>(
  definition: GameDefinition<State, Actions, View>,
): GameRules<State, Actions, View> {
  host().defineGame({
    ...definition,
    actions: definition.actions(action as ActionBuilder<State>),
  });
  return {};
}
/**
 * The fields of a payload object, for validators: `const { target } = fields(payload)`.
 * Anything that is not an object has no fields.
 */
export function fields(payload: Json): { readonly [key: string]: Json | undefined } {
  return payload !== null && typeof payload === 'object' && !Array.isArray(payload) ? payload : {};
}
/** Reject the current action. The player sees `reason`. */
export function invalid(reason: string): never {
  return host().invalid(reason);
}
/** Finish the game after this action, for example with `{ winners: ['p2'] }`. */
export function endGame(result: Json) {
  host().endGame(result);
}
