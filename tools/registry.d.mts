import type { BundledGame } from './games.mjs';
export type IndexEntry = { repo: string; commit: string; path?: string };
export function parseIndexEntry(slug: string, value: unknown): Required<IndexEntry>;
export function loadIndex(dir: string): { slug: string; entry: Required<IndexEntry> }[];
export function loadIndexedGame(
  slug: string,
  entry: unknown,
  options?: { fetch?: typeof fetch },
): Promise<BundledGame>;
