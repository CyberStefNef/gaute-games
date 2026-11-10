// Brewtown's procedural tabletop art. Every piece is drawn around a hex centre in
// world pixels. When an atlas supplies a sprite of the same name it replaces the
// drawing; owner plinths, banners and badges always stay procedural.
import { memo, type ReactNode } from 'react';
import type { FrontierAtlas } from './atlas';
import type { CourierKind, Ingredient, PlotKind, VenueKind } from './contract';
import type { Emblem } from './derived';
import { R, SLAB, TILT, hash, hexCorners, hexPoints, points } from './geometry';

/** Raised and sunken tiles: fields, hops, hills, water, orchard, town. */
export const ELEVATION = [0, 0, 7, -4, 0, 1] as const;
export const groundSprite = (ground: number) => `ground-${ground}`;
export const liftFor = (atlas: FrontierAtlas | null, ground: number) =>
  ground < 0 || atlas?.sprites[groundSprite(ground)] ? 0 : (ELEVATION[ground] ?? 0);

export function shade(hex: string, amount: number) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) =>
    Math.round(amount < 0 ? c * (1 + amount) : c + (255 - c) * amount)
      .toString(16)
      .padStart(2, '0');
  return `#${mix(n >> 16)}${mix((n >> 8) & 255)}${mix(n & 255)}`;
}

// ——— Atlas ———

export function AtlasDefs({ atlas }: { atlas: FrontierAtlas | null }) {
  if (!atlas) return null;
  const sets = [
    ['s', atlas.href] as const,
    ...(atlas.fogHref ? [['f', atlas.fogHref] as const] : []),
  ];
  return (
    <>
      {sets.flatMap(([set, href]) =>
        Object.entries(atlas.sprites).map(([name, rect]) => (
          <symbol key={`${set}${name}`} id={`fr-${set}-${name}`} viewBox={rect.join(' ')}>
            <image href={href} width={atlas.width} height={atlas.height} />
          </symbol>
        )),
      )}
    </>
  );
}

function Sprite({
  atlas,
  name,
  cx,
  cy,
  scale = 1,
  fog,
}: {
  atlas: FrontierAtlas;
  name: string;
  cx: number;
  cy: number;
  scale?: number;
  fog?: boolean;
}) {
  const rect = atlas.sprites[name];
  if (!rect) return null;
  const s = ((2 * R) / atlas.groundWidth) * scale;
  return (
    <use
      href={`#fr-${fog && atlas.fogHref ? 'f' : 's'}-${name}`}
      x={cx - atlas.anchor[0] * s}
      y={cy - atlas.anchor[1] * s}
      width={rect[2] * s}
      height={rect[3] * s}
    />
  );
}

// ——— Ground ———

const GROUND_CLASS = ['fr-fields', 'fr-hops', 'fr-hills', 'fr-water', 'fr-orchard', 'fr-town'];

function Hops({ at, cx, cy }: { at: number; cx: number; cy: number }) {
  // Two trellis rows of hop bines on poles, back row first.
  const rows = [-9, 5].map((dy, row) =>
    [-22, -7, 8, 23].map((dx, i) => ({
      x: cx + dx + (row ? 4 : -2),
      y: cy + dy + (hash(at, i + row * 4) - 0.5) * 2,
      h: 22 + hash(at, 9 + i + row * 4) * 6,
    })),
  );
  return (
    <g>
      {rows.map((poles, row) => (
        <g key={row}>
          <polyline
            points={points(poles.map((pole) => [pole.x, pole.y - pole.h] as const))}
            className="fr-wire"
          />
          {poles.map((pole, i) => (
            <g key={i}>
              <ellipse cx={pole.x} cy={pole.y} rx={5} ry={2} className="fr-shadow" />
              <line x1={pole.x} y1={pole.y} x2={pole.x} y2={pole.y - pole.h} className="fr-pole" />
              <ellipse
                cx={pole.x}
                cy={pole.y - pole.h * 0.45}
                rx={4.2}
                ry={pole.h * 0.42}
                className="fr-bine"
              />
              <ellipse
                cx={pole.x - 1.2}
                cy={pole.y - pole.h * 0.55}
                rx={2}
                ry={pole.h * 0.25}
                className="fr-bine-light"
              />
              <circle cx={pole.x + 2.6} cy={pole.y - pole.h * 0.3} r={1.7} className="fr-cone" />
            </g>
          ))}
        </g>
      ))}
    </g>
  );
}

