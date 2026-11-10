import type { State, Role } from './state';
import {
  NOBODY,
  isAlive,
  aliveWith,
  nightRole,
  checkWinner,
  victim,
  kill,
  proceed,
  settle,
} from './round';
import { defineGame, fields, invalid, type Json, type PlayerHandle } from '@gaute/games-sdk/logic';
import { shuffled, target } from '../_kit/rules';

// The classic village-and-werewolves game on everyone's own phone; the app is the
// narrator. At night the werewolves choose a victim and the seer checks one player.
// Up to seven players, a doctor protects one player each night; from eight, a
// witch has one healing potion and one poison instead. From nine, a hunter takes
// someone down with them. By day everyone alive votes someone out.
const ballot = (payload: Json): { target: PlayerHandle } => {
  const { target: choice } = fields(payload);
  if (choice === NOBODY) return { target: NOBODY };
  return target(payload);
};
const brew = (payload: Json): { save: boolean; poison: PlayerHandle } => {
  const { save, poison } = fields(payload);
  if (typeof save !== 'boolean' || typeof poison !== 'string') invalid('Choose what to brew.');
  return { save, poison };
};

export const game = defineGame({
  setup: ({ players, random }): State => {
    const order = shuffled(players.length, random).map((i) => players[i]);
    const count = players.length;
    const wolves = count >= 12 ? 3 : count >= 8 ? 2 : 1;
    const specials: Role[] = [
      'seer',
      ...(count >= 8 ? (['witch'] as Role[]) : count >= 6 ? (['doctor'] as Role[]) : []),
      ...(count >= 9 ? (['hunter'] as Role[]) : []),
    ];
    const roles: Record<PlayerHandle, Role> = {};
    order.forEach((player, index) => {
      roles[player] = index < wolves ? 'wolf' : (specials[index - wolves] ?? 'villager');
    });
    return {
      roles,
      alive: [...players],
      phase: 'night',
      round: 1,
      wolfVotes: {},
      seerPick: null,
      doctorPick: null,
      witchDone: false,
      witchSave: false,
      witchPoison: null,
      healUsed: false,
      poisonUsed: false,
      seen: {},
      dayVotes: {},
      hunter: null,
      after: 'day',
      events: [],
      winner: null,
    };
  },
  actions: (action) => ({
    kill: action({
      payload: target,
      run: (state, { playerId, payload, random }) => {
        if (!nightRole(state, playerId, 'wolf')) invalid('Only werewolves hunt at night.');
        if (!isAlive(state, payload.target) || state.roles[payload.target] === 'wolf')
          invalid('Choose someone in the village.');
        state.wolfVotes[playerId!] = payload.target;
        settle(state, random);
      },
    }),
    inspect: action({
      payload: target,
      run: (state, { playerId, payload, random }) => {
        if (!nightRole(state, playerId, 'seer')) invalid('Only the seer looks at night.');
        if (state.seerPick !== null) invalid('You already looked tonight.');
        if (payload.target === playerId || !isAlive(state, payload.target))
          invalid('Choose someone else who is alive.');
        state.seerPick = payload.target;
        state.seen[payload.target] = state.roles[payload.target] === 'wolf';
        settle(state, random);
      },
    }),
    protect: action({
      payload: target,
      run: (state, { playerId, payload, random }) => {
        if (!nightRole(state, playerId, 'doctor')) invalid('Only the doctor protects at night.');
        if (!isAlive(state, payload.target)) invalid('Choose someone who is alive.');
        state.doctorPick = payload.target;
        settle(state, random);
      },
    }),
    // The witch acts once the werewolves have chosen: save their victim, poison
    // someone, both or neither. Each potion works once per game.
    brew: action({
      payload: brew,
      run: (state, { playerId, payload, random }) => {
        if (!nightRole(state, playerId, 'witch')) invalid('Only the witch brews at night.');
        if (state.witchDone) invalid('You already chose tonight.');
        if (victim(state) === null) invalid('Wait for the werewolves to choose.');
        if (payload.save && state.healUsed) invalid('Your healing potion is used up.');
        const poison = payload.poison === NOBODY ? null : payload.poison;
        if (poison !== null && (state.poisonUsed || !isAlive(state, poison) || poison === playerId))
          invalid('You can’t poison them.');
        state.witchDone = true;
        state.witchSave = payload.save;
        state.witchPoison = poison;
        if (payload.save) state.healUsed = true;
        if (poison) state.poisonUsed = true;
        settle(state, random);
      },
    }),
    // A dead hunter's last shot.
    shoot: action({
      payload: target,
      run: (state, { playerId, payload, random }) => {
        if (state.phase !== 'hunt' || playerId !== state.hunter)
          invalid('Only the hunter shoots now.');
        if (!isAlive(state, payload.target)) invalid('Choose someone who is alive.');
        state.hunter = null;
        kill(state, payload.target, 'hunter', random);
        proceed(state, state.after);
      },
    }),
    vote: action({
      payload: ballot,
      run: (state, { playerId, payload, random }) => {
        if (state.phase !== 'day' || !playerId || !isAlive(state, playerId))
          invalid('Only the living vote by day.');
        if (payload.target !== NOBODY && !isAlive(state, payload.target))
          invalid('Choose someone who is alive.');
        state.dayVotes[playerId] = payload.target;
        settle(state, random);
      },
    }),
  }),
  playerLeft: (state, { playerId, random }) => {
    kill(state, playerId, 'left', random);
    delete state.wolfVotes[playerId];
    delete state.dayVotes[playerId];
    if (state.seerPick === playerId) state.seerPick = null;
    if (state.hunter === playerId) {
      state.hunter = null;
      proceed(state, state.after);
    }
    if (!checkWinner(state)) settle(state, random);
  },
  view: (state, playerId) => {
    const role = playerId ? state.roles[playerId] : null;
    const alive = playerId ? isAlive(state, playerId) : false;
    const wolf = role === 'wolf';
    const prey = victim(state);
    let todo: 'kill' | 'inspect' | 'protect' | 'brew' | 'shoot' | 'vote' | null = null;
    if (state.winner || !playerId) todo = null;
    else if (state.phase === 'hunt') todo = state.hunter === playerId ? 'shoot' : null;
    else if (!alive) todo = null;
    else if (state.phase === 'day') todo = state.dayVotes[playerId] ? null : 'vote';
    else if (wolf) todo = state.wolfVotes[playerId] ? null : 'kill';
    else if (role === 'seer') todo = state.seerPick ? null : 'inspect';
    else if (role === 'doctor') todo = state.doctorPick ? null : 'protect';
    else if (role === 'witch') todo = state.witchDone || prey === null ? null : 'brew';
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
      // The witch sees tonight's victim and what she has left.
      witch:
        role === 'witch'
          ? { victim: prey, heal: !state.healUsed, poison: !state.poisonUsed }
          : null,
      hunter: state.phase === 'hunt' ? state.hunter : null,
      votes: Object.keys(state.dayVotes).length,
      events: state.events.slice(-4),
      winner: state.winner,
      roles: state.winner ? state.roles : ({} as Record<PlayerHandle, Role>),
    };
  },
});
