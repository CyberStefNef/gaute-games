import {
  defineGame,
  endGame,
  fields,
  invalid,
  type Json,
  type Mode,
  type PlayerHandle,
} from '@gaute/games-sdk/logic';

// A shared deck of prompts, duels, votes and rules that last a few cards.
// Placeholders ({p1}, {p2}) name players; the app fills in display names. On a
// shared phone, vote cards are answered by pointing rather than voting in the app.
type Kind = 'prompt' | 'duel' | 'vote' | 'rule';
type Card = { kind: Kind; en: string; nb: string; endEn?: string; endNb?: string };

const CARDS: Card[] = [
  {
    kind: 'prompt',
    en: '{p1}, tell the story behind your most-used emoji.',
    nb: '{p1}, fortell historien bak emojien du bruker mest.',
  },
  {
    kind: 'prompt',
    en: '{p1}, describe your perfect Friday in three words.',
    nb: '{p1}, beskriv den perfekte fredagen din med tre ord.',
  },
  {
    kind: 'prompt',
    en: '{p1}, what is the best concert you have ever been to?',
    nb: '{p1}, hva er den beste konserten du har vært på?',
  },
  {
    kind: 'prompt',
    en: '{p1}, give {p2} an honest compliment.',
    nb: '{p1}, gi {p2} et ærlig kompliment.',
  },
  {
    kind: 'prompt',
    en: '{p1}, which song plays when you walk into a room?',
    nb: '{p1}, hvilken sang spilles når du kommer inn i et rom?',
  },
  {
    kind: 'prompt',
    en: '{p1}, share a skill nobody here knows you have.',
    nb: '{p1}, del en ferdighet ingen her vet at du har.',
  },
  {
    kind: 'prompt',
    en: '{p1}, what is the strangest job you have ever had?',
    nb: '{p1}, hva er den rareste jobben du har hatt?',
  },
  {
    kind: 'prompt',
    en: '{p1}, pitch the next stop to the group in 20 seconds.',
    nb: '{p1}, selg inn neste stopp til gruppa på 20 sekunder.',
  },
  {
    kind: 'prompt',
    en: '{p1} and {p2}, find three things you have in common. Go!',
    nb: '{p1} og {p2}, finn tre ting dere har felles. Kjør!',
  },
  {
    kind: 'prompt',
    en: '{p1}, tell us about the last time you laughed until you cried.',
    nb: '{p1}, fortell om sist du lo så du gråt.',
  },
  {
    kind: 'duel',
    en: '{p1} vs {p2}: rock, paper, scissors. Best of three.',
    nb: '{p1} mot {p2}: stein, saks, papir. Best av tre.',
  },
  {
    kind: 'duel',
    en: '{p1} vs {p2}: take turns naming capital cities. First to hesitate loses.',
    nb: '{p1} mot {p2}: nevn hovedsteder annenhver gang. Den som nøler først, taper.',
  },
  {
    kind: 'duel',
    en: '{p1} vs {p2}: staring contest. First to laugh loses.',
    nb: '{p1} mot {p2}: stirrekonkurranse. Den som ler først, taper.',
  },
  {
    kind: 'duel',
    en: '{p1} and {p2} each hum a song. The one the group guesses fastest wins.',
    nb: '{p1} og {p2} nynner hver sin sang. Den gruppa gjetter raskest, vinner.',
  },
  { kind: 'duel', en: '{p1} vs {p2}: thumb war!', nb: '{p1} mot {p2}: tommelkrig!' },
  {
    kind: 'vote',
    en: 'Who is most likely to become famous?',
    nb: 'Hvem blir mest sannsynlig kjent?',
  },
  {
    kind: 'vote',
    en: 'Who is most likely to get lost on the way home?',
    nb: 'Hvem går seg mest sannsynlig vill på vei hjem?',
  },
  {
    kind: 'vote',
    en: 'Who would survive longest on a desert island?',
    nb: 'Hvem ville overlevd lengst på en øde øy?',
  },
  {
    kind: 'vote',
    en: 'Who is most likely to start dancing first tonight?',
    nb: 'Hvem begynner mest sannsynlig å danse først i kveld?',
  },
  { kind: 'vote', en: 'Who gives the best advice?', nb: 'Hvem gir de beste rådene?' },
  {
    kind: 'vote',
    en: 'Who is most likely to befriend a stranger tonight?',
    nb: 'Hvem blir mest sannsynlig venn med en fremmed i kveld?',
  },
  { kind: 'vote', en: 'Who has the best taste in music?', nb: 'Hvem har best musikksmak?' },
  {
    kind: 'rule',
    en: '{p1} may only answer questions with a question.',
    nb: '{p1} kan bare svare på spørsmål med et spørsmål.',
    endEn: '{p1} can answer normally again.',
    endNb: '{p1} kan svare som vanlig igjen.',
  },
  {
    kind: 'rule',
    en: 'Nobody may say "yes" or "no".',
    nb: 'Ingen får si «ja» eller «nei».',
    endEn: 'You can say "yes" and "no" again.',
    endNb: 'Dere kan si «ja» og «nei» igjen.',
  },
  {
    kind: 'rule',
    en: '{p1} must speak in an accent of their choice.',
    nb: '{p1} må snakke med en valgfri aksent.',
    endEn: '{p1} can drop the accent.',
    endNb: '{p1} kan droppe aksenten.',
  },
  {
    kind: 'rule',
    en: '{p1} and {p2} must high-five every time someone laughs.',
    nb: '{p1} og {p2} må gi hverandre high five hver gang noen ler.',
    endEn: '{p1} and {p2} can rest their hands.',
    endNb: '{p1} og {p2} kan hvile hendene.',
  },
  {
    kind: 'rule',
    en: 'Everyone must call {p1} "Captain".',
    nb: 'Alle må kalle {p1} «Kaptein».',
    endEn: '{p1} is no longer the Captain.',
    endNb: '{p1} er ikke lenger kaptein.',
  },
];

