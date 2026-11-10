# Contributing a game

Keep your game in your own public GitHub repository. The central index only
stores a JSON entry for each reviewed release.

1. Create a project with the SDK's `gaute-game new your-game` command. See
   [Make a game](README.md#make-a-game) for setup.
2. Build and playtest it in your repository. Run `npm run check` and
   `npm run build`; generated preview files stay in ignored `dist/`.
3. Commit your source, lockfile and licence to your repository. Do not commit
   generated bundles or binaries.
4. Submit a pull request adding `index/your-game.json` here:

```json
{
  "repo": "https://github.com/your-name/your-game",
  "commit": "0123456789abcdef0123456789abcdef01234567"
}
```

Use the full commit hash containing the game source. Branch names and tags are not
accepted. An optional `path` points to the source folder, for example `games/my-game`.
The default is the repository root. The filename determines the game slug and must match its
manifest. Official games reserve their existing slugs.

CI fetches the source archive at that exact commit and builds it with Gaute's
installed SDK, React and Tailwind toolchain. It validates metadata, icons and
bundle limits, then plays every declared mode through the sandbox with
deterministic replay and departures. It never installs repository dependencies
or runs its package scripts, Vite config or PostCSS config. External Tailwind
plugins/configs and imports outside the source repository are rejected. Use
relative modules plus `@gaute/games-sdk/*`, React, React DOM and standard Tailwind.
Import paths must not contain Vite queries or fragments.
A failure stops catalogue publication.

A maintainer reviews the pinned source and CI-built game, checks the licence and
content, and plays the submitted version in the simulator. Only a reviewed merge
to `main` signs and publishes the combined catalogue. An upstream push cannot
change a published game: submit another index pull request with the new commit.
Remove the index entry to withdraw a community game. Official games remain in
`official/` and use the same contract and sandbox checks.

## Content rules

Games are played by groups of adults out together, on Apple's and Google's app
stores. A game must not:

- encourage excessive drinking or drinking as a penalty;
- contain hate, harassment, sexual content, or content targeting real people;
- collect personal information, link to other sites or contain advertising;
- copy another game's name, characters, art or text.

Reports from players can get a game removed, by reverting its folder.

## Licence

Your game repository must include an MIT licence. By submitting an index entry
you confirm that you wrote the game or may distribute it under that licence.
The index and SDK use the [MIT licence](LICENSE).
