import { strings } from './strings';
import { useEffect, useState } from 'react';
import { gameClient, useStrings } from '@gaute/games-sdk/react';
import type { game } from './logic';
import { Awards, Button, Card, Hero, Label, Muted, Page, Scores, Title } from '../_kit/ui';
import '../_kit/style.css';

const { mountGame, useGame } = gameClient<typeof game>();

function Game() {
  const { view, players, name, act, playing, busy, pending } = useGame();
  const t = useStrings(strings);
  const [double, setDouble] = useState(false);
  useEffect(() => setDouble(false), [view.number]);
  const phones = view.mode === 'phones';
  const present = players.filter((player) => !player.left).length;
  const last = view.number === view.total;
  const answered =
    view.yourAnswer !== null ||
    (pending?.action === 'answer' && pending.view.number === view.number);
  const gains = Object.entries(view.gains).sort((a, b) => b[1].points - a[1].points);
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
        view.revealed ? (
          phones ? (
            <>
              <Card>
                <Label>{t('Scores')}</Label>
                <Scores scores={view.scores} />
              </Card>
              {playing ? null : (
                <Awards awards={view.awards} heading={t('Titles')} title={(key) => t.text(key)} />
              )}
            </>
          ) : (
            <p className="text-center font-semibold">
              {t('Team score: {n}', { n: view.groupScore })}
            </p>
          )
        ) : null
      }
    >
      <Hero>
        <Label aside={view.yourStreak >= 2 ? t('{n} in a row', { n: view.yourStreak }) : null}>
          {view.category} · {t('Question {n} of {total}', { n: view.number, total: view.total })}
        </Label>
        <Title>{view.question}</Title>
        <div className="grid w-full gap-2">
          {view.options.map((text, index) => {
            const right = view.correct === index;
            const wrong = view.revealed && view.yourAnswer === index && !right;
            const picked =
              (pending?.action === 'answer' && pending.view.number === view.number
                ? pending.payload.value
                : view.yourAnswer) === index;
            const who = Object.entries(view.picks)
              .filter(([, pick]) => pick === index)
              .map(([player]) => name(player));
            return (
              <button
                key={index}
                type="button"
                disabled={view.revealed || answered || busy || !playing}
                aria-pressed={picked}
                aria-busy={(picked && busy) || undefined}
                onClick={() => act('answer', { value: index, double })}
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
        {!view.revealed && !answered ? (
          <button
            type="button"
            disabled={busy || answered || !playing}
            aria-pressed={double}
            onClick={() => setDouble(!double)}
            className={`w-full rounded-xl border-2 px-4 py-2.5 text-left ${
              double
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-dashed border-border'
            }`}
          >
            <span className="block font-bold">{t('Double down')} ×2</span>
            <span className="block text-sm opacity-80">
              {t('Right: double points. Wrong: −1.')}
            </span>
          </button>
        ) : null}
        {phones && !view.revealed ? (
          <Muted>
            {t('{count} of {total} answered', { count: view.answered, total: present })}
          </Muted>
        ) : null}
        {view.revealed && gains.length ? (
          <div className="flex flex-wrap justify-center gap-2">
            {gains.map(([player, gain]) => (
              <span
                key={player}
                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  gain.points > 0
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {name(player)} {gain.points > 0 ? `+${gain.points}` : gain.points}
                {gain.fastest ? ` · ${t('fastest')}` : ''}
              </span>
            ))}
          </div>
        ) : null}
      </Hero>
    </Page>
  );
}

mountGame(Game);
