// Finds, validates and bundles the games in official/. Used by the Vite plugin
// (simulator and catalogue), the tests and the CI publish step.
import { createHash } from 'node:crypto';
import { modelAssets } from './model-assets.mjs';
import { GAME_LIMITS } from '../sdk/limits.mjs';
import { sourceImports, validateSourceStyles } from './source-build.mjs';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { build } from 'vite-plus';
import { iconProblem } from '../sdk/icon.mjs';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const LIMITS = {
  logic: GAME_LIMITS.logicBytes,
  client: GAME_LIMITS.clientBytes,
  code: GAME_LIMITS.codeBytes,
  maxPlayers: GAME_LIMITS.maxPlayers,
};
export const MODES = ['phones', 'pass', 'shared'];

/** Game folders: everything in official/ except helpers such as official/_kit. */
export function listGames() {
  const dir = path.join(ROOT, 'official');
  return readdirSync(dir)
    .filter((name) => !name.startsWith('_') && !name.startsWith('.'))
    .filter((name) => statSync(path.join(dir, name)).isDirectory())
    .sort();
}

const text = (value, max) =>
  typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= max;

/** Reads official/<slug>/manifest.json and throws a precise message when it is invalid. */
export function readManifest(slug, dir = path.join(ROOT, 'official', slug)) {
  const file = path.join(dir, 'manifest.json');
  const value = JSON.parse(readFileSync(file, 'utf8'));
  const icon = readFileSync(path.join(dir, 'icon.svg'), 'utf8').trim();
  return validateManifest(slug, value, icon);
}

export function validateManifest(slug, value, icon) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error(`${slug}: invalid manifest`);
  const problems = [];
  if (!/^[a-z][a-z0-9-]{1,39}$/.test(slug)) problems.push('folder name must be a lowercase slug');
  if (value.slug !== slug) problems.push(`"slug" must be "${slug}"`);
  if (!text(value.name, 40)) problems.push('"name" must be 1–40 characters');
  if (!text(value.description, 200)) problems.push('"description" must be 1–200 characters');
  const { min, max } = value.players ?? {};
  if (
    !Number.isSafeInteger(min) ||
    !Number.isSafeInteger(max) ||
    min < 2 ||
    max < min ||
    max > LIMITS.maxPlayers
  )
    problems.push(`"players" must be { "min": 2+, "max": up to ${LIMITS.maxPlayers} }`);
  const modes = value.modes;
  if (
    !Array.isArray(modes) ||
    !modes.length ||
    new Set(modes).size !== modes.length ||
    modes.some((mode) => !MODES.includes(mode))
  )
    problems.push(`"modes" must list one or more of ${MODES.join(', ')}`);
  const steps = (list) =>
    Array.isArray(list) &&
    list.length >= 1 &&
    list.length <= 6 &&
    list.every((step) => text(step, 140));
  if (!steps(value.howToPlay))
    problems.push('"howToPlay" must list 1–6 short steps (each ≤140 characters)');
  for (const [locale, entry] of Object.entries(value.translations ?? {}))
    if (
      !/^[a-z]{2}$/.test(locale) ||
      !text(entry?.name, 40) ||
      !text(entry?.description, 200) ||
      !steps(entry?.howToPlay) ||
      entry.howToPlay.length !== value.howToPlay?.length
    )
      problems.push(
        `translation "${locale}" needs a name (≤40), description (≤200) and the same number of howToPlay steps`,
      );
  const unsafe = typeof icon === 'string' && icon ? iconProblem(icon) : 'add icon.svg';
  if (unsafe) problems.push(`icon.svg ${unsafe}`);
  if (problems.length) throw Error(`official/${slug}: ${problems.join('; ')}`);
  return {
    slug,
    name: value.name,
    description: value.description,
    players: { min, max },
    modes,
    howToPlay: value.howToPlay,
    icon,
    translations: value.translations ?? {},
  };
}

/** The first of `names` (such as client.tsx or client.ts) that exists in `dir`. */
function entry(dir, names) {
  const name = names.find((candidate) => existsSync(path.join(dir, candidate)));
  if (!name) throw Error(`${path.relative(ROOT, dir)}: add ${names.join(' or ')}`);
  return name;
}

