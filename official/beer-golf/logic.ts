import {
  CHALLENGES,
  HOLE_COUNTS,
  MAX_OVER_PAR,
  PARS,
  RULES,
  STOPS,
  STOP_LENGTH,
  STYLES,
  TWISTS,
  type Style,
} from './content';
import {
  defineGame,
  endGame,
  fields,
  invalid,
  type Json,
  type Mode,
  type PlayerHandle,
} from '@gaute/games-sdk/logic';
import { awards, count, langOf, shuffled, type Lang } from '../_kit/rules';

// Beer golf: a round of 3, 6 or 9 holes. Everyone reports their strokes for the
// hole on their own phone (or the shared phone reports for them), then the hole
// is revealed. The lowest total against par wins. The first player hosts and
// picks the rule style before the round starts.

type Hole = { par: number; text: string; textNb: string };
type State = {
  mode: Mode;
  lang: Lang;
  players: PlayerHandle[];
  playing: boolean;
  style: Style;
  holeCount: number;
  /** Custom stop names; empty means the default name. */
  stops: string[];
  holes: Hole[];
  at: number;
  /** Strokes for the current hole, 0 for a skipped hole. Hidden until revealed. */
  pending: Record<PlayerHandle, number>;
  revealed: boolean;
  /** Revealed strokes per player, null for a skipped hole (counts as par). */
  card: Record<PlayerHandle, (number | null)[]>;
  birdies: Record<PlayerHandle, number>;
  pars: Record<PlayerHandle, number>;
  aces: Record<PlayerHandle, number>;
};

const choice = (count: number) => (payload: Json) => {
  const { value } = fields(payload);
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value >= count)
    invalid('Choose one of the options.');
  return { value };
};

const strokes = (payload: Json): { value: number; target: PlayerHandle | null } => {
  const { value, target } = fields(payload);
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 9)
    invalid('Choose a number of strokes.');
  if (target !== undefined && target !== null && typeof target !== 'string')
    invalid('Choose a player.');
  return { value, target: typeof target === 'string' ? target : null };
};

const stop = (payload: Json): { hole: number; text: string } => {
  const { hole, text } = fields(payload);
  if (typeof hole !== 'number' || !Number.isInteger(hole) || hole < 0 || hole >= 9)
    invalid('Choose a hole.');
  if (typeof text !== 'string') invalid('Write a name for the stop.');
  return { hole, text: text.trim().slice(0, STOP_LENGTH) };
};

const host = (state: State) => state.players[0] ?? null;

function needHost(state: State, playerId: PlayerHandle | null) {
  if (state.playing) invalid('The round has started.');
  if (state.mode === 'phones' && playerId !== host(state)) invalid('Only the host can set up.');
}

/** The player a stroke report is for: you on your phone, the chosen one on a shared screen. */
function subject(state: State, playerId: PlayerHandle | null, target: PlayerHandle | null) {
  const player = state.mode === 'phones' ? playerId : target;
  if (!player || !state.players.includes(player)) invalid('Choose a player.');
  return player;
}

function reveal(state: State) {
  const par = state.holes[state.at].par;
  state.revealed = true;
  for (const player of state.players) {
    const value = state.pending[player];
    const played = value !== undefined && value > 0;
    (state.card[player] ??= [])[state.at] = played ? value : null;
    if (!played) continue;
    if (value === 1) count(state.aces, player);
    if (value < par) count(state.birdies, player);
    if (value === par) count(state.pars, player);
  }
}

const toPar = (state: State, player: PlayerHandle) =>
  (state.card[player] ?? []).reduce<number>(
    (sum, value, hole) => sum + (value === null ? 0 : value - state.holes[hole].par),
    0,
  );

