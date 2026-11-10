import { strings } from './strings';
import { useEffect } from 'react';
import type { ViewOf } from '@gaute/games-sdk/logic';
import { gameClient, useStrings } from '@gaute/games-sdk/react';
import type { game } from './logic';
import { Button, Card, Hero, Label, Muted, Page, PlayerChoice, Tally, Title } from '../_kit/ui';
import '../_kit/style.css';

const { mountGame, useGame } = gameClient<typeof game>();
type Refs = ViewOf<typeof game>['card']['refs'];

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
  const t = useStrings(strings);
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