function Props({ ground, at, cx, cy }: { ground: number; at: number; cx: number; cy: number }) {
  const r = hash(at, 3);
  if (ground === 0)
    // Barley furrows following the tilt, with a few ripe tufts.
    return (
      <g>
        {[-16, -6, 4, 14].map((dy, i) => {
          const inset = Math.abs(dy) * 0.7;
          return (
            <path
              key={i}
              d={`M${cx - 30 + inset} ${cy + dy * TILT}q${30 - inset} ${-4 + r * 3} ${60 - inset * 2} 0`}
              className={i % 2 ? 'fr-furrow' : 'fr-furrow-b'}
            />
          );
        })}
        {[0, 1, 2].map((i) => {
          const x = cx + (hash(at, 10 + i) - 0.5) * 44,
            y = cy + (hash(at, 20 + i) - 0.5) * 22;
          return (
            <path
              key={i}
              d={`M${x - 2.5} ${y}l1-6M${x} ${y}v-7M${x + 2.5} ${y}l-1-6`}
              className="fr-stalk"
            />
          );
        })}
      </g>
    );
  if (ground === 1) return <Hops at={at} cx={cx} cy={cy} />;
  if (ground === 2) {
    const x = cx + (r - 0.5) * 8;
    return (
      <g>
        <ellipse cx={x - 12} cy={cy + 4} rx={22} ry={14} className="fr-hill-back" />
        <ellipse cx={x + 10} cy={cy + 7} rx={24} ry={15} className="fr-hill" />
        <ellipse cx={x + 5} cy={cy - 1} rx={12} ry={5} className="fr-hill-light" />
        <path d={`M${x - 18} ${cy + 12}l3 -4l4 1l2 3Z`} className="fr-stone" />
        {r > 0.5 && <path d={`M${x + 16} ${cy + 14}l2 -3l4 0l1 3Z`} className="fr-stone" />}
      </g>
    );
  }
  if (ground === 3) {
    const ox = (r - 0.5) * 14;
    return (
      <g className="fr-ripple">
        <path d={`M${cx - 18 + ox} ${cy - 4}q4-3 8 0t8 0`} />
        <path d={`M${cx + 2 - ox} ${cy + 7}q4-3 8 0t8 0`} />
      </g>
    );
  }
  if (ground === 4)
    return (
      <g>
        {[
          [-14, -4],
          [12, -6],
          [0, 8],
        ].map(([dx, dy], i) => (
          <g key={i}>
            <rect x={cx + dx - 1.2} y={cy + dy - 8} width={2.4} height={8} className="fr-trunk" />
            <circle cx={cx + dx} cy={cy + dy - 13} r={8} className="fr-leaf" />
            <circle cx={cx + dx + 3} cy={cy + dy - 12} r={1.8} className="fr-apple" />
          </g>
        ))}
      </g>
    );
  return null;
}

export type TileShape = {
  at: number;
  ground: number;
  cx: number;
  cy: number;
  /** Edges (NE, E, SE, SW, W, NW) facing land, for water foam. */
  shore: readonly boolean[];
  fog: boolean;
  tint: string | null;
};

/** One explored hex: slab, top face, territory tint, props and memory veil. */
export const GroundTile = memo(function GroundTile({
  tile,
  atlas,
}: {
  tile: TileShape;
  atlas: FrontierAtlas | null;
}) {
  const { at, ground, cx, cy, shore, fog, tint } = tile;
  const sprite = atlas?.sprites[groundSprite(ground)] ? groundSprite(ground) : null;
  const lift = sprite ? 0 : (ELEVATION[ground] ?? 0);
  const y = cy - lift;
  const c = hexCorners(cx, y);
  const depth = SLAB + lift;
  const face = (a: number, b: number) =>
    points([c[a], c[b], [c[b][0], c[b][1] + depth], [c[a][0], c[a][1] + depth]]);
  const klass = GROUND_CLASS[ground] ?? 'fr-fields';
  const variant = hash(at, 1) < 0.33 ? ' fr-va' : hash(at, 1) > 0.7 ? ' fr-vb' : '';
  const fogSprite = Boolean(sprite && fog && atlas?.fogHref);
  return (
    <g>
      {sprite && atlas ? (
        <Sprite atlas={atlas} name={sprite} cx={cx} cy={cy} fog={fogSprite} />
      ) : (
        <>
          <polygon points={face(0, 1)} className={`${klass}-l`} />
          <polygon points={face(1, 2)} className={`${klass}-r`} />
          <polygon points={points(c)} className={`${klass}${variant} fr-top`} />
          {ground === 3 &&
            shore.map((edge, i) =>
              edge ? (
                <line
                  key={i}
                  x1={c[i][0]}
                  y1={c[i][1]}
                  x2={c[(i + 1) % 6][0]}
                  y2={c[(i + 1) % 6][1]}
                  className="fr-foam"
                />
              ) : null,
            )}
        </>
      )}
      {tint && <polygon points={hexPoints(cx, y, 3)} fill={tint} className="fr-tint" />}
      {!sprite && <Props ground={ground} at={at} cx={cx} cy={y} />}
      {fog && !fogSprite && <polygon points={hexPoints(cx, y)} className="fr-fog" />}
      {fog && !fogSprite && (ground === 1 || ground === 2) && (
        <polygon points={hexPoints(cx, y - 14, 8)} className="fr-fog" />
      )}
    </g>
  );
});

