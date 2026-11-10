// Rivalry: venue condition, barrel raids, breaches (takeover or demolition),
// repair, fortification and rebuilding. Couriers raid with kegs they carry, so
// brewing and delivery feed every attack. All options, costs and blocked reasons
// arrive in the view (`siege`, `defense`, `rebuilds`).
import type { BrewView, Courier, Incident, Intents, Ruin, SiegeOption, Venue } from './contract';
import type { FrontierAtlas } from './atlas';
import type { Owners } from './derived';
import { useGame, useT } from './game';
import { Icon, type IconName } from './pieces';
import {
  COURIER_NAMES,
  CostChips,
  CourierArt,
  OptionRow,
  Section,
  VENUE_NAMES,
  coords,
  type Run,
} from './panel';

export const hasCondition = (venue: Venue) =>
  venue.durability !== undefined && venue.maxDurability !== undefined && venue.maxDurability > 0;

export type Condition = 'sound' | 'damaged' | 'breached';
export function conditionOf(venue: Venue): Condition | null {
  if (!hasCondition(venue)) return null;
  return venue.durability! <= 0
    ? 'breached'
    : venue.durability! < venue.maxDurability!
      ? 'damaged'
      : 'sound';
}

const ACTION_ICON: Record<SiegeOption['action'], IconName> = {
  raid: 'keg',
  takeover: 'flag',
  demolish: 'ruin',
};
const INCIDENT_ICON: Record<Incident['kind'], IconName> = {
  raid: 'keg',
  takeover: 'flag',
  destroy: 'ruin',
  rebuild: 'hammer',
};

const kegs = (courier: Courier) => (courier.cargo ?? []).reduce((n, c) => n + c.amount, 0);

/** Rival venues and plots this courier can act against from where it stands. */
export function targetsOf(brew: BrewView, courier: Courier) {
  return [...(brew.siege ?? new Map<number, SiegeOption[]>())]
    .filter(([, options]) => options.some((o) => o.courier === courier.id))
    .map(([at]) => at);
}

export function ConditionMeter({ venue, defenders }: { venue: Venue; defenders?: number }) {
  const t = useT();
  if (!hasCondition(venue)) return null;
  const condition = conditionOf(venue)!;
  const value = Math.max(0, venue.durability!),
    max = venue.maxDurability!;
  return (
    <div className={`fr-condition fr-condition-${condition}`}>
      <div className="flex items-center justify-between gap-2 text-sm">
        <span className="inline-flex items-center gap-1.5 font-semibold">
          <Icon name="shield" className="size-4" />
          {condition === 'sound'
            ? t('Sound')
            : condition === 'damaged'
              ? t('Damaged')
              : t('Breached')}
        </span>
        <span className="text-muted-foreground tabular-nums">
          {t('{n} of {total}', { n: value, total: max })}
        </span>
      </div>
      <div
        className="fr-durability"
        role="meter"
        aria-label={t('Condition')}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
      >
        <span style={{ width: `${(value / max) * 100}%` }} />
      </div>
      <ul className="flex flex-wrap gap-1.5 text-xs">
        {venue.fortification ? <li className="fr-tag">{t('Barrel walls')}</li> : null}
        {defenders ? (
          <li className="fr-tag">
            {defenders === 1 ? t('1 crew on guard') : t('{n} crews on guard', { n: defenders })}
          </li>
        ) : null}
      </ul>
      {condition !== 'sound' && (
        <p className="text-xs text-muted-foreground">
          {condition === 'damaged'
            ? t('No income, fermentation or plot harvest until fully repaired.')
            : t('Open to takeover or demolition by a ready crew beside it.')}
        </p>
      )}
    </div>
  );
}

