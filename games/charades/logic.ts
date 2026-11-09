import { defineGame } from '@gaute/games-sdk/logic';
import { option, type Text } from '../_kit/rules';
import {
  leave,
  pickPack,
  settleWord,
  start,
  timedSetup,
  timedView,
  timeUp,
  turnPlayer,
  type Word,
  type WordPack,
} from '../_kit/timed';

// Pass the phone to the actor: only they see the word and act it out without
// speaking. Pick a category first. One 60-second turn each; hard words score 2.
const x = (en: string, nb: string): Text => ({ en, nb });
const hard = (en: string, nb: string): Word => ({ en, nb, hard: true });

const PACKS: WordPack[] = [
  {
    name: x('Everyday', 'Hverdag'),
    hint: x('Things everybody does', 'Ting alle gjør'),
    words: [
      x('Brushing your teeth', 'Pusse tennene'),
      x('Making pancakes', 'Lage pannekaker'),
      x('Walking a dog', 'Gå tur med hunden'),
      x('Taking a selfie', 'Ta en selfie'),
      x('Ironing a shirt', 'Stryke en skjorte'),
      x('Waiting for the bus', 'Vente på bussen'),
      x('Chopping onions', 'Hakke løk'),
      x('Opening a stuck jar', 'Åpne et glass som sitter fast'),
      x('Singing in the shower', 'Synge i dusjen'),
      x('Doing the laundry', 'Vaske klær'),
      hard('Assembling flat-pack furniture', 'Skru sammen flatpakkmøbler'),
      hard('Missing the last bus', 'Miste siste buss'),
      hard('Walking on ice', 'Gå på glatta'),
      hard('Changing a nappy', 'Skifte bleie'),
    ],
  },
  {
    name: x('Sports & hobbies', 'Sport og hobby'),
    hint: x('Moves you can mime', 'Bevegelser du kan mime'),
    words: [
      x('Skiing', 'Gå på ski'),
      x('Fishing', 'Fiske'),
      x('Surfing', 'Surfe'),
      x('Juggling', 'Sjonglere'),
      x('Playing the drums', 'Spille trommer'),
      x('Doing yoga', 'Gjøre yoga'),
      x('Bowling', 'Bowle'),
      x('Ice skating', 'Gå på skøyter'),
      x('Lifting weights', 'Løfte vekter'),
      x('Playing tennis', 'Spille tennis'),
      hard('Curling', 'Curling'),
      hard('Fencing', 'Fekting'),
      hard('Synchronised swimming', 'Synkronsvømming'),
      hard('Knitting', 'Strikke'),
    ],
  },
  {
    name: x('Jobs & roles', 'Yrker og roller'),
    hint: x('Who are you being?', 'Hvem spiller du?'),
    words: [
      x('Pilot', 'Pilot'),
      x('Chef', 'Kokk'),
      x('Hairdresser', 'Frisør'),
      x('Dentist', 'Tannlege'),
      x('Firefighter', 'Brannkonstabel'),
      x('Waiter', 'Servitør'),
      x('Photographer', 'Fotograf'),
      x('Conductor', 'Dirigent'),
      x('Painter', 'Maler'),
      x('Lifeguard', 'Badevakt'),
      hard('Air traffic controller', 'Flygeleder'),
      hard('Mime artist', 'Mimekunstner'),
      hard('Tour guide', 'Guide'),
      hard('Magician', 'Tryllekunstner'),
    ],
  },
  {
    name: x('Wild', 'Ville'),
    hint: x('Strange situations, big laughs', 'Rare situasjoner, mye latter'),
    words: [
      x('Riding a rollercoaster', 'Kjøre berg-og-dal-bane'),
      x('Catching a fly', 'Fange en flue'),
      x('Building a snowman', 'Lage snømann'),
      x('Flying a kite', 'Fly med drage'),
      x('Watching a horror film', 'Se en skrekkfilm'),
      x('Blowing up a balloon', 'Blåse opp en ballong'),
      hard('Escaping from a bee', 'Flykte fra en bie'),
      hard('Being stuck in a lift', 'Sitte fast i en heis'),
      hard('Walking a cat on a lead', 'Gå tur med en katt i bånd'),
      hard('A penguin learning to fly', 'En pingvin som lærer å fly'),
      hard('Losing your phone in the sofa', 'Miste mobilen i sofaen'),
      hard('A robot falling in love', 'En robot som forelsker seg'),
    ],
  },
];

export const game = defineGame({
  setup: ({ players, locale }) => timedSetup(players, locale),
  actions: (action) => ({
    pick: action({
      payload: option(PACKS.length),
      run: (state, { payload, random }) => pickPack(state, PACKS, payload.value, random),
    }),
    start: action((state) => start(state)),
    guessed: action((state) => settleWord(state, PACKS, true)),
    skip: action((state) => settleWord(state, PACKS, false)),
    timeUp: action((state) => timeUp(state)),
  }),
  // The phone goes to the actor for their whole turn, once a category is chosen.
  turn: (state) => (state.pack === null ? null : turnPlayer(state)),
  playerLeft: (state, { playerId }) => leave(state, playerId),
  // Only the actor sees the word.
  view: (state, playerId) => timedView(state, PACKS, playerId === turnPlayer(state)),
});