/** An unexplored hex: a blank, slightly sunken tile still to be revealed. */
export const BlankTile = memo(function BlankTile({ cx, cy }: { cx: number; cy: number }) {
  const c = hexCorners(cx, cy + 3);
  const drop = (i: number) => [c[i][0], c[i][1] + 4] as const;
  return (
    <g>
      <polygon
        points={points([c[0], c[1], c[2], c[3], drop(3), drop(2), drop(1), drop(0)])}
        className="fr-blank-side"
      />
      <polygon points={points(c)} className="fr-blank" />
    </g>
  );
});

// ——— Emblems ———

export function EmblemShape({
  emblem,
  x,
  y,
  r,
  className = 'fr-emblem',
}: {
  emblem: Emblem;
  x: number;
  y: number;
  r: number;
  className?: string;
}) {
  if (emblem === 'circle') return <circle cx={x} cy={y} r={r * 0.85} className={className} />;
  if (emblem === 'diamond')
    return (
      <path d={`M${x} ${y - r}L${x + r} ${y}L${x} ${y + r}L${x - r} ${y}Z`} className={className} />
    );
  if (emblem === 'triangle')
    return (
      <path
        d={`M${x} ${y - r}L${x + r} ${y + r * 0.8}L${x - r} ${y + r * 0.8}Z`}
        className={className}
      />
    );
  if (emblem === 'square')
    return (
      <rect
        x={x - r * 0.75}
        y={y - r * 0.75}
        width={r * 1.5}
        height={r * 1.5}
        rx={1}
        className={className}
      />
    );
  return <circle cx={x} cy={y} r={r * 0.45} className={className} />;
}

// ——— Venues ———

/** An isometric box with a hipped roof in the owner's colour. */
function Building({
  x,
  y,
  a,
  h,
  roof,
  sign,
}: {
  x: number;
  y: number;
  a: number;
  h: number;
  roof: string;
  sign?: boolean;
}) {
  const b = a * 0.5;
  return (
    <g>
      <path
        d={`M${x - a} ${y}L${x} ${y + b}V${y + b - h}L${x - a} ${y - h}Z`}
        className="fr-wall"
      />
      <path
        d={`M${x} ${y + b}L${x + a} ${y}V${y - h}L${x} ${y + b - h}Z`}
        className="fr-wall-shade"
      />
      <path d={`M${x - a} ${y - h * 0.55}L${x} ${y + b - h * 0.55}`} className="fr-timber" />
      <path
        d={`M${x - a - 1.5} ${y - h}L${x} ${y + b - h + 1.5}L${x} ${y - h - a * 0.9}Z`}
        fill={shade(roof, 0.15)}
      />
      <path
        d={`M${x} ${y + b - h + 1.5}L${x + a + 1.5} ${y - h}L${x} ${y - h - a * 0.9}Z`}
        fill={shade(roof, -0.25)}
      />
      <path
        d={`M${x - a * 0.62} ${y + b * 0.38}v${-h * 0.42}l${a * 0.26} ${a * 0.13}v${h * 0.42}Z`}
        className="fr-door"
      />
      <path
        d={`M${x + a * 0.25} ${y + b * 0.6 - h * 0.55}l${a * 0.4} ${-a * 0.2}v${h * 0.22}l${-a * 0.4} ${a * 0.2}Z`}
        className="fr-window"
      />
      {sign && (
        <g>
          <line
            x1={x - a * 0.1}
            y1={y + b - h * 0.75}
            x2={x - a * 0.1 - 6}
            y2={y + b - h * 0.75 - 3}
            className="fr-pole"
          />
          <circle cx={x - a * 0.1 - 7} cy={y + b - h * 0.75} r={3.2} className="fr-sign" />
        </g>
      )}
    </g>
  );
}

