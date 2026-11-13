// Messages between a sandboxed game page and the Gaute app. Both sides validate
// everything they receive: the app never trusts the game, and the game ignores
// anything malformed.
import type { Json, Mode, PlayerHandle } from './logic';

export const PROTOCOL = 1;
/** Largest message a game may send (actions carry at most 16 KB of payload). */
export const GAME_MESSAGE_LIMIT = 64 * 1024;
/**
 * Largest message the app sends. It carries a view (the server allows 256 KB each)
 * plus players, theme and escaping, and on phones arrives as one string.
 */
export const HOST_MESSAGE_LIMIT = 1024 * 1024;

export type Player = {
  handle: PlayerHandle;
  /** Null when this viewer may not see the name. */
  name: string | null;
  host: boolean;
  left: boolean;
  you: boolean;
};
export type Snapshot<View = Json> = {
  mode: Mode;
  status: 'playing' | 'ended';
  version: number;
  /** Who is looking: a player, or null for the shared screen on one phone. */
  you: PlayerHandle | null;
  players: Player[];
  /** The view for `you`, exactly as the game's `view` returned it. */
  view: View;
  result: Json;
  endedReason: string | null;
};
/** The app's design tokens, named as in shadcn/ui so its components match the app. */
export const THEME_COLORS = [
  'background',
  'foreground',
  'card',
  'cardForeground',
  'popover',
  'popoverForeground',
  'primary',
  'primaryForeground',
  'secondary',
  'secondaryForeground',
  'muted',
  'mutedForeground',
  'accent',
  'accentForeground',
  'destructive',
  'destructiveForeground',
  'border',
  'input',
  'ring',
] as const;
export type Theme = {
  dark: boolean;
  colors: Record<(typeof THEME_COLORS)[number], string>;
  /** Corner radius as a CSS length, like shadcn/ui's `--radius`. */
  radius: string;
};
export type Haptic = 'selection' | 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error';
/**
 * How Gaute, the app's companion who stands below every screen, reacts to a
 * moment in the game: a wave hello, a celebration, or an "oops" wobble.
 */
export type GauteReaction = 'wave' | 'celebrate' | 'oops';
const GAUTE_REACTIONS: readonly GauteReaction[] = ['wave', 'celebrate', 'oops'];
const HAPTICS: readonly Haptic[] = [
  'selection',
  'light',
  'medium',
  'heavy',
  'success',
  'warning',
  'error',
];

/** CSS custom properties for a theme: `--background`, `--card-foreground`, `--radius`, … */
export function themeVariables(theme: Theme): Record<string, string> {
  const variables: Record<string, string> = { '--radius': theme.radius };
  for (const name of THEME_COLORS)
    variables['--' + name.replace(/[A-Z]/g, (c) => '-' + c.toLowerCase())] = theme.colors[name];
  return variables;
}

export const HOST_ACTIONS = ['back', 'leave', 'end', 'replay', 'players'] as const;
export type HostAction = (typeof HOST_ACTIONS)[number];

export type HostMessage =
  | {
      gaute: typeof PROTOCOL;
      type: 'init';
      locale: string;
      theme: Theme;
      snapshot: Snapshot;
      controls?: HostAction[];
    }
  | { gaute: typeof PROTOCOL; type: 'update'; snapshot: Snapshot; controls?: HostAction[] }
  | { gaute: typeof PROTOCOL; type: 'theme'; theme: Theme }
  | { gaute: typeof PROTOCOL; type: 'result'; id: number; ok: boolean; reason?: string };

export type GameMessage =
  | { gaute: typeof PROTOCOL; type: 'host-action'; id: number; action: HostAction }
  | { gaute: typeof PROTOCOL; type: 'ready' }
  /** The first state has been drawn; the app reveals the page now. */
  | { gaute: typeof PROTOCOL; type: 'shown' }
  | { gaute: typeof PROTOCOL; type: 'act'; id: number; action: string; payload: Json }
  | { gaute: typeof PROTOCOL; type: 'haptic'; style: Haptic }
  | { gaute: typeof PROTOCOL; type: 'companion'; reaction: GauteReaction }
  /** The page threw before its first render; the app offers to try again. */
  | { gaute: typeof PROTOCOL; type: 'failed'; reason: string };

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function decode(raw: unknown, limit: number): Record<string, unknown> | null {
  if (typeof raw === 'string') {
    if (raw.length > limit) return null;
    try {
      raw = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return record(raw) && raw.gaute === PROTOCOL && typeof raw.type === 'string' ? raw : null;
}

/** Validates a message from a game. Returns null for anything unexpected. */
export function parseGameMessage(raw: unknown): GameMessage | null {
  const message = decode(raw, GAME_MESSAGE_LIMIT);
  if (!message) return null;
  if (message.type === 'host-action')
    return Number.isSafeInteger(message.id) && HOST_ACTIONS.includes(message.action as HostAction)
      ? {
          gaute: PROTOCOL,
          type: 'host-action',
          id: message.id as number,
          action: message.action as HostAction,
        }
      : null;
  if (message.type === 'ready') return { gaute: PROTOCOL, type: 'ready' };
  if (message.type === 'shown') return { gaute: PROTOCOL, type: 'shown' };
  if (message.type === 'failed')
    return {
      gaute: PROTOCOL,
      type: 'failed',
      reason: typeof message.reason === 'string' ? message.reason.slice(0, 200) : '',
    };
  if (message.type === 'companion')
    return GAUTE_REACTIONS.includes(message.reaction as GauteReaction)
      ? { gaute: PROTOCOL, type: 'companion', reaction: message.reaction as GauteReaction }
      : null;
  if (message.type === 'haptic')
    return HAPTICS.includes(message.style as Haptic)
      ? { gaute: PROTOCOL, type: 'haptic', style: message.style as Haptic }
      : null;
  if (
    message.type === 'act' &&
    Number.isSafeInteger(message.id) &&
    typeof message.action === 'string' &&
    /^[A-Za-z][\w-]{0,63}$/.test(message.action)
  ) {
    let payload: string | undefined;
    try {
      payload = JSON.stringify(message.payload ?? null);
    } catch {
      return null;
    }
    if (!payload || payload.length > 16 * 1024) return null;
    return {
      gaute: PROTOCOL,
      type: 'act',
      id: message.id as number,
      action: message.action,
      payload: JSON.parse(payload) as Json,
    };
  }
  return null;
}

/** Validates a message from the Gaute app. Returns null for anything unexpected. */
export function parseHostMessage(raw: unknown): HostMessage | null {
  const message = decode(raw, HOST_MESSAGE_LIMIT);
  if (!message) return null;
  switch (message.type) {
    case 'init':
      return typeof message.locale === 'string' &&
        record(message.theme) &&
        record(message.snapshot) &&
        (message.controls === undefined ||
          (Array.isArray(message.controls) &&
            message.controls.every((action) => HOST_ACTIONS.includes(action as HostAction))))
        ? (message as HostMessage)
        : null;
    case 'update':
      return record(message.snapshot) &&
        (message.controls === undefined ||
          (Array.isArray(message.controls) &&
            message.controls.every((action) => HOST_ACTIONS.includes(action as HostAction))))
        ? (message as HostMessage)
        : null;
    case 'theme':
      return record(message.theme) ? (message as HostMessage) : null;
    case 'result':
      return Number.isSafeInteger(message.id) && typeof message.ok === 'boolean'
        ? (message as HostMessage)
        : null;
    default:
      return null;
  }
}
