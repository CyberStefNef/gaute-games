// External sources use the installed SDK/React/Tailwind toolchain. No external
// Vite, PostCSS, Tailwind plugin/config, package imports or dependency installs.
import { createRequire } from 'node:module';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const inside = (root, file) => file === root || file.startsWith(root + path.sep);
const sdk = JSON.parse(readFileSync(path.join(ROOT, 'package.json'), 'utf8')).exports;
const stylePackage = (name) => name === 'tailwindcss' || name === '@gaute/games-sdk/tailwind.css';

function localPath(root, file, source) {
  const resolved = path.resolve(path.dirname(file), source);
  if (!inside(root, resolved)) throw Error(`Source path leaves the repository: ${source}`);
  return resolved;
}

export function sourceImports(root) {
  const inspectStyle = styleValidator(root);
  const plainPath = (source) => {
    if (/[?#]/.test(source))
      throw Error('Source imports must use plain paths without queries or fragments');
  };
  return {
    name: 'gaute-source-imports',
    enforce: 'pre',
    resolveId(source, importer) {
      if (importer && !inside(root, importer.split('?')[0])) return;
      plainPath(source);
      if (path.isAbsolute(source)) {
        if (!inside(root, source)) throw Error('Source imports must stay inside the repository');
        return;
      }
      if (source.startsWith('.')) {
        if (importer) localPath(root, importer, source);
        return;
      }
      if (source.startsWith('@gaute/games-sdk/')) {
        const file = sdk['./' + source.slice('@gaute/games-sdk/'.length)];
        if (typeof file !== 'string') throw Error(`Unknown SDK import: ${source}`);
        return path.resolve(ROOT, file);
      }
      if (/^(react|react-dom)(\/|$)/.test(source)) return require.resolve(source);
      if (source === 'tailwindcss') return require.resolve('tailwindcss/index.css');
      throw Error(
        `Unsupported game import: ${source}. Use relative source files or the Gaute SDK, React and Tailwind.`,
      );
    },
    transform(code, id) {
      if (!inside(root, id.split('?')[0])) return;
      plainPath(id);
      if (id.endsWith('.css')) {
        inspectStyle(id);
        return {
          code: code.replace(
            /(@(?:import|reference)\s+)(['"])(tailwindcss|@gaute\/games-sdk\/tailwind.css)\2/g,
            (_, directive, quote, name) =>
              directive +
              quote +
              (name === 'tailwindcss'
                ? require.resolve('tailwindcss/index.css')
                : path.join(ROOT, 'sdk/tailwind.css')) +
              quote,
          ),
          map: null,
        };
      }
      if (/import\.meta\s*\.\s*glob/.test(code))
        throw Error('Use explicit source imports instead of import.meta.glob');
      for (const match of code.matchAll(
        /new\s+URL\s*\(\s*['"]([^'"]+)['"]\s*,\s*import\.meta\.url/g,
      ))
        localPath(root, id, match[1]);
    },
  };
}

/** Inspect CSS imports before Tailwind can load a plugin or configuration. */
function styleValidator(root) {
  const checked = new Set();
  const decode = (text) =>
    text
      .replace(/\\([0-9a-f]{1,6})\s?|\\([^\r\n])/gi, (_, hex, char) =>
        hex ? String.fromCodePoint(Number.parseInt(hex, 16)) : char,
      )
      .replace(/\/\*[\s\S]*?\*\//g, '');
  const inspect = (file) => {
    if (checked.has(file)) return;
    checked.add(file);
    const css = decode(readFileSync(file, 'utf8'));
    if (/@(?:plugin|config)\b|\bsource\s*\(/i.test(css))
      throw Error('External CSS must use the standard Tailwind setup without @plugin or @config');
    for (const match of css.matchAll(/@source\b([^;{}]*)/gi)) {
      const source = /^\s*(?:not\s+)?['"]([^'"]+)['"]\s*$/.exec(match[1])?.[1];
      if (!source || /[*?![\]{}]/.test(source)) throw Error('@source must name a relative folder');
      localPath(root, file, source);
    }
    for (const match of css.matchAll(/@(import|reference)\b([^;{}]*)/gi)) {
      const spec = /^\s*(?:url\(\s*)?['"]([^'"]+)['"]/.exec(match[2])?.[1];
      if (!spec) throw Error('CSS imports must use quoted paths');
      if (stylePackage(spec)) continue;
      if (!spec.startsWith('.')) throw Error(`Unsupported CSS import: ${spec}`);
      inspect(localPath(root, file, spec));
    }
    for (const match of css.matchAll(/url\(\s*['"]?([^'"\s)]+)/gi)) {
      if (/^(data:|#)/.test(match[1])) continue;
      if (stylePackage(match[1])) continue;
      localPath(root, file, match[1]);
    }
  };
  return inspect;
}

export function validateSourceStyles(root) {
  const inspect = styleValidator(root);
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const file = path.join(dir, name);
      if (statSync(file).isDirectory()) walk(file);
      else if (name.endsWith('.css')) inspect(file);
    }
  };
  walk(root);
}