/** Copper brew kettle with a chimney and a little steam. */
function Kettle({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g>
      <ellipse cx={x} cy={y + 1} rx={8 * s} ry={3.4 * s} className="fr-shadow" />
      <path
        d={`M${x - 7 * s} ${y}v${-9 * s}a${7 * s} ${5 * s} 0 0 1 ${14 * s} 0v${9 * s}a${7 * s} ${3 * s} 0 0 1 ${-14 * s} 0Z`}
        className="fr-copper"
      />
      <path
        d={`M${x + 2 * s} ${y - 13 * s}a${4 * s} ${3 * s} 0 0 1 ${5 * s} ${4 * s}v${9 * s}a${7 * s} ${3 * s} 0 0 1 ${-5 * s} ${2.5 * s}Z`}
        className="fr-copper-shade"
      />
      <rect
        x={x - 1.5 * s}
        y={y - 23 * s}
        width={3 * s}
        height={10 * s}
        className="fr-copper-shade"
      />
      <circle cx={x - 3 * s} cy={y - 26 * s} r={2.6 * s} className="fr-steam" />
      <circle cx={x + 1 * s} cy={y - 30 * s} r={2 * s} className="fr-steam" />
    </g>
  );
}

function Kegs({ x, y }: { x: number; y: number }) {
  return (
    <g>
      {[
        [-4, 0],
        [4, 0],
        [0, -6],
      ].map(([dx, dy], i) => (
        <g key={i}>
          <ellipse cx={x + dx} cy={y + dy} rx={4} ry={4.6} className="fr-keg" />
          <path
            d={`M${x + dx - 4} ${y + dy - 1.5}h8M${x + dx - 4} ${y + dy + 1.5}h8`}
            className="fr-keg-band"
          />
        </g>
      ))}
    </g>
  );
}

