// Top realm bar, sheets (orders board, ledger, standings, help) and results.
import { useEffect, useRef, type ReactNode } from 'react';
import { Scores } from '../../_kit/ui';
import type { FrontierAtlas } from './atlas';
import { INGREDIENTS, type BrewView, type Intents } from './contract';
import type { Owners } from './derived';
import { useGame, useT } from './game';
import { hexPoints } from './geometry';
import {
  DamageOverlay,
  EmblemShape,
  Icon,
  RuinPiece,
  IngredientToken,
  ReadyBadge,
  Swatch,
  VenueBanner,
  type IconName,
} from './pieces';
import {
  COURIER_NAMES,
  ContractRow,
  CourierArt,
  Section,
  VENUE_NAMES,
  coords,
  type Run,
} from './panel';
import { IncidentFeed } from './rivalry';

const Mini = ({ children }: { children: ReactNode }) => (
  <svg aria-hidden="true" viewBox="-10 -10 20 20" className="size-4 shrink-0">
    {children}
  </svg>
);

function Yield({
  icon,
  art,
  value,
  delta,
  label,
}: {
  icon?: IconName;
  art?: ReactNode;
  value: ReactNode;
  delta?: number;
  label: string;
}) {
  return (
    <li className="fr-yield" title={label}>
      {art ?? (icon && <Icon name={icon} className="size-4" />)}
      <span className="tabular-nums">{value}</span>
      {delta !== undefined && (
        <span className="fr-delta tabular-nums">
          {delta >= 0 ? '+' : ''}
          {delta}
        </span>
      )}
      <span className="sr-only">{label}</span>
    </li>
  );
}

export function RealmBar({
  brew,
  owner,
  onStandings,
  onLedger,
  onHelp,
}: {
  brew: BrewView;
  owner: Owners;
  onStandings: () => void;
  onLedger: () => void;
  onHelp: () => void;
}) {
  const t = useT();
  const { you, name, playing } = useGame();
  const active = owner(brew.simultaneous && you ? you : brew.active);
  const turn = playing && brew.canAct;
  const status =
    brew.phase === 'ended'
      ? t('Match finished')
      : brew.simultaneous
        ? name(you ?? brew.active)
        : turn
          ? t('Your turn')
          : t("{player}'s turn", { player: name(brew.active) });
  const realm = brew.realm;
  return (
    <header className="fr-bar">
      <button
        type="button"
        className={`fr-turn ${turn ? 'fr-turn-you' : ''}`}
        onClick={onStandings}
        aria-haspopup="dialog"
        aria-label={`${t('Standings')}: ${status}`}
      >
        <svg aria-hidden="true" viewBox="-8 -8 16 16" className="size-5 shrink-0">
          <circle r={8} fill={active.color} />
          <EmblemShape emblem={active.emblem} x={0} y={0} r={4} className="fr-banner-emblem" />
        </svg>
        <span className="min-w-0 text-left leading-tight">
          <span className="block truncate text-[14px] font-bold">{status}</span>
          <span className="block text-[12px] text-muted-foreground tabular-nums">
            {t('Round {n} of {total}', {
              n: Math.min(brew.round, brew.rounds),
              total: brew.rounds,
            })}
          </span>
        </span>
      </button>
      {realm && (
        <button
          type="button"
          className="fr-yields"
          onClick={onLedger}
          aria-haspopup="dialog"
          aria-label={t('Brewery ledger')}
        >
          <ul className="contents">
            <Yield icon="coins" value={realm.coins} delta={realm.income} label={t('Coins')} />
            {realm.reputation !== undefined && (
              <Yield icon="star" value={realm.reputation} label={t('Reputation')} />
            )}
            {realm.knowledge !== undefined && (
              <Yield icon="skill" value={realm.knowledge} label={t('Knowledge')} />
            )}
          </ul>
        </button>
      )}
      <button
        type="button"
        className="fr-icon-button"
        aria-label={t('How to play')}
        onClick={onHelp}
      >
        <Icon name="help" />
      </button>
      {realm?.stock && (
        <ul className="fr-stockbar" aria-label={t('Ingredients')}>
          {INGREDIENTS.map((kind) => (
            <Yield
              key={kind}
              art={
                <Mini>
                  <IngredientToken x={0} y={0} kind={kind} />
                </Mini>
              }
              value={realm.stock?.[kind] ?? 0}
              label={t.text(kind)}
            />
          ))}
        </ul>
      )}
    </header>
  );
}

