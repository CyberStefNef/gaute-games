// THE RULES ADAPTER. The only UI module that knows the rules' view shape and
// action names. Everything else reads `BrewView` and calls `Intents`.
//
// The rules' view is accepted structurally as `BrewWire`, so drift between
// model.view and the contract shows up here as a type error. Each intent calls
// one typed action; recipe and skill strings are narrowed by runtime guards.
//
// RIVALRY OPTIONS are derived here from the view until model.view supplies
// `siege`, `defense` and `rebuilds` itself. Costs and reasons mirror model.ts
// (raid/breach/repair/fortify/rebuild); the rules still validate every action.
import { useMemo } from 'react';
import { RECIPES, SKILLS, type Recipe, type Skill } from '../systems';
import {
  indexView,
  type BrewView,
  type BrewWire,
  type Cost,
  type Courier,
  type Intents,
  type Option,
  type SiegeOption,
} from './contract';
import { useGame, type View } from './game';
import { adjacent } from '../planet-rules';

const isRecipe = (value: string): value is Recipe => Object.hasOwn(RECIPES, value);
const isSkill = (value: string): value is Skill => Object.hasOwn(SKILLS, value);

const COST = { raid: 2, takeover: 8, demolish: 3, repair: 4, fortify: 6, rebuild: 10 } as const;
const SPENT = 'This crew has already travelled or acted this turn.';

function rivalry(view: View, you: string | null) {
  const coins = view.realm?.coins ?? 0;
  const priced = (cost: number, blocked: string | null) =>
    blocked ?? (coins < cost ? 'Not enough coins.' : null);
  const crew = view.couriers.filter((c) => c.owner === you);
  const near = (at: number) =>
    crew.filter((c) => c.at === at || adjacent(c.at, view.size).includes(at));
  const siege: { at: number; options: SiegeOption[] }[] = [];
  const defense: { at: number; options: Option[] }[] = [];
  const rebuilds: { at: number; courier: number; cost: Cost; blocked: string | null }[] = [];
  if (!you || view.phase !== 'play') return { siege, defense, rebuilds };
  for (const venue of view.venues) {
    if (venue.owner === you) {
      const options: Option[] = [];
      if (venue.durability < venue.maxDurability)
        options.push({
          key: 'repair',
          title: 'Repair',
          detail: 'Restore 4 condition, once a round.',
          cost: { coins: COST.repair },
          blocked: priced(
            COST.repair,
            venue.canRepair ? null : 'This venue was already repaired this round.',
          ),
        });
      options.push({
        key: 'fortify',
        title: 'Fortify',
        detail: 'Barrel walls add 4 to maximum condition.',
        cost: { coins: COST.fortify },
        blocked: priced(COST.fortify, venue.fortified ? 'This venue is already reinforced.' : null),
      });
      defense.push({ at: venue.at, options });
      continue;
    }
    if (venue.owner === null) continue;
    const defenders = Math.min(
      2,
      view.couriers.filter((c) => c.owner === venue.owner && !c.exhausted && c.at === venue.at)
        .length,
    );
    const options = near(venue.at).flatMap((c): SiegeOption[] => {
      const spent = c.exhausted ? SPENT : null;
      if (venue.durability > 0)
        return [
          {
            courier: c.id,
            action: 'raid',
            cost: { coins: COST.raid },
            damage: Math.max(1, c.strength - defenders),
            blocked: priced(
              COST.raid,
              spent ?? (c.loaded ? null : 'Load a keg to supply this raid.'),
            ),
          },
        ];
      return (['takeover', 'demolish'] as const).map((action) => ({
        courier: c.id,
        action,
        cost: { coins: COST[action] },
        blocked: priced(COST[action], spent),
      }));
    });
    if (options.length) siege.push({ at: venue.at, options });
  }
  for (const plot of view.plots ?? []) {
    if (plot.owner === you || view.venues.some((v) => v.at === plot.at)) continue;
    const options = near(plot.at).map((c): SiegeOption => ({
      courier: c.id,
      action: 'raid',
      cost: { coins: COST.raid },
      blocked: priced(
        COST.raid,
        c.exhausted ? SPENT : c.loaded ? null : 'Load a keg to supply this raid.',
      ),
    }));
    if (options.length) siege.push({ at: plot.at, options });
  }
  for (const ruin of view.ruins ?? [])
    for (const c of near(ruin.at))
      rebuilds.push({
        at: ruin.at,
        courier: c.id,
        cost: { coins: COST.rebuild },
        blocked: priced(COST.rebuild, c.exhausted ? SPENT : null),
      });
  return { siege, defense, rebuilds };
}

export function toBrew(view: View, you: string | null): BrewView {
  const wire: BrewWire = view;
  return indexView({
    ...wire,
    ...rivalry(view, you),
    venues: view.venues.map((venue) => {
      // The rules report built improvements as the specialty text.
      const built = (venue.specialty ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
      return {
        ...venue,
        improvements: built.filter((item) => item !== 'fortified'),
        fortification: venue.fortified ? 1 : 0,
        specialty: undefined,
      };
    }),
  });
}

/** Couriers that can still act; the rules spend readiness on travel or a raid. */
export const canAct = (courier: Courier) => courier.ready && !courier.exhausted;

export function useIntents(): Intents {
  const { act, view } = useGame();
  return useMemo(() => {
    const ok = async (result: Promise<{ ok: boolean }>) => (await result).ok;
    return {
      endTurn: () => ok(act('endTurn', { round: view.round })),
      travel: (courier, at) => ok(act('travel', { courier, at })),
      gather: (at) => ok(act('gather', { at })),
      produce: (venue, option) => ok(act('produce', { venue, option })),
      upgrade: (venue, option) => ok(act('upgrade', { venue, option })),
      open: (courier) => ok(act('open', { courier })),
      learn: (skill) => (isSkill(skill) ? ok(act('learn', { skill })) : Promise.resolve(false)),
      accept: (contract) => ok(act('accept', { contract })),
      load: (courier, venue, recipe, amount) =>
        isRecipe(recipe)
          ? ok(act('load', { courier, venue, recipe, amount }))
          : Promise.resolve(false),
      deliver: (courier, contract) => ok(act('deliver', { courier, contract })),
      raid: (courier, at) => ok(act('raid', { courier, at })),
      breach: (courier, at, mode) => ok(act('breach', { courier, at, mode })),
      repair: (venue) => ok(act('repair', { venue })),
      fortify: (venue) => ok(act('fortify', { venue })),
      rebuild: (courier, at) => ok(act('rebuild', { courier, at })),
    } satisfies Intents;
  }, [act, view.round]);
}

/** Map sizes the rules accept for `start`. */
export const MAP_SIZES = [8, 12, 16, 24] as const;
export function useStart() {
  const { act } = useGame();
  return (size: number) => act('start', { size });
}
