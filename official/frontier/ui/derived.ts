// Presentation helpers shared by the board and panels.
import { GROUNDS } from './contract';

export const GROUND_NAMES = {
  fields: 'Barley fields',
  hops: 'Hop garden',
  hills: 'Hills',
  water: 'Water',
  orchard: 'Orchard',
  town: 'Town square',
} as const;
export const groundName = (ground: number) =>
  ground < 0 || !GROUNDS[ground] ? 'Unexplored' : GROUND_NAMES[GROUNDS[ground]];

/** Player identity: colour plus an emblem shape so owners never rely on colour alone. */
export const PLAYER_COLORS = ['#8a3ad6', '#c98a00', '#0f8c86', '#c2456b'] as const;
export const PLAYER_EMBLEMS = ['circle', 'diamond', 'triangle', 'square'] as const;
export type Emblem = (typeof PLAYER_EMBLEMS)[number] | 'none';
export const NEUTRAL = '#8d8196';

export type Identity = { color: string; emblem: Emblem; index: number };
export type Owners = (owner: string | null | undefined) => Identity;

export function identities(handles: string[]): Owners {
  const map = new Map<string, Identity>();
  handles.forEach((handle, index) =>
    map.set(handle, {
      color: PLAYER_COLORS[index % PLAYER_COLORS.length],
      emblem: PLAYER_EMBLEMS[index % PLAYER_EMBLEMS.length],
      index,
    }),
  );
  return (owner) =>
    (owner != null && map.get(owner)) || { color: NEUTRAL, emblem: 'none', index: -1 };
}
