// One typed binding for every Brewtown UI module.
import { gameClient, useStrings } from '@gaute/games-sdk/react';
import type { ViewOf } from '@gaute/games-sdk/logic';
import type { game } from '../logic';
import { strings } from '../strings';

export const { mountGame, useGame } = gameClient<typeof game>();
export const useT = () => useStrings(strings);
export type T = ReturnType<typeof useT>;
/** The rules' view; only wire.ts reads it. */
export type View = ViewOf<typeof game>;
