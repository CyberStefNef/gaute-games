import { strings } from './strings';
import { useState } from 'react';
import { gameClient, useStrings } from '@gaute/games-sdk/react';
import type { game } from './logic';
import {
  Awards,
  Button,
  Card,
  Hero,
  Label,
  Muted,
  PackPicker,
  Page,
  Scores,
  Title,
} from '../_kit/ui';
import '../_kit/style.css';

const { mountGame, useGame } = gameClient<typeof game>();

function Game() {
  const { view, players, name, act, playing, busy } = useGame();
  const t = useStrings(strings);
  const [mine, setMine] = useState<{ round: number; value: number } | null>(null);
  if (!view.pack)
    return (
      <Page translate={t.text}>
        <PackPicker
          heading={t('Pick a pack')}
          play={t('Play')}
          defaultIndex={view.packs.length - 1}
          packs={view.packs}
          onPick={(index) => act('pick', { value: index })}
        />
      </Page>
    );
  const phones = view.mode === 'phones';
  const present = players.filter((player) => !player.left).length;
  const choosing = phones && !view.split && view.yourVote === null;
  const picked = mine?.round === view.number ? mine.value : null;
  const half = view.split && view.split[0].length === view.split[1].length;
  return (
    <Page
      translate={t.text}
      actions={
        playing && (!phones || view.split || view.voted > 0) ? (
          <Button primary onClick={() => act('next')}>
            {phones && !view.split ? t('Show choices') : t('Next')}
          </Button>
        ) : null
      }
      below={
        phones && view.split ? (
          <>
            <Card>
              <Label aside={t('Right guesses score a point.')}>{t('Scores')}</Label>
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
          {view.pack} · {t('{n} of {total}', { n: view.number, total: view.total })}
        </Label>
        <Muted>{t('Would you rather…')}</Muted>
        {view.options.map((text, index) => {
          const chosen = view.yourVote === index || picked === index;
          const names = view.split?.[index] ?? [];
          return (
            <div key={index} className="flex w-full flex-col items-center gap-2">
              {index === 1 ? <Muted>{t('or')}</Muted> : null}
              <button
                type="button"
                disabled={!choosing || busy || !playing}
                onClick={() => setMine({ round: view.number, value: index })}
                className={`w-full rounded-xl border-2 px-4 py-4 text-xl font-bold text-balance ${
                  chosen
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-background'
                }`}
              >
                <span className="mr-2 opacity-60">{index === 0 ? t('A') : t('B')}</span>
                {text}
              </button>
              {view.split ? (
                <p className="text-sm text-muted-foreground">
                  {names.length ? names.map(name).join(', ') : t('Nobody')}
                </p>
              ) : null}
            </div>
          );
        })}
        {!phones ? <Muted>{t('Argue it out loud.')}</Muted> : null}
        {choosing ? (
          <div className="flex w-full flex-col gap-2">
            <p className="font-semibold">
              {picked === null ? t('Pick your answer first') : t('What will most people pick?')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {[0, 1].map((guess) => (
                <Button
                  key={guess}
                  disabled={picked === null}
                  onClick={() => act('vote', { value: picked ?? 0, guess })}
                >
                  {guess === 0 ? t('A') : t('B')}
                </Button>
              ))}
            </div>
          </div>
        ) : null}
        {phones && !view.split && view.yourVote !== null ? (
          <Muted>
            {t('Waiting for the others…')}{' '}
            {t('{count} of {total} chose', { count: view.voted, total: present })}
          </Muted>
        ) : null}
        {view.loneWolf ? (
          <Title>{t('Defend it, {name}!', { name: name(view.loneWolf) })}</Title>
        ) : null}
        {!view.loneWolf && half && view.voted > 1 ? (
          <Title>{t('Split down the middle!')}</Title>
        ) : null}
      </Hero>
    </Page>
  );
}

mountGame(Game);
