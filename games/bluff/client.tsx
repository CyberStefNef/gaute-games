import { useState } from 'react';
import { gameClient, useStrings } from '@gaute/games-sdk/react';
import type { game } from './logic';
import { Awards, Button, Card, Hero, Label, Muted, Page, Scores, Title } from '../_kit/ui';
import '../_kit/style.css';

const { mountGame, useGame } = gameClient<typeof game>();

const strings = {
  en: {
    'Round {n} of {total}': 'Round {n} of {total}',
    'Write a fake answer that sounds true': 'Write a fake answer that sounds true',
    'Your fake answer…': 'Your fake answer…',
    Send: 'Send',
    'Your fake: {text}': 'Your fake: {text}',
    '{count} of {total} written': '{count} of {total} written',
    'Start the hunt': 'Start the hunt',
    'Which one is true?': 'Which one is true?',
    Yours: 'Yours',
    '{count} of {total} voted': '{count} of {total} voted',
    'Reveal now': 'Reveal now',
    Truth: 'Truth',
    'by {names}': 'by {names}',
    'fooled {names}': 'fooled {names}',
    'found by {names}': 'found by {names}',
    Next: 'Next',
    'See results': 'See results',
    Scores: 'Scores',
    Titles: 'Titles',
    masterBluffer: 'Master bluffer',
    truthSeeker: 'Truth seeker',
    'Write a short answer.': 'Write a short answer.',
    'That’s the real answer! Write a fake one.': 'That’s the real answer! Write a fake one.',
    'Writing is over for this round.': 'Writing is over for this round.',
    'Wait for at least two answers.': 'Wait for at least two answers.',
    'Voting is not open.': 'Voting is not open.',
    'Choose one of the answers.': 'Choose one of the answers.',
    'That’s your own answer!': 'That’s your own answer!',
    'Nobody has voted yet.': 'Nobody has voted yet.',
    'Finish this round first.': 'Finish this round first.',
    'Choose one of the options.': 'Choose one of the options.',
  },
  nb: {
    'Round {n} of {total}': 'Runde {n} av {total}',
    'Write a fake answer that sounds true': 'Skriv et falskt svar som høres sant ut',
    'Your fake answer…': 'Ditt falske svar …',
    Send: 'Send',
    'Your fake: {text}': 'Ditt falske svar: {text}',
    '{count} of {total} written': '{count} av {total} har skrevet',
    'Start the hunt': 'Start jakten',
    'Which one is true?': 'Hvilket er sant?',
    Yours: 'Ditt',
    '{count} of {total} voted': '{count} av {total} har stemt',
    'Reveal now': 'Vis nå',
    Truth: 'Sant',
    'by {names}': 'av {names}',
    'fooled {names}': 'lurte {names}',
    'found by {names}': 'funnet av {names}',
    Next: 'Neste',
    'See results': 'Se resultatet',
    Scores: 'Poeng',
    Titles: 'Titler',
    masterBluffer: 'Mesterbløffer',
    truthSeeker: 'Sannhetsjeger',
    'Write a short answer.': 'Skriv et kort svar.',
    'That’s the real answer! Write a fake one.': 'Det er det ekte svaret! Skriv et falskt.',
    'Writing is over for this round.': 'Skrivingen er over for denne runden.',
    'Wait for at least two answers.': 'Vent på minst to svar.',
    'Voting is not open.': 'Avstemningen er ikke åpen.',
    'Choose one of the answers.': 'Velg et av svarene.',
    'That’s your own answer!': 'Det er ditt eget svar!',
    'Nobody has voted yet.': 'Ingen har stemt ennå.',
    'Finish this round first.': 'Fullfør denne runden først.',
    'Choose one of the options.': 'Velg et av alternativene.',
  },
} as const;

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
  const { view, players, name, act, playing, busy } = useGame();
  const t = useStrings(strings);
  const [text, setText] = useState('');
  const present = players.filter((player) => !player.left).length;
  const round = t('Round {n} of {total}', { n: view.round, total: view.rounds });
  const last = view.round === view.rounds;

  if (view.phase === 'write')
    return (
      <Page
        translate={t.text}
        actions={
          playing && view.written >= 2 && view.yourLie !== null ? (
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
        !playing ? null : revealed ? (
          <Button primary onClick={() => act('next')}>
            {last ? t('See results') : t('Next')}
          </Button>
        ) : view.voted > 0 ? (
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
        <Label>{round}</Label>
        <Fact text={view.fact} />
        {!revealed ? <Muted>{t('Which one is true?')}</Muted> : null}
        <div className="flex w-full flex-col gap-2">
          {view.options.map((choice, index) => {
            const picked = view.yourVote === index;
            const names = choice.pickedBy.map(name).join(', ');
            return (
              <button
                key={index}
                type="button"
                disabled={revealed || choice.mine || busy || !playing}
                onClick={() => act('vote', { value: index })}
                className={`flex flex-col gap-0.5 rounded-xl border-2 px-4 py-3 text-left ${
                  revealed && choice.truth
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
                {revealed && choice.truth ? (
                  <span className="text-sm">
                    <strong className="uppercase">{t('Truth')}</strong>
                    {names ? ` · ${t('found by {names}', { names })}` : ''}
                  </span>
                ) : null}
                {revealed && !choice.truth ? (
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
