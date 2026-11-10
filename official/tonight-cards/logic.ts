import { CARDS, type Card } from './content';
import {
  defineGame,
  endGame,
  fields,
  invalid,
  type Json,
  type Mode,
  type PlayerHandle,
} from '@gaute/games-sdk/logic';

// A shared deck of prompts, duels, votes and rules that last a few cards.
// Placeholders ({p1}, {p2}) name players; the app fills in display names. On a
// shared phone, vote cards are answered by pointing rather than voting in the app.

type Refs = Record<string, PlayerHandle>;
type Shown = {
  card: number;
  refs: Refs;
  ending: boolean;
  votes: Record<PlayerHandle, PlayerHandle>;
  revealed: boolean;
};
type State = {
  mode: Mode;
  locale: 'en' | 'nb';
  players: PlayerHandle[];
  order: number[];
  at: number;
  drawn: number;
  shown: Shown;
  rules: { card: number; refs: Refs; endsAfter: number }[];
  finished: boolean;
};

const text = (state: State, card: Card, ending: boolean) =>
  ending
    ? ((state.locale === 'nb' ? card.endNb : card.endEn) ?? '')
    : state.locale === 'nb'
      ? card.nb
      : card.en;

function pickRefs(card: Card, players: PlayerHandle[], random: () => number): Refs {
  const pool = [...players],
    refs: Refs = {};
  for (const key of ['p1', 'p2'])
    if ((card.en.includes(`{${key}}`) || card.endEn?.includes(`{${key}}`)) && pool.length) {
      const [handle] = pool.splice(Math.floor(random() * pool.length), 1);
      refs[key] = handle;
    }
  return refs;
}

function show(state: State, card: number, refs: Refs, ending: boolean) {
  state.shown = { card, refs, ending, votes: {}, revealed: false };
}

function draw(state: State, random: () => number) {
  state.drawn += 1;
  const due = state.rules.findIndex((rule) => rule.endsAfter <= state.drawn);
  if (due >= 0) {
    const [rule] = state.rules.splice(due, 1);
    show(state, rule.card, rule.refs, true);
    return;
  }
  if (state.at + 1 >= state.order.length) {
    state.finished = true;
    endGame({ cards: state.at + 1 });
    return;
  }
  state.at += 1;
  const card = state.order[state.at];
  const refs = pickRefs(CARDS[card], state.players, random);
  show(state, card, refs, false);
  if (CARDS[card].kind === 'rule')
    state.rules.push({ card, refs, endsAfter: state.drawn + 4 + Math.floor(random() * 5) });
}

const isVote = (state: State) =>
  state.mode === 'phones' && CARDS[state.shown.card].kind === 'vote' && !state.shown.ending;

/** Payload of `vote`: the chosen player. */
const choice = (payload: Json): { target: PlayerHandle } => {
  const { target } = fields(payload);
  if (typeof target !== 'string') invalid('Choose a player in this game.');
  return { target };
};

export const game = defineGame({
  setup: ({ players, locale, mode, random }) => {
    const order = CARDS.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const state: State = {
      mode,
      locale: locale === 'nb' ? 'nb' : 'en',
      players: [...players],
      order,
      at: -1,
      drawn: 0,
      shown: { card: 0, refs: {}, ending: false, votes: {}, revealed: false },
      rules: [],
      finished: false,
    };
    draw(state, random);
    return state;
  },
  actions: (action) => ({
    // A vote with answers is revealed first; the next tap moves on.
    next: action((state, { random }) => {
      if (state.finished) invalid('The deck is finished.');
      if (isVote(state) && !state.shown.revealed && Object.keys(state.shown.votes).length) {
        state.shown.revealed = true;
        return;
      }
      draw(state, random);
    }),
    vote: action({
      payload: choice,
      run: (state, { playerId, payload }) => {
        if (!isVote(state) || state.shown.revealed || !playerId) invalid('There is no open vote.');
        if (!state.players.includes(payload.target)) invalid('Choose a player in this game.');
        state.shown.votes[playerId] = payload.target;
        if (state.players.every((handle) => state.shown.votes[handle])) state.shown.revealed = true;
      },
    }),
  }),
  playerLeft: (state, { playerId }) => {
    state.players = state.players.filter((handle) => handle !== playerId);
    state.rules = state.rules.filter((rule) => !Object.values(rule.refs).includes(playerId));
    delete state.shown.votes[playerId];
    for (const [voter, target] of Object.entries(state.shown.votes))
      if (target === playerId) delete state.shown.votes[voter];
    if (isVote(state) && state.players.every((handle) => state.shown.votes[handle]))
      state.shown.revealed = true;
  },
  view: (state, playerId) => {
    const card = CARDS[state.shown.card];
    const tally: Record<PlayerHandle, number> = {};
    for (const target of Object.values(state.shown.votes)) tally[target] = (tally[target] ?? 0) + 1;
    return {
      drawn: state.drawn,
      remaining: state.order.length - state.at - 1,
      finished: state.finished,
      card: {
        kind: card.kind,
        ending: state.shown.ending,
        text: text(state, card, state.shown.ending),
        refs: state.shown.refs,
      },
      vote: isVote(state)
        ? {
            voted: Object.keys(state.shown.votes).length,
            yourVote: playerId === null ? null : (state.shown.votes[playerId] ?? null),
            tally: state.shown.revealed ? tally : null,
          }
        : null,
      rules: state.rules.map((rule) => ({
        text: text(state, CARDS[rule.card], false),
        refs: rule.refs,
      })),
    };
  },
});
