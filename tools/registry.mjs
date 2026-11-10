// The index pins source commits. Gaute builds them with its own toolchain;
// contributor dependencies, lifecycle scripts and build configuration never run.
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { bundleGame } from './games.mjs';
import { verifyGame } from './playtest.mjs';
import { extractSource } from './source.mjs';

const MAX_DOWNLOAD = 5 * 1024 * 1024;

export function parseIndexEntry(slug, value) {
  if (!/^[a-z][a-z0-9-]{1,39}$/.test(slug)) throw Error('Invalid index filename');
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.keys(value).some((key) => !['repo', 'commit', 'path'].includes(key))
  )
    throw Error(`${slug}: index entry must contain repo, commit and optional path`);
  if (
    typeof value.repo !== 'string' ||
    !/^https:\/\/github\.com\/[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9_.-]+$/.test(value.repo) ||
    ['.', '..'].includes(value.repo.split('/').at(-1))
  )
    throw Error(`${slug}: repo must be a public https://github.com/owner/repository URL`);
  if (!/^[a-f0-9]{40}$/.test(value.commit ?? ''))
    throw Error(`${slug}: commit must be a full lowercase 40-character commit hash`);
  const folder = value.path ?? '.';
  if (
    typeof folder !== 'string' ||
    folder.length > 200 ||
    (folder !== '.' &&
      !folder
        .split('/')
        .every((part) => /^[A-Za-z0-9_.-]+$/.test(part) && part !== '.' && part !== '..'))
  )
    throw Error(`${slug}: path must be a relative source folder without parent traversal`);
  return { repo: value.repo, commit: value.commit, path: folder };
}

export function loadIndex(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => {
      const slug = file.slice(0, -5);
      return {
        slug,
        entry: parseIndexEntry(slug, JSON.parse(readFileSync(path.join(dir, file), 'utf8'))),
      };
    });
}

export async function loadIndexedGame(slug, value, { fetch: fetchFile = globalThis.fetch } = {}) {
  const entry = parseIndexEntry(slug, value);
  const repo = entry.repo.slice('https://github.com/'.length);
  const response = await fetchFile(`https://codeload.github.com/${repo}/tar.gz/${entry.commit}`, {
    redirect: 'error',
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw Error(`${slug}: cannot fetch pinned source (${response.status})`);
  if (!response.body) throw Error(`${slug}: empty source archive`);
  const chunks = [];
  let size = 0;
  for await (const chunk of response.body) {
    size += chunk.byteLength;
    if (size > MAX_DOWNLOAD) throw Error(`${slug}: source download exceeds 5 MB`);
    chunks.push(chunk);
  }
  const dir = mkdtempSync(path.join(tmpdir(), 'gaute-source-'));
  try {
    extractSource(Buffer.concat(chunks), dir, entry.commit);
    const folder = path.resolve(dir, entry.path);
    const game = await bundleGame(slug, folder, { sourceRoot: dir });
    await verifyGame(game);
    return game;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
