import type { Mode } from '../sdk/logic.ts';

export const ROOT: string;
export const LIMITS: { logic: number; client: number; maxPlayers: number };
export const MODES: Mode[];
export type Manifest = {
  slug: string;
  version: number;
  name: string;
  description: string;
  players: { min: number; max: number };
  modes: Mode[];
  translations: Record<string, { name: string; description: string }>;
};
export type BundledGame = Manifest & {
  hash: string;
  logic: string;
  client: { script: string; style: string };
};
export function listGames(): string[];
export function readManifest(slug: string, dir?: string): Manifest;
export function bundleGame(slug: string, dir?: string): Promise<BundledGame>;
export function buildCatalogue(options?: { commit?: string }): Promise<string>;
