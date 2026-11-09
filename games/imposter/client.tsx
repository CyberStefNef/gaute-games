import type { ViewOf } from '@gaute/games-sdk/logic';
import { gameClient, useStrings, type Translate } from '@gaute/games-sdk/react';
import type { game } from './logic';
import { Big, Button, Card, Label, Muted, Page, PlayerChoice, Tally } from '../_kit/ui';
import '../_kit/style.css';

const { mountGame, useGame } = gameClient<typeof game>();
type View = ViewOf<typeof game>;

const en = {
  'Round {n}': 'Round {n}',
  'The secret word': 'The secret word',
  'You are the imposter': 'You are the imposter',
  'Listen to the clues and blend in.': 'Listen to the clues and blend in.',
  'Take turns giving a one-word clue out loud. Do not say the word.':
    'Take turns giving a one-word clue out loud. Do not say the word.',
  'Start the vote': 'Start the vote',
  'Who is the imposter?': 'Who is the imposter?',
  '{count} of {total} voted': '{count} of {total} voted',
  'Reveal now': 'Reveal now',
  'Caught!': 'Caught!',
  'The imposter got away': 'The imposter got away',
  'The imposter was {name}.': 'The imposter was {name}.',
  'The word was {word}.': 'The word was {word}.',
  Votes: 'Votes',
  Scores: 'Scores',
  'Next round': 'Next round',
  'Game over': 'Game over',
  'Voting is not open.': 'Voting is not open.',
  'Vote for someone else.': 'Vote for someone else.',
  'Nobody has voted yet.': 'Nobody has voted yet.',
  'Finish this round first.': 'Finish this round first.',
  'Voting has already started.': 'Voting has already started.',
  'Got it, pass the phone on': 'Got it, pass the phone on',
  'Who does the group accuse?': 'Who does the group accuse?',
  'Agree out loud, then choose one player.': 'Agree out loud, then choose one player.',
  'It is not your turn.': 'It is not your turn.',
  'Choose a player in this game.': 'Choose a player in this game.',
} as const;
const nb: Record<keyof typeof en, string> = {
  'Round {n}': 'Runde {n}',
  'The secret word': 'Det hemmelige ordet',
  'You are the imposter': 'Du er imposteren',
  'Listen to the clues and blend in.': 'Lytt til hintene og gli inn.',
  'Take turns giving a one-word clue out loud. Do not say the word.':
    'Gi etter tur et hint på ett ord høyt. Ikke si selve ordet.',
  'Start the vote': 'Start avstemningen',
  'Who is the imposter?': 'Hvem er imposteren?',
  '{count} of {total} voted': '{count} av {total} har stemt',
  'Reveal now': 'Vis nå',
  'Caught!': 'Avslørt!',
  'The imposter got away': 'Imposteren slapp unna',
  'The imposter was {name}.': 'Imposteren var {name}.',
  'The word was {word}.': 'Ordet var {word}.',
  Votes: 'Stemmer',
  Scores: 'Poeng',
  'Next round': 'Neste runde',
  'Game over': 'Spillet er over',
  'Voting is not open.': 'Avstemningen er ikke åpen.',
  'Vote for someone else.': 'Stem på noen andre.',
  'Nobody has voted yet.': 'Ingen har stemt ennå.',
  'Finish this round first.': 'Fullfør denne runden først.',
  'Voting has already started.': 'Avstemningen har allerede startet.',
  'Got it, pass the phone on': 'Skjønner, send telefonen videre',
  'Who does the group accuse?': 'Hvem anklager gruppa?',
  'Agree out loud, then choose one player.': 'Bli enige høyt, og velg én spiller.',
  'It is not your turn.': 'Det er ikke din tur.',
  'Choose a player in this game.': 'Velg en spiller i dette spillet.',
};

type T = Translate<typeof en>;

function Scores({ view, t }: { view: View; t: T }) {
  const { name, playing } = useGame();
  return (
    <Card>
      <Label>{t('Scores')}</Label>
      {Object.entries(view.scores)
        .sort((a, b) => b[1] - a[1])
        .map(([handle, score]) => (
          <div key={handle} className="flex items-center justify-between gap-3">
            <span>{name(handle)}</span>
            <strong>{score}</strong>
          </div>
        ))}
      {playing ? null : <Muted>{t('Game over')}</Muted>}
    </Card>
  );
}

function Role({ view, t }: { view: View; t: T }) {
  const round = t('Round {n}', { n: view.round });
  if (view.role === null) return <Label>{round}</Label>;
  return view.role === 'imposter' ? (
    <Card>
      <Label>{round}</Label>
      <Big>{t('You are the imposter')}</Big>
      <Muted>{t('Listen to the clues and blend in.')}</Muted>
    </Card>
  ) : (
    <Card>
      <Label>
        {round} · {t('The secret word')}
      </Label>
      <Big>{view.word}</Big>
    </Card>
  );
}

function Game() {
  const { view, you, players, name, act, playing } = useGame();
  const t = useStrings({ en, nb });
  const present = players.filter((player) => !player.left).map((player) => player.handle);
  // Passing the phone: the holder reads their role privately, then passes it on.
  if (view.phase === 'roles')
    return (
      <Page translate={t.text}>
        <Role view={view} t={t} />
        {playing ? (
          <Button primary onClick={() => act('seen')}>
            {t('Got it, pass the phone on')}
          </Button>
        ) : null}
      </Page>
    );
  if (view.phase === 'clues')
    return (
      <Page translate={t.text}>
        <Role view={view} t={t} />
        <Muted>{t('Take turns giving a one-word clue out loud. Do not say the word.')}</Muted>
        {playing ? (
          <Button primary onClick={() => act('startVote')}>
            {t('Start the vote')}
          </Button>
        ) : null}
        <Scores view={view} t={t} />
      </Page>
    );
  if (view.phase === 'vote' && view.mode !== 'phones')
    return (
      <Page translate={t.text}>
        <Role view={view} t={t} />
        <Card>
          <Label>{t('Who does the group accuse?')}</Label>
          <Muted>{t('Agree out loud, then choose one player.')}</Muted>
          <PlayerChoice
            handles={present}
            chosen={null}
            onChoose={(target) => act('accuse', { target })}
          />
        </Card>
      </Page>
    );
  if (view.phase === 'vote')
    return (
      <Page translate={t.text}>
        <Role view={view} t={t} />
        <Card>
          <Label>{t('Who is the imposter?')}</Label>
          <PlayerChoice
            handles={present.filter((handle) => handle !== you)}
            chosen={view.yourVote}
            onChoose={(target) => act('vote', { target })}
          />
          <Muted>
            {t('{count} of {total} voted', { count: view.voted, total: present.length })}
          </Muted>
        </Card>
        {playing && view.voted > 0 ? (
          <Button onClick={() => act('reveal')}>{t('Reveal now')}</Button>
        ) : null}
      </Page>
    );
  const reveal = view.reveal!;
  return (
    <Page translate={t.text}>
      <Card>
        <Big>{reveal.caught ? t('Caught!') : t('The imposter got away')}</Big>
        <p>{t('The imposter was {name}.', { name: name(reveal.imposter) })}</p>
        <Muted>{t('The word was {word}.', { word: view.word ?? '' })}</Muted>
      </Card>
      {view.mode === 'phones' ? (
        <Card>
          <Label>{t('Votes')}</Label>
          <Tally counts={reveal.tally} />
        </Card>
      ) : null}
      <Scores view={view} t={t} />
      {playing ? (
        <Button primary onClick={() => act('nextRound')}>
          {t('Next round')}
        </Button>
      ) : null}
    </Page>
  );
}

mountGame(Game);
