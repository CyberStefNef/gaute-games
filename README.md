# Gaute games

Multiplayer games that groups play together in [Gaute](https://gaute.beer) during a
night out, plus the SDK and tools to make your own. Every game here is open
source, and anyone can add one with a pull request.

**Try the games in your browser:** https://cyberstefnef.github.io/gaute-games/

## How games are played

Each game declares the ways it can be played:

| Mode     | Who needs the Gaute app                         |
| -------- | ----------------------------------------------- |
| `phones` | Everyone, in tonight's Gaute group              |
| `pass`   | One person; the phone is passed around in turns |
| `shared` | One person; the whole group looks at one screen |

A game is a small web app in two parts. **Rules** (`logic.ts`) decide what happens
and what each player may see; Gaute runs them in a sandbox. **The screen**
(`client.tsx`) is an ordinary web page. The template uses React and Tailwind CSS,
whose `bg-primary`, `text-muted-foreground` and other colours follow the app's
theme in light and dark mode. Plain DOM and canvas work too. Central source
builds use the approved SDK, React and Tailwind imports. Gaute gives it the full screen with the app's fonts and no network access.
Games own their navigation: `useGame()` exposes `controls` and `host(action)`
for Back, leaving/ending a session, replay and changing local players. Render only
the advertised controls; the app validates requests and keeps group End host-only.

## Make a game

Use Node 24 and npm. Create a standalone project without cloning this repository:

```sh
npx --package=git+https://github.com/CyberStefNef/gaute-games.git gaute-game new my-game
cd my-game
npm install
npm run dev                # simulator, with just your game
npm run check              # formatting, lint, types and sandbox playtest
npm run build              # local preview bundle in ignored dist/
```

Commit the generated `package-lock.json` and use `npm ci` after setup. Keep your
source and lockfile in your own public repository. CI builds the pinned source;
creators do not upload generated bundles or binaries. Submit its URL and
full commit hash in `index/my-game.json`; see [CONTRIBUTING.md](CONTRIBUTING.md).
The SDK command becomes available after this tooling release is merged.

Using an AI coding tool? Point it at [AGENTS.md](AGENTS.md) for the game contract.
Maintainers working on official games can still run `npm run new -- my-game`
here, then use `npm run dev`, `npm run check` and `npm test`.

## Group playtest

Run `npm run dev` to open the simulator at http://localhost:4800. Use synthetic
names. These changes need a real group playtest before we can judge the fun.
The simulator gives each player a separate screen; check own-phone interaction
in the Gaute app after the reviewed catalogue release as well.

Try Never Have I Ever, Two Truths and a Lie, then Bluff with 3–6 people:

- Never Have I Ever: finish ten rounds, including at least six “I have” answers
  from one player. Everyone should still participate. Stories are optional.
- Two Truths: everyone prepares together. Check that each player's statements
  stay private until their turn and that later turns start without more writing.
- Bluff: let the round leader reveal answers individually, then try Show all
  answers. Check that another player cannot reveal early. If the leader leaves,
  the next remaining player takes over.

Have someone unfamiliar with the rules start each game. Note where they need
help, where players wait or lose interest, and which reveals start a conversation.
After each game, ask whether the group wants another round and what they would
change. Record observations separately from suggestions. Check English and
Norwegian, light and dark themes, and both shared and own-phone play where
supported. Simulator evidence does not replace Android and iOS device checks.

## Question content pilot

The four `official/*/pilot.ts` files contain the original bilingual content pilot:
30 Would You Rather dilemmas, 30 Never Have I Ever statements, 15 truths,
15 dares and ten Bluff facts. Each entry has a permanent ID and topic. Facts
also include a reveal explanation, primary source URL and source-check date.
Keep IDs when editing wording. Check factual answers and their accepted aliases
in both languages. The pilot is ready for playtesting; it has no player ratings
yet and has not been validated with a real group.

For editorial review, try answering each prompt before accepting it. Dilemmas
need a reason to choose either side. Statements should invite a recognisable
incident or a short story. Dares should work seated, without equipment or
access to anyone's messages. A Bluff fact needs several plausible fake answers
and a source that supports the exact wording. Review Norwegian for natural
phrasing and playable answers, rather than matching English word for word.

The host can restore private `content` history through a single reserved
`restoreContent` action before showing setup views. Games record only displayed
catalogue IDs, including skipped cards. They choose unseen cards first and reuse
the least recently shown cards after exhaustion. Older hosts still run these
games, but cannot remember earlier sessions. The local simulator also starts
each Restart with fresh history; sandbox tests cover repeated sessions.

During the group pilot, play two games from the same pack, note confusing or
flat prompts by their IDs, and ask which questions started a story, disagreement
or performance. Test each language separately. Skips are observations, not an
automatic reason to remove a card. The host integration in Gaute keeps at most
512 IDs per game and eight games per evening. Custom prompts, answers and names
never enter that history.

## Publish

Add `index/<slug>.json` with `repo` and a full `commit` hash. An optional `path` selects a source folder inside the pinned repository.
CI fetches and builds that source with our toolchain, then validates and
sandbox-tests it alongside the official games. Owner
review and a merge publish the signed catalogue Gaute already imports. Updating
your own repository does not update the pin. See [CONTRIBUTING.md](CONTRIBUTING.md).

## Official game layout

Official games live in `official/<slug>/`, separately from the community
repository index. Each game keeps these concerns together in its own folder:

- `logic.ts` defines setup, validated actions and player views.
- `client.tsx` renders the game.
- `content.ts` contains its questions, word packs or cards, where applicable.
- `strings.ts` contains English and Norwegian interface text.
- `pilot.ts` holds the new question pilot and fact sources, where applicable.
- `manifest.json` and `icon.svg` describe the catalogue entry.

Werewolves also separates state types into `state.ts` and phase transitions into
`round.ts`. The reusable official controls and rules helpers live in
`official/_kit/`. Community creators use their own repositories and `index/` pins.

## Repository

| Path         | What                                                          |
| ------------ | ------------------------------------------------------------- |
| `sdk/`       | `@gaute/games-sdk`: rules, page client, React, Tailwind theme |
| `official/`  | Official games; `_kit` is their shared UI                     |
| `index/`     | Community repository URLs and reviewed commit pins            |
| `template/`  | Starting point for standalone projects and official games     |
| `tests/`     | Checks every game must pass                                   |
| `tools/`     | Bundling, sandbox, catalogue signing, Vite plugin             |
| `simulator/` | The local multi-phone simulator                               |

MIT licensed. Gaute itself is a separate, private application.

## 3D models

Import offline GLB assets and create a host-owned scene with
`@gaute/games-sdk/scene3d`. Three.js is shared by the host and does not consume
each game's code budget. Native-capable hosts can use React Native WebGPU, with
a browser WebGL2 fallback. See [3D scenes](sdk/scene3d.md) for the API, model
limits and the playable `examples/models3d` workshop.

## Default runtime budgets

Every game uses the expanded defaults from `@gaute/games-sdk/limits`; no manifest
profile is needed. State may use 512 KB and each private view 256 KB. The rules
bundle may use 384 KB and the client 768 KB, with a 960 KB combined code limit
to leave room for metadata in the host database. QuickJS has 32 MB memory, a
512 KB stack and 800 interrupt checks per call. Payloads remain 16 KB, results
4 KB and actions 10 per player per second.

Existing games keep their contract and protocol. Bigger budgets support larger
boards and asset sets, but measured execution and rendering costs still matter.
They do not add realtime prediction, long-lived matches, arbitrary networking
or native APIs. Creator checks and the Gaute host enforce the defaults.

## Responsive game pages

Render the SDK's optional `<PauseMenu />` inside your game, or use `controls`,
`host(action)` and `useGameBack` for your own navigation. The template includes the
menu and it follows the app's language and theme. Import the SDK Tailwind sheet
so installed-package menu styles are included.

`useGame().pending` is typed from your rules, just like `act`. Use its action and
payload to highlight the player's selection immediately while `busy` is true.
Use `pending.view` to scope a preview to the original question/round.
The server decides scores and outcomes; clear/reconcile any local preview when
an action fails or the confirmed view arrives. The SDK waits for the committed
snapshot version even if the acknowledgement arrives first, bounds missing
responses, and never automatically repeats an action. Plain `connect` supports
`onBack` and `dispose` as well as the same ordered acknowledgements.
