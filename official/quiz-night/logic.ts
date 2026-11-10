import { QUESTIONS, CATEGORY_NAMES } from './content';
import {
  defineGame,
  endGame,
  fields,
  invalid,
  type Json,
  type Mode,
  type PlayerHandle,
} from '@gaute/games-sdk/logic';
import { awards, count, langOf, score, shuffled, zeroScores, type Lang } from '../_kit/rules';

// Ten multiple-choice questions. On own phones everyone answers privately: a
// right answer scores 1, the first right answer 1 more, and a streak of three or
// more 1 more. Doubling down doubles a right answer and costs 1 when wrong. On one
// phone the group agrees on an answer and plays as a team.
const PER_GAME = 10;

type Answer = { value: number; double: boolean };
type Gain = { points: number; fastest: boolean; streak: number };
type State = {
  mode: Mode;
  lang: Lang;
  players: PlayerHandle[];
  order: number[];
  at: number;
  answers: Record<PlayerHandle, Answer>;
  /** Who answered, in the order the answers arrived. */
  arrival: PlayerHandle[];
  /** One phone: the group's answer. */
  groupAnswer: Answer | null;
  revealed: boolean;
  gains: Record<PlayerHandle, Gain>;
  scores: Record<PlayerHandle, number>;
  streaks: Record<PlayerHandle, number>;
  groupScore: number;
  correct: Record<PlayerHandle, number>;
  fastest: Record<PlayerHandle, number>;
  gambles: Record<PlayerHandle, number>;
};

const answerPayload = (payload: Json): Answer => {
  const { value, double } = fields(payload);
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value > 3)
    invalid('Choose one of the options.');
  return { value, double: double === true };
};

const question = (state: State) => QUESTIONS[state.order[state.at]];

function reveal(state: State) {
  state.revealed = true;
  const right = question(state).answer;
  let first = true;
  for (const player of state.arrival) {
    const answer = state.answers[player];
    if (!answer) continue;
    if (answer.value === right) {
      state.streaks[player] = (state.streaks[player] ?? 0) + 1;
      const streak = state.streaks[player];
      const points = (1 + (first ? 1 : 0) + (streak >= 3 ? 1 : 0)) * (answer.double ? 2 : 1);
      state.gains[player] = { points, fastest: first, streak };
      score(state.scores, player, points);
      count(state.correct, player);
      if (first) count(state.fastest, player);
      if (answer.double) count(state.gambles, player);
      first = false;
    } else {
      state.streaks[player] = 0;
      const points = answer.double ? -1 : 0;
      state.gains[player] = { points, fastest: false, streak: 0 };
      score(state.scores, player, points);
    }
  }
  if (state.groupAnswer)
    state.groupScore +=
      state.groupAnswer.value === right
        ? state.groupAnswer.double
          ? 2
          : 1
        : state.groupAnswer.double
          ? -1
          : 0;
}

export const game = defineGame({
  setup: ({ players, locale, mode, random }): State => ({
    mode,
    lang: langOf(locale),
    players: [...players],
    order: shuffled(QUESTIONS.length, random).slice(0, PER_GAME),
    at: 0,
    answers: {},
    arrival: [],
    groupAnswer: null,
    revealed: false,
    gains: {},
    scores: zeroScores(players),
    streaks: {},
    groupScore: 0,
    correct: {},
    fastest: {},
    gambles: {},
  }),
  actions: (action) => ({
    answer: action({
      payload: answerPayload,
      run: (state, { playerId, payload }) => {
        if (state.revealed) invalid('Wait for the next question.');
        if (state.mode === 'phones') {
          if (!playerId) invalid('Wait for the next question.');
          if (state.answers[playerId]) invalid('You have answered.');
          state.answers[playerId] = payload;
          state.arrival.push(playerId);
          if (state.players.every((p) => state.answers[p] !== undefined)) reveal(state);
        } else {
          state.groupAnswer = payload;
          reveal(state);
        }
      },
    }),
    reveal: action((state) => {
      if (state.revealed || !Object.keys(state.answers).length) invalid('Nobody has answered yet.');
      reveal(state);
    }),
    next: action((state) => {
      if (!state.revealed) invalid('Answer first.');
      if (state.at + 1 >= state.order.length) {
        endGame(state.mode === 'phones' ? { scores: state.scores } : { score: state.groupScore });
        return;
      }
      state.at += 1;
      state.answers = {};
      state.arrival = [];
      state.groupAnswer = null;
      state.revealed = false;
      state.gains = {};
    }),
  }),
  playerLeft: (state, { playerId }) => {
    state.players = state.players.filter((p) => p !== playerId);
    delete state.answers[playerId];
    state.arrival = state.arrival.filter((p) => p !== playerId);
    if (
      state.mode === 'phones' &&
      !state.revealed &&
      state.players.length &&
      state.players.every((p) => state.answers[p] !== undefined)
    )
      reveal(state);
  },
  view: (state, playerId) => {
    const current = question(state);
    const mine = playerId === null ? state.groupAnswer : (state.answers[playerId] ?? null);
    return {
      mode: state.mode,
      number: state.at + 1,
      total: state.order.length,
      category: CATEGORY_NAMES[current.c][state.lang],
      question: current.q[state.lang],
      options: current.options.map((choice) => choice[state.lang]),
      yourAnswer: mine ? mine.value : null,
      yourDouble: mine ? mine.double : false,
      yourStreak: playerId === null ? 0 : (state.streaks[playerId] ?? 0),
      answered: Object.keys(state.answers).length,
      revealed: state.revealed,
      correct: state.revealed ? current.answer : null,
      picks: state.revealed
        ? Object.fromEntries(Object.entries(state.answers).map(([p, a]) => [p, a.value]))
        : ({} as Record<PlayerHandle, number>),
      gains: state.revealed ? state.gains : ({} as Record<PlayerHandle, Gain>),
      scores: state.scores,
      groupScore: state.groupScore,
      awards: awards(
        [
          { title: 'brainiac', stat: state.correct, least: 3 },
          { title: 'speedster', stat: state.fastest, least: 2 },
          { title: 'gambler', stat: state.gambles, least: 2 },
        ],
        state.players,
      ),
    };
  },
});
