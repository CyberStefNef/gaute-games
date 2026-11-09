import { mountGame, useGame, useStrings } from '@gaute/games-sdk/react';
import { Big, Button, Card, Label, Muted, Page, PlayerChoice, Tally } from '../_kit/ui';
import '../_kit/style.css';

type Refs = Record<string, string>;
type View = {
  drawn: number;
  remaining: number;
  finished: boolean;
  card: { kind: 'prompt' | 'duel' | 'vote' | 'rule'; ending: boolean; text: string; refs: Refs };
  vote: { voted: number; yourVote: string | null; tally: Record<string, number> | null } | null;
  rules: { text: string; refs: Refs }[];
};

const en = {
  prompt: 'Prompt',
  duel: 'Duel',
  vote: 'Vote',
  rule: 'New rule',
  ending: 'Rule ends',
  '{count} of {total} voted': '{count} of {total} voted',
  '{n} cards left': '{n} cards left',
  'Last card': 'Last card',
  'Active rules': 'Active rules',
  'Next card': 'Next card',
  'Show votes': 'Show votes',
  'That was the deck!': 'That was the deck!',
  'There is no open vote.': 'There is no open vote.',
  'The deck is finished.': 'The deck is finished.',
  'Choose a player in this game.': 'Choose a player in this game.',
  'On three, everyone points at their pick.': 'On three, everyone points at their pick.',
};
const nb: typeof en = {
  prompt: 'Spørsmål',
  duel: 'Duell',
  vote: 'Avstemning',
  rule: 'Ny regel',
  ending: 'Regelen er over',
  '{count} of {total} voted': '{count} av {total} har stemt',
  '{n} cards left': '{n} kort igjen',
  'Last card': 'Siste kort',
  'Active rules': 'Aktive regler',
  'Next card': 'Neste kort',
  'Show votes': 'Vis stemmene',
  'That was the deck!': 'Det var hele kortstokken!',
  'There is no open vote.': 'Det er ingen åpen avstemning.',
  'The deck is finished.': 'Kortstokken er tom.',
  'Choose a player in this game.': 'Velg en spiller i dette spillet.',
  'On three, everyone points at their pick.': 'På tre peker alle på sitt valg.',
};

/** Card text with {p1}/{p2} replaced by highlighted player names. */
function CardText({ text, refs }: { text: string; refs: Refs }) {
  const { name } = useGame();
  return text.split(/(\{p[12]\})/).map((part, index) => {
    const handle = /^\{p[12]\}$/.test(part) ? refs[part.slice(1, -1)] : undefined;
    return handle ? (
      <b key={index} className="text-primary">
        {name(handle)}
      </b>
    ) : (
      part
    );
  });
}

function Game() {
  const { view, players, act, playing } = useGame<View>();
  const t = useStrings({ en, nb });
  const live = playing && !view.finished;
  const present = players.filter((player) => !player.left).map((player) => player.handle);
  const vote = view.vote;
  return (
    <Page t={t}>
      <Card>
        <Label>{t(view.card.ending ? 'ending' : view.card.kind)}</Label>
        <Big>
          <CardText text={view.card.text} refs={view.card.refs} />
        </Big>
        {view.card.kind === 'vote' && !view.card.ending && !vote ? (
          <Muted>{t('On three, everyone points at their pick.')}</Muted>
        ) : null}
        {vote && !vote.tally ? (
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
      </Card>
      {view.finished ? (
        <Big>{t('That was the deck!')}</Big>
      ) : live ? (
        <Button primary onClick={() => act('next')}>
          {vote && !vote.tally && vote.voted > 0 ? t('Show votes') : t('Next card')}
        </Button>
      ) : null}
      {view.finished ? null : (
        <Muted>
          {view.remaining ? t('{n} cards left', { n: view.remaining }) : t('Last card')}
        </Muted>
      )}
      {view.rules.length ? (
        <Card>
          <Label>{t('Active rules')}</Label>
          {view.rules.map((rule, index) => (
            <p key={index}>
              <CardText text={rule.text} refs={rule.refs} />
            </p>
          ))}
        </Card>
      ) : null}
    </Page>
  );
}

mountGame(Game);
