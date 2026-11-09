import {
  defineGame,
  endGame,
  fields,
  invalid,
  type Json,
  type Mode,
  type PlayerHandle,
} from '@gaute/games-sdk/logic';

// Rules run in a sandbox on Gaute's server (own phones) or on one phone (pass or
// shared). Keep them synchronous and deterministic; use `random`, never clocks.
type State = {
  mode: Mode;
  players: PlayerHandle[];
  secret: number;
  turn: number;
  guesses: { player: PlayerHandle | null; value: number; hint: 'higher' | 'lower' | 'correct' }[];
  winner: PlayerHandle | null;
};

/** Payload of `guess`. Payloads come from players' pages, so check them. */
const guessPayload = (payload: Json): { value: number } => {
  const { value } = fields(payload);
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 100)
    invalid('Guess a whole number from 1 to 100.');
  return { value };
};

// Export the game: the page imports its type, so actions, payloads and the view
// are checked on both sides.
export const game = defineGame({
  setup: ({ players, mode, random }): State => ({
    mode,
    players,
    secret: 1 + Math.floor(random() * 100),
    turn: 0,
    guesses: [],
    winner: null,
  }),
  actions: (action) => ({
    guess: action({
      payload: guessPayload,
      run: (state, { playerId, payload }) => {
        if (state.winner) invalid('The number has been found.');
        // On own phones players take turns; on one phone the app tells us who holds it.
        const expected = state.players[state.turn % state.players.length];
        if (state.mode !== 'shared' && playerId !== expected) invalid('It is not your turn.');
        const hint =
          payload.value === state.secret
            ? 'correct'
            : payload.value < state.secret
              ? 'higher'
              : 'lower';
        state.guesses.push({ player: playerId, value: payload.value, hint });
        state.turn += 1;
        if (hint === 'correct') {
          state.winner = playerId ?? 'group';
          endGame({ winner: playerId, guesses: state.guesses.length });
        }
      },
    }),
  }),
  // Pass the phone: whose turn it is. Shared and own-phone play ignore this.
  turn: (state) => (state.winner ? null : state.players[state.turn % state.players.length]),
  // Everything a player sees. The secret stays out until someone finds it.
  view: (state, playerId) => ({
    guesses: state.guesses,
    yourTurn:
      state.mode === 'shared' ||
      (playerId !== null && state.players[state.turn % state.players.length] === playerId),
    next: state.players[state.turn % state.players.length],
    winner: state.winner,
    secret: state.winner ? state.secret : null,
  }),
});