/** A dialog sheet over the game: bottom sheet on phones, centred card on wide screens. */
export function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const t = useT();
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.focus();
    return () => previous?.focus?.();
  }, []);
  return (
    <div
      className="fr-scrim"
      onPointerDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        ref={panel}
        className="fr-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="fr-sheet-title"
        tabIndex={-1}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.stopPropagation();
            onClose();
          }
        }}
      >
        <div className="flex items-center justify-between gap-3 px-4 pt-3 pb-2">
          <h2 id="fr-sheet-title" className="text-[20px] font-bold tracking-tight">
            {title}
          </h2>
          <button
            type="button"
            className="fr-icon-button"
            aria-label={t('Close')}
            onClick={onClose}
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="fr-sheet-body">{children}</div>
      </div>
    </div>
  );
}

const PATHS = {
  reputation: { title: 'Renown', detail: 'Reach 60 reputation.' },
  festival: { title: 'Festival town', detail: 'Supply 3 festivals and reach 30 reputation.' },
  network: { title: 'Taproom network', detail: 'Run 5 venues and deliver 8 orders.' },
} as const;
const ENDINGS: Record<string, string> = {
  ...Object.fromEntries(Object.entries(PATHS).map(([key, path]) => [key, path.title])),
  takeover: 'Every rival venue taken or demolished',
  season: 'Best score at the end of the season',
};

