# Gaute Brewtown

An original brewing-town strategy game for 2–4 players. A closed planet of hexagonal and pentagonal
neighbourhoods, small breweries, cargo bikes and festival pavilions replace the
old Frontier prototype. The folder/slug stays `frontier` so existing simulator
links remain valid. All art is original Blender geometry.

Build ingredient plots, develop recipes and plan fermentation around delivery
contracts. Walking couriers carry two kegs; researched bikes move farther and
cargo carts carry six. Each batch ties up a fermentation vessel for several rounds. Ready batches must be loaded, transported and delivered to the right
venue before the deadline. Rival crews can attack, take over or demolish venues, so production also supplies territorial competition.

Raids spend a ready crew's action, two coins and a carried keg. Damage stops the
venue's income, ingredient plots and fermentation. Ready defending crews reduce
damage. Repairing restores four durability for four coins once per round;
reinforcement adds four maximum durability for six coins. Breached venues can
be taken over for eight coins or demolished for three. Takeovers transfer the
venue and its ingredient plots, while demolition destroys them and leaves ruins.
Queued batches are lost in either case. Rebuilding costs ten coins.

The 12-skill tree has Brewing, Logistics and Hospitality branches. Skills unlock
recipes, wider exploration, larger delivery teams, efficient procurement,
warehouses and reputation bonuses. Ingredient plots generate stock, yeast labs
generate knowledge, and beer gardens earn reputation. Expanding a venue increases
income and fermentation capacity. Money, knowledge, ingredients, capacity and time
all constrain different choices.

The town has four early victory routes: control every surviving rival venue; 60 reputation; three festival deliveries
with 30 reputation; or five venues with eight deliveries. If nobody reaches one,
score reputation, recipe variety, skills and venues after 24 rounds. Delivery
contracts are reserved exclusively, and each venue presents a new request when
its previous one is finished or expired.

## Play locally

Use the repository's pinned Node and npm versions:

```sh
node tools/cli.mjs dev official/frontier
```

Open `http://127.0.0.1:4800/?game=frontier`. Choose `phones` for independent
players or `pass` for private handovers. Start with the smallest town.

On separate phones everyone acts during the same round. Ready commits that
player for the round; other players can continue. The last active player to
finish advances income, fermentation, ingredient harvests and crew readiness
once for everyone. Departures release this barrier when the remaining players
are ready. The pass mode keeps sequential turns and private handovers.

Actions resolve against the latest authoritative state. The first successful
claim reserves an order or vacant venue; a competing claim is rejected without
charging resources. Ready includes the displayed round number, so delayed or
repeated requests cannot finish the following round. There is no round timer.

The phone layout keeps the globe visible until a player selects something.
Drag and pinch control it; the keyboard remains available on computers. The
bottom row holds Skills, Orders, Couriers and Ready. Rules stay in Help, and
scroll indicators are hidden without disabling scrolling.

The first useful loop is to brew house ale, gather while it ferments, load two
ready kegs onto the starting courier, explore toward a pub, accept its request
and deliver. Research and a different recipe are choices after that first loop.

## Source and validation

- `systems.ts`: recipe, courier, ingredient-plot and skill definitions.
- `model.ts`: deterministic economy, hex topology, routes and private views.
- `logic.ts`: validated SDK actions and session results.
- `client.tsx`, `ui/`, `style.css`, `strings.ts`: UI and English/Norwegian text.
- `assets/models/`: original Blender props, delivered as losslessly compressed GLBs.
- `planet*.ts`, `ui/board*.tsx`, `ui/board-scene.ts`: closed grid, globe camera and 3D placement.
- `art/`: editable Blender source and reproducible render/pack tools. See its README.

```sh
npm run check
npm test
npm run build
node --experimental-strip-types tools/frontier-benchmark.ts
```

The benchmark writes `dist/brewtown-benchmark.json`, or the path passed as its
first argument. It uses the actual bundle and the expanded default QuickJS limits. Each
case runs 12 identical actions with fresh runtimes and a warm WASM module.
Synthetic operating positions exercise multiple venues, couriers, fermentation
queues and all skills. Cases beyond the supported map/team limits are marked
as diagnostics. A failure in a supported case makes the command fail.

Local process measurements include serialization and every player's view. They
do not measure Convex latency, transport, Android/iOS rendering or human enjoyment.
Avoid concurrent builds when comparing times. The previous military prototype's
measurements are historical and do not describe this ruleset.

The host still limits games to evening sessions. Local state is lost when the
app closes. Server sessions expire after 12 hours idle, and publication of an
updated game ends older sessions. Multi-day games require a separate host change.
