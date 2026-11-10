import type { Mode } from '../sdk/logic.ts';

export const ROOT: string;
export const LIMITS: { logic: number; client: number; maxPlayers: number };
export const MODES: Mode[];
export type Manifest = {
  slug: string;
  name: string;
  description: string;
  players: { min: number; max: number };
  modes: Mode[];
  /** Short steps shown on the game's page in Gaute. */
  howToPlay: string[];
  /** The game's icon.svg, checked by sdk/icon.ts. */
  icon: string;
  translations: Record<string, { name: string; description: string; howToPlay: string[] }>;
};
export type BundledGame = Manifest & {
  hash: string;
  logic: string;
  client: { script: string; style: string };
};
export function listGames(): string[];
export function readManifest(slug: string, dir?: string): Manifest;
export function bundleGame(
  slug: string,
  dir?: string,
  options?: { sourceRoot?: string },
): Promise<BundledGame>;
export function buildCatalogue(options?: {
  commit?: string;
  localGames?: { slug: string; folder: string }[];
  indexDir?: string | null;
}): Promise<string>;
export function validateManifest(slug: string, value: unknown, icon: string): Manifest;