function Bunting({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) {
  return (
    <g>
      <path
        d={`M${x1} ${y1}Q${(x1 + x2) / 2} ${(y1 + y2) / 2 + 6} ${x2} ${y2}`}
        className="fr-wire"
      />
      {[0.15, 0.32, 0.5, 0.68, 0.85].map((f, i) => {
        const x = x1 + (x2 - x1) * f,
          y = y1 + (y2 - y1) * f + Math.sin(f * Math.PI) * 6;
        return <path key={i} d={`M${x - 2.5} ${y}h5l-2.5 5Z`} className={`fr-flag-${i % 3}`} />;
      })}
    </g>
  );
}

/** Small props for built venue improvements, placed around the main building. */
const EXTRA_SPOTS = [
  [-24, 4],
  [24, -4],
  [-6, -18],
] as const;
function Extras({
  improvements,
  cx,
  cy,
  color,
  atlas,
}: {
  improvements: readonly string[];
  cx: number;
  cy: number;
  color: string;
  atlas: FrontierAtlas | null;
}) {
  return (
    <g>
      {improvements.slice(0, EXTRA_SPOTS.length).map((name, i) => {
        const x = cx + EXTRA_SPOTS[i][0],
          y = cy + EXTRA_SPOTS[i][1];
        if (atlas?.sprites[`venue-${name}`])
          return (
            <Sprite key={name} atlas={atlas} name={`venue-${name}`} cx={x} cy={y} scale={0.5} />
          );
        return name === 'warehouse' ? (
          <Building key={name} x={x} y={y} a={8} h={7} roof={shade(color, -0.1)} />
        ) : name === 'lab' ? (
          <g key={name}>
            <Building x={x} y={y} a={7} h={7} roof={shade(color, 0.2)} />
            <circle cx={x + 3} cy={y - 14} r={2.4} className="fr-flask" />
          </g>
        ) : (
          <Kegs key={name} x={x} y={y} />
        );
      })}
    </g>
  );
}

export const VenuePiece = memo(function VenuePiece({
  kind,
  cx,
  cy,
  level,
  color,
  improvements = [],
  atlas,
}: {
  kind: VenueKind;
  cx: number;
  cy: number;
  level: number;
  color: string;
  improvements?: readonly string[];
  atlas: FrontierAtlas | null;
}) {
  const name = kind === 'brewhouse' ? `brewhouse-${Math.min(3, Math.max(1, level))}` : kind;
  const extras = improvements.length > 0 && (
    <Extras improvements={improvements} cx={cx} cy={cy} color={color} atlas={atlas} />
  );
  if (atlas?.sprites[name])
    return (
      <g>
        <polygon points={hexPoints(cx, cy, 9)} className="fr-yard" />
        {extras}
        <Sprite atlas={atlas} name={name} cx={cx} cy={cy + 2} />
      </g>
    );
  return (
    <g>
      {extras}
      <polygon points={hexPoints(cx, cy, 9)} className="fr-yard" />
      {kind === 'festival' ? (
        <g>
          <path d={`M${cx - 20} ${cy + 4}L${cx} ${cy - 24}L${cx + 20} ${cy + 4}Z`} fill={color} />
          <path
            d={`M${cx} ${cy - 24}L${cx + 20} ${cy + 4}L${cx + 4} ${cy + 6}Z`}
            fill={shade(color, -0.25)}
          />
          <Bunting x1={cx - 34} y1={cy - 6} x2={cx + 34} y2={cy - 8} />
        </g>
      ) : kind === 'brewhouse' ? (
        <g>
          {level >= 3 && <Kettle x={cx - 20} y={cy - 6} s={0.8} />}
          <Building x={cx - 4} y={cy - 2} a={14} h={15} roof={color} />
          <Kettle x={cx + 18} y={cy + 2} />
          {level >= 2 && (
            <Building x={cx - 18} y={cy + 9} a={9} h={10} roof={shade(color, 0.1)} sign />
          )}
          <Kegs x={cx + 4} y={cy + 15} />
          {level >= 4 && <Bunting x1={cx - 34} y1={cy - 14} x2={cx + 30} y2={cy - 22} />}
        </g>
      ) : (
        <g>
          <Building x={cx} y={cy + 2} a={13} h={kind === 'pub' ? 17 : 13} roof={color} sign />
          <Kegs x={cx + 20} y={cy + 10} />
        </g>
      )}
    </g>
  );
});

// ——— Plots ———

export function PlotPiece({
  kind,
  cx,
  cy,
  color,
  atlas,
}: {
  kind: PlotKind;
  cx: number;
  cy: number;
  color: string;
  atlas: FrontierAtlas | null;
}) {
  const fence = hexCorners(cx, cy, 7);
  return (
    <g>
      <polygon points={points(fence)} className="fr-plot" stroke={color} />
      {atlas?.sprites[`plot-${kind}`] ? (
        <Sprite atlas={atlas} name={`plot-${kind}`} cx={cx} cy={cy} scale={0.85} />
      ) : kind === 'barleyField' ? (
        <g>
          {[-12, -4, 4, 12].map((dy, i) => (
            <path
              key={i}
              d={`M${cx - 24 + Math.abs(dy)} ${cy + dy}h${48 - Math.abs(dy) * 2}`}
              className="fr-row-crop"
            />
          ))}
        </g>
      ) : kind === 'hopTrellis' ? (
        <Hops at={cx * 7 + cy} cx={cx} cy={cy} />
      ) : kind === 'well' ? (
        <g>
          <ellipse cx={cx} cy={cy} rx={9} ry={5} className="fr-wall-shade" />
          <ellipse cx={cx} cy={cy - 2} rx={7} ry={3.5} className="fr-water" />
          <path d={`M${cx - 9} ${cy - 2}v-14M${cx + 9} ${cy - 2}v-14`} className="fr-pole" />
          <path d={`M${cx - 12} ${cy - 15}L${cx} ${cy - 24}L${cx + 12} ${cy - 15}Z`} fill={color} />
        </g>
      ) : (
        <Props ground={4} at={cx * 3 + cy} cx={cx} cy={cy} />
      )}
    </g>
  );
}

// ——— Rivalry ———

/** Charred beams, rubble and a toppled keg where a venue stood. */
export function RuinPiece({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g>
      <polygon points={hexPoints(cx, cy, 10)} className="fr-ash" />
      <path d={`M${cx - 16} ${cy + 4}l6 -14l4 1l-5 14Z`} className="fr-beam" />
      <path d={`M${cx + 2} ${cy + 6}l10 -16l4 2l-9 15Z`} className="fr-beam" />
      <path d={`M${cx - 6} ${cy + 8}h18l-3 -5h-12Z`} className="fr-rubble" />
      <path d={`M${cx - 22} ${cy + 8}l4 -5l5 1l1 4Z`} className="fr-stone" />
      <ellipse cx={cx + 16} cy={cy + 6} rx={4.6} ry={4} className="fr-keg" />
      <circle cx={cx - 2} cy={cy - 16} r={3} className="fr-smoke" />
      <circle cx={cx + 3} cy={cy - 22} r={4} className="fr-smoke" />
    </g>
  );
}

/** Smoke over a damaged venue, and a broken door for a breached one. */
export function DamageOverlay({ cx, cy, breached }: { cx: number; cy: number; breached: boolean }) {
  return (
    <g className="fr-damage">
      <circle cx={cx - 6} cy={cy - 30} r={4} className="fr-smoke" />
      <circle cx={cx - 1} cy={cy - 38} r={5.5} className="fr-smoke" />
      <circle cx={cx + 6} cy={cy - 47} r={6.5} className="fr-smoke" />
      <path d={`M${cx - 18} ${cy + 2}l5 -3l2 4l4 -2`} className="fr-crack" />
      {breached && (
        <g>
          <path d={`M${cx + 10} ${cy + 14}l6 -10l3 2l-6 10Z`} className="fr-beam" />
          <path d={`M${cx - 26} ${cy + 10}h10l-2 -4h-6Z`} className="fr-rubble" />
        </g>
      )}
    </g>
  );
}

/** A low wall of stacked barrels around a fortified venue (front half only). */
export function Palisade({ cx, cy }: { cx: number; cy: number }) {
  const corners = hexCorners(cx, cy, 4);
  const front = [corners[1], corners[2], corners[3], corners[4], corners[5]];
  const barrels: (readonly [number, number])[] = [];
  for (let i = 0; i < front.length - 1; i++)
    for (const f of [0.2, 0.6]) {
      const [x1, y1] = front[i],
        [x2, y2] = front[i + 1];
      barrels.push([x1 + (x2 - x1) * f, y1 + (y2 - y1) * f]);
    }
  return (
    <g>
      {barrels.map(([x, y], i) => (
        <g key={i}>
          <ellipse cx={x} cy={y} rx={3.6} ry={4.2} className="fr-keg" />
          <path d={`M${x - 3.6} ${y - 1}h7.2`} className="fr-keg-band" />
        </g>
      ))}
    </g>
  );
}

/** Condition strip under a venue banner. */
export function DurabilityStrip({
  x,
  y,
  value,
  max,
}: {
  x: number;
  y: number;
  value: number;
  max: number;
}) {
  const ratio = Math.max(0, Math.min(1, value / Math.max(1, max)));
  return (
    <g>
      <rect x={x - 18} y={y} width={36} height={5} rx={2.5} className="fr-dur-bg" />
      <rect
        x={x - 17}
        y={y + 1}
        width={34 * ratio}
        height={3}
        rx={1.5}
        className={ratio >= 1 ? 'fr-dur-full' : ratio > 0.4 ? 'fr-dur-mid' : 'fr-dur-low'}
      />
    </g>
  );
}

/** A recent incident on this tile. */
export function IncidentBurst({ x, y, kind }: { x: number; y: number; kind: string }) {
  return (
    <g>
      <path
        d={`M${x} ${y - 9}l2.6 5.4l5.8 -1.6l-3.2 5l4 4.2l-5.8 0.6l-0.8 5.8l-2.6 -4.6l-2.6 4.6l-0.8 -5.8l-5.8 -0.6l4 -4.2l-3.2 -5l5.8 1.6Z`}
        className={kind === 'rebuild' ? 'fr-burst-good' : 'fr-burst'}
      />
    </g>
  );
}

// ——— Couriers ———

function Rider({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g>
      <path d={`M${x - 3} ${y}l-2 -9h6Z`} fill={color} />
      <circle cx={x - 2} cy={y - 12} r={3.4} className="fr-skin" />
      <path d={`M${x - 5.5} ${y - 13}a3.6 3.6 0 0 1 7 0Z`} fill={shade(color, -0.35)} />
    </g>
  );
}

function Figure({ kind, color }: { kind: CourierKind; color: string }) {
  if (kind === 'walker')
    // A courier pulling a two-wheeled keg cart.
    return (
      <g>
        <path d="M-2 0v-8M3 0v-8" className="fr-leg" />
        <path d="M-5 -8l1.5 -12h8l1.5 12Z" fill={color} />
        <circle cx={0.5} cy={-24} r={4.2} className="fr-skin" />
        <path d="M-3.8 -25a4.4 4.4 0 0 1 8.6 0l1.5 0.5h-11.6Z" fill={shade(color, -0.35)} />
        <path d="M4 -14l8 4" className="fr-pole" />
        <ellipse cx={15} cy={-7} rx={5.5} ry={6} className="fr-keg" />
        <path d="M9.5 -8.5h11M9.5 -5h11" className="fr-keg-band" />
        <circle cx={15} cy={-1} r={3} className="fr-wheel" />
      </g>
    );
  // Bike with a keg up front, or a cargo trike with a crate.
  return (
    <g>
      <circle cx={-10} cy={-5} r={5.5} className="fr-wheel" />
      <circle cx={10} cy={-5} r={5.5} className="fr-wheel" />
      <path d="M-10 -5l6 -8h9l5 8M-4 -13l4 8l5 -8" className="fr-frame" />
      {kind === 'cargo' ? (
        <g>
          <path d="M6 -21h13v9h-13Z" className="fr-crate" />
          <path d="M6 -21l3 -3h13l-3 3Z" className="fr-crate-top" />
        </g>
      ) : (
        <g>
          <ellipse cx={12} cy={-17} rx={4.4} ry={4.8} className="fr-keg" />
          <path d="M7.6 -18h8.8M7.6 -15.5h8.8" className="fr-keg-band" />
        </g>
      )}
      <Rider x={-2} y={-13} color={color} />
    </g>
  );
}

export function CourierPiece({
  kind,
  cx,
  cy,
  color,
  emblem,
  dim,
  ghost,
  atlas,
}: {
  kind: CourierKind;
  cx: number;
  cy: number;
  color: string;
  emblem: Emblem;
  dim?: boolean;
  ghost?: boolean;
  atlas: FrontierAtlas | null;
}) {
  return (
    <g opacity={ghost ? 0.5 : dim ? 0.7 : 1}>
      <ellipse cx={cx} cy={cy + 2} rx={18} ry={7} className="fr-shadow" />
      <ellipse cx={cx} cy={cy + 1} rx={16} ry={6.4} fill={shade(color, -0.3)} />
      <ellipse cx={cx} cy={cy - 0.5} rx={16} ry={6.2} fill={color} />
      <EmblemShape emblem={emblem} x={cx - 10} y={cy} r={2.6} />
      {atlas?.sprites[kind] ? (
        <Sprite atlas={atlas} name={kind} cx={cx} cy={cy + 2} scale={1.7} />
      ) : (
        <g transform={`translate(${cx - 2} ${cy - 1})`}>
          <Figure kind={kind} color={color} />
        </g>
      )}
    </g>
  );
}

// ——— Badges and banners ———

export function ReadyBadge({ x, y }: { x: number; y: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={6.5} className="fr-ready" />
      <path d={`M${x - 2.8} ${y + 1.5}l2.8 -3l2.8 3`} className="fr-ready-mark" />
    </g>
  );
}

export function VenueBanner({
  x,
  y,
  level,
  growth,
  color,
  emblem,
}: {
  x: number;
  y: number;
  level: number;
  growth?: { value: number; max: number };
  color: string;
  emblem: Emblem;
}) {
  const pips = growth ? Math.min(6, growth.max) : 0;
  const width = 34 + pips * 6;
  const left = x - width / 2;
  return (
    <g>
      <rect
        x={left}
        y={y - 10}
        width={width}
        height={20}
        rx={10}
        fill={color}
        className="fr-banner"
      />
      <circle cx={left + 10} cy={y} r={7} className="fr-banner-chip" />
      <EmblemShape emblem={emblem} x={left + 10} y={y} r={3.6} className="fr-banner-emblem" />
      <text x={left + 24} y={y + 4.2} className="fr-banner-text">
        {level}
      </text>
      {growth &&
        Array.from({ length: pips }, (_, i) => (
          <circle
            key={i}
            cx={left + 34 + i * 6}
            cy={y}
            r={2.2}
            className={i < growth.value ? 'fr-pip-on' : 'fr-pip'}
          />
        ))}
    </g>
  );
}

// ——— Ingredients ———

export function IngredientToken({ x, y, kind }: { x: number; y: number; kind: Ingredient }) {
  return (
    <g>
      <circle cx={x} cy={y + 1.5} r={9} className="fr-shadow" />
      <circle cx={x} cy={y} r={9} className={`fr-res fr-res-${kind}`} />
      {kind === 'hops' ? (
        <g className="fr-res-mark">
          <path d={`M${x} ${y - 5.5}c4 1 4.5 7 0 10.5c-4.5 -3.5 -4 -9.5 0 -10.5Z`} />
          <path d={`M${x - 3} ${y - 1}h6M${x - 2.4} ${y + 2}h4.8`} className="fr-res-line" />
        </g>
      ) : kind === 'water' ? (
        <path
          d={`M${x} ${y - 5.5}c3 4 4.5 6 4.5 8a4.5 4.5 0 0 1 -9 0c0 -2 1.5 -4 4.5 -8Z`}
          className="fr-res-mark"
        />
      ) : kind === 'yeast' ? (
        <g className="fr-res-mark">
          <circle cx={x - 2} cy={y + 1} r={2.6} />
          <circle cx={x + 2.4} cy={y - 1.6} r={2} />
          <circle cx={x + 1.5} cy={y + 3} r={1.4} />
        </g>
      ) : kind === 'fruit' ? (
        <circle cx={x} cy={y + 0.5} r={4.5} className="fr-res-mark" />
      ) : (
        <path
          d={`M${x} ${y + 5.5}V${y - 5}M${x} ${y - 1}l-3.5 -3.5M${x} ${y - 1}l3.5 -3.5M${x} ${y + 2.5}l-3.5 -3.5M${x} ${y + 2.5}l3.5 -3.5`}
          className="fr-res-stroke"
        />
      )}
    </g>
  );
}

// ——— HTML icons ———

const ICONS = {
  coins: (
    <>
      <ellipse cx="12" cy="8" rx="7" ry="3" />
      <path d="M5 8v4c0 1.7 3.1 3 7 3s7-1.3 7-3V8M5 12v4c0 1.7 3.1 3 7 3s7-1.3 7-3v-4" />
    </>
  ),
  star: <path d="m12 3 2.6 5.6 6 .7-4.5 4.1 1.2 6L12 16.4l-5.3 3 1.2-6L3.4 9.3l6-.7Z" />,
  skill: (
    <>
      <path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3" />
      <path d="M7.5 15h9" />
    </>
  ),
  round: (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  venue: <path d="M4 20V10l6-4 6 4v10M16 20v-7h4v7M3 20h18M8 20v-4h4v4M18 9V4" />,
  courier: (
    <>
      <circle cx="6" cy="17" r="3.5" />
      <circle cx="18" cy="17" r="3.5" />
      <path d="M6 17l4-7h5l3 7M10 10l2-3h3M15 10l-3 7" />
    </>
  ),
  route: (
    <>
      <circle cx="6" cy="18" r="2" />
      <circle cx="18" cy="6" r="2" />
      <path d="M8 18h6a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h6" />
    </>
  ),
  keg: (
    <>
      <path d="M7 4h10c1.5 3 1.5 13 0 16H7C5.5 17 5.5 7 7 4Z" />
      <path d="M6 9h12M6 15h12" />
    </>
  ),
  contract: <path d="M7 3h8l4 4v14H7ZM15 3v4h4M10 12h6M10 16h6" />,
  growth: <path d="M12 21V11M12 11c0-4 3-6 7-6 0 4-3 6-7 6ZM12 14c0-3-2.5-5-6-5 0 3 2.5 5 6 5Z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  locate: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
    </>
  ),
  next: <path d="M6 5l7 7-7 7M14 5l6 7-6 7" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.3-1 .9-1 1.5V14M12 17.5v.01" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  open: <path d="M4 20h16M6 20V9h12v11M9 9V5h6v4M10 14h4" />,
  shield: <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6Z" />,
  flag: <path d="M5 21V4M5 4h11l-2 4 2 4H5" />,
  ruin: <path d="M3 20h18M5 20v-6l3-2v8M11 20v-9l3 2v7M17 20v-4l2-1v5M9 7l1-3M14 8l2-3" />,
  hammer: <path d="M14 6l4 4M12 8l6-6 4 4-6 6M13 11 4 20l-1-1 9-9" />,
  target: (
    <>
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  trophy: (
    <path d="M8 4h8v5a4 4 0 0 1-8 0ZM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8 20h8M9 17h6" />
  ),
} satisfies Record<string, ReactNode>;
export type IconName = keyof typeof ICONS;

export function Icon({ name, className = 'size-5' }: { name: IconName; className?: string }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={`shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {ICONS[name]}
    </svg>
  );
}

/** A small piece of the board for panels and legends; the hex centre is (0, 0). */
export function Swatch({ children }: { children: ReactNode }) {
  return (
    <svg
      aria-hidden="true"
      viewBox={`${-R - 4} ${-R - 12} ${2 * R + 8} ${2 * R + 18}`}
      className="fr-swatch"
    >
      {children}
    </svg>
  );
}
