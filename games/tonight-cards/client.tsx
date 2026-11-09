import { useEffect } from 'react';
import type { ViewOf } from '@gaute/games-sdk/logic';
import { gameClient, useStrings } from '@gaute/games-sdk/react';
import type { game } from './logic';
import { Button, Card, Hero, Label, Muted, Page, PlayerChoice, Tally, Title } from '../_kit/ui';
import '../_kit/style.css';

const { mountGame, useGame } = gameClient<typeof game>();
type Refs = ViewOf<typeof game>['card']['refs'];

const en = {
  prompt: 'Prompt',
  duel: 'Duel',
  vote: 'Vote',
  rule: 'New rule',
  ending: 'Rule over',
  '{count} of {total} voted': '{count} of {total} voted',
  '{n} left': '{n} cards left',
  'Last card': 'Last card',
  'Rules in play': 'Rules in play',
  'Next card': 'Next card',
  'Show votes': 'Show votes',
  'That’s the deck': 'That’s the deck',
  'On three, everyone points.': 'On three, everyone points.',
  'There is no open vote.': 'There is no open vote.',
  'The deck is finished.': 'The deck is finished.',
  'Choose a player in this game.': 'Choose a player in this game.',
} as const;
const nb: Record<keyof typeof en, string> = {
  prompt: 'Spørsmål',
  duel: 'Duell',
  vote: 'Avstemning',
  rule: 'Ny regel',
  ending: 'Regelen er over',
  '{count} of {total} voted': '{count} av {total} har stemt',
  '{n} left': '{n} kort igjen',
  'Last card': 'Siste kort',
  'Rules in play': 'Regler som gjelder',
  'Next card': 'Neste kort',
  'Show votes': 'Vis stemmene',
  'That’s the deck': 'Det var kortstokken',
  'On three, everyone points.': 'På tre peker alle.',
  'There is no open vote.': 'Det er ingen åpen avstemning.',
  'The deck is finished.': 'Kortstokken er tom.',
  'Choose a player in this game.': 'Velg en spiller i dette spillet.',
};

/** Card text with {p1}/{p2} replaced by highlighted player names. */
function CardText({ text, refs }: { text: string; refs: Refs }) {
  const { name } = useGame();
  return text.split(/(\{p[12]\})/).map((part, index) => {
    const handle = /^\{p[12]\}$/.test(part) ? refs[part.slice(1, -1)] : undefined;
    return handle ? (
      <span key={index} className="text-primary">
        {name(handle)}
      </span>
    ) : (
      part
    );
  });
}

function Game() {
  const { view, players, act, playing, gaute } = useGame();
  const t = useStrings({ en, nb });
  // Gaute waves at a new rule, and celebrates the vote results and the last card.
  const moment = view.finished
    ? 'celebrate'
    : view.vote?.tally
      ? 'celebrate'
      : view.card.kind === 'rule' && !view.card.ending
        ? 'wave'
        : null;
  useEffect(() => {
    if (moment) gaute(moment);
  }, [moment, view.drawn, gaute]);
  const present = players.filter((player) => !player.left).map((player) => player.handle);
  const vote = view.vote;
  const open = vote !== null && vote.tally === null;
  // A rule just drawn is the card itself; the list shows the others.
  const rules =
    view.card.kind === 'rule' && !view.card.ending ? view.rules.slice(0, -1) : view.rules;

  if (view.finished)
    return (
      <Page translate={t.text}>
        <Hero>
          <Title large>{t('That’s the deck')}</Title>
        </Hero>
      </Page>
    );

  return (
    <Page
      translate={t.text}
      actions={
        playing ? (
          <Button primary onClick={() => act('next')}>
            {open && vote.voted > 0 ? t('Show votes') : t('Next card')}
          </Button>
        ) : null
      }
      below={
        rules.length ? (
          <Card>
            <Label>{t('Rules in play')}</Label>
            <ul className="flex flex-col gap-2">
              {rules.map((rule, index) => (
                <li key={index}>
                  <CardText text={rule.text} refs={rule.refs} />
                </li>
              ))}
            </ul>
          </Card>
        ) : null
      }
    >
      <Hero>
        <Label>{t(view.card.ending ? 'ending' : view.card.kind)}</Label>
        <Title large>
          <CardText text={view.card.text} refs={view.card.refs} />
        </Title>
        {view.card.kind === 'vote' && !view.card.ending && !vote ? (
          <Muted>{t('On three, everyone points.')}</Muted>
        ) : null}
        {open ? (
          <>
            <PlayerChoice
              handles={present}
              chosen={vote.yourVote}
              onChoose={(target) => act('vote', { target })}
            />
            <Muted>
              {t('{count} of {total} voted', { count: vote.voted, total: present.length })}
            </Muted>
          </>
        ) : null}
        {vote?.tally ? <Tally counts={vote.tally} /> : null}
      </Hero>
      <p className="text-center text-sm text-muted-foreground">
        {view.remaining ? t('{n} left', { n: view.remaining }) : t('Last card')}
      </p>
    </Page>
  );
}

mountGame(Game);
