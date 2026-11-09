// Finds, validates and bundles the games in games/. Used by the Vite plugin
// (simulator and catalogue), the tests and the CI publish step.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import { build } from 'vite-plus';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const LIMITS = { logic: 256 * 1024, client: 512 * 1024, maxPlayers: 16 };
export const MODES = ['phones', 'pass', 'shared'];

/** Game folders: everything in games/ except helpers such as games/_kit. */
export function listGames() {
  const dir = path.join(ROOT, 'games');
  return readdirSync(dir)
    .filter((name) => !name.startsWith('_') && !name.startsWith('.'))
    .filter((name) => statSync(path.join(dir, name)).isDirectory())
    .sort();
}

const text = (value, max) =>
  typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= max;

/** Reads games/<slug>/manifest.json and throws a precise message when it is invalid. */
export function readManifest(slug, dir = path.join(ROOT, 'games', slug)) {
  const file = path.join(dir, 'manifest.json');
  const value = JSON.parse(readFileSync(file, 'utf8'));
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
  for (const [locale, entry] of Object.entries(value.translations ?? {}))
    if (!/^[a-z]{2}$/.test(locale) || !text(entry?.name, 40) || !text(entry?.description, 200))
      problems.push(`translation "${locale}" needs a name (≤40) and description (≤200)`);
  if (problems.length) throw Error(`games/${slug}/manifest.json: ${problems.join('; ')}`);
  return {
    slug,
    name: value.name,
    description: value.description,
    players: { min, max },
    modes,
    translations: value.translations ?? {},
  };
}

/** The first of `names` (such as client.tsx or client.ts) that exists in `dir`. */
function entry(dir, names) {
  const name = names.find((candidate) => existsSync(path.join(dir, candidate)));
  if (!name) throw Error(`${path.relative(ROOT, dir)}: add ${names.join(' or ')}`);
  return name;
}

async function bundle(dir, entry, { page = false } = {}) {
  const result = await build({
    // Rooted in the game's folder, so Tailwind generates only the classes it uses.
    root: page ? dir : ROOT,
    configFile: false,
    logLevel: 'silent',
    // Game pages may use Tailwind CSS (`@import 'tailwindcss'`) and React.
    plugins: page ? [tailwindcss()] : [],
    define: { 'process.env.NODE_ENV': JSON.stringify('production') },
    build: {
      write: false,
      minify: true,
      target: 'es2020',
      cssCodeSplit: false,
      lib: {
        entry: path.join(dir, entry),
        formats: ['iife'],
        name: '__gauteGame',
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
export async function bundleGame(slug, folder = path.join(ROOT, 'games', slug)) {
  const dir = path.resolve(folder);
  const manifest = readManifest(slug, dir);
  const logic = (await bundle(dir, entry(dir, ['logic.ts']))).script;
  const client = await bundle(dir, entry(dir, ['client.tsx', 'client.ts']), { page: true });
  if (Buffer.byteLength(logic) > LIMITS.logic)
    throw Error(`games/${slug}: logic is larger than ${LIMITS.logic / 1024} KB`);
  if (Buffer.byteLength(client.script + client.style) > LIMITS.client)
    throw Error(`games/${slug}: client is larger than ${LIMITS.client / 1024} KB`);
  const hash = createHash('sha256')
    .update([logic, client.script, client.style].join('\0'))
    .digest('hex');
  return { ...manifest, hash, logic, client };
}

/** The catalogue Gaute imports: every game, deterministic for the same sources. */
export async function buildCatalogue({ commit = 'local' } = {}) {
  const games = [];
  for (const slug of listGames()) games.push(await bundleGame(slug));
  return JSON.stringify({ format: 1, commit, games }, null, 2) + '\n';
}
