import { defineGame, endGame, invalid, type PlayerHandle } from '@gaute/games-sdk/logic';
import { langOf, score, shuffled, zeroScores, type Lang, type Text } from '../_kit/rules';

// One phone on the guesser's forehead: the others see the word and give hints.
// Each player has one timed turn; every word guessed is a point.
const WORDS: Text[] = [
  { en: 'Penguin', nb: 'Pingvin' },
  { en: 'Astronaut', nb: 'Astronaut' },
  { en: 'Pirate', nb: 'Pirat' },
  { en: 'Dentist', nb: 'Tannlege' },
  { en: 'Vampire', nb: 'Vampyr' },
  { en: 'Santa Claus', nb: 'Julenissen' },
  { en: 'Giraffe', nb: 'Sjiraff' },
  { en: 'Firefighter', nb: 'Brannmann' },
  { en: 'Robot', nb: 'Robot' },
  { en: 'Mermaid', nb: 'Havfrue' },
  { en: 'Chef', nb: 'Kokk' },
  { en: 'Dragon', nb: 'Drage' },
  { en: 'Moose', nb: 'Elg' },
  { en: 'Viking', nb: 'Viking' },
  { en: 'Ghost', nb: 'Spøkelse' },
  { en: 'Teacher', nb: 'Lærer' },
  { en: 'Lighthouse', nb: 'Fyrtårn' },
  { en: 'Snowman', nb: 'Snømann' },
  { en: 'Kangaroo', nb: 'Kenguru' },
  { en: 'Superhero', nb: 'Superhelt' },
  { en: 'Wizard', nb: 'Trollmann' },
  { en: 'Octopus', nb: 'Blekksprut' },
  { en: 'Pilot', nb: 'Pilot' },
  { en: 'Troll', nb: 'Troll' },
  { en: 'Cowboy', nb: 'Cowboy' },
  { en: 'Tooth fairy', nb: 'Tannfeen' },
  { en: 'Detective', nb: 'Detektiv' },
  { en: 'Banana', nb: 'Banan' },
  { en: 'Polar bear', nb: 'Isbjørn' },
  { en: 'Ninja', nb: 'Ninja' },
  { en: 'Bus driver', nb: 'Bussjåfør' },
  { en: 'Unicorn', nb: 'Enhjørning' },
  { en: 'Zombie', nb: 'Zombie' },
  { en: 'Hairdresser', nb: 'Frisør' },
  { en: 'Shark', nb: 'Hai' },
  { en: 'King', nb: 'Konge' },
  { en: 'Waiter', nb: 'Servitør' },
  { en: 'Owl', nb: 'Ugle' },
  { en: 'Clown', nb: 'Klovn' },
  { en: 'Lifeguard', nb: 'Livvakt på stranda' },
  { en: 'Alien', nb: 'Romvesen' },
  { en: 'Bee', nb: 'Bie' },
  { en: 'Surfer', nb: 'Surfer' },
  { en: 'Knight', nb: 'Ridder' },
  { en: 'Gnome', nb: 'Nisse' },
  { en: 'Pizza', nb: 'Pizza' },
  { en: 'Elephant', nb: 'Elefant' },
  { en: 'DJ', nb: 'DJ' },
];

type State = {
  lang: Lang;
  players: PlayerHandle[];
  current: number;
  /** Players who have had their turn. */
  turns: number;
  order: number[];
  at: number;
  playing: boolean;
  turnScore: number;
  scores: Record<PlayerHandle, number>;
};

const guesser = (state: State) => state.players[state.current % state.players.length];
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
    correct: action((state) => {
      if (!state.playing) invalid('Start the turn first.');
      score(state.scores, guesser(state));
      state.turnScore += 1;
      nextWord(state);
    }),
    pass: action((state) => {
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
  playerLeft: (state, { playerId }) => {
    const index = state.players.indexOf(playerId);
    state.players = state.players.filter((p) => p !== playerId);
    if (index < state.current) state.current -= 1;
    if (state.current >= state.players.length) state.current = 0;
  },
  view: (state) => ({
    guesser: guesser(state),
    playing: state.playing,
    word: state.playing ? WORDS[state.order[state.at]][state.lang] : null,
    turn: state.turns + 1,
    turns: state.players.length,
    turnScore: state.turnScore,
    scores: state.scores,
  }),
});
