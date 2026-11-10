import { PROMPTS } from './content';
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
  type PlayerHandle,
} from '@gaute/games-sdk/logic';
import {
  awards,
  count,
  langOf,
  option,
  score,
  shuffled,
  zeroScores,
  type Lang,
} from '../_kit/rules';

// A strange but true fact with a blank. Everyone writes a convincing fake answer,
// then everyone hunts for the truth among the fakes. Finding the truth scores 2;
// every player your fake fools scores you 1. Six rounds.

const ROUNDS = 6;

type Option = { text: string; authors: PlayerHandle[]; truth: boolean };
type State = {
  content: ContentHistory;
  started: boolean;
  lang: Lang;
  players: PlayerHandle[];
  order: number[];
  at: number;
  phase: 'write' | 'vote' | 'reveal';
  lies: Record<PlayerHandle, string>;
  options: Option[];
  votes: Record<PlayerHandle, number>;
  shown: number[];
  beforeScores: Record<PlayerHandle, number>;
  scores: Record<PlayerHandle, number>;
  fooled: Record<PlayerHandle, number>;
  found: Record<PlayerHandle, number>;
};

const normal = (text: string) => text.trim().toLocaleLowerCase().replace(/\s+/g, ' ');
// Every answer starts with a capital, so the truth's casing never gives it away.
const tidy = (text: string) => {
  const clean = text.trim().replace(/\s+/g, ' ');
  return clean.charAt(0).toLocaleUpperCase() + clean.slice(1);
};
const lie = (payload: Json): { text: string } => {
  const { text } = fields(payload);
  if (typeof text !== 'string' || !text.trim() || text.length > 40)
    invalid('Write a short answer.');
  return { text: text.trim() };
};
const truthOf = (state: State) => PROMPTS[state.order[state.at]].truth[state.lang];

function startVote(state: State, random: () => number) {
  const options: Option[] = [{ text: tidy(truthOf(state)), authors: [], truth: true }];
  for (const [author, text] of Object.entries(state.lies)) {
    const same = options.find((o) => !o.truth && normal(o.text) === normal(text));
    if (same) same.authors.push(author);
    else options.push({ text: tidy(text), authors: [author], truth: false });
  }
  state.options = shuffled(options.length, random).map((i) => options[i]);
  state.phase = 'vote';
}

function reveal(state: State) {
  state.phase = 'reveal';
  state.beforeScores = { ...state.scores };
  state.shown = [];
  for (const [voter, choice] of Object.entries(state.votes)) {
    const picked = state.options[choice];
    if (picked.truth) {
      score(state.scores, voter, 2);
      count(state.found, voter);
    } else
      for (const author of picked.authors) {
        score(state.scores, author);
        count(state.fooled, author);
      }
  }
}

