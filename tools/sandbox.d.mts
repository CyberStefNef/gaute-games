import type { RuntimeOutcome, RuntimeRequest } from '../sdk/runtime.ts';

export const SANDBOX_LIMITS: Record<string, number>;
export class GameFailure extends Error {}
export function runGame(logic: string, request: RuntimeRequest): Promise<RuntimeOutcome>;
export function describeGame(logic: string): Promise<{ actions: string[]; turn: boolean }>;