/** Pick which of your couriers acts, then raid, take over or demolish. */
export function SiegeSection({
  brew,
  owner,
  atlas,
  intents,
  turn,
  run,
  at,
  plot,
  attacker,
  onAttacker,
}: {
  brew: BrewView;
  owner: Owners;
  atlas: FrontierAtlas | null;
  intents: Intents;
  turn: boolean;
  run: Run;
  at: number;
  /** Raiding a plot destroys it instead of damaging a venue. */
  plot?: boolean;
  attacker: number | null;
  onAttacker: (id: number) => void;
}) {
  const t = useT();
  const { busy } = useGame();
  const options = brew.siege?.get(at) ?? [];
  const ids = [...new Set(options.map((o) => o.courier))];
  if (!ids.length) return null;
  const chosen = ids.includes(attacker ?? -1) ? attacker! : ids[0];
  const own = options.filter((o) => o.courier === chosen);
  return (
    <Section title={t('Rivalry')}>
      {ids.length > 1 && (
        <div className="fr-unit-strip" role="radiogroup" aria-label={t('Choose a crew')}>
          {ids.map((id) => {
            const c = brew.couriers.find((x) => x.id === id);
            if (!c) return null;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={id === chosen}
                className="fr-unit-chip"
                onClick={() => onAttacker(id)}
              >
                <span className="size-9">
                  <CourierArt kind={c.kind} identity={owner(c.owner)} atlas={atlas} />
                </span>
                <span className="text-xs font-semibold">{t.text(COURIER_NAMES[c.kind])}</span>
                <span className="text-[11px] text-muted-foreground tabular-nums">
                  {c.exhausted ? t('Spent') : t('{n} kegs', { n: kegs(c) })}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {own.map((option) => {
        const label =
          option.action === 'raid'
            ? plot
              ? t('Raid the plot')
              : t('Barrel raid')
            : option.action === 'takeover'
              ? t('Take over')
              : t('Demolish');
        const note = option.blocked
          ? t.text(option.blocked)
          : option.action === 'raid'
            ? plot
              ? t('Spends a keg. Destroys the plot and its patch.')
              : t('Spends a keg · {n} damage', { n: option.damage ?? 1 })
            : option.action === 'takeover'
              ? t('The venue and its plots become yours. Its tanks are lost.')
              : t('Leaves ruins. Its tanks and plots are lost.');
        const courier = brew.couriers.find((c) => c.id === chosen);
        return (
          <div key={option.action} className="fr-row">
            <div className="fr-row-main">
              <Icon name={ACTION_ICON[option.action]} />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{label}</span>
                <span className="block text-xs text-muted-foreground">
                  {courier && ids.length === 1 ? `${t.text(COURIER_NAMES[courier.kind])} · ` : ''}
                  {note}
                </span>
              </span>
            </div>
            <button
              type="button"
              className={`fr-buy ${option.action === 'raid' ? '' : 'fr-buy-danger'}`}
              aria-label={label}
              disabled={!turn || busy || Boolean(option.blocked)}
              onClick={() =>
                run(
                  option.action === 'raid'
                    ? intents.raid?.(chosen, at)
                    : intents.breach?.(chosen, at, option.action),
                )
              }
            >
              <CostChips cost={option.cost} brew={brew} />
            </button>
          </div>
        );
      })}
    </Section>
  );
}

/** Repair and fortify an own venue. */
export function DefenseSection({
  brew,
  intents,
  turn,
  run,
  venue,
}: {
  brew: BrewView;
  intents: Intents;
  turn: boolean;
  run: Run;
  venue: Venue;
}) {
  const t = useT();
  const options = brew.defense?.get(venue.at) ?? [];
  if (!options.length) return null;
  return (
    <Section title={t('Defence')}>
      {options.map((option) => (
        <OptionRow
          key={option.key}
          option={option}
          brew={brew}
          disabled={!turn}
          onRun={
            option.key === 'repair'
              ? () => run(intents.repair?.(venue.at))
              : option.key === 'fortify'
                ? () => run(intents.fortify?.(venue.at))
                : undefined
          }
          art={<Icon name={option.key === 'repair' ? 'hammer' : 'shield'} />}
        />
      ))}
    </Section>
  );
}

/** Rebuild a ruin with a ready crew on or beside it. */
export function RebuildSection({
  brew,
  intents,
  turn,
  run,
  ruin,
}: {
  brew: BrewView;
  intents: Intents;
  turn: boolean;
  run: Run;
  ruin: Ruin;
}) {
  const t = useT();
  const { busy } = useGame();
  const rows = (brew.rebuilds ?? []).filter((r) => r.at === ruin.at);
  if (!rows.length) return null;
  return (
    <Section title={t('Rebuild')}>
      {rows.map((row) => {
        const c = brew.couriers.find((x) => x.id === row.courier);
        return (
          <div key={row.courier} className="fr-row">
            <div className="fr-row-main">
              <Icon name="hammer" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{t('Rebuild as a level 1 venue')}</span>
                <span className="block text-xs text-muted-foreground">
                  {row.blocked
                    ? t.text(row.blocked)
                    : c
                      ? t('With your {courier}', { courier: t.text(COURIER_NAMES[c.kind]) })
                      : ''}
                </span>
              </span>
            </div>
            <button
              type="button"
              className="fr-buy"
              aria-label={t('Rebuild')}
              disabled={!turn || busy || Boolean(row.blocked)}
              onClick={() => run(intents.rebuild?.(row.courier, ruin.at))}
            >
              <CostChips cost={row.cost} brew={brew} />
            </button>
          </div>
        );
      })}
    </Section>
  );
}

/** Courier panel shortcut: rival venues and plots this courier can act against. */
export function TargetList({
  brew,
  courier,
  onInspect,
}: {
  brew: BrewView;
  courier: Courier;
  onInspect: (at: number) => void;
}) {
  const t = useT();
  const { name } = useGame();
  const targets = targetsOf(brew, courier);
  if (!targets.length) return null;
  return (
    <Section title={t('Rivals in reach')}>
      {targets.map((at) => {
        const venue = brew.venues.find((v) => v.at === at);
        const plot = brew.plots?.find((p) => p.at === at);
        const condition = venue && conditionOf(venue);
        return (
          <button
            key={at}
            type="button"
            className="fr-row fr-row-button"
            onClick={() => onInspect(at)}
          >
            <span className="fr-row-main">
              <Icon name="target" />
              <span className="min-w-0 flex-1 text-left">
                <span className="block font-medium">
                  {venue
                    ? t('{venue} · {player}', {
                        venue: t.text(VENUE_NAMES[venue.kind]),
                        player: venue.owner ? name(venue.owner) : t('Vacant'),
                      })
                    : t('{venue} · {player}', {
                        venue: t.text(plot?.kind ?? 'Plot'),
                        player: plot?.owner ? name(plot.owner) : t('Vacant'),
                      })}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {condition === 'breached'
                    ? t('Breached')
                    : venue
                      ? t('Condition {n} of {total}', {
                          n: venue.durability ?? 0,
                          total: venue.maxDurability ?? 0,
                        })
                      : t('Ingredient plot')}
                </span>
              </span>
              <Icon name="next" className="size-4" />
            </span>
          </button>
        );
      })}
    </Section>
  );
}

export function useIncidentText() {
  const t = useT();
  const { name, you } = useGame();
  return (incident: Incident, brew: BrewView) => {
    const actor = incident.actor === you ? t('You') : name(incident.actor);
    const target =
      incident.target === null ? '' : incident.target === you ? t('you') : name(incident.target);
    const where = t('tile {tile}', { tile: coords(brew, incident.at) });
    switch (incident.kind) {
      case 'raid':
        return t('{actor} raided {target} at {where}', { actor, target, where });
      case 'takeover':
        return t('{actor} took over a venue from {target} at {where}', { actor, target, where });
      case 'destroy':
        return target
          ? t('{actor} destroyed property of {target} at {where}', { actor, target, where })
          : t('{actor} destroyed property at {where}', { actor, where });
      case 'rebuild':
        return t('{actor} rebuilt the ruins at {where}', { actor, where });
    }
  };
}

export function IncidentFeed({
  brew,
  limit = 8,
  onShow,
}: {
  brew: BrewView;
  limit?: number;
  onShow?: (at: number) => void;
}) {
  const t = useT();
  const text = useIncidentText();
  const list = [...(brew.incidents ?? [])].reverse().slice(0, limit);
  if (!list.length) return null;
  return (
    <Section title={t('Town news')}>
      <ul className="flex flex-col gap-1">
        {list.map((incident, i) => (
          <li key={`${incident.round}-${incident.at}-${i}`} className="fr-incident">
            <Icon name={INCIDENT_ICON[incident.kind]} className="size-4" />
            <span className="min-w-0 flex-1 text-sm">
              {text(incident, brew)}
              <span className="text-muted-foreground">
                {' '}
                · {t('round {n}', { n: incident.round })}
              </span>
            </span>
            {onShow && (
              <button
                type="button"
                className="fr-icon-button"
                aria-label={t('Show on map')}
                onClick={() => onShow(incident.at)}
              >
                <Icon name="locate" className="size-4" />
              </button>
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}
