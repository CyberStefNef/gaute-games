// Gaute Brewtown: map-first page. The board fills the screen; a contextual dock
// shows the selection and its options; sheets hold the skill tree, orders,
// ledger, standings and help. Rules data arrives through ui/wire.ts only.
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Hero, Muted, Title } from '../_kit/ui';
import { Board, type BoardHandle, type BoardMarks } from './ui/board';
import type { BrewView } from './ui/contract';
import { groundName, identities } from './ui/derived';
import { mountGame, useGame, useT } from './ui/game';
import { Help, Ledger, OrdersBoard, RealmBar, Results, Sheet, Standings } from './ui/hud';
import {
  COURIER_NAMES,
  CourierPanel,
  OverviewPanel,
  TilePanel,
  VENUE_NAMES,
  VenuePanel,
  coords,
  type Run,
} from './ui/panel';
import { Icon } from './ui/pieces';
import { planet } from './planet';
import { TownPreview } from './ui/town-preview';
import { SkillTree } from './ui/skills';
import { MAP_SIZES, canAct, toBrew, useIntents, useStart } from './ui/wire';
import { targetsOf } from './ui/rivalry';
import './style.css';

type Selection = { at: number; focus: 'courier' | 'venue' | 'tile'; courierId?: number } | null;
type SheetName = 'skills' | 'orders' | 'ledger' | 'standings' | 'help' | null;

function Setup() {
  const t = useT();
  const { you, name, busy, rejected, playing, view } = useGame();
  const start = useStart();
  const turn = playing && you === view.active;
  const sizes: Record<(typeof MAP_SIZES)[number], string> = {
    8: 'Village · quick evening',
    12: 'Town · recommended',
    16: 'City · longer match',
    24: 'Region · marathon',
  };
  return (
    <main className="mx-auto flex min-h-dvh max-w-[560px] flex-col gap-4 p-5 py-8">
      <Hero>
        <SetupArt />
        <Title large>{t('Gaute Brewtown')}</Title>
        <div className="flex w-full flex-col gap-2">
          {MAP_SIZES.map((size) => (
            <button
              key={size}
              type="button"
              className={`fr-size ${size === 12 ? 'fr-size-main' : ''}`}
              disabled={!turn || busy}
              onClick={() => start(size)}
            >
              <span className="font-semibold">
                {t('{n} districts', { n: planet(size).cells.length })}
              </span>
              <span className="text-sm opacity-80">{t.text(sizes[size])}</span>
            </button>
          ))}
        </div>
        {!turn && (
          <Muted>
            {t('Waiting for {player} to choose the town.', { player: name(view.active) })}
          </Muted>
        )}
      </Hero>
      {rejected && (
        <p role="alert" className="text-center text-sm font-medium text-destructive">
          {t.text(rejected)}
        </p>
      )}
    </main>
  );
}

function SetupArt() {
  return <TownPreview />;
}

function Game() {
  const { view } = useGame();
  if (view.phase === 'setup') return <Setup />;
  return <Town />;
}