async function bundle(dir, entry, { page = false, sourceRoot } = {}) {
  const result = await build({
    // Rooted in the game's folder, so Tailwind generates only the classes it uses.
    root: page ? dir : ROOT,
    configFile: false,
    logLevel: 'silent',
    // Game pages may use Tailwind CSS (`@import 'tailwindcss'`) and React.
    plugins: [
      modelAssets(),
      ...(sourceRoot ? [sourceImports(sourceRoot)] : []),
      ...(page ? [tailwindcss()] : []),
    ],
    css: { postcss: { plugins: [] } },
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    // Nested builds in the live simulator inherit NODE_ENV=development. Match
    // the JSX transform to the production React runtime bundled above.
    oxc: { jsx: { development: false } },
    build: {
      write: false,
      minify: true,
      target: 'es2020',
      cssCodeSplit: false,
      lib: {
        entry: path.join(dir, entry),
        formats: ['iife'],
        name: '__gauteGame',
        cssFileName: 'game',
        fileName: () => 'game.js',
      },
    },
  });
  const files = (Array.isArray(result) ? result : [result]).flatMap((output) => output.output);
  return {
    script: files.find((file) => file.type === 'chunk')?.code ?? '',
    style: files
      .filter((file) => file.type === 'asset' && file.fileName.endsWith('.css'))
      .map((file) => String(file.source))
      .join('\n'),
  };
}

/**
 * Builds one game: logic for the sandbox, client page script and style, and the
 * content hash that identifies this version.
 */
async function buildGame(slug, folder = path.join(ROOT, 'official', slug), { sourceRoot } = {}) {
  const dir = path.resolve(folder);
  if (sourceRoot) validateSourceStyles(sourceRoot);
  const manifest = readManifest(slug, dir);
  const [rules, client] = await Promise.all([
    bundle(dir, entry(dir, ['logic.ts']), { sourceRoot }),
    bundle(dir, entry(dir, ['client.tsx', 'client.ts']), { page: true, sourceRoot }),
  ]);
  const logic = rules.script;
  if (Buffer.byteLength(logic) > LIMITS.logic)
    throw Error(`official/${slug}: logic is larger than ${LIMITS.logic / 1024} KB`);
  if (Buffer.byteLength(client.script + client.style) > LIMITS.client)
    throw Error(`official/${slug}: client is larger than ${LIMITS.client / 1024} KB`);
  if (Buffer.byteLength(logic + client.script + client.style) > LIMITS.code)
    throw Error(`official/${slug}: combined code is larger than ${LIMITS.code / 1024} KB`);
  const hash = createHash('sha256')
    .update([logic, client.script, client.style].join('\0'))
    .digest('hex');
  return { ...manifest, hash, logic, client };
}

const building = new Map();
export function bundleGame(slug, folder = path.join(ROOT, 'official', slug), options = {}) {
  const key = JSON.stringify([slug, path.resolve(folder), options.sourceRoot]);
  if (!building.has(key))
    building.set(
      key,
      buildGame(slug, folder, options).finally(() => building.delete(key)),
    );
  return building.get(key);
}

/** The catalogue Gaute imports: every game, deterministic for the same sources. */
export async function buildCatalogue({
  commit = 'local',
  localGames = listGames().map((slug) => ({ slug, folder: path.join(ROOT, 'official', slug) })),
  indexDir = path.join(ROOT, 'index'),
} = {}) {
  const { loadIndex, loadIndexedGame } = await import('./registry.mjs');
  const indexed = indexDir === null ? [] : loadIndex(indexDir);
  const sources = [...localGames, ...indexed];
  if (new Set(sources.map((game) => game.slug)).size !== sources.length)
    throw Error('Duplicate game slug in local games and index');
  const games = [];
  // Bounded concurrency keeps a large index from starting hundreds of builds or fetches.
  for (let i = 0; i < sources.length; i += 3)
    games.push(
      ...(await Promise.all(
        sources
          .slice(i, i + 3)
          .map((source) =>
            'folder' in source
              ? bundleGame(source.slug, source.folder)
              : loadIndexedGame(source.slug, source.entry),
          ),
      )),
    );
  return JSON.stringify({ format: 1, commit, games }, null, 2) + '\n';
}
