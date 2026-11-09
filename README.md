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
(`client.ts`) is an ordinary web page: use plain DOM, React, Svelte, canvas or
anything else. Gaute shows it inside the app, styled with the app's own theme and
fonts, with no network access.

## Make a game

Requires Node 24 and [Vite+](https://viteplus.dev) (installed with the dependencies).

```sh
npm ci
npm run new -- my-game     # copies template/ to games/my-game
vp dev                     # simulator at http://localhost:4800 — pick your game
vp test                    # plays every game in every mode through Gaute's sandbox
vp check                   # format, lint and types
```

Using an AI coding tool? Point it at [AGENTS.md](AGENTS.md); it has the rules.

## Publish

Open a pull request that adds `games/<your-game>/`. CI builds it, plays it in
every mode it declares and checks determinism and size limits. After review and
merge, it is signed and published, and Gaute picks it up within minutes. See
[CONTRIBUTING.md](CONTRIBUTING.md).

## Repository

| Path         | What                                                          |
| ------------ | ------------------------------------------------------------- |
| `sdk/`       | `@gaute/games-sdk`: rules API, page client, protocol, runtime |
| `games/`     | Published games (official ones included); `_kit` is shared UI |
| `template/`  | Starting point for `npm run new`                              |
| `tests/`     | Checks every game must pass                                   |
| `tools/`     | Bundling, sandbox, catalogue signing, Vite plugin             |
| `simulator/` | The local multi-phone simulator                               |

MIT licensed. Gaute itself is a separate, private application.
