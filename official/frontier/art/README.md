# Gaute Brewtown art

Original cozy brewery-town models with raised wooden hex tiles. Copper brewing
vessels, hop vines, barley, plum roofs, lanterns and delivery vehicles describe
production, trade and neighbourhood celebration. Every model is editable Blender
geometry. No downloaded meshes, textures or reference artwork are included.

## Playable 3D board

The game now uses `ui/board.tsx` and the shared SDK scene renderer. Importable GLBs
live in `assets/models/`; `ui/models.ts` registers them. The original Blender
geometry supplies every terrain, venue, plot and courier. Ownership shapes, route
markers, fortification barrels, damage smoke and ruins are also actual geometry.
The old atlas remains an editable reference and is no longer in the game bundle.

```sh
blender -b -t 4 -P official/frontier/art/export-frontier.py
```

The exporter reads `frontier-models.blend` directly. It keeps the original
geometry, modifiers, normals, UVs and PBR materials. Complete collection exports
are in `art/reference-models/`. Game props omit only the gallery support slabs;
terrain decorations sit on the new spherical district surface. The `.blend` file
is never saved or rewritten by the exporter.

The SDK compresses the GLB files losslessly for delivery and reconstructs the
original bytes in the WebView. Static geometry is batched by material at runtime
without decimation. Fog is a single connected, billowing canopy above unexplored districts. Its vertex opacity clears as the rules reveal terrain. It is not a set of isolated cloud props.

The globe's local camera uses 38° elevation above the focused district's tangent
plane, with a maximum orthographic span of 15. This exposes the original walls,
copper vessels and upright couriers without changing their proportions. The
target sits 0.5 units above the district to centre the props. Zooming beyond span
17 raises the camera continuously to a radial 90° whole-planet view. Prop culling
uses the actual eye-to-target direction. Picking and courier reveal also check
the projected viewport margins, so narrow screens refocus off-screen districts.
The camera refinement requires no new GLBs or Blender variants.

Near southern latitudes the local camera gradually raises its elevation. This
keeps its sightline away from the renderer's world-up axis, which otherwise
causes a 180° orientation flip while dragging or zooming. Overview remains radial.

Props sit against the actual district triangle fan, which drops below the
tangent plane toward the cell edges. Placement samples the prop footprint and
adds a 0.025-unit overlap with the ground. Couriers stand toward the front of a
venue, inside the district boundary, rather than over the corner seam. Level
and ready markers sit near the ground. Geometry, materials and the original
Blender source remain unchanged.

## Historical sprite integration contract

Import `frontierAtlas`, `frontierLayout`, `FrontierSprite`,
`frontierSpriteStyle` and `frontierHexCenter` from `../art`. The historical folder
name remains `frontier`; the art direction and asset names are Brewtown.

The atlas is **2880 × 1920**, six columns by four rows of **480 × 480** cells.
`atlas.json` lists every named `[x, y, width, height]` rectangle;
`atlas-layout.ts` exports the same data for TypeScript.

All sprites share ground-center pivot **(240, 319.602)** within their cell.
The regular world-space hexagon has radius 1.9. In screen space its top ground
footprint is **388.085 × 168.046** pixels. The hex points left and right, with
flat top and bottom edges. The wooden rim extends below this ground plane.
The orthographic camera has 30° elevation and -45° azimuth.

For screen tile width `W`, scale every sprite by `W / 388.085`.
Use an odd-column offset grid:

```ts
const H = (W * Math.sqrt(3)) / 4;
const x = column * W * 0.75;
const y = (row + (column % 2) * 0.5) * H;
```

`frontierHexCenter` implements this using the measured atlas proportions.
Sort by projected ground-center y, then x. Within a cell, paint terrain, props,
owner marker, then worker or vehicle. All props have independent transparent
backgrounds and soft shadows. They do not include a ground tile. Woodland and
hills are full terrain variants; use meadow underneath placed buildings if their
silhouettes should stay clear.

