import {
  defineGame,
  fields,
  invalid,
  type Json,
  type Mode,
  type PlayerHandle,
} from '@gaute/games-sdk/logic';
import {
  awards,
  count,
  langOf,
  option,
  pickRefs,
  shuffled,
  type Lang,
  type Text,
} from '../_kit/rules';

// Players take turns choosing truth or dare. The group picks a pack first, and
// can add its own truths and dares. Prompts name other players ({p1}, {p2});
// group dares involve everyone. Nothing repeats until a deck runs out.
type Kind = 'truth' | 'dare';
type Pack = { name: Text; hint: Text; truths: Text[]; dares: Text[] };
const x = (en: string, nb: string): Text => ({ en, nb });

const PACKS: Pack[] = [
  {
    name: x('Warm-up', 'Oppvarming'),
    hint: x('Easy, funny, for any group', 'Lett og morsomt, for alle'),
    truths: [
      x('What is your most useless talent?', 'Hva er ditt mest ubrukelige talent?'),
      x('What did you want to be when you were ten?', 'Hva ville du bli da du var ti?'),
      x('Which app do you open way too often?', 'Hvilken app åpner du altfor ofte?'),
      x('What is the strangest food you have ever liked?', 'Hva er den rareste maten du har likt?'),
      x('What was your worst haircut?', 'Hva var din verste frisyre?'),
      x(
        'Which song do you know every word of but would never admit to?',
        'Hvilken sang kan du hvert ord av, men ville aldri innrømmet?',
      ),
      x('What would {p1} be famous for?', 'Hva ville {p1} vært kjent for?'),
      x('What is the best gift you have ever given?', 'Hva er den beste gaven du har gitt?'),
      x(
        'Who here would survive longest on a desert island?',
        'Hvem her ville overlevd lengst på en øde øy?',
      ),
      x('What is your go-to karaoke song?', 'Hva er karaokesangen din?'),
      x('What is the last thing you searched for online?', 'Hva søkte du sist etter på nettet?'),
      x('What is your weirdest fear?', 'Hva er den rareste frykten din?'),
    ],
    dares: [
      x(
        'Do your best impression of {p1} until someone guesses who.',
        'Gjør din beste etterligning av {p1} til noen gjetter hvem.',
      ),
      x('Talk like a pirate until your next turn.', 'Snakk som en pirat til din neste tur.'),
      x(
        'Sing the chorus of the last song you listened to.',
        'Syng refrenget av den siste sangen du hørte på.',
      ),
      x(
        'Do ten squats while counting in another language.',
        'Ta ti knebøy mens du teller på et annet språk.',
      ),
      x(
        'Everyone: on three, point at the person most likely to be late. {p1} counts.',
        'Alle: på tre peker dere på den som oftest kommer for sent. {p1} teller.',
      ),
      x('Hum a song until someone guesses it.', 'Nynn en sang til noen gjetter den.'),
      x(
        'Give {p1} a new nickname for the night. Everyone must use it.',
        'Gi {p1} et nytt kallenavn for kvelden. Alle må bruke det.',
      ),
      x(
        'Do a dramatic reading of your last text message.',
        'Les opp den siste tekstmeldingen din dramatisk.',
      ),
      x(
        'Do your best animal impression until someone guesses the animal.',
        'Gjør ditt beste dyreinntrykk til noen gjetter dyret.',
      ),
      x(
        'Name a fruit for every letter from A to J.',
        'Nevn en frukt for hver bokstav fra A til J.',
      ),
      x(
        'Everyone: switch seats. The last one standing does a dance move.',
        'Alle: bytt plass. Den siste som står, viser et dansetrinn.',
      ),
      x('Talk in a whisper until your next turn.', 'Snakk hviskende til din neste tur.'),
    ],
  },
  {
    name: x('Party', 'Fest'),
    hint: x('Louder, sillier, more people involved', 'Mer støy, mer tull, flere med'),
    truths: [
      x(
        'What is the most embarrassing thing on your phone right now?',
        'Hva er det mest flaue på mobilen din akkurat nå?',
      ),
      x('What is the last lie you told?', 'Hva er den siste løgnen du fortalte?'),
      x(
        'Who here would you call first in an emergency?',
        'Hvem her ville du ringt først i en nødsituasjon?',
      ),
      x(
        'What would you never want {p1} to find out about you?',
        'Hva vil du aldri at {p1} skal finne ut om deg?',
      ),
      x(
        'Which person here gives the best advice, and which the worst?',
        'Hvem her gir de beste rådene, og hvem de verste?',
      ),
      x(
        'What is the most childish thing you still do?',
        'Hva er det mest barnslige du fortsatt gjør?',
      ),
      x('What is your guilty-pleasure TV show?', 'Hvilken TV-serie er din guilty pleasure?'),
      x(
        'Have you ever been told off by a stranger? What happened?',
        'Har du blitt kjeftet på av en fremmed? Hva skjedde?',
      ),
      x(
        'What is a rule you secretly break all the time?',
        'Hvilken regel bryter du i hemmelighet hele tiden?',
      ),
      x(
        'If you had to swap lives with {p1} for a week, what would you do first?',
        'Hvis du måtte bytte liv med {p1} i en uke, hva ville du gjort først?',
      ),
      x('What is the worst date you have been on?', 'Hva er den verste daten du har vært på?'),
      x('Who in this room do you think is the funniest?', 'Hvem i rommet synes du er morsomst?'),
    ],
    dares: [
      x(
        'Let {p1} post an emoji of their choice on your social media story.',
        'La {p1} legge ut en emoji etter eget valg i storyen din.',
      ),
      x(
        'Keep a straight face while the group tries to make you laugh for 30 seconds.',
        'Hold maska mens gruppa prøver å få deg til å le i 30 sekunder.',
      ),
      x('Swap a piece of clothing with {p1}.', 'Bytt et klesplagg med {p1}.'),
      x(
        'Do a slow-motion replay of your last big win.',
        'Vis en sakte film av din siste store seier.',
      ),
      x(
        'Everyone: the last person to touch their nose has to sing a line of any song.',
        'Alle: den siste som tar seg på nesa, må synge en linje av en sang.',
      ),
      x(
        'Pretend to be a tour guide and present this room.',
        'Lat som du er guide og presenter dette rommet.',
      ),
      x('Act out {p1}’s morning routine without words.', 'Spill {p1} sin morgenrutine uten ord.'),
      x(
        'Give a two-minute speech about your favourite vegetable.',
        'Hold en tale på to minutter om favorittgrønnsaken din.',
      ),
      x(
        'Speak only in questions until your next turn.',
        'Snakk bare i spørsmål til din neste tur.',
      ),
      x(
        'Everyone: thumb war tournament. {p1} referees.',
        'Alle: tommelkrig-turnering. {p1} er dommer.',
      ),
      x(
        'Walk like a model across the room while {p1} commentates.',
        'Gå som en modell over rommet mens {p1} kommenterer.',
      ),
      x('Show the group the last photo you took.', 'Vis gruppa det siste bildet du tok.'),
    ],
  },
  {
    name: x('Deep talk', 'Dype samtaler'),
    hint: x('Honest questions, get to know each other', 'Ærlige spørsmål, bli bedre kjent'),
    truths: [
      x(
        'What is something you are proud of that nobody here knows?',
        'Hva er du stolt av som ingen her vet om?',
      ),
      x('When did you last cry, and why?', 'Når gråt du sist, og hvorfor?'),
      x(
        'What is the best decision you made this year?',
        'Hva er den beste avgjørelsen du har tatt i år?',
      ),
      x('What do people often get wrong about you?', 'Hva tar folk ofte feil av om deg?'),
      x('What is something {p1} does that you admire?', 'Hva gjør {p1} som du beundrer?'),
      x(
        'What would you do if you knew you could not fail?',
        'Hva ville du gjort hvis du visste at du ikke kunne mislykkes?',
      ),
      x(
        'Which moment of your life would you relive?',
        'Hvilket øyeblikk i livet ville du opplevd på nytt?',
      ),
      x('What is a habit you are trying to change?', 'Hvilken vane prøver du å endre?'),
      x(
        'What is the kindest thing a stranger has done for you?',
        'Hva er det snilleste en fremmed har gjort for deg?',
      ),
      x('What is a skill you wish you had?', 'Hvilken ferdighet skulle du ønske du hadde?'),
    ],
    dares: [
      x(
        'Tell {p1} one thing you have always appreciated about them.',
        'Fortell {p1} én ting du alltid har satt pris på ved dem.',
      ),
      x('Compliment every person here, one by one.', 'Gi alle her et kompliment, én etter én.'),
      x(
        'Describe your perfect day, minute by minute, in one breath.',
        'Beskriv den perfekte dagen din, minutt for minutt, på ett pust.',
      ),
      x(
        'Everyone: share one word for how tonight feels.',
        'Alle: si ett ord for hvordan kvelden føles.',
      ),
      x('Make up a short poem about {p1}.', 'Lag et kort dikt om {p1}.'),
      x('Tell the story of how you met {p1}.', 'Fortell historien om hvordan du møtte {p1}.'),
      x(
        'Name three things you are grateful for right now.',
        'Nevn tre ting du er takknemlig for akkurat nå.',
      ),
      x('Give {p1} a piece of honest advice.', 'Gi {p1} et ærlig råd.'),
    ],
  },
  {
    name: x('Bold', 'Modig'),
    hint: x('Daring dares and cheeky truths', 'Dristige utfordringer og frekke spørsmål'),
    truths: [
      x(
        'Who here would you most like to go on a holiday with?',
        'Hvem her ville du helst dratt på ferie med?',
      ),
      x('What is your biggest turn-off?', 'Hva er det som tenner deg minst?'),
      x(
        'Have you ever had a crush on someone in this room?',
        'Har du noen gang vært forelsket i noen i dette rommet?',
      ),
      x(
        'What is the most rebellious thing you have done?',
        'Hva er det mest opprørske du har gjort?',
      ),
      x(
        'Rate {p1}’s dance moves from 1 to 10, and explain.',
        'Gi {p1} sine dansetrinn en karakter fra 1 til 10, og forklar.',
      ),
      x(
        'What is the cheesiest pick-up line you have used or heard?',
        'Hva er den mest klisjéaktige sjekkereplikken du har brukt eller hørt?',
      ),
      x(
        'What is something you would only admit to tonight?',
        'Hva ville du bare innrømmet i kveld?',
      ),
      x('Who was your first celebrity crush?', 'Hvem var din første kjendisforelskelse?'),
    ],
    dares: [
      x(
        'Let {p1} read your last three searches out loud.',
        'La {p1} lese opp de tre siste søkene dine.',
      ),
      x(
        'Call a friend and sing them happy birthday, whatever the date.',
        'Ring en venn og syng hurra for deg, uansett dato.',
      ),
      x('Do your best runway walk with {p1} as your partner.', 'Gå catwalk med {p1} som partner.'),
      x('Serenade {p1} with a love song of your choice.', 'Syng en kjærlighetssang for {p1}.'),
      x(
        'Let the group choose a pose for you to hold for 30 seconds.',
        'La gruppa velge en positur du holder i 30 sekunder.',
      ),
      x(
        'Send the third person in your chats a voice message of you laughing.',
        'Send den tredje personen i chattene dine en talemelding der du ler.',
      ),
      x(
        'Swap phones with {p1} for two minutes. No snooping.',
        'Bytt mobil med {p1} i to minutter. Ingen snoking.',
      ),
      x(
        'Do a dramatic slow-motion fall, then get up like nothing happened.',
        'Gjør et dramatisk fall i sakte film, og reis deg som om ingenting skjedde.',
      ),
    ],
  },
];

type Card = { kind: Kind; text: Text; refs: Record<string, PlayerHandle> };
type State = {
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
  skips: Record<PlayerHandle, number>;
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
    skips: {},
  }),
  actions: (action) => ({
    pick: action({
      payload: option(PACKS.length),
      run: (state, { payload, random }) => {
        if (state.pack !== null) invalid('The pack is chosen.');
        state.pack = payload.value;
        state.truths = shuffled(PACKS[payload.value].truths.length, random);
        state.dares = shuffled(PACKS[payload.value].dares.length, random);
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
          const pack = PACKS[state.pack];
          text = (kind === 'truth' ? pack.truths : pack.dares)[index];
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
      count(state.skips, player(state));
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
        { title: 'chicken', stat: state.skips },
      ],
      state.players,
    ),
  }),
});
