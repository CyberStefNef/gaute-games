import {
  defineGame,
  endGame,
  fields,
  invalid,
  type Json,
  type Mode,
  type PlayerHandle,
} from '@gaute/games-sdk/logic';
import { awards, count, langOf, option, shuffled, type Lang, type Text } from '../_kit/rules';

// One statement at a time. On own phones everyone answers privately and starts
// with five lives: every "I have" costs one, and the last player standing wins.
// When only one player has done it, it's story time. On one phone the group
// answers out loud. Players can add their own statements.
type Pack = { name: Text; hint: Text; statements: Text[] };
const x = (en: string, nb: string): Text => ({ en, nb });
const LIVES = 5;

const PACKS: Pack[] = [
  {
    name: x('Fun', 'Moro'),
    hint: x('Harmless and silly, for any group', 'Uskyldig og tullete, for alle'),
    statements: [
      x('sung karaoke in public.', 'sunget karaoke offentlig.'),
      x('fallen asleep at a party.', 'sovnet på en fest.'),
      x('laughed at the wrong moment.', 'ledd i helt feil øyeblikk.'),
      x('walked into a glass door.', 'gått rett inn i en glassdør.'),
      x('eaten food that fell on the floor.', 'spist mat som falt på gulvet.'),
      x(
        'waved back at someone who wasn’t waving at me.',
        'vinket tilbake til noen som ikke vinket til meg.',
      ),
      x('locked myself out of my home.', 'låst meg ute hjemmefra.'),
      x('binge-watched a whole series in one weekend.', 'sett en hel serie på én helg.'),
      x('told a joke nobody laughed at.', 'fortalt en vits som ingen lo av.'),
      x('cut my own hair.', 'klipt mitt eget hår.'),
      x(
        'talked to a pet like it was a person.',
        'snakket med et kjæledyr som om det var et menneske.',
      ),
      x('gotten lost in my own city.', 'gått meg vill i min egen by.'),
      x('replied “you too” when it made no sense.', 'svart «i like måte» når det ikke ga mening.'),
      x('fallen off a bike in front of people.', 'falt av sykkelen foran folk.'),
      x('pretended to know a song I didn’t.', 'latet som jeg kunne en sang jeg ikke kunne.'),
      x('cried at an advert.', 'grått av en reklame.'),
      x('been on TV or the radio.', 'vært på TV eller radio.'),
      x('gone swimming in the sea in winter.', 'badet i sjøen om vinteren.'),
    ],
  },
  {
    name: x('Party', 'Fest'),
    hint: x('Nights out, mishaps and secrets', 'Utekvelder, uhell og hemmeligheter'),
    statements: [
      x('danced on a table.', 'danset på et bord.'),
      x('sent a message to the wrong person.', 'sendt en melding til feil person.'),
      x('stalked an ex online.', 'snoket på en eks på nett.'),
      x('lied about my age.', 'løyet om alderen min.'),
      x('regifted a present.', 'gitt bort en gave jeg selv har fått.'),
      x('had a crush on a teacher.', 'vært forelsket i en lærer.'),
      x(
        'pretended to be on the phone to avoid someone.',
        'latet som jeg snakket i telefonen for å unngå noen.',
      ),
      x('broken something and blamed someone else.', 'knust noe og gitt noen andre skylda.'),
      x('skipped school or work for a concert.', 'skulket skole eller jobb for en konsert.'),
      x(
        'sent a voice message longer than five minutes.',
        'sendt en talemelding på over fem minutter.',
      ),
      x('missed a flight or a train.', 'kommet for sent til et fly eller et tog.'),
      x(
        'forgotten someone’s name right after meeting them.',
        'glemt navnet til noen rett etter at jeg møtte dem.',
      ),
      x('ghosted someone.', 'ghostet noen.'),
      x('snuck into an event without a ticket.', 'sneket meg inn på et arrangement uten billett.'),
      x('got a tattoo I regret.', 'tatt en tatovering jeg angrer på.'),
      x('kissed someone in this room.', 'kysset noen i dette rommet.'),
      x('been kicked out of a bar.', 'blitt kastet ut av en bar.'),
      x('used a fake name to meet someone.', 'brukt et falskt navn for å møte noen.'),
    ],
  },
  {
    name: x('Deep', 'Dyp'),
    hint: x('Honest moments, bigger stories', 'Ærlige øyeblikk, større historier'),
    statements: [
      x('moved somewhere I didn’t know anyone.', 'flyttet et sted der jeg ikke kjente noen.'),
      x('quit something I loved.', 'sluttet med noe jeg elsket.'),
      x('told someone I loved them first.', 'vært den første som sa «jeg elsker deg».'),
      x('lost touch with a best friend.', 'mistet kontakten med en bestevenn.'),
      x('changed my mind about something big.', 'ombestemt meg om noe stort.'),
      x('done something that scared me on purpose.', 'gjort noe som skremte meg, med vilje.'),
      x('kept a secret for more than five years.', 'holdt på en hemmelighet i over fem år.'),
      x('cried in front of my boss.', 'grått foran sjefen min.'),
      x('travelled alone.', 'reist alene.'),
      x('apologised years too late.', 'bedt om unnskyldning flere år for sent.'),
      x('written a letter I never sent.', 'skrevet et brev jeg aldri sendte.'),
      x('started over from scratch.', 'begynt helt på nytt.'),
    ],
  },
];

