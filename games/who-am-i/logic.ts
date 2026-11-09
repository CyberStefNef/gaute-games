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
  type Word,
  type WordPack,
} from '../_kit/timed';

// One phone on the guesser's forehead: the others see the word and give hints.
// Pick a category first. Each player has one 60-second turn; hard words score 2.
const x = (en: string, nb: string): Text => ({ en, nb });
const hard = (en: string, nb: string): Word => ({ en, nb, hard: true });

const PACKS: WordPack[] = [
  {
    name: x('Animals', 'Dyr'),
    hint: x('From moose to platypus', 'Fra elg til nebbdyr'),
    words: [
      x('Penguin', 'Pingvin'),
      x('Giraffe', 'Sjiraff'),
      x('Moose', 'Elg'),
      x('Kangaroo', 'Kenguru'),
      x('Octopus', 'Blekksprut'),
      x('Polar bear', 'Isbjørn'),
      x('Shark', 'Hai'),
      x('Owl', 'Ugle'),
      x('Bee', 'Bie'),
      x('Elephant', 'Elefant'),
      x('Hedgehog', 'Pinnsvin'),
      x('Seagull', 'Måke'),
      hard('Platypus', 'Nebbdyr'),
      hard('Chameleon', 'Kameleon'),
      hard('Sloth', 'Dovendyr'),
      hard('Flamingo', 'Flamingo'),
      hard('Jellyfish', 'Manet'),
      hard('Woodpecker', 'Hakkespett'),
    ],
  },
  {
    name: x('People & jobs', 'Folk og yrker'),
    hint: x('Who does what', 'Hvem gjør hva'),
    words: [
      x('Astronaut', 'Astronaut'),
      x('Pirate', 'Pirat'),
      x('Dentist', 'Tannlege'),
      x('Firefighter', 'Brannkonstabel'),
      x('Chef', 'Kokk'),
      x('Teacher', 'Lærer'),
      x('Pilot', 'Pilot'),
      x('Detective', 'Detektiv'),
      x('Hairdresser', 'Frisør'),
      x('Bus driver', 'Bussjåfør'),
      x('DJ', 'DJ'),
      x('Waiter', 'Servitør'),
      hard('Beekeeper', 'Birøkter'),
      hard('Weather presenter', 'Værmelder'),
      hard('Lighthouse keeper', 'Fyrvokter'),
      hard('Stunt double', 'Stuntmann'),
      hard('Sommelier', 'Sommelier'),
      hard('Referee', 'Dommer'),
    ],
  },
  {
    name: x('Fantasy', 'Fantasi'),
    hint: x('Myths, monsters and legends', 'Myter, monstre og sagn'),
    words: [
      x('Vampire', 'Vampyr'),
      x('Dragon', 'Drage'),
      x('Mermaid', 'Havfrue'),
      x('Ghost', 'Spøkelse'),
      x('Wizard', 'Trollmann'),
      x('Troll', 'Troll'),
      x('Unicorn', 'Enhjørning'),
      x('Zombie', 'Zombie'),
      x('Santa Claus', 'Julenissen'),
      x('Superhero', 'Superhelt'),
      x('Alien', 'Romvesen'),
      x('Knight', 'Ridder'),
      hard('Tooth fairy', 'Tannfeen'),
      hard('Werewolf', 'Varulv'),
      hard('Genie', 'Ånden i lampen'),
      hard('Cyclops', 'Kyklop'),
      hard('Phoenix', 'Fugl Føniks'),
      hard('Huldra', 'Huldra'),
    ],
  },
  {
    name: x('Things & food', 'Ting og mat'),
    hint: x('Everyday things and things you eat', 'Hverdagsting og mat'),
    words: [
      x('Pizza', 'Pizza'),
      x('Banana', 'Banan'),
      x('Umbrella', 'Paraply'),
      x('Toothbrush', 'Tannbørste'),
      x('Snowman', 'Snømann'),
      x('Lighthouse', 'Fyrtårn'),
      x('Popcorn', 'Popkorn'),
      x('Bicycle', 'Sykkel'),
      x('Sunglasses', 'Solbriller'),
      x('Taco', 'Taco'),
      x('Rubber duck', 'Badeand'),
      x('Guitar', 'Gitar'),
      hard('Brown cheese', 'Brunost'),
      hard('Disco ball', 'Diskokule'),
      hard('Fire extinguisher', 'Brannslukker'),
      hard('Lava lamp', 'Lavalampe'),
      hard('Waffle iron', 'Vaffeljern'),
      hard('Hourglass', 'Timeglass'),
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
    correct: action((state) => settleWord(state, PACKS, true)),
    pass: action((state) => settleWord(state, PACKS, false)),
    timeUp: action((state) => timeUp(state)),
  }),
  playerLeft: (state, { playerId }) => leave(state, playerId),
  // On one shared phone, the screen shows the word to everyone but the guesser.
  view: (state) => timedView(state, PACKS, true),
});
