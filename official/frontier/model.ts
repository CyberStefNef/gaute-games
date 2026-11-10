import { graph, adjacent, homeTiles, distancesFrom, nearTiles } from './planet-rules';
import { invalid, type Mode } from '@gaute/games-sdk/logic';
import {
  COURIERS,
  RECIPES,
  SKILLS,
  PLOTS,
  INGREDIENTS,
  type Cost,
  type CourierKind,
  type Recipe,
  type Skill,
  type Stock,
  type PlotKind,
} from './systems.ts';
export { COURIERS, RECIPES, SKILLS, PLOTS } from './systems.ts';
export type Realm = {
  coins: number;
  knowledge: number;
  reputation: number;
  stock: Stock;
  tech: Skill[];
  explored: string;
  active: boolean;
  delivered: number;
  festivals: number;
  styles: Recipe[];
  gathered: number[];
};
export type Venue = {
  at: number;
  owner: string | null;
  kind: 'brewhouse' | 'taproom' | 'pub' | 'festival';
  level: number;
  upgrades: string[];
  damage: number;
  repairedRound: number;
};
export type Courier = {
  id: number;
  at: number;
  owner: string;
  kind: CourierKind;
  ready: boolean;
  cargo: { recipe: Recipe; amount: number }[];
  deliveries: number;
};
export type Batch = {
  id: string;
  owner: string;
  venue: number;
  recipe: Recipe;
  turnsLeft: number;
  turnsTotal: number;
  amount: number;
  stage: 'ferment' | 'mature' | 'ready';
};
export type Contract = {
  id: string;
  venue: number;
  client: string;
  recipe: Recipe;
  amount: number;
  dueRound: number;
  reward: { coins: number; reputation: number };
  state: 'open' | 'accepted' | 'delivered' | 'expired';
  holder: string | null;
};
export type Plot = { at: number; owner: string; kind: PlotKind; venue: number };
export type State = {
  phase: 'setup' | 'play' | 'ended';
  mode: Mode;
  players: string[];
  active: string;
  finished: string[];
  size: number;
  round: number;
  rounds: number;
  ground: number[];
  resources: number[];
  venues: Venue[];
  couriers: Courier[];
  realms: Record<string, Realm>;
  plots: Plot[];
  batches: Batch[];
  contracts: Contract[];
  nextId: number;
  winners: string[];
  victory: string | null;
  ruins: { at: number; previousKind: Venue['kind'] }[];
  incidents: {
    round: number;
    at: number;
    kind: 'raid' | 'takeover' | 'destroy' | 'rebuild';
    actor: string;
    target: string | null;
  }[];
};

