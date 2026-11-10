// Rules shared by the timed word games (Who Am I?, Charades): one turn per
// player, a 60-second round on the page, a mixed word deck, hard words
// worth two points and a recap of each turn.
import { endGame, invalid, type PlayerHandle } from '@gaute/games-sdk/logic';
import { awards, langOf, score, shuffled, zeroScores, type Lang, type Text } from './rules';

export type Word = Text & { hard?: true };
export type WordPack = { name: Text; hint: Text; words: Word[] };

export type TimedState = {
  lang: Lang;
  players: PlayerHandle[];
  current: number;
  turns: number;
  order: number[];
  at: number;
  playing: boolean;
  turnScore: number;
  /** This turn's words, in order: guessed or passed. */
  recap: { word: number; ok: boolean }[];
  scores: Record<PlayerHandle, number>;
};

export const timedSetup = (
  players: PlayerHandle[],
  locale: string,
  words: Word[],
  random: () => number,
): TimedState => ({
  lang: langOf(locale),
  players: [...players],
  current: 0,
  turns: 0,
  order: shuffled(words.length, random),
  at: 0,
  playing: false,
  turnScore: 0,
  recap: [],
  scores: zeroScores(players),
});

export const turnPlayer = (state: TimedState) =>
  state.players[state.current % state.players.length];

export function start(state: TimedState, words: Word[], random: () => number) {
  if (state.at >= state.order.length) {
    state.order = shuffled(words.length, random);
    state.at = 0;
  }
  if (state.playing) invalid('The turn has started.');
  state.playing = true;
  state.turnScore = 0;
  state.recap = [];
}

/** The word was guessed (worth 2 when hard) or passed; the next one comes up. */
export function settleWord(state: TimedState, words: Word[], ok: boolean, random: () => number) {
  if (!state.playing) invalid('Start the turn first.');
  const index = state.order[state.at];
  if (ok) {
    const points = words[index].hard ? 2 : 1;
    score(state.scores, turnPlayer(state), points);
    state.turnScore += points;
  }
  state.recap.push({ word: index, ok });
  state.at += 1;
  if (state.at >= state.order.length) {
    state.order = shuffled(words.length, random);
    state.at = 0;
  }
}

export function timeUp(state: TimedState) {
  if (!state.playing) invalid('Start the turn first.');
  state.playing = false;
  state.at += 1;
  state.turns += 1;
  if (state.turns >= state.players.length) {
    endGame({ scores: state.scores });
    return;
  }
  state.current = (state.current + 1) % state.players.length;
}

export function leave(state: TimedState, playerId: PlayerHandle) {
  const index = state.players.indexOf(playerId);
  state.players = state.players.filter((p) => p !== playerId);
  if (index < state.current) state.current -= 1;
  if (state.current >= state.players.length) state.current = 0;
}

/** What every timed game shows; `wordShown` decides who may see the word. */
export function timedView(state: TimedState, words: Word[], wordShown: boolean) {
  const word = state.playing ? words[state.order[state.at]] : null;
  return {
    player: turnPlayer(state),
    playing: state.playing,
    word: word && wordShown ? word[state.lang] : null,
    hard: Boolean(word && wordShown && word.hard),
    turn: state.turns + 1,
    turns: state.players.length,
    turnScore: state.turnScore,
    recap: !state.playing
      ? state.recap.map(({ word, ok }) => ({ word: words[word][state.lang], ok }))
      : [],
    scores: state.scores,
    awards: awards([{ title: 'star', stat: state.scores, least: 3 }], state.players),
  };
}
