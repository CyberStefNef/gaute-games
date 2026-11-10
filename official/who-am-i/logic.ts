import { PACKS } from './content';
import { defineGame } from '@gaute/games-sdk/logic';
import { option } from '../_kit/rules';
import { leave, pickPack, settleWord, start, timedSetup, timedView, timeUp } from '../_kit/timed';

// One phone on the guesser's forehead: the others see the word and give hints.
// Pick a category first. Each player has one 60-second turn; hard words score 2.

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
