// Extract only regular source files from a bounded GitHub tar archive. Symlinks,
// hard links and parent paths are never materialised in the build workspace.
import { gunzipSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const MAX_SOURCE = 32 * 1024 * 1024;
const field = (block, start, length) =>
  block
    .subarray(start, start + length)
    .toString('utf8')
    .split('\0')[0];

export function extractSource(compressed, target, commit) {
  const tar = gunzipSync(compressed, { maxOutputLength: MAX_SOURCE });
  let root;
  let files = 0;
  for (let at = 0; at + 512 <= tar.length;) {
    const header = tar.subarray(at, at + 512);
    if (header.every((byte) => byte === 0)) break;
    const checksum = Number.parseInt(field(header, 148, 8).trim(), 8);
    const actual = header.reduce((sum, byte, i) => sum + (i >= 148 && i < 156 ? 32 : byte), 0);
    if (actual !== checksum) throw Error('Invalid source archive checksum');
    const sizeText = field(header, 124, 12).trim();
    if (!/^[0-7]+$/.test(sizeText)) throw Error('Invalid source archive size');
    const size = Number.parseInt(sizeText, 8);
    const type = field(header, 156, 1);
    const prefix = field(header, 345, 155);
    const name = (prefix ? prefix + '/' : '') + field(header, 0, 100);
    const start = at + 512;
    at = start + Math.ceil(size / 512) * 512;
    if (at > tar.length) throw Error('Truncated source archive');
    // GitHub's global PAX record contains the commit comment, not source paths.
    if (type === 'g') continue;
    if (!['', '0', '5'].includes(type))
      throw Error('Source archive must contain regular files and directories only');
    const parts = name.replace(/\/$/, '').split('/');
    if (
      parts.some((part) => !part || part === '.' || part === '..' || part.includes('\\')) ||
      name.startsWith('/')
    )
      throw Error('Unsafe source archive path');
    if (!parts[0].endsWith('-' + commit))
      throw Error('Source archive does not match the pinned commit');
    root ??= parts[0];
    if (parts[0] !== root) throw Error('Source archive has multiple roots');
    const destination = path.join(target, ...parts.slice(1));
    if (type === '5') {
      mkdirSync(destination, { recursive: true });
      continue;
    }
    if (++files > 1024 || size > 2 * 1024 * 1024) throw Error('Source archive exceeds file limits');
    if (parts.includes('node_modules') || parts.includes('.git'))
      throw Error('Do not commit node_modules or .git in game sources');
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, tar.subarray(start, start + size), { flag: 'wx' });
  }
  if (!root || !files) throw Error('Empty source archive');
  return target;
}
