// Original Brewtown economy. All costs and turn durations are game values.
export const INGREDIENTS = ['barley', 'hops', 'water', 'yeast', 'fruit'] as const;
export type Ingredient = (typeof INGREDIENTS)[number];
export type Stock = Record<Ingredient, number>;
export type Cost = { coins?: number; knowledge?: number; ingredients?: Partial<Stock> };
export const COURIERS = {
  walker: { coins: 4, steps: 3, capacity: 2, skill: '' },
  bike: { coins: 7, steps: 5, capacity: 4, skill: 'cycleways' },
  cargo: { coins: 10, steps: 4, capacity: 6, skill: 'coldchain' },
} as const;
export type CourierKind = keyof typeof COURIERS;
export const RECIPES = {
  houseAle: {
    title: 'House ale',
    skill: '',
    coins: 2,
    turns: 2,
    amount: 2,
    ingredients: { barley: 2, water: 2, yeast: 1 },
  },
  paleAle: {
    title: 'Hoppy pale ale',
    skill: 'hopcraft',
    coins: 3,
    turns: 3,
    amount: 3,
    ingredients: { barley: 2, hops: 2, water: 2, yeast: 1 },
  },
  lager: {
    title: 'Cold lager',
    skill: 'coldferment',
    coins: 3,
    turns: 4,
    amount: 4,
    ingredients: { barley: 3, water: 3, yeast: 1 },
  },
  orchardSour: {
    title: 'Orchard sour',
    skill: 'wildyeast',
    coins: 4,
    turns: 3,
    amount: 3,
    ingredients: { barley: 1, fruit: 2, water: 2, yeast: 1 },
  },
  barrelReserve: {
    title: 'Barrel reserve',
    skill: 'barrelcraft',
    coins: 5,
    turns: 5,
    amount: 4,
    ingredients: { barley: 3, hops: 1, fruit: 1, water: 2, yeast: 2 },
  },
} as const;
export type Recipe = keyof typeof RECIPES;
type SkillSpec = {
  title: string;
  branch: 'brewing' | 'logistics' | 'hospitality';
  coins: number;
  knowledge: number;
  requires: readonly string[];
  description: string;
  unlocks: readonly string[];
};
export const SKILLS = {
  hopcraft: {
    title: 'Hop craft',
    branch: 'brewing',
    coins: 3,
    knowledge: 3,
    requires: [],
    description: 'Develop hoppy pale ale and cultivate hop trellises.',
    unlocks: ['Hoppy pale ale', 'Hop trellises'],
  },
  coldferment: {
    title: 'Cold fermentation',
    branch: 'brewing',
    coins: 5,
    knowledge: 5,
    requires: ['hopcraft'],
    description: 'Slow fermentation produces larger lager batches.',
    unlocks: ['Cold lager'],
  },
  wildyeast: {
    title: 'Wild yeast',
    branch: 'brewing',
    coins: 4,
    knowledge: 5,
    requires: ['hopcraft'],
    description: 'Brew orchard sour and replenish yeast cultures.',
    unlocks: ['Orchard sour', 'Yeast cultures'],
  },
  barrelcraft: {
    title: 'Barrel craft',
    branch: 'brewing',
    coins: 7,
    knowledge: 8,
    requires: ['coldferment', 'wildyeast'],
    description: 'Combine both brewing branches in a long-matured reserve.',
    unlocks: ['Barrel reserve'],
  },
  wayfinding: {
    title: 'Wayfinding',
    branch: 'logistics',
    coins: 2,
    knowledge: 2,
    requires: [],
    description: 'Couriers reveal a wider neighbourhood and can cross hills.',
    unlocks: ['Hill routes', 'Wider vision'],
  },
  cycleways: {
    title: 'Cycleways',
    branch: 'logistics',
    coins: 4,
    knowledge: 4,
    requires: ['wayfinding'],
    description: 'Hire faster cargo bikes to connect distant pubs.',
    unlocks: ['Delivery bikes'],
  },
  coldchain: {
    title: 'Cold chain',
    branch: 'logistics',
    coins: 6,
    knowledge: 6,
    requires: ['cycleways'],
    description: 'Cargo carts carry six kegs and unlock warehouse storage.',
    unlocks: ['Cargo carts', 'Warehouses'],
  },
  cooperatives: {
    title: 'Cooperatives',
    branch: 'logistics',
    coins: 6,
    knowledge: 7,
    requires: ['coldchain'],
    description: 'Shared procurement reduces every batch ingredient cost by one barley.',
    unlocks: ['Efficient procurement'],
  },
  welcome: {
    title: 'Neighbourhood welcome',
    branch: 'hospitality',
    coins: 3,
    knowledge: 2,
    requires: [],
    description: 'Open vacant taprooms and serve their neighbourhoods.',
    unlocks: ['New taprooms'],
  },
  gardens: {
    title: 'Beer gardens',
    branch: 'hospitality',
    coins: 4,
    knowledge: 4,
    requires: ['welcome'],
    description: 'Build gardens that earn reputation each turn.',
    unlocks: ['Beer gardens'],
  },
  tasting: {
    title: 'Tasting room',
    branch: 'hospitality',
    coins: 5,
    knowledge: 5,
    requires: ['welcome'],
    description: 'Contracts reward two extra reputation for careful presentation.',
    unlocks: ['Contract reputation bonus'],
  },
  festivals: {
    title: 'Festival hosting',
    branch: 'hospitality',
    coins: 7,
    knowledge: 8,
    requires: ['gardens', 'tasting'],
    description: 'Festival deliveries earn extra reputation toward the festival victory.',
    unlocks: ['Festival reputation bonus'],
  },
} as const satisfies Record<string, SkillSpec>;
export type Skill = keyof typeof SKILLS;
export const PLOTS = {
  barleyField: { title: 'Barley field', ground: 0, ingredient: 'barley', coins: 4, skill: '' },
  hopTrellis: { title: 'Hop trellis', ground: 1, ingredient: 'hops', coins: 4, skill: 'hopcraft' },
  well: { title: 'Water well', ground: 0, ingredient: 'water', coins: 4, skill: '' },
  orchard: { title: 'Orchard', ground: 4, ingredient: 'fruit', coins: 4, skill: 'wildyeast' },
} as const;
export type PlotKind = keyof typeof PLOTS;
export const emptyStock = (): Stock => ({ barley: 0, hops: 0, water: 0, yeast: 0, fruit: 0 });
