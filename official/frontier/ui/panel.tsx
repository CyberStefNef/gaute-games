// The contextual panel under the map: what the selection is, what it can do now,
// and why an option is unavailable. Every control maps to a provided intent and
// a rules-supplied option; no list of options is hard-coded here.
import { useState, type ReactNode } from 'react';
import { Button } from '../../_kit/ui';
import type { FrontierAtlas } from './atlas';
import {
  INGREDIENTS,
  type Batch,
  type BrewView,
  type Contract,
  type Cost,
  type Courier,
  type CourierKind,
  type Intents,
  type Option,
  type Venue,
  type VenueKind,
} from './contract';
import { groundName, type Identity, type Owners } from './derived';
import { useGame, useT } from './game';
import {
  ConditionMeter,
  DefenseSection,
  RebuildSection,
  SiegeSection,
  TargetList,
} from './rivalry';
import {
  CourierPiece,
  GroundTile,
  Icon,
  IngredientToken,
  PlotPiece,
  RuinPiece,
  Swatch,
  VenuePiece,
  type IconName,
} from './pieces';

export type Run = (attempt: Promise<boolean> | undefined) => Promise<boolean>;

export type Common = {
  brew: BrewView;
  owner: Owners;
  atlas: FrontierAtlas | null;
  intents: Intents;
  turn: boolean;
  run: Run;
};

/** Which of your couriers a raid, breach or rebuild uses. */
export type Attacker = { attacker: number | null; onAttacker: (id: number) => void };

export const coords = (_brew: BrewView, at: number) => String(at + 1);

export const VENUE_NAMES: Record<VenueKind, string> = {
  brewhouse: 'Brewhouse',
  taproom: 'Taproom',
  pub: 'Pub',
  festival: 'Festival ground',
};
export const COURIER_NAMES: Record<CourierKind, string> = {
  walker: 'Walking courier',
  bike: 'Delivery bike',
  cargo: 'Cargo cart',
};
const STAGES = ['ferment', 'mature', 'ready'] as const;

/** The rules describe a gather gain as "+2 barley"; show it translated. */
export function useGain() {
  const t = useT();
  return (gain: string) => {
    const match = /^\+(\d+) (\w+)$/.exec(gain);
    return match ? t('+{n} {thing}', { n: match[1], thing: t.text(match[2]) }) : t.text(gain);
  };
}

// ——— Building blocks ———