export const game = defineGame({
  setup: ({ players, locale, random }): State => ({
    content: contentHistory(),
    started: false,
    lang: langOf(locale),
    players: [...players],
    order: contentOrder(
      PROMPTS.map((p) => p.id),
      contentHistory(),
      random,
    ).slice(0, ROUNDS),
    at: 0,
    phase: 'write',
    lies: {},
    options: [],
    votes: {},
    shown: [],
    beforeScores: zeroScores(players),
    scores: zeroScores(players),
    fooled: {},
    found: {},
  }),
  actions: (action) => ({
    restoreContent: action({
      payload: (payload: Json) => payload,
      run: (state, { payload, playerId, random }) => {
        if (playerId !== null || state.started) invalid('Content history is not available.');
        restoreContent(state.content, payload);
        state.order = contentOrder(
          PROMPTS.map((p) => p.id),
          state.content,
          random,
        ).slice(0, ROUNDS);
        shown(state.content, PROMPTS[state.order[0]].id);
      },
    }),
    write: action({
      payload: lie,
      run: (state, { playerId, payload, random }) => {
        state.started = true;
        state.content.restored = true;
        shown(state.content, PROMPTS[state.order[state.at]].id);
        if (state.phase !== 'write' || !playerId) invalid('Writing is over for this round.');
        if (
          [truthOf(state), ...PROMPTS[state.order[state.at]].aliases[state.lang]].some(
            (answer) => normal(payload.text) === normal(answer),
          )
        )
          invalid('That’s the real answer! Write a fake one.');
        state.lies[playerId] = payload.text;
        if (state.players.every((p) => state.lies[p])) startVote(state, random);
      },
    }),
    // Start the hunt once at least two fakes are in, without waiting for everyone.
    hunt: action((state, { playerId, random }) => {
      if (playerId !== state.players[0]) invalid('Only the round leader can move on early.');
      if (state.phase !== 'write') invalid('Writing is over for this round.');
      if (Object.keys(state.lies).length < 2) invalid('Wait for at least two answers.');
      startVote(state, random);
    }),
    vote: action({
      payload: option(17),
      run: (state, { playerId, payload }) => {
        if (state.phase !== 'vote' || !playerId) invalid('Voting is not open.');
        const picked = state.options[payload.value];
        if (!picked) invalid('Choose one of the answers.');
        if (picked.authors.includes(playerId)) invalid('That’s your own answer!');
        state.votes[playerId] = payload.value;
        if (state.players.every((p) => state.votes[p] !== undefined)) reveal(state);
      },
    }),
    reveal: action((state, { playerId }) => {
      if (playerId !== state.players[0]) invalid('Only the round leader can move on early.');
      if (state.phase !== 'vote' || !Object.keys(state.votes).length)
        invalid('Nobody has voted yet.');
      reveal(state);
    }),
    showNext: action((state, { playerId }) => {
      if (playerId !== state.players[0]) invalid('Only the round leader can reveal answers.');
      if (state.phase !== 'reveal') invalid('Finish voting first.');
      const next = state.options.findIndex((o, i) => !o.truth && !state.shown.includes(i));
      const index = next < 0 ? state.options.findIndex((o) => o.truth) : next;
      if (!state.shown.includes(index)) state.shown.push(index);
    }),
    showAll: action((state, { playerId }) => {
      if (playerId !== state.players[0]) invalid('Only the round leader can reveal answers.');
      if (state.phase !== 'reveal') invalid('Finish voting first.');
      state.shown = state.options.map((_, i) => i);
    }),
    next: action((state, { playerId }) => {
      if (playerId !== state.players[0]) invalid('Only the round leader can reveal answers.');
      if (state.shown.length !== state.options.length) invalid('Reveal the answers first.');
      if (state.phase !== 'reveal') invalid('Finish this round first.');
      if (state.at + 1 >= state.order.length) {
        endGame({ scores: state.scores });
        return;
      }
      state.at += 1;
      shown(state.content, PROMPTS[state.order[state.at]].id);
      state.phase = 'write';
      state.shown = [];
      state.lies = {};
      state.options = [];
      state.votes = {};
    }),
  }),
  playerLeft: (state, { playerId, random }) => {
    state.players = state.players.filter((p) => p !== playerId);
    delete state.lies[playerId];
    delete state.votes[playerId];
    if (
      state.phase === 'write' &&
      state.players.length &&
      state.players.every((p) => state.lies[p])
    )
      startVote(state, random);
    else if (state.phase === 'vote' && state.players.every((p) => state.votes[p] !== undefined))
      reveal(state);
  },
  view: (state, playerId) => {
    const fact = PROMPTS[state.order[state.at]];
    const revealed = state.phase === 'reveal';
    return {
      phase: state.phase,
      leader: state.players[0],
      revealComplete: revealed && state.shown.length === state.options.length,
      round: state.at + 1,
      rounds: state.order.length,
      fact: fact.fact[state.lang],
      explanation:
        revealed && state.shown.length === state.options.length
          ? fact.explanation[state.lang]
          : null,
      yourLie: playerId === null ? null : (state.lies[playerId] ?? null),
      written: Object.keys(state.lies).length,
      // Authors and the truth stay hidden until the reveal; you only see which is yours.
      options: state.options.map((o, i) => ({
        revealed: revealed && state.shown.includes(i),
        text: o.text,
        mine: playerId !== null && o.authors.includes(playerId),
        truth: revealed && state.shown.includes(i) ? o.truth : false,
        authors: revealed && state.shown.includes(i) ? o.authors : ([] as PlayerHandle[]),
        pickedBy:
          revealed && state.shown.includes(i)
            ? Object.keys(state.votes).filter((p) => state.options[state.votes[p]] === o)
            : ([] as PlayerHandle[]),
      })),
      yourVote: playerId === null ? null : (state.votes[playerId] ?? null),
      voted: Object.keys(state.votes).length,
      gained: Object.fromEntries(
        state.players.map((p) => [
          p,
          revealed && state.shown.length === state.options.length
            ? state.scores[p] - state.beforeScores[p]
            : 0,
        ]),
      ),
      scores:
        revealed && state.shown.length < state.options.length ? state.beforeScores : state.scores,
      awards:
        !revealed || state.shown.length < state.options.length
          ? []
          : awards(
              [
                { title: 'masterBluffer', stat: state.fooled, least: 2 },
                { title: 'truthSeeker', stat: state.found, least: 2 },
              ],
              state.players,
            ),
    };
  },
});
