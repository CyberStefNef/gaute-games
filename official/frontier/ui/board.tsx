import {
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type Ref,
  type KeyboardEvent,
} from 'react';
import {
  createScene,
  type SceneController,
  type SceneCamera,
  type SceneGesture,
  type Vec3,
} from '@gaute/games-sdk/scene3d';
import { planet, nearestTile, multiply, dot, normal, cross, add } from '../planet';
import type { BrewView, CourierKind } from './contract';
import type { Owners } from './derived';
import { boardScene, boardCamera } from './board-scene';
import { planetModel, planetColors, base64 } from './planet-mesh';
import { makeFog } from './planet-fog';
import { MODELS } from './models';
import { Icon } from './pieces';
import { useT } from './game';
export type BoardMarks = {
  selected: number | null;
  courierAt: number | null;
  reach: ReadonlySet<number>;
  gather: ReadonlySet<number>;
  pending: { at: number; kind: CourierKind; path?: number[] } | null;
  ready: ReadonlySet<number>;
  siege: ReadonlySet<number>;
};
export type BoardHandle = {
  centerOn: (at: number, animate?: boolean) => void;
  reveal: (at: number) => void;
};
export type BoardLabels = {
  map: string;
  instructions: string;
  zoomIn: string;
  zoomOut: string;
  locate: string;
  overview: string;
};
type Props = {
  brew: BrewView;
  occluded: boolean;
  you: string | null;
  owner: Owners;
  marks: BoardMarks;
  home: number | null;
  labels: BoardLabels;
  describe: (at: number) => string;
  onTap: (at: number) => void;
  onEscape: () => void;
  ref?: Ref<BoardHandle>;
};
export function Board(props: Props) {
  const { brew, marks, labels, home, ref } = props,
    t = useT();
  const viewport = useRef<HTMLDivElement>(null),
    controller = useRef<SceneController | null>(null),
    latest = useRef(props);
  latest.current = props;
  const fog = useRef<ReturnType<typeof makeFog> | null>(null);
  const first = planet(brew.size).cells[home ?? 0].center;
  const camera = useRef({
    yaw: Math.atan2(first[0], first[2]),
    pitch: Math.asin(first[1]),
    span: 17,
  });
  const [ready, setReady] = useState(false),
    [failed, setFailed] = useState(false),
    [attempt, setAttempt] = useState(0);
  const [cursor, setCursor] = useState<number | null>(null),
    [keyboard, setKeyboard] = useState(false),
    [announce, setAnnounce] = useState('');
  const timer = useRef<number | null>(null),
    tiles = useRef(new Map<string, number>()),
    drawDirection = useRef<Vec3>([0, 0, 0]);
  const previous = useRef<{ brew: BrewView; marks: BoardMarks } | null>(null),
    routes = useRef(new Map<number, readonly number[]>());
  const visual = useRef(marks);
  visual.current = keyboard && cursor !== null ? { ...marks, selected: cursor } : marks;
  const direction = (): Vec3 => {
    const c = camera.current;
    return [
      Math.sin(c.yaw) * Math.cos(c.pitch),
      Math.sin(c.pitch),
      Math.cos(c.yaw) * Math.cos(c.pitch),
    ];
  };
  const fullSpan = () => {
    const r = planet(latest.current.brew.size).radius,
      b = viewport.current;
    return r * 2.5 * Math.max(1, b ? b.clientHeight / Math.max(1, b.clientWidth) : 1);
  };
  const stateCamera = (): SceneCamera => {
    return boardCamera(
      direction(),
      planet(latest.current.brew.size).radius,
      camera.current.span,
      fullSpan(),
    );
  };
  const viewDirection = (): Vec3 => {
    const c = stateCamera();
    return normal(add(c.position, multiply(c.target, -1)));
  };
  const inFocus = (n: Vec3) => {
    const c = stateCamera(),
      eye = viewDirection(),
      right = normal(cross([0, 1, 0], eye)),
      up = cross(eye, right),
      offset = add(
        multiply(n, planet(latest.current.brew.size).radius + 0.5),
        multiply(c.target, -1),
      ),
      b = viewport.current,
      aspect = b ? b.clientWidth / Math.max(1, b.clientHeight) : 1;
    return (
      dot(n, eye) > 0.35 &&
      dot(n, direction()) > 0.8 &&
      Math.abs(dot(offset, right)) < camera.current.span * aspect * 0.4 &&
      Math.abs(dot(offset, up)) < camera.current.span * 0.4
    );
  };
  const failure = (error: unknown) => {
    console.error('Brewtown planet:', error);
    setFailed(true);
  };
  const refresh = () => {
    const p = latest.current,
      n = viewDirection(),
      data = boardScene(p.brew, visual.current, p.owner, routes.current, n);
    tiles.current = data.tiles;
    drawDirection.current = n;
    void controller.current
      ?.update({
        nodes: data.nodes,
        camera: stateCamera(),
        background: document.documentElement.classList.contains('dark') ? '#131827' : '#d9e4e9',
      })
      .catch(failure);
  };
  const scheduleCamera = () => {
    if (timer.current) return;
    timer.current = requestAnimationFrame(() => {
      timer.current = null;
      void controller.current?.setCamera(stateCamera()).catch(failure);
      if (dot(drawDirection.current, viewDirection()) < 0.99) refresh();
    });
  };
  const centerOn = (at: number) => {
    const n = planet(latest.current.brew.size).cells[at]?.center;
    if (!n) return;
    camera.current.yaw = Math.atan2(n[0], n[2]);
    camera.current.pitch = Math.max(
      -Math.PI / 2 + 0.01,
      Math.min(Math.PI / 2 - 0.01, Math.asin(n[1])),
    );
    const b = viewport.current;
    camera.current.span = Math.max(11, Math.min(15, ((b?.clientHeight ?? 400) * 2.85) / 80));
    scheduleCamera();
  };
  const zoom = (factor: number) => {
    camera.current.span = Math.max(8, Math.min(fullSpan() * 1.2, camera.current.span / factor));
    scheduleCamera();
  };
  const gesture = (g: SceneGesture) => {
    if (g.type === 'zoom') {
      zoom(g.factor);
      return;
    }
    camera.current.yaw -= g.dx * Math.PI;
    camera.current.pitch = Math.max(
      -Math.PI / 2 + 0.01,
      Math.min(Math.PI / 2 - 0.01, camera.current.pitch + g.dy * Math.PI * 0.8),
    );
    scheduleCamera();
  };
  useImperativeHandle(ref, () => ({
    centerOn,
    reveal: (at) => {
      if (!inFocus(planet(latest.current.brew.size).cells[at].center)) centerOn(at);
    },
  }));
  useEffect(() => {
    let dead = false,
      local: SceneController | undefined;
    setFailed(false);
    setReady(false);
    void (async () => {
      local = await createScene(viewport.current!, {
        onError: failure,
        onGesture: gesture,
        onPick: ({ id, point }) => {
          if (!id) return;
          const at =
            (id === 'planet' || id === 'fog') && point
              ? nearestTile(point, latest.current.brew.size)
              : tiles.current.get(id);
          if (at === undefined) return;
          const b = viewport.current;
          if (camera.current.span > 20 || (b && (3 * b.clientHeight) / camera.current.span < 44)) {
            centerOn(at);
            return;
          }
          setKeyboard(false);
          setCursor(at);
          setAnnounce(latest.current.describe(at));
          latest.current.onTap(at);
        },
      });
      if (dead) {
        local.dispose();
        return;
      }
      controller.current = local;
      await local.setVisible(!latest.current.occluded);
      await local.load('planet', planetModel(latest.current.brew, latest.current.marks));
      fog.current = makeFog(latest.current.brew);
      await local.load('fog', fog.current.asset);
      await Promise.all(Object.entries(MODELS).map(([id, model]) => local!.load(id, model)));
      if (dead) return;
      centerOn(latest.current.home ?? 0);
      setReady(true);
    })().catch((error) => {
      if (!dead) failure(error);
    });
    return () => {
      dead = true;
      local?.dispose();
      controller.current = null;
      if (timer.current) cancelAnimationFrame(timer.current);
      timer.current = null;
    };
    // Event handlers read live game state through refs; only retry recreates GPU resources.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);
  useEffect(() => {
    if (!ready) return;
    const prior = previous.current;
    if (prior && prior.brew !== brew)
      for (const courier of brew.couriers) {
        const old = prior.brew.couriers.find((c) => c.id === courier.id);
        if (old && old.at !== courier.at)
          routes.current.set(courier.id, [
            old.at,
            ...(prior.brew.reach.get(courier.id)?.paths?.[courier.at] ?? [courier.at]),
          ]);
      }
    previous.current = { brew, marks };
    refresh();
    void controller.current
      ?.setColors('planet', base64(planetColors(brew, visual.current)))
      .catch(failure);
    if (fog.current)
      void controller.current
        ?.setColors('fog', base64(fog.current.colors(brew.ground)))
        .catch(failure);
    const observer = new MutationObserver(refresh);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
    // Camera changes use small commands; only changed visibility/selection updates colours and props.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brew, marks, ready, keyboard, cursor]);
  useEffect(() => {
    if (ready) void controller.current?.setVisible(!props.occluded).catch(failure);
  }, [props.occluded, ready]);
  const key = (event: KeyboardEvent<HTMLDivElement>) => {
    const at = cursor ?? marks.selected ?? home ?? 0,
      grid = planet(brew.size),
      n = direction(),
      right = normal(cross([0, 1, 0], n)),
      up = cross(n, right);
    if (event.key.startsWith('Arrow')) {
      event.preventDefault();
      const axis =
        event.key === 'ArrowLeft'
          ? multiply(right, -1)
          : event.key === 'ArrowRight'
            ? right
            : event.key === 'ArrowUp'
              ? up
              : multiply(up, -1);
      const next = [...grid.cells[at].neighbors].sort(
        (a, b) => dot(grid.cells[b].center, axis) - dot(grid.cells[a].center, axis),
      )[0];
      setKeyboard(true);
      setCursor(next);
      setAnnounce(props.describe(next));
      centerOn(next);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      props.onTap(at);
    } else if (event.key === 'Escape') props.onEscape();
    else if (event.key === '+' || event.key === '=') {
      event.preventDefault();
      zoom(1.3);
    } else if (event.key === '-') {
      event.preventDefault();
      zoom(1 / 1.3);
    }
  };
  return (
    <div className="fr-viewport-wrap fr-3d-wrap">
      <div
        ref={viewport}
        className="fr-viewport fr-3d-viewport"
        role="application"
        aria-roledescription={labels.map}
        aria-label={labels.map}
        aria-describedby="fr-map-help"
        tabIndex={0}
        onKeyDown={key}
      />
      {(!ready || failed) && (
        <div className="fr-3d-loading" role="status">
          <span>{failed ? t('The town could not load.') : t('Loading town…')}</span>
          {failed && (
            <button
              className="fr-fab"
              onClick={() => setAttempt((n) => n + 1)}
              aria-label={t('Retry map')}
            >
              <Icon name="locate" />
            </button>
          )}
        </div>
      )}
      <p id="fr-map-help" className="sr-only">
        {labels.instructions}
      </p>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>
    </div>
  );
}
