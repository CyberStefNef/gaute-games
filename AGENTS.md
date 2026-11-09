# Building a Gaute game

You are helping someone make a multiplayer party game for the Gaute app. Read this
before writing code. Use the toolchain already here: Vite+ (`vp`), TypeScript and
npm. Do not add dependencies a game does not strictly need.

## Files

A game is a folder `games/<slug>/` (lowercase letters, digits and dashes):

- `manifest.json`: `slug` (folder name), `version` (integer, bump on every change),
  `name` (≤40), `description` (≤200), `players` `{ "min": 2+, "max": ≤16 }`,
  `modes` (one or more of `phones`, `pass`, `shared`) and optional `translations`
  (`{ "nb": { "name", "description" } }`).
- `logic.ts`: the rules, imported from `@gaute/games-sdk/logic`.
- `client.ts`: the screen, using `connect` from `@gaute/games-sdk/client`.

Start from `npm run new -- <slug>`; `template/` is a complete, working example.

## Rules (`logic.ts`)

```ts
defineGame({
  setup: ({ players, locale, mode, random }) => state,      // JSON state
  actions: { name: (state, { playerId, payload, players, random }) => void },
  view: (state, playerId) => view,                          // what that player sees
  turn: (state) => playerId | null,                         // required for "pass"
  playerLeft: (state, { playerId, players, random }) => void, // optional
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

## Screen (`client.ts`)

```ts
const game = connect(({ snapshot, locale, theme }) => render(snapshot));
// snapshot: { mode, status, you, players: [{ handle, name, you, left }], view, result }
const result = await game.act('vote', { target: 'p2' }); // { ok } or { ok: false, reason }
game.haptic('selection'); // native haptics on phones
```

- Any web framework, canvas or WebGL is fine. Everything must be bundled: the page
  has **no network access** (no fetch, CDN, web fonts or remote images). Use inline
  SVG, CSS or `data:` URIs.
- Look native: use the app's theme variables, which follow light and dark mode:
  `--background`, `--foreground`, `--card`, `--card-foreground`, `--primary`,
  `--primary-foreground`, `--secondary`, `--muted`, `--muted-foreground`,
  `--accent`, `--destructive`, `--border`, `--input`, `--ring`, `--radius`,
  `--font-sans`. They use shadcn/ui names, so shadcn/ui and Tailwind themes match
  automatically. Use 44 px+ touch targets and the system font.
- Translate your own text: `locale` is `en` or `nb` (Norwegian Bokmål).
- A player's name can be `null` (hidden from this viewer); show "Player 2" instead.

## Check your work

```sh
vp dev     # simulator: several phones side by side, pass gate, shared screen, log
vp test    # every game, every declared mode, random moves, determinism, limits
vp check   # format, lint, types
```

Content must follow [CONTRIBUTING.md](CONTRIBUTING.md). No game may encourage
excessive drinking.