type Refs = Record<string, PlayerHandle>;
type Shown = {
  card: number;
  refs: Refs;
  ending: boolean;
  votes: Record<PlayerHandle, PlayerHandle>;
  revealed: boolean;
};
type State = {
  mode: Mode;
  locale: 'en' | 'nb';
  players: PlayerHandle[];
  order: number[];
  at: number;
  drawn: number;
  shown: Shown;
  rules: { card: number; refs: Refs; endsAfter: number }[];
  finished: boolean;
};

const text = (state: State, card: Card, ending: boolean) =>
  ending
    ? ((state.locale === 'nb' ? card.endNb : card.endEn) ?? '')
    : state.locale === 'nb'
      ? card.nb
      : card.en;

function pickRefs(card: Card, players: PlayerHandle[], random: () => number): Refs {
  const pool = [...players],
    refs: Refs = {};
  for (const key of ['p1', 'p2'])
    if ((card.en.includes(`{${key}}`) || card.endEn?.includes(`{${key}}`)) && pool.length) {
      const [handle] = pool.splice(Math.floor(random() * pool.length), 1);
      refs[key] = handle;
    }
  return refs;
}

function show(state: State, card: number, refs: Refs, ending: boolean) {
  state.shown = { card, refs, ending, votes: {}, revealed: false };
}

function draw(state: State, random: () => number) {
  state.drawn += 1;
  const due = state.rules.findIndex((rule) => rule.endsAfter <= state.drawn);
  if (due >= 0) {
    const [rule] = state.rules.splice(due, 1);
    show(state, rule.card, rule.refs, true);
    return;
  }
  if (state.at + 1 >= state.order.length) {
    state.finished = true;
    endGame({ cards: state.at + 1 });
    return;
  }
  state.at += 1;
  const card = state.order[state.at];
  const refs = pickRefs(CARDS[card], state.players, random);
  show(state, card, refs, false);
  if (CARDS[card].kind === 'rule')
    state.rules.push({ card, refs, endsAfter: state.drawn + 4 + Math.floor(random() * 5) });
}

const isVote = (state: State) =>
  state.mode === 'phones' && CARDS[state.shown.card].kind === 'vote' && !state.shown.ending;

/** Payload of `vote`: the chosen player. */
const choice = (payload: Json): { target: PlayerHandle } => {
  const { target } = fields(payload);
  if (typeof target !== 'string') invalid('Choose a player in this game.');
  return { target };
};

export const game = defineGame({
  setup: ({ players, locale, mode, random }) => {
    const order = CARDS.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    const state: State = {
      mode,
      locale: locale === 'nb' ? 'nb' : 'en',
      players: [...players],
      order,
      at: -1,
      drawn: 0,
      shown: { card: 0, refs: {}, ending: false, votes: {}, revealed: false },
      rules: [],
      finished: false,
    };
    draw(state, random);
    return state;
  },
  actions: (action) => ({
    // A vote with answers is revealed first; the next tap moves on.
    next: action((state, { random }) => {
      if (state.finished) invalid('The deck is finished.');
      if (isVote(state) && !state.shown.revealed && Object.keys(state.shown.votes).length) {
        state.shown.revealed = true;
        return;
      }
      draw(state, random);
    }),
    vote: action({
      payload: choice,
      run: (state, { playerId, payload }) => {
        if (!isVote(state) || state.shown.revealed || !playerId) invalid('There is no open vote.');
        if (!state.players.includes(payload.target)) invalid('Choose a player in this game.');
        state.shown.votes[playerId] = payload.target;
        if (state.players.every((handle) => state.shown.votes[handle])) state.shown.revealed = true;
      },
    }),
  }),
  playerLeft: (state, { playerId }) => {
    state.players = state.players.filter((handle) => handle !== playerId);
    state.rules = state.rules.filter((rule) => !Object.values(rule.refs).includes(playerId));
    delete state.shown.votes[playerId];
    for (const [voter, target] of Object.entries(state.shown.votes))
      if (target === playerId) delete state.shown.votes[voter];
    if (isVote(state) && state.players.every((handle) => state.shown.votes[handle]))
      state.shown.revealed = true;
  },
  view: (state, playerId) => {
    const card = CARDS[state.shown.card];
    const tally: Record<PlayerHandle, number> = {};
    for (const target of Object.values(state.shown.votes)) tally[target] = (tally[target] ?? 0) + 1;
    return {
      drawn: state.drawn,
      remaining: state.order.length - state.at - 1,
      finished: state.finished,
      card: {
        kind: card.kind,
        ending: state.shown.ending,
        text: text(state, card, state.shown.ending),
        refs: state.shown.refs,
      },
      vote: isVote(state)
        ? {
            voted: Object.keys(state.shown.votes).length,
            yourVote: playerId === null ? null : (state.shown.votes[playerId] ?? null),
            tally: state.shown.revealed ? tally : null,
          }
        : null,
      rules: state.rules.map((rule) => ({
        text: text(state, CARDS[rule.card], false),
        refs: rule.refs,
      })),
    };
  },
});
