import { defineGame, endGame, invalid, type Mode, type PlayerHandle } from '@gaute/games-sdk/logic';
import { langOf, option, score, shuffled, zeroScores, type Lang, type Text } from '../_kit/rules';

// Ten multiple-choice questions. On own phones everyone answers privately and
// scores; on one phone the group agrees on an answer and plays as a team.
type Question = { q: Text; options: [Text, Text, Text, Text]; answer: number };
const t = (en: string, nb = en): Text => ({ en, nb });

const QUESTIONS: Question[] = [
  {
    q: t('What is the capital of Australia?', 'Hva er hovedstaden i Australia?'),
    options: [t('Sydney'), t('Canberra'), t('Melbourne'), t('Perth')],
    answer: 1,
  },
  {
    q: t(
      'How many planets are in our solar system?',
      'Hvor mange planeter er det i solsystemet vårt?',
    ),
    options: [t('7'), t('8'), t('9'), t('10')],
    answer: 1,
  },
  {
    q: t('Which is the largest ocean?', 'Hvilket hav er størst?'),
    options: [
      t('The Atlantic', 'Atlanterhavet'),
      t('The Indian Ocean', 'Det indiske hav'),
      t('The Pacific', 'Stillehavet'),
      t('The Arctic Ocean', 'Polhavet'),
    ],
    answer: 2,
  },
  {
    q: t('What is the chemical symbol for gold?', 'Hva er det kjemiske symbolet for gull?'),
    options: [t('Ag'), t('Au'), t('Gd'), t('Go')],
    answer: 1,
  },
  {
    q: t('Who painted the Mona Lisa?', 'Hvem malte Mona Lisa?'),
    options: [t('Michelangelo'), t('Raphael'), t('Leonardo da Vinci'), t('Vincent van Gogh')],
    answer: 2,
  },
  {
    q: t('What is the longest river in Norway?', 'Hva er Norges lengste elv?'),
    options: [t('Glomma'), t('Numedalslågen'), t('Tana'), t('Gudbrandsdalslågen')],
    answer: 0,
  },
  {
    q: t('How many hearts does an octopus have?', 'Hvor mange hjerter har en blekksprut?'),
    options: [t('1'), t('2'), t('3'), t('4')],
    answer: 2,
  },
  {
    q: t('In which year did the Berlin Wall fall?', 'Hvilket år falt Berlinmuren?'),
    options: [t('1987'), t('1989'), t('1991'), t('1993')],
    answer: 1,
  },
  {
    q: t('What is Norway’s highest mountain?', 'Hva er Norges høyeste fjell?'),
    options: [t('Galdhøpiggen'), t('Glittertind'), t('Snøhetta'), t('Store Skagastølstind')],
    answer: 0,
  },
  {
    q: t('Which is the fastest land animal?', 'Hvilket landdyr er raskest?'),
    options: [
      t('Lion', 'Løve'),
      t('Cheetah', 'Gepard'),
      t('Pronghorn', 'Gaffelantilope'),
      t('Horse', 'Hest'),
    ],
    answer: 1,
  },
  {
    q: t('Which gas do plants take in from the air?', 'Hvilken gass tar planter opp fra lufta?'),
    options: [
      t('Oxygen', 'Oksygen'),
      t('Nitrogen'),
      t('Carbon dioxide', 'Karbondioksid'),
      t('Helium'),
    ],
    answer: 2,
  },
  {
    q: t('How many bones does an adult human have?', 'Hvor mange bein har et voksent menneske?'),
    options: [t('186'), t('206'), t('226'), t('246')],
    answer: 1,
  },
  {
    q: t('What is the smallest prime number?', 'Hva er det minste primtallet?'),
    options: [t('0'), t('1'), t('2'), t('3')],
    answer: 2,
  },
  {
    q: t(
      'Which language has the most native speakers?',
      'Hvilket språk har flest morsmålsbrukere?',
    ),
    options: [
      t('English', 'Engelsk'),
      t('Spanish', 'Spansk'),
      t('Mandarin Chinese', 'Mandarin'),
      t('Hindi'),
    ],
    answer: 2,
  },
  {
    q: t('What is the hardest natural material?', 'Hva er det hardeste naturlige materialet?'),
    options: [t('Diamond', 'Diamant'), t('Gold', 'Gull'), t('Iron', 'Jern'), t('Quartz', 'Kvarts')],
    answer: 0,
  },
  {
    q: t(
      'How many players does a football team have on the pitch?',
      'Hvor mange spillere har et fotballag på banen?',
    ),
    options: [t('9'), t('10'), t('11'), t('12')],
    answer: 2,
  },
  {
    q: t(
      'At what Fahrenheit temperature does water freeze?',
      'Ved hvor mange grader Fahrenheit fryser vann?',
    ),
    options: [t('0 °F'), t('32 °F'), t('100 °F'), t('212 °F')],
    answer: 1,
  },
  {
    q: t('What is the capital of Canada?', 'Hva er hovedstaden i Canada?'),
    options: [t('Toronto'), t('Vancouver'), t('Ottawa'), t('Montreal')],
    answer: 2,
  },
  {
    q: t('Which planet is called the Red Planet?', 'Hvilken planet kalles den røde planeten?'),
    options: [t('Venus'), t('Mars'), t('Jupiter'), t('Mercury', 'Merkur')],
    answer: 1,
  },
  {
    q: t('Which instrument usually has 88 keys?', 'Hvilket instrument har vanligvis 88 tangenter?'),
    options: [t('Guitar', 'Gitar'), t('Piano'), t('Accordion', 'Trekkspill'), t('Harp', 'Harpe')],
    answer: 1,
  },
  {
    q: t('Which is the largest planet?', 'Hvilken planet er størst?'),
    options: [t('Saturn'), t('Jupiter'), t('Neptune', 'Neptun'), t('Uranus')],
    answer: 1,
  },
  {
    q: t('How many minutes are there in a day?', 'Hvor mange minutter er det i et døgn?'),
    options: [t('1,240', '1 240'), t('1,440', '1 440'), t('1,640', '1 640'), t('1,840', '1 840')],
    answer: 1,
  },
  {
    q: t('What is the capital of Iceland?', 'Hva er hovedstaden på Island?'),
    options: [t('Reykjavík'), t('Akureyri'), t('Tórshavn'), t('Nuuk')],
    answer: 0,
  },
  {
    q: t(
      'Which metal is liquid at room temperature?',
      'Hvilket metall er flytende i romtemperatur?',
    ),
    options: [t('Lead', 'Bly'), t('Mercury', 'Kvikksølv'), t('Tin', 'Tinn'), t('Zinc', 'Sink')],
    answer: 1,
  },
  {
    q: t('How many sides does a hexagon have?', 'Hvor mange sider har en sekskant?'),
    options: [t('5'), t('6'), t('7'), t('8')],
    answer: 1,
  },
  {
    q: t(
      'Which country gives London its Trafalgar Square Christmas tree every year?',
      'Hvilket land gir London juletreet på Trafalgar Square hvert år?',
    ),
    options: [t('Sweden', 'Sverige'), t('Norway', 'Norge'), t('Denmark', 'Danmark'), t('Finland')],
    answer: 1,
  },
  {
    q: t(
      'What is Norway’s sweet brown cheese called?',
      'Hva heter den søte, brune osten fra Norge?',
    ),
    options: [t('Brunost'), t('Gamalost'), t('Pultost'), t('Jarlsberg')],
    answer: 0,
  },
  {
    q: t('Roughly how fast does light travel?', 'Omtrent hvor fort går lyset?'),
    options: [
      t('30,000 km/s', '30 000 km/s'),
      t('150,000 km/s', '150 000 km/s'),
      t('300,000 km/s', '300 000 km/s'),
      t('3,000,000 km/s', '3 000 000 km/s'),
    ],
    answer: 2,
  },
  {
    q: t('Which is the largest mammal?', 'Hvilket pattedyr er størst?'),
    options: [
      t('Elephant', 'Elefant'),
      t('Blue whale', 'Blåhval'),
      t('Giraffe', 'Sjiraff'),
      t('Orca', 'Spekkhogger'),
    ],
    answer: 1,
  },
  {
    q: t('How many continents are there?', 'Hvor mange kontinenter er det?'),
    options: [t('5'), t('6'), t('7'), t('8')],
    answer: 2,
  },
];
const PER_GAME = 10;

