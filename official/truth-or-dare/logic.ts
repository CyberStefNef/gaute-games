import { PACKS, PROMPTS, type Kind } from './content';
import {
  contentHistory,
  restoreContent,
  contentOrder,
  shown,
  type ContentHistory,
} from '../_kit/content';
import {
  defineGame,
  fields,
  invalid,
  type Json,
  type Mode,
  type PlayerHandle,
} from '@gaute/games-sdk/logic';
import { awards, count, langOf, option, pickRefs, type Lang, type Text } from '../_kit/rules';

// Players take turns choosing truth or dare. The group picks a pack first, and
// can add its own truths and dares. Prompts name other players ({p1}, {p2});
// group dares involve everyone. Nothing repeats until a deck runs out.
type Card = { kind: Kind; text: Text; refs: Record<string, PlayerHandle> };

type State = {
  content: ContentHistory;
  mode: Mode;
  lang: Lang;
  players: PlayerHandle[];
  current: number;
  pack: number | null;
  truths: number[];
  dares: number[];
  /** The group's own prompts, shown first. */
  own: { kind: Kind; text: string }[];
  card: Card | null;
  truthsTaken: Record<PlayerHandle, number>;
  daresDone: Record<PlayerHandle, number>;
};

const player = (state: State) => state.players[state.current % state.players.length];

const own = (payload: Json): { kind: Kind; text: string } => {
  const { kind, text } = fields(payload);
  if (kind !== 'truth' && kind !== 'dare') invalid('Choose truth or dare.');
  if (typeof text !== 'string' || !text.trim() || text.length > 160)
    invalid('Write a short truth or dare.');
  return { kind, text: text.trim() };
};

function pass(state: State) {
  state.card = null;
  state.current = (state.current + 1) % state.players.length;
}

export const game = defineGame({
  setup: ({ players, locale, mode }): State => ({
    content: contentHistory(),
    mode,
    lang: langOf(locale),
    players: [...players],
    current: 0,
    pack: null,
    truths: [],
    dares: [],
    own: [],
    card: null,
    truthsTaken: {},
    daresDone: {},
  }),
  actions: (action) => ({
    restoreContent: action({
      payload: (payload: Json) => payload,
      run: (state, { payload, playerId }) => {
        if (playerId !== null || state.pack !== null) invalid('Content history is not available.');
        restoreContent(state.content, payload);
      },
    }),
    pick: action({
      payload: option(PACKS.length),
      run: (state, { payload, random }) => {
        if (state.pack !== null) invalid('The pack is chosen.');
        state.pack = payload.value;
        state.content.restored = true;
        state.truths = contentOrder(
          PROMPTS[payload.value].truth.map((p) => p.id),
          state.content,
          random,
        );
        state.dares = contentOrder(
          PROMPTS[payload.value].dare.map((p) => p.id),
          state.content,
          random,
        );
      },
    }),
    addOwn: action({
      payload: own,
      run: (state, { payload }) => {
        if (state.own.length >= 30) invalid('That’s plenty of your own.');
        state.own.push(payload);
      },
    }),
    // 0 is truth, 1 is dare.
    choose: action({
      payload: option(2),
      run: (state, { payload, random }) => {
        if (state.pack === null) invalid('Choose a pack first.');
        if (state.card) invalid('Finish this one first.');
        const kind: Kind = payload.value === 0 ? 'truth' : 'dare';
        const mine = state.own.findIndex((prompt) => prompt.kind === kind);
        let text: Text;
        if (mine >= 0) {
          const [prompt] = state.own.splice(mine, 1);
          text = { en: prompt.text, nb: prompt.text };
        } else {
          const deck = kind === 'truth' ? state.truths : state.dares;
          const index = deck.shift()!;
          deck.push(index);
          const prompt = PROMPTS[state.pack][kind][index];
          text = prompt;
          shown(state.content, prompt.id);
        }
        state.card = {
          kind,
          text,
          refs: pickRefs([text.en], state.players, random, player(state)),
        };
      },
    }),
    done: action((state) => {
      if (!state.card) invalid('Choose truth or dare first.');
      count(state.card.kind === 'truth' ? state.truthsTaken : state.daresDone, player(state));
      pass(state);
    }),
    skip: action((state) => {
      if (!state.card) invalid('Choose truth or dare first.');
      pass(state);
    }),
  }),
  turn: (state) => (state.pack === null ? null : player(state)),
  playerLeft: (state, { playerId }) => {
    const index = state.players.indexOf(playerId);
    state.players = state.players.filter((handle) => handle !== playerId);
    if (index < state.current) state.current -= 1;
    if (state.current >= state.players.length) state.current = 0;
    if (index === state.current || Object.values(state.card?.refs ?? {}).includes(playerId))
      state.card = null;
  },
  view: (state) => ({
    mode: state.mode,
    packs:
      state.pack === null
        ? PACKS.map((pack) => ({ name: pack.name[state.lang], hint: pack.hint[state.lang] }))
        : [],
    pack: state.pack === null ? null : PACKS[state.pack].name[state.lang],
    player: player(state),
    own: state.own.length,
    card: state.card
      ? { kind: state.card.kind, text: state.card.text[state.lang], refs: state.card.refs }
      : null,
    awards: awards(
      [
        { title: 'daredevil', stat: state.daresDone, least: 2 },
        { title: 'openBook', stat: state.truthsTaken, least: 2 },
      ],
      state.players,
    ),
  }),
});
