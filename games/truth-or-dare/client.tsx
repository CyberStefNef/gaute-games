import { gameClient, useStrings } from '@gaute/games-sdk/react';
import type { game } from './logic';
import { Button, Hero, Label, Page, Title } from '../_kit/ui';
import '../_kit/style.css';

const { mountGame, useGame } = gameClient<typeof game>();

const strings = {
  en: {
    '{name}’s turn': '{name}’s turn',
    'Truth or dare?': 'Truth or dare?',
    Truth: 'Truth',
    Dare: 'Dare',
    Done: 'Done',
    Skip: 'Skip',
    'Finish this one first.': 'Finish this one first.',
    'Choose truth or dare first.': 'Choose truth or dare first.',
    'Choose one of the options.': 'Choose one of the options.',
  },
  nb: {
    '{name}’s turn': '{name} sin tur',
    'Truth or dare?': 'Sannhet eller konsekvens?',
    Truth: 'Sannhet',
    Dare: 'Konsekvens',
    Done: 'Ferdig',
    Skip: 'Hopp over',
    'Finish this one first.': 'Fullfør denne først.',
    'Choose truth or dare first.': 'Velg sannhet eller konsekvens først.',
    'Choose one of the options.': 'Velg et av alternativene.',
  },
} as const;

function Game() {
  const { view, name, act, playing } = useGame();
  const t = useStrings(strings);
  const turn = t('{name}’s turn', { name: name(view.player) });
  if (!view.card)
    return (
      <Page
        translate={t.text}
        actions={
          playing ? (
            <div className="grid grid-cols-2 gap-2">
              <Button primary onClick={() => act('choose', { value: 0 })}>
                {t('Truth')}
              </Button>
              <Button primary onClick={() => act('choose', { value: 1 })}>
                {t('Dare')}
              </Button>
            </div>
          ) : null
        }
      >
        <Hero>
          <Label>{turn}</Label>
          <Title large>{t('Truth or dare?')}</Title>
        </Hero>
      </Page>
    );
  return (
    <Page
      translate={t.text}
      actions={
        playing ? (
          <div className="grid grid-cols-[1fr_2fr] gap-2">
            <Button onClick={() => act('skip')}>{t('Skip')}</Button>
            <Button primary onClick={() => act('done')}>
              {t('Done')}
            </Button>
          </div>
        ) : null
      }
    >
      <Hero
        className={
          view.card.kind === 'dare' ? 'border-primary bg-primary text-primary-foreground' : ''
        }
      >
        <Label>
          <span className={view.card.kind === 'dare' ? 'text-primary-foreground/80' : ''}>
            {turn} · {view.card.kind === 'truth' ? t('Truth') : t('Dare')}
          </span>
        </Label>
        <Title large>{view.card.text}</Title>
      </Hero>
    </Page>
  );
}

mountGame(Game);
