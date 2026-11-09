import { defineGame, endGame, invalid, type Mode, type PlayerHandle } from '@gaute/games-sdk/logic';
import { langOf, option, shuffled, type Lang, type Text } from '../_kit/rules';

// One statement at a time. On own phones everyone answers privately, then the
// app shows who has done it. On one phone the group answers out loud.
const STATEMENTS: Text[] = [
  { en: 'sung karaoke in public.', nb: 'sunget karaoke offentlig.' },
  { en: 'fallen asleep at a party.', nb: 'sovnet på en fest.' },
  { en: 'sent a message to the wrong person.', nb: 'sendt en melding til feil person.' },
  { en: 'pretended to know a song I didn’t.', nb: 'latet som jeg kunne en sang jeg ikke kunne.' },
  { en: 'laughed at the wrong moment.', nb: 'ledd i helt feil øyeblikk.' },
  {
    en: 'forgotten someone’s name right after meeting them.',
    nb: 'glemt navnet til noen rett etter at jeg møtte dem.',
  },
  { en: 'danced on a table.', nb: 'danset på et bord.' },
  { en: 'missed a flight or a train.', nb: 'kommet for sent til et fly eller et tog.' },
  { en: 'cried at an advert.', nb: 'grått av en reklame.' },
  { en: 'stalked an ex online.', nb: 'snoket på en eks på nett.' },
  { en: 'lied about my age.', nb: 'løyet om alderen min.' },
  { en: 'walked into a glass door.', nb: 'gått rett inn i en glassdør.' },
  { en: 'eaten food that fell on the floor.', nb: 'spist mat som falt på gulvet.' },
  { en: 'gone a whole day without my phone.', nb: 'vært en hel dag uten mobilen.' },
  { en: 'been on TV or the radio.', nb: 'vært på TV eller radio.' },
  {
    en: 'waved back at someone who wasn’t waving at me.',
    nb: 'vinket tilbake til noen som ikke vinket til meg.',
  },
  { en: 'regifted a present.', nb: 'gitt bort en gave jeg selv har fått.' },
  { en: 'had a crush on a teacher.', nb: 'vært forelsket i en lærer.' },
  { en: 'locked myself out of my home.', nb: 'låst meg ute hjemmefra.' },
  { en: 'binge-watched a whole series in one weekend.', nb: 'sett en hel serie på én helg.' },
  { en: 'told a joke nobody laughed at.', nb: 'fortalt en vits som ingen lo av.' },
  { en: 'slept in a tent.', nb: 'sovet i telt.' },
  { en: 'cut my own hair.', nb: 'klipt mitt eget hår.' },
  {
    en: 'sent a voice message longer than five minutes.',
    nb: 'sendt en talemelding på over fem minutter.',
  },
  { en: 'gone swimming in the sea in winter.', nb: 'badet i sjøen om vinteren.' },
  {
    en: 'pretended to be on the phone to avoid someone.',
    nb: 'latet som jeg snakket i telefonen for å unngå noen.',
  },
  { en: 'broken something and blamed someone else.', nb: 'knust noe og gitt noen andre skylda.' },
  { en: 'been recognised by a stranger.', nb: 'blitt gjenkjent av en fremmed.' },
  { en: 'fallen off a bike in front of people.', nb: 'falt av sykkelen foran folk.' },
  {
    en: 'ordered the same dish as someone and regretted it.',
    nb: 'bestilt det samme som noen andre og angret.',
  },
  {
    en: 'talked to a pet like it was a person.',
    nb: 'snakket med et kjæledyr som om det var et menneske.',
  },
  { en: 'gotten lost in my own city.', nb: 'gått meg vill i min egen by.' },
  { en: 'skipped school or work for a concert.', nb: 'skulket skole eller jobb for en konsert.' },
  {
    en: 'replied “you too” when it made no sense.',
    nb: 'svart «i like måte» når det ikke ga mening.',
  },
  { en: 'kept a plant alive for over a year.', nb: 'holdt en plante i live i over ett år.' },
  { en: 'won a competition.', nb: 'vunnet en konkurranse.' },
];

type State = {
  mode: Mode;
  lang: Lang;
  players: PlayerHandle[];
  order: number[];
  at: number;
  /** Own phones: true for "I have". */
  answers: Record<PlayerHandle, boolean>;
  revealed: boolean;
  /** How many statements each player has done. */
  have: Record<PlayerHandle, number>;
};

const everyoneAnswered = (state: State) =>
  state.players.every((player) => state.answers[player] !== undefined);

function draw(state: State) {
  if (state.at + 1 >= state.order.length) {
    endGame({ have: state.have });
    return;
  }
  state.at += 1;
  state.answers = {};
  state.revealed = false;
}

export const game = defineGame({
  setup: ({ players, locale, mode, random }): State => ({
    mode,
    lang: langOf(locale),
    players: [...players],
    order: shuffled(STATEMENTS.length, random),
    at: 0,
    answers: {},
    revealed: false,
    have: Object.fromEntries(players.map((player) => [player, 0])),
  }),
  actions: (action) => ({
    answer: action({
      payload: option(2),
      run: (state, { playerId, payload }) => {
        if (state.mode !== 'phones' || !playerId || state.revealed)
          invalid('Wait for the next statement.');
        state.answers[playerId] = payload.value === 1;
        if (everyoneAnswered(state)) {
          state.revealed = true;
          for (const player of state.players)
            if (state.answers[player]) state.have[player] = (state.have[player] ?? 0) + 1;
        }
      },
    }),
    next: action((state) => {
      if (state.mode === 'phones' && !state.revealed) {
        if (!Object.keys(state.answers).length) invalid('Nobody has answered yet.');
        state.revealed = true;
        for (const player of state.players)
          if (state.answers[player]) state.have[player] = (state.have[player] ?? 0) + 1;
        return;
      }
      draw(state);
    }),
  }),
  playerLeft: (state, { playerId }) => {
    state.players = state.players.filter((player) => player !== playerId);
    delete state.answers[playerId];
    if (
      state.mode === 'phones' &&
      !state.revealed &&
      state.players.length &&
      everyoneAnswered(state)
    )
      state.revealed = true;
  },
  view: (state, playerId) => ({
    mode: state.mode,
    statement: STATEMENTS[state.order[state.at]][state.lang],
    number: state.at + 1,
    total: state.order.length,
    yourAnswer: playerId === null ? null : (state.answers[playerId] ?? null),
    answered: Object.keys(state.answers).length,
    revealed: state.revealed,
    haveDone: state.revealed
      ? state.players.filter((player) => state.answers[player])
      : ([] as PlayerHandle[]),
    have: state.have,
  }),
});
