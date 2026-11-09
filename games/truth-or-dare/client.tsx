import { useState } from 'react';
import { gameClient, useStrings } from '@gaute/games-sdk/react';
import type { game } from './logic';
import { Awards, Button, Card, Hero, Label, NamedText, PackPicker, Page, Title } from '../_kit/ui';
import '../_kit/style.css';

const { mountGame, useGame } = gameClient<typeof game>();

const strings = {
  en: {
    'Pick a pack': 'Pick a pack',
    '{name}’s turn': '{name}’s turn',
    'Truth or dare?': 'Truth or dare?',
    Truth: 'Truth',
    Dare: 'Dare',
    Done: 'Done',
    Chicken: 'Chicken out',
    'Add your own': 'Add your own',
    'Write a truth or a dare…': 'Write a truth or a dare…',
    Add: 'Add',
    '{n} of your own in the deck': '{n} of your own in the deck',
    'Titles so far': 'Titles so far',
    daredevil: 'Daredevil',
    openBook: 'Open book',
    chicken: 'Chicken',
    'The pack is chosen.': 'The pack is chosen.',
    'Choose a pack first.': 'Choose a pack first.',
    'Finish this one first.': 'Finish this one first.',
    'Choose truth or dare first.': 'Choose truth or dare first.',
    'Choose truth or dare.': 'Choose truth or dare.',
    'Write a short truth or dare.': 'Write a short truth or dare.',
    'That’s plenty of your own.': 'That’s plenty of your own.',
    'Choose one of the options.': 'Choose one of the options.',
  },
  nb: {
    'Pick a pack': 'Velg en pakke',
    '{name}’s turn': '{name} sin tur',
    'Truth or dare?': 'Sannhet eller konsekvens?',
    Truth: 'Sannhet',
    Dare: 'Konsekvens',
    Done: 'Ferdig',
    Chicken: 'Feig ut',
    'Add your own': 'Legg til egne',
    'Write a truth or a dare…': 'Skriv en sannhet eller en konsekvens …',
    Add: 'Legg til',
    '{n} of your own in the deck': '{n} egne i bunken',
    'Titles so far': 'Titler så langt',
    daredevil: 'Våghals',
    openBook: 'Åpen bok',
    chicken: 'Feiging',
    'The pack is chosen.': 'Pakken er valgt.',
    'Choose a pack first.': 'Velg en pakke først.',
    'Finish this one first.': 'Fullfør denne først.',
    'Choose truth or dare first.': 'Velg sannhet eller konsekvens først.',
    'Choose truth or dare.': 'Velg sannhet eller konsekvens.',
    'Write a short truth or dare.': 'Skriv en kort sannhet eller konsekvens.',
    'That’s plenty of your own.': 'Det holder med egne.',
    'Choose one of the options.': 'Velg et av alternativene.',
  },
} as const;

/** The group's own truths and dares, added before or between turns. */
function AddOwn() {
  const { act, busy, view } = useGame();
  const t = useStrings(strings);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const add = (kind: 'truth' | 'dare') =>
    void act('addOwn', { kind, text }).then((result) => {
      if (result.ok) setText('');
    });
  if (!open)
    return (
      <button
        type="button"
        className="text-sm font-semibold text-primary"
        onClick={() => setOpen(true)}
      >
        {t('Add your own')}
        {view.own ? ` · ${t('{n} of your own in the deck', { n: view.own })}` : ''}
      </button>
    );
  return (
    <Card>
      <Label aside={view.own ? t('{n} of your own in the deck', { n: view.own }) : null}>
        {t('Add your own')}
      </Label>
      <textarea
        className="min-h-20 w-full rounded-xl border border-input bg-background px-3 py-2 text-base"
        maxLength={160}
        placeholder={t('Write a truth or a dare…')}
        value={text}
        onChange={(event) => setText(event.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <Button disabled={!text.trim() || busy} onClick={() => add('truth')}>
          + {t('Truth')}
        </Button>
        <Button disabled={!text.trim() || busy} onClick={() => add('dare')}>
          + {t('Dare')}
        </Button>
      </div>
    </Card>
  );
}

function Game() {
  const { view, name, act, playing } = useGame();
  const t = useStrings(strings);
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
  const turn = t('{name}’s turn', { name: name(view.player) });
  if (!view.card)
    return (
      <Page
        translate={t.text}
        actions={
          playing ? (
            <div className="grid grid-cols-2 gap-2">
              <Button primary onClick={() => act('choose', { value: 0 })}>
                {t('Truth')}
              </Button>
              <Button primary onClick={() => act('choose', { value: 1 })}>
                {t('Dare')}
              </Button>
            </div>
          ) : null
        }
        below={
          <>
            <Awards
              awards={view.awards}
              heading={t('Titles so far')}
              title={(key) => t.text(key)}
            />
            <AddOwn />
          </>
        }
      >
        <Hero>
          <Label>
            {turn} · {view.pack}
          </Label>
          <Title large>{t('Truth or dare?')}</Title>
        </Hero>
      </Page>
    );
  const dare = view.card.kind === 'dare';
  return (
    <Page
      translate={t.text}
      actions={
        playing ? (
          <div className="grid grid-cols-[1fr_2fr] gap-2">
            <Button onClick={() => act('skip')}>{t('Chicken')}</Button>
            <Button primary onClick={() => act('done')}>
              {t('Done')}
            </Button>
          </div>
        ) : null
      }
    >
      <Hero className={dare ? 'border-primary bg-primary text-primary-foreground' : ''}>
        <div className={dare ? '[&_*]:text-primary-foreground/80' : ''}>
          <Label>
            {turn} · {dare ? t('Dare') : t('Truth')}
          </Label>
        </div>
        <Title large>
          <span
            className={
              dare ? '[&_.text-primary]:text-primary-foreground [&_.text-primary]:underline' : ''
            }
          >
            <NamedText text={view.card.text} refs={view.card.refs} />
          </span>
        </Title>
      </Hero>
    </Page>
  );
}

mountGame(Game);
