import { WORDS } from './content';
import { defineGame, invalid, type PlayerHandle } from '@gaute/games-sdk/logic';
import {
  leave,
  settleWord,
  start,
  timedSetup,
  timedView,
  timeUp,
  turnPlayer,
  type TimedState,
} from '../_kit/timed';

// Pass the phone to the actor: only they see the word and act it out without
// speaking. One 60-second turn each; hard words score 2.

function requireActor(state: TimedState, playerId: PlayerHandle | null) {
  if (playerId !== turnPlayer(state)) invalid('It is not your turn.');
}

export const game = defineGame({
  setup: ({ players, locale, random }) => timedSetup(players, locale, WORDS, random),
  actions: (action) => ({
    start: action((state, { random, playerId }) => {
      requireActor(state, playerId);
      start(state, WORDS, random);
    }),
    guessed: action((state, { random, playerId }) => {
      requireActor(state, playerId);
      settleWord(state, WORDS, true, random);
    }),
    skip: action((state, { random, playerId }) => {
      requireActor(state, playerId);
      settleWord(state, WORDS, false, random);
    }),
    timeUp: action((state, { playerId }) => {
      requireActor(state, playerId);
      timeUp(state);
    }),
  }),
  // The phone goes to the actor for their whole turn, including the ready screen.
  turn: (state) => turnPlayer(state),
  playerLeft: (state, { playerId }) => leave(state, playerId),
  // Only the actor sees the word.
  view: (state, playerId) => timedView(state, WORDS, playerId === turnPlayer(state)),
});