export const game = defineGame({
  setup: ({ players, locale, mode }): State => ({
    mode,
    lang: langOf(locale),
    players: [...players],
    playing: false,
    style: 'any',
    holeCount: 9,
    stops: Array.from({ length: 9 }, () => ''),
    holes: [],
    at: 0,
    pending: {},
    revealed: false,
    card: Object.fromEntries(players.map((player) => [player, []])),
    birdies: {},
    pars: {},
    aces: {},
  }),
  actions: (action) => ({
    setStyle: action({
      payload: choice(STYLES.length),
      run: (state, { playerId, payload }) => {
        needHost(state, playerId);
        state.style = STYLES[payload.value];
      },
    }),
    setHoles: action({
      payload: choice(HOLE_COUNTS.length),
      run: (state, { playerId, payload }) => {
        needHost(state, playerId);
        state.holeCount = HOLE_COUNTS[payload.value];
      },
    }),
    rename: action({
      payload: stop,
      run: (state, { playerId, payload }) => {
        needHost(state, playerId);
        state.stops[payload.hole] = payload.text;
      },
    }),
    start: action((state, { playerId, random }) => {
      needHost(state, playerId);
      const twists = shuffled(TWISTS.length, random);
      const pool = shuffled(state.style === 'challenge' ? CHALLENGES.length : PARS.length, random);
      state.holes = Array.from({ length: state.holeCount }, (_, hole) => {
        if (state.style === 'challenge') {
          const challenge = CHALLENGES[pool[hole % pool.length]];
          return { par: challenge.par, text: challenge.text.en, textNb: challenge.text.nb };
        }
        const par = PARS[pool[hole % pool.length]];
        const twist = TWISTS[twists[hole % twists.length]];
        const rule = RULES[state.style as Exclude<Style, 'challenge'>];
        return {
          par,
          text: `${rule.en.replace('{par}', String(par))} ${twist.en}`,
          textNb: `${rule.nb.replace('{par}', String(par))} ${twist.nb}`,
        };
      });
      state.playing = true;
    }),
    submit: action({
      payload: strokes,
      run: (state, { playerId, payload }) => {
        if (!state.playing) invalid('The round has not started.');
        if (state.revealed) invalid('Wait for the next hole.');
        const player = subject(state, playerId, payload.target);
        if (payload.value > state.holes[state.at].par + MAX_OVER_PAR)
          invalid('Choose a number of strokes.');
        state.pending[player] = payload.value;
        if (state.players.every((p) => state.pending[p] !== undefined)) reveal(state);
      },
    }),
    reveal: action((state) => {
      if (!state.playing) invalid('The round has not started.');
      if (state.revealed) invalid('Wait for the next hole.');
      if (!Object.keys(state.pending).length) invalid('Nobody has reported yet.');
      reveal(state);
    }),
    next: action((state) => {
      if (!state.revealed) invalid('Finish the hole first.');
      if (state.at + 1 >= state.holes.length) {
        endGame({
          toPar: Object.fromEntries(state.players.map((p) => [p, toPar(state, p)])),
        });
        return;
      }
      state.at += 1;
      state.pending = {};
      state.revealed = false;
    }),
  }),
  playerLeft: (state, { playerId }) => {
    state.players = state.players.filter((p) => p !== playerId);
    delete state.pending[playerId];
    if (
      state.playing &&
      !state.revealed &&
      state.players.length &&
      state.players.every((p) => state.pending[p] !== undefined)
    )
      reveal(state);
  },
  view: (state, playerId) => {
    const hole = state.playing ? state.holes[state.at] : null;
    const totals = Object.fromEntries(state.players.map((p) => [p, toPar(state, p)]));
    const mine = playerId === null ? undefined : state.pending[playerId];
    return {
      mode: state.mode,
      started: state.playing,
      isHost: state.mode === 'shared' || playerId === host(state),
      style: state.style,
      holeCount: state.holeCount,
      stops: state.stops.map((custom, index) => custom || STOPS[index][state.lang]).slice(0, 9),
      customStops: state.stops,
      at: state.at,
      total: state.playing ? state.holes.length : state.holeCount,
      par: hole ? hole.par : 0,
      rule: hole ? (state.lang === 'nb' ? hole.textNb : hole.text) : '',
      pars: state.holes.map((h) => h.par),
      revealed: state.revealed,
      yourStrokes: mine === undefined ? null : mine,
      reported: state.players.filter((p) => state.pending[p] !== undefined),
      // Strokes stay hidden until the hole is revealed.
      card: Object.fromEntries(
        state.players.map((p) => [
          p,
          (state.card[p] ?? []).slice(0, state.at + (state.revealed ? 1 : 0)),
        ]),
      ) as Record<PlayerHandle, (number | null)[]>,
      toPar: totals,
      maxOver: MAX_OVER_PAR,
      awards: awards(
        [
          { title: 'sharpshooter', stat: state.birdies, least: 2 },
          { title: 'steady', stat: state.pars, least: 2 },
          { title: 'ace', stat: state.aces, least: 1 },
        ],
        state.players,
      ),
    };
  },
});
