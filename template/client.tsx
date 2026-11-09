import { useState } from 'react';
import { gameClient, useStrings } from '@gaute/games-sdk/react';
import type { game } from './logic';
import './style.css';

// Hooks typed by the rules: `view` is what `view` returns, and `act` accepts only
// the game's actions with their payloads.
const { mountGame, useGame } = gameClient<typeof game>();

// The game's page: a React component styled with Tailwind CSS. Colours such as
// bg-primary and text-muted-foreground follow the Gaute app, in light and dark
// mode. You may use any other framework or plain DOM instead (see README).
const strings = {
  en: {
    'Your guess': 'Your guess',
    '{name} is guessing': '{name} is guessing',
    '{name} found {secret}!': '{name} found {secret}!',
    'The group': 'The group',
    Guess: 'Guess',
    higher: 'higher',
    lower: 'lower',
    correct: 'correct',
  },
  nb: {
    'Your guess': 'Din gjetning',
    '{name} is guessing': '{name} gjetter',
    '{name} found {secret}!': '{name} fant {secret}!',
    'The group': 'Gruppa',
    Guess: 'Gjett',
    higher: 'høyere',
    lower: 'lavere',
    correct: 'riktig',
  },
} as const;

function Game() {
  const { view, name, act, busy, rejected, playing } = useGame();
  const t = useStrings(strings);
  const [value, setValue] = useState('');
  const who = (handle: string | null) => (handle ? name(handle) : t('The group'));
  const title = view.winner
    ? t('{name} found {secret}!', {
        name: who(view.winner === 'group' ? null : view.winner),
        secret: view.secret ?? '',
      })
    : view.yourTurn
      ? t('Your guess')
      : t('{name} is guessing', { name: who(view.next) });

  return (
    <main className="mx-auto flex max-w-lg flex-col gap-4 p-4">
      <h1 className="text-2xl font-bold">{title}</h1>
      {playing && view.yourTurn ? (
        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void act('guess', { value: Number(value) }).then((result) => {
              if (result.ok) setValue('');
            });
          }}
        >
          <input
            className="min-w-0 flex-1 rounded-lg border border-input bg-card px-3 py-3 text-base"
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            placeholder="1–100"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          />
          <button
            className="rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50"
            disabled={busy || !value}
          >
            {t('Guess')}
          </button>
        </form>
      ) : null}
      {rejected ? (
        <p role="alert" className="font-semibold text-destructive">
          {t.text(rejected)}
        </p>
      ) : null}
      <ol className="flex flex-col gap-1 text-muted-foreground">
        {[...view.guesses].reverse().map((guess, index) => (
          <li key={view.guesses.length - index}>
            {who(guess.player)}: {guess.value} → {t(guess.hint)}
          </li>
        ))}
      </ol>
    </main>
  );
}

mountGame(Game);
