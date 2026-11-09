import { useState } from 'react';
import { gameClient, useStrings } from '@gaute/games-sdk/react';
import type { game } from './logic';
import { Awards, Button, Card, Hero, Label, Muted, PackPicker, Page, Title } from '../_kit/ui';
import '../_kit/style.css';

const { mountGame, useGame } = gameClient<typeof game>();
const LIVES = 5;

const strings = {
  en: {
    'Pick a pack': 'Pick a pack',
    'Never have I ever…': 'Never have I ever…',
    'I have': 'I have',
    'I haven’t': 'I haven’t',
    '{count} of {total} answered': '{count} of {total} answered',
    'Nobody has.': 'Nobody has.',
    'Everyone has!': 'Everyone has!',
    'Story time, {name}!': 'Story time, {name}!',
    Next: 'Next',
    'Show answers': 'Show answers',
    'Answer out loud. Whoever has, tells the story.':
      'Answer out loud. Whoever has, tells the story.',
    'Lives left': 'Lives left',
    'You’re out — watch the others!': 'You’re out — watch the others!',
    'Add your own': 'Add your own',
    Add: 'Add',
    '{n} of your own coming up': '{n} of your own coming up',
    Titles: 'Titles',
    seenItAll: 'Seen it all',
    storyteller: 'Storyteller',
    angel: 'Angel',
    'The pack is chosen.': 'The pack is chosen.',
    'Choose a pack first.': 'Choose a pack first.',
    'Wait for the next statement.': 'Wait for the next statement.',
    'Nobody has answered yet.': 'Nobody has answered yet.',
    'You’re out of lives. Watch the others!': 'You’re out of lives. Watch the others!',
    'Write a short statement.': 'Write a short statement.',
    'That’s plenty of your own.': 'That’s plenty of your own.',
    'Choose one of the options.': 'Choose one of the options.',
  },
  nb: {
    'Pick a pack': 'Velg en pakke',
    'Never have I ever…': 'Jeg har aldri …',
    'I have': 'Det har jeg',
    'I haven’t': 'Det har jeg ikke',
    '{count} of {total} answered': '{count} av {total} har svart',
    'Nobody has.': 'Ingen har.',
    'Everyone has!': 'Alle har!',
    'Story time, {name}!': 'Fortell, {name}!',
    Next: 'Neste',
    'Show answers': 'Vis svarene',
    'Answer out loud. Whoever has, tells the story.':
      'Svar høyt. Den som har, forteller historien.',
    'Lives left': 'Liv igjen',
    'You’re out — watch the others!': 'Du er ute – se på de andre!',
    'Add your own': 'Legg til egne',
    Add: 'Legg til',
    '{n} of your own coming up': '{n} egne kommer',
    Titles: 'Titler',
    seenItAll: 'Har gjort alt',
    storyteller: 'Historieforteller',
    angel: 'Engel',
    'The pack is chosen.': 'Pakken er valgt.',
    'Choose a pack first.': 'Velg en pakke først.',
    'Wait for the next statement.': 'Vent på neste påstand.',
    'Nobody has answered yet.': 'Ingen har svart ennå.',
    'You’re out of lives. Watch the others!': 'Du er tom for liv. Se på de andre!',
    'Write a short statement.': 'Skriv en kort påstand.',
    'That’s plenty of your own.': 'Det holder med egne.',
    'Choose one of the options.': 'Velg et av alternativene.',
  },
} as const;

/** Lives as dots: filled for each one left. */
const Lives = ({ left }: { left: number }) => (
  <span className="inline-flex gap-1" aria-label={String(left)}>
    {Array.from({ length: LIVES }, (_, index) => (
      <span
        key={index}
        className={`size-2.5 rounded-full ${index < left ? 'bg-primary' : 'bg-muted'}`}
      />
    ))}
  </span>
);

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
  const out = phones && view.yourLives === 0;
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
              <Label>{t('Lives left')}</Label>
              <div className="flex flex-col divide-y divide-border">
                {present.map((player) => (
                  <div
                    key={player.handle}
                    className="flex items-center justify-between py-2 first:pt-0 last:pb-0"
                  >
                    <span
                      className={
                        view.lives[player.handle] ? '' : 'text-muted-foreground line-through'
                      }
                    >
                      {name(player.handle)}
                    </span>
                    <Lives left={view.lives[player.handle] ?? 0} />
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
        <Label>{view.pack}</Label>
        <div className="flex flex-col gap-1">
          <Muted>{t('Never have I ever…')}</Muted>
          <Title large>{view.statement}</Title>
        </div>
        {!phones ? <Muted>{t('Answer out loud. Whoever has, tells the story.')}</Muted> : null}
        {phones && !view.revealed && out ? (
          <Muted>{t('You’re out — watch the others!')}</Muted>
        ) : null}
        {phones && !view.revealed && !out ? (
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
            <Title>{t('Story time, {name}!', { name: name(view.storyTime) })}</Title>
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
