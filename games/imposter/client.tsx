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
  'Category: {category}': 'Category: {category}',
  'Your word': 'Your word',
  'You’re the imposter': 'You’re the imposter',
  'There are two imposters.': 'There are two imposters.',
  'Blend in. If they catch you, guess the word to steal the round.':
    'Blend in. If they catch you, guess the word to steal the round.',
  'Take turns giving a one-word clue.': 'Take turns giving a one-word clue.',
  'Start the vote': 'Start the vote',
  'Who’s the imposter?': 'Who’s the imposter?',
  'Who do you accuse?': 'Who do you accuse?',
  'Agree out loud, then pick one.': 'Agree out loud, then pick one.',
  '{count} of {total} voted': '{count} of {total} voted',
  'Reveal now': 'Reveal now',
  'Caught! Last chance': 'Caught! Last chance',
  'Which one was the word?': 'Which one was the word?',
  '{name} was caught and is guessing the word…': '{name} was caught and is guessing the word…',
  'Caught!': 'Caught!',
  'Stolen!': 'Stolen!',
  'Got away!': 'Got away!',
  '{name} guessed {guess}. The word was {word}.': '{name} guessed {guess}. The word was {word}.',
  'The word was {word}.': 'The word was {word}.',
  'Imposter: {names}': 'Imposter: {names}',
  'Imposters: {names}': 'Imposters: {names}',
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
  'There is nothing to guess.': 'There is nothing to guess.',
  'Only the caught imposter guesses.': 'Only the caught imposter guesses.',
  'Choose one of the options.': 'Choose one of the options.',
} as const;
const nb: Record<keyof typeof en, string> = {
  'Round {n}': 'Runde {n}',
  'Category: {category}': 'Kategori: {category}',
  'Your word': 'Ordet ditt',
  'You’re the imposter': 'Du er imposteren',
  'There are two imposters.': 'Det er to impostere.',
  'Blend in. If they catch you, guess the word to steal the round.':
    'Gli inn. Blir du tatt, gjett ordet for å stjele runden.',
  'Take turns giving a one-word clue.': 'Gi et hint på ett ord, etter tur.',
  'Start the vote': 'Start avstemningen',
  'Who’s the imposter?': 'Hvem er imposteren?',
  'Who do you accuse?': 'Hvem anklager dere?',
  'Agree out loud, then pick one.': 'Bli enige høyt, og velg én.',
  '{count} of {total} voted': '{count} av {total} har stemt',
  'Reveal now': 'Vis nå',
  'Caught! Last chance': 'Avslørt! Siste sjanse',
  'Which one was the word?': 'Hvilket var ordet?',
  '{name} was caught and is guessing the word…': '{name} ble avslørt og gjetter ordet …',
  'Caught!': 'Avslørt!',
  'Stolen!': 'Stjålet!',
  'Got away!': 'Slapp unna!',
  '{name} guessed {guess}. The word was {word}.': '{name} gjettet {guess}. Ordet var {word}.',
  'The word was {word}.': 'Ordet var {word}.',
  'Imposter: {names}': 'Imposter: {names}',
  'Imposters: {names}': 'Impostere: {names}',
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
  'There is nothing to guess.': 'Det er ingenting å gjette.',
  'Only the caught imposter guesses.': 'Bare den avslørte imposteren gjetter.',
  'Choose one of the options.': 'Velg et av alternativene.',
};
type T = Translate<typeof en>;

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
  const t = useStrings({ en, nb });
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
