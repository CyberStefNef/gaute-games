import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Creates an independent project; no clone or fork of the SDK is required. */
export function createProject(slug, target = path.resolve(slug)) {
  if (!/^[a-z][a-z0-9-]{1,39}$/.test(slug)) throw Error('Use a lowercase slug of 2–40 characters.');
  if (existsSync(target)) throw Error(`Already exists: ${target}`);
  cpSync(path.join(ROOT, 'template'), target, { recursive: true });
  cpSync(path.join(ROOT, 'LICENSE'), path.join(target, 'LICENSE'));
  const manifest = path.join(target, 'manifest.json');
  const manifestText = readFileSync(manifest, 'utf8');
  writeFileSync(
    manifest,
    manifestText.replace(/("slug"\s*:\s*)"[^"]*"/, (_, prefix) => prefix + JSON.stringify(slug)),
  );
  const sdk = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  writeFileSync(
    path.join(target, 'package.json'),
    JSON.stringify(
      {
        name: slug,
        private: true,
        type: 'module',
        scripts: {
          dev: 'gaute-game dev .',
          check: 'vp check && gaute-game check .',
          build: 'gaute-game build .',
        },
        devDependencies: {
          '@gaute/games-sdk': 'git+https://github.com/CyberStefNef/gaute-games.git',
          ...sdk.devDependencies,
        },
        overrides: sdk.overrides,
        engines: sdk.engines,
        packageManager: sdk.packageManager,
      },
      null,
      2,
    ) + '\n',
  );
  writeFileSync(
    path.join(target, '.node-version'),
    readFileSync(path.join(ROOT, '.node-version'), 'utf8'),
  );
  writeFileSync(
    path.join(target, 'tsconfig.json'),
    `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "preserve",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "allowImportingTsExtensions": true,
    "lib": ["ES2022", "DOM"],
    "types": ["node", "react", "react-dom"]
  },
  "include": ["*.ts", "*.tsx"]
}
`,
  );
  writeFileSync(
    path.join(target, 'vite.config.ts'),
    "import { defineConfig } from 'vite-plus';\nexport default defineConfig({\n  lint: { options: { typeAware: true, typeCheck: true } },\n  fmt: { singleQuote: true, printWidth: 100, ignorePatterns: ['dist/**'] },\n});\n",
  );
  writeFileSync(path.join(target, 'style.d.ts'), "declare module '*.css';\n");
  writeFileSync(path.join(target, '.gitignore'), 'node_modules/\ndist/\n.env*\n');
  writeFileSync(
    path.join(target, 'README.md'),
    `# ${slug}\n\nRun npm install once, then commit package-lock.json. Use npm ci afterwards.\n\nnpm run dev opens the Gaute simulator. npm run check validates the bundle and\nplays it through the sandbox. npm run build checks the game and writes a local preview bundle. Commit your source\nand lockfile to your public repository, then submit index/${slug}.json to the\nGaute games index with your repository URL and the full commit hash.\n`,
  );
  return target;
}

export async function exportGame(folder, { write = true } = {}) {
  const { bundleGame } = await import('./games.mjs');
  const { verifyGame } = await import('./playtest.mjs');
  const dir = path.resolve(folder);
  const { slug } = JSON.parse(readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
  const game = await bundleGame(slug, dir);
  await verifyGame(game);
  if (write) {
    mkdirSync(path.join(dir, 'dist'), { recursive: true });
    writeFileSync(path.join(dir, 'dist', 'game.json'), JSON.stringify({ format: 1, game }) + '\n');
  }
  return game;
}
