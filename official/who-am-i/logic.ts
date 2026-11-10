import { WORDS } from './content';
import { defineGame } from '@gaute/games-sdk/logic';
import { leave, settleWord, start, timedSetup, timedView, timeUp } from '../_kit/timed';

// One phone on the guesser's forehead: the others see the word and give hints.
// Each player has one 60-second turn; hard words score 2.

export const game = defineGame({
  setup: ({ players, locale, random }) => timedSetup(players, locale, WORDS, random),
  actions: (action) => ({
    start: action((state, { random }) => start(state, WORDS, random)),
    correct: action((state, { random }) => settleWord(state, WORDS, true, random)),
    pass: action((state, { random }) => settleWord(state, WORDS, false, random)),
    timeUp: action((state) => timeUp(state)),
  }),
  playerLeft: (state, { playerId }) => leave(state, playerId),
  // On one shared phone, the screen shows the word to everyone but the guesser.
  view: (state) => timedView(state, WORDS, true),
});
