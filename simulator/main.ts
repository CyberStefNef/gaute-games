// The local simulator: runs a game exactly as Gaute does. Rules run in a hidden
// sandboxed page with the shared runtime; each player's screen is its own
// sandboxed page built by the SDK, talking the same protocol as the app.
import { gameDocument, gameRulesDocument } from '@gaute/games-sdk/document';
import type { Json, Mode } from '@gaute/games-sdk/logic';
import {
  PROTOCOL,
  parseGameMessage,
  type HostMessage,
  type Snapshot,
} from '@gaute/games-sdk/protocol';
import { SHARED_VIEW, type RuntimeOutcome, type RuntimeRequest } from '@gaute/games-sdk/runtime';
import { THEMES } from './theme';

type CatalogueGame = {
  slug: string;
  name: string;
  modes: Mode[];
  players: { min: number; max: number };
  logic: string;
  client: { script: string; style: string };
};
type Played = {
  game: CatalogueGame;
  mode: Mode;
  players: { handle: string; name: string }[];
  seed: number;
  version: number;
  state: string;
  views: Record<string, string>;
  turn: string | null;
  holder: string | null;
  ended: string | null;
};
type Phone = { frame: HTMLIFrameElement; viewer: () => string | null; ready: boolean };

const NAMES = [
  'Ana',
  'Bo',
  'Cy',
  'Dan',
  'Eli',
  'Fia',
  'Gus',
  'Hel',
  'Ida',
  'Jon',
  'Kai',
  'Liv',
  'Mo',
  'Nor',
  'Ola',
  'Pia',
];
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const ui = {
  game: $<HTMLSelectElement>('game'),
  mode: $<HTMLSelectElement>('mode'),
  players: $<HTMLInputElement>('players'),
  locale: $<HTMLSelectElement>('locale'),
  dark: $<HTMLInputElement>('dark'),
  restart: $<HTMLButtonElement>('restart'),
  status: $<HTMLParagraphElement>('status'),
  phones: $<HTMLElement>('phones'),
  log: $<HTMLOListElement>('log'),
};

let catalogue: CatalogueGame[] = [];
let played: Played | undefined;
let phones: Phone[] = [];
let rules: { frame: HTMLIFrameElement; ready: Promise<void> } | undefined;
const pending = new Map<number, (value: RuntimeOutcome | Error) => void>();
let nextRun = 1;

const theme = () => THEMES[ui.dark.checked ? 'dark' : 'light'];
const log = (text: string, rejected = false) => {
  const item = document.createElement('li');
  item.textContent = text;
  if (rejected) item.className = 'rejected';
  ui.log.prepend(item);
};

function run(request: RuntimeRequest): Promise<RuntimeOutcome> {
  return rules!.ready.then(
    () =>
      new Promise((resolve, reject) => {
        const id = nextRun++;
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error('The rules did not answer within 3 seconds'));
        }, 3000);
        pending.set(id, (value) => {
          clearTimeout(timer);
          if (value instanceof Error) reject(value);
          else resolve(value);
        });
        rules!.frame.contentWindow!.postMessage(
          { gaute: 1, type: 'run', id, request: JSON.stringify(request) },
          '*',
        );
      }),
  );
}

function snapshot(viewer: string | null): Snapshot {
  const game = played!;
  const view = game.views[viewer ?? SHARED_VIEW];
  return {
    mode: game.mode,
    status: game.ended === null ? 'playing' : 'ended',
    version: game.version,
    you: viewer,
    players: game.players.map(({ handle, name }) => ({
      handle,
      name,
      host: handle === 'p1',
      left: false,
      you: handle === viewer,
    })),
    view: view === undefined ? null : (JSON.parse(view) as Json),
    result: game.ended === null ? null : (JSON.parse(game.ended) as Json),
    endedReason: game.ended === null ? null : 'finished',
  };
}

const send = (phone: Phone, message: HostMessage) =>
  phone.frame.contentWindow?.postMessage(message, '*');

function apply(game: Played, outcome: RuntimeOutcome) {
  if (!outcome.ok || 'unsupported' in outcome) return;
  game.version += 1;
  game.state = outcome.state;
  game.views = outcome.views;
  const turn = outcome.turn ?? null;
  if (turn !== game.turn) game.holder = null;
  game.turn = turn;
  if (outcome.ended !== undefined) {
    game.ended = outcome.ended;
    log('Game ended: ' + outcome.ended);
  }
}

