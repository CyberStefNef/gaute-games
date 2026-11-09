// React binding for game pages. Optional: `@gaute/games-sdk/client` works with any
// framework or none. A React game calls `mountGame(Game)` once; components read
// the game with `useGame()` and translate with `useStrings()`.
import { useCallback, useSyncExternalStore, type ComponentType } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { connect, type ActResult, type GameState, type Haptic, type Player } from './client';
import type { Json, PlayerHandle } from './logic';

type Store = {
  state: GameState;
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

/**
 * Renders `Game` into the page once the app sends the first state. The first
 * render completes before the app reveals the page, so it never flashes.
 */
export function mountGame(Game: ComponentType) {
  if (session) throw Error('mountGame was called twice');
  const root = createRoot(document.getElementById('app')!);
  session = connect((state) => {
    if (store) return update({ state });
    store = { state, busy: false, rejected: null };
    flushSync(() => root.render(<Game />));
  });
}

export type Game<View> = {
  /** This player's view, exactly as the game's `view` returned it (shared screen: `view(state, null)`). */
  view: View;
  /** Who is looking: a player handle, or null on a shared screen. */
  you: PlayerHandle | null;
  /** Everyone in the game, including players who left (`left: true`). */
  players: Player[];
  /** `phones`, `pass` or `shared`. */
  mode: GameState['snapshot']['mode'];
  /** The game is running; false once it ended. */
  playing: boolean;
  /** The result passed to `endGame`, once the game ended. */
  result: Json;
  /** `en` or `nb`. */
  locale: string;
  /** Light or dark mode, as in the app. Colours are CSS variables (`--primary`, …). */
  dark: boolean;
  /** A player's name, or "Player 2" when this viewer may not see it. */
  name: (handle: PlayerHandle) => string;
  /**
   * Sends an action to the game's rules. Gives selection feedback, sets `busy`
   * until it settles, and on rejection sets `rejected` and gives error feedback.
   */
  act: (action: string, payload?: Json) => Promise<ActResult>;
  busy: boolean;
  rejected: string | null;
  /** Native haptic feedback on phones; ignored on the web. */
  haptic: (style?: Haptic) => void;
};

/** The game as this player sees it. Re-renders on every change. Use inside `mountGame`. */
export function useGame<View = Json>(): Game<View> {
  const current = useSyncExternalStore(subscribe, () => store);
  if (!current) throw Error('useGame must be used inside a component rendered by mountGame');
  const { state, busy, rejected } = current;
  const { snapshot } = state;
  const act = useCallback(async (action: string, payload: Json = null) => {
    update({ busy: true, rejected: null });
    session!.haptic('selection');
    const result = await session!.act(action, payload);
    update({ busy: false, rejected: result.ok ? null : result.reason });
    if (!result.ok) session!.haptic('error');
    return result;
  }, []);
  const haptic = useCallback((style?: Haptic) => session!.haptic(style), []);
  const name = (handle: PlayerHandle) => {
    const index = snapshot.players.findIndex((player) => player.handle === handle);
    return (
      snapshot.players[index]?.name ??
      `${state.locale === 'nb' ? 'Spiller' : 'Player'} ${index >= 0 ? index + 1 : handle.slice(1)}`
    );
  };
  return {
    view: snapshot.view as View,
    you: snapshot.you,
    players: snapshot.players,
    mode: snapshot.mode,
    playing: snapshot.status === 'playing',
    result: snapshot.result,
    locale: state.locale,
    dark: state.theme.dark,
    name,
    act,
    busy,
    rejected,
    haptic,
  };
}

export type Strings = Record<string, string>;

/**
 * Translates with the app's language: `t('{n} cards left', { n: 3 })`. Keys are
 * English; `nb` lists Norwegian. Unknown keys (such as a rejection reason the
 * rules return) are shown as they are.
 */
export function useStrings<Key extends string>(strings: {
  en: Record<Key, string>;
  nb?: Partial<Record<Key, string>>;
}) {
  const { locale } = useGame();
  return (key: Key | (string & {}), values: Record<string, string | number> = {}) => {
    const table: Partial<Record<string, string>> =
      locale === 'nb' && strings.nb ? strings.nb : strings.en;
    const text = table[key] ?? (strings.en as Record<string, string>)[key] ?? key;
    return text.replace(/\{(\w+)\}/g, (_, name: string) => String(values[name] ?? ''));
  };
}
