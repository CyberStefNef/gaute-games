import { useEffect, type ReactNode } from 'react';
import type { ViewOf } from '@gaute/games-sdk/logic';
import { gameClient, useStrings, type Translate } from '@gaute/games-sdk/react';
import type { game } from './logic';
import {
  Button,
  Card,
  Hero,
  Label,
  Muted,
  Page,
  PlayerChoice,
  Scores,
  Tally,
  Title,
} from '../_kit/ui';
import '../_kit/style.css';

const { mountGame, useGame } = gameClient<typeof game>();
type View = ViewOf<typeof game>;

const en = {
  'Round {n}': 'Round {n}',
  'Your word': 'Your word',
  'Your word: {word}': 'Your word: {word}',
  'You’re the imposter': 'You’re the imposter',
  'Blend in. Nobody knows.': 'Blend in. Nobody knows.',
  'Take turns giving a one-word clue.': 'Take turns giving a one-word clue.',
  'Start the vote': 'Start the vote',
  'Who’s the imposter?': 'Who’s the imposter?',
  'Who do you accuse?': 'Who do you accuse?',
  'Agree out loud, then pick one.': 'Agree out loud, then pick one.',
  '{count} of {total} voted': '{count} of {total} voted',
  'Reveal now': 'Reveal now',
  'Caught!': 'Caught!',
  'Got away!': 'Got away!',
  '{name} was the imposter. The word was {word}.': '{name} was the imposter. The word was {word}.',
  Scores: 'Scores',
  'Next round': 'Next round',
  'Game over': 'Game over',
  'Got it, pass it on': 'Got it, pass it on',
  'Voting is not open.': 'Voting is not open.',
  'Vote for someone else.': 'Vote for someone else.',
  'Nobody has voted yet.': 'Nobody has voted yet.',
  'Finish this round first.': 'Finish this round first.',
  'Voting has already started.': 'Voting has already started.',
  'It is not your turn.': 'It is not your turn.',
  'Choose a player in this game.': 'Choose a player in this game.',
} as const;
const nb: Record<keyof typeof en, string> = {
  'Round {n}': 'Runde {n}',
  'Your word': 'Ordet ditt',
  'Your word: {word}': 'Ordet ditt: {word}',
  'You’re the imposter': 'Du er imposteren',
  'Blend in. Nobody knows.': 'Gli inn. Ingen vet det.',
  'Take turns giving a one-word clue.': 'Gi et hint på ett ord, etter tur.',
  'Start the vote': 'Start avstemningen',
  'Who’s the imposter?': 'Hvem er imposteren?',
  'Who do you accuse?': 'Hvem anklager dere?',
  'Agree out loud, then pick one.': 'Bli enige høyt, og velg én.',
  '{count} of {total} voted': '{count} av {total} har stemt',
  'Reveal now': 'Vis nå',
  'Caught!': 'Avslørt!',
  'Got away!': 'Slapp unna!',
  '{name} was the imposter. The word was {word}.': '{name} var imposteren. Ordet var {word}.',
  Scores: 'Poeng',
  'Next round': 'Neste runde',
  'Game over': 'Spillet er over',
  'Got it, pass it on': 'Skjønner, send videre',
  'Voting is not open.': 'Avstemningen er ikke åpen.',
  'Vote for someone else.': 'Stem på noen andre.',
  'Nobody has voted yet.': 'Ingen har stemt ennå.',
  'Finish this round first.': 'Fullfør denne runden først.',
  'Voting has already started.': 'Avstemningen har allerede startet.',
  'It is not your turn.': 'Det er ikke din tur.',
  'Choose a player in this game.': 'Velg en spiller i dette spillet.',
};
type T = Translate<typeof en>;

