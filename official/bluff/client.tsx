import { strings } from './strings';
import { useEffect, useState } from 'react';
import { gameClient, useStrings } from '@gaute/games-sdk/react';
import type { game } from './logic';
import { Awards, Button, Card, Hero, Label, Muted, Page, Scores, Title } from '../_kit/ui';
import '../_kit/style.css';

const { mountGame, useGame } = gameClient<typeof game>();

/** The fact, with its blank drawn as a line. */
const Fact = ({ text }: { text: string }) => (
  <Title>
    {text.split('___').map((part, index) => (
      <span key={index}>
        {index ? (
          <span className="mx-1 inline-block w-16 border-b-4 border-primary align-baseline" />
        ) : null}
        {part}
      </span>
    ))}
  </Title>
);

function Game() {
  const { view, you, players, name, act, playing, busy, pending } = useGame();
  const t = useStrings(strings);
  const [text, setText] = useState('');
  useEffect(() => setText(''), [view.round]);
  const present = players.filter((player) => !player.left).length;
  const round = t('Round {n} of {total}', { n: view.round, total: view.rounds });
  const leader = view.leader === you;
  const last = view.round === view.rounds;

  if (view.phase === 'write')
    return (
      <Page
        translate={t.text}
        actions={
          playing && leader && view.written >= 2 && view.yourLie !== null ? (
            <Button onClick={() => act('hunt')}>{t('Start the hunt')}</Button>
          ) : null
        }
      >
        <Hero>
          <Label>{round}</Label>
          <Fact text={view.fact} />
          {view.yourLie === null ? (
            <div className="flex w-full flex-col gap-2">
              <Muted>{t('Write a fake answer that sounds true')}</Muted>
              <input
                className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base"
                maxLength={40}
                placeholder={t('Your fake answer…')}
                value={text}
                onChange={(event) => setText(event.target.value)}
              />
              <Button
                primary
                disabled={!text.trim() || busy || !playing}
                onClick={() => act('write', { text })}
              >
                {t('Send')}
              </Button>
            </div>
          ) : (
            <Muted>{t('Your fake: {text}', { text: view.yourLie })}</Muted>
          )}
          <Muted>{t('{count} of {total} written', { count: view.written, total: present })}</Muted>
        </Hero>
      </Page>
    );

  const revealed = view.phase === 'reveal';
  return (
    <Page
      translate={t.text}
      actions={
        !playing || !leader ? null : revealed && !view.revealComplete ? (
          <>
            <Button primary onClick={() => act('showNext')}>
              {t('Reveal next answer')}
            </Button>
            <Button onClick={() => act('showAll')}>{t('Show all answers')}</Button>
          </>
        ) : revealed ? (
          <Button primary onClick={() => act('next')}>
            {last ? t('See results') : t('Next')}
          </Button>
        ) : view.voted > 0 ? (
          <Button onClick={() => act('reveal')}>{t('Reveal now')}</Button>
        ) : null
      }
      below={
        view.revealComplete ? (
          <>
            <Card>
              <Label aside={t('Round / Total')}>{t('Scores')}</Label>
              <Scores scores={view.scores} gains={view.gained} />
            </Card>
            {playing ? null : (
              <Awards awards={view.awards} heading={t('Titles')} title={(key) => t.text(key)} />
            )}
          </>
        ) : null
      }
    >
      <Hero>
        <Label>{round}</Label>
        <Fact text={view.fact} />
        {view.explanation ? <Muted>{view.explanation}</Muted> : null}
        {revealed && !view.revealComplete ? (
          <Muted>{t('{name} reveals the answers', { name: name(view.leader) })}</Muted>
        ) : null}
        {!revealed ? <Muted>{t('Which one is true?')}</Muted> : null}
        <div className="flex w-full flex-col gap-2">
          {view.options.map((choice, index) => {
            const picked =
              (pending?.action === 'vote' && pending.view.round === view.round
                ? pending.payload.value
                : view.yourVote) === index;
            const names = choice.pickedBy.map(name).join(', ');
            return (
              <button
                key={index}
                type="button"
                disabled={revealed || choice.mine || busy || !playing}
                aria-pressed={picked}
                aria-busy={(picked && busy) || undefined}
                onClick={() => act('vote', { value: index })}
                className={`flex flex-col gap-0.5 rounded-xl border-2 px-4 py-3 text-left ${
                  choice.revealed && choice.truth
                    ? 'border-primary bg-primary text-primary-foreground'
                    : picked
                      ? 'border-primary'
                      : 'border-border bg-background'
                } ${choice.mine && !revealed ? 'opacity-60' : ''}`}
              >
                <span className="text-lg font-bold">{choice.text}</span>
                {choice.mine && !revealed ? (
                  <span className="text-xs font-semibold uppercase">{t('Yours')}</span>
                ) : null}
                {choice.revealed && choice.truth ? (
                  <span className="text-sm">
                    <strong className="uppercase">{t('Truth')}</strong>
                    {names ? ` · ${t('found by {names}', { names })}` : ''}
                  </span>
                ) : null}
                {choice.revealed && !choice.truth ? (
                  <span className="text-sm opacity-80">
                    {t('by {names}', { names: choice.authors.map(name).join(', ') })}
                    {names ? ` · ${t('fooled {names}', { names })}` : ''}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
        {!revealed ? (
          <Muted>{t('{count} of {total} voted', { count: view.voted, total: present })}</Muted>
        ) : null}
      </Hero>
    </Page>
  );
}

mountGame(Game);
