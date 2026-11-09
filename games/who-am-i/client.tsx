import { gameClient, useStrings } from '@gaute/games-sdk/react';
import type { game } from './logic';
import { TimedPage } from '../_kit/timed-page';
import '../_kit/style.css';

const { mountGame, useGame } = gameClient<typeof game>();

const strings = {
  en: {
    'Pick a category': 'Pick a category',
    'Turn {n} of {total}': 'Turn {n} of {total}',
    '{name}, hold the phone to your forehead': '{name}, hold the phone to your forehead',
    'The others give hints without saying the word. Hard words score 2.':
      'The others give hints without saying the word. Hard words score 2.',
    Start: 'Start',
    Correct: 'Correct',
    Pass: 'Pass',
    '{n} points this turn': '{n} points this turn',
    'Hard · 2 points': 'Hard · 2 points',
    'Last turn': 'Last turn',
    Scores: 'Scores',
    Titles: 'Titles',
    star: 'Star guesser',
    'The category is chosen.': 'The category is chosen.',
    'Choose a category first.': 'Choose a category first.',
    'The turn has started.': 'The turn has started.',
    'Start the turn first.': 'Start the turn first.',
    'Choose one of the options.': 'Choose one of the options.',
  },
  nb: {
    'Pick a category': 'Velg en kategori',
    'Turn {n} of {total}': 'Tur {n} av {total}',
    '{name}, hold the phone to your forehead': '{name}, hold telefonen mot panna',
    'The others give hints without saying the word. Hard words score 2.':
      'De andre gir hint uten å si ordet. Vanskelige ord gir 2 poeng.',
    Start: 'Start',
    Correct: 'Riktig',
    Pass: 'Pass',
    '{n} points this turn': '{n} poeng denne turen',
    'Hard · 2 points': 'Vanskelig · 2 poeng',
    'Last turn': 'Forrige tur',
    Scores: 'Poeng',
    Titles: 'Titler',
    star: 'Gjettemester',
    'The category is chosen.': 'Kategorien er valgt.',
    'Choose a category first.': 'Velg en kategori først.',
    'The turn has started.': 'Turen har startet.',
    'Start the turn first.': 'Start turen først.',
    'Choose one of the options.': 'Velg et av alternativene.',
  },
} as const;

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
