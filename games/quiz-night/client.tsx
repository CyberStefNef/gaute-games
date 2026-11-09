import { gameClient, useStrings } from '@gaute/games-sdk/react';
import type { game } from './logic';
import { Button, Card, Hero, Label, Muted, Page, Scores, Title } from '../_kit/ui';
import '../_kit/style.css';

const { mountGame, useGame } = gameClient<typeof game>();

const strings = {
  en: {
    'Question {n} of {total}': 'Question {n} of {total}',
    '{count} of {total} answered': '{count} of {total} answered',
    'Reveal now': 'Reveal now',
    Next: 'Next',
    'See results': 'See results',
    Scores: 'Scores',
    'Team score: {n}': 'Team score: {n}',
    'Wait for the next question.': 'Wait for the next question.',
    'Nobody has answered yet.': 'Nobody has answered yet.',
    'Answer first.': 'Answer first.',
    'Choose one of the options.': 'Choose one of the options.',
  },
  nb: {
    'Question {n} of {total}': 'Spørsmål {n} av {total}',
    '{count} of {total} answered': '{count} av {total} har svart',
    'Reveal now': 'Vis svaret',
    Next: 'Neste',
    'See results': 'Se resultatet',
    Scores: 'Poeng',
    'Team score: {n}': 'Lagets poeng: {n}',
    'Wait for the next question.': 'Vent på neste spørsmål.',
    'Nobody has answered yet.': 'Ingen har svart ennå.',
    'Answer first.': 'Svar først.',
    'Choose one of the options.': 'Velg et av alternativene.',
  },
} as const;

function Game() {
  const { view, players, name, act, playing, busy } = useGame();
  const t = useStrings(strings);
  const phones = view.mode === 'phones';
  const present = players.filter((player) => !player.left).length;
  const last = view.number === view.total;
  return (
    <Page
      translate={t.text}
      actions={
        !playing ? null : view.revealed ? (
          <Button primary onClick={() => act('next')}>
            {last ? t('See results') : t('Next')}
          </Button>
        ) : phones && view.answered > 0 ? (
          <Button onClick={() => act('reveal')}>{t('Reveal now')}</Button>
        ) : null
      }
      below={
        phones && view.revealed ? (
          <Card>
            <Label>{t('Scores')}</Label>
            <Scores scores={view.scores} />
          </Card>
        ) : !phones && view.revealed ? (
          <p className="text-center font-semibold">
            {t('Team score: {n}', { n: view.groupScore })}
          </p>
        ) : null
      }
    >
      <Hero>
        <Label>{t('Question {n} of {total}', { n: view.number, total: view.total })}</Label>
        <Title>{view.question}</Title>
        <div className="grid w-full gap-2">
          {view.options.map((text, index) => {
            const right = view.correct === index;
            const wrong = view.revealed && view.yourAnswer === index && !right;
            const picked = view.yourAnswer === index;
            const who = Object.entries(view.picks)
              .filter(([, pick]) => pick === index)
              .map(([player]) => name(player));
            return (
              <button
                key={index}
                type="button"
                disabled={view.revealed || busy || !playing}
                onClick={() => act('answer', { value: index })}
                className={`flex min-h-14 flex-col justify-center rounded-xl border-2 px-4 py-2 text-left font-semibold ${
                  right
                    ? 'border-primary bg-primary text-primary-foreground'
                    : wrong
                      ? 'border-destructive text-destructive'
                      : picked
                        ? 'border-primary'
                        : 'border-border bg-background'
                }`}
              >
                {text}
                {who.length ? (
                  <span className="text-sm font-normal opacity-80">{who.join(', ')}</span>
                ) : null}
              </button>
            );
          })}
        </div>
        {phones && !view.revealed ? (
          <Muted>
            {t('{count} of {total} answered', { count: view.answered, total: present })}
          </Muted>
        ) : null}
      </Hero>
    </Page>
  );
}

mountGame(Game);
