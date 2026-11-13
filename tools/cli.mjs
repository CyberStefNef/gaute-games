#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createProject, exportGame } from './creator.mjs';

const [command, arg] = process.argv.slice(2);
try {
  if (command === 'new' && arg) {
    console.log(`Created ${createProject(arg)}. Run npm install there, then npm run dev.`);
  } else if (command === 'build' || command === 'check') {
    const game = await exportGame(arg ?? '.', { write: command === 'build' });
    console.log(
      `${game.slug}: checked${command === 'build' ? ' and wrote dist/game.json' : ''} (${game.hash})`,
    );
  } else if (command === 'dev') {
    const folder = path.resolve(arg ?? '.');
    const { slug } = JSON.parse(readFileSync(path.join(folder, 'manifest.json'), 'utf8'));
    const { createServer } = await import('vite-plus');
    const { ROOT } = await import('./games.mjs');
    const { gauteGames } = await import('./vite-plugin.mjs');
    const server = await createServer({
      root: ROOT,
      configFile: false,
      plugins: [gauteGames({ localGames: [{ slug, folder }], indexDir: null })],
      server: { host: '127.0.0.1', port: 4800 },
    });
    await server.listen();
    server.printUrls();
  } else {
    throw Error('Usage: gaute-game new <slug> | dev [folder] | check [folder] | build [folder]');
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
