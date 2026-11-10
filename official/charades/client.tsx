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
        turn: t('Turn {n} of {total}', { n: view.turn, total: view.turns }),
        ready: t('Your turn to act, {name}', { name: name(view.player) }),
        instructions: t('Act out each word without speaking. Hide the screen! Hard words score 2.'),
        start: t('Start'),
        yes: t('Guessed'),
        no: t('Skip'),
        guessed: t('{n} points this turn', { n: view.turnScore }),
        hard: t('Hard · 2 points'),
        lastTurn: t('Last turn'),
        scores: t('Scores'),
        titles: t('Titles'),
        award: (key) => t.text(key),
        translate: t.text,
      }}
      onStart={() => void act('start')}
      onYes={() => void act('guessed')}
      onNo={() => void act('skip')}
      onTimeUp={() => void act('timeUp')}
    />
  );
}

mountGame(Game);