For DOM rendering, position a relative wrapper at the projected ground center,
then put `frontierSpriteStyle('brewery', W)` on its child. The helper sets the
cell bounds, anchor offsets and atlas background coordinates. Keep these children
non-interactive, and attach accessible labels and touch targets to the tile.
For SVG, use a nested SVG with the scaled cell bounds, a `viewBox` equal to the
named rectangle, and a single atlas image at `(0,0)`, size `2880 × 1920`. Clip the
nested SVG. Canvas renderers can pass the named source rectangle to `drawImage`.

The asset data module embeds the WebP as a data URI for the network-free sandbox.
Import it once. Do not also import the binary WebP, blend file or review images.

## Asset roles

| Group       | Names                                                 | Visual role                                                                                    |
| ----------- | ----------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Ground      | meadow, barleyMeadow                                  | Open land and wild grain                                                                       |
| Landscape   | woodland, pineWoodland, hill, spring, water, hopGrove | Timber, gentle raised hills, flowing spring, water and wild hops                               |
| Production  | brewery, brewhouse                                    | Small brewery with visible copper kettle; taller expanded building with second vessel and pipe |
| Hospitality | taproom, festival, beerGarden                         | Pub awning and seating; lantern pavilion; picnic tables with string lights                     |
| Logistics   | warehouse, cargoBike, deliveryCart, kegs              | Wide store doors and barrel yard; open-frame cargo bike; two-wheel keg cart; barrel stack      |
| Ingredients | hopTrellis, barleyField, well                         | Climbing hops, ripe grain rows, water well                                                     |
| Research    | yeastLab                                              | Glass-colored sample flasks on an outdoor bench, skylight and copper exhaust                   |
| Makers      | brewer, builder, surveyor                             | Plum apron and stirring paddle; hard hat, plank and toolbox; map and tripod level              |

Ownership color is a code-native ellipse beneath workers/vehicles, plus a small
owner badge above a building. Suggested ellipse radii are `0.20W` and `0.09W`.
Use an owner color and contrasting outline; preserve a number/shape label for
accessibility. Aprons, roofs and flags are never recolored. No extra tint atlas
or duplicate team variants are necessary.

## Rebuild and visible review

From repository root:

```sh
blender -b -t 4 -P official/frontier/art/render.py
python official/frontier/art/pack.py
```

Blender 5.2.3 renders 24 sprites with a shared orthographic camera, two area
lights, transparent film, Cycles soft shadows and 32 denoised samples. The packer
uses installed ImageMagick, fontconfig, Python's standard library and the
repository formatter. It generates the WebP, embedded TypeScript, metadata,
contact sheet, and self-contained `review.html`. No installation is needed.

`frontier-models.blend` contains the current editable Brewtown gallery in named
collections. Rebuild it in Blender's interactive Python console:

```python
import runpy
runpy.run_path('/absolute/path/to/official/frontier/art/showcase.py')
```

This replaces the current Blender scene and saves the gallery file.
`desktop-review.png` records the actual Blender viewport. `contact-sheet.png`
shows full-size renders. `review.html` assembles the compressed sprites on a hex
sample board and offers a 48–96 pixel tile-width slider and light/dark terrain
backdrops. These source/review artifacts are excluded from the runtime payload.

## Raster budget

The final 2880 × 1920 atlas is 207,740 bytes. Its data URI is 277,011 bytes; the
embedded module is 202,854 bytes after gzip. Each cell is rendered at three times
the original resolution so enlarged tiles remain sharp. Source and review artifacts
are never imported into the runtime.

## Remaining scope

One static facing per maker/vehicle. No fermentation animations, recipe-specific
bottles, route overlays, coast adjacency or season variants. The art does not
implement game rules. Physical-device performance remains unmeasured. Validate the integrated client
bundle against `GAME_LIMITS` after changes to art or rendering.
