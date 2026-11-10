import { strings } from './strings';
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

type T = Translate<typeof strings.en>;

/** The round's secret: the word for the crew, the role and category for the imposter. */
function Secret({ view, t }: { view: View; t: T }) {
  const round = <Label>{t('Round {n}', { n: view.round })}</Label>;
  const category = t('Category: {category}', { category: view.category });
  if (view.role === 'imposter')
    return (
      <Hero className="border-primary bg-primary text-primary-foreground">
        <div className="opacity-80 [&_*]:text-primary-foreground">{round}</div>
        <Title large>{t('You’re the imposter')}</Title>
        <p className="text-lg font-semibold">{category}</p>
        <p className="opacity-85">
          {t('Blend in. If they catch you, guess the word to steal the round.')}
        </p>
        {view.imposterCount > 1 ? (
          <p className="opacity-85">{t('There are two imposters.')}</p>
        ) : null}
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
          <Muted>{category}</Muted>
        </div>
        {view.phase === 'clues' ? <Muted>{t('Take turns giving a one-word clue.')}</Muted> : null}
      </Hero>
    );
  // The shared screen between turns: no secrets, just what to do.
  return (
    <Hero>
      {round}
      <Title>{t('Take turns giving a one-word clue.')}</Title>
      <Muted>{category}</Muted>
    </Hero>
  );
}

function Standings({ view, t }: { view: View; t: T }) {
  const { playing } = useGame();
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
  const t = useStrings(strings);
  const present = players.filter((player) => !player.left).map((player) => player.handle);
  const reveal = view.reveal;
  // Gaute cheers a catch or a stolen round, and wobbles at an escape.
  const verdict = reveal ? (reveal.caught ? 'celebrate' : 'oops') : null;
  useEffect(() => {
    if (verdict) gaute(verdict);
  }, [verdict, view.round, gaute]);
  const page = (children: ReactNode, actions?: ReactNode, below?: ReactNode) => (
    <Page translate={t.text} actions={playing ? actions : null} below={below}>
      {children}
    </Page>
  );

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
            ? `${t('You’re the imposter')} · ${view.category}`
            : `${view.word} · ${view.category}`}
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

  if (view.phase === 'guess')
    return page(
      view.options.length ? (
        <Hero className="border-primary">
          <Label>{t('Caught! Last chance')}</Label>
          <Title>{t('Which one was the word?')}</Title>
          <Muted>{t('Category: {category}', { category: view.category })}</Muted>
          <div className="grid w-full grid-cols-2 gap-2">
            {view.options.map((word, index) => (
              <Button key={word} onClick={() => act('guessWord', { value: index })}>
                {word}
              </Button>
            ))}
          </div>
        </Hero>
      ) : (
        <Hero>
          <Title>
            {t('{name} was caught and is guessing the word…', { name: name(view.caught ?? '') })}
          </Title>
        </Hero>
      ),
    );

  const result = reveal!;
  const names = result.imposters.map(name).join(', ');
  return page(
    <Hero className={result.stole ? 'border-primary bg-primary text-primary-foreground' : ''}>
      <Title large>
        {result.stole ? t('Stolen!') : result.caught ? t('Caught!') : t('Got away!')}
      </Title>
      <p className="text-balance">
        {result.imposters.length > 1
          ? t('Imposters: {names}', { names })
          : t('Imposter: {names}', { names })}
      </p>
      <p className="text-balance opacity-85">
        {result.guess && result.caught
          ? t('{name} guessed {guess}. The word was {word}.', {
              name: name(result.caught),
              guess: result.guess,
              word: view.word ?? '',
            })
          : t('The word was {word}.', { word: view.word ?? '' })}
      </p>
      {view.mode === 'phones' && Object.keys(result.tally).length ? (
        <Tally counts={result.tally} />
      ) : null}
    </Hero>,
    <Button primary onClick={() => act('nextRound')}>
      {t('Next round')}
    </Button>,
    <Standings view={view} t={t} />,
  );
}

mountGame(Game);
