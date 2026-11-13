// React binding for game pages. Optional: `@gaute/games-sdk/client` works with any
// framework or none. Like a TanStack Router route, the page binds hooks to its
// rules once, and everything after is typed by them:
//
//   import type { game } from './logic';
//   const { mountGame, useGame } = gameClient<typeof game>();
//   const { view, act } = useGame();   // view: what `view` returns
//   act('vote', { target: 'p2' });     // checked against the action's validator
import { useCallback, useEffect, useRef, useSyncExternalStore, type ComponentType } from 'react';
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
import type { HostAction } from './protocol';
import type {
  ActionName,
  AnyGameRules,
  Json,
  Mode,
  PlayerHandle,
  PayloadOf,
  ViewOf,
} from './logic';

export type PendingAction<Rules extends AnyGameRules> = {
  [Name in ActionName<Rules>]: {
    action: Name;
    payload: PayloadOf<Rules, Name>;
    view: ViewOf<Rules>;
  };
}[ActionName<Rules>];

type Store = {
  state: GameState<unknown>;
  /** True while an action is on its way; buttons should wait for it. */
  busy: boolean;
  pending: { action: string; payload: unknown; view: unknown } | null;
  hostBusy: boolean;
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
  controls: HostAction[];
  host: (action: HostAction) => Promise<ActResult>;
  busy: boolean;
  pending: PendingAction<Rules> | null;
  hostBusy: boolean;
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
    store = { state, busy: false, pending: null, hostBusy: false, rejected: null };
    // The first render completes before the app reveals the page, so it never flashes.
    flushSync(() => root.render(<Game />));
  });
}

async function act(action: string, payload?: unknown): Promise<ActResult> {
  if (store!.busy)
    return {
      ok: false,
      reason:
        store!.state.locale === 'nb'
          ? 'Vent på forrige handling.'
          : 'Wait for the previous action.',
    };
  update({
    busy: true,
    pending: { action, payload: payload ?? null, view: store!.state.snapshot.view },
    rejected: null,
  });
  session!.haptic('selection');
  try {
    const result = await (
      session!.act as (action: string, payload?: unknown) => Promise<ActResult>
    )(action, payload);
    update({ rejected: result.ok ? null : result.reason });
    if (!result.ok) session!.haptic('error');
    return result;
  } finally {
    update({ busy: false, pending: null });
  }
}

/** Use the game's own navigation for Android Back, including pause menus. */
export function useGameBack(handler: () => void) {
  useEffect(() => session!.onBack(handler), [handler]);
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
    pending: current.pending as PendingAction<Rules> | null,
    hostBusy: current.hostBusy,
    rejected,
    haptic,
    gaute,
    controls: state.controls,
    host: async (action) => {
      if (store!.hostBusy) return { ok: false, reason: 'Connection needed' };
      update({ hostBusy: true, rejected: null });
      try {
        const result = await session!.host(action);
        update({ rejected: result.ok ? null : result.reason });
        return result;
      } finally {
        update({ hostBusy: false });
      }
    },
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

/** The game owns its pause menu; opening it never pauses other players. */
export function PauseMenu() {
  const { controls, host, locale, hostBusy, busy, rejected, mode } = useGame();
  const dialog = useRef<HTMLDialogElement>(null);
  const toggle = useCallback(() => {
    if (dialog.current?.open) dialog.current.close();
    else dialog.current?.showModal();
  }, []);
  useGameBack(toggle);
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !dialog.current?.open) {
        event.preventDefault();
        toggle();
      }
    };
    document.addEventListener('keydown', keydown);
    return () => document.removeEventListener('keydown', keydown);
  }, [toggle]);
  const nb = locale === 'nb';
  const labels = nb
    ? {
        back: 'Tilbake til spill',
        leave: 'Forlat spillet',
        end: 'Avslutt spillet',
        replay: 'Spill igjen',
        players: 'Endre spillere',
      }
    : {
        back: 'Back to games',
        leave: 'Leave game',
        end: 'End game',
        replay: 'Play again',
        players: 'Change players',
      };
  if (!controls.length) return null;
  return (
    <>
      {busy ? (
        <div
          role="status"
          className="pointer-events-none fixed bottom-3 left-3 z-50 rounded-xl bg-background/90 px-3 py-2 text-sm text-muted-foreground"
        >
          {nb ? 'Sender…' : 'Sending…'}
        </div>
      ) : null}
      <button
        type="button"
        aria-label={nb ? 'Pausemeny' : 'Pause menu'}
        onClick={() => dialog.current?.showModal()}
        className="fixed top-2 right-2 z-50 flex size-11 items-center justify-center rounded-xl border border-border bg-background/90 text-primary"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="currentColor">
          <path d="M6 4h4v16H6zm8 0h4v16h-4z" />
        </svg>
      </button>
      <dialog
        ref={dialog}
        aria-label={nb ? 'Pausemeny' : 'Pause menu'}
        className="fixed inset-0 m-auto w-[calc(100%-32px)] max-w-sm rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-xl backdrop:bg-black/60"
      >
        <div className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">{nb ? 'Pausemeny' : 'Pause menu'}</h2>
          {mode === 'phones' ? (
            <p className="text-sm text-muted-foreground">
              {nb
                ? 'Spillet fortsetter for de andre spillerne.'
                : 'The game continues for the other players.'}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            className="min-h-12 rounded-xl bg-primary px-4 font-semibold text-primary-foreground"
          >
            {nb ? 'Fortsett' : 'Resume'}
          </button>
          {controls.map((action) => (
            <button
              key={action}
              type="button"
              disabled={hostBusy}
              onClick={async () => {
                const result = await host(action);
                if (result.ok) dialog.current?.close();
              }}
              className="min-h-12 rounded-xl border border-border px-4 font-semibold disabled:opacity-50"
            >
              {labels[action]}
            </button>
          ))}
          {rejected ? (
            <p role="alert" className="text-sm text-destructive">
              {rejected}
            </p>
          ) : null}
        </div>
      </dialog>
    </>
  );
}
