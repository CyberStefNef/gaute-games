import { defineGame, invalid, type Mode, type PlayerHandle } from '@gaute/games-sdk/logic';
import { langOf, option, shuffled, type Lang, type Text } from '../_kit/rules';

// Players take turns choosing truth or dare. Passing one phone, it goes to the
// player whose turn it is; on one shared phone the app says whose turn it is.
const TRUTHS: Text[] = [
  {
    en: 'What is the most embarrassing thing on your phone right now?',
    nb: 'Hva er det mest flaue på mobilen din akkurat nå?',
  },
  {
    en: 'Who here would you call first in an emergency?',
    nb: 'Hvem her ville du ringt først i en nødsituasjon?',
  },
  {
    en: 'What is a habit you are secretly proud of?',
    nb: 'Hvilken vane er du i hemmelighet stolt av?',
  },
  { en: 'What was your worst haircut?', nb: 'Hva var din verste frisyre?' },
  { en: 'What is the last lie you told?', nb: 'Hva er den siste løgnen du fortalte?' },
  {
    en: 'Which song do you know every word of but would never admit to?',
    nb: 'Hvilken sang kan du hvert ord av, men ville aldri innrømmet?',
  },
  { en: 'What is your most useless talent?', nb: 'Hva er ditt mest ubrukelige talent?' },
  {
    en: 'What would you do with a free day and no phone?',
    nb: 'Hva ville du gjort med en fri dag uten mobil?',
  },
  { en: 'Who was your first celebrity crush?', nb: 'Hvem var din første kjendisforelskelse?' },
  {
    en: 'What is the strangest food you have ever liked?',
    nb: 'Hva er den rareste maten du har likt?',
  },
  { en: 'What is something you pretended to understand?', nb: 'Hva har du latet som du forsto?' },
  { en: 'What is your biggest pet peeve?', nb: 'Hva irriterer du deg aller mest over?' },
  { en: 'Which app do you open way too often?', nb: 'Hvilken app åpner du altfor ofte?' },
  {
    en: 'What is the best compliment you have ever received?',
    nb: 'Hva er det beste komplimentet du har fått?',
  },
  { en: 'What did you want to be when you were ten?', nb: 'Hva ville du bli da du var ti?' },
  { en: 'What is your guilty-pleasure TV show?', nb: 'Hvilken TV-serie er din guilty pleasure?' },
  { en: 'When did you last cry, and why?', nb: 'Når gråt du sist, og hvorfor?' },
  {
    en: 'What is a rule you secretly break all the time?',
    nb: 'Hvilken regel bryter du i hemmelighet hele tiden?',
  },
  {
    en: 'Who in this room do you think is the funniest?',
    nb: 'Hvem i rommet synes du er morsomst?',
  },
  {
    en: 'What is the worst gift you have ever received?',
    nb: 'Hva er den verste gaven du har fått?',
  },
  {
    en: 'What would your perfect weekend look like?',
    nb: 'Hvordan ser den perfekte helgen din ut?',
  },
  {
    en: 'What is the most childish thing you still do?',
    nb: 'Hva er det mest barnslige du fortsatt gjør?',
  },
  {
    en: 'What is one thing you would change about your job or studies?',
    nb: 'Hva ville du endret på jobben eller studiene dine?',
  },
  {
    en: 'Which fictional character are you most like?',
    nb: 'Hvilken fiktiv figur ligner du mest på?',
  },
  { en: 'What is your weirdest fear?', nb: 'Hva er den rareste frykten din?' },
  {
    en: 'What is the last thing you searched for online?',
    nb: 'Hva søkte du sist etter på nettet?',
  },
  {
    en: 'What is the best decision you made this year?',
    nb: 'Hva er den beste avgjørelsen du har tatt i år?',
  },
  {
    en: 'Have you ever been told off by a stranger? What happened?',
    nb: 'Har du blitt kjeftet på av en fremmed? Hva skjedde?',
  },
  { en: 'What do people often get wrong about you?', nb: 'Hva tar folk ofte feil av om deg?' },
  { en: 'What is a skill you wish you had?', nb: 'Hvilken ferdighet skulle du ønske du hadde?' },
];
const DARES: Text[] = [
  {
    en: 'Do your best impression of someone here until the group guesses who.',
    nb: 'Gjør din beste etterligning av noen her til gruppa gjetter hvem.',
  },
  { en: 'Talk in a whisper until your next turn.', nb: 'Snakk hviskende til din neste tur.' },
  {
    en: 'Sing the chorus of the last song you listened to.',
    nb: 'Syng refrenget av den siste sangen du hørte på.',
  },
  { en: 'Show the group the last photo you took.', nb: 'Vis gruppa det siste bildet du tok.' },
  {
    en: 'Do ten squats while counting in another language.',
    nb: 'Ta ti knebøy mens du teller på et annet språk.',
  },
  {
    en: 'Speak only in questions until your next turn.',
    nb: 'Snakk bare i spørsmål til din neste tur.',
  },
  {
    en: 'Let the person on your left give you a new nickname for the night.',
    nb: 'La personen til venstre gi deg et nytt kallenavn for kvelden.',
  },
  {
    en: 'Do a dramatic reading of your last text message.',
    nb: 'Les opp den siste tekstmeldingen din dramatisk.',
  },
  {
    en: 'Balance something on your head for a whole minute.',
    nb: 'Balanser noe på hodet i et helt minutt.',
  },
  {
    en: 'Do your best dance move for ten seconds.',
    nb: 'Vis ditt beste dansetrinn i ti sekunder.',
  },
  {
    en: 'Tell a joke. If nobody laughs, tell another.',
    nb: 'Fortell en vits. Ler ingen, fortell en til.',
  },
  {
    en: 'Compliment every person here, one by one.',
    nb: 'Gi alle her et kompliment, én etter én.',
  },
  {
    en: 'Explain how to make a sandwich like a sports commentator.',
    nb: 'Forklar hvordan man lager en brødskive som en sportskommentator.',
  },
  {
    en: 'Keep a straight face while the group tries to make you laugh for 30 seconds.',
    nb: 'Hold maska mens gruppa prøver å få deg til å le i 30 sekunder.',
  },
  {
    en: 'Swap a piece of clothing with the person on your right.',
    nb: 'Bytt et klesplagg med personen til høyre.',
  },
  {
    en: 'Do your best robot voice until your next turn.',
    nb: 'Snakk med robotstemme til din neste tur.',
  },
  {
    en: 'Name a fruit for every letter from A to J.',
    nb: 'Nevn en frukt for hver bokstav fra A til J.',
  },
  { en: 'Act out your morning routine without words.', nb: 'Spill morgenrutinen din uten ord.' },
  {
    en: 'Let the group choose a pose for you to hold for 20 seconds.',
    nb: 'La gruppa velge en positur du holder i 20 sekunder.',
  },
  {
    en: 'Say the alphabet backwards as fast as you can.',
    nb: 'Si alfabetet baklengs så fort du kan.',
  },
  {
    en: 'Pretend to be a tour guide and present this room.',
    nb: 'Lat som du er guide og presenter dette rommet.',
  },
  { en: 'Do an advert for the nearest object.', nb: 'Lag en reklame for den nærmeste tingen.' },
  { en: 'Hum a song until someone guesses it.', nb: 'Nynn en sang til noen gjetter den.' },
  { en: 'Talk like a pirate until your next turn.', nb: 'Snakk som en pirat til din neste tur.' },
  {
    en: 'Give a two-minute speech about your favourite vegetable.',
    nb: 'Hold en tale på to minutter om favorittgrønnsaken din.',
  },
  {
    en: 'Let someone here send an emoji from your phone to a friend.',
    nb: 'La noen her sende en emoji fra mobilen din til en venn.',
  },
  { en: 'Walk like a model across the room.', nb: 'Gå som en modell over rommet.' },
  {
    en: 'Do your best animal impression until someone guesses the animal.',
    nb: 'Gjør ditt beste dyreinntrykk til noen gjetter dyret.',
  },
  {
    en: 'Make up a short poem about the person on your left.',
    nb: 'Lag et kort dikt om personen til venstre.',
  },
  {
    en: 'Do a slow-motion replay of your last goal, win or happy moment.',
    nb: 'Vis en sakte film av din siste seier eller lykkelige øyeblikk.',
  },
];

