# Gaute Brewtown UI

The globe uses the original Blender GLBs. The phone layout has a compact
resource header and a bottom row for Skills, Orders, Couriers and Ready. Idle
play has no inspector. Selecting a district opens its inspector above the
bottom row; it moves to the right at 860 px and wider. There are no map, zoom or
focus buttons. Drag, pinch and keyboard controls remain available.

On a 390 × 844 browser viewport the idle globe uses 711 px, or 84% of the height.
This is a browser measurement, not a native device performance result.

Skills use one connected branch at a time on phones, with 44 px branch selectors
and the selected skill's price and purchase control below it. Wider screens show
all three branches. Tutorial prose lives in Help. Selected action costs,
prerequisites, blocked reasons and destructive consequences remain visible.
Scrollbars are hidden by the SDK page and the app host; scrolling still works.

`wire.ts` binds the typed rule view and actions to `contract.ts`. `board.tsx`
owns gestures and scene lifetime, `board-scene.ts` the oblique camera and prop
placement, and `planet-mesh.ts` / `planet-fog.ts` the terrain and exploration cover.
`panel.tsx` and `rivalry.tsx` hold inspectors; `hud.tsx` holds the resource bar,
orders, ledger, standings, help and results.

Phone rounds use `view.canAct` and `view.finished`. The round changes only when
all remaining players are ready. Round changes clear pending travel but preserve
the phone camera and selection. Pass mode still resets selection for handovers.
`endTurn` must include `{ round }`; the rules reject stale round numbers.

## Rules integration points

- `wire.ts` assigns `model.view` to `BrewWire`. A drift between the view and the
  contract is a type error there.
- The venue `specialty` text is split into `improvements`, with `fortified`
  removed. `fortified` becomes `fortification`. Exposing `improvements: string[]` and
  `fortification` directly in the view would remove this mapping.
- **Mirrored rule numbers (remove when the view supplies them).** `wire.ts`
  derives `siege`, `defense` and `rebuilds` from the view. It also copies raid
  costs and reasons from `model.ts`:
  - costs: raid 2, takeover 8, demolish 3, repair 4, fortify 6, rebuild 10
  - adjacency: the closed planet graph in `planet-rules.ts`
  - raid damage: `max(1, strength - min(2, ready defenders on the venue))`
  - blocked reasons: spent crew, missing keg, coins, already repaired, already reinforced

  If `model.view` adds these arrays (shapes in `contract.ts`), delete
  `rivalry()` in `wire.ts`. The panels need no change.

- The gather `gain` is parsed as `+N ingredient` for translation. A structured
  `{ amount, ingredient }` would be safer.
- Every English text the rules send must exist in `../strings.ts`, with NB. That
  covers titles, details, skill descriptions and unlocks, recipe keys, plot kinds,
  client names and every `invalid()` and blocked reason. The current set is
  complete. Add new rule text to the generator table there.
- The start sizes are `MAP_SIZES` in `wire.ts`. They match the `start` validator.

## Interaction

- Tap your courier to show its reach (purple) and raid targets (red dashed). Tap
  a reach tile twice, or confirm, to travel. Tap a red target to open its panel
  with that courier preselected as the crew.
- Tapping the same tile again cycles courier → venue → tile.
- The keyboard map is `role="application"`. Arrow keys move along the hex rows,
  Enter selects, Escape cancels and plus/minus zoom. A polite live region
  announces each tile.
- Below `PICK_ZOOM`, a diamond is under 44 px, so a tap zooms in instead of
  selecting.
- Gaute waves at the start of your turn in phones mode. He goes `oops` when a
  rival hits you and celebrates a win.

## Art

The board uses the generated terrain and transparent props in `ART_NAMES`.
Flat-top hexes use the atlas camera's 30-degree elevation. The projected grid
transposes rule rows and columns, preserving cell IDs and rule adjacency.
Ground and props share the same measured anchor and scale. Ruins, damage,
territory borders and reach markers remain SVG overlays.

Zoom resizes the SVG viewport instead of applying CSS scale to a cached board
image. The atlas is rendered at 480 pixels per cell for enlarged views.
Ingredient markers appear for the selected venue's gathering options.

Research uses three branch selectors, connected skill emblems and a separate
inspection panel. Phones stack the path and inspection; wider screens place them
side by side. Prerequisite links also navigate to the required skill.

## Known gaps

- Phones and tablets: pan/zoom and render performance at 24×24 have not been
  measured on devices. The ground layer is memoised; gestures do not re-render.
