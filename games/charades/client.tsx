import { gameClient, useStrings } from '@gaute/games-sdk/react';
import type { game } from './logic';
import { Button, Card, Hero, Label, Muted, Page, Scores, Title } from '../_kit/ui';
import { Countdown, useCountdown } from '../_kit/countdown';
import '../_kit/style.css';

const { mountGame, useGame } = gameClient<typeof game>();
const SECONDS = 60;

const strings = {
  en: {
    'Turn {n} of {total}': 'Turn {n} of {total}',
    'Your turn to act': 'Your turn to act',
    'Act out each word without speaking. Hide the screen!':
      'Act out each word without speaking. Hide the screen!',
    Start: 'Start',
    Guessed: 'Guessed',
    Skip: 'Skip',
    '{n} guessed': '{n} guessed',
    Scores: 'Scores',
    'The turn has started.': 'The turn has started.',
    'Start the turn first.': 'Start the turn first.',
  },
  nb: {
    'Turn {n} of {total}': 'Tur {n} av {total}',
    'Your turn to act': 'Din tur til å mime',
    'Act out each word without speaking. Hide the screen!':
      'Mim hvert ord uten å snakke. Skjul skjermen!',
    Start: 'Start',
    Guessed: 'Gjettet',
    Skip: 'Hopp over',
    '{n} guessed': '{n} gjettet',
    Scores: 'Poeng',
    'The turn has started.': 'Turen har startet.',
    'Start the turn first.': 'Start turen først.',
  },
} as const;

function Game() {
  const { view, act, playing } = useGame();
  const t = useStrings(strings);
  const left = useCountdown(SECONDS, view.playing && playing, () => void act('timeUp'));
  const anyScore = Object.values(view.scores).some(Boolean);
  if (!view.playing)
    return (
      <Page
        translate={t.text}
        actions={
          playing ? (
            <Button primary onClick={() => act('start')}>
              {t('Start')}
            </Button>
          ) : null
        }
        below={
          anyScore ? (
            <Card>
              <Label>{t('Scores')}</Label>
              <Scores scores={view.scores} />
            </Card>
          ) : null
        }
      >
        <Hero>
          <Label>{t('Turn {n} of {total}', { n: view.turn, total: view.turns })}</Label>
          <Title>{t('Your turn to act')}</Title>
          <Muted>{t('Act out each word without speaking. Hide the screen!')}</Muted>
        </Hero>
      </Page>
    );
  return (
    <Page
      translate={t.text}
      actions={
        <div className="grid grid-cols-2 gap-2">
          <Button className="min-h-16 text-lg" onClick={() => act('skip')}>
            {t('Skip')}
          </Button>
          <Button primary className="min-h-16 text-lg" onClick={() => act('guessed')}>
            {t('Guessed')}
          </Button>
        </div>
      }
    >
      <Countdown left={left} total={SECONDS} />
      <Hero className="py-16">
        <p className="text-4xl leading-tight font-bold tracking-tight text-balance break-words">
          {view.word}
        </p>
        <Muted>{t('{n} guessed', { n: view.turnScore })}</Muted>
      </Hero>
    </Page>
  );
}

mountGame(Game);