export function Standings({
  brew,
  owner,
  onShow,
}: {
  brew: BrewView;
  owner: Owners;
  onShow: (at: number) => void;
}) {
  const t = useT();
  const { players, name, you } = useGame();
  const standing = new Map((brew.standings ?? []).map((s) => [s.player, s]));
  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-3">
        {players.map((player) => {
          const id = owner(player.handle);
          const s = standing.get(player.handle);
          const alive = brew.alive.includes(player.handle);
          return (
            <li key={player.handle} className="fr-standing">
              <div className="flex items-center gap-3">
                <svg aria-hidden="true" viewBox="-10 -10 20 20" className="size-7 shrink-0">
                  <circle r={10} fill={id.color} opacity={alive ? 1 : 0.4} />
                  <EmblemShape emblem={id.emblem} x={0} y={0} r={5} className="fr-banner-emblem" />
                </svg>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">
                    {name(player.handle)}
                    {player.handle === you ? ` · ${t('you')}` : ''}
                  </span>
                  <span className="block text-sm text-muted-foreground">
                    {!alive
                      ? player.left
                        ? t('Left the match')
                        : t('Closed')
                      : brew.simultaneous && brew.phase === 'play'
                        ? brew.finished.includes(player.handle)
                          ? t('Ready')
                          : t('Taking their turn')
                        : brew.active === player.handle && brew.phase === 'play'
                          ? t('Taking their turn')
                          : t('In the match')}
                  </span>
                </span>
                {s && (
                  <span className="flex shrink-0 gap-2 text-sm tabular-nums">
                    {s.reputation !== undefined && (
                      <span className="inline-flex items-center gap-1" title={t('Reputation')}>
                        <Icon name="star" className="size-4" />
                        {s.reputation}
                      </span>
                    )}
                    {s.venues !== undefined && (
                      <span className="inline-flex items-center gap-1" title={t('Venues')}>
                        <Icon name="venue" className="size-4" />
                        {s.venues}
                      </span>
                    )}
                    {s.contracts !== undefined && (
                      <span
                        className="inline-flex items-center gap-1"
                        title={t('Orders delivered')}
                      >
                        <Icon name="contract" className="size-4" />
                        {s.contracts}
                      </span>
                    )}
                  </span>
                )}
              </div>
              {s?.victory && (
                <ul className="mt-2 flex flex-col gap-1.5">
                  {(Object.keys(PATHS) as (keyof typeof PATHS)[]).map((path) => {
                    const value = Math.max(0, Math.min(1, s.victory?.[path] ?? 0));
                    return (
                      <li key={path} className="fr-path">
                        <span className="text-xs font-medium">{t.text(PATHS[path].title)}</span>
                        <span
                          className="fr-progress"
                          role="progressbar"
                          aria-label={t.text(PATHS[path].title)}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.round(value * 100)}
                        >
                          <span style={{ width: `${value * 100}%`, background: id.color }} />
                        </span>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {Math.round(value * 100)}%
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
      <IncidentFeed brew={brew} onShow={onShow} />
      {brew.standings && (
        <Section title={t('Ways to win')}>
          <ul className="flex flex-col gap-1 text-sm">
            {(Object.keys(PATHS) as (keyof typeof PATHS)[]).map((path) => (
              <li key={path}>
                <strong>{t.text(PATHS[path].title)}</strong> · {t.text(PATHS[path].detail)}
              </li>
            ))}
            <li className="text-muted-foreground">
              {t('Otherwise the best score after the last round wins.')}
            </li>
          </ul>
        </Section>
      )}
    </div>
  );
}

/** All local orders, grouped: yours first, then open, then the rest. */
export function OrdersBoard({
  brew,
  intents,
  turn,
  run,
  onShow,
}: {
  brew: BrewView;
  intents: Intents;
  turn: boolean;
  run: Run;
  onShow: (at: number) => void;
}) {
  const t = useT();
  const { you } = useGame();
  const contracts = brew.contracts ?? [];
  const mine = contracts.filter((c) => c.state === 'accepted' && c.holder === you);
  const open = contracts.filter((c) => c.state === 'open');
  const rest = contracts.filter((c) => !mine.includes(c) && !open.includes(c));
  if (!contracts.length)
    return (
      <p className="text-sm text-muted-foreground">
        {t('No orders in sight. Explore to find taprooms and festivals.')}
      </p>
    );
  const group = (title: string, list: typeof contracts) =>
    list.length > 0 && (
      <Section title={title}>
        {list.map((contract) => (
          <ContractRow
            key={contract.id}
            contract={contract}
            brew={brew}
            intents={intents}
            turn={turn}
            run={run}
            onShow={onShow}
          />
        ))}
      </Section>
    );
  return (
    <div className="flex flex-col gap-4">
      {group(t('Your orders'), mine)}
      {group(t('Open orders'), open)}
      {group(t('Other orders'), rest)}
    </div>
  );
}

/** Stock, tanks across all venues and the delivery team. */
export function Ledger({
  brew,
  owner,
  atlas,
  onShow,
}: {
  brew: BrewView;
  owner: Owners;
  atlas: FrontierAtlas | null;
  onShow: (at: number) => void;
}) {
  const t = useT();
  const { you } = useGame();
  const realm = brew.realm;
  const team = brew.couriers.filter((c) => c.owner === you);
  const venues = brew.venues.filter((v) => v.owner === you);
  return (
    <div className="flex flex-col gap-4">
      {realm?.stock && (
        <Section title={t('Ingredients')}>
          <ul className="grid grid-cols-5 gap-2">
            {INGREDIENTS.map((kind) => (
              <li key={kind} className="fr-stock">
                <svg aria-hidden="true" viewBox="-10 -10 20 20" className="size-7">
                  <IngredientToken x={0} y={0} kind={kind} />
                </svg>
                <span className="font-bold tabular-nums">{realm.stock?.[kind] ?? 0}</span>
                <span className="text-[11px] text-muted-foreground">{t.text(kind)}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}
      {venues.length > 0 && (
        <Section title={t('Venues')}>
          {venues.map((venue) => {
            const tanks = (brew.batches ?? []).filter((b) => b.venue === venue.at);
            return (
              <button
                key={venue.at}
                type="button"
                className="fr-row fr-row-button"
                onClick={() => onShow(venue.at)}
              >
                <span className="fr-row-main">
                  <Icon name="venue" />
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block font-medium">
                      {t('{venue} · level {n}', {
                        venue: t.text(VENUE_NAMES[venue.kind]),
                        n: venue.level,
                      })}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {tanks.length
                        ? tanks
                            .map((b) =>
                              b.stage === 'ready'
                                ? t('{recipe} ready', { recipe: t.text(b.recipe) })
                                : t('{recipe} in {n} turns', {
                                    recipe: t.text(b.recipe),
                                    n: b.turnsLeft,
                                  }),
                            )
                            .join(' · ')
                        : t('Tanks empty')}
                    </span>
                  </span>
                </span>
              </button>
            );
          })}
        </Section>
      )}
      {team.length > 0 && (
        <Section title={t('Delivery team')}>
          {team.map((courier) => {
            const load = (courier.cargo ?? []).reduce((n, c) => n + c.amount, 0);
            return (
              <button
                key={courier.id}
                type="button"
                className="fr-row fr-row-button"
                onClick={() => onShow(courier.at)}
              >
                <span className="fr-row-main">
                  <span className="size-9">
                    <CourierArt kind={courier.kind} identity={owner(courier.owner)} atlas={atlas} />
                  </span>
                  <span className="min-w-0 flex-1 text-left">
                    <span className="block font-medium">{t.text(COURIER_NAMES[courier.kind])}</span>
                    <span className="block text-xs text-muted-foreground">
                      {courier.capacity !== undefined
                        ? t('{n} of {total} kegs · tile {tile}', {
                            n: load,
                            total: courier.capacity,
                            tile: coords(brew, courier.at),
                          })
                        : t('Tile {tile}', { tile: coords(brew, courier.at) })}
                    </span>
                  </span>
                  {courier.ready && (
                    <svg aria-hidden="true" viewBox="-8 -8 16 16" className="size-5">
                      <ReadyBadge x={0} y={0} />
                    </svg>
                  )}
                </span>
              </button>
            );
          })}
        </Section>
      )}
    </div>
  );
}

const HELP = [
  'Run a brewery in a growing town. Gather barley, hops, water, yeast and fruit from tiles near your venues.',
  'Brew recipes in your brewhouse. Batches ferment and mature over several turns; each vessel holds one batch.',
  'Load ready kegs onto a courier, ride to a taproom or festival and deliver an accepted order.',
  'Orders pay coins and reputation. Learn skills across brewing, logistics and hospitality with coins and knowledge.',
  'Build plots that produce ingredients every turn, expand venues, and open vacant pubs to grow your network.',
  'Rivals fight dirty. A ready crew beside a rival venue can spend a keg and coins on a barrel raid. Any damage stops that venue earning, fermenting and harvesting until repaired.',
  'At zero condition, a ready crew beside it can take the venue over with its plots, or demolish it into ruins. Either way its tanks are lost. Ruins can be rebuilt.',
  'Defend by repairing once a round, fortifying with barrel walls and keeping ready crews inside your venues.',
  'Win by renown, festivals, a taproom network or a hostile takeover of every rival venue, or hold the best score after the last round.',
] as const;

export function Help({ owner, atlas }: { owner: Owners; atlas: FrontierAtlas | null }) {
  const t = useT();
  const { you, players } = useGame();
  const me = owner(you ?? players[0]?.handle);
  const legend: [ReactNode, string][] = [
    [
      <polygon key="m" points={hexPoints(0, 0, 4)} className="fr-mark-reach" />,
      'Courier can ride here',
    ],
    [<polygon key="g" points={hexPoints(0, 0, 6)} className="fr-mark-gather" />, 'Can be gathered'],
    [<IngredientToken key="r" x={0} y={-2} kind="hops" />, 'Ingredient'],
    [
      <VenueBanner
        key="b"
        x={0}
        y={-4}
        level={2}
        growth={undefined}
        color={me.color}
        emblem={me.emblem}
      />,
      'Venue owner and level',
    ],
    [<ReadyBadge key="d" x={0} y={-4} />, 'Crew ready to act'],
    [
      <polygon key="s" points={hexPoints(0, 0, 3)} className="fr-mark-siege" />,
      'Raid target in reach',
    ],
    [<DamageOverlay key="x" cx={0} cy={14} breached={false} />, 'Damaged venue'],
    [<RuinPiece key="u" cx={0} cy={0} />, 'Ruins'],
    [<polygon key="f" points={hexPoints(0, 0)} className="fr-fog fr-legend-fog" />, 'Out of sight'],
  ];
  return (
    <div className="flex flex-col gap-4">
      <ol className="flex list-decimal flex-col gap-2 pl-5 text-[15px]">
        {HELP.map((text) => (
          <li key={text}>{t.text(text)}</li>
        ))}
      </ol>
      <Section title={t('Map key')}>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {legend.map(([art, label]) => (
            <li key={label} className="fr-legend">
              <Swatch>{art}</Swatch>
              <span className="text-sm">{t.text(label)}</span>
            </li>
          ))}
        </ul>
      </Section>
      <Section title={t('Couriers')}>
        <ul className="flex flex-col gap-2">
          {(['walker', 'bike', 'cargo'] as const).map((kind) => (
            <li key={kind} className="fr-legend">
              <CourierArt kind={kind} identity={me} atlas={atlas} />
              <span className="text-sm">
                <strong>{t.text(COURIER_NAMES[kind])}</strong> · {t.text(`${kind} role`)}
              </span>
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}

export function Results({ brew }: { brew: BrewView }) {
  const t = useT();
  const { name } = useGame();
  const ending = brew.victory ? ENDINGS[brew.victory] : undefined;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="fr-portrait fr-portrait-gold">
          <Icon name="trophy" className="size-7" />
        </span>
        <div className="min-w-0">
          <h2 className="text-[20px] leading-tight font-bold">
            {brew.winners.length
              ? t('{players} won!', { players: brew.winners.map(name).join(', ') })
              : t('Match finished')}
          </h2>
          {ending && <p className="text-sm text-muted-foreground">{t.text(ending)}</p>}
        </div>
      </div>
      <Scores scores={brew.scores} />
    </div>
  );
}
