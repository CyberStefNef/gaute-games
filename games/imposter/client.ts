import '../_kit/base.css';
import { h, mount, playing, type Ui } from '../_kit/kit';

type View = {
  mode: 'phones' | 'pass' | 'shared';
  round: number;
  phase: 'roles' | 'clues' | 'vote' | 'reveal';
  role: 'imposter' | 'crew' | null;
  word: string | null;
  voted: number;
  yourVote: string | null;
  scores: Record<string, number>;
  reveal: { imposter: string; caught: boolean; tally: Record<string, number> } | null;
};

const en = {
  'Player {n}': 'Player {n}',
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
};
const nb: typeof en = {
  'Player {n}': 'Spiller {n}',
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

function scores({ state, t, name }: Ui, view: View) {
  const rows = Object.entries(view.scores).sort((a, b) => b[1] - a[1]);
  return h(
    'section',
    { class: 'card' },
    h('p', { class: 'label' }, t('Scores')),
    rows.map(([handle, score]) =>
      h('div', { class: 'row' }, h('span', null, name(handle)), h('strong', null, score)),
    ),
    state.snapshot.status === 'ended' ? h('p', { class: 'muted' }, t('Game over')) : null,
  );
}

function roleCard({ t }: Ui, view: View) {
  if (view.role === null) return h('p', { class: 'label' }, t('Round {n}', { n: view.round }));
  return view.role === 'imposter'
    ? h(
        'section',
        { class: 'card' },
        h('p', { class: 'label' }, t('Round {n}', { n: view.round })),
        h('p', { class: 'big' }, t('You are the imposter')),
        h('p', { class: 'muted' }, t('Listen to the clues and blend in.')),
      )
    : h(
        'section',
        { class: 'card' },
        h(
          'p',
          { class: 'label' },
          t('Round {n}', { n: view.round }) + ' · ' + t('The secret word'),
        ),
        h('p', { class: 'big' }, view.word),
      );
}

function choices(
  ui: Ui,
  handles: string[],
  chosen: string | null,
  onChoose: (handle: string) => void,
) {
  return h(
    'div',
    { class: 'choices' },
    handles.map((handle) =>
      h(
        'button',
        {
          'aria-pressed': String(chosen === handle),
          disabled: ui.busy || !playing(ui.state.snapshot),
          onClick: () => onChoose(handle),
        },
        ui.name(handle),
      ),
    ),
  );
}

mount({ en, nb }, (ui) => {
  const { state, t, name, act, busy } = ui;
  const view = state.snapshot.view as View;
  const live = playing(state.snapshot);
  const players = state.snapshot.players.filter((p) => !p.left).map((p) => p.handle);
  // Passing the phone: the holder reads their role privately, then passes it on.
  if (view.phase === 'roles')
    return [
      roleCard(ui, view),
      live
        ? h(
            'button',
            { class: 'primary', disabled: busy, onClick: () => act('seen') },
            t('Got it, pass the phone on'),
          )
        : null,
    ];
  if (view.phase === 'clues')
    return [
      roleCard(ui, view),
      h(
        'p',
        { class: 'muted' },
        t('Take turns giving a one-word clue out loud. Do not say the word.'),
      ),
      live
        ? h(
            'button',
            { class: 'primary', disabled: busy, onClick: () => act('startVote') },
            t('Start the vote'),
          )
        : null,
      scores(ui, view),
    ];
  if (view.phase === 'vote' && view.mode !== 'phones')
    return [
      roleCard(ui, view),
      h(
        'section',
        { class: 'card' },
        h('p', { class: 'label' }, t('Who does the group accuse?')),
        h('p', { class: 'muted' }, t('Agree out loud, then choose one player.')),
        choices(ui, players, null, (handle) => act('accuse', { target: handle })),
      ),
    ];
  if (view.phase === 'vote')
    return [
      roleCard(ui, view),
      h(
        'section',
        { class: 'card' },
        h('p', { class: 'label' }, t('Who is the imposter?')),
        choices(
          ui,
          players.filter((handle) => handle !== state.snapshot.you),
          view.yourVote,
          (handle) => act('vote', { target: handle }),
        ),
        h(
          'p',
          { class: 'muted' },
          t('{count} of {total} voted', { count: view.voted, total: players.length }),
        ),
      ),
      live && view.voted > 0
        ? h('button', { disabled: busy, onClick: () => act('reveal') }, t('Reveal now'))
        : null,
    ];
  const reveal = view.reveal!;
  const most = Math.max(1, ...Object.values(reveal.tally));
  return [
    h(
      'section',
      { class: 'card' },
      h('p', { class: 'big' }, reveal.caught ? t('Caught!') : t('The imposter got away')),
      h('p', null, t('The imposter was {name}.', { name: name(reveal.imposter) })),
      h('p', { class: 'muted' }, t('The word was {word}.', { word: view.word ?? '' })),
    ),
    view.mode === 'phones'
      ? h(
          'section',
          { class: 'card' },
          h('p', { class: 'label' }, t('Votes')),
          Object.entries(reveal.tally).map(([handle, count]) =>
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
          ),
        )
      : null,
    scores(ui, view),
    live
      ? h(
          'button',
          { class: 'primary', disabled: busy, onClick: () => act('nextRound') },
          t('Next round'),
        )
      : null,
  ];
});