// Closed planetary topology: every district has five or six neighbours.
export function neighbors(at: number, size: number) {
  return [...adjacent(at, size)];
}
export function distance(a: number, b: number, size: number) {
  return distancesFrom(a, size)[b] ?? Infinity;
}
function radius(at: number, size: number, range: number) {
  return nearTiles(at, size, range);
}
export function visible(state: State, player: string | null) {
  const result = new Set<number>();
  if (!player) return result;
  const sight = state.realms[player]?.tech.includes('wayfinding') ? 4 : 3;
  for (const venue of state.venues)
    if (venue.owner === player) for (const at of radius(venue.at, state.size, 3)) result.add(at);
  for (const courier of state.couriers)
    if (courier.owner === player)
      for (const at of radius(courier.at, state.size, sight)) result.add(at);
  return result;
}
export function discover(state: State) {
  for (const player of state.players) {
    const seen = state.realms[player].explored.split('');
    for (const at of visible(state, player)) seen[at] = '1';
    state.realms[player].explored = seen.join('');
  }
}
export function setup(players: string[], mode: Mode): State {
  return {
    phase: 'setup',
    mode,
    players: [...players],
    active: players[0],
    finished: [],
    size: 12,
    round: 1,
    rounds: 24,
    ground: [],
    resources: [],
    venues: [],
    couriers: [],
    realms: {},
    plots: [],
    batches: [],
    contracts: [],
    nextId: 1,
    winners: [],
    victory: null,
    ruins: [],
    incidents: [],
  };
}
export function canPlay(state: State, player: string | null): player is string {
  return Boolean(
    player &&
    state.phase === 'play' &&
    state.realms[player]?.active &&
    (state.mode === 'phones' ? !state.finished.includes(player) : state.active === player),
  );
}
export function actor(state: State, player: string | null) {
  if (state.phase === 'setup') {
    if (player !== state.active) invalid('Wait for the host to start.');
    return state.active;
  }
  if (!canPlay(state, player))
    invalid(
      state.mode === 'phones' && player && state.finished.includes(player)
        ? 'You are ready. Wait for the next round.'
        : 'Wait for your turn.',
    );
  return player;
}
function connectedRoad(state: State, a: number, b: number) {
  let at = a;
  const distances = distancesFrom(b, state.size);
  state.ground[at] = 0;
  for (let i = 0; at !== b && i < state.size * 3; i++) {
    const options = neighbors(at, state.size).sort((x, y) => distances[x] - distances[y] || x - y);
    at = options[0];
    state.ground[at] = 0;
  }
}
export function start(state: State, size: number, random: () => number) {
  if (state.phase !== 'setup') invalid('The match has already started.');
  state.size = size;
  state.ground = Array.from({ length: graph(size).length }, () => {
    const n = random();
    return n < 0.08 ? 3 : n < 0.2 ? 2 : n < 0.4 ? 1 : n < 0.53 ? 4 : 0;
  });
  const grid = graph(size);
  const homes = homeTiles(size).slice(0, state.players.length);
  const sites = [...homes];
  const desired = Math.max(homes.length + 3, Math.round(grid.length / 22));
  const spacing = Array.from({ length: grid.length }, () => Infinity);
  const include = (site: number) => {
    const distances = distancesFrom(site, size);
    for (let at = 0; at < spacing.length; at++) spacing[at] = Math.min(spacing[at], distances[at]);
  };
  sites.forEach(include);
  while (sites.length < desired) {
    let next = 0;
    for (let at = 1; at < spacing.length; at++) if (spacing[at] > spacing[next]) next = at;
    sites.push(next);
    include(next);
  }
  const middle = sites[homes.length];
  for (const site of sites) {
    connectedRoad(state, site, middle);
    state.ground[site] = 5;
  }
  state.resources = state.ground.map((ground) =>
    ground === 0 ? 1 : ground === 1 ? 2 : ground === 4 ? 5 : ground === 3 ? 3 : 0,
  );
  state.venues = sites.map((at, i) => ({
    at,
    owner: state.players[i] ?? null,
    kind: i < state.players.length ? 'brewhouse' : at === middle ? 'festival' : 'pub',
    level: 1,
    upgrades: [],
    damage: 0,
    repairedRound: 0,
  }));
  for (const [i, player] of state.players.entries()) {
    state.realms[player] = {
      coins: 14,
      knowledge: 3,
      reputation: 0,
      stock: { barley: 5, hops: 3, water: 5, yeast: 3, fruit: 1 },
      tech: [],
      explored: '0'.repeat(grid.length),
      active: true,
      delivered: 0,
      festivals: 0,
      styles: [],
      gathered: [],
    };
    state.couriers.push({
      id: state.nextId++,
      at: homes[i],
      owner: player,
      kind: 'walker',
      ready: true,
      cargo: [],
      deliveries: 0,
    });
    const around = neighbors(homes[i], size);
    const fields: [number, number][] = [
      [0, 1],
      [1, 2],
      [0, 3],
      [4, 5],
    ];
    around.forEach((at, j) => {
      const pair = fields[j % fields.length];
      state.ground[at] = pair[0];
      state.resources[at] = pair[1];
    });
  }
  for (const venue of state.venues) state.resources[venue.at] = 0;
  state.phase = 'play';
  discover(state);
  refreshContracts(state, random);
}
export function income(state: State, player: string) {
  return state.venues.reduce(
    (n, v) => n + (v.owner === player && v.damage === 0 ? v.level + 1 : 0),
    0,
  );
}
export function score(state: State, player: string) {
  const r = state.realms[player];
  return (
    r.reputation +
    r.styles.length * 3 +
    r.tech.length +
    state.venues.filter((v) => v.owner === player).length * 2
  );
}
function requirement(state: State, player: string, cost: Cost) {
  const r = state.realms[player];
  if (r.coins < (cost.coins ?? 0)) return 'Not enough coins.';
  if (r.knowledge < (cost.knowledge ?? 0)) return 'Not enough knowledge.';
  for (const key of INGREDIENTS)
    if (r.stock[key] < (cost.ingredients?.[key] ?? 0)) return 'Not enough ingredients.';
  return null;
}
function pay(state: State, player: string, cost: Cost) {
  const blocked = requirement(state, player, cost);
  if (blocked) invalid(blocked);
  const r = state.realms[player];
  r.coins -= cost.coins ?? 0;
  r.knowledge -= cost.knowledge ?? 0;
  for (const key of INGREDIENTS) r.stock[key] -= cost.ingredients?.[key] ?? 0;
}
function ownVenue(state: State, player: string, at: number) {
  const venue = state.venues.find((v) => v.at === at && v.owner === player);
  if (!venue) invalid('Choose one of your venues.');
  return venue;
}
function ownCourier(state: State, player: string, id: number) {
  const courier = state.couriers.find((c) => c.id === id && c.owner === player);
  if (!courier) invalid('Choose one of your couriers.');
  return courier;
}
export function route(state: State, courier: Courier) {
  if (!courier.ready) return { tiles: [] as number[], paths: {} as Record<number, number[]> };
  const r = state.realms[courier.owner],
    paths: Record<number, number[]> = { [courier.at]: [] };
  let edge = [courier.at];
  for (let step = 0; step < COURIERS[courier.kind].steps; step++) {
    const next: number[] = [];
    for (const at of edge)
      for (const near of neighbors(at, state.size)) {
        if (
          Object.hasOwn(paths, near) ||
          r.explored[near] !== '1' ||
          state.ground[near] === 3 ||
          (state.ground[near] === 2 && !r.tech.includes('wayfinding'))
        )
          continue;
        paths[near] = [...paths[at], near];
        next.push(near);
      }
    edge = next;
  }
  delete paths[courier.at];
  return { tiles: Object.keys(paths).map(Number), paths };
}
export function travel(state: State, player: string, id: number, at: number) {
  const courier = ownCourier(state, player, id);
  if (!route(state, courier).tiles.includes(at))
    invalid('That destination cannot be reached this turn.');
  courier.at = at;
  courier.ready = false;
  discover(state);
}
function nearbyVenue(state: State, player: string, at: number) {
  const near = new Set(radius(at, state.size, 2));
  return state.venues.find((v) => v.owner === player && near.has(v.at));
}
function gatherBlock(
  state: State,
  player: string,
  at: number,
  sight = visible(state, player),
  nearby = nearbyVenue(state, player, at),
) {
  if (!nearby || !sight.has(at) || !state.resources[at]) return 'Gather near one of your venues.';
  if (
    state.realms[player].gathered.length >=
    (state.realms[player].tech.includes('cooperatives') ? 3 : 2)
  )
    return 'Your growers have finished for this turn.';
  if (state.realms[player].gathered.includes(at))
    return 'This patch has already been gathered this turn.';
  return null;
}
export function gather(state: State, player: string, at: number) {
  const blocked = gatherBlock(state, player, at);
  if (blocked) invalid(blocked);
  const kind = INGREDIENTS[state.resources[at] - 1];
  state.realms[player].stock[kind] += 2;
  state.realms[player].gathered.push(at);
}
function recipeCost(state: State, player: string, recipe: Recipe): Cost {
  const spec = RECIPES[recipe];
  const ingredients: Partial<Stock> = { ...spec.ingredients };
  if (state.realms[player].tech.includes('cooperatives'))
    ingredients.barley = Math.max(0, (ingredients.barley ?? 0) - 1);
  return { coins: spec.coins, ingredients };
}
function brewBlock(state: State, player: string, venue: Venue, recipe: Recipe) {
  const spec = RECIPES[recipe];
  if (venue.damage > 0) return 'Repair this venue before production can resume.';
  if (venue.kind !== 'brewhouse') return 'Brew at a brewhouse.';
  if (spec.skill && !state.realms[player].tech.includes(spec.skill))
    return 'Learn the required skill first.';
  if (
    state.batches.filter((b) => b.venue === venue.at && b.stage !== 'ready').length >= venue.level
  )
    return 'All fermentation vessels are occupied.';
  if (state.batches.filter((b) => b.venue === venue.at).length >= 8)
    return 'Load some ready batches before brewing more.';
  return requirement(state, player, recipeCost(state, player, recipe));
}
export function produce(state: State, player: string, at: number, option: string) {
  const venue = ownVenue(state, player, at);
  if (venue.damage > 0) invalid('Repair this venue before production can resume.');
  if (option.startsWith('brew:')) {
    const recipe = option.slice(5);
    if (!Object.hasOwn(RECIPES, recipe)) invalid('Choose a valid recipe.');
    const key = recipe as Recipe;
    const blocked = brewBlock(state, player, venue, key);
    if (blocked) invalid(blocked);
    pay(state, player, recipeCost(state, player, key));
    const spec = RECIPES[key];
    state.batches.push({
      id: `b${state.nextId++}`,
      owner: player,
      venue: at,
      recipe: key,
      turnsLeft: spec.turns,
      turnsTotal: spec.turns,
      amount: spec.amount,
      stage: 'ferment',
    });
    return;
  }
  if (option.startsWith('hire:')) {
    const kind = option.slice(5);
    if (!Object.hasOwn(COURIERS, kind)) invalid('Choose a valid courier.');
    const key = kind as CourierKind,
      spec = COURIERS[key];
    if (spec.skill && !state.realms[player].tech.includes(spec.skill))
      invalid('Learn the required skill first.');
    if (state.couriers.filter((c) => c.owner === player).length >= 12)
      invalid('Your delivery team is full.');
    pay(state, player, { coins: spec.coins });
    state.couriers.push({
      id: state.nextId++,
      at,
      owner: player,
      kind: key,
      ready: false,
      cargo: [],
      deliveries: 0,
    });
    discover(state);
    return;
  }
  if (option === 'culture') {
    if (!state.realms[player].tech.includes('wildyeast'))
      invalid('Learn the required skill first.');
    pay(state, player, { coins: 2, ingredients: { water: 1 } });
    state.realms[player].stock.yeast += 2;
    return;
  }
  invalid('Choose a valid production option.');
}
export function upgrade(state: State, player: string, at: number, option: string) {
  if (option.startsWith('plot:')) {
    const name = option.slice(5);
    if (!Object.hasOwn(PLOTS, name)) invalid('Choose a valid plot.');
    const kind = name as PlotKind,
      spec = PLOTS[kind];
    const venue = nearbyVenue(state, player, at);
    if (
      !venue ||
      !visible(state, player).has(at) ||
      state.ground[at] !== spec.ground ||
      state.venues.some((v) => v.at === at) ||
      state.plots.some((p) => p.at === at)
    )
      invalid('Choose a suitable empty tile near your venue.');
    if (spec.skill && !state.realms[player].tech.includes(spec.skill))
      invalid('Learn the required skill first.');
    pay(state, player, { coins: spec.coins });
    state.plots.push({ at, owner: player, kind, venue: venue.at });
    return;
  }
  const venue = ownVenue(state, player, at);
  if (option === 'expand') {
    if (venue.level >= 3) invalid('This venue is fully expanded.');
    pay(state, player, { coins: 8 + venue.level * 4 });
    venue.level++;
    return;
  }
  const upgrades = {
    lab: { coins: 6, skill: 'hopcraft' },
    warehouse: { coins: 7, skill: 'coldchain' },
    garden: { coins: 6, skill: 'gardens' },
  } as const;
  if (!Object.hasOwn(upgrades, option)) invalid('Choose a valid upgrade.');
  const spec = upgrades[option as keyof typeof upgrades];
  if (venue.upgrades.includes(option)) invalid('This improvement is already built.');
  if (!state.realms[player].tech.includes(spec.skill)) invalid('Learn the required skill first.');
  pay(state, player, { coins: spec.coins });
  venue.upgrades.push(option);
}
export function learn(state: State, player: string, skill: Skill) {
  const spec = SKILLS[skill],
    r = state.realms[player];
  if (r.tech.includes(skill)) invalid('This skill is already known.');
  if (!spec.requires.every((key) => r.tech.includes(key as Skill)))
    invalid('Learn the required skill first.');
  pay(state, player, { coins: spec.coins, knowledge: spec.knowledge });
  r.tech.push(skill);
  discover(state);
}
export function open(state: State, player: string, id: number) {
  const courier = ownCourier(state, player, id),
    venue = state.venues.find((v) => v.at === courier.at && v.owner === null && v.kind === 'pub');
  if (!venue) invalid('Bring a courier to a vacant pub.');
  if (!state.realms[player].tech.includes('welcome')) invalid('Learn neighbourhood welcome first.');
  pay(state, player, { coins: 10 });
  venue.owner = player;
  venue.kind = 'taproom';
  venue.damage = 0;
  discover(state);
  checkVictory(state);
}
export function accept(state: State, player: string, id: string) {
  const contract = state.contracts.find((c) => c.id === id && c.state === 'open');
  if (!contract || !visible(state, player).has(contract.venue))
    invalid('Choose an available local contract.');
  if (state.contracts.filter((c) => c.state === 'accepted' && c.holder === player).length >= 3)
    invalid('Finish one of your three contracts first.');
  contract.state = 'accepted';
  contract.holder = player;
}
export function load(
  state: State,
  player: string,
  id: number,
  at: number,
  recipe: Recipe,
  amount: number,
) {
  const courier = ownCourier(state, player, id);
  ownVenue(state, player, at);
  if (courier.at !== at) invalid('Bring the courier to this venue to load.');
  if (courier.cargo.reduce((n, c) => n + c.amount, 0) + amount > COURIERS[courier.kind].capacity)
    invalid('The courier cannot carry that many kegs.');
  const ready = state.batches.filter(
    (b) => b.owner === player && b.venue === at && b.recipe === recipe && b.stage === 'ready',
  );
  if (ready.reduce((n, b) => n + b.amount, 0) < amount)
    invalid('Wait for enough kegs to finish maturing.');
  let remaining = amount;
  for (const batch of ready) {
    const take = Math.min(remaining, batch.amount);
    batch.amount -= take;
    remaining -= take;
  }
  state.batches = state.batches.filter((b) => b.amount > 0);
  const cargo = courier.cargo.find((c) => c.recipe === recipe);
  if (cargo) cargo.amount += amount;
  else courier.cargo.push({ recipe, amount });
}
export function deliver(state: State, player: string, id: number, contractId: string) {
  const courier = ownCourier(state, player, id),
    contract = state.contracts.find(
      (c) => c.id === contractId && c.state === 'accepted' && c.holder === player,
    );
  if (!contract || contract.venue !== courier.at)
    invalid('Bring this contract to its destination.');
  const cargo = courier.cargo.find((c) => c.recipe === contract.recipe);
  if (!cargo || cargo.amount < contract.amount) invalid('Load the recipe and quantity requested.');
  cargo.amount -= contract.amount;
  courier.cargo = courier.cargo.filter((c) => c.amount > 0);
  courier.deliveries++;
  contract.state = 'delivered';
  const r = state.realms[player];
  r.coins += contract.reward.coins;
  r.reputation += contract.reward.reputation + (r.tech.includes('tasting') ? 2 : 0);
  r.delivered++;
  if (!r.styles.includes(contract.recipe)) r.styles.push(contract.recipe);
  if (state.venues.some((v) => v.at === contract.venue && v.kind === 'festival')) {
    r.festivals++;
    if (r.tech.includes('festivals')) r.reputation += 3;
  }
  checkVictory(state);
}
function refreshContracts(state: State, random: () => number) {
  // Keep at most eight recent completed/expired records and one live request per destination.
  const history = state.contracts
    .filter((c) => c.state === 'delivered' || c.state === 'expired')
    .slice(-8);
  state.contracts = [
    ...history,
    ...state.contracts.filter((c) => c.state === 'open' || c.state === 'accepted'),
  ];
  for (const venue of state.venues.filter((v) => v.kind !== 'brewhouse')) {
    if (
      state.contracts.some(
        (c) => c.venue === venue.at && (c.state === 'open' || c.state === 'accepted'),
      )
    )
      continue;
    const known = Object.keys(RECIPES) as Recipe[];
    const available = known.filter(
      (recipe) =>
        !RECIPES[recipe].skill ||
        state.players.some((p) => state.realms[p].tech.includes(RECIPES[recipe].skill as Skill)),
    );
    // Always keep basic orders in circulation so a specialised player cannot lock others out.
    const recipe =
      random() < 0.55 ? 'houseAle' : available[Math.floor(random() * available.length)];
    state.contracts.push({
      id: `c${state.nextId++}`,
      venue: venue.at,
      client: venue.kind === 'festival' ? 'Neighbourhood festival' : 'Local taproom',
      recipe,
      amount: recipe === 'houseAle' ? 2 : 3,
      dueRound: state.round + 8,
      reward: {
        coins: recipe === 'houseAle' ? 7 : 11,
        reputation: venue.kind === 'festival' ? 8 : 5,
      },
      state: 'open',
      holder: null,
    });
  }
}
export function checkVictory(state: State) {
  const owners = [
    ...new Set(
      state.venues.filter((v) => v.owner && state.realms[v.owner].active).map((v) => v.owner!),
    ),
  ];
  if (owners.length === 1 && state.players.filter((p) => state.realms[p].active).length > 1) {
    state.phase = 'ended';
    state.winners = owners;
    state.victory = 'takeover';
    return;
  }

  const active = state.players.filter((p) => state.realms[p].active);
  for (const p of active) {
    const r = state.realms[p];
    const venues = state.venues.filter((v) => v.owner === p).length;
    const victory =
      r.reputation >= 60
        ? 'reputation'
        : r.festivals >= 3 && r.reputation >= 30
          ? 'festival'
          : venues >= 5 && r.delivered >= 8
            ? 'network'
            : null;
    if (victory) {
      state.phase = 'ended';
      state.winners = [p];
      state.victory = victory;
      return;
    }
  }
  if (active.length <= 1 || state.round > state.rounds) {
    state.phase = 'ended';
    const best = Math.max(...active.map((p) => score(state, p)));
    state.winners = active.filter((p) => score(state, p) === best);
    state.victory = 'season';
  }
}
export function nextTurn(state: State, random: () => number, player = state.active) {
  if (state.mode === 'phones') {
    state.finished.push(player);
    advanceRound(state, random);
    return;
  }
  const current = state.players.indexOf(state.active);
  for (let offset = 1; offset <= state.players.length; offset++) {
    const index = (current + offset) % state.players.length;
    if (!state.realms[state.players[index]].active) continue;
    if (index <= current) state.round++;
    state.active = state.players[index];
    break;
  }
  checkVictory(state);
  if (state.phase === 'ended') return;
  refreshRealm(state, state.active);
  finishRound(state, random);
}
function advanceRound(state: State, random: () => number) {
  const players = state.players.filter((p) => state.realms[p].active);
  if (!players.every((p) => state.finished.includes(p))) return;
  state.round++;
  state.finished = [];
  checkVictory(state);
  if (state.phase === 'ended') return;
  for (const player of players) refreshRealm(state, player);
  finishRound(state, random);
}
function refreshRealm(state: State, player: string) {
  const r = state.realms[player];
  r.coins += income(state, player);
  r.knowledge += 1;
  r.gathered = [];
  for (const venue of state.venues.filter((v) => v.owner === player && v.damage === 0)) {
    if (venue.upgrades.includes('lab')) r.knowledge += 2;
    if (venue.upgrades.includes('garden')) r.reputation++;
  }
  for (const plot of state.plots.filter(
    (p) => p.owner === player && state.venues.some((v) => v.at === p.venue && v.damage === 0),
  ))
    r.stock[PLOTS[plot.kind].ingredient] += 2;
  // A small reusable house culture keeps the basic recipe sustainable.
  r.stock.yeast++;
  const cap = state.venues.some((v) => v.owner === player && v.upgrades.includes('warehouse'))
    ? 40
    : 20;
  for (const ingredient of INGREDIENTS) r.stock[ingredient] = Math.min(cap, r.stock[ingredient]);
  for (const batch of state.batches.filter(
    (b) =>
      b.owner === player &&
      b.stage !== 'ready' &&
      state.venues.some((v) => v.at === b.venue && v.damage === 0),
  )) {
    batch.turnsLeft--;
    batch.stage = batch.turnsLeft <= 0 ? 'ready' : batch.turnsLeft === 1 ? 'mature' : 'ferment';
  }
  for (const courier of state.couriers) if (courier.owner === player) courier.ready = true;
}
function finishRound(state: State, random: () => number) {
  // Deadlines are whole rounds: every player gets the same chance in the due round.
  for (const contract of state.contracts)
    if (
      (contract.state === 'accepted' || contract.state === 'open') &&
      contract.dueRound < state.round
    )
      contract.state = 'expired';
  refreshContracts(state, random);
  discover(state);
  checkVictory(state);
}
export function leave(state: State, player: string, random: () => number = () => 0) {
  if (state.phase === 'setup') {
    state.players = state.players.filter((p) => p !== player);
    state.active = state.players[0];
    return;
  }
  state.realms[player].active = false;
  state.couriers = state.couriers.filter((c) => c.owner !== player);
  state.batches = state.batches.filter((b) => b.owner !== player);
  state.plots = state.plots.filter((p) => p.owner !== player);
  for (const venue of state.venues)
    if (venue.owner === player) {
      venue.owner = null;
      venue.kind = 'pub';
      venue.upgrades = [];
    }
  for (const contract of state.contracts)
    if (contract.holder === player && contract.state === 'accepted') {
      contract.holder = null;
      contract.state = 'open';
    }
  const wasActive = state.active === player;
  checkVictory(state);
  if (state.phase === 'play') {
    if (state.mode === 'phones') advanceRound(state, random);
    else if (wasActive) nextTurn(state, random);
  }
}

