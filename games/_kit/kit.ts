// A tiny DOM kit shared by the official game clients. Creators may use any
// framework; official games stay dependency-free so their bundles stay small.
import { connect, type ActResult, type GameState, type Snapshot } from '@gaute/games-sdk/client';
import type { Json } from '@gaute/games-sdk/logic';

type Child = Node | string | number | null | undefined | false | Child[];
type Props = Record<string, string | boolean | ((event: Event) => void) | undefined>;

export function h(tag: string, props: Props | null, ...children: Child[]): HTMLElement {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(props ?? {})) {
    if (value === undefined || value === false) continue;
    if (typeof value === 'function') element.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value === true) element.setAttribute(key, '');
    else element.setAttribute(key, value);
  }
  const append = (child: Child) => {
    if (child === null || child === undefined || child === false) return;
    if (Array.isArray(child)) child.forEach(append);
    else element.append(typeof child === 'object' ? child : String(child));
  };
  children.forEach(append);
  return element;
}

export type Strings = Record<string, string>;
export type Ui = {
  state: GameState;
  t: (key: string, values?: Record<string, string | number>) => string;
  name: (handle: string) => string;
  /** Sends an action; buttons are disabled until it settles and errors show inline. */
  act: (action: string, payload?: Json) => void;
  busy: boolean;
};

/** Connects to the app and re-renders the whole page on every change. String keys are English. */
export function mount(strings: { en: Strings; nb: Strings }, render: (ui: Ui) => Child) {
  const root = document.getElementById('app')!;
  let state: GameState | undefined;
  let busy = false;
  let notice = '';
  const t = (key: string, values: Record<string, string | number> = {}) => {
    const table = state?.locale === 'nb' ? strings.nb : strings.en;
    return (table[key] ?? strings.en[key] ?? key).replace(/\{(\w+)\}/g, (_, name: string) =>
      String(values[name] ?? ''),
    );
  };
  const name = (handle: string) => {
    const players = state?.snapshot.players ?? [];
    const player = players.find((p) => p.handle === handle);
    return player?.name ?? t('Player {n}', { n: players.indexOf(player!) + 1 || handle.slice(1) });
  };
  const draw = () => {
    if (!state) return;
    const ui: Ui = {
      state,
      t,
      name,
      busy,
      act: (action, payload = null) => {
        if (busy) return;
        busy = true;
        notice = '';
        session.haptic('selection');
        draw();
        void session.act(action, payload).then((result: ActResult) => {
          busy = false;
          // Rejection reasons are the game's own English strings; translate known ones.
          if (!result.ok) {
            notice = t(result.reason);
            session.haptic('error');
          }
          draw();
        });
      },
    };
    root.replaceChildren(
      h(
        'main',
        null,
        render(ui),
        notice ? h('p', { class: 'notice', role: 'alert' }, notice) : null,
      ),
    );
  };
  const session = connect((next) => {
    state = next;
    draw();
  });
}

export const playing = (snapshot: Snapshot) => snapshot.status === 'playing';
