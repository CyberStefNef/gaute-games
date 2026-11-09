# Contributing a game

1. Fork this repository and run `npm ci`.
2. `npm run new -- your-game`, then build it with `vp dev` open.
3. Make sure `vp check` and `vp test` pass.
4. Open a pull request that only touches `games/your-game/`.

CI repeats the checks. A maintainer then plays the game and reviews the code and
content. Merged games are signed and published automatically and appear in Gaute
within minutes. To change a published game, open another pull request. Each build
is identified by a hash of its code, so there is no version number to bump.

## Content rules

Games are played by groups of adults out together, on Apple's and Google's app
stores. A game must not:

- encourage excessive drinking or drinking as a penalty;
- contain hate, harassment, sexual content, or content targeting real people;
- collect personal information, link to other sites or contain advertising;
- copy another game's name, characters, art or text.

Reports from players can get a game removed, by reverting its folder.

## Licence

By opening a pull request you confirm that you wrote the game or may share it,
and you license it under the [MIT licence](LICENSE).