function render() {
  const game = played!;
  ui.phones.replaceChildren();
  phones = [];
  const lang = ui.locale.value;
  const make = (title: string, viewer: () => string | null) => {
    const box = document.createElement('div');
    box.className = 'phone';
    const heading = document.createElement('h3');
    heading.textContent = title;
    const frame = document.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.title = title;
    frame.srcdoc = gameDocument(game.game.client, lang, theme());
    box.append(heading, frame);
    ui.phones.append(box);
    const phone: Phone = { frame, viewer, ready: false };
    phones.push(phone);
    return { box, phone };
  };
  if (game.mode === 'phones')
    for (const player of game.players) make(player.name, () => player.handle);
  else {
    const { box } = make(game.mode === 'pass' ? 'Passed phone' : 'Shared phone', () =>
      game.mode === 'pass' && game.turn && game.holder === game.turn ? game.turn : null,
    );
    if (game.mode === 'pass') {
      const gate = document.createElement('div');
      gate.className = 'gate';
      box.append(gate);
      const update = () => {
        const waiting = game.turn !== null && game.holder !== game.turn;
        gate.hidden = !waiting;
        if (!waiting) return;
        const name = game.players.find((p) => p.handle === game.turn)?.name ?? '';
        const button = document.createElement('button');
        button.textContent = `I am ${name}`;
        button.onclick = () => {
          game.holder = game.turn;
          refresh();
        };
        const text = document.createElement('p');
        text.textContent = `Pass the phone to ${name}`;
        gate.replaceChildren(text, button);
      };
      gateUpdate = update;
      update();
    }
  }
}
let gateUpdate: (() => void) | undefined;

function refresh() {
  gateUpdate?.();
  for (const phone of phones)
    if (phone.ready)
      send(phone, { gaute: PROTOCOL, type: 'update', snapshot: snapshot(phone.viewer()) });
}

// Actions run one at a time, like on a phone: each sees the state the previous one
// left, and a reply for a game restarted meanwhile is dropped.
let actions: Promise<void> = Promise.resolve();
function act(phone: Phone, id: number, action: string, payload: Json) {
  actions = actions.then(() => perform(phone, id, action, payload));
}

async function perform(phone: Phone, id: number, action: string, payload: Json) {
  const game = played!;
  const actor = game.mode === 'phones' ? phone.viewer() : game.mode === 'pass' ? game.turn : null;
  if (game.ended !== null) {
    send(phone, { gaute: PROTOCOL, type: 'result', id, ok: false, reason: 'The game has ended.' });
    return;
  }
  try {
    const outcome = await run({
      op: 'action',
      mode: game.mode,
      state: game.state,
      players: game.players.map((p) => p.handle),
      playerId: actor,
      action,
      payload,
      seed: (game.seed + game.version * 7919) | 0,
    });
    if (played !== game) {
      send(phone, {
        gaute: PROTOCOL,
        type: 'result',
        id,
        ok: false,
        reason: 'The game restarted.',
      });
      return;
    }
    const who = game.players.find((p) => p.handle === actor)?.name ?? 'Group';
    if (!outcome.ok) log(`${who}: ${action} ${JSON.stringify(payload)} → ${outcome.reason}`, true);
    else log(`${who}: ${action} ${JSON.stringify(payload)}`);
    apply(game, outcome);
    send(phone, {
      gaute: PROTOCOL,
      type: 'result',
      id,
      ok: outcome.ok,
      ...(outcome.ok ? {} : { reason: outcome.reason }),
    });
    refresh();
  } catch (error) {
    ui.status.textContent = 'The game stopped working: ' + (error as Error).message;
    send(phone, {
      gaute: PROTOCOL,
      type: 'result',
      id,
      ok: false,
      reason: 'The game stopped working.',
    });
  }
}

