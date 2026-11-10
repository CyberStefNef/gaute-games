import { expect, test } from 'vite-plus/test';
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { stripVTControlCharacters } from 'node:util';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { ROOT } from '../tools/games.mjs';
import { loadIndexedGame } from '../tools/registry.mjs';

async function devCatalogue(cli: string, project: string) {
  const child = spawn(process.execPath, [cli, 'dev', project], {
    cwd: project,
    env: { ...process.env, NODE_ENV: 'development', FORCE_COLOR: '1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const stopped = once(child, 'close');
  let output = '';
  try {
    const url = await new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(Error('Simulator startup timed out: ' + output)),
        15_000,
      );
      child.stdout.on('data', (chunk) => {
        output += String(chunk);
        const url = stripVTControlCharacters(output).match(/http:\/\/127\.0\.0\.1:\d+\//)?.[0];
        if (url) {
          clearTimeout(timeout);
          resolve(url);
        }
      });
      child.stderr.on('data', (chunk) => {
        output += String(chunk);
      });
      child.once('exit', () => {
        clearTimeout(timeout);
        reject(Error('Simulator exited: ' + output));
      });
      child.once('error', (error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
    expect((await fetch(url)).status).toBe(200);
    expect((await fetch(url + 'simulator/main.ts')).status).toBe(200);
    const response = await fetch(url + 'catalogue.json');
    expect(response.status).toBe(200);
    return await response.json();
  } finally {
    child.kill();
    await stopped;
  }
}

// Copy the npm file list under node_modules. A symlink to the checkout would
// conceal Node's refusal to strip TypeScript from installed dependencies.
test('the packaged CLI creates a game that also builds through the source index', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'gaute-installed-cli-'));
  const modules = path.join(dir, 'node_modules');
  const installed = path.join(modules, '@gaute/games-sdk');
  try {
    mkdirSync(installed, { recursive: true });
    const [pack] = JSON.parse(
      execFileSync('npm', ['pack', '--dry-run', '--ignore-scripts', '--json'], {
        cwd: ROOT,
        encoding: 'utf8',
      }),
    ) as { files: { path: string }[] }[];
    for (const file of pack.files) {
      const target = path.join(installed, file.path);
      mkdirSync(path.dirname(target), { recursive: true });
      cpSync(path.join(ROOT, file.path), target);
    }
    for (const name of readdirSync(path.join(ROOT, 'node_modules'))) {
      if (name === '@gaute' || name === '.bin') continue;
      symlinkSync(path.join(ROOT, 'node_modules', name), path.join(modules, name), 'dir');
    }
    mkdirSync(path.join(modules, '.bin'));
    for (const name of readdirSync(path.join(ROOT, 'node_modules/.bin')))
      symlinkSync(path.join(ROOT, 'node_modules/.bin', name), path.join(modules, '.bin', name));
    const cli = path.join(installed, 'tools/cli.mjs');
    symlinkSync(cli, path.join(modules, '.bin/gaute-game'));
    const project = path.join(dir, 'outside-game');
    execFileSync(process.execPath, [cli, 'new', 'outside-game'], { cwd: dir });
    execFileSync('npm', ['run', 'check'], { cwd: project, stdio: 'inherit' });
    execFileSync('npm', ['run', 'build'], { cwd: project, stdio: 'inherit' });
    const { game } = JSON.parse(readFileSync(path.join(project, 'dist/game.json'), 'utf8'));
    expect(game.slug).toBe('outside-game');
    expect(game.hash).toMatch(/^[a-f0-9]{64}$/);
    expect(game.client.script.length).toBeGreaterThan(0);
    execFileSync('git', ['init', '--quiet'], { cwd: project });
    execFileSync('git', ['add', '.'], { cwd: project });
    execFileSync(
      'git',
      [
        '-c',
        'user.name=Synthetic Creator',
        '-c',
        'user.email=synthetic@example.invalid',
        'commit',
        '--quiet',
        '-m',
        'Synthetic game source',
      ],
      { cwd: project },
    );
    const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: project,
      encoding: 'utf8',
    }).trim();
    const source = execFileSync(
      'git',
      ['archive', '--format=tar.gz', `--prefix=outside-game-${commit}/`, 'HEAD'],
      { cwd: project },
    );
    const indexed = await loadIndexedGame(
      'outside-game',
      { repo: 'https://github.com/example/independent-game', commit },
      { fetch: async () => new Response(source) },
    );
    expect(indexed.hash).toBe(game.hash);
    const preview = await devCatalogue(cli, project);
    expect(preview.games.map((entry: { slug: string }) => entry.slug)).toEqual(['outside-game']);
    expect(preview.games[0].client.script).not.toContain('.jsxDEV');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
