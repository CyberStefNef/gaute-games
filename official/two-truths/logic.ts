import {
  defineGame,
  endGame,
  fields,
  invalid,
  type Json,
  type PlayerHandle,
} from '@gaute/games-sdk/logic';
import { awards, count, option, score, zeroScores } from '../_kit/rules';

// Everyone prepares their statements together, then takes a turn. The others guess
// the lie: a right guess scores for the guesser, a wrong one for the teller.
type State = {
  players: PlayerHandle[];
  /** Whose turn to tell: an index into players. */
  turn: number;
  phase: 'write' | 'guess' | 'reveal';
  prepared: Record<PlayerHandle, { statements: string[]; lie: number }>;
  statements: string[];
  lie: number;
  guesses: Record<PlayerHandle, number>;
  scores: Record<PlayerHandle, number>;
  fooled: Record<PlayerHandle, number>;
  detected: Record<PlayerHandle, number>;
};

const story = (payload: Json): { statements: string[]; lie: number } => {
  const { statements, lie } = fields(payload);
  const texts = Array.isArray(statements) ? statements : [];
  if (
    texts.length !== 3 ||
    texts.some((text) => typeof text !== 'string' || !text.trim() || text.length > 140)
  )
    invalid('Write three short statements.');
  if (typeof lie !== 'number' || !Number.isInteger(lie) || lie < 0 || lie > 2)
    invalid('Mark which one is the lie.');
  return { statements: texts.map((text) => (text as string).trim()), lie };
};

const teller = (state: State) => state.players[state.turn];
const guessers = (state: State) => state.players.filter((p) => p !== teller(state));

function reveal(state: State) {
  state.phase = 'reveal';
  for (const [player, guess] of Object.entries(state.guesses))
    if (guess === state.lie) {
      score(state.scores, player);
      count(state.detected, player);
    } else {
      score(state.scores, teller(state));
      count(state.fooled, teller(state));
    }
}

function nextTeller(state: State) {
  // After the last teller the game ends on the final reveal.
  if (state.turn + 1 >= state.players.length) {
    endGame({ scores: state.scores });
    return;
  }
  state.guesses = {};
  state.turn += 1;
  beginTeller(state);
}

function beginTeller(state: State) {
  const prepared = state.prepared[teller(state)];
  state.phase = 'guess';
  state.statements = prepared.statements;
  state.lie = prepared.lie;
}

export const game = defineGame({
  setup: ({ players }): State => ({
    players: [...players],
    turn: 0,
    phase: 'write',
    prepared: {},
    statements: [],
    lie: 0,
    guesses: {},
    scores: zeroScores(players),
    fooled: {},
    detected: {},
  }),
  actions: (action) => ({
    submit: action({
      payload: story,
      run: (state, { playerId, payload }) => {
        if (state.phase !== 'write' || !playerId) invalid('Preparation is over.');
        state.prepared[playerId] = payload;
        if (state.players.every((p) => state.prepared[p])) beginTeller(state);
      },
    }),
    guess: action({
      payload: option(3),
      run: (state, { playerId, payload }) => {
        if (state.phase !== 'guess' || !playerId || playerId === teller(state))
          invalid('You can’t guess now.');
        state.guesses[playerId] = payload.value;
        if (guessers(state).every((p) => state.guesses[p] !== undefined)) reveal(state);
      },
    }),
    reveal: action((state) => {
      if (state.phase !== 'guess') invalid('You can’t reveal now.');
      if (!Object.keys(state.guesses).length) invalid('Nobody has guessed yet.');
      reveal(state);
    }),
    next: action((state) => {
      if (state.phase !== 'reveal') invalid('Finish this round first.');
      nextTeller(state);
    }),
  }),
  playerLeft: (state, { playerId }) => {
    const index = state.players.indexOf(playerId);
    const wasTeller = index === state.turn;
    state.players = state.players.filter((p) => p !== playerId);
    delete state.guesses[playerId];
    delete state.prepared[playerId];
    delete state.scores[playerId];
    delete state.fooled[playerId];
    delete state.detected[playerId];
    if (state.phase === 'write') {
      state.turn = 0;
      if (state.players.length && state.players.every((p) => state.prepared[p])) beginTeller(state);
      return;
    }
    if (index < state.turn) state.turn -= 1;
    if (wasTeller) {
      // The next player tells instead; the turn index now points at them.
      state.turn -= 1;
      nextTeller(state);
    } else if (
      state.phase === 'guess' &&
      guessers(state).every((p) => state.guesses[p] !== undefined)
    )
      reveal(state);
  },
  view: (state, playerId) => {
    const telling = playerId === teller(state);
    const shown = state.phase !== 'write';
    return {
      phase: state.phase,
      ready: Object.keys(state.prepared).length,
      submitted: playerId !== null && state.prepared[playerId] !== undefined,
      teller: teller(state),
      round: state.turn + 1,
      rounds: state.players.length,
      statements: shown ? state.statements : ([] as string[]),
      // Only the teller knows the lie before the reveal.
      lie: state.phase === 'reveal' || (telling && shown) ? state.lie : null,
      yourGuess: playerId === null ? null : (state.guesses[playerId] ?? null),
      guessed: Object.keys(state.guesses).length,
      guessers: guessers(state).length,
      guesses: state.phase === 'reveal' ? state.guesses : ({} as Record<PlayerHandle, number>),
      scores: state.scores,
      awards: awards(
        [
          { title: 'masterLiar', stat: state.fooled, least: 2 },
          { title: 'lieDetector', stat: state.detected, least: 2 },
        ],
        state.players,
      ),
    };
  },
});
