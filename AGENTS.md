# Building a Gaute game

You are helping someone make a multiplayer party game for the Gaute app. Read this
before writing code. Use the toolchain already here: Vite+ (`vp`), TypeScript,
React, Tailwind CSS and npm. Do not add dependencies a game does not strictly need.

## Files

A game is a folder `games/<slug>/` (lowercase letters, digits and dashes):

- `manifest.json`: `slug` (folder name), `name` (≤40), `description` (one short line; ≤200), `players` `{ "min": 2+, "max": ≤16 }`,
  `modes` (one or more of `phones`, `pass`, `shared`) and optional `translations`
  (`{ "nb": { "name", "description" } }`).
- `logic.ts`: the rules, imported from `@gaute/games-sdk/logic`.
- `client.tsx`: the screen, a React component mounted with `mountGame` from
  `@gaute/games-sdk/react` (or `client.ts` with any other framework, using
  `connect` from `@gaute/games-sdk/client`).
- `style.css`: `@import 'tailwindcss'; @import '@gaute/games-sdk/tailwind.css';`

Start from `npm run new -- <slug>`; `template/` is a complete, working example.

## Rules (`logic.ts`)

Everything is typed from this one definition, as in TanStack Router: the state
from `setup`, each payload from its validator, the view from `view`. Export it;
the page imports its type.

```ts
import { defineGame, endGame, fields, invalid, type Json } from '@gaute/games-sdk/logic';

// Payloads come from players' pages: check them. Return the typed payload, or
// call invalid(). A Standard Schema (Zod, Valibot, ArkType) works too.
const choice = (payload: Json): { target: string } => {
  const { target } = fields(payload);
  if (typeof target !== 'string') invalid('Choose a player.');
  return { target };
};

export const game = defineGame({
  setup: ({ players, locale, mode, random }) => ({ players, votes: {} as Record<string, string> }),
  actions: (action) => ({
    next: action((state, { playerId, players, random }) => {}), // no payload
    vote: action({ payload: choice, run: (state, { playerId, payload }) => {} }),
  }),
  view: (state, playerId) => ({ voted: Object.keys(state.votes).length }), // what that player sees
  turn: (state) => null, // required for "pass": who holds the phone
  playerLeft: (state, { playerId, players, random }) => {}, // optional
});
```

- Change `state` in place inside actions. Call `invalid('Reason.')` to reject an
  action; nothing changes. Call `endGame(result)` to finish (JSON, ≤4 KB).
- **Deterministic and synchronous.** No `Date`, timers, `fetch`, `async`,
  module-level mutable variables or anything outside the arguments. Use `random`
  (or `Math.random`, which is seeded). An `async` rule is rejected. Tests replay
  games and require identical states, views, turns and results.
- **Secrets live only in `state`.** `view` decides what each player receives; the
  page never sees `state`. `view(state, null)` is the shared screen (modes `pass`
  and `shared`) and must hide every secret.
- Players are handles (`p1`, `p2`, …), never names or accounts. The page gets names.
- Modes: in `phones` each player acts on their own phone. In `pass`, `turn` says who
  holds the phone; actions arrive with that `playerId`, or `null` when `turn` is
  `null`. In `shared`, every action has `playerId: null`. Read `mode` in `setup`.
- Limits: logic bundle 256 KB, state 256 KB, each view 64 KB, payload 16 KB,
  10 actions per player per second, and a CPU/memory budget per action
  (an infinite loop or memory bomb fails the game).

## Screen (`client.tsx`)

```tsx
import { gameClient, useStrings } from '@gaute/games-sdk/react';
import type { game } from './logic';
import './style.css';

const { mountGame, useGame } = gameClient<typeof game>(); // typed by the rules

const strings = {
  en: { Vote: 'Vote', '{n} voted': '{n} voted' },
  nb: { Vote: 'Stem', '{n} voted': '{n} har stemt' },
} as const;

function Game() {
  const { view, you, players, mode, playing, name, act, busy, rejected, haptic } = useGame();
  const t = useStrings(strings);
  return (
    <>
      <p>{t('{n} voted', { n: view.voted })}</p>
      <button
        className="rounded-lg bg-primary p-3 text-primary-foreground"
        disabled={busy}
        onClick={() => act('vote', { target: 'p2' })}
      >
        {t('Vote')}
      </button>
      {rejected ? <p className="text-destructive">{t.text(rejected)}</p> : null}
    </>
  );
}
mountGame(Game);
```

- Never cast or write action names, payloads or view types by hand: `view` is
  what `view` returns, `act` accepts only the game's actions with their
  payloads, and `t` only your keys with their `{placeholders}`. A mistake is a
  type error in `vp check`.
- `act` resolves to `{ ok }` or `{ ok: false, reason }`, sets `busy` meanwhile and
  `rejected` to the reason the rules gave; show `t.text(rejected)` near the
  controls (it translates the reason when it is one of your keys).
- `name(handle)` gives the player's name, or "Player 2" when this viewer may not
  see it. `you` is null on a shared screen.
- Everything must be bundled: the page has **no network access** (no fetch, CDN,
  web fonts or remote images). Use inline SVG, CSS or `data:` URIs.
- Look native: style with Tailwind using the app's colours, which follow light and
  dark mode: `bg-background`, `text-foreground`, `bg-card`, `bg-primary`,
  `text-primary-foreground`, `bg-secondary`, `bg-muted`, `text-muted-foreground`,
  `bg-accent`, `text-destructive`, `border-border`, `border-input`, `ring-ring`,
  `rounded-lg` and the system font. The names are shadcn/ui's, so shadcn/ui
  components match too. In plain CSS use the variables (`var(--primary)`, …).
  Use 44 px+ touch targets.
- Translate your own text with `useStrings`: the app's language is `en` or `nb`
  (Norwegian Bokmål).
- Other frameworks: `connect<typeof game>(({ snapshot, locale, theme }) => render(snapshot))`
  from `@gaute/games-sdk/client` returns the same typed `{ act, haptic }`.
- The screen's bundle (script and style) must stay under 512 KB; React and
  Tailwind take about 230 KB of that.

## Check your work

```sh
vp dev     # simulator: several phones side by side, pass gate, shared screen, log
vp test    # every game, every declared mode, random moves, determinism, limits
vp check   # format, lint, types
```

Content must follow [CONTRIBUTING.md](CONTRIBUTING.md). No game may encourage
excessive drinking.
