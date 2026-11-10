import { endGame, type PlayerHandle } from '@gaute/games-sdk/logic';
import type { State, Role, Death } from './state';

export const NOBODY = 'nobody';
const STORIES = 6;

export const isAlive = (state: State, player: PlayerHandle) => state.alive.includes(player);
export const aliveWith = (state: State, role: Role) =>
  state.alive.filter((p) => state.roles[p] === role);

export function checkWinner(state: State) {
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
export function victim(state: State) {
  const wolves = aliveWith(state, 'wolf');
  if (!wolves.every((wolf) => state.wolfVotes[wolf])) return null;
  return (
    plurality(state.wolfVotes) ??
    Object.values(state.wolfVotes).find((v) => isAlive(state, v)) ??
    null
  );
}

export function kill(state: State, player: PlayerHandle, cause: Death, random: () => number) {
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
export function proceed(state: State, next: 'day' | 'night') {
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

export function settle(state: State, random: () => number) {
  if (state.winner) return;
  if (state.phase === 'night' && nightDone(state)) dawn(state, random);
  else if (state.phase === 'day' && state.alive.every((p) => state.dayVotes[p]))
    dusk(state, random);
}

export const nightRole = (state: State, playerId: PlayerHandle | null, role: Role) =>
  state.phase === 'night' &&
  playerId !== null &&
  state.roles[playerId] === role &&
  isAlive(state, playerId);