export function view(state: State, player: string | null) {
  const r = player ? state.realms[player] : undefined,
    sight = visible(state, player),
    canAct = canPlay(state, player);
  const own = state.venues.filter((v) => v.owner === player),
    team = state.couriers.filter((c) => c.owner === player);
  const service = new Map<number, Venue>();
  for (const venue of own)
    for (const at of radius(venue.at, state.size, 2)) if (!service.has(at)) service.set(at, venue);
  const options = (venue: Venue) => [
    ...Object.entries(RECIPES)
      .filter(() => venue.kind === 'brewhouse')
      .map(([key, spec]) => ({
        key: `brew:${key}`,
        title: spec.title,
        detail: 'Ferment a batch, then load it for delivery.',
        cost: recipeCost(state, player!, key as Recipe),
        turns: spec.turns,
        blocked: brewBlock(state, player!, venue, key as Recipe),
        art: { recipe: key },
      })),
    ...Object.entries(COURIERS).map(([key, spec]) => ({
      key: `hire:${key}`,
      title: key === 'walker' ? 'Walking courier' : key === 'bike' ? 'Delivery bike' : 'Cargo cart',
      detail: 'A new courier joins next turn.',
      cost: { coins: spec.coins },
      blocked:
        spec.skill && !r!.tech.includes(spec.skill)
          ? 'Learn the required skill first.'
          : team.length >= 12
            ? 'Your delivery team is full.'
            : requirement(state, player!, { coins: spec.coins }),
      art: { courier: key as CourierKind },
    })),
    ...(r!.tech.includes('wildyeast')
      ? [
          {
            key: 'culture',
            title: 'Yeast culture',
            detail: 'Create two yeast using one water.',
            cost: { coins: 2, ingredients: { water: 1 } },
            blocked: requirement(state, player!, { coins: 2, ingredients: { water: 1 } }),
          },
        ]
      : []),
  ];
  const improvements = (venue: Venue) => [
    {
      key: 'expand',
      title: 'Expand venue',
      detail: 'Add income and another fermentation vessel.',
      cost: { coins: 8 + venue.level * 4 },
      blocked:
        venue.level >= 3
          ? 'This venue is fully expanded.'
          : requirement(state, player!, { coins: 8 + venue.level * 4 }),
    },
    ...[
      {
        key: 'lab',
        title: 'Yeast laboratory',
        detail: 'Gain two extra knowledge each turn.',
        skill: 'hopcraft',
        coins: 6,
      },
      {
        key: 'warehouse',
        title: 'Warehouse',
        detail: 'Raise ingredient storage from 20 to 40.',
        skill: 'coldchain',
        coins: 7,
      },
      {
        key: 'garden',
        title: 'Beer garden',
        detail: 'Gain one reputation each turn.',
        skill: 'gardens',
        coins: 6,
      },
    ].map((spec) => ({
      key: spec.key,
      title: spec.title,
      detail: spec.detail,
      cost: { coins: spec.coins },
      blocked: venue.upgrades.includes(spec.key)
        ? 'This improvement is already built.'
        : !r!.tech.includes(spec.skill as Skill)
          ? 'Learn the required skill first.'
          : requirement(state, player!, { coins: spec.coins }),
    })),
  ];
  const plots = player
    ? [...sight].flatMap((at) => {
        if (
          !service.has(at) ||
          state.venues.some((v) => v.at === at) ||
          state.plots.some((p) => p.at === at)
        )
          return [];
        const options = Object.entries(PLOTS)
          .filter(([, spec]) => spec.ground === state.ground[at])
          .map(([kind, spec]) => ({
            key: `plot:${kind}`,
            title: spec.title,
            detail: 'Produce two ingredients automatically each turn.',
            cost: { coins: spec.coins },
            blocked:
              spec.skill && !r!.tech.includes(spec.skill)
                ? 'Learn the required skill first.'
                : requirement(state, player, { coins: spec.coins }),
          }));
        return options.length ? [{ at, options }] : [];
      })
    : [];
  return {
    phase: state.phase,
    active: state.active,
    simultaneous: state.mode === 'phones',
    canAct,
    finished: state.finished.filter((p) => state.realms[p]?.active),
    size: state.size,
    round: state.round,
    rounds: state.rounds,
    ground: state.ground.map((ground, at) => (r?.explored[at] === '1' ? ground : -1)),
    visible: [...sight],
    ingredients: state.resources.flatMap((kind, at) =>
      kind && sight.has(at) ? [{ at, kind: INGREDIENTS[kind - 1] }] : [],
    ),
    venues: state.venues
      .filter((v) => sight.has(v.at))
      .map((v) => ({
        at: v.at,
        owner: v.owner,
        kind: v.kind,
        level: v.level,
        durability: Math.max(0, maxDurability(v) - v.damage),
        maxDurability: maxDurability(v),
        fortified: v.upgrades.includes('fortified'),
        canRepair: v.owner === player && v.damage > 0 && v.repairedRound !== state.round,
        reach: radius(v.at, state.size, 2),
        income: v.owner === player ? (v.damage === 0 ? v.level + 1 : 0) : undefined,
        specialty: v.owner === player ? v.upgrades.join(', ') : undefined,
      })),
    couriers: state.couriers
      .filter((c) => sight.has(c.at))
      .map((c) => ({
        ...c,
        cargo: c.owner === player ? c.cargo : [],
        capacity: COURIERS[c.kind].capacity,
        strength: raidStrength(c),
        exhausted: !c.ready,
        loaded: c.cargo.some((item) => item.amount > 0),
        canOpen:
          c.owner === player &&
          r?.tech.includes('welcome') &&
          state.venues.some((v) => v.at === c.at && v.kind === 'pub' && v.owner === null) &&
          r.coins >= 10,
      })),
    reach: canAct ? team.map((c) => ({ id: c.id, ...route(state, c) })) : [],
    realm:
      r && player
        ? {
            coins: r.coins,
            income: income(state, player),
            reputation: r.reputation,
            knowledge: r.knowledge,
            stock: r.stock,
          }
        : null,
    production: player ? own.map((v) => ({ at: v.at, options: options(v) })) : [],
    upgrades: player ? [...own.map((v) => ({ at: v.at, options: improvements(v) })), ...plots] : [],
    gathering: player
      ? [...sight]
          .filter((at) => state.resources[at] && service.has(at))
          .map((at) => ({
            at,
            venue: service.get(at)!.at,
            blocked: gatherBlock(state, player, at, sight, service.get(at)),
            cost: {},
            gain: `+2 ${INGREDIENTS[state.resources[at] - 1]}`,
          }))
      : [],
    skills:
      r && player
        ? Object.entries(SKILLS).map(([id, spec]) => ({
            id,
            branch: spec.branch,
            title: spec.title,
            description: spec.description,
            cost: { coins: spec.coins, knowledge: spec.knowledge },
            blocked: requirement(state, player, { coins: spec.coins, knowledge: spec.knowledge }),
            requires: [...spec.requires],
            state: r!.tech.includes(id as Skill)
              ? ('known' as const)
              : spec.requires.every((key) => r!.tech.includes(key as Skill))
                ? ('open' as const)
                : ('locked' as const),
            unlocks: [...spec.unlocks],
          }))
        : [],
    batches: player
      ? state.batches
          .filter((b) => b.owner === player)
          .map((b) => ({
            id: b.id,
            venue: b.venue,
            recipe: b.recipe,
            stage: b.stage,
            turnsLeft: b.turnsLeft,
            turnsTotal: b.turnsTotal,
            amount: b.amount,
          }))
      : [],
    contracts: state.contracts
      .filter((c) => player && (sight.has(c.venue) || c.holder === player))
      .map((c) => ({ ...c, holder: c.holder ?? undefined })),
    plots: state.plots.filter((p) => sight.has(p.at)),
    ruins: state.ruins.filter((r) => sight.has(r.at)),
    incidents: state.incidents.filter((event) => sight.has(event.at)),
    standings: state.players
      .filter((p) => state.realms[p]?.active)
      .map((p) => {
        const r = state.realms[p],
          venues = state.venues.filter((v) => v.owner === p).length;
        return {
          player: p,
          reputation: r.reputation,
          venues,
          contracts: r.delivered,
          victory: {
            reputation: r.reputation / 60,
            festival: Math.min(r.festivals / 3, r.reputation / 30),
            network: Math.min(venues / 5, r.delivered / 8),
          },
        };
      }),
    alive: state.players.filter((p) => state.realms[p]?.active),
    winners: state.winners,
    scores:
      state.phase === 'ended'
        ? Object.fromEntries(state.players.map((p) => [p, score(state, p)]))
        : {},
    victory: state.victory,
  };
}

