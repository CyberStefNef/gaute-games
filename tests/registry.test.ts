import { expect, test } from 'vite-plus/test';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parseIndexEntry, loadIndex, loadIndexedGame } from '../tools/registry.mjs';
import { buildCatalogue, readManifest, ROOT, bundleGame } from '../tools/games.mjs';
import { createProject } from '../tools/creator.mjs';
import { gzipSync } from 'node:zlib';
import { extractSource } from '../tools/source.mjs';

const pin = { repo: 'https://github.com/example/independent-game', commit: 'a'.repeat(40) };
function directory(run: (dir: string) => void) {
  const dir = mkdtempSync(path.join(tmpdir(), 'gaute-index-'));
  try {
    run(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test('index entries require an immutable GitHub commit and safe source folder', () => {
  expect(parseIndexEntry('outside-game', pin)).toEqual({ ...pin, path: '.' });
  for (const bad of [
    { ...pin, commit: 'main' },
    { ...pin, commit: 'a'.repeat(7) },
    { ...pin, repo: 'https://github.com@evil.example/a/b' },
    { ...pin, repo: 'https://github.com/a/..' },
    { ...pin, repo: 'https://github.com/a/b?token=private' },
    { ...pin, path: '../game.json' },
    { ...pin, path: '/game.json' },
    { ...pin, path: 'foo/../../game.json' },
    { ...pin, path: 'foo%2fgame.json' },
    { ...pin, path: 'foo//bar' },
    { ...pin, token: 'no-credentials-in-the-index' },
  ])
    expect(() => parseIndexEntry('outside-game', bad)).toThrow();
  expect(() => parseIndexEntry('../bad', pin)).toThrow();
  directory((dir) => {
    writeFileSync(path.join(dir, 'outside-game.json'), JSON.stringify(pin));
    writeFileSync(path.join(dir, '.gitkeep'), '');
    expect(loadIndex(dir)).toEqual([{ slug: 'outside-game', entry: { ...pin, path: '.' } }]);
  });
});

test('index slugs cannot shadow official games', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'gaute-index-'));
  try {
    writeFileSync(path.join(dir, 'outside-game.json'), JSON.stringify(pin));
    await expect(
      buildCatalogue({ localGames: [{ slug: 'outside-game', folder: 'unused' }], indexDir: dir }),
    ).rejects.toThrow('Duplicate game slug');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('creators can start a standalone project without cloning the games repository', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'gaute-project-'));
  try {
    const project = createProject('outside-game', path.join(dir, 'outside-game'));
    expect(JSON.parse(readFileSync(path.join(project, 'manifest.json'), 'utf8')).slug).toBe(
      'outside-game',
    );
    const config = JSON.parse(readFileSync(path.join(project, 'package.json'), 'utf8'));
    expect(config.scripts.build).toBe('gaute-game build .');
    expect(config.devDependencies['@gaute/games-sdk']).toBeTruthy();
    expect(readFileSync(path.join(project, '.node-version'), 'utf8').trim()).toBe('24.21.0');
    expect(() => createProject('outside-game', project)).toThrow('Already exists');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('concurrent builds share work without keeping stale finished bundles', async () => {
  const first = bundleGame('my-game', path.join(ROOT, 'template'));
  const concurrent = bundleGame('my-game', path.join(ROOT, 'template'));
  expect(first).toBe(concurrent);
  const game = await first;
  const next = bundleGame('my-game', path.join(ROOT, 'template'));
  expect(next).not.toBe(first);
  expect((await next).hash).toBe(game.hash);
});

function archive(files: Record<string, string>, type = '0') {
  const blocks: Buffer[] = [];
  for (const [file, content] of Object.entries(files)) {
    const data = Buffer.from(content);
    const header = Buffer.alloc(512);
    header.write(`independent-game-${pin.commit}/${file}`, 0, 100);
    header.write('0000644\0', 100, 8);
    header.write(data.length.toString(8).padStart(11, '0') + '\0', 124, 12);
    header.fill(32, 148, 156);
    header.write(type, 156, 1);
    header.write('ustar\0', 257, 6);
    const checksum = header.reduce((sum, byte) => sum + byte, 0);
    header.write(checksum.toString(8).padStart(6, '0') + '\0 ', 148, 8);
    blocks.push(header, data, Buffer.alloc((512 - (data.length % 512)) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(blocks));
}

function sourceFiles() {
  const manifest = {
    ...readManifest('my-game', path.join(ROOT, 'template')),
    slug: 'outside-game',
  };
  return {
    'manifest.json': JSON.stringify(manifest),
    'icon.svg': manifest.icon,
    'logic.ts': `import { defineGame, endGame } from '@gaute/games-sdk/logic';
      export const game = defineGame({setup:()=>({n:0}),actions:action=>({go:action(s=>{s.n++;endGame({})})}),view:s=>s,turn:()=>null,playerLeft:()=>{}});`,
    'client.tsx':
      'import { createRoot } from "react-dom/client"; import "./style.css"; createRoot(document.body).render(<main>Synthetic game</main>);',
    'style.css':
      '@source "./"; @import "tailwindcss"; @import "@gaute/games-sdk/tailwind.css"; main { color: red; }',
    'vite.config.ts': 'throw Error("external Vite config must never run")',
    'postcss.config.js': 'throw Error("external PostCSS config must never run")',
    'package.json': JSON.stringify({
      scripts: { preinstall: 'exit 1', build: 'exit 1' },
      dependencies: { 'not-installed': '*' },
    }),
  };
}

test('CI builds a pinned source archive without external configs, scripts or dependencies', async () => {
  let requested = '';
  const game = await loadIndexedGame('outside-game', pin, {
    fetch: async (url, options) => {
      requested = typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
      expect(options?.redirect).toBe('error');
      return new Response(archive(sourceFiles()));
    },
  });
  expect(requested).toBe(
    `https://codeload.github.com/example/independent-game/tar.gz/${pin.commit}`,
  );
  expect(game.slug).toBe('outside-game');
  expect(game.hash).toMatch(/^[a-f0-9]{64}$/);
  expect(game.client.script).toContain('Synthetic game');
});

test('missing, oversized and unsafe source archives fail closed', async () => {
  await expect(
    loadIndexedGame('outside-game', pin, { fetch: async () => new Response('', { status: 404 }) }),
  ).rejects.toThrow('404');
  await expect(
    loadIndexedGame('outside-game', pin, {
      fetch: async () => new Response('x'.repeat(5 * 1024 * 1024 + 1)),
    }),
  ).rejects.toThrow('exceeds 5 MB');
  directory((dir) => {
    expect(() => extractSource(archive({ '../escape.ts': 'bad' }), dir, pin.commit)).toThrow(
      'Unsafe',
    );
    expect(() => extractSource(archive({ link: '' }, '2'), dir, pin.commit)).toThrow(
      'regular files',
    );
    expect(() => extractSource(archive({ 'file.ts': 'safe' }), dir, 'b'.repeat(40))).toThrow(
      'pinned commit',
    );
    expect(() =>
      extractSource(gzipSync(Buffer.alloc(33 * 1024 * 1024)), dir, pin.commit),
    ).toThrow();
  });
  const source = sourceFiles();
  source['style.css'] = '@plugin "./postcss.config.js";';
  await expect(
    loadIndexedGame('outside-game', pin, { fetch: async () => new Response(archive(source)) }),
  ).rejects.toThrow('without @plugin');
});

test('index paths select source folders and source imports cannot escape the repository', async () => {
  const nested = Object.fromEntries(
    Object.entries(sourceFiles()).map(([file, code]) => ['game/' + file, code]),
  );
  const game = await loadIndexedGame(
    'outside-game',
    { ...pin, path: 'game' },
    { fetch: async () => new Response(archive(nested)) },
  );
  expect(game.slug).toBe('outside-game');
  const source = sourceFiles();
  source['logic.ts'] = 'import "../outside.ts";';
  await expect(
    loadIndexedGame('outside-game', pin, { fetch: async () => new Response(archive(source)) }),
  ).rejects.toThrow('leaves the repository');
});

test('CSS query variants cannot execute contributor Tailwind plugins', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'gaute-css-plugin-'));
  const marker = path.join(dir, 'executed');
  try {
    for (const query of ['?inline&lang.css', '?x&index=0.css', '?inline']) {
      const source = {
        ...sourceFiles(),
        'payload.code': '@import "tailwindcss"; @plugin "./probe.mjs";',
        'probe.mjs': `import { writeFileSync } from 'node:fs'; writeFileSync(${JSON.stringify(marker)}, 'executed'); export default () => {};`,
      };
      source['client.tsx'] = source['client.tsx'].replace('./style.css', './payload.code' + query);
      await expect(
        loadIndexedGame('outside-game', pin, { fetch: async () => new Response(archive(source)) }),
      ).rejects.toThrow('plain paths');
      expect(existsSync(marker)).toBe(false);
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
