import { defineGame, endGame, invalid, type PlayerHandle } from '@gaute/games-sdk/logic';
import { langOf, score, shuffled, zeroScores, type Lang, type Text } from '../_kit/rules';

// Pass the phone to the actor: only they see the word and act it out without
// speaking. Each player has one timed turn; every word guessed is a point.
const WORDS: Text[] = [
  { en: 'Brushing your teeth', nb: 'Pusse tennene' },
  { en: 'Riding a horse', nb: 'Ri på en hest' },
  { en: 'Making pancakes', nb: 'Lage pannekaker' },
  { en: 'Walking a dog', nb: 'Gå tur med hunden' },
  { en: 'Skiing', nb: 'Gå på ski' },
  { en: 'Playing the drums', nb: 'Spille trommer' },
  { en: 'Taking a selfie', nb: 'Ta en selfie' },
  { en: 'Fishing', nb: 'Fiske' },
  { en: 'Changing a nappy', nb: 'Skifte bleie' },
  { en: 'Climbing a mountain', nb: 'Klatre i fjellet' },
  { en: 'Ironing a shirt', nb: 'Stryke en skjorte' },
  { en: 'Juggling', nb: 'Sjonglere' },
  { en: 'Driving in traffic', nb: 'Kjøre i kø' },
  { en: 'Eating spaghetti', nb: 'Spise spagetti' },
  { en: 'Surfing', nb: 'Surfe' },
  { en: 'Building a snowman', nb: 'Lage snømann' },
  { en: 'Playing football', nb: 'Spille fotball' },
  { en: 'Doing yoga', nb: 'Gjøre yoga' },
  { en: 'Waiting for the bus', nb: 'Vente på bussen' },
  { en: 'Blowing up a balloon', nb: 'Blåse opp en ballong' },
  { en: 'Painting a wall', nb: 'Male en vegg' },
  { en: 'Rowing a boat', nb: 'Ro en båt' },
  { en: 'Baking a cake', nb: 'Bake en kake' },
  { en: 'Watching a horror film', nb: 'Se en skrekkfilm' },
  { en: 'Ice skating', nb: 'Gå på skøyter' },
  { en: 'Chopping onions', nb: 'Hakke løk' },
  { en: 'Lifting weights', nb: 'Løfte vekter' },
  { en: 'Conducting an orchestra', nb: 'Dirigere et orkester' },
  { en: 'Planting a tree', nb: 'Plante et tre' },
  { en: 'Playing tennis', nb: 'Spille tennis' },
  { en: 'Getting a haircut', nb: 'Klippe håret' },
  { en: 'Catching a fly', nb: 'Fange en flue' },
  { en: 'Opening a stuck jar', nb: 'Åpne et glass som sitter fast' },
  { en: 'Walking on ice', nb: 'Gå på glatta' },
  { en: 'Singing in the shower', nb: 'Synge i dusjen' },
  { en: 'Flying a kite', nb: 'Fly med drage' },
  { en: 'Knitting', nb: 'Strikke' },
  { en: 'Playing chess', nb: 'Spille sjakk' },
  { en: 'Riding a rollercoaster', nb: 'Kjøre berg-og-dal-bane' },
  { en: 'Hailing a taxi', nb: 'Praie en taxi' },
  { en: 'Grilling sausages', nb: 'Grille pølser' },
  { en: 'Doing the laundry', nb: 'Vaske klær' },
  { en: 'Bowling', nb: 'Bowle' },
  { en: 'Rocking a baby', nb: 'Vugge en baby' },
  { en: 'Swimming the butterfly', nb: 'Svømme butterfly' },
  { en: 'Taking a photo of a group', nb: 'Ta gruppebilde' },
];

type State = {
  lang: Lang;
  players: PlayerHandle[];
  current: number;
  turns: number;
  order: number[];
  at: number;
  playing: boolean;
  turnScore: number;
  scores: Record<PlayerHandle, number>;
};

const actor = (state: State) => state.players[state.current % state.players.length];
function nextWord(state: State) {
  state.at = (state.at + 1) % state.order.length;
}

export const game = defineGame({
  setup: ({ players, locale, random }): State => ({
    lang: langOf(locale),
    players: [...players],
    current: 0,
    turns: 0,
    order: shuffled(WORDS.length, random),
    at: 0,
    playing: false,
    turnScore: 0,
    scores: zeroScores(players),
  }),
  actions: (action) => ({
    start: action((state) => {
      if (state.playing) invalid('The turn has started.');
      state.playing = true;
      state.turnScore = 0;
    }),
    guessed: action((state) => {
      if (!state.playing) invalid('Start the turn first.');
      score(state.scores, actor(state));
      state.turnScore += 1;
      nextWord(state);
    }),
    skip: action((state) => {
      if (!state.playing) invalid('Start the turn first.');
      nextWord(state);
    }),
    timeUp: action((state) => {
      if (!state.playing) invalid('Start the turn first.');
      state.playing = false;
      nextWord(state);
      state.turns += 1;
      if (state.turns >= state.players.length) {
        endGame({ scores: state.scores });
        return;
      }
      state.current = (state.current + 1) % state.players.length;
    }),
  }),
  // The phone goes to the actor for their whole turn.
  turn: (state) => actor(state),
  playerLeft: (state, { playerId }) => {
    const index = state.players.indexOf(playerId);
    state.players = state.players.filter((p) => p !== playerId);
    if (index < state.current) state.current -= 1;
    if (state.current >= state.players.length) state.current = 0;
  },
  view: (state, playerId) => ({
    actor: actor(state),
    playing: state.playing,
    // Only the actor sees the word; the shared screen never does.
    word:
      state.playing && playerId === actor(state) ? WORDS[state.order[state.at]][state.lang] : null,
    turn: state.turns + 1,
    turns: state.players.length,
    turnScore: state.turnScore,
    scores: state.scores,
  }),
});