export function maxDurability(venue: Venue) {
  return 6 + venue.level * 2 + (venue.upgrades.includes('fortified') ? 4 : 0);
}
export function raidStrength(courier: Courier) {
  return courier.kind === 'cargo' ? 5 : courier.kind === 'bike' ? 3 : 4;
}
function incident(
  state: State,
  at: number,
  kind: State['incidents'][number]['kind'],
  actor: string,
  target: string | null,
) {
  state.incidents.push({ round: state.round, at, kind, actor, target });
  state.incidents = state.incidents.slice(-12);
}
function raider(state: State, player: string, id: number, at: number) {
  const courier = ownCourier(state, player, id);
  if (!courier.ready) invalid('This crew has already travelled or acted this turn.');
  if (
    (courier.at !== at && !neighbors(courier.at, state.size).includes(at)) ||
    !visible(state, player).has(at)
  )
    invalid('Bring a ready crew beside the target.');
  return courier;
}
export function raid(state: State, player: string, id: number, at: number) {
  const courier = raider(state, player, id, at);
  const venue = state.venues.find((v) => v.at === at && v.owner !== null && v.owner !== player);
  const plot = state.plots.find((p) => p.at === at && p.owner !== player);
  if (!venue && !plot) invalid('Choose a rival venue or ingredient plot.');
  if (venue && venue.damage >= maxDurability(venue))
    invalid('This venue is breached. Choose takeover or demolition.');
  const keg = courier.cargo.find((item) => item.amount > 0);
  if (!keg) invalid('Load a keg to supply this raid.');
  pay(state, player, { coins: 2 });
  keg.amount--;
  courier.cargo = courier.cargo.filter((item) => item.amount > 0);
  courier.ready = false;
  if (venue) {
    const defenders = Math.min(
      2,
      state.couriers.filter((c) => c.owner === venue.owner && c.ready && c.at === at).length,
    );
    venue.damage = Math.min(
      maxDurability(venue),
      venue.damage + Math.max(1, raidStrength(courier) - defenders),
    );
    incident(state, at, 'raid', player, venue.owner);
  } else if (plot) {
    state.plots = state.plots.filter((p) => p.at !== at);
    state.resources[at] = 0;
    incident(state, at, 'destroy', player, plot.owner);
  }
  discover(state);
}
export function breach(
  state: State,
  player: string,
  id: number,
  at: number,
  mode: 'takeover' | 'demolish',
) {
  const courier = raider(state, player, id, at),
    venue = state.venues.find((v) => v.at === at && v.owner !== null && v.owner !== player);
  if (!venue || venue.damage < maxDurability(venue))
    invalid('Breach a rival venue with raids first.');
  pay(state, player, { coins: mode === 'takeover' ? 8 : 3 });
  const previous = venue.owner;
  state.batches = state.batches.filter((b) => b.venue !== at);
  if (mode === 'takeover') {
    venue.owner = player;
    venue.damage = 0;
    venue.upgrades = venue.upgrades.filter((key) => key !== 'fortified');
    venue.repairedRound = state.round;
    for (const plot of state.plots) if (plot.venue === at) plot.owner = player;
    incident(state, at, 'takeover', player, previous);
  } else {
    state.venues = state.venues.filter((v) => v.at !== at);
    state.plots = state.plots.filter((p) => p.venue !== at);
    state.ruins.push({ at, previousKind: venue.kind });
    for (const contract of state.contracts)
      if (contract.venue === at && (contract.state === 'accepted' || contract.state === 'open'))
        contract.state = 'expired';
    incident(state, at, 'destroy', player, previous);
  }
  courier.ready = false;
  discover(state);
  checkVictory(state);
}
export function repair(state: State, player: string, at: number) {
  const venue = ownVenue(state, player, at);
  if (venue.damage === 0) invalid('This venue needs no repairs.');
  if (venue.repairedRound === state.round) invalid('This venue was already repaired this round.');
  pay(state, player, { coins: 4 });
  venue.damage = Math.max(0, venue.damage - 4);
  venue.repairedRound = state.round;
}
export function fortify(state: State, player: string, at: number) {
  const venue = ownVenue(state, player, at);
  if (venue.upgrades.includes('fortified')) invalid('This venue is already reinforced.');
  pay(state, player, { coins: 6 });
  venue.upgrades.push('fortified');
}
export function rebuild(state: State, player: string, id: number, at: number) {
  const courier = raider(state, player, id, at);
  const ruin = state.ruins.find((r) => r.at === at);
  if (!ruin) invalid('Choose the ruins of a destroyed venue.');
  pay(state, player, { coins: 10 });
  state.venues.push({
    at,
    owner: player,
    kind: ruin.previousKind === 'brewhouse' ? 'brewhouse' : 'taproom',
    level: 1,
    upgrades: [],
    damage: 0,
    repairedRound: 0,
  });
  state.ruins = state.ruins.filter((r) => r.at !== at);
  courier.ready = false;
  incident(state, at, 'rebuild', player, null);
  discover(state);
}