export function Stat({ icon, value, label }: { icon: IconName; value: ReactNode; label: string }) {
  return (
    <span className="fr-stat" title={label}>
      <Icon name={icon} className="size-4" />
      <span className="tabular-nums">{value}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function Header({
  art,
  title,
  subtitle,
  owner,
  onClose,
}: {
  art: ReactNode;
  title: string;
  subtitle?: ReactNode;
  owner?: Identity;
  onClose?: () => void;
}) {
  const t = useT();
  return (
    <div className="flex items-center gap-3">
      <div
        className="fr-portrait"
        style={owner && owner.index >= 0 ? { borderColor: owner.color } : undefined}
      >
        {art}
      </div>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-[17px] leading-tight font-bold">{title}</h2>
        {subtitle ? <p className="truncate text-sm text-muted-foreground">{subtitle}</p> : null}
      </div>
      {onClose && (
        <button type="button" className="fr-icon-button" aria-label={t('Close')} onClick={onClose}>
          <Icon name="close" />
        </button>
      )}
    </div>
  );
}

export function Meter({ value, max, label }: { value: number; max: number; label: string }) {
  return (
    <div
      className="fr-meter"
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      {Array.from({ length: Math.min(max, 12) }, (_, i) => (
        <span key={i} className={i < value ? 'on' : ''} />
      ))}
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-1.5">
      <h3 className="fr-section">{title}</h3>
      {children}
    </section>
  );
}

const Mini = ({ children }: { children: ReactNode }) => (
  <svg aria-hidden="true" viewBox="-10 -10 20 20" className="size-4 shrink-0">
    {children}
  </svg>
);

/** A cost as compact chips; amounts the realm cannot cover are marked. */
export function CostChips({ cost, brew }: { cost: Cost; brew: BrewView }) {
  const t = useT();
  const realm = brew.realm;
  const short = (have: number | undefined, need: number) => realm != null && (have ?? 0) < need;
  return (
    <span className="fr-cost">
      {cost.coins ? (
        <span className={short(realm?.coins, cost.coins) ? 'fr-short' : ''}>
          <Icon name="coins" className="size-3.5" />
          {cost.coins}
          <span className="sr-only">{t('coins')}</span>
        </span>
      ) : null}
      {cost.knowledge ? (
        <span className={short(realm?.knowledge, cost.knowledge) ? 'fr-short' : ''}>
          <Icon name="skill" className="size-3.5" />
          {cost.knowledge}
          <span className="sr-only">{t('knowledge')}</span>
        </span>
      ) : null}
      {INGREDIENTS.map((kind) => {
        const need = cost.ingredients?.[kind];
        return need ? (
          <span key={kind} className={short(realm?.stock?.[kind], need) ? 'fr-short' : ''}>
            <Mini>
              <IngredientToken x={0} y={0} kind={kind} />
            </Mini>
            {need}
            <span className="sr-only">{t.text(kind)}</span>
          </span>
        ) : null;
      })}
    </span>
  );
}

/** One rules-supplied option: title, detail or blocked reason, cost and a button. */
export function OptionRow({
  option,
  brew,
  art,
  disabled,
  onRun,
}: {
  option: Option;
  brew: BrewView;
  art?: ReactNode;
  disabled: boolean;
  onRun?: () => void;
}) {
  const t = useT();
  const { busy } = useGame();
  const id = `fr-opt-${option.key.replace(/\W/g, '-')}`;
  return (
    <div className="fr-row">
      <div className="fr-row-main">
        {art}
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{t.text(option.title)}</span>
          <span id={id} className="block text-xs text-muted-foreground">
            {option.blocked ? t.text(option.blocked) : null}
            {option.turns
              ? `${option.blocked ? ' · ' : ''}${t('{n} turns', { n: option.turns })}`
              : ''}
          </span>
        </span>
      </div>
      {onRun && (
        <button
          type="button"
          className="fr-buy"
          aria-describedby={id}
          aria-label={t.text(option.title)}
          disabled={Boolean(option.blocked) || disabled || busy}
          onClick={onRun}
        >
          <CostChips cost={option.cost} brew={brew} />
          {!option.cost.coins && !option.cost.knowledge && !option.cost.ingredients ? (
            <Icon name="check" className="size-4" />
          ) : null}
        </button>
      )}
    </div>
  );
}

export function CourierArt({
  kind,
  identity,
  atlas,
}: {
  kind: CourierKind;
  identity: Identity;
  atlas: FrontierAtlas | null;
}) {
  return (
    <Swatch>
      <CourierPiece
        kind={kind}
        cx={0}
        cy={10}
        color={identity.color}
        emblem={identity.emblem}
        atlas={atlas}
      />
    </Swatch>
  );
}

function VenueArt({
  venue,
  identity,
  brew,
  atlas,
}: {
  venue: Venue;
  identity: Identity;
  brew: BrewView;
  atlas: FrontierAtlas | null;
}) {
  return (
    <Swatch>
      <TileArt brew={brew} at={venue.at} atlas={atlas} />
      <VenuePiece
        kind={venue.kind}
        cx={0}
        cy={0}
        level={venue.level}
        color={identity.color}
        atlas={atlas}
      />
    </Swatch>
  );
}

function TileArt({ brew, at, atlas }: { brew: BrewView; at: number; atlas: FrontierAtlas | null }) {
  const ground = brew.ground[at];
  if (ground < 0) return null;
  return (
    <GroundTile
      tile={{
        at,
        ground,
        cx: 0,
        cy: 0,
        shore: [false, false, false, false, false, false],
        fog: false,
        tint: null,
      }}
      atlas={atlas}
    />
  );
}

function BatchRow({ batch }: { batch: Batch }) {
  const t = useT();
  const stage = STAGES.indexOf(batch.stage);
  return (
    <div className="fr-batch">
      <div className="flex items-baseline justify-between gap-2">
        <span className="inline-flex min-w-0 items-center gap-1.5 font-medium">
          <Icon name="keg" className="size-4" />
          <span className="truncate">{t.text(batch.recipe)}</span>
          <span className="text-muted-foreground tabular-nums">× {batch.amount}</span>
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">
          {batch.stage === 'ready'
            ? t('Ready to load')
            : batch.turnsLeft === 1
              ? t('1 turn left')
              : t('{n} turns left', { n: batch.turnsLeft })}
        </span>
      </div>
      <ol className="fr-stages" aria-label={t('Batch progress')}>
        {STAGES.map((name, i) => (
          <li
            key={name}
            className={i < stage ? 'done' : i === stage ? 'now' : ''}
            aria-current={i === stage ? 'step' : undefined}
          >
            {t.text(name)}
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ContractRow({
  contract,
  brew,
  intents,
  turn,
  run,
  onShow,
}: {
  contract: Contract;
  brew: BrewView;
  intents: Intents;
  turn: boolean;
  run: Run;
  onShow?: (at: number) => void;
}) {
  const t = useT();
  const { name, busy, you } = useGame();
  const due = contract.dueRound - brew.round;
  return (
    <div className="fr-contract">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold">{t.text(contract.client)}</p>
          <p className="text-sm">
            {t('{n} × {recipe}', { n: contract.amount, recipe: t.text(contract.recipe) })}
          </p>
          <p className="text-xs text-muted-foreground">
            {contract.state === 'accepted'
              ? contract.holder === you
                ? t('Yours · due in {n} rounds', { n: Math.max(0, due) })
                : t('Taken by {player}', { player: contract.holder ? name(contract.holder) : '' })
              : contract.state === 'delivered'
                ? t('Delivered')
                : contract.state === 'expired'
                  ? t('Expired')
                  : t('Due by round {n}', { n: contract.dueRound })}
          </p>
        </div>
        <span className="fr-reward">
          {contract.reward.coins ? (
            <span>
              <Icon name="coins" className="size-3.5" />
              {contract.reward.coins}
            </span>
          ) : null}
          {contract.reward.reputation ? (
            <span>
              <Icon name="star" className="size-3.5" />
              {contract.reward.reputation}
            </span>
          ) : null}
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {onShow && (
          <button type="button" className="fr-chip-button" onClick={() => onShow(contract.venue)}>
            <Icon name="locate" className="size-4" />
            {t('Show on map')}
          </button>
        )}
        {contract.state === 'open' && intents.accept && you && (
          <button
            type="button"
            className="fr-chip-button fr-chip-primary"
            disabled={!turn || busy || Boolean(contract.blocked)}
            onClick={() => run(intents.accept?.(contract.id))}
          >
            <Icon name="contract" className="size-4" />
            {t('Accept')}
          </button>
        )}
      </div>
      {contract.state === 'open' && contract.blocked && (
        <p className="text-xs text-muted-foreground">{t.text(contract.blocked)}</p>
      )}
    </div>
  );
}

// ——— Courier ———

function LoadRow({
  batch,
  free,
  onLoad,
  disabled,
}: {
  batch: Batch;
  free: number;
  onLoad: (amount: number) => void;
  disabled: boolean;
}) {
  const t = useT();
  const most = Math.max(0, Math.min(batch.amount, free));
  const [amount, setAmount] = useState(most);
  const value = Math.min(amount, most);
  return (
    <div className="fr-row">
      <div className="fr-row-main">
        <Icon name="keg" />
        <span className="min-w-0 flex-1">
          <span className="block font-medium">{t.text(batch.recipe)}</span>
          <span className="block text-xs text-muted-foreground">
            {t('{n} ready', { n: batch.amount })}
          </span>
        </span>
      </div>
      <div className="fr-stepper" role="group" aria-label={t('Amount to load')}>
        <button
          type="button"
          aria-label={t('Load fewer')}
          disabled={value <= 1}
          onClick={() => setAmount(value - 1)}
        >
          <Icon name="minus" className="size-4" />
        </button>
        <output className="tabular-nums" aria-live="polite">
          {value}
        </output>
        <button
          type="button"
          aria-label={t('Load more')}
          disabled={value >= most}
          onClick={() => setAmount(value + 1)}
        >
          <Icon name="plus" className="size-4" />
        </button>
      </div>
      <button
        type="button"
        className="fr-buy"
        disabled={disabled || value < 1}
        onClick={() => onLoad(value)}
      >
        {t('Load')}
      </button>
    </div>
  );
}

export function CourierPanel({
  brew,
  owner,
  atlas,
  intents,
  turn,
  run,
  courier,
  pending,
  onCancel,
  onConfirm,
  onClose,
  onInspect,
}: Common & {
  courier: Courier;
  pending: number | null;
  onCancel: () => void;
  onConfirm: () => void;
  onClose: () => void;
  /** Inspect a rival target or ruin with this courier as the acting crew. */
  onInspect: (at: number) => void;
}) {
  const t = useT();
  const { you, name, busy } = useGame();
  const mine = courier.owner === you;
  const reach = brew.reach.get(courier.id);
  const carried = (courier.cargo ?? []).reduce((sum, item) => sum + item.amount, 0);
  const free = courier.capacity !== undefined ? courier.capacity - carried : 0;
  const venue = brew.venues.find((v) => v.at === courier.at);
  const ready =
    mine && venue?.owner === you
      ? (brew.batches ?? []).filter((batch) => batch.venue === venue.at && batch.stage === 'ready')
      : [];
  const deliveries = mine
    ? (brew.contracts ?? []).filter(
        (c) =>
          c.state === 'accepted' &&
          c.holder === you &&
          c.venue === courier.at &&
          courier.cargo?.some((item) => item.recipe === c.recipe),
      )
    : [];
  const path = pending !== null ? reach?.paths?.[pending] : undefined;
  const status = !mine
    ? name(courier.owner)
    : !turn
      ? t('Ready next turn')
      : courier.ready && !courier.exhausted
        ? t('Ready to travel or raid')
        : t('Done for this turn');

  return (
    <div className="flex flex-col gap-3">
      <Header
        art={<CourierArt kind={courier.kind} identity={owner(courier.owner)} atlas={atlas} />}
        title={t.text(COURIER_NAMES[courier.kind])}
        subtitle={status}
        owner={owner(courier.owner)}
        onClose={onClose}
      />
      {(courier.strength !== undefined || (!mine && courier.loaded)) && (
        <div className="flex flex-wrap gap-1.5">
          {courier.strength !== undefined && (
            <Stat icon="target" value={courier.strength} label={t('Raid strength')} />
          )}
          {!mine && courier.loaded && (
            <Stat icon="keg" value={t('Kegs')} label={t('Carrying kegs')} />
          )}
        </div>
      )}
      {mine && courier.capacity !== undefined && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold">{t('Cargo')}</span>
            <span className="text-muted-foreground tabular-nums">
              {t('{n} of {total}', { n: carried, total: courier.capacity })}
            </span>
          </div>
          <Meter value={carried} max={courier.capacity} label={t('Cargo')} />
          {courier.cargo?.length ? (
            <ul className="flex flex-wrap gap-1.5 text-xs">
              {courier.cargo.map((item) => (
                <li key={item.recipe} className="fr-tag">
                  {t('{n} × {recipe}', { n: item.amount, recipe: t.text(item.recipe) })}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      )}

      {pending !== null ? (
        <>
          <p className="text-sm">
            {path && path.length === 1
              ? t('{tile} · 1 district', {
                  tile: coords(brew, pending),
                })
              : path
                ? t('{tile} · {n} districts', {
                    n: Math.max(1, path.length),
                    tile: coords(brew, pending),
                  })
                : t('{tile}', {
                    tile: coords(brew, pending),
                  })}
          </p>
          <div className="flex gap-2">
            <Button className="flex-1" onClick={onCancel}>
              {t('Cancel')}
            </Button>
            <Button primary className="flex-[2]" disabled={!turn || busy} onClick={onConfirm}>
              <span className="inline-flex items-center gap-2">
                <Icon name="route" />
                {t('Travel here')}
              </span>
            </Button>
          </div>
        </>
      ) : null}

      {mine && turn && pending === null && (
        <>
          <TargetList brew={brew} courier={courier} onInspect={onInspect} />
          {(brew.rebuilds ?? [])
            .filter((row) => row.courier === courier.id)
            .map((row) => (
              <button
                key={row.at}
                type="button"
                className="fr-row fr-row-button"
                onClick={() => onInspect(row.at)}
              >
                <span className="fr-row-main">
                  <Icon name="hammer" />
                  <span className="min-w-0 flex-1 text-left font-medium">
                    {t('Ruins at {tile}', { tile: coords(brew, row.at) })}
                  </span>
                  <Icon name="next" className="size-4" />
                </span>
              </button>
            ))}
        </>
      )}

      {mine && courier.canOpen && intents.open && pending === null && (
        <Button primary disabled={!turn || busy} onClick={() => run(intents.open?.(courier.id))}>
          <span className="inline-flex items-center gap-2">
            <Icon name="open" />
            {t('Open this venue')}
          </span>
        </Button>
      )}

      {ready.length > 0 && intents.load && courier.capacity !== undefined && venue && (
        <Section title={t('Load from this brewhouse')}>
          {free <= 0 && (
            <p className="text-xs text-muted-foreground">{t('The courier is full.')}</p>
          )}
          {ready.map((batch) => (
            <LoadRow
              key={batch.id}
              batch={batch}
              free={free}
              disabled={!turn || busy || free <= 0}
              onLoad={(amount) => run(intents.load?.(courier.id, venue.at, batch.recipe, amount))}
            />
          ))}
        </Section>
      )}

      {deliveries.length > 0 && intents.deliver && (
        <Section title={t('Deliver here')}>
          {deliveries.map((contract) => (
            <div key={contract.id} className="fr-row">
              <div className="fr-row-main">
                <Icon name="contract" />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{t.text(contract.client)}</span>
                  <span className="block text-xs text-muted-foreground">
                    {contract.blocked
                      ? t.text(contract.blocked)
                      : t('{n} × {recipe}', {
                          n: contract.amount,
                          recipe: t.text(contract.recipe),
                        })}
                  </span>
                </span>
              </div>
              <button
                type="button"
                className="fr-buy"
                disabled={!turn || busy || Boolean(contract.blocked)}
                onClick={() => run(intents.deliver?.(courier.id, contract.id))}
              >
                {t('Deliver')}
              </button>
            </div>
          ))}
        </Section>
      )}
    </div>
  );
}

// ——— Venue ———

export function VenuePanel({
  brew,
  owner,
  atlas,
  intents,
  turn,
  run,
  venue,
  onClose,
  onSelectTile,
  attacker,
  onAttacker,
}: Common & Attacker & { venue: Venue; onClose: () => void; onSelectTile: (at: number) => void }) {
  const t = useT();
  const { you, name } = useGame();
  const gain = useGain();
  const mine = venue.owner === you;
  const identity = owner(venue.owner);
  const title = t('{venue} · level {n}', {
    venue: t.text(VENUE_NAMES[venue.kind]),
    n: venue.level,
  });
  const posted = (brew.contracts ?? []).filter(
    (c) => c.venue === venue.at && c.state !== 'expired',
  );
  const contracts = posted.length > 0 && (
    <Section title={t('Orders posted here')}>
      {posted.map((contract) => (
        <ContractRow
          key={contract.id}
          contract={contract}
          brew={brew}
          intents={intents}
          turn={turn}
          run={run}
        />
      ))}
    </Section>
  );
  const art = <VenueArt venue={venue} identity={identity} brew={brew} atlas={atlas} />;
  // Ready crews standing in a venue blunt raids (the rules count up to two).
  const defenders = Math.min(
    2,
    brew.couriers.filter((c) => c.owner === venue.owner && c.at === venue.at && !c.exhausted)
      .length,
  );
  if (!mine)
    return (
      <div className="flex flex-col gap-3">
        <Header
          art={art}
          title={title}
          subtitle={venue.owner ? name(venue.owner) : t('Vacant')}
          owner={identity}
          onClose={onClose}
        />
        {venue.owner !== null && (
          <>
            <ConditionMeter venue={venue} defenders={defenders} />
            {you && (
              <SiegeSection
                brew={brew}
                owner={owner}
                atlas={atlas}
                intents={intents}
                turn={turn}
                run={run}
                at={venue.at}
                attacker={attacker}
                onAttacker={onAttacker}
              />
            )}
          </>
        )}
        {contracts}
      </div>
    );

  const batches = (brew.batches ?? []).filter((batch) => batch.venue === venue.at);
  const options = brew.production.get(venue.at) ?? [];
  const brews = options.filter((o) => o.key.startsWith('brew:'));
  const hires = options.filter((o) => o.key.startsWith('hire:'));
  const others = options.filter((o) => !o.key.startsWith('brew:') && !o.key.startsWith('hire:'));
  const upgrades = brew.upgrades.get(venue.at) ?? [];
  const gathers = [...brew.gathering.values()].filter((g) => g.venue === venue.at);
  const produce = (option: Option) =>
    intents.produce ? () => run(intents.produce?.(venue.at, option.key)) : undefined;

  return (
    <div className="flex flex-col gap-3">
      <Header
        art={art}
        title={title}
        subtitle={
          venue.income !== undefined
            ? t('+{n} coins each turn', { n: venue.income })
            : name(venue.owner ?? '')
        }
        owner={identity}
        onClose={onClose}
      />
      <ConditionMeter venue={venue} defenders={defenders} />
      <DefenseSection brew={brew} intents={intents} turn={turn} run={run} venue={venue} />
      {(venue.growth || venue.specialty) && (
        <div className="fr-growth">
          {venue.specialty && (
            <p className="inline-flex items-center gap-1.5 text-sm font-semibold">
              <Icon name="star" className="size-4" />
              {t.text(venue.specialty)}
            </p>
          )}
          {venue.growth && (
            <>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="inline-flex items-center gap-1.5 font-semibold">
                  <Icon name="growth" className="size-4" />
                  {t('Growth')}
                </span>
                <span className="text-muted-foreground tabular-nums">
                  {t('{n} of {total}', { n: venue.growth.value, total: venue.growth.max })}
                </span>
              </div>
              <Meter value={venue.growth.value} max={venue.growth.max} label={t('Growth')} />
            </>
          )}
        </div>
      )}

      {batches.length > 0 && (
        <Section title={t('In the tanks')}>
          {batches.map((batch) => (
            <BatchRow key={batch.id} batch={batch} />
          ))}
        </Section>
      )}
      {brews.length > 0 && (
        <Section title={t('Brew')}>
          {brews.map((option) => (
            <OptionRow
              key={option.key}
              option={option}
              brew={brew}
              disabled={!turn}
              onRun={produce(option)}
              art={<Icon name="keg" />}
            />
          ))}
        </Section>
      )}
      {hires.length > 0 && (
        <Section title={t('Hire couriers')}>
          {hires.map((option) => {
            const kind = option.key.slice(5);
            return (
              <OptionRow
                key={option.key}
                option={option}
                brew={brew}
                disabled={!turn}
                onRun={produce(option)}
                art={
                  kind === 'walker' || kind === 'bike' || kind === 'cargo' ? (
                    <span className="size-9">
                      <CourierArt kind={kind} identity={identity} atlas={atlas} />
                    </span>
                  ) : (
                    <Icon name="courier" />
                  )
                }
              />
            );
          })}
        </Section>
      )}
      {others.length > 0 && (
        <Section title={t('Make')}>
          {others.map((option) => (
            <OptionRow
              key={option.key}
              option={option}
              brew={brew}
              disabled={!turn}
              onRun={produce(option)}
            />
          ))}
        </Section>
      )}
      {gathers.length > 0 && (
        <Section title={t('Gather nearby')}>
          {gathers.map((g) => {
            const kind = brew.ingredients.find((item) => item.at === g.at)?.kind ?? 'barley';
            return (
              <div key={g.at} className="fr-row">
                <button
                  type="button"
                  className="fr-row-main"
                  onClick={() => onSelectTile(g.at)}
                  aria-label={t('Show {thing} at {tile}', {
                    thing: t.text(kind),
                    tile: coords(brew, g.at),
                  })}
                >
                  <svg aria-hidden="true" viewBox="-10 -10 20 20" className="size-6 shrink-0">
                    <IngredientToken x={0} y={0} kind={kind} />
                  </svg>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block font-medium">{t.text(kind)}</span>
                    <span className="block text-xs text-muted-foreground">
                      {g.blocked ? t.text(g.blocked) : gain(g.gain)}
                    </span>
                  </span>
                </button>
                {intents.gather && (
                  <GatherButton
                    brew={brew}
                    cost={g.cost}
                    disabled={!turn || Boolean(g.blocked)}
                    onRun={() => run(intents.gather?.(g.at))}
                  />
                )}
              </div>
            );
          })}
        </Section>
      )}
      {upgrades.length > 0 && (
        <Section title={t('Improve')}>
          {upgrades.map((option) => (
            <OptionRow
              key={option.key}
              option={option}
              brew={brew}
              disabled={!turn}
              onRun={
                intents.upgrade ? () => run(intents.upgrade?.(venue.at, option.key)) : undefined
              }
            />
          ))}
        </Section>
      )}
      {contracts}
    </div>
  );
}

function GatherButton({
  brew,
  cost,
  disabled,
  onRun,
}: {
  brew: BrewView;
  cost: Cost;
  disabled: boolean;
  onRun: () => void;
}) {
  const t = useT();
  const { busy } = useGame();
  return (
    <button
      type="button"
      className="fr-buy"
      aria-label={t('Gather')}
      disabled={disabled || busy}
      onClick={onRun}
    >
      <CostChips cost={cost} brew={brew} />
      {!cost.coins && !cost.knowledge && !cost.ingredients ? t('Gather') : null}
    </button>
  );
}

// ——— Tile ———

export function TilePanel({
  brew,
  owner,
  atlas,
  intents,
  turn,
  run,
  at,
  onClose,
  attacker,
  onAttacker,
}: Common & Attacker & { at: number; onClose: () => void }) {
  const t = useT();
  const { name, you } = useGame();
  const ruin = brew.ruins?.find((r) => r.at === at);
  const ground = brew.ground[at];
  const ingredient = brew.ingredients.find((item) => item.at === at);
  const plot = brew.plots?.find((p) => p.at === at);
  const gathering = brew.gathering.get(at);
  const upgrades = brew.upgrades.get(at) ?? [];
  const gain = useGain();
  return (
    <div className="flex flex-col gap-3">
      <Header
        art={
          <Swatch>
            <TileArt brew={brew} at={at} atlas={atlas} />
            {ruin && <RuinPiece cx={0} cy={0} />}
            {plot && (
              <PlotPiece
                kind={plot.kind}
                cx={0}
                cy={0}
                color={owner(plot.owner).color}
                atlas={atlas}
              />
            )}
            {ingredient && <IngredientToken x={0} y={-8} kind={ingredient.kind} />}
          </Swatch>
        }
        title={
          ruin
            ? t('Ruins of a {venue}', { venue: t.text(VENUE_NAMES[ruin.previousKind]) })
            : t.text(groundName(ground))
        }
        subtitle={t('Tile {tile}', { tile: coords(brew, at) })}
        onClose={onClose}
      />
      {ruin && <RebuildSection brew={brew} intents={intents} turn={turn} run={run} ruin={ruin} />}
      {plot && plot.owner !== you && plot.owner !== null && (
        <SiegeSection
          brew={brew}
          owner={owner}
          atlas={atlas}
          intents={intents}
          turn={turn}
          run={run}
          at={at}
          plot
          attacker={attacker}
          onAttacker={onAttacker}
        />
      )}
      {plot && (
        <p className="text-sm">
          {t('{plot} · {owner}', {
            plot: t.text(plot.kind),
            owner: plot.owner ? name(plot.owner) : t('Vacant'),
          })}
        </p>
      )}
      {ingredient && (
        <div className="fr-row">
          <div className="fr-row-main">
            <svg aria-hidden="true" viewBox="-10 -10 20 20" className="size-6 shrink-0">
              <IngredientToken x={0} y={0} kind={ingredient.kind} />
            </svg>
            <span className="min-w-0 flex-1">
              <span className="block font-medium">{t.text(ingredient.kind)}</span>
              <span className="block text-xs text-muted-foreground">
                {gathering
                  ? gathering.blocked
                    ? t.text(gathering.blocked)
                    : gain(gathering.gain)
                  : null}
              </span>
            </span>
          </div>
          {gathering && intents.gather && (
            <GatherButton
              brew={brew}
              cost={gathering.cost}
              disabled={!turn || Boolean(gathering.blocked)}
              onRun={() => run(intents.gather?.(at))}
            />
          )}
        </div>
      )}
      {upgrades.length > 0 && (
        <Section title={t('Build here')}>
          {upgrades.map((option) => (
            <OptionRow
              key={option.key}
              option={option}
              brew={brew}
              disabled={!turn}
              onRun={intents.upgrade ? () => run(intents.upgrade?.(at, option.key)) : undefined}
            />
          ))}
        </Section>
      )}
    </div>
  );
}

// ——— Overview ———

export function OverviewPanel({
  brew,
  turn,
  onSelect,
}: Common & { onSelect: (at: number) => void }) {
  const t = useT();
  const { you } = useGame();
  if (!you)
    return (
      <p className="text-sm text-muted-foreground">
        {t('Shared screen. Players act on their own phones.')}
      </p>
    );
  if (!brew.alive.includes(you))
    return (
      <p className="text-sm text-muted-foreground">
        {t('Your brewery has closed. You can watch until the match ends.')}
      </p>
    );
  if (!turn) return null;
  const hits = (brew.incidents ?? []).filter(
    (incident) => incident.target === you && incident.round >= brew.round - 1,
  );
  const ready = (brew.batches ?? []).filter((b) => b.stage === 'ready');
  const due = (brew.contracts ?? []).filter(
    (c) => c.state === 'accepted' && c.holder === you && c.dueRound - brew.round <= 2,
  );
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1 text-sm">
        {hits.length > 0 && (
          <li>
            <button
              type="button"
              className="fr-link-button fr-link-danger"
              onClick={() => onSelect(hits[hits.length - 1].at)}
            >
              {hits.length === 1
                ? t('A rival hit one of your venues. Inspect the damage.')
                : t('Rivals hit your venues {n} times. Inspect the damage.', { n: hits.length })}
            </button>
          </li>
        )}
        {ready.length > 0 && (
          <li>
            <button
              type="button"
              className="fr-link-button"
              onClick={() => onSelect(ready[0].venue)}
            >
              {ready.length === 1
                ? t('1 batch is ready to load.')
                : t('{n} batches are ready to load.', { n: ready.length })}
            </button>
          </li>
        )}
        {due.length > 0 && (
          <li>
            <button type="button" className="fr-link-button" onClick={() => onSelect(due[0].venue)}>
              {due.length === 1
                ? t('1 order is due soon.')
                : t('{n} orders are due soon.', { n: due.length })}
            </button>
          </li>
        )}
      </ul>
    </div>
  );
}