type State = {
  mode: Mode;
  lang: Lang;
  players: PlayerHandle[];
  order: number[];
  at: number;
  answers: Record<PlayerHandle, number>;
  /** One phone: the group's answer. */
  groupAnswer: number | null;
  revealed: boolean;
  scores: Record<PlayerHandle, number>;
  groupScore: number;
};

const question = (state: State) => QUESTIONS[state.order[state.at]];

function reveal(state: State) {
  state.revealed = true;
  const right = question(state).answer;
  for (const [player, answer] of Object.entries(state.answers))
    if (answer === right) score(state.scores, player);
  if (state.groupAnswer === right) state.groupScore += 1;
}

export const game = defineGame({
  setup: ({ players, locale, mode, random }): State => ({
    mode,
    lang: langOf(locale),
    players: [...players],
    order: shuffled(QUESTIONS.length, random).slice(0, PER_GAME),
    at: 0,
    answers: {},
    groupAnswer: null,
    revealed: false,
    scores: zeroScores(players),
    groupScore: 0,
  }),
  actions: (action) => ({
    answer: action({
      payload: option(4),
      run: (state, { playerId, payload }) => {
        if (state.revealed) invalid('Wait for the next question.');
        if (state.mode === 'phones') {
          if (!playerId) invalid('Wait for the next question.');
          state.answers[playerId] = payload.value;
          if (state.players.every((p) => state.answers[p] !== undefined)) reveal(state);
        } else {
          state.groupAnswer = payload.value;
          reveal(state);
        }
      },
    }),
    reveal: action((state) => {
      if (state.revealed || !Object.keys(state.answers).length) invalid('Nobody has answered yet.');
      reveal(state);
    }),
    next: action((state) => {
      if (!state.revealed) invalid('Answer first.');
      if (state.at + 1 >= state.order.length) {
        endGame(state.mode === 'phones' ? { scores: state.scores } : { score: state.groupScore });
        return;
      }
      state.at += 1;
      state.answers = {};
      state.groupAnswer = null;
      state.revealed = false;
    }),
  }),
  playerLeft: (state, { playerId }) => {
    state.players = state.players.filter((p) => p !== playerId);
    delete state.answers[playerId];
    if (
      state.mode === 'phones' &&
      !state.revealed &&
      state.players.length &&
      state.players.every((p) => state.answers[p] !== undefined)
    )
      reveal(state);
  },
  view: (state, playerId) => {
    const current = question(state);
    return {
      mode: state.mode,
      number: state.at + 1,
      total: state.order.length,
      question: current.q[state.lang],
      options: current.options.map((choice) => choice[state.lang]),
      yourAnswer: playerId === null ? state.groupAnswer : (state.answers[playerId] ?? null),
      answered: Object.keys(state.answers).length,
      revealed: state.revealed,
      correct: state.revealed ? current.answer : null,
      picks: state.revealed ? state.answers : ({} as Record<PlayerHandle, number>),
      scores: state.scores,
      groupScore: state.groupScore,
    };
  },
});
