import { defineGame, endGame, invalid, type Mode, type PlayerHandle } from '@gaute/games-sdk/logic';

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

/** What one player's page receives; client.tsx imports this type. */
export type View = {
  guesses: State['guesses'];
  yourTurn: boolean;
  next: PlayerHandle;
  /** The finder's handle, or 'group' on a shared phone. */
  winner: PlayerHandle | null;
  secret: number | null;
};

defineGame({
  setup: ({ players, mode, random }): State => ({
    mode,
    players,
    secret: 1 + Math.floor(random() * 100),
    turn: 0,
    guesses: [],
    winner: null,
  }),
  actions: {
    guess: (state: State, { playerId, payload }) => {
      const value = (payload as { value?: unknown } | null)?.value;
      if (state.winner) invalid('The number has been found.');
      if (!Number.isInteger(value) || (value as number) < 1 || (value as number) > 100)
        invalid('Guess a whole number from 1 to 100.');
      // On own phones players take turns; on one phone the app tells us who holds it.
      const expected = state.players[state.turn % state.players.length];
      if (state.mode !== 'shared' && playerId !== expected) invalid('It is not your turn.');
      const guess = value as number;
      const hint = guess === state.secret ? 'correct' : guess < state.secret ? 'higher' : 'lower';
      state.guesses.push({ player: playerId, value: guess, hint });
      state.turn += 1;
      if (hint === 'correct') {
        state.winner = playerId ?? 'group';
        endGame({ winner: playerId, guesses: state.guesses.length });
      }
    },
  },
  // Pass the phone: whose turn it is. Shared and own-phone play ignore this.
  turn: (state: State) => (state.winner ? null : state.players[state.turn % state.players.length]),
  // Everything a player sees. The secret stays out until someone finds it.
  view: (state: State, playerId): View => ({
    guesses: state.guesses,
    yourTurn:
      state.mode === 'shared' ||
      (playerId !== null && state.players[state.turn % state.players.length] === playerId),
    next: state.players[state.turn % state.players.length],
    winner: state.winner,
    secret: state.winner ? state.secret : null,
  }),
});
