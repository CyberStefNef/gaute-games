import {
  defineGame,
  fields,
  invalid,
  type Json,
  type Mode,
  type PlayerHandle,
} from '@gaute/games-sdk/logic';

// Everyone except the imposter sees the secret word. Players give spoken clues,
// then vote. The group wins a round when the most votes land on the imposter.
// On own phones each player votes privately. Passing one phone, each player sees
// their role in turn, then the group agrees on one accusation on the shared screen.
const WORDS: Record<string, string[]> = {
  en: [
    'Jukebox',
    'Darts',
    'Karaoke',
    'Happy hour',
    'Bartender',
    'Peanuts',
    'Pool table',
    'Toast',
    'Coaster',
    'Quiz night',
    'Last call',
    'Terrace',
    'Taxi queue',
    'Kebab',
    'Coat check',
    'Dance floor',
  ],
  nb: [
    'Jukeboks',
    'Dart',
    'Karaoke',
    'Happy hour',
    'Bartender',
    'Peanøtter',
    'Biljardbord',
    'Skål',
    'Ølbrikke',
    'Quizkveld',
    'Siste bestilling',
    'Uteservering',
    'Taxikø',
    'Kebab',
    'Garderobe',
    'Dansegulv',
  ],
};

type Phase = 'roles' | 'clues' | 'vote' | 'reveal';
type State = {
  mode: Mode;
  words: string[];
  used: number[];
  round: number;
  phase: Phase;
  players: PlayerHandle[];
  imposter: PlayerHandle;
  word: string;
  /** Pass-the-phone: players who have seen their role this round. */
  seen: PlayerHandle[];
  votes: Record<PlayerHandle, PlayerHandle>;
  scores: Record<PlayerHandle, number>;
  outcome: { caught: boolean; tally: Record<PlayerHandle, number> } | null;
};

/** Payload of `vote` and `accuse`: the chosen player. */
const choice = (payload: Json): { target: PlayerHandle } => {
  const { target } = fields(payload);
  if (typeof target !== 'string') invalid('Choose a player in this game.');
  return { target };
};
const inGame = (state: State, target: PlayerHandle) => {
  if (!state.players.includes(target)) invalid('Choose a player in this game.');
  return target;
};

function deal(state: State, random: () => number) {
  if (state.used.length === state.words.length) state.used = [];
  const unused = state.words.map((_, i) => i).filter((i) => !state.used.includes(i));
  const index = unused[Math.floor(random() * unused.length)];
  state.used.push(index);
  state.word = state.words[index];
  state.imposter = state.players[Math.floor(random() * state.players.length)];
  state.round += 1;
  state.phase = state.mode === 'pass' ? 'roles' : 'clues';
  state.seen = [];
  state.votes = {};
  state.outcome = null;
}

function reveal(state: State, tally: Record<PlayerHandle, number>) {
  const top = Math.max(0, ...Object.values(tally));
  const leaders = Object.keys(tally).filter((handle) => tally[handle] === top);
  const caught = leaders.length === 1 && leaders[0] === state.imposter;
  if (caught) {
    for (const handle of state.players)
      if (handle !== state.imposter) state.scores[handle] = (state.scores[handle] ?? 0) + 1;
  } else state.scores[state.imposter] = (state.scores[state.imposter] ?? 0) + 2;
  state.outcome = { caught, tally };
  state.phase = 'reveal';
}

function countVotes(state: State) {
  const tally: Record<PlayerHandle, number> = {};
  for (const voted of Object.values(state.votes)) tally[voted] = (tally[voted] ?? 0) + 1;
  reveal(state, tally);
}

export const game = defineGame({
  setup: ({ players, locale, mode, random }) => {
    const state: State = {
      mode,
      words: WORDS[locale] ?? WORDS.en,
      used: [],
      round: 0,
      phase: 'clues',
      players: [...players],
      imposter: players[0],
      word: '',
      seen: [],
      votes: {},
      scores: Object.fromEntries(players.map((handle) => [handle, 0])),
      outcome: null,
    };
    deal(state, random);
    return state;
  },
  actions: (action) => ({
    // Pass-the-phone: the holder has read their role and passes the phone on.
    seen: action((state, { playerId }) => {
      const next = state.players.find((handle) => !state.seen.includes(handle));
      if (state.phase !== 'roles' || playerId !== next) invalid('It is not your turn.');
      state.seen.push(next!);
      if (state.seen.length === state.players.length) state.phase = 'clues';
    }),
    startVote: action((state) => {
      if (state.phase !== 'clues') invalid('Voting has already started.');
      state.phase = 'vote';
    }),
    vote: action({
      payload: choice,
      run: (state, { playerId, payload }) => {
        if (state.phase !== 'vote' || !playerId) invalid('Voting is not open.');
        const voted = inGame(state, payload.target);
        if (voted === playerId) invalid('Vote for someone else.');
        state.votes[playerId] = voted;
        if (state.players.every((handle) => state.votes[handle])) countVotes(state);
      },
    }),
    // One phone: the group agrees out loud and accuses one player together.
    accuse: action({
      payload: choice,
      run: (state, { payload }) => {
        if (state.phase !== 'vote' || state.mode === 'phones') invalid('Voting is not open.');
        reveal(state, { [inGame(state, payload.target)]: state.players.length });
      },
    }),
    reveal: action((state) => {
      if (state.phase !== 'vote') invalid('Voting is not open.');
      if (!Object.keys(state.votes).length) invalid('Nobody has voted yet.');
      countVotes(state);
    }),
    nextRound: action((state, { random }) => {
      if (state.phase !== 'reveal') invalid('Finish this round first.');
      deal(state, random);
    }),
  }),
  turn: (state) =>
    state.phase === 'roles'
      ? (state.players.find((handle) => !state.seen.includes(handle)) ?? null)
      : null,
  playerLeft: (state, { playerId, random }) => {
    state.players = state.players.filter((handle) => handle !== playerId);
    delete state.votes[playerId];
    for (const [voter, voted] of Object.entries(state.votes))
      if (voted === playerId) delete state.votes[voter];
    if (playerId === state.imposter && state.phase !== 'reveal') deal(state, random);
    else if (state.phase === 'vote' && state.players.every((handle) => state.votes[handle]))
      countVotes(state);
  },
  view: (state, playerId) => {
    // The shared screen never shows a role or the word before the reveal.
    const isImposter = playerId !== null && playerId === state.imposter;
    const revealed = state.phase === 'reveal';
    return {
      mode: state.mode,
      round: state.round,
      phase: state.phase,
      role: playerId === null ? null : isImposter ? ('imposter' as const) : ('crew' as const),
      word: revealed || (playerId !== null && !isImposter) ? state.word : null,
      voted: Object.keys(state.votes).length,
      yourVote: playerId === null ? null : (state.votes[playerId] ?? null),
      scores: state.scores,
      reveal: revealed
        ? {
            imposter: state.imposter,
            caught: state.outcome!.caught,
            tally: state.outcome!.tally,
          }
        : null,
    };
  },
});
