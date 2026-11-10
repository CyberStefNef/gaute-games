import { PACKS, PROMPTS } from './content';
import {
  contentHistory,
  restoreContent,
  contentOrder,
  shown,
  type ContentHistory,
} from '../_kit/content';
import {
  defineGame,
  endGame,
  fields,
  invalid,
  type Json,
  type Mode,
  type PlayerHandle,
} from '@gaute/games-sdk/logic';
import { awards, count, langOf, option, type Lang, type Text } from '../_kit/rules';

// Ten statements with no elimination. Everyone answers privately on own phones.
// When only one player has done it, it's story time. On one phone the group
// answers out loud. Players can add their own statements.
const ROUNDS = 10;

type State = {
  content: ContentHistory;
  mode: Mode;
  lang: Lang;
  players: PlayerHandle[];
  pack: number | null;
  order: number[];
  at: number;
  /** The group's own statements, played first. */
  own: string[];
  current: Text | null;
  answers: Record<PlayerHandle, boolean>;
  revealed: boolean;
  round: number;
  never: Record<PlayerHandle, number>;
  have: Record<PlayerHandle, number>;
  stories: Record<PlayerHandle, number>;
};

const everyoneAnswered = (state: State) =>
  state.players.every((p) => state.answers[p] !== undefined);

const statement = (payload: Json): { text: string } => {
  const { text } = fields(payload);
  if (typeof text !== 'string' || !text.trim() || text.length > 140)
    invalid('Write a short statement.');
  return { text: text.trim() };
};

function finish(state: State) {
  endGame({ have: state.have, stories: state.stories });
}

function reveal(state: State) {
  state.revealed = true;
  if (state.mode !== 'phones') return;
  const did = state.players.filter((p) => state.answers[p]);
  for (const p of did) count(state.have, p);
  for (const p of state.players) if (state.answers[p] === false) count(state.never, p);
  if (did.length === 1) count(state.stories, did[0]);
}

function draw(state: State) {
  if (state.round >= ROUNDS) return finish(state);
  state.round += 1;
  state.answers = {};
  state.revealed = false;
  const mine = state.own.shift();
  if (mine !== undefined) {
    state.current = { en: mine, nb: mine };
    return;
  }
  const pack = PROMPTS[state.pack!];
  if (state.at + 1 >= state.order.length) return finish(state);
  state.at += 1;
  const prompt = pack[state.order[state.at]];
  state.current = prompt;
  shown(state.content, prompt.id);
}

export const game = defineGame({
  setup: ({ players, locale, mode }): State => ({
    content: contentHistory(),
    mode,
    lang: langOf(locale),
    players: [...players],
    pack: null,
    order: [],
    at: -1,
    own: [],
    current: null,
    answers: {},
    revealed: false,
    round: 0,
    never: {},
    have: {},
    stories: {},
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
        state.order = contentOrder(
          PROMPTS[payload.value].map((p) => p.id),
          state.content,
          random,
        );
        state.content.restored = true;
        draw(state);
      },
    }),
    addOwn: action({
      payload: statement,
      run: (state, { payload }) => {
        if (state.own.length >= 30) invalid('That’s plenty of your own.');
        state.own.push(payload.text);
      },
    }),
    answer: action({
      payload: option(2),
      run: (state, { playerId, payload }) => {
        if (state.mode !== 'phones' || !playerId || state.revealed || !state.current)
          invalid('Wait for the next statement.');
        state.answers[playerId] = payload.value === 1;
        if (everyoneAnswered(state)) reveal(state);
      },
    }),
    next: action((state) => {
      if (!state.current) invalid('Choose a pack first.');
      if (state.mode === 'phones' && !state.revealed) {
        if (!Object.keys(state.answers).length) invalid('Nobody has answered yet.');
        reveal(state);
        return;
      }
      draw(state);
    }),
  }),
  playerLeft: (state, { playerId }) => {
    state.players = state.players.filter((p) => p !== playerId);
    delete state.answers[playerId];
    delete state.have[playerId];
    delete state.never[playerId];
    delete state.stories[playerId];
    if (
      state.mode === 'phones' &&
      state.current &&
      !state.revealed &&
      state.players.length &&
      everyoneAnswered(state)
    )
      reveal(state);
  },
  view: (state, playerId) => {
    const did = state.revealed
      ? state.players.filter((p) => state.answers[p])
      : ([] as PlayerHandle[]);
    return {
      mode: state.mode,
      packs:
        state.pack === null
          ? PACKS.map((pack) => ({ name: pack.name[state.lang], hint: pack.hint[state.lang] }))
          : [],
      pack: state.pack === null ? null : PACKS[state.pack].name[state.lang],
      statement: state.current ? state.current[state.lang] : null,
      own: state.own.length,
      yourAnswer: playerId === null ? null : (state.answers[playerId] ?? null),
      round: state.round,
      rounds: ROUNDS,
      answered: Object.keys(state.answers).length,
      inPlay: state.players.length,
      revealed: state.revealed,
      haveDone: did,
      storyTime: state.mode === 'phones' && did.length === 1 ? did[0] : null,
      have: state.have,
      awards: awards(
        [
          { title: 'seenItAll', stat: state.have, least: 2 },
          { title: 'storyteller', stat: state.stories },
          {
            title: 'angel',
            stat: state.never,
            least: 2,
          },
        ],
        state.players,
      ),
    };
  },
});
