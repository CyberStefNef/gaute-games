import {
  defineGame,
  endGame,
  fields,
  invalid,
  type Json,
  type PlayerHandle,
} from '@gaute/games-sdk/logic';
import { shuffled, target } from '../_kit/rules';

// The classic village-and-werewolves game on everyone's own phone; the app is the
// narrator. At night the werewolves choose a victim, the seer checks one player and
// the doctor protects one. By day everyone alive votes someone out.
type Role = 'wolf' | 'seer' | 'doctor' | 'villager';
type Event =
  | { kind: 'killed'; player: PlayerHandle; round: number }
  | { kind: 'saved'; round: number }
  | { kind: 'voted'; player: PlayerHandle; role: Role; round: number }
  | { kind: 'tie'; round: number }
  | { kind: 'left'; player: PlayerHandle; role: Role; round: number };
type State = {
  roles: Record<PlayerHandle, Role>;
  alive: PlayerHandle[];
  phase: 'night' | 'day';
  round: number;
  wolfVotes: Record<PlayerHandle, PlayerHandle>;
  seerPick: PlayerHandle | null;
  doctorPick: PlayerHandle | null;
  /** What the seer has learnt: true for a werewolf. */
  seen: Record<PlayerHandle, boolean>;
  dayVotes: Record<PlayerHandle, PlayerHandle>;
  events: Event[];
  winner: 'village' | 'wolves' | null;
};

const NOBODY = 'nobody';
const ballot = (payload: Json): { target: PlayerHandle } => {
  const { target: choice } = fields(payload);
  if (choice === NOBODY) return { target: NOBODY };
  return target(payload);
};

const isAlive = (state: State, player: PlayerHandle) => state.alive.includes(player);
const aliveWith = (state: State, role: Role) => state.alive.filter((p) => state.roles[p] === role);

function checkWinner(state: State) {
  const wolves = aliveWith(state, 'wolf').length;
  if (wolves === 0) state.winner = 'village';
  else if (wolves >= state.alive.length - wolves) state.winner = 'wolves';
  if (state.winner) endGame({ winner: state.winner, roles: state.roles });
  return state.winner !== null;
}

/** The single most-voted choice, or null on a tie. */
function plurality(votes: Record<PlayerHandle, PlayerHandle>) {
  const tally: Record<string, number> = {};
  for (const choice of Object.values(votes)) tally[choice] = (tally[choice] ?? 0) + 1;
  const top = Math.max(0, ...Object.values(tally));
  const leaders = Object.keys(tally).filter((key) => tally[key] === top);
  return leaders.length === 1 ? leaders[0] : null;
}

function nightDone(state: State) {
  return (
    aliveWith(state, 'wolf').every((wolf) => state.wolfVotes[wolf]) &&
    (aliveWith(state, 'seer').length === 0 || state.seerPick !== null) &&
    (aliveWith(state, 'doctor').length === 0 || state.doctorPick !== null)
  );
}

function dawn(state: State) {
  // Werewolves who disagree pick the victim with the most votes; a tie means the
  // first chosen of the leaders, so the night always ends.
  const victim =
    plurality(state.wolfVotes) ?? Object.values(state.wolfVotes).find((v) => isAlive(state, v));
  if (victim && victim === state.doctorPick)
    state.events.push({ kind: 'saved', round: state.round });
  else if (victim) {
    state.alive = state.alive.filter((p) => p !== victim);
    state.events.push({ kind: 'killed', player: victim, round: state.round });
  }
  state.wolfVotes = {};
  state.seerPick = null;
  state.doctorPick = null;
  if (!checkWinner(state)) state.phase = 'day';
}

function dusk(state: State) {
  const out = plurality(state.dayVotes);
  if (out && out !== NOBODY && isAlive(state, out)) {
    state.alive = state.alive.filter((p) => p !== out);
    state.events.push({ kind: 'voted', player: out, role: state.roles[out], round: state.round });
  } else state.events.push({ kind: 'tie', round: state.round });
  state.dayVotes = {};
  if (!checkWinner(state)) {
    state.phase = 'night';
    state.round += 1;
  }
}

function settle(state: State) {
  if (state.winner) return;
  if (state.phase === 'night' && nightDone(state)) dawn(state);
  else if (state.phase === 'day' && state.alive.every((p) => state.dayVotes[p])) dusk(state);
}

