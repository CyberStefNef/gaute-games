// Gaute Brewtown presentation contract. Board and panel components read only
// these types; `wire.ts` is the single place that touches the rules' view and
// action names. Optional sections render only when present, and each control
// maps to an intent, so nothing unavailable is advertised.
//
// Text fields supplied by the rules (titles, details, blocked reasons, recipe and
// client names) are English string keys; the page translates them with t.text,
// so each needs an entry in strings.ts.

export type Ingredient = 'barley' | 'hops' | 'water' | 'yeast' | 'fruit';
export const INGREDIENTS: readonly Ingredient[] = ['barley', 'hops', 'water', 'yeast', 'fruit'];

/** Ground codes as drawn. -1 is unexplored. */
export const GROUNDS = ['fields', 'hops', 'hills', 'water', 'orchard', 'town'] as const;
export type Ground = (typeof GROUNDS)[number];

export type Owner = string | null;
export type VenueKind = 'brewhouse' | 'taproom' | 'pub' | 'festival';
export type CourierKind = 'walker' | 'bike' | 'cargo';
export type PlotKind = 'barleyField' | 'hopTrellis' | 'well' | 'orchard';

/** A reason an option is unavailable, as an English string key. */
export type Blocked = string | null;
export type Cost = {
  coins?: number;
  knowledge?: number;
  ingredients?: Partial<Record<Ingredient, number>>;
};

export type Venue = {
  at: number;
  owner: Owner;
  kind: VenueKind;
  level: number;
  /** Tiles this venue serves (its neighbourhood), drawn as its border. */
  reach: number[];
  growth?: { value: number; max: number };
  /** Coins this venue adds each turn for its owner. */
  income?: number;
  specialty?: string;
  /** Built venue improvements: 'lab', 'warehouse', 'garden', … */
  improvements?: string[];
  /** Condition. Below max the venue earns and brews nothing until repaired; 0 is breached. */
  durability?: number;
  maxDurability?: number;
  /** Fortification level; slows raids. */
  fortification?: number;
};

/** What is left after a venue is demolished. */
export type Ruin = { at: number; previousKind: VenueKind; rebuilt?: boolean };

export type Incident = {
  round: number;
  at: number;
  kind: 'raid' | 'takeover' | 'destroy' | 'rebuild';
  actor: string;
  target: string | null;
};

/** One courier's move against a rival venue, as the rules price and allow it. */
export type SiegeOption = {
  courier: number;
  action: 'raid' | 'takeover' | 'demolish';
  cost: Cost;
  blocked: Blocked;
  /** Expected durability lost, for raids. */
  damage?: number;
};

export type Plot = { at: number; kind: PlotKind; owner: Owner; venue?: number };

export type Courier = {
  id: number;
  at: number;
  owner: string;
  kind: CourierKind;
  /** Own couriers on your turn: still able to act. */
  ready: boolean;
  /** Standing on a vacant venue it can open this turn. */
  canOpen?: boolean;
  cargo?: { recipe: string; amount: number }[];
  capacity?: number;
  /** Raid strength. */
  strength?: number;
  /** Spent by travel, a raid or a breach until its owner's next turn. */
  exhausted?: boolean;
  /** Carries at least one keg (visible for rivals too). */
  loaded?: boolean;
};

export type Batch = {
  id: string;
  venue: number;
  recipe: string;
  stage: 'ferment' | 'mature' | 'ready';
  turnsLeft: number;
  turnsTotal: number;
  amount: number;
};

export type Option = {
  /** The action option string, e.g. 'brew:paleAle', 'hire:bike', 'expand', 'plot:well'. */
  key: string;
  title: string;
  detail: string;
  cost: Cost;
  /** Turns until done, for queued work. Omitted for instant purchases. */
  turns?: number;
  blocked: Blocked;
};

export type Skill = {
  id: string;
  branch: 'brewing' | 'logistics' | 'hospitality';
  title: string;
  description: string;
  cost: Cost;
  requires: string[];
  state: 'known' | 'open' | 'locked';
  unlocks: string[];
  progress?: { value: number; max: number };
  blocked?: Blocked;
};

export type Contract = {
  id: string;
  venue: number;
  client: string;
  recipe: string;
  amount: number;
  dueRound: number;
  reward: { coins?: number; reputation?: number };
  state: 'open' | 'accepted' | 'delivered' | 'expired';
  holder?: string;
  blocked?: Blocked;
};

