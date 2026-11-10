// Contract between the board renderer and bundled art (official/frontier/art.ts).
//
// The board uses bundled terrain and prop sprites. Procedural drawings remain
// as fallbacks when an atlas omits a matching name. Overlays
// (memory veil, borders, reach, banners, badges, owner plinths) stay procedural
// so ownership and state remain legible on any art.
//
// Sheet: a bundled `data:` URI (no network). Each sprite cell is a diorama whose
// hex ground centre sits on `anchor`, with the hex top face `groundWidth` sheet
// pixels wide point-to-point (flat-top, tilted to TILT in geometry.ts). Keep all
// sprites at one scale.
//
// Names the board looks up:
//   ground-0 fields · ground-1 hops · ground-2 hills · ground-3 water ·
//   ground-4 orchard · ground-5 town
//   brewhouse-1 · brewhouse-2 · brewhouse-3 · taproom · pub · festival
//   walker · bike · cargo           (couriers, transparent, feet on the anchor)
//   improvement-<kind>              (reserved for tile improvements)

/** [x, y, width, height] in sheet pixels. */
export type SpriteRect = readonly [number, number, number, number];

export type FrontierAtlas = {
  href: string;
  width: number;
  height: number;
  anchor: readonly [number, number];
  groundWidth: number;
  sprites: Readonly<Record<string, SpriteRect>>;
  /** Optional desaturated copy for explored tiles outside vision (see fog.ts). */
  fogHref?: string;
};
