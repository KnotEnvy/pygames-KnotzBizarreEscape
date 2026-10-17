# Campaign: Missions in 3 Parts (Phase E)

Every **mission** is one stop on Knotz's escape route and has **3 parts**:

| Part | Role | Ends with |
|---|---|---|
| **I** | Infiltrate and break out. Teaches the biome. | A **mid-boss** |
| **II** | A set-piece with a different rhythm (vehicle, train, chase, vertical climb...). | A **mid-boss** |
| **III** | The approach to the biome's lair. Short and intense. | The mission's **main boss**, then MISSION COMPLETE |

Score, lives, bombs, weapon, ammo and the rescue tally carry from part to part. Each part has its own checkpoints.
Between parts there's a **PART CLEAR** tally, then a **title card** with a short radio briefing (story stays light:
one to three lines a part).

## The escape route (outline; only Mission 1 is being built)

Knotz breaks out of the Bizarre Regime's mountain prison and flees south. Radio contact **Hazel** (resistance
operator, heard on the radio, never seen) guides him. Behind every war machine is the Regime's mad engineer,
**Dr. Von Antler**, who builds animal-shaped war machines.

| # | Mission | Biome | Main boss |
|---|---|---|---|
| 1 | **Pine Ridge Breakout** | Snowy mountains: prison camp, logging railway, frozen lake | **MOOSEZILLA** |
| 2 | Rust Canyon *(future)* | Desert mining railyard | Sand-scorpion drill tank |
| 3 | Bayou Blackout *(future)* | Swamp, stilt villages | Gator-naut |
| 4 | Neon Harbor *(future)* | Night city docks | Octo-dreadnought |
| 5 | The Bizarre Citadel *(future)* | Regime HQ | Von Antler's mech, KING ANTLER |

## Mission 1: Pine Ridge Breakout

### Part I: "THE CAMP" (map `m1p1`, the existing 6720 px map)
The prison camp, pine forest, rope bridge, outpost and bunker are unchanged. The end changes: the fenced yard at
x 6240–6720 now holds **WARDEN'S SNOWCAT** instead of MOOSEZILLA. After it dies, a logging train's whistle blows in the
distance → PART CLEAR.
- Briefing (Hazel): "Knotz, you're out of the cell. Get past the camp. There's a logging train leaving the valley tonight."

**Mid-boss: WARDEN'S SNOWCAT** (`boss:snowcat`, about 150 HP on the MOOSEZILLA scale). It's an armored snow tractor (about 112×64)
with treads, a front plow and roof hatches. The camp's **Warden**, a comic, pompous officer, mans a roof MG.
- **Plow charge.** Engine revs, exhaust puffs and the treads spin for at least 600 ms, then it charges. It always stops short and leaves
  a ≥ 48 px safe gap at the wall, then backs up.
- **Roof mortar.** Three arcing shells. Each landing spot gets a blinking ground marker first.
- **MG sweep.** The Warden sweeps at standing height. **Crouching dodges it** (this teaches crouch before Part II).
- Weak points: the rear engine grille, and the Warden himself, who takes 2×. Death: the Warden ejects with a parachute and
  shakes his fist, the snowcat chain-explodes, and the treads roll away.

### Part II: "TIMBER EXPRESS" (map `m1p2`, about 4800–5600 px)
Knotz fights along the roof and flatcars of a **moving logging train** heading down the mountain toward the locomotive.
The world is static. **Motion is an illusion**: parallax layers drift at train speed, telegraph poles and pines
whip past in a foreground speed layer, snow streaks sideways, and wheels and couplings animate.
- Cars: log flatcars (log stacks are cover and platforms), boxcars (roofs, side doors enemies burst from), a
  gondola of coal, a flatcar turret, and gaps between cars (falling to the tracks = death, like Contra).
- **Low bridges.** A "DUCK!" sign and the train horn give warning. Then an overhead beam sweeps across the screen at
  train speed at standing height. Crouch, or be on a low car. **Tunnels**: darkness plus passing lamps (visual only).
- Enemies: grunts, grenadiers on roofs, shield troopers, drones, paratroopers dropped by a **Buzzard** gunship,
  and new **leapers** that jump onto the train from trackside.
- One camera-lock arena mid-train (the gun car), then the end arena.
- Briefing (Hazel): "You made the train! The Regime armored the locomotive. Stop it before the trestle."

**Mid-boss: IRONHORN** (`boss:ironhorn`, about 220 HP). This armored locomotive takes up the right side of the end arena,
seen from behind on its tender.
- Phase 1: two rear-facing **cannon turrets** fire telegraphed shells. Destroy each one.
- Phase 2: the **smokestack** spews burning cinders that rain in arcs, with ground markers.
- Phase 3: the **cab** opens and the driver hurls coal and grenades. The **boiler** core is exposed and takes 2×.
- Death: the boiler bursts, the train derails and plunges toward the frozen lake → PART CLEAR.

### Part III: "MOOSE LAKE" (map `m1p3`, about 3200–3800 px, then the boss arena)
The derailed train's crash site on a frozen lake shore, then across the ice to Dr. Von Antler's lakeside lab
(Project ANTLER). Blizzard, dusk, searchlights.
- Hazards: **slippery ice** (tile `material=ice`), **cracking ice** (tile `crack=true` cracks once stepped on and becomes
  water after about 600 ms, with clear crack frames), ice floes over open water.
