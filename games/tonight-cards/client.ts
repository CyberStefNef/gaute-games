import '../_kit/base.css';
import { h, mount, playing, type Ui } from '../_kit/kit';

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
  'Player {n}': 'Player {n}',
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
  'Player {n}': 'Spiller {n}',
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
function cardText({ name }: Ui, text: string, refs: Refs) {
  return text
    .split(/(\{p[12]\})/)
    .map((part) =>
      /^\{p[12]\}$/.test(part) && refs[part.slice(1, -1)]
        ? h('b', { class: 'name' }, name(refs[part.slice(1, -1)]))
        : part,
    );
}

mount({ en, nb }, (ui) => {
  const { state, t, name, act, busy } = ui;
  const view = state.snapshot.view as View;
  const live = playing(state.snapshot) && !view.finished;
  const players = state.snapshot.players.filter((p) => !p.left);
  const vote = view.vote;
  const most = Math.max(1, ...Object.values(vote?.tally ?? {}));
  return [
    h(
      'section',
      { class: 'card' },
      h('p', { class: 'label' }, t(view.card.ending ? 'ending' : view.card.kind)),
      h('p', { class: 'big' }, cardText(ui, view.card.text, view.card.refs)),
      view.card.kind === 'vote' && !view.card.ending && !vote
        ? h('p', { class: 'muted' }, t('On three, everyone points at their pick.'))
        : null,
      vote && !vote.tally
        ? h(
            'div',
            { class: 'choices' },
            players.map((player) =>
              h(
                'button',
                {
                  'aria-pressed': String(vote.yourVote === player.handle),
                  disabled: busy || !live,
                  onClick: () => act('vote', { target: player.handle }),
                },
                name(player.handle),
              ),
            ),
            h(
              'p',
              { class: 'muted' },
              t('{count} of {total} voted', { count: vote.voted, total: players.length }),
            ),
          )
        : null,
      vote?.tally
        ? Object.entries(vote.tally)
            .sort((a, b) => b[1] - a[1])
            .map(([handle, count]) =>
              h(
                'div',
                { class: 'row' },
                h('span', null, name(handle)),
                h(
                  'div',
                  { class: 'track' },
                  h('div', { class: 'bar', style: `width:${(count / most) * 100}%` }),
                ),
                h('strong', null, count),
              ),
            )
        : null,
    ),
    view.finished
      ? h('p', { class: 'big' }, t('That was the deck!'))
      : live
        ? h(
            'button',
            { class: 'primary', disabled: busy, onClick: () => act('next') },
            vote && !vote.tally && vote.voted > 0 ? t('Show votes') : t('Next card'),
          )
        : null,
    !view.finished
      ? h(
          'p',
          { class: 'muted' },
          view.remaining ? t('{n} cards left', { n: view.remaining }) : t('Last card'),
        )
      : null,
    view.rules.length
      ? h(
          'section',
          { class: 'card' },
          h('p', { class: 'label' }, t('Active rules')),
          view.rules.map((rule) => h('p', null, cardText(ui, rule.text, rule.refs))),
        )
      : null,
  ];
});