export const game = defineGame({
  setup: ({ players, random }): State => {
    const order = shuffled(players.length, random).map((i) => players[i]);
    const wolves = players.length >= 12 ? 3 : players.length >= 8 ? 2 : 1;
    const roles: Record<PlayerHandle, Role> = {};
    order.forEach((player, index) => {
      roles[player] =
        index < wolves
          ? 'wolf'
          : index === wolves
            ? 'seer'
            : index === wolves + 1 && players.length >= 6
              ? 'doctor'
              : 'villager';
    });
    return {
      roles,
      alive: [...players],
      phase: 'night',
      round: 1,
      wolfVotes: {},
      seerPick: null,
      doctorPick: null,
      seen: {},
      dayVotes: {},
      events: [],
      winner: null,
    };
  },
  actions: (action) => ({
    kill: action({
      payload: target,
      run: (state, { playerId, payload }) => {
        if (
          state.phase !== 'night' ||
          !playerId ||
          state.roles[playerId] !== 'wolf' ||
          !isAlive(state, playerId)
        )
          invalid('Only werewolves hunt at night.');
        if (!isAlive(state, payload.target) || state.roles[payload.target] === 'wolf')
          invalid('Choose someone in the village.');
        state.wolfVotes[playerId] = payload.target;
        settle(state);
      },
    }),
    inspect: action({
      payload: target,
      run: (state, { playerId, payload }) => {
        if (
          state.phase !== 'night' ||
          !playerId ||
          state.roles[playerId] !== 'seer' ||
          !isAlive(state, playerId)
        )
          invalid('Only the seer looks at night.');
        if (state.seerPick !== null) invalid('You already looked tonight.');
        if (payload.target === playerId || !isAlive(state, payload.target))
          invalid('Choose someone else who is alive.');
        state.seerPick = payload.target;
        state.seen[payload.target] = state.roles[payload.target] === 'wolf';
        settle(state);
      },
    }),
    protect: action({
      payload: target,
      run: (state, { playerId, payload }) => {
        if (
          state.phase !== 'night' ||
          !playerId ||
          state.roles[playerId] !== 'doctor' ||
          !isAlive(state, playerId)
        )
          invalid('Only the doctor protects at night.');
        if (!isAlive(state, payload.target)) invalid('Choose someone who is alive.');
        state.doctorPick = payload.target;
        settle(state);
      },
    }),
    vote: action({
      payload: ballot,
      run: (state, { playerId, payload }) => {
        if (state.phase !== 'day' || !playerId || !isAlive(state, playerId))
          invalid('Only the living vote by day.');
        if (payload.target !== NOBODY && !isAlive(state, payload.target))
          invalid('Choose someone who is alive.');
        state.dayVotes[playerId] = payload.target;
        settle(state);
      },
    }),
  }),
  playerLeft: (state, { playerId }) => {
    if (isAlive(state, playerId)) {
      state.alive = state.alive.filter((p) => p !== playerId);
      state.events.push({
        kind: 'left',
        player: playerId,
        role: state.roles[playerId],
        round: state.round,
      });
    }
    delete state.wolfVotes[playerId];
    delete state.dayVotes[playerId];
    if (state.seerPick === playerId) state.seerPick = null;
    if (!checkWinner(state)) settle(state);
  },
  view: (state, playerId) => {
    const role = playerId ? state.roles[playerId] : null;
    const alive = playerId ? isAlive(state, playerId) : false;
    const wolf = role === 'wolf';
    // What this player still has to do in this phase.
    const todo =
      !alive || state.winner
        ? null
        : state.phase === 'day'
          ? state.dayVotes[playerId!]
            ? null
            : 'vote'
          : wolf
            ? state.wolfVotes[playerId!]
              ? null
              : 'kill'
            : role === 'seer'
              ? state.seerPick
                ? null
                : 'inspect'
              : role === 'doctor'
                ? state.doctorPick
                  ? null
                  : 'protect'
                : null;
    return {
      role,
      alive,
      phase: state.phase,
      round: state.round,
      todo,
      living: state.alive,
      // Fellow werewolves and their choices tonight, for werewolves only.
      pack: wolf ? aliveWith(state, 'wolf').filter((p) => p !== playerId) : ([] as PlayerHandle[]),
      packVotes: wolf ? state.wolfVotes : ({} as Record<PlayerHandle, PlayerHandle>),
      seen: role === 'seer' ? state.seen : ({} as Record<PlayerHandle, boolean>),
      yourChoice:
        !playerId || !alive
          ? null
          : state.phase === 'day'
            ? (state.dayVotes[playerId] ?? null)
            : wolf
              ? (state.wolfVotes[playerId] ?? null)
              : role === 'seer'
                ? state.seerPick
                : role === 'doctor'
                  ? state.doctorPick
                  : null,
      votes: Object.keys(state.dayVotes).length,
      events: state.events.slice(-4),
      winner: state.winner,
      roles: state.winner ? state.roles : ({} as Record<PlayerHandle, Role>),
    };
  },
});
