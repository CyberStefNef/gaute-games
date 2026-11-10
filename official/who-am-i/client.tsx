import { strings } from './strings';
import { gameClient, useStrings } from '@gaute/games-sdk/react';
import type { game } from './logic';
import { TimedPage } from '../_kit/timed-page';
import '../_kit/style.css';

const { mountGame, useGame } = gameClient<typeof game>();

function Game() {
  const { view, name, act } = useGame();
  const t = useStrings(strings);
  return (
    <TimedPage
      text={{
        pick: t('Pick a category'),
        turn: t('Turn {n} of {total}', { n: view.turn, total: view.turns }),
        ready: t('{name}, hold the phone to your forehead', { name: name(view.player) }),
        instructions: t('The others give hints without saying the word. Hard words score 2.'),
        start: t('Start'),
        yes: t('Correct'),
        no: t('Pass'),
        guessed: t('{n} points this turn', { n: view.turnScore }),
        hard: t('Hard · 2 points'),
        lastTurn: t('Last turn'),
        scores: t('Scores'),
        titles: t('Titles'),
        award: (key) => t.text(key),
        translate: t.text,
      }}
      onPick={(index) => void act('pick', { value: index })}
      onStart={() => void act('start')}
      onYes={() => void act('correct')}
      onNo={() => void act('pass')}
      onTimeUp={() => void act('timeUp')}
    />
  );
}

mountGame(Game);
