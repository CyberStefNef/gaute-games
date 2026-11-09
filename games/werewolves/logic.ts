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
// narrator. At night the werewolves choose a victim and the seer checks one player.
// Up to seven players, a doctor protects one player each night; from eight, a
// witch has one healing potion and one poison instead. From nine, a hunter takes
// someone down with them. By day everyone alive votes someone out.
type Role = 'wolf' | 'seer' | 'doctor' | 'witch' | 'hunter' | 'villager';
type Death = 'wolves' | 'poison' | 'vote' | 'hunter' | 'left';
type Event =
  | { kind: 'died'; player: PlayerHandle; role: Role; cause: Death; story: number; round: number }
  | { kind: 'quiet'; round: number }
  | { kind: 'tie'; round: number };
type State = {
  roles: Record<PlayerHandle, Role>;
  alive: PlayerHandle[];
  phase: 'night' | 'day' | 'hunt';
  round: number;
  wolfVotes: Record<PlayerHandle, PlayerHandle>;
  seerPick: PlayerHandle | null;
  doctorPick: PlayerHandle | null;
  /** The witch's choice tonight: whether she saves the victim, and whom she poisons. */
  witchDone: boolean;
  witchSave: boolean;
  witchPoison: PlayerHandle | null;
  healUsed: boolean;
  poisonUsed: boolean;
  /** What the seer has learnt: true for a werewolf. */
  seen: Record<PlayerHandle, boolean>;
  dayVotes: Record<PlayerHandle, PlayerHandle>;
  /** A dead hunter's last shot, and where the game goes after it. */
  hunter: PlayerHandle | null;
  after: 'day' | 'night';
  events: Event[];
  winner: 'village' | 'wolves' | null;
};

const NOBODY = 'nobody';
const STORIES = 6;
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

const isAlive = (state: State, player: PlayerHandle) => state.alive.includes(player);
const aliveWith = (state: State, role: Role) => state.alive.filter((p) => state.roles[p] === role);

function checkWinner(state: State) {
  if (state.winner) return true;
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

/** The werewolves' victim tonight, once they have all chosen. */
function victim(state: State) {
  const wolves = aliveWith(state, 'wolf');
  if (!wolves.every((wolf) => state.wolfVotes[wolf])) return null;
  return (
    plurality(state.wolfVotes) ??
    Object.values(state.wolfVotes).find((v) => isAlive(state, v)) ??
    null
  );
}

function kill(state: State, player: PlayerHandle, cause: Death, random: () => number) {
  if (!isAlive(state, player)) return;
  state.alive = state.alive.filter((p) => p !== player);
  state.events.push({
    kind: 'died',
    player,
    role: state.roles[player],
    cause,
    story: Math.floor(random() * STORIES),
    round: state.round,
  });
  if (state.roles[player] === 'hunter' && cause !== 'left') state.hunter = player;
}

/** After deaths: the hunter shoots first, then the game moves on or ends. */
function proceed(state: State, next: 'day' | 'night') {
  if (state.hunter) {
    state.phase = 'hunt';
    state.after = next;
    return;
  }
  if (checkWinner(state)) return;
  if (next === 'night') state.round += 1;
  state.phase = next;
}

function nightDone(state: State) {
  return (
    victim(state) !== null &&
    (aliveWith(state, 'seer').length === 0 || state.seerPick !== null) &&
    (aliveWith(state, 'doctor').length === 0 || state.doctorPick !== null) &&
    (aliveWith(state, 'witch').length === 0 || state.witchDone)
  );
}

function dawn(state: State, random: () => number) {
  const prey = victim(state);
  const saved = prey !== null && (prey === state.doctorPick || state.witchSave);
  const before = state.events.length;
  if (prey && !saved) kill(state, prey, 'wolves', random);
  if (state.witchPoison) kill(state, state.witchPoison, 'poison', random);
  if (state.events.length === before) state.events.push({ kind: 'quiet', round: state.round });
  state.wolfVotes = {};
  state.seerPick = null;
  state.doctorPick = null;
  state.witchDone = false;
  state.witchSave = false;
  state.witchPoison = null;
  proceed(state, 'day');
}

function dusk(state: State, random: () => number) {
  const out = plurality(state.dayVotes);
  if (out && out !== NOBODY && isAlive(state, out)) kill(state, out, 'vote', random);
  else state.events.push({ kind: 'tie', round: state.round });
  state.dayVotes = {};
  proceed(state, 'night');
}

function settle(state: State, random: () => number) {
  if (state.winner) return;
  if (state.phase === 'night' && nightDone(state)) dawn(state, random);
  else if (state.phase === 'day' && state.alive.every((p) => state.dayVotes[p]))
    dusk(state, random);
}

const nightRole = (state: State, playerId: PlayerHandle | null, role: Role) =>
  state.phase === 'night' &&
  playerId !== null &&
  state.roles[playerId] === role &&
  isAlive(state, playerId);

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
