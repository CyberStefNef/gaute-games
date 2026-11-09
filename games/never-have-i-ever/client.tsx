import { gameClient, useStrings } from '@gaute/games-sdk/react';
import type { game } from './logic';
import { Button, Hero, Label, Muted, Page, Title } from '../_kit/ui';
import '../_kit/style.css';

const { mountGame, useGame } = gameClient<typeof game>();

const strings = {
  en: {
    'Never have I ever…': 'Never have I ever…',
    'I have': 'I have',
    'I haven’t': 'I haven’t',
    '{n} of {total}': '{n} of {total}',
    '{count} of {total} answered': '{count} of {total} answered',
    'Nobody has.': 'Nobody has.',
    'Everyone has!': 'Everyone has!',
    Next: 'Next',
    'Show answers': 'Show answers',
    'Answer out loud.': 'Answer out loud.',
    'Wait for the next statement.': 'Wait for the next statement.',
    'Nobody has answered yet.': 'Nobody has answered yet.',
    'Choose one of the options.': 'Choose one of the options.',
  },
  nb: {
    'Never have I ever…': 'Jeg har aldri…',
    'I have': 'Det har jeg',
    'I haven’t': 'Det har jeg ikke',
    '{n} of {total}': '{n} av {total}',
    '{count} of {total} answered': '{count} av {total} har svart',
    'Nobody has.': 'Ingen har.',
    'Everyone has!': 'Alle har!',
    Next: 'Neste',
    'Show answers': 'Vis svarene',
    'Answer out loud.': 'Svar høyt.',
    'Wait for the next statement.': 'Vent på neste påstand.',
    'Nobody has answered yet.': 'Ingen har svart ennå.',
    'Choose one of the options.': 'Velg et av alternativene.',
  },
} as const;

function Game() {
  const { view, players, name, act, playing } = useGame();
  const t = useStrings(strings);
  const present = players.filter((player) => !player.left).length;
  const phones = view.mode === 'phones';
  return (
    <Page
      translate={t.text}
      actions={
        playing && (!phones || view.revealed || view.answered > 0) ? (
          <Button primary onClick={() => act('next')}>
            {phones && !view.revealed ? t('Show answers') : t('Next')}
          </Button>
        ) : null
      }
    >
      <Hero>
        <Label>{t('{n} of {total}', { n: view.number, total: view.total })}</Label>
        <div className="flex flex-col gap-1">
          <Muted>{t('Never have I ever…')}</Muted>
          <Title large>{view.statement}</Title>
        </div>
        {!phones ? <Muted>{t('Answer out loud.')}</Muted> : null}
        {phones && !view.revealed ? (
          <>
            <div className="grid w-full grid-cols-2 gap-2">
              <Button
                primary={view.yourAnswer === true}
                onClick={() => act('answer', { value: 1 })}
              >
                {t('I have')}
              </Button>
              <Button
                primary={view.yourAnswer === false}
                onClick={() => act('answer', { value: 0 })}
              >
                {t('I haven’t')}
              </Button>
            </div>
            <Muted>
              {t('{count} of {total} answered', { count: view.answered, total: present })}
            </Muted>
          </>
        ) : null}
        {phones && view.revealed ? (
          view.haveDone.length ? (
            <div className="flex flex-wrap justify-center gap-2">
              {view.haveDone.length === present ? <Title>{t('Everyone has!')}</Title> : null}
              {view.haveDone.length < present
                ? view.haveDone.map((player) => (
                    <span
                      key={player}
                      className="rounded-full bg-primary px-3 py-1.5 font-semibold text-primary-foreground"
                    >
                      {name(player)}
                    </span>
                  ))
                : null}
            </div>
          ) : (
            <Title>{t('Nobody has.')}</Title>
          )
        ) : null}
      </Hero>
    </Page>
  );
}

mountGame(Game);
