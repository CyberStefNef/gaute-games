import { defineConfig } from 'vite-plus';
import { gauteGames } from './tools/vite-plugin.mjs';

export default defineConfig({
  // The simulator (index.html) is the site; catalogue.json is emitted beside it.
  base: './',
  build: { outDir: 'dist', emptyOutDir: true, target: 'es2022' },
  plugins: [gauteGames()],
  server: { port: 4800 },
  // Sandbox VMs and nested production builds are memory-heavy. Bound file
  // concurrency so a full run does not thrash or starve its integration fixtures.
  test: { include: ['tests/**/*.test.ts'], testTimeout: 60_000, maxWorkers: 2 },
  lint: { options: { typeAware: true, typeCheck: true } },
  fmt: { singleQuote: true, printWidth: 100, ignorePatterns: ['dist/**'] },
});
