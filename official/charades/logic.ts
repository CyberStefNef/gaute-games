import { PACKS } from './content';
import { defineGame } from '@gaute/games-sdk/logic';
import { option } from '../_kit/rules';
import {
  leave,
  pickPack,
  settleWord,
  start,
  timedSetup,
  timedView,
  timeUp,
  turnPlayer,
} from '../_kit/timed';

// Pass the phone to the actor: only they see the word and act it out without
// speaking. Pick a category first. One 60-second turn each; hard words score 2.

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
