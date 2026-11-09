// Serves catalogue.json from the games' current sources during `vp dev`, reloads
// the simulator when a game changes, and emits catalogue.json in `vp build`.
import path from 'node:path';
import { buildCatalogue, ROOT } from './games.mjs';

export function gauteGames() {
  return {
    name: 'gaute-games',
    configureServer(server) {
      server.watcher.add(path.join(ROOT, 'games'));
      server.watcher.on('change', (file) => {
        if (file.startsWith(path.join(ROOT, 'games')) || file.startsWith(path.join(ROOT, 'sdk')))
          server.ws.send({ type: 'full-reload' });
      });
      server.middlewares.use('/catalogue.json', (_req, res) => {
        buildCatalogue().then(
          (json) => {
            res.setHeader('content-type', 'application/json');
            res.setHeader('cache-control', 'no-store');
            res.end(json);
          },
          (error) => {
            res.statusCode = 500;
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ error: String(error.message) }));
          },
        );
      });
    },
    async generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'catalogue.json',
        source: await buildCatalogue({ commit: process.env.GITHUB_SHA ?? 'local' }),
      });
    },
  };
}
