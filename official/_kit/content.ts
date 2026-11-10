// Optional content-history protocol. The host restores only reviewed prompt IDs
// before exposing the first view. It never transfers answers or custom prompts.
import { fields, invalid, type Json } from '@gaute/games-sdk/logic';
import { shuffled } from './rules';

export type ContentHistory = { protocol: 1; restored: boolean; seen: string[] };
export const contentHistory = (): ContentHistory => ({ protocol: 1, restored: false, seen: [] });

export function restoreContent(content: ContentHistory, payload: Json) {
  const { seen } = fields(payload);
  if (
    content.restored ||
    !Array.isArray(seen) ||
    seen.length > 512 ||
    seen.some((id) => typeof id !== 'string' || !/^[a-z0-9-]{1,64}$/.test(id))
  )
    invalid('Content history is not available.');
  content.restored = true;
  content.seen = [...new Set(seen as string[])];
}

/** Unseen cards first, then least recently shown. No repeats until exhaustion. */
export function contentOrder(ids: string[], content: ContentHistory, random: () => number) {
  const visited = new Set(content.seen);
  const positions = new Map(ids.map((id, i) => [id, i]));
  const unseen = shuffled(ids.length, random).filter((i) => !visited.has(ids[i]));
  const seen = content.seen.flatMap((id) => {
    const index = positions.get(id);
    return index === undefined ? [] : [index];
  });
  return [...unseen, ...seen];
}

export function shown(content: ContentHistory, id: string) {
  content.seen = [...content.seen.filter((old) => old !== id), id].slice(-512);
}
