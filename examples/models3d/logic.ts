import { defineGame, fields, invalid, endGame, type Json } from '@gaute/games-sdk/logic';
function target(payload: Json) {
  const { at } = fields(payload);
  if (typeof at !== 'number' || !Number.isInteger(at) || at < 0 || at > 8)
    invalid('Choose a meadow.');
  return { at };
}
export const game = defineGame({
  setup: ({ players }) => ({ players, active: 0, at: 4, moves: 0 }),
  actions: (action) => ({
    move: action({
      payload: target,
      run: (state, { playerId, payload }) => {
        if (playerId !== state.players[state.active]) invalid('Wait for your turn.');
        const x = state.at % 3,
          y = Math.floor(state.at / 3),
          nx = payload.at % 3,
          ny = Math.floor(payload.at / 3);
        // Odd-column flat-top hex adjacency in the actual model plane.
        const dx = nx - x,
          dy = ny - y;
        const near =
          dx === 0
            ? Math.abs(dy) === 1
            : Math.abs(dx) === 1 && (dy === 0 || dy === (x % 2 ? 1 : -1));
        if (!near) invalid('Choose a neighbouring meadow.');
        state.at = payload.at;
        state.moves++;
        state.active = (state.active + 1) % state.players.length;
        if (state.moves >= 6) endGame({ moves: state.moves });
      },
    }),
  }),
  view: (state) => ({ at: state.at, moves: state.moves, active: state.players[state.active] }),
  turn: (state) => state.players[state.active],
});
