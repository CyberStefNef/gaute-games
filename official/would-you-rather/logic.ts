import { PACKS, PROMPTS } from './content';
import {
  contentHistory,
  restoreContent,
  contentOrder,
  shown,
  type ContentHistory,
} from '../_kit/content';
import {
  defineGame,
  endGame,
  fields,
  invalid,
  type Json,
  type Mode,
  type PlayerHandle,
} from '@gaute/games-sdk/logic';
import { awards, count, langOf, option, type Lang } from '../_kit/rules';

// Two options, one choice. On own phones everyone picks privately and also
// predicts what most will pick: a right prediction scores. Anyone alone on their
// side has to defend it. On one phone the group argues it out loud.
const PER_GAME = 12;

type State = {
  content: ContentHistory;
  mode: Mode;
  lang: Lang;
  players: PlayerHandle[];
  pack: number | null;
  order: number[];
  at: number;
  /** Own phones: each player's choice (0 or 1) and prediction of the majority. */
  votes: Record<PlayerHandle, number>;
  guesses: Record<PlayerHandle, number>;
  revealed: boolean;
  scores: Record<PlayerHandle, number>;
  rebel: Record<PlayerHandle, number>;
  crowd: Record<PlayerHandle, number>;
};

/** `{ value, guess }`: your choice and what you think most will choose. */
const pickAndPredict = (payload: Json): { value: number; guess: number } => {
  const { value, guess } = fields(payload);
  if ((value !== 0 && value !== 1) || (guess !== 0 && guess !== 1))
    invalid('Pick an option and a guess.');
  return { value, guess };
};

const everyoneVoted = (state: State) => state.players.every((p) => state.votes[p] !== undefined);

function reveal(state: State) {
  state.revealed = true;
  const voters = Object.keys(state.votes);
  const ones = voters.filter((p) => state.votes[p] === 1).length;
  const zeros = voters.length - ones;
  const majority = ones === zeros ? null : ones > zeros ? 1 : 0;
  for (const p of voters) {
    if (majority !== null && state.guesses[p] === majority) count(state.scores, p);
    if (majority !== null) count(state.votes[p] === majority ? state.crowd : state.rebel, p);
  }
}

export const game = defineGame({
  setup: ({ players, locale, mode }): State => ({
    content: contentHistory(),
    mode,
    lang: langOf(locale),
    players: [...players],
    pack: null,
    order: [],
    at: 0,
    votes: {},
    guesses: {},
    revealed: false,
    scores: Object.fromEntries(players.map((p) => [p, 0])),
    rebel: {},
    crowd: {},
  }),
  actions: (action) => ({
    restoreContent: action({
      payload: (payload: Json) => payload,
      run: (state, { payload, playerId }) => {
        if (playerId !== null || state.pack !== null) invalid('Content history is not available.');
        restoreContent(state.content, payload);
      },
    }),
    pick: action({
      payload: option(PACKS.length),
      run: (state, { payload, random }) => {
        if (state.pack !== null) invalid('The pack is chosen.');
        state.pack = payload.value;
        state.order = contentOrder(
          PROMPTS[payload.value].map((p) => p.id),
          state.content,
          random,
        ).slice(0, PER_GAME);
        state.content.restored = true;
        shown(state.content, PROMPTS[state.pack][state.order[0]].id);
      },
    }),
    vote: action({
      payload: pickAndPredict,
      run: (state, { playerId, payload }) => {
        if (state.pack === null) invalid('Choose a pack first.');
        if (state.mode !== 'phones' || !playerId || state.revealed)
          invalid('Wait for the next question.');
        state.votes[playerId] = payload.value;
        state.guesses[playerId] = payload.guess;
        if (everyoneVoted(state)) reveal(state);
      },
    }),
    next: action((state) => {
      if (state.pack === null) invalid('Choose a pack first.');
      if (state.mode === 'phones' && !state.revealed) {
        if (!Object.keys(state.votes).length) invalid('Nobody has chosen yet.');
        reveal(state);
        return;
      }
      if (state.at + 1 >= state.order.length) {
        endGame({ scores: state.scores });
        return;
      }
      state.at += 1;
      shown(state.content, PROMPTS[state.pack][state.order[state.at]].id);
      state.votes = {};
      state.guesses = {};
      state.revealed = false;
    }),
  }),
  playerLeft: (state, { playerId }) => {
    state.players = state.players.filter((p) => p !== playerId);
    delete state.votes[playerId];
    delete state.guesses[playerId];
    if (
      state.mode === 'phones' &&
      state.pack !== null &&
      !state.revealed &&
      state.players.length &&
      everyoneVoted(state)
    )
      reveal(state);
  },
  view: (state, playerId) => {
    const dilemma = state.pack === null ? null : PROMPTS[state.pack][state.order[state.at]];
    const split = state.revealed
      ? [0, 1].map((choice) => state.players.filter((p) => state.votes[p] === choice))
      : null;
    return {
      mode: state.mode,
      packs:
        state.pack === null
          ? PACKS.map((pack) => ({ name: pack.name[state.lang], hint: pack.hint[state.lang] }))
          : [],
      pack: state.pack === null ? null : PACKS[state.pack].name[state.lang],
      options: dilemma ? [dilemma.a[state.lang], dilemma.b[state.lang]] : ([] as string[]),
      number: state.at + 1,
      total: state.order.length,
      yourVote: playerId === null ? null : (state.votes[playerId] ?? null),
      yourGuess: playerId === null ? null : (state.guesses[playerId] ?? null),
      voted: Object.keys(state.votes).length,
      split,
      // Alone on a side, with at least three voting: defend it!
      loneWolf:
        split && Object.keys(state.votes).length >= 3
          ? (split.find((side) => side.length === 1)?.[0] ?? null)
          : null,
      scores: state.scores,
      awards: awards(
        [
          { title: 'mindReader', stat: state.scores, least: 2 },
          { title: 'rebel', stat: state.rebel, least: 2 },
          { title: 'crowdPleaser', stat: state.crowd, least: 3 },
        ],
        state.players,
      ),
    };
  },
});
