import { gameClient, useStrings } from '@gaute/games-sdk/react';
import type { game } from './logic';
import { Button, Hero, Label, Muted, Page } from '../_kit/ui';
import '../_kit/style.css';

const { mountGame, useGame } = gameClient<typeof game>();

const strings = {
  en: {
    'Would you rather…': 'Would you rather…',
    or: 'or',
    '{n} of {total}': '{n} of {total}',
    '{count} of {total} chose': '{count} of {total} chose',
    Next: 'Next',
    'Show choices': 'Show choices',
    Nobody: 'Nobody',
    'Wait for the next question.': 'Wait for the next question.',
    'Nobody has chosen yet.': 'Nobody has chosen yet.',
    'Choose one of the options.': 'Choose one of the options.',
  },
  nb: {
    'Would you rather…': 'Ville du heller…',
    or: 'eller',
    '{n} of {total}': '{n} av {total}',
    '{count} of {total} chose': '{count} av {total} har valgt',
    Next: 'Neste',
    'Show choices': 'Vis valgene',
    Nobody: 'Ingen',
    'Wait for the next question.': 'Vent på neste spørsmål.',
    'Nobody has chosen yet.': 'Ingen har valgt ennå.',
    'Choose one of the options.': 'Velg et av alternativene.',
  },
} as const;

function Game() {
  const { view, players, name, act, playing, busy } = useGame();
  const t = useStrings(strings);
  const phones = view.mode === 'phones';
  const present = players.filter((player) => !player.left).length;
  const choosing = phones && !view.split;
  return (
    <Page
      translate={t.text}
      actions={
        playing && (!choosing || view.voted > 0) ? (
          <Button primary onClick={() => act('next')}>
            {choosing ? t('Show choices') : t('Next')}
          </Button>
        ) : null
      }
    >
      <Hero>
        <Label>{t('{n} of {total}', { n: view.number, total: view.total })}</Label>
        <Muted>{t('Would you rather…')}</Muted>
        {view.options.map((text, index) => {
          const chosen = view.yourVote === index;
          const names = view.split?.[index] ?? [];
          return (
            <div key={index} className="flex w-full flex-col items-center gap-2">
              {index === 1 ? <Muted>{t('or')}</Muted> : null}
              <button
                type="button"
                disabled={!choosing || busy || !playing}
                onClick={() => act('vote', { value: index })}
                className={`w-full rounded-xl border-2 px-4 py-4 text-xl font-bold text-balance transition-colors ${
                  chosen
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background'
                } ${choosing ? 'active:opacity-70' : ''}`}
              >
                {text}
              </button>
              {view.split ? (
                <p className="text-sm text-muted-foreground">
                  {names.length ? names.map(name).join(', ') : t('Nobody')}
                </p>
              ) : null}
            </div>
          );
        })}
        {choosing ? (
          <Muted>{t('{count} of {total} chose', { count: view.voted, total: present })}</Muted>
        ) : null}
      </Hero>
    </Page>
  );
}

mountGame(Game);