type Kind = 'truth' | 'dare';
type State = {
  mode: Mode;
  lang: Lang;
  players: PlayerHandle[];
  /** Whose turn: an index into players. */
  current: number;
  truths: number[];
  dares: number[];
  card: { kind: Kind; index: number } | null;
  done: Record<PlayerHandle, number>;
};

const player = (state: State) => state.players[state.current % state.players.length];

function pass(state: State) {
  state.card = null;
  state.current = (state.current + 1) % state.players.length;
}

export const game = defineGame({
  setup: ({ players, locale, mode, random }): State => ({
    mode,
    lang: langOf(locale),
    players: [...players],
    current: 0,
    truths: shuffled(TRUTHS.length, random),
    dares: shuffled(DARES.length, random),
    card: null,
    done: Object.fromEntries(players.map((handle) => [handle, 0])),
  }),
  actions: (action) => ({
    // 0 is truth, 1 is dare.
    choose: action({
      payload: option(2),
      run: (state, { payload }) => {
        if (state.card) invalid('Finish this one first.');
        const kind: Kind = payload.value === 0 ? 'truth' : 'dare';
        const deck = kind === 'truth' ? state.truths : state.dares;
        const index = deck.shift()!;
        deck.push(index);
        state.card = { kind, index };
      },
    }),
    done: action((state) => {
      if (!state.card) invalid('Choose truth or dare first.');
      state.done[player(state)] = (state.done[player(state)] ?? 0) + 1;
      pass(state);
    }),
    skip: action((state) => {
      if (!state.card) invalid('Choose truth or dare first.');
      pass(state);
    }),
  }),
  turn: (state) => player(state),
  playerLeft: (state, { playerId }) => {
    const index = state.players.indexOf(playerId);
    state.players = state.players.filter((handle) => handle !== playerId);
    if (index < state.current) state.current -= 1;
    if (state.current >= state.players.length) state.current = 0;
    if (index === state.current) state.card = null;
  },
  view: (state) => ({
    mode: state.mode,
    player: player(state),
    card: state.card
      ? {
          kind: state.card.kind,
          text: (state.card.kind === 'truth' ? TRUTHS : DARES)[state.card.index][state.lang],
        }
      : null,
    done: state.done,
  }),
});
