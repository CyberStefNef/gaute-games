// Small helpers shared by the official games' rules. They run in the sandbox,
// so they stay deterministic: randomness always comes from the `random` passed in.
import { fields, invalid, type Json, type PlayerHandle } from '@gaute/games-sdk/logic';

export type Lang = 'en' | 'nb';
/** Text in both languages the app speaks. */
export type Text = { en: string; nb: string };

export const langOf = (locale: string): Lang => (locale === 'nb' ? 'nb' : 'en');

/** The numbers 0…count-1 in a random order. */
export function shuffled(count: number, random: () => number) {
  const order = Array.from({ length: count }, (_, index) => index);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** Payload validator: one player, `{ target }`. */
export const target = (payload: Json): { target: PlayerHandle } => {
  const { target } = fields(payload);
  if (typeof target !== 'string') invalid('Choose a player in this game.');
  return { target };
};

/** Payload validator: one of `count` options, `{ value }` from 0. */
export const option =
  (count: number) =>
  (payload: Json): { value: number } => {
    const { value } = fields(payload);
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 0 || value >= count)
      invalid('Choose one of the options.');
    return { value };
  };

/** Adds `points` to a player's score. */
export function score(scores: Record<PlayerHandle, number>, player: PlayerHandle, points = 1) {
  scores[player] = (scores[player] ?? 0) + points;
}

/** Players with zero points, in join order. */
export const zeroScores = (players: PlayerHandle[]) =>
  Object.fromEntries(players.map((player) => [player, 0])) as Record<PlayerHandle, number>;

/** The players with the most votes; one name when there is a clear winner. */
export function leaders(votes: Record<PlayerHandle, PlayerHandle>) {
  const tally: Record<string, number> = {};
  for (const choice of Object.values(votes)) tally[choice] = (tally[choice] ?? 0) + 1;
  const top = Math.max(0, ...Object.values(tally));
  return { tally, top: Object.keys(tally).filter((key) => tally[key] === top) };
}

/** Players named in a text: `{p1}` and `{p2}` get different players, not `skip`. */
export function pickRefs(
  texts: string[],
  players: PlayerHandle[],
  random: () => number,
  skip?: PlayerHandle | null,
) {
  const pool = players.filter((player) => player !== skip);
  const refs: Record<string, PlayerHandle> = {};
  for (const key of ['p1', 'p2'])
    if (texts.some((text) => text.includes(`{${key}}`)) && pool.length) {
      const [player] = pool.splice(Math.floor(random() * pool.length), 1);
      refs[key] = player;
    }
  return refs;
}

/**
 * End-of-game awards: for each title, the player with the highest count of its
 * statistic (at least `least`, ties go to the earlier player). Titles nobody
 * earned are left out.
 */
export function awards(
  titles: { title: string; stat: Record<PlayerHandle, number>; least?: number }[],
  players: PlayerHandle[],
) {
  const given: { title: string; player: PlayerHandle; count: number }[] = [];
  for (const { title, stat, least = 1 } of titles) {
    let best: PlayerHandle | null = null;
    for (const player of players)
      if (
        (stat[player] ?? 0) >= least &&
        (best === null || (stat[player] ?? 0) > (stat[best] ?? 0))
      )
        best = player;
    if (best) given.push({ title, player: best, count: stat[best] ?? 0 });
  }
  return given;
}

/** Adds one to a statistic. */
export function count(stat: Record<PlayerHandle, number>, player: PlayerHandle, by = 1) {
  stat[player] = (stat[player] ?? 0) + by;
}