function Town() {
  const { view, you, playing, name, busy, rejected, gaute, players, mode } = useGame();
  const t = useT();
  const brew: BrewView = useMemo(() => toBrew(view, you), [view, you]);
  const intents = useIntents();
  const owner = useMemo(() => identities(players.map((p) => p.handle)), [players]);
  const board = useRef<BoardHandle>(null);
  const [selection, setSelection] = useState<Selection>(null);
  const [pending, setPending] = useState<number | null>(null);
  const [sheet, setSheet] = useState<SheetName>(null);
  const [attacker, setAttacker] = useState<number | null>(null);
  const [confirmReady, setConfirmReady] = useState(false);
  const turn = playing && brew.canAct;
  const home = brew.venues.find((v) => v.owner === you)?.at ?? null;

  const courierAt = new Map<number, (typeof brew.couriers)[number]>();
  for (const c of brew.couriers) {
    const previous = courierAt.get(c.at);
    if (!previous || (c.owner === you && (previous.owner !== you || c.ready)))
      courierAt.set(c.at, c);
  }
  const venueAt = new Map(brew.venues.map((v) => [v.at, v]));
  const focusCourier =
    selection?.focus === 'courier'
      ? (brew.couriers.find((c) => c.id === selection.courierId && c.at === selection.at) ??
        courierAt.get(selection.at))
      : undefined;
  const chosen = focusCourier && focusCourier.owner === you ? focusCourier : undefined;
  const reach = chosen ? brew.reach.get(chosen.id) : undefined;
  const ready = brew.couriers.filter((c) => c.owner === you && canAct(c));
  const siegeTargets = new Set(chosen && turn ? targetsOf(brew, chosen) : []);

  // Phone rounds keep the camera where the player left it. Passing a single
  // phone clears the previous player's selection before revealing the new view.
  const roundKey = `${brew.round}:${mode === 'pass' ? brew.active : ''}`;
  const last = useRef(roundKey);
  useEffect(() => {
    if (last.current === roundKey) return;
    last.current = roundKey;
    setPending(null);
    setConfirmReady(false);
    if (mode === 'pass') {
      setSelection(null);
      if (home !== null) board.current?.centerOn(home);
    } else if (turn) gaute('wave');
  }, [roundKey, turn, mode, gaute, home]);
  // A rival's raid, takeover or demolition against you gets an "oops".
  const seen = useRef((brew.incidents ?? []).length);
  useEffect(() => {
    const list = brew.incidents ?? [];
    const fresh = list.slice(Math.min(seen.current, list.length));
    seen.current = list.length;
    if (fresh.some((incident) => incident.target === you && incident.actor !== you)) gaute('oops');
  }, [brew.incidents, you, gaute]);
  const ended = useRef(brew.phase === 'ended');
  useEffect(() => {
    if (brew.phase !== 'ended' || ended.current) return;
    ended.current = true;
    if (you && brew.winners.includes(you)) gaute('celebrate');
  }, [brew.phase, brew.winners, you, gaute]);

  const run: Run = async (attempt) => (attempt ? attempt : false);

  const layers = (at: number) => {
    const list: ('courier' | 'venue' | 'tile')[] = [];
    if (courierAt.has(at)) list.push('courier');
    if (venueAt.has(at)) list.push('venue');
    if (!list.length || brew.ingredients.some((i) => i.at === at) || brew.upgrades.has(at))
      list.push('tile');
    return list;
  };

  const travel = async (at: number) => {
    if (!chosen || !intents.travel) return;
    const id = chosen.id;
    if (await intents.travel(id, at)) {
      setPending(null);
      setSelection({ at, focus: 'courier', courierId: id });
    }
  };

  const onTap = (at: number) => {
    // A rival target beats travel: the panel offers the raid, takeover or demolition.
    if (chosen && siegeTargets.has(at)) {
      setPending(null);
      setAttacker(chosen.id);
      setSelection({ at, focus: venueAt.has(at) ? 'venue' : 'tile' });
      return;
    }
    if (chosen && reach?.tiles.includes(at) && turn) {
      if (pending === at) void travel(at);
      else setPending(at);
      return;
    }
    setPending(null);
    const stack = layers(at);
    if (selection?.at === at) {
      const next = stack.indexOf(selection.focus) + 1;
      setSelection(next < stack.length ? { at, focus: stack[next] } : null);
      return;
    }
    // Prefer the courier only when it is yours and ready; otherwise the venue.
    const c = courierAt.get(at);
    const first =
      c && (c.owner !== you || c.ready || !venueAt.has(at))
        ? 'courier'
        : (stack.find((l) => l !== 'courier') ?? stack[0]);
    setSelection({ at, focus: first });
  };

  const show = (at: number) => {
    setSheet(null);
    setPending(null);
    const stack = layers(at);
    setSelection({ at, focus: venueAt.has(at) ? 'venue' : stack[0] });
    board.current?.centerOn(at);
  };

  const nextCourier = () => {
    if (!ready.length) return;
    const index = chosen ? ready.findIndex((c) => c.id === chosen.id) : -1;
    const next = ready[(index + 1) % ready.length];
    setPending(null);
    setSelection({ at: next.at, focus: 'courier', courierId: next.id });
    board.current?.centerOn(next.at);
  };

  const describe = (at: number) => {
    const parts = [
      t('Tile {tile}', { tile: coords(brew, at) }),
      t.text(groundName(brew.ground[at])),
    ];
    if (brew.ground[at] >= 0 && !brew.visible.has(at)) parts.push(t('out of sight'));
    const venue = venueAt.get(at);
    if (venue)
      parts.push(
        `${t.text(VENUE_NAMES[venue.kind])} ${venue.level}, ${venue.owner ? name(venue.owner) : t('Vacant')}`,
      );
    const courier = courierAt.get(at);
    if (courier) parts.push(`${t.text(COURIER_NAMES[courier.kind])}, ${name(courier.owner)}`);
    const ingredient = brew.ingredients.find((i) => i.at === at);
    if (ingredient) parts.push(t.text(ingredient.kind));
    if (reach?.tiles.includes(at)) parts.push(t('courier can ride here'));
    if (brew.gathering.has(at)) parts.push(t('can be gathered'));
    if (siegeTargets.has(at)) parts.push(t('in raid reach'));
    if (venue?.durability !== undefined && venue.maxDurability !== undefined)
      parts.push(
        t('condition {n} of {total}', { n: venue.durability, total: venue.maxDurability }),
      );
    if (brew.ruins?.some((r) => r.at === at)) parts.push(t('ruins'));
    return parts.join(', ');
  };

  const selectedVenue = selection?.focus === 'venue' ? venueAt.get(selection.at) : undefined;
  const marks: BoardMarks = {
    selected: selection?.at ?? null,
    courierAt: chosen?.at ?? null,
    reach: new Set(turn && reach ? reach.tiles : []),
    gather: new Set(
      selectedVenue && selectedVenue.owner === you
        ? [...brew.gathering.values()].filter((g) => g.venue === selectedVenue.at).map((g) => g.at)
        : [],
    ),
    pending:
      pending !== null && chosen
        ? {
            at: pending,
            kind: chosen.kind,
            path: reach?.paths?.[pending] ? [chosen.at, ...reach.paths[pending]] : undefined,
          }
        : null,
    ready: new Set(ready.map((c) => c.id)),
    siege: siegeTargets,
  };

  const common = { brew, owner, atlas: null, intents, turn, run };
  const close = () => {
    setSelection(null);
    setPending(null);
  };
  let panel;
  if (brew.phase === 'ended') panel = <Results brew={brew} />;
  else if (selection?.focus === 'courier' && focusCourier)
    panel = (
      <CourierPanel
        {...common}
        courier={focusCourier}
        pending={chosen ? pending : null}
        onCancel={() => setPending(null)}
        onConfirm={() => pending !== null && void travel(pending)}
        onClose={close}
        onInspect={(at) => {
          const id = focusCourier.id;
          setAttacker(id);
          setSelection({ at, focus: venueAt.has(at) ? 'venue' : 'tile' });
          board.current?.reveal(at);
        }}
      />
    );
  else if (selection?.focus === 'venue' && selectedVenue)
    panel = (
      <VenuePanel
        {...common}
        venue={selectedVenue}
        attacker={attacker}
        onAttacker={setAttacker}
        onClose={close}
        onSelectTile={(at) => setSelection({ at, focus: 'tile' })}
      />
    );
  else if (selection)
    panel = (
      <TilePanel
        {...common}
        at={selection.at}
        attacker={attacker}
        onAttacker={setAttacker}
        onClose={close}
      />
    );
  else panel = <OverviewPanel {...common} onSelect={show} />;

  const sheetTitle: Record<Exclude<SheetName, null>, string> = {
    skills: t('Skills'),
    orders: t('Orders'),
    ledger: t('Brewery ledger'),
    standings: t('Standings'),
    help: t('How to play'),
  };
  const openOrders = (brew.contracts ?? []).filter((c) => c.state === 'open').length;

  return (
    <main className="fr-root text-foreground">
      <RealmBar
        brew={brew}
        owner={owner}
        onStandings={() => setSheet('standings')}
        onLedger={() => setSheet('ledger')}
        onHelp={() => setSheet('help')}
      />
      <div className="fr-stage">
        <Board
          ref={board}
          brew={brew}
          occluded={sheet !== null}
          you={you}
          owner={owner}
          marks={marks}
          home={home}
          describe={describe}
          onTap={onTap}
          onEscape={() => (pending !== null ? setPending(null) : setSelection(null))}
          labels={{
            map: t('Town map'),
            instructions: t(
              'Drag to rotate the planet. Pinch to zoom. Arrow keys move between districts; Enter selects and Escape cancels.',
            ),
            zoomIn: t('Zoom in'),
            zoomOut: t('Zoom out'),
            locate: t('Centre the map'),
            overview: t('Tap the map to zoom in'),
          }}
        />
        <aside className="fr-dock" aria-label={t('Selection')}>
          <div className={`fr-dock-body ${selection ? 'fr-dock-inspecting' : 'fr-dock-idle'}`}>
            {panel}
          </div>
          {rejected && (
            <p role="alert" className="fr-alert">
              {t.text(rejected)}
            </p>
          )}
          {confirmReady && turn && (
            <div className="fr-ready-confirm" role="group" aria-label={t('Finish this round?')}>
              <p>
                {ready.length === 1
                  ? t('1 crew can still act. Finish this round?')
                  : t('{n} crews can still act. Finish this round?', { n: ready.length })}
              </p>
              <button
                type="button"
                className="fr-link-button"
                onClick={() => setConfirmReady(false)}
              >
                {t('Keep playing')}
              </button>
              <Button
                primary
                disabled={busy}
                onClick={() => {
                  setConfirmReady(false);
                  void intents.endTurn?.();
                }}
              >
                {t('Ready')}
              </Button>
            </div>
          )}
          {brew.phase === 'play' && (
            <nav className="fr-dock-actions" aria-label={t('Turn actions')}>
              <button type="button" className="fr-tool" onClick={() => setSheet('skills')}>
                <Icon name="skill" />
                <span>{t('Skills')}</span>
              </button>
              <button type="button" className="fr-tool" onClick={() => setSheet('orders')}>
                <Icon name="contract" />
                <span>{t('Orders')}</span>
                {openOrders > 0 && <span className="fr-count">{openOrders}</span>}
              </button>
              {turn && ready.length > 0 && (
                <button
                  type="button"
                  className="fr-tool"
                  aria-label={t('Next courier')}
                  onClick={nextCourier}
                >
                  <Icon name="next" />
                  <span>{t('Couriers')}</span>
                  <span className="fr-count">{ready.length}</span>
                </button>
              )}
              {turn ? (
                <Button
                  primary
                  className="fr-end"
                  disabled={busy}
                  onClick={() => {
                    if (brew.simultaneous && ready.length > 0) setConfirmReady(true);
                    else void intents.endTurn?.();
                  }}
                >
                  <span>{t(brew.simultaneous ? 'Ready' : 'End turn')}</span>
                  {brew.simultaneous && (
                    <small>
                      {brew.finished.length}/{brew.alive.length}
                    </small>
                  )}
                </Button>
              ) : (
                <button
                  type="button"
                  className="fr-ready-state"
                  onClick={() => setSheet('standings')}
                >
                  <Icon name="check" className="size-4" />
                  <span>{t(you && brew.alive.includes(you) ? 'Ready' : 'Watching')}</span>
                  <small>
                    {brew.finished.length}/{brew.alive.length}
                  </small>
                </button>
              )}
            </nav>
          )}
        </aside>
      </div>
      {sheet && (
        <Sheet title={sheetTitle[sheet]} onClose={() => setSheet(null)}>
          {sheet === 'skills' ? (
            <SkillTree brew={brew} intents={intents} turn={turn} run={run} />
          ) : sheet === 'orders' ? (
            <OrdersBoard brew={brew} intents={intents} turn={turn} run={run} onShow={show} />
          ) : sheet === 'ledger' ? (
            <Ledger brew={brew} owner={owner} atlas={null} onShow={show} />
          ) : sheet === 'standings' ? (
            <Standings brew={brew} owner={owner} onShow={show} />
          ) : (
            <Help owner={owner} atlas={null} />
          )}
        </Sheet>
      )}
    </main>
  );
}

mountGame(Game);
