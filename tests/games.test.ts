// Every game in official/ (and the template) must build within the limits and play
// through Gaute's sandbox in each mode it declares, deterministically.
import path from 'node:path';
import { describe, test } from 'vite-plus/test';
import { bundleGame, listGames, ROOT } from '../tools/games.mjs';
import { verifyGame } from '../tools/playtest.mjs';

const games: [string, string][] = [
  ...listGames().map((slug): [string, string] => [slug, path.join(ROOT, 'official', slug)]),
  ['template', path.join(ROOT, 'template')],
];

describe.each(games)('%s', (name, dir) => {
  test(
    'builds and plays in every declared mode, with deterministic replay and departures',
    async () => {
      const game = await bundleGame(name === 'template' ? 'my-game' : name, dir);
      await verifyGame(game);
    },
    name === 'frontier' ? 120_000 : 60_000,
  );
});