/** The round's secret: the word for the crew, the role for the imposter. */
function Secret({ view, t }: { view: View; t: T }) {
  const round = <Label>{t('Round {n}', { n: view.round })}</Label>;
  const clues = view.phase === 'clues';
  if (view.role === 'imposter')
    return (
      <Hero className="border-primary bg-primary text-primary-foreground">
        <div className="opacity-80 [&_*]:text-primary-foreground">{round}</div>
        <Title large>{t('You’re the imposter')}</Title>
        <p className="opacity-85">{t('Blend in. Nobody knows.')}</p>
      </Hero>
    );
  if (view.role === 'crew')
    return (
      <Hero>
        {round}
        <div className="flex flex-col gap-1">
          <Muted>{t('Your word')}</Muted>
          <p className="text-[42px] leading-tight font-bold tracking-tight break-words">
            {view.word}
          </p>
        </div>
        {clues ? <Muted>{t('Take turns giving a one-word clue.')}</Muted> : null}
      </Hero>
    );
  // The shared screen between turns: no secrets, just what to do.
  return (
    <Hero>
      {round}
      <Title>{t('Take turns giving a one-word clue.')}</Title>
    </Hero>
  );
}

function Standings({ view, t }: { view: View; t: T }) {
  const { playing } = useGame();
  // Nothing to show before anyone has scored.
  if (!Object.values(view.scores).some(Boolean)) return null;
  return (
    <Card>
      <Label aside={playing ? null : t('Game over')}>{t('Scores')}</Label>
      <Scores scores={view.scores} />
    </Card>
  );
}

function Game() {
  const { view, you, players, name, act, playing, gaute } = useGame();
  const t = useStrings({ en, nb });
  // Gaute cheers when the imposter is caught and wobbles when they get away.
  const verdict = view.reveal ? (view.reveal.caught ? 'celebrate' : 'oops') : null;
  useEffect(() => {
    if (verdict) gaute(verdict);
  }, [verdict, view.round, gaute]);
  const present = players.filter((player) => !player.left).map((player) => player.handle);
  const page = (children: ReactNode, actions?: ReactNode, below?: ReactNode) => (
    <Page translate={t.text} actions={playing ? actions : null} below={below}>
      {children}
    </Page>
  );

  // Passing the phone: the holder reads their secret privately, then passes it on.
  if (view.phase === 'roles')
    return page(
      <Secret view={view} t={t} />,
      <Button primary onClick={() => act('seen')}>
        {t('Got it, pass it on')}
      </Button>,
    );

  if (view.phase === 'clues')
    return page(
      <Secret view={view} t={t} />,
      <Button primary onClick={() => act('startVote')}>
        {t('Start the vote')}
      </Button>,
      <Standings view={view} t={t} />,
    );

  if (view.phase === 'vote' && view.mode !== 'phones')
    return page(
      <Hero>
        <div className="flex flex-col gap-2">
          <Title>{t('Who do you accuse?')}</Title>
          <Muted>{t('Agree out loud, then pick one.')}</Muted>
        </div>
        <PlayerChoice
          handles={present}
          chosen={null}
          onChoose={(target) => act('accuse', { target })}
        />
      </Hero>,
    );

  if (view.phase === 'vote')
    return page(
      <Hero>
        <Label>
          {view.role === 'imposter'
            ? t('You’re the imposter')
            : t('Your word: {word}', { word: view.word ?? '' })}
        </Label>
        <Title>{t('Who’s the imposter?')}</Title>
        <PlayerChoice
          handles={present.filter((handle) => handle !== you)}
          chosen={view.yourVote}
          onChoose={(target) => act('vote', { target })}
        />
        <Muted>{t('{count} of {total} voted', { count: view.voted, total: present.length })}</Muted>
      </Hero>,
      view.voted > 0 ? <Button onClick={() => act('reveal')}>{t('Reveal now')}</Button> : null,
    );

  const reveal = view.reveal!;
  return page(
    <Hero>
      <Title large>{reveal.caught ? t('Caught!') : t('Got away!')}</Title>
      <p className="text-balance">
        {t('{name} was the imposter. The word was {word}.', {
          name: name(reveal.imposter),
          word: view.word ?? '',
        })}
      </p>
      {view.mode === 'phones' ? <Tally counts={reveal.tally} /> : null}
    </Hero>,
    <Button primary onClick={() => act('nextRound')}>
      {t('Next round')}
    </Button>,
    <Standings view={view} t={t} />,
  );
}

mountGame(Game);
