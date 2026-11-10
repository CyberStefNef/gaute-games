// The rules runtime that hosts a game's logic bundle. The same source runs in the
// server's QuickJS sandbox (own-phone play) and in a hidden sandboxed page on the
// device (pass-the-phone and shared-phone play), so a game behaves identically.
import type { Mode } from './logic';

/** Key of the shared-screen view in `views`. */
export { SHARED_VIEW, RUNTIME_PRELUDE } from './runtime-prelude.mjs';

export type RuntimeRequest =
  | { op: 'setup'; mode: Mode; players: string[]; locale: string; seed: number }
  | {
      op: 'action';
      mode: Mode;
      state: string;
      players: string[];
      /** Null on a shared phone, where nobody in particular acts. */
      playerId: string | null;
      action: string;
      payload: unknown;
      seed: number;
    }
  | { op: 'leave'; mode: Mode; state: string; players: string[]; playerId: string; seed: number };

export type RuntimeOutcome =
  | {
      ok: true;
      state: string;
      /** JSON views by player handle, plus SHARED_VIEW outside own-phone play. */
      views: Record<string, string>;
      /** Pass-the-phone: who should hold the phone next; null for the whole group. */
      turn?: string | null;
      /** JSON result when the game ended with this request. */
      ended?: string;
    }
  | { ok: true; unsupported: true }
  | { ok: false; reason: string };
