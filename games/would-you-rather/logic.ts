import { defineGame, endGame, invalid, type Mode, type PlayerHandle } from '@gaute/games-sdk/logic';
import { langOf, option, shuffled, type Lang, type Text } from '../_kit/rules';

// Two options, one choice. On own phones everyone picks privately and the split
// is revealed with names; on one phone the group argues it out loud.
const DILEMMAS: [Text, Text][] = [
  [
    { en: 'Always be 10 minutes late', nb: 'Alltid komme 10 minutter for sent' },
    { en: 'Always be 20 minutes early', nb: 'Alltid komme 20 minutter for tidlig' },
  ],
  [
    { en: 'Only drink coffee for a year', nb: 'Bare drikke kaffe i et år' },
    { en: 'Only drink tea for a year', nb: 'Bare drikke te i et år' },
  ],
  [
    { en: 'Live without music', nb: 'Leve uten musikk' },
    { en: 'Live without films and series', nb: 'Leve uten filmer og serier' },
  ],
  [
    { en: 'Be able to fly', nb: 'Kunne fly' },
    { en: 'Be invisible', nb: 'Være usynlig' },
  ],
  [
    { en: 'Have summer all year', nb: 'Ha sommer hele året' },
    { en: 'Have winter all year', nb: 'Ha vinter hele året' },
  ],
  [
    { en: 'Speak every language', nb: 'Snakke alle språk' },
    { en: 'Play every instrument', nb: 'Spille alle instrumenter' },
  ],
  [
    { en: 'Give up your phone for a month', nb: 'Gi fra deg mobilen i en måned' },
    { en: 'Give up cheese for a year', nb: 'Droppe ost i et år' },
  ],
  [
    { en: 'Live in a big city', nb: 'Bo i en storby' },
    { en: 'Live in a cabin in the mountains', nb: 'Bo på en hytte på fjellet' },
  ],
  [
    { en: 'Know how you will die', nb: 'Vite hvordan du skal dø' },
    { en: 'Know when you will die', nb: 'Vite når du skal dø' },
  ],
  [
    { en: 'Always say what you think', nb: 'Alltid si hva du tenker' },
    { en: 'Never speak again', nb: 'Aldri snakke igjen' },
  ],
  [
    { en: 'Travel to the past', nb: 'Reise til fortiden' },
    { en: 'Travel to the future', nb: 'Reise til fremtiden' },
  ],
  [
    { en: 'Have a personal chef', nb: 'Ha en privat kokk' },
    { en: 'Have a personal driver', nb: 'Ha en privat sjåfør' },
  ],
  [
    { en: 'Be famous', nb: 'Være kjent' },
    { en: 'Be rich and unknown', nb: 'Være rik og ukjent' },
  ],
  [
    { en: 'Eat pizza every day', nb: 'Spise pizza hver dag' },
    { en: 'Never eat pizza again', nb: 'Aldri spise pizza igjen' },
  ],
  [
    { en: 'Have no internet for a month', nb: 'Være uten internett i en måned' },
    { en: 'Have no hot water for a month', nb: 'Være uten varmtvann i en måned' },
  ],
  [
    { en: 'Read minds', nb: 'Lese tanker' },
    { en: 'See the future', nb: 'Se inn i fremtiden' },
  ],
  [
    { en: 'Sing every time you speak', nb: 'Synge hver gang du snakker' },
    { en: 'Dance every time you walk', nb: 'Danse hver gang du går' },
  ],
  [
    { en: 'Be the funniest person in the room', nb: 'Være den morsomste i rommet' },
    { en: 'Be the smartest person in the room', nb: 'Være den smarteste i rommet' },
  ],
  [
    { en: 'Go on holiday to the beach', nb: 'Dra på strandferie' },
    { en: 'Go on holiday to the mountains', nb: 'Dra på fjellferie' },
  ],
  [
    { en: 'Have a rewind button for your life', nb: 'Ha en spol-tilbake-knapp for livet' },
    { en: 'Have a pause button for your life', nb: 'Ha en pauseknapp for livet' },
  ],
  [
    { en: 'Only be able to whisper', nb: 'Bare kunne hviske' },
    { en: 'Only be able to shout', nb: 'Bare kunne rope' },
  ],
  [
    { en: 'Live without social media', nb: 'Leve uten sosiale medier' },
    { en: 'Live without takeaway food', nb: 'Leve uten takeaway' },
  ],
  [
    { en: 'Have a dog', nb: 'Ha hund' },
    { en: 'Have a cat', nb: 'Ha katt' },
  ],
  [
    { en: 'Win the lottery', nb: 'Vinne i lotto' },
    { en: 'Live twice as long', nb: 'Leve dobbelt så lenge' },
  ],
  [
    { en: 'Be stuck in a lift with your boss', nb: 'Sitte fast i en heis med sjefen din' },
    { en: 'Be stuck in a lift with your ex', nb: 'Sitte fast i en heis med eksen din' },
  ],
  [
    { en: 'Wake up at 5 every day', nb: 'Våkne klokka 5 hver dag' },
    { en: 'Go to bed at 9 every day', nb: 'Legge deg klokka 21 hver dag' },
  ],
  [
    { en: 'Have unlimited free flights', nb: 'Ha ubegrenset med gratis flyreiser' },
    { en: 'Have unlimited free food', nb: 'Ha ubegrenset med gratis mat' },
  ],
  [
    { en: 'Talk to animals', nb: 'Snakke med dyr' },
    { en: 'Talk to plants', nb: 'Snakke med planter' },
  ],
  [
    { en: 'Be a famous athlete', nb: 'Være en kjent idrettsutøver' },
    { en: 'Be a famous musician', nb: 'Være en kjent musiker' },
  ],
  [
    { en: 'Always have to sneeze', nb: 'Alltid måtte nyse' },
    { en: 'Always have hiccups', nb: 'Alltid ha hikke' },
  ],
];

