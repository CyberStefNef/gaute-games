import { strings } from './strings';
import { useState } from 'react';
import { gameClient, useStrings } from '@gaute/games-sdk/react';
import type { game } from './logic';
import { Awards, Button, Card, Hero, Label, Muted, PackPicker, Page, Title } from '../_kit/ui';
import '../_kit/style.css';

const { mountGame, useGame } = gameClient<typeof game>();

function AddOwn() {
  const { act, busy, view } = useGame();
  const t = useStrings(strings);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  if (!open)
    return (
      <button
        type="button"
        className="text-sm font-semibold text-primary"
        onClick={() => setOpen(true)}
      >
        {t('Add your own')}
        {view.own ? ` · ${t('{n} of your own coming up', { n: view.own })}` : ''}
      </button>
    );
  return (
    <Card>
      <Label aside={view.own ? t('{n} of your own coming up', { n: view.own }) : null}>
        {t('Never have I ever…')}
      </Label>
      <input
        className="w-full rounded-xl border border-input bg-background px-3 py-3 text-base"
        maxLength={140}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <Button
        disabled={!text.trim() || busy}
        onClick={() =>
          void act('addOwn', { text }).then((result) => {
            if (result.ok) setText('');
          })
        }
      >
        {t('Add')}
      </Button>
    </Card>
  );
}

function Game() {
  const { view, players, name, act, playing } = useGame();
  const t = useStrings(strings);
  const phones = view.mode === 'phones';
  if (!view.pack)
    return (
      <Page translate={t.text} below={<AddOwn />}>
        <PackPicker
          heading={t('Pick a pack')}
          packs={view.packs}
          onPick={(index) => act('pick', { value: index })}
        />
      </Page>
    );
  const present = players.filter((player) => !player.left);
  return (
    <Page
      translate={t.text}
      actions={
        playing && (!phones || view.revealed || view.answered > 0) ? (
          <Button primary onClick={() => act('next')}>
            {phones && !view.revealed ? t('Show answers') : t('Next')}
          </Button>
        ) : null
      }
      below={
        <>
          {phones ? (
            <Card>
              <Label>{t('Times answered I have')}</Label>
              <div className="flex flex-col divide-y divide-border">
                {present.map((player) => (
                  <div
                    key={player.handle}
                    className="flex items-center justify-between py-2 first:pt-0 last:pb-0"
                  >
                    <span>{name(player.handle)}</span>
                    <span className="font-semibold tabular-nums">
                      {view.have[player.handle] ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
          {playing ? null : (
            <Awards awards={view.awards} heading={t('Titles')} title={(key) => t.text(key)} />
          )}
          {playing ? <AddOwn /> : null}
        </>
      }
    >
      <Hero>
        <Label>{t('Round {n} of {total}', { n: view.round, total: view.rounds })}</Label>
        <Muted>{view.pack}</Muted>
        <div className="flex flex-col gap-1">
          <Muted>{t('Never have I ever…')}</Muted>
          <Title large>{view.statement}</Title>
        </div>
        {!phones ? <Muted>{t('Answer out loud. Share a story if you like.')}</Muted> : null}
        {phones && !view.revealed ? (
          <>
            <div className="grid w-full grid-cols-2 gap-2">
              <Button
                primary={view.yourAnswer === true}
                onClick={() => act('answer', { value: 1 })}
              >
                {t('I have')}
              </Button>
              <Button
                primary={view.yourAnswer === false}
                onClick={() => act('answer', { value: 0 })}
              >
                {t('I haven’t')}
              </Button>
            </div>
            <Muted>
              {t('{count} of {total} answered', { count: view.answered, total: view.inPlay })}
            </Muted>
          </>
        ) : null}
        {phones && view.revealed ? (
          view.storyTime ? (
            <Title>{t('Want to tell the story, {name}?', { name: name(view.storyTime) })}</Title>
          ) : view.haveDone.length === 0 ? (
            <Title>{t('Nobody has.')}</Title>
          ) : view.haveDone.length >= view.inPlay ? (
            <Title>{t('Everyone has!')}</Title>
          ) : (
            <div className="flex flex-wrap justify-center gap-2">
              {view.haveDone.map((player) => (
                <span
                  key={player}
                  className="rounded-full bg-primary px-3 py-1.5 font-semibold text-primary-foreground"
                >
                  {name(player)}
                </span>
              ))}
            </div>
          )
        ) : null}
      </Hero>
    </Page>
  );
}

mountGame(Game);
