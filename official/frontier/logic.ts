import { defineGame, endGame, fields, invalid, type Json } from '@gaute/games-sdk/logic';
import * as rules from './model';
import { RECIPES, SKILLS, type Recipe, type Skill } from './systems';
function integer(value: Json | undefined) {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0)
    invalid('Choose a valid tile or courier.');
  return value;
}
function text(value: Json | undefined) {
  if (typeof value !== 'string' || value.length < 1 || value.length > 80)
    invalid('Choose a valid option.');
  return value;
}
function member<T extends string>(value: Json | undefined, values: Record<T, unknown>): T {
  const key = text(value);
  if (!Object.hasOwn(values, key)) invalid('Choose a valid option.');
  return key as T;
}
const tile = (payload: Json) => ({ at: integer(fields(payload).at) });
const courier = (payload: Json) => ({ courier: integer(fields(payload).courier) });
const venueOption = (payload: Json) => ({
  venue: integer(fields(payload).venue),
  option: text(fields(payload).option),
});
function finish(state: rules.State) {
  if (state.phase === 'ended')
    endGame({
      winners: state.winners,
      scores: Object.fromEntries(state.players.map((p) => [p, rules.score(state, p)])),
      victory: state.victory,
    });
}
function ready(state: rules.State, player: string | null) {
  const who = rules.actor(state, player);
  if (state.phase !== 'play') invalid('Start the town first.');
  return who;
}
export const game = defineGame({
  setup: ({ players, mode }) => rules.setup(players, mode),
  actions: (action) => ({
    start: action({
      payload: (payload) => {
        const size = integer(fields(payload).size);
        if (![8, 12, 16, 24].includes(size)) invalid('Choose a valid map size.');
        return { size };
      },
      run: (state, { playerId, payload, random }) => {
        rules.actor(state, playerId);
        rules.start(state, payload.size, random);
      },
    }),
    travel: action({
      payload: (payload) => ({ ...courier(payload), ...tile(payload) }),
      run: (state, { playerId, payload }) =>
        rules.travel(state, ready(state, playerId), payload.courier, payload.at),
    }),
    gather: action({
      payload: tile,
      run: (state, { playerId, payload }) =>
        rules.gather(state, ready(state, playerId), payload.at),
    }),
    produce: action({
      payload: venueOption,
      run: (state, { playerId, payload }) =>
        rules.produce(state, ready(state, playerId), payload.venue, payload.option),
    }),
    upgrade: action({
      payload: venueOption,
      run: (state, { playerId, payload }) =>
        rules.upgrade(state, ready(state, playerId), payload.venue, payload.option),
    }),
    open: action({
      payload: courier,
      run: (state, { playerId, payload }) => {
        rules.open(state, ready(state, playerId), payload.courier);
        finish(state);
      },
    }),
    learn: action({
      payload: (payload) => ({ skill: member<Skill>(fields(payload).skill, SKILLS) }),
      run: (state, { playerId, payload }) =>
        rules.learn(state, ready(state, playerId), payload.skill),
    }),
    accept: action({
      payload: (payload) => ({ contract: text(fields(payload).contract) }),
      run: (state, { playerId, payload }) =>
        rules.accept(state, ready(state, playerId), payload.contract),
    }),
    load: action({
      payload: (payload) => {
        const { venue, recipe, amount } = fields(payload);
        const count = integer(amount);
        if (count < 1 || count > 6) invalid('Load between one and six kegs.');
        return {
          ...courier(payload),
          venue: integer(venue),
          recipe: member<Recipe>(recipe, RECIPES),
          amount: count,
        };
      },
      run: (state, { playerId, payload }) =>
        rules.load(
          state,
          ready(state, playerId),
          payload.courier,
          payload.venue,
          payload.recipe,
          payload.amount,
        ),
    }),
    deliver: action({
      payload: (payload) => ({ ...courier(payload), contract: text(fields(payload).contract) }),
      run: (state, { playerId, payload }) => {
        rules.deliver(state, ready(state, playerId), payload.courier, payload.contract);
        finish(state);
      },
    }),
    raid: action({
      payload: (payload) => ({ ...courier(payload), ...tile(payload) }),
      run: (state, { playerId, payload }) =>
        rules.raid(state, ready(state, playerId), payload.courier, payload.at),
    }),
    breach: action({
      payload: (payload): { courier: number; at: number; mode: 'takeover' | 'demolish' } => {
        const { mode } = fields(payload);
        if (mode !== 'takeover' && mode !== 'demolish') invalid('Choose takeover or demolition.');
        return { ...courier(payload), ...tile(payload), mode };
      },
      run: (state, { playerId, payload }) => {
        rules.breach(state, ready(state, playerId), payload.courier, payload.at, payload.mode);
        finish(state);
      },
    }),
    repair: action({
      payload: (payload) => ({ venue: integer(fields(payload).venue) }),
      run: (state, { playerId, payload }) =>
        rules.repair(state, ready(state, playerId), payload.venue),
    }),
    fortify: action({
      payload: (payload) => ({ venue: integer(fields(payload).venue) }),
      run: (state, { playerId, payload }) =>
        rules.fortify(state, ready(state, playerId), payload.venue),
    }),
    rebuild: action({
      payload: (payload) => ({ ...courier(payload), ...tile(payload) }),
      run: (state, { playerId, payload }) =>
        rules.rebuild(state, ready(state, playerId), payload.courier, payload.at),
    }),
    endTurn: action({
      payload: (payload) => ({ round: integer(fields(payload).round) }),
      run: (state, { playerId, payload, random }) => {
        const player = ready(state, playerId);
        if (payload.round !== state.round) invalid('The round has changed. Review your town.');
        rules.nextTurn(state, random, player);
        finish(state);
      },
    }),
  }),
  view: rules.view,
  turn: (state) => (state.phase === 'ended' ? null : state.active),
  playerLeft: (state, { playerId, random }) => {
    rules.leave(state, playerId, random);
    finish(state);
  },
});
