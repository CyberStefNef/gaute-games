import type { BundledGame } from './games.mjs';
export function createProject(slug: string, target?: string): string;
export function exportGame(folder: string, options?: { write?: boolean }): Promise<BundledGame>;
