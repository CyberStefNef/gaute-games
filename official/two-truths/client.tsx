import { strings } from './strings';
import { useState } from 'react';
import { gameClient, useStrings } from '@gaute/games-sdk/react';
import type { game } from './logic';
import { Awards, Button, Card, Hero, Label, Muted, Page, Scores, Title } from '../_kit/ui';
import '../_kit/style.css';

const { mountGame, useGame } = gameClient<typeof game>();

function Write() {
  const { act, busy } = useGame();
  const t = useStrings(strings);
  const [texts, setTexts] = useState(['', '', '']);
  const [lie, setLie] = useState<number | null>(null);
  const ready = texts.every((text) => text.trim()) && lie !== null;
  return (
    <Page
      translate={t.text}
      actions={
        <Button
          primary
          disabled={!ready || busy}
          onClick={() => act('submit', { statements: texts, lie: lie ?? 0 })}
        >
          {t('Send')}
        </Button>
      }
    >
      <Hero>
        <Label>{t('Prepare your statements')}</Label>
        <Title>{t('Write two truths and one lie')}</Title>
        <Muted>
          {t('Try something you got away with, or a story your friends still bring up.')}
        </Muted>
        <div className="flex w-full flex-col gap-2 text-left">
          {texts.map((text, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                className="min-w-0 flex-1 rounded-xl border border-input bg-background px-3 py-3 text-base"
                maxLength={140}
                placeholder={t('Statement {n}', { n: index + 1 })}
                value={text}
                onChange={(event) =>
                  setTexts(texts.map((value, i) => (i === index ? event.target.value : value)))
                }
              />
              <button
                type="button"
                aria-pressed={lie === index}
                onClick={() => setLie(index)}
                className={`min-h-12 rounded-xl border px-3 text-sm font-semibold ${
                  lie === index
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border text-muted-foreground'
                }`}
              >
                {t('Lie')}
              </button>
            </div>
          ))}
        </div>
        <Muted>{t('Tap the lie')}</Muted>
      </Hero>
    </Page>
  );
}

function Game() {
  const { view, you, name, act, playing, busy } = useGame();
  const t = useStrings(strings);
  const telling = view.teller === you;
  const round = t('Round {n} of {total}', { n: view.round, total: view.rounds });
  if (view.phase === 'write' && !view.submitted && playing) return <Write />;
  if (view.phase === 'write')
    return (
      <Page translate={t.text}>
        <Hero>
          <Label>{round}</Label>
          <Title>{t('Your statements are ready')}</Title>
          <Muted>{t('{count} of {total} ready', { count: view.ready, total: view.rounds })}</Muted>
        </Hero>
      </Page>
    );
  const revealed = view.phase === 'reveal';
  return (
    <Page
      translate={t.text}
      actions={
        playing && revealed ? (
          <Button primary onClick={() => act('next')}>
            {t('Next')}
          </Button>
        ) : playing && view.guessed > 0 ? (
          <Button onClick={() => act('reveal')}>{t('Reveal now')}</Button>
        ) : null
      }
      below={
        revealed ? (
          <>
            <Card>
              <Label>{t('Scores')}</Label>
              <Scores scores={view.scores} />
            </Card>
            {playing ? null : (
              <Awards awards={view.awards} heading={t('Titles')} title={(key) => t.text(key)} />
            )}
          </>
        ) : null
      }
    >
      <Hero>
        <Label>
          {round} · {name(view.teller)}
        </Label>
        <Title>
          {telling && !revealed ? t('Others are guessing') : t('Which one is the lie?')}
        </Title>
        <div className="flex w-full flex-col gap-2">
          {view.statements.map((text, index) => {
            const isLie = view.lie === index;
            const picked = view.yourGuess === index;
            const by = Object.entries(view.guesses)
              .filter(([, guess]) => guess === index)
              .map(([player]) => name(player));
            return (
              <button
                key={index}
                type="button"
                disabled={telling || revealed || busy || !playing}
                onClick={() => act('guess', { value: index })}
                className={`flex flex-col gap-1 rounded-xl border-2 px-4 py-3 text-left ${
                  (revealed || telling) && isLie
                    ? 'border-primary bg-primary text-primary-foreground'
                    : picked
                      ? 'border-primary'
                      : 'border-border bg-background'
                }`}
              >
                <span className="font-semibold">{text}</span>
                {(revealed || telling) && isLie ? (
                  <span className="text-xs font-semibold tracking-wide uppercase opacity-80">
                    {t('The lie')}
                  </span>
                ) : null}
                {revealed && by.length ? (
                  <span className="text-sm opacity-80">{by.join(', ')}</span>
                ) : null}
              </button>
            );
          })}
        </div>
        {!revealed ? (
          <Muted>
            {t('{count} of {total} guessed', { count: view.guessed, total: view.guessers })}
          </Muted>
        ) : null}
      </Hero>
    </Page>
  );
}

mountGame(Game);