export type Standing = {
  player: string;
  reputation?: number;
  venues?: number;
  contracts?: number;
  /** Progress toward each win, 0–1. */
  victory?: Partial<Record<'reputation' | 'festival' | 'network', number>>;
};

export type Gathering = { at: number; venue: number; blocked: Blocked; cost: Cost; gain: string };

export type Realm = {
  coins: number;
  income: number;
  reputation?: number;
  knowledge?: number;
  stock?: Partial<Record<Ingredient, number>>;
};

/** The serializable view the rules send (model.view). */
export type BrewWire = {
  phase: 'setup' | 'play' | 'ended';
  size: number;
  active: string;
  simultaneous: boolean;
  canAct: boolean;
  finished: string[];
  round: number;
  rounds: number;
  ground: number[];
  visible: number[];
  ingredients: { at: number; kind: Ingredient }[];
  venues: Venue[];
  couriers: Courier[];
  plots?: Plot[];
  reach: { id: number; tiles: number[]; paths?: Record<number, number[]> }[];
  realm: Realm | null;
  alive: string[];
  winners: string[];
  scores: Record<string, number>;
  production: { at: number; options: Option[] }[];
  upgrades: { at: number; options: Option[] }[];
  gathering: Gathering[];
  skills: Skill[];
  batches?: Batch[];
  contracts?: Contract[];
  standings?: Standing[];
  /** The win path that ended the match, once it ended. */
  victory?: string | null;
  ruins?: Ruin[];
  incidents?: Incident[];
  /** Rival venue or plot tile → your couriers' raid/takeover/demolish options. */
  siege?: { at: number; options: SiegeOption[] }[];
  /** Own venue tile → repair/fortify options (keys 'repair', 'fortify'). */
  defense?: { at: number; options: Option[] }[];
  /** Ruin tile → couriers that can rebuild it now. */
  rebuilds?: { at: number; courier: number; cost: Cost; blocked: Blocked }[];
};

/** The same view indexed for drawing. */
export type BrewView = Omit<
  BrewWire,
  'visible' | 'reach' | 'production' | 'upgrades' | 'gathering' | 'siege' | 'defense'
> & {
  siege?: ReadonlyMap<number, SiegeOption[]>;
  defense?: ReadonlyMap<number, Option[]>;
  visible: ReadonlySet<number>;
  reach: ReadonlyMap<number, { tiles: number[]; paths?: Record<number, number[]> }>;
  production: ReadonlyMap<number, Option[]>;
  upgrades: ReadonlyMap<number, Option[]>;
  gathering: ReadonlyMap<number, Gathering>;
};

/** What the panels can ask for. Each resolves true when the rules accepted it. */
export type Intents = {
  endTurn?: () => Promise<boolean>;
  travel?: (courier: number, at: number) => Promise<boolean>;
  gather?: (at: number) => Promise<boolean>;
  produce?: (venue: number, option: string) => Promise<boolean>;
  /** Venue improvements, or plots when `venue` is a plain tile. */
  upgrade?: (venue: number, option: string) => Promise<boolean>;
  open?: (courier: number) => Promise<boolean>;
  learn?: (skill: string) => Promise<boolean>;
  accept?: (contract: string) => Promise<boolean>;
  load?: (courier: number, venue: number, recipe: string, amount: number) => Promise<boolean>;
  deliver?: (courier: number, contract: string) => Promise<boolean>;
  raid?: (courier: number, at: number) => Promise<boolean>;
  breach?: (courier: number, at: number, mode: 'takeover' | 'demolish') => Promise<boolean>;
  repair?: (venue: number) => Promise<boolean>;
  fortify?: (venue: number) => Promise<boolean>;
  rebuild?: (courier: number, at: number) => Promise<boolean>;
};

export function indexView(wire: BrewWire): BrewView {
  return {
    ...wire,
    visible: new Set(wire.visible),
    reach: new Map(wire.reach.map(({ id, tiles, paths }) => [id, { tiles, paths }])),
    production: new Map(wire.production.map(({ at, options }) => [at, options])),
    upgrades: new Map(wire.upgrades.map(({ at, options }) => [at, options])),
    gathering: new Map(wire.gathering.map((item) => [item.at, item])),
    siege: wire.siege && new Map(wire.siege.map(({ at, options }) => [at, options])),
    defense: wire.defense && new Map(wire.defense.map(({ at, options }) => [at, options])),
  };
}
