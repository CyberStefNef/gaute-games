import { CATEGORIES } from './content';
import { defineGame, invalid, type Mode, type PlayerHandle } from '@gaute/games-sdk/logic';
import { langOf, option, score, shuffled, target, zeroScores, type Lang } from '../_kit/rules';

// Everyone but the imposter sees the secret word; the imposter only sees its
// category. Players give one-word clues and vote. A caught imposter gets one last
// chance: name the word and steal the round. Seven or more players get two imposters.

type Phase = 'roles' | 'clues' | 'vote' | 'guess' | 'reveal';
type State = {
  mode: Mode;
  lang: Lang;
  players: PlayerHandle[];
  imposters: PlayerHandle[];
  category: number;
  word: number;
  used: string[];
  round: number;
  phase: Phase;
  /** Pass-the-phone: players who have seen their role this round. */
  seen: PlayerHandle[];
  votes: Record<PlayerHandle, PlayerHandle>;
  /** The imposter caught by the vote, who now guesses the word. */
  caught: PlayerHandle | null;
  /** Word choices offered to a caught imposter: indexes in the category. */
  options: number[];
  guess: number | null;
  tally: Record<PlayerHandle, number>;
  scores: Record<PlayerHandle, number>;
};

function deal(state: State, random: () => number) {
  const fresh: [number, number][] = [];
  CATEGORIES.forEach((category, c) =>
    category.words.forEach((_, i) => {
      if (!state.used.includes(`${c}:${i}`)) fresh.push([c, i]);
    }),
  );
  if (!fresh.length) state.used = [];
  const pool = fresh.length
    ? fresh
    : CATEGORIES.flatMap((c, ci) => c.words.map((_, i) => [ci, i] as [number, number]));
  const [category, word] = pool[Math.floor(random() * pool.length)];
  state.category = category;
  state.word = word;
  state.used.push(`${category}:${word}`);
  const count = state.players.length >= 7 ? 2 : 1;
  state.imposters = shuffled(state.players.length, random)
    .slice(0, count)
    .map((index) => state.players[index]);
  state.round += 1;
  state.phase = state.mode === 'pass' ? 'roles' : 'clues';
  state.seen = [];
  state.votes = {};
  state.caught = null;
  state.options = [];
  state.guess = null;
  state.tally = {};
}

/** The vote is in: a single top-voted imposter gets a last chance; otherwise they got away. */
function judge(state: State, tally: Record<PlayerHandle, number>, random: () => number) {
  state.tally = tally;
  const top = Math.max(0, ...Object.values(tally));
  const leaders = Object.keys(tally).filter((p) => tally[p] === top);
  const accused = leaders.length === 1 ? leaders[0] : null;
  if (accused && state.imposters.includes(accused)) {
    state.caught = accused;
    const others = shuffled(CATEGORIES[state.category].words.length, random).filter(
      (i) => i !== state.word,
    );
    state.options = shuffled(6, random).map((slot) => (slot === 0 ? state.word : others[slot - 1]));
    state.phase = 'guess';
    return;
  }
  for (const imposter of state.imposters) score(state.scores, imposter, 2);
  state.phase = 'reveal';
}

function countVotes(state: State, random: () => number) {
  const tally: Record<PlayerHandle, number> = {};
  for (const voted of Object.values(state.votes)) tally[voted] = (tally[voted] ?? 0) + 1;
  judge(state, tally, random);
}

