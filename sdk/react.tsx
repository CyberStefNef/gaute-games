// React binding for game pages. Optional: `@gaute/games-sdk/client` works with any
// framework or none. Like a TanStack Router route, the page binds hooks to its
// rules once, and everything after is typed by them:
//
//   import type { game } from './logic';
//   const { mountGame, useGame } = gameClient<typeof game>();
//   const { view, act } = useGame();   // view: what `view` returns
//   act('vote', { target: 'p2' });     // checked against the action's validator
import { useCallback, useSyncExternalStore, type ComponentType } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import {
  connect,
  type ActResult,
  type GameState,
  type GauteReaction,
  type Haptic,
  type PayloadArgs,
  type Player,
} from './client';
import type { ActionName, AnyGameRules, Json, Mode, PlayerHandle, ViewOf } from './logic';

type Store = {
  state: GameState<unknown>;
  /** True while an action is on its way; buttons should wait for it. */
  busy: boolean;
  /** The reason the last action was rejected, until the next action. */
  rejected: string | null;
};

let store: Store | undefined;
let session: ReturnType<typeof connect> | undefined;
const listeners = new Set<() => void>();
const update = (next: Partial<Store>) => {
  store = { ...store!, ...next };
  for (const listener of listeners) listener();
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export type Game<Rules extends AnyGameRules> = {
  /** This player's view, as the rules' `view` returned it (shared screen: `view(state, null)`). */
  view: ViewOf<Rules>;
  /** Who is looking: a player handle, or null on a shared screen. */
  you: PlayerHandle | null;
  /** Everyone in the game, including players who left (`left: true`). */
  players: Player[];
  mode: Mode;
  /** The game is running; false once it ended. */
  playing: boolean;
  /** The result passed to `endGame`, once the game ended. */
  result: Json;
  /** `en` or `nb`. */
  locale: string;
  /** Light or dark mode, as in the app. */
  dark: boolean;
  /** A player's name, or "Player 2" when this viewer may not see it. */
  name: (handle: PlayerHandle) => string;
  /**
   * Sends one of the rules' actions with its payload. Gives selection feedback,
   * sets `busy` until it settles, and on rejection sets `rejected` and gives error
   * feedback.
   */
  act: <Name extends ActionName<Rules>>(
    action: Name,
    ...payload: PayloadArgs<Rules, Name>
  ) => Promise<ActResult>;
  busy: boolean;
  rejected: string | null;
  /** Native haptic feedback on phones; ignored on the web. */
  haptic: (style?: Haptic) => void;
  /** Gaute, the app's companion below the game, reacts: `celebrate`, `wave` or `oops`. */
  gaute: (reaction: GauteReaction) => void;
};

function mountGame(Game: ComponentType) {
  if (session) throw Error('mountGame was called twice');
  const root = createRoot(document.getElementById('app')!);
  session = connect((state) => {
    if (store) return update({ state });
    store = { state, busy: false, rejected: null };
    // The first render completes before the app reveals the page, so it never flashes.
    flushSync(() => root.render(<Game />));
  });
}

async function act(action: string, payload?: unknown): Promise<ActResult> {
  update({ busy: true, rejected: null });
  session!.haptic('selection');
  const result = await (session!.act as (action: string, payload?: unknown) => Promise<ActResult>)(
    action,
    payload,
  );
  update({ busy: false, rejected: result.ok ? null : result.reason });
  if (!result.ok) session!.haptic('error');
  return result;
}

function useGame<Rules extends AnyGameRules>(): Game<Rules> {
  const current = useSyncExternalStore(subscribe, () => store);
  if (!current) throw Error('useGame must be used inside a component rendered by mountGame');
  const { state, busy, rejected } = current;
  const { snapshot } = state;
  const haptic = useCallback((style?: Haptic) => session!.haptic(style), []);
  const gaute = useCallback((reaction: GauteReaction) => session!.gaute(reaction), []);
  const name = (handle: PlayerHandle) => {
    const index = snapshot.players.findIndex((player) => player.handle === handle);
    return (
      snapshot.players[index]?.name ??
      `${state.locale === 'nb' ? 'Spiller' : 'Player'} ${index >= 0 ? index + 1 : handle.slice(1)}`
    );
  };
  return {
    view: snapshot.view as ViewOf<Rules>,
    you: snapshot.you,
    players: snapshot.players,
    mode: snapshot.mode,
    playing: snapshot.status === 'playing',
    result: snapshot.result,
    locale: state.locale,
    dark: state.theme.dark,
    name,
    act: act as Game<Rules>['act'],
    busy,
    rejected,
    haptic,
    gaute,
  };
}

/**
 * The page's bindings, typed by its rules: `gameClient<typeof game>()`.
 * - `mountGame(Game)` renders `Game` once the app sends the first state.
 * - `useGame()` returns the view, players and typed `act` inside it.
 */
export function gameClient<Rules extends AnyGameRules>() {
  return {
    mountGame,
    useGame: useGame<Rules>,
  };
}

/** The `{name}` placeholders in a string. */
type Placeholders<Text extends string> = Text extends `${string}{${infer Name}}${infer Rest}`
  ? Name | Placeholders<Rest>
  : never;
type Values<Text extends string> = [Placeholders<Text>] extends [never]
  ? []
  : [values: Record<Placeholders<Text>, string | number>];

export type Translate<En extends Record<string, string>> = {
  /** The text for `key` in the app's language, with its `{placeholders}` filled in. */
  <Key extends keyof En & string>(key: Key, ...values: Values<En[Key]>): string;
  /**
   * Text that arrives at runtime, such as the reason the rules gave for rejecting
   * an action: translated when it is one of the keys, otherwise shown as it is.
   */
  text: (text: string) => string;
};

/**
 * The game's own text in the app's language. Keys are the English text; `nb`
 * must translate every key. Keys and placeholders are checked:
 * `t('{n} cards left', { n: 3 })`.
 */
export function useStrings<const En extends Record<string, string>>(strings: {
  en: En;
  nb?: { [Key in keyof En]: string };
}): Translate<En> {
  const { locale } = useGame<AnyGameRules>();
  const table: Record<string, string> = locale === 'nb' && strings.nb ? strings.nb : strings.en;
  const fill = (text: string, values: Record<string, string | number> = {}) =>
    text.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''));
  const translate = (key: string, values?: Record<string, string | number>) =>
    fill(table[key] ?? strings.en[key] ?? key, values);
  const text = (value: string) =>
    Object.hasOwn(strings.en, value) ? fill(table[value] ?? value) : value;
  // The checked signature is Translate's; at runtime keys and values are plain strings.
  return Object.assign(translate, { text }) as unknown as Translate<En>;
}