window.addEventListener('message', (event) => {
  if (rules && event.source === rules.frame.contentWindow) {
    const data = event.data as { type?: string; id?: number; outcome?: string; failed?: string };
    if (data?.type === 'ready') return (rules as { resolve?: () => void }).resolve?.();
    if (data?.type === 'ran' && typeof data.id === 'number') {
      const done = pending.get(data.id);
      pending.delete(data.id);
      done?.(
        data.outcome
          ? (JSON.parse(data.outcome) as RuntimeOutcome)
          : new Error(data.failed ?? 'failed'),
      );
    }
    return;
  }
  const phone = phones.find((p) => p.frame.contentWindow === event.source);
  const message = phone && parseGameMessage(event.data);
  if (!phone || !message) return;
  if (message.type === 'ready') {
    phone.ready = true;
    send(phone, {
      gaute: PROTOCOL,
      type: 'init',
      locale: ui.locale.value,
      theme: theme(),
      snapshot: snapshot(phone.viewer()),
    });
  } else if (message.type === 'shown') phone.frame.classList.add('shown');
  else if (message.type === 'haptic') log(`haptic: ${message.style}`);
  else if (message.type === 'companion') log(`Gaute reacts: ${message.reaction}`);
  else if (message.type === 'failed')
    log(`The page failed before drawing: ${message.reason}`, true);
  else act(phone, message.id, message.action, message.payload);
});

function startRules(logic: string) {
  rules?.frame.remove();
  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', 'allow-scripts');
  frame.hidden = true;
  frame.srcdoc = gameRulesDocument(logic);
  let resolve!: () => void;
  const ready = new Promise<void>((done) => (resolve = done));
  rules = Object.assign({ frame, ready }, { resolve });
  document.body.append(frame);
}

async function restart() {
  const game = catalogue.find((g) => g.slug === ui.game.value)!;
  const mode = ui.mode.value as Mode;
  const count = Math.min(game.players.max, Math.max(game.players.min, Number(ui.players.value)));
  ui.players.value = String(count);
  ui.status.textContent = '';
  ui.log.replaceChildren();
  startRules(game.logic);
  const players = NAMES.slice(0, count).map((name, i) => ({ handle: `p${i + 1}`, name }));
  const seed = Math.floor(Math.random() * 2 ** 31);
  try {
    const outcome = await run({
      op: 'setup',
      mode,
      players: players.map((p) => p.handle),
      locale: ui.locale.value,
      seed,
    });
    if (!outcome.ok || 'unsupported' in outcome) throw new Error('setup was rejected');
    played = {
      game,
      mode,
      players,
      seed,
      version: 1,
      state: outcome.state,
      views: outcome.views,
      turn: outcome.turn ?? null,
      holder: null,
      ended: outcome.ended ?? null,
    };
    log(`Started ${game.name} (${mode}, ${count} players, seed ${seed})`);
    render();
  } catch (error) {
    ui.status.textContent = 'Setup failed: ' + (error as Error).message;
  }
}

function fillModes() {
  const game = catalogue.find((g) => g.slug === ui.game.value)!;
  ui.mode.replaceChildren(...game.modes.map((mode) => new Option(mode, mode)));
  ui.players.min = String(game.players.min);
  ui.players.max = String(game.players.max);
}

async function main() {
  const response = await fetch('catalogue.json', { cache: 'no-store' });
  const data = (await response.json()) as { games?: CatalogueGame[]; error?: string };
  if (!data.games) {
    ui.status.textContent = data.error ?? 'Could not build the games.';
    return;
  }
  catalogue = data.games;
  ui.game.replaceChildren(...catalogue.map((g) => new Option(g.name, g.slug)));
  const remembered = new URLSearchParams(location.search).get('game');
  if (remembered && catalogue.some((g) => g.slug === remembered)) ui.game.value = remembered;
  fillModes();
  ui.game.onchange = () => {
    history.replaceState(null, '', '?game=' + ui.game.value);
    fillModes();
    void restart();
  };
  for (const control of [ui.mode, ui.players, ui.locale]) control.onchange = () => void restart();
  ui.dark.onchange = () => {
    document.body.style.background = ui.dark.checked ? '#0b080e' : '';
    for (const phone of phones)
      if (phone.ready) send(phone, { gaute: PROTOCOL, type: 'theme', theme: theme() });
  };
  ui.restart.onclick = () => void restart();
  await restart();
}

void main();