type State = {
  mode: Mode;
  lang: Lang;
  players: PlayerHandle[];
  order: number[];
  at: number;
  /** Own phones: 0 for the first option, 1 for the second. */
  votes: Record<PlayerHandle, number>;
  revealed: boolean;
};

const everyoneVoted = (state: State) => state.players.every((p) => state.votes[p] !== undefined);

export const game = defineGame({
  setup: ({ players, locale, mode, random }): State => ({
    mode,
    lang: langOf(locale),
    players: [...players],
    order: shuffled(DILEMMAS.length, random),
    at: 0,
    votes: {},
    revealed: false,
  }),
  actions: (action) => ({
    vote: action({
      payload: option(2),
      run: (state, { playerId, payload }) => {
        if (state.mode !== 'phones' || !playerId || state.revealed)
          invalid('Wait for the next question.');
        state.votes[playerId] = payload.value;
        if (everyoneVoted(state)) state.revealed = true;
      },
    }),
    next: action((state) => {
      if (state.mode === 'phones' && !state.revealed) {
        if (!Object.keys(state.votes).length) invalid('Nobody has chosen yet.');
        state.revealed = true;
        return;
      }
      if (state.at + 1 >= state.order.length) {
        endGame(null);
        return;
      }
      state.at += 1;
      state.votes = {};
      state.revealed = false;
    }),
  }),
  playerLeft: (state, { playerId }) => {
    state.players = state.players.filter((p) => p !== playerId);
    delete state.votes[playerId];
    if (state.mode === 'phones' && !state.revealed && state.players.length && everyoneVoted(state))
      state.revealed = true;
  },
  view: (state, playerId) => {
    const [a, b] = DILEMMAS[state.order[state.at]];
    return {
      mode: state.mode,
      options: [a[state.lang], b[state.lang]],
      number: state.at + 1,
      total: state.order.length,
      yourVote: playerId === null ? null : (state.votes[playerId] ?? null),
      voted: Object.keys(state.votes).length,
      split: state.revealed
        ? [0, 1].map((choice) => state.players.filter((p) => state.votes[p] === choice))
        : null,
    };
  },
});
