// Game page side of the bridge. A game's client bundle calls `connect` once and
// renders whatever state arrives. The page has no network access: everything it
// knows comes from the Gaute app through these messages.
import type { ActionName, AnyGameRules, Json, PayloadOf, ViewOf } from './logic';
import {
  PROTOCOL,
  HOST_ACTIONS,
  type HostAction,
  parseHostMessage,
  themeVariables,
  type GameMessage,
  type GauteReaction,
  type Haptic,
  type Snapshot,
  type Theme,
} from './protocol';

export type { GauteReaction, Haptic, Player, Snapshot, Theme } from './protocol';
export type GameState<View = Json> = {
  snapshot: Snapshot<View>;
  locale: string;
  theme: Theme;
  controls: HostAction[];
};
export type ActResult = { ok: true } | { ok: false; reason: string };
/** The arguments after an action's name: its payload, or nothing for an action without one. */
export type PayloadArgs<Rules, Name extends ActionName<Rules>> = [PayloadOf<Rules, Name>] extends [
  null,
]
  ? []
  : [payload: PayloadOf<Rules, Name>];

type NativeBridge = { postMessage(data: string): void };
const nativeBridge = () => (globalThis as { ReactNativeWebView?: NativeBridge }).ReactNativeWebView;

function send(message: GameMessage) {
  const native = nativeBridge();
  if (native) native.postMessage(JSON.stringify(message));
  else window.parent.postMessage(message, '*');
}

/**
 * Starts listening to the app. `onState` runs for the first state and every
 * change. Pass the rules' type for typed views and actions:
 * `connect<typeof game>(…)` with `import type { game } from './logic'`.
 */
export function connect<Rules extends AnyGameRules = AnyGameRules>(
  onState: (state: GameState<ViewOf<Rules>>) => void,
) {
  let state: GameState<ViewOf<Rules>> | undefined;
  let next = 1;
  const pending = new Map<number, (result: ActResult) => void>();
  window.addEventListener('message', (event) => {
    // On the web only the embedding app may talk to the game.
    if (!nativeBridge() && event.source !== window.parent) return;
    const message = parseHostMessage(event.data);
    if (!message) return;
    if (message.type === 'result') {
      pending.get(message.id)?.(
        message.ok ? { ok: true } : { ok: false, reason: message.reason ?? '' },
      );
      pending.delete(message.id);
      return;
    }
    // The view is what this game's rules returned; the app passes it through as is.
    if (message.type === 'init')
      state = {
        snapshot: message.snapshot as Snapshot<ViewOf<Rules>>,
        locale: message.locale,
        theme: message.theme,
        controls: (message.controls ?? []).filter((action) => HOST_ACTIONS.includes(action)),
      };
    else if (!state) return;
    else if (message.type === 'update')
      state = {
        ...state,
        snapshot: message.snapshot as Snapshot<ViewOf<Rules>>,
        controls: message.controls ?? state.controls,
      };
    else state = { ...state, theme: message.theme };
    applyTheme(state.theme);
    onState(state);
    // The app keeps the page hidden until it has drawn once, so it never flashes.
    if (message.type === 'init') send({ gaute: PROTOCOL, type: 'shown' });
  });
  send({ gaute: PROTOCOL, type: 'ready' });
  return {
    /** Runs a host control advertised by the app, without invoking game rules. */
    host(action: HostAction): Promise<ActResult> {
      if (!state?.controls.includes(action))
        return Promise.resolve({ ok: false, reason: 'Unavailable' });
      const id = next++;
      return new Promise((resolve) => {
        pending.set(id, resolve);
        send({ gaute: PROTOCOL, type: 'host-action', id, action });
      });
    },
    /** Sends an action to the game's rules. Resolves when it is applied or rejected. */
    act<Name extends ActionName<Rules>>(
      action: Name,
      ...[payload]: PayloadArgs<Rules, Name>
    ): Promise<ActResult> {
      const id = next++;
      return new Promise((resolve) => {
        pending.set(id, resolve);
        send({ gaute: PROTOCOL, type: 'act', id, action, payload: (payload ?? null) as Json });
      });
    },
    /** Asks the app for haptic feedback (phones only; ignored on the web). */
    haptic(style: Haptic = 'selection') {
      send({ gaute: PROTOCOL, type: 'haptic', style });
    },
    /**
     * Lets Gaute, the companion below the game, react to a moment: `celebrate` a
     * win, `wave` at the next player, `oops` at a miss. The app may skip it.
     */
    gaute(reaction: GauteReaction) {
      send({ gaute: PROTOCOL, type: 'companion', reaction });
    },
  };
}

/**
 * Sets the app's tokens as inline CSS variables on <html> and toggles `.dark`.
 * Inline values win over a stylesheet's `:root`, so stock shadcn/ui and Tailwind
 * themes follow the app's colours, radius and light or dark mode. `connect` calls
 * this for every theme change.
 */
export function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.style.colorScheme = theme.dark ? 'dark' : 'light';
  root.classList.toggle('dark', theme.dark);
  for (const [name, value] of Object.entries(themeVariables(theme)))
    root.style.setProperty(name, value);
}
