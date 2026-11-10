import type { PlayerHandle } from '@gaute/games-sdk/logic';

export type Role = 'wolf' | 'seer' | 'doctor' | 'witch' | 'hunter' | 'villager';
export type Death = 'wolves' | 'poison' | 'vote' | 'hunter' | 'left';
type Event =
  | { kind: 'died'; player: PlayerHandle; role: Role; cause: Death; story: number; round: number }
  | { kind: 'quiet'; round: number }
  | { kind: 'tie'; round: number };
export type State = {
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