- Enemies: grunts, shield troopers, turrets on the lab walls, and new **hounds** (fast mutant attack dogs with antler
  nubs that charge and leap, in packs of 2–3). One camera-lock arena at the lab gate.
- **Main boss: MOOSEZILLA**, moved here from Part I and unchanged, in a lab-yard arena on the lake. The gate bursts as before.
  During phase 3 its stomps may crack the arena ice (event `boss:stomp`), opening hazard holes.
- Briefing (Hazel): "Von Antler's lab is across the lake. Whatever he's got in there, end it, then we're gone."
- Clear → MISSION COMPLETE → Results (mission totals across all 3 parts).

## Contract (Engine implements; every team codes against this)

### Campaign data: `src/config/campaign.ts` (Engine owns; values come from this doc)
```ts
export type PartId = `${number}-${number}`;          // '1-1', '1-2', '1-3'
export interface PartDef {
  id: PartId; mission: number; part: number;         // 1-based
  title: string;        // 'THE CAMP'
  location: string;     // 'Pine Ridge Prison Camp'
  map: string;          // tilemap cache key: 'm1p1' | 'm1p2' | 'm1p3'
  music: string;        // default music key (a map `music` property or trigger can override)
  briefing: string[];   // 1–3 radio lines from Hazel for the title card
  final: boolean;       // last part of its mission → mission Results instead of PART CLEAR
}
export interface MissionDef { id: number; name: string; biome: string; parts: PartDef[] }
export const CAMPAIGN: MissionDef[];
export function partById(id: string): PartDef | undefined;
export function nextPart(id: PartId): PartDef | null;   // next part of the same mission, else null
```

### Context
`ctx.part: PartDef` is on `GameContext`/`RegisterContext`. The level loads `ctx.part.map`. If a team's code lands
before Engine's, read it defensively: `(ctx as { part?: { map: string } }).part?.map ?? LEVEL.map.key`.

### Starting a part (scene data is the contract)
```ts
this.scene.start('Game', { part: '1-2', carry });   // carry optional: omitted = fresh run state
interface CarryState {
  score: number; lives: number; bombs: number; weapon: string; ammo: number; rescued: number;
  difficulty: 'arcade' | 'casual';
  parts: PartResult[];                                 // results of the parts cleared so far this run
}
interface PartResult { id: PartId; score: number; rescued: number; kills: number; deaths: number;
  shots: number; hits: number; timeMs: number }
```
`Infinity` ammo must survive the trip (use -1 or a flag internally if needed). With no data, Game uses `?part=` or `'1-1'`.

### Events (added to `events.ts`)
| Event | Payload | Who |
|---|---|---|
| `part:start` | `{ id, mission, part, title, location, briefing, final }` | Engine (after registration, alongside `stage:start`) → UI title card, Audio |
| `stage:clear` | existing payload **plus** `{ part: PartId, final: boolean }` (Engine fills them if the emitter didn't) | Levels/boss → Engine flow, UI |
| `boss:stomp` | `{ x, y, power }` | Bosses → Levels (ice cracks), FX, Audio |

`boss:spawn/hp/phase/defeated` carry the boss `name` (e.g. `"WARDEN'S SNOWCAT"`), so the HUD bar works for every boss.

### Flow after `stage:clear` (Engine)
- **Not final:** after `stageClearDelayMs`, stop the HUD and `scene.start('PartClear', data)` with
  `data = { from: PartDef, next: PartDef, result: PartResult, carry: CarryState }`. The UI's PartClear tallies, then
  calls `this.scene.start('Game', { part: data.next.id, carry: data.carry })`. If PartClear isn't registered,
  Engine starts the next part directly.
- **Final:** `Results` as today, with mission totals summed over `carry.parts` plus this part, and a `parts` array.
- **Continue** (game over) still respawns in place. **Quit** goes to Title.

### Progress save: `src/core/progress.ts` (Engine)
`loadProgress(): { unlocked: PartId[]; best: Partial<Record<PartId, number>> }`, `unlockPart(id)`, `recordBest(id, score)`.
The key is `localStorage['kbe.progress.v1']`, and it must work without storage. Clearing a part unlocks the next. Title gets a
**PART SELECT** (UI) listing unlocked parts. A run started there begins with fresh run state at that part.

### URL params and cheats
`?part=1-2` starts a part directly (dev, or `?debug=1`). `__KBE.cheats.part('1-3')` restarts into a part.
`__KBE.cheats.clearPart()` emits `stage:clear` for the current part. `state().part` is the current part id.
`?x=` warps still work inside the current part.

### Assets
Each part's map is listed in the level pack (`m1p1`, `m1p2`, `m1p3`). Per-part backgrounds go under
`backgrounds/m1p2/`, `backgrounds/m1p3/`. Everything still loads at boot (small); lazy per-mission loading comes with Mission 2.

### Tiled additions (Levels owns)
- Boss objects: `boss` + `kind=snowcat|ironhorn|moosezilla` in a `camera_lock` arena. The gate prop is optional (no gate → boss
  spawns as the camera arrives).
- Map property `drift` (px/s): parallax drift for the moving train.
- Tile properties `material=ice` (Player reads it through `ctx.physics.surfaceAt(x, y)`, which Engine adds and which returns the tile's
  `material` or null) and `crack=true` (Levels runs the crack→water swap).
- `hazard_sweep` trigger (low bridge): Levels spawns and moves the beam; it damages the player through `ctx.damage`.