type State = {
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
  lives: Record<PlayerHandle, number>;
  have: Record<PlayerHandle, number>;
  stories: Record<PlayerHandle, number>;
};

const playing = (state: State) => state.players.filter((p) => (state.lives[p] ?? 0) > 0);
const everyoneAnswered = (state: State) =>
  playing(state).every((p) => state.answers[p] !== undefined);

const statement = (payload: Json): { text: string } => {
  const { text } = fields(payload);
  if (typeof text !== 'string' || !text.trim() || text.length > 140)
    invalid('Write a short statement.');
  return { text: text.trim() };
};

function finish(state: State) {
  endGame({ lives: state.lives, have: state.have });
}

function reveal(state: State) {
  state.revealed = true;
  if (state.mode !== 'phones') return;
  const did = playing(state).filter((p) => state.answers[p]);
  for (const p of did) {
    state.lives[p] = Math.max(0, (state.lives[p] ?? 0) - 1);
    count(state.have, p);
  }
  if (did.length === 1) count(state.stories, did[0]);
}

function draw(state: State) {
  state.answers = {};
  state.revealed = false;
  if (state.mode === 'phones' && playing(state).length <= 1) return finish(state);
  const mine = state.own.shift();
  if (mine !== undefined) {
    state.current = { en: mine, nb: mine };
    return;
  }
  const pack = PACKS[state.pack!];
  if (state.at + 1 >= state.order.length) return finish(state);
  state.at += 1;
  state.current = pack.statements[state.order[state.at]];
}

export const game = defineGame({
  setup: ({ players, locale, mode }): State => ({
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
    lives: Object.fromEntries(players.map((p) => [p, LIVES])),
    have: {},
    stories: {},
  }),
  actions: (action) => ({
    pick: action({
      payload: option(PACKS.length),
      run: (state, { payload, random }) => {
        if (state.pack !== null) invalid('The pack is chosen.');
        state.pack = payload.value;
        state.order = shuffled(PACKS[payload.value].statements.length, random);
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
        if ((state.lives[playerId] ?? 0) <= 0) invalid('You’re out of lives. Watch the others!');
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
    delete state.lives[playerId];
    if (
      state.mode === 'phones' &&
      state.current &&
      !state.revealed &&
      playing(state).length &&
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
      yourLives: playerId === null ? null : (state.lives[playerId] ?? 0),
      answered: Object.keys(state.answers).length,
      inPlay: playing(state).length,
      revealed: state.revealed,
      haveDone: did,
      storyTime: state.mode === 'phones' && did.length === 1 ? did[0] : null,
      lives: state.lives,
      awards: awards(
        [
          { title: 'seenItAll', stat: state.have, least: 2 },
          { title: 'storyteller', stat: state.stories },
          {
            title: 'angel',
            stat: Object.fromEntries(state.players.map((p) => [p, state.lives[p] ?? 0])),
            least: LIVES - 1,
          },
        ],
        state.players,
      ),
    };
  },
});