export const game = defineGame({
  setup: ({ players, locale, mode, random }) => {
    const state: State = {
      mode,
      lang: langOf(locale),
      players: [...players],
      imposters: [],
      category: 0,
      word: 0,
      used: [],
      round: 0,
      phase: 'clues',
      seen: [],
      votes: {},
      caught: null,
      options: [],
      guess: null,
      tally: {},
      scores: zeroScores(players),
    };
    deal(state, random);
    return state;
  },
  actions: (action) => ({
    // Pass-the-phone: the holder has read their role and passes the phone on.
    seen: action((state, { playerId }) => {
      const next = state.players.find((p) => !state.seen.includes(p));
      if (state.phase !== 'roles' || playerId !== next) invalid('It is not your turn.');
      state.seen.push(next!);
      if (state.seen.length === state.players.length) state.phase = 'clues';
    }),
    startVote: action((state) => {
      if (state.phase !== 'clues') invalid('Voting has already started.');
      state.phase = 'vote';
    }),
    vote: action({
      payload: target,
      run: (state, { playerId, payload, random }) => {
        if (state.phase !== 'vote' || !playerId || state.mode !== 'phones')
          invalid('Voting is not open.');
        if (!state.players.includes(payload.target)) invalid('Choose a player in this game.');
        if (payload.target === playerId) invalid('Vote for someone else.');
        state.votes[playerId] = payload.target;
        if (state.players.every((p) => state.votes[p])) countVotes(state, random);
      },
    }),
    // One phone: the group agrees out loud and accuses one player together.
    accuse: action({
      payload: target,
      run: (state, { payload, random }) => {
        if (state.phase !== 'vote' || state.mode === 'phones') invalid('Voting is not open.');
        if (!state.players.includes(payload.target)) invalid('Choose a player in this game.');
        judge(state, { [payload.target]: state.players.length }, random);
      },
    }),
    reveal: action((state, { random }) => {
      if (state.phase !== 'vote') invalid('Voting is not open.');
      if (!Object.keys(state.votes).length) invalid('Nobody has voted yet.');
      countVotes(state, random);
    }),
    // The caught imposter's last chance: which of these is the word?
    guessWord: action({
      payload: option(6),
      run: (state, { playerId, payload }) => {
        if (state.phase !== 'guess') invalid('There is nothing to guess.');
        if (state.mode !== 'shared' && playerId !== state.caught)
          invalid('Only the caught imposter guesses.');
        state.guess = state.options[payload.value];
        if (state.guess === state.word) score(state.scores, state.caught!, 3);
        else
          for (const p of state.players) if (!state.imposters.includes(p)) score(state.scores, p);
        state.phase = 'reveal';
      },
    }),
    nextRound: action((state, { random }) => {
      if (state.phase !== 'reveal') invalid('Finish this round first.');
      deal(state, random);
    }),
  }),
  turn: (state) =>
    state.phase === 'roles'
      ? (state.players.find((p) => !state.seen.includes(p)) ?? null)
      : state.phase === 'guess'
        ? state.caught
        : null,
  playerLeft: (state, { playerId, random }) => {
    state.players = state.players.filter((p) => p !== playerId);
    delete state.votes[playerId];
    for (const [voter, voted] of Object.entries(state.votes))
      if (voted === playerId) delete state.votes[voter];
    if (state.imposters.includes(playerId) && state.phase !== 'reveal') deal(state, random);
    else if (state.phase === 'vote' && state.players.every((p) => state.votes[p]))
      countVotes(state, random);
  },
  view: (state, playerId) => {
    const category = CATEGORIES[state.category];
    const isImposter = playerId !== null && state.imposters.includes(playerId);
    const revealed = state.phase === 'reveal';
    const guessing = state.phase === 'guess';
    const guesser =
      guessing && (playerId === state.caught || (state.mode === 'shared' && playerId === null));
    return {
      mode: state.mode,
      round: state.round,
      phase: state.phase,
      role: playerId === null ? null : isImposter ? ('imposter' as const) : ('crew' as const),
      category: category.name[state.lang],
      word:
        revealed || (playerId !== null && !isImposter)
          ? category.words[state.word][state.lang]
          : null,
      imposterCount: state.imposters.length,
      voted: Object.keys(state.votes).length,
      yourVote: playerId === null ? null : (state.votes[playerId] ?? null),
      caught: guessing || revealed ? state.caught : null,
      options: guesser ? state.options.map((i) => category.words[i][state.lang]) : ([] as string[]),
      scores: state.scores,
      reveal: revealed
        ? {
            imposters: state.imposters,
            caught: state.caught,
            guess: state.guess === null ? null : category.words[state.guess][state.lang],
            stole: state.guess !== null && state.guess === state.word,
            tally: state.tally,
          }
        : null,
    };
  },
});
