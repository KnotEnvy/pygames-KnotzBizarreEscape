# Player and weapons — Phase A

Delivered 21 Aseprite sheets, 234 frames, editable sources and shared Lua pose helpers. Phase A contains art/data only; no `game/src` changes. All art is original, uses the master palette, and references the legacy soldier only for green-helmet identity. Crate letters are diegetic stencil markings. No extra palette colors.

## Heights

Phase E authoritative runtime sizes: standing hurtbox **12×30 px**, top **30 px above the feet**; crouched hurtbox **12×18 px**, top **18 px above the feet**. Both retain the same feet pivot. A sweep whose bottom is 19–29 px above the floor hits standing Knotz and clears crouching Knotz; aim for 23–25 px with margin. Down changes the body immediately; standing up requires headroom.

Maximum held-jump apex is **56.18 px** above takeoff feet (`318² / (2 × 900)`), approximately 54–56 px in discrete Arcade simulation. Early release clamps ascent to 120 px/s. These existing movement and hurtbox values are unchanged in Phase E.

## Build and review

From the repository root:

```sh
bash game/tools/build-art.sh art-src/player/build.lua
/home/knotz2/.local/bin/aseprite --batch game/art-src/player/knotz_torso_heavy.aseprite --scale 4 --save-as /tmp/kbe-player/knotz_torso_heavy.gif
```

Sources: `game/art-src/player/build.lua`, `lib/poses.lua`, and 21 `.aseprite` files. Runtime: `game/public/assets/sprites/player/` has PNG/JSON pairs and `knotz_meta.json`. Pack: `game/public/assets/packs/player.json` (21 `aseprite` entries plus the metadata `json` entry).

Look at `/tmp/kbe-player/knotz-composite-review.png` for assembled run/aim/crouch poses. Every sheet has `/tmp/kbe-player/<key>.gif` at 4× and `<key>-strip.png` at 4×, eight columns. Useful first reviews: `knotz_torso_heavy-strip.png`, `knotz_full-strip.png`, `pow-strip.png`, `flame-strip.png`, `pickup_h-strip.png`. Static strips were opened and inspected; revisions removed carried guns from knife/throw/salute poses, sharpened the face and uniform details, and replaced the blocky fallen pose with a compressed rotated skeleton.

## Inventory

Tag names are globally unique and become animation keys through `createFromAseprite`. Frame indices in atlas JSON and metadata are zero-based. Shoot, melee, throw, transitions, death, respawn, salute and gift animations play once; idle/run/projectile/shine cycles loop. Victory can be held on its final salute pose. Single-frame air poses should be held.

| Texture key | Canvas | Animation tags → frame counts |
|---|---|---|
| `flame` | 48×32 | `flame_flow` 8 |
| `grenade` | 12×12 | `grenade_spin` 4 |
| `hmg_bullet` | 16×6 | `hmg_bullet_fly` 1 |
| `knotz_full` | 48×48 | `knotz_death` 12; `knotz_respawn_drop` 4; `knotz_victory` 6 |
| `knotz_legs` | 48×48 | `knotz_legs_idle` 4; `knotz_legs_run` 8; `knotz_legs_skid` 2; `knotz_legs_jump_rise` 1; `knotz_legs_jump_fall` 1; `knotz_legs_land` 2; `knotz_legs_crouch_enter` 2; `knotz_legs_crouch_idle` 1; `knotz_legs_crouch_walk` 6 |
| `knotz_torso_heavy` | 48×48 | `knotz_heavy_aim_fwd` 4; `knotz_heavy_aim_fwd_shoot` 3; `knotz_heavy_aim_up45` 4; `knotz_heavy_aim_up45_shoot` 3; `knotz_heavy_aim_up` 4; `knotz_heavy_aim_up_shoot` 3; `knotz_heavy_aim_down45` 4; `knotz_heavy_aim_down45_shoot` 3; `knotz_heavy_aim_down` 4; `knotz_heavy_aim_down_shoot` 3; `knotz_heavy_crouch_fwd` 4; `knotz_heavy_crouch_fwd_shoot` 3; `knotz_heavy_crouch_down45` 4; `knotz_heavy_crouch_down45_shoot` 3; `knotz_heavy_crouch_down` 4; `knotz_heavy_crouch_down_shoot` 3; `knotz_heavy_knife` 5; `knotz_heavy_grenade_throw` 4 |
| `knotz_torso_pistol` | 48×48 | `knotz_pistol_aim_fwd` 4; `knotz_pistol_aim_fwd_shoot` 3; `knotz_pistol_aim_up45` 4; `knotz_pistol_aim_up45_shoot` 3; `knotz_pistol_aim_up` 4; `knotz_pistol_aim_up_shoot` 3; `knotz_pistol_aim_down45` 4; `knotz_pistol_aim_down45_shoot` 3; `knotz_pistol_aim_down` 4; `knotz_pistol_aim_down_shoot` 3; `knotz_pistol_crouch_fwd` 4; `knotz_pistol_crouch_fwd_shoot` 3; `knotz_pistol_crouch_down45` 4; `knotz_pistol_crouch_down45_shoot` 3; `knotz_pistol_crouch_down` 4; `knotz_pistol_crouch_down_shoot` 3; `knotz_pistol_knife` 5; `knotz_pistol_grenade_throw` 4 |
| `pickup_b` | 20×20 | `pickup_b_shine` 4 |
| `pickup_chicken` | 20×20 | `pickup_chicken_shine` 4 |
| `pickup_f` | 20×20 | `pickup_f_shine` 4 |
| `pickup_fish` | 20×20 | `pickup_fish_shine` 4 |
| `pickup_h` | 20×20 | `pickup_h_shine` 4 |
| `pickup_life` | 20×20 | `pickup_life_shine` 4 |
| `pickup_medal` | 20×20 | `pickup_medal_shine` 4 |
| `pickup_r` | 20×20 | `pickup_r_shine` 4 |
| `pickup_ration` | 20×20 | `pickup_ration_shine` 4 |
| `pickup_s` | 20×20 | `pickup_s_shine` 4 |
| `pistol_bullet` | 8×6 | `pistol_bullet_fly` 1 |
| `pow` | 32×40 | `pow_tied_idle` 4; `pow_freed` 4; `pow_salute` 4; `pow_give_item` 4; `pow_run_away` 8 |
| `rocket` | 24×12 | `rocket_fly` 4 |
| `spread_bullet` | 8×8 | `spread_bullet_fly` 1 |

## Pivots, composition and muzzle data

Knotz legs, torso variants and full-body sheets share 48×48 canvases, pivot `(24,48)`, Phaser origin `(0.5,1)`. Both split sprites occupy the **same world feet coordinate**, legs below torso. The authored waist/attach point is `(24,32)`, offset `(0,-16)` from feet; this is an anatomical reference, not a translation to apply to the torso image. Belt overlap hides the seam. Crouch poses lower the torso by 6 art pixels within its existing canvas; do not lower the sprite again. During crouch-enter use standing torso on frame 1 and crouch torso on frame 2. Land frame 1 also uses crouch torso. On death/respawn/victory hide both split layers and show full-body.

`knotz_meta.json` documents each aim tag's barrel-end coordinate **for every frame**, including bob/recoil. Use the torso animation's local frame index, not the packed frame index. Forward pistol barrel `(39,27)`, heavy `(42,27)`; up pistol `(27,15)`, heavy `(27,12)`; down pistol `(27,39)`, heavy `(27,42)`. Crouch adds 6 to Y. Idle frame 3 adds 1 to Y; shoot frames subtract 2, 1, 0 from X. Exact diagonals are in metadata. Directions are normalized; angle convention is Phaser radians, 0 right, positive down.

For a right-authored coordinate `(mx,my)`: `worldX = feetX + facing * (mx - 24)`, `worldY = feetY + my - 48`. Flip both art layers together. Left aim uses mirrored X direction and the same Y direction. Full-body death is authored backward toward the left; mirroring follows the previous facing.

POW: 32×40, feet pivot `(16,40)`, origin `(0.5,1)`. Pickups: 20×20 canvas with roughly 16×16 crates / 12×12 food; origin `(0.5,1)` for ground placement. Projectiles: origin `(0.5,0.5)`, +X forward, rotate by travel angle. Flame emitter is frame pixel `(1,16)`; use a custom origin `(1/48,0.5)` for an attached stream, or adjust its center position accordingly. Grenade release is `(10,-33)` from feet, mirrored by facing.

## Phase B implementation plan

- Register player, pickup and POW factories in `registerPlayer(ctx)`. Keep player/input ownership instance-based for P2. Use the Engine's real contracts as implemented at Phase B; do not recreate shared services.
- Player states: grounded idle/run/skid, rise/fall, land, crouch enter/idle/walk, melee, throw, dying, respawn, victory. Locomotion and upper-body aim/shoot are separate tracks. Buffer jump and preserve coyote time; releasing jump cuts upward velocity. Use one Arcade body and two display sprites. Grounded Down changes the body to crouch; restore only with headroom.
- Aim resolver quantizes raw input to forward/up45/up/down45/down in facing-local space. Grounded Down crouches and fires low-forward. Air Down unlocks down aim. Aim-lock suppresses movement and permits aim changes; neutral input retains forward facing. Mirror for the other three directions. Overlay recoil for 135 ms without restarting the legs animation.
- Weapon controller owns pistol tap/hold cadence, heavy ammo, HMG angle sweep, spread fan, rocket acceleration/seeking and flame tick gating. Spawn through Engine `ProjectileSystem`, with pooled sprites and swept collision. All hit application goes through `DamageService`; weapon code emits `player:shoot` with the final muzzle position so FX and Audio stay synchronized. Revert immediately to pistol when special ammo reaches zero.
- Knife queries enemy hurtboxes within 18 px on shoot. Five authored frames provide two anticipation frames; apply the melee hit once at frame 3, then recover. Throw releases grenade at frame 3; physics handles one bounce and detonation on the second contact or enemy hit. Explosion visuals emit separately from radial damage.
- Pickups overlap the live player, update `RunState`, emit typed collection/change events, then deactivate. Map kinds: `hmg`, `spread`, `rocket`, `flame`, `bombs`, `points`, `life`; point subtype selects fish/chicken/medal/ration texture. Clamp bombs to 30.
- POW state flow: tied → freed → salute → give_item → run_away. Free by player touch or shot without taking damage; ignore explosions. Award 100 points and one rescue exactly once, spawn map-assigned item at gift frame 3, then run left until offscreen. Guard all callbacks against scene shutdown and repeat rescue hits.
- Death disables collision/input, plays 12 frames (1.08 s), decrements lives once and emits the death event. Respawn near the checkpoint-safe location at 1.2 s, restore pistol, blink for 2 s. Casual mode allows 3 HP with 1 s hit immunity. Use Engine time service so animation, cooldowns and movement respect hitstop/slow motion.

## Starting tuning

| System | Initial values |
|---|---|
| Run / crouch walk | 105 / 35 px/s; acceleration 1750 px/s²; reversal skid 160 ms |
| Jump | −318 px/s, gravity 900 px/s² (~56 px apex); release clamp −120; coyote 90 ms; buffer 120 ms |
| Body | standing 14×32, feet offset (−7,−32); crouch 16×20, offset (−8,−20) |
| Pistol | damage 1; bullet 420 px/s; tap cooldown 143 ms, hold interval 333 ms |
| HMG | 14 shots/s, damage 1; 200 ammo; ±2° spread; 90 ms aim sweep |
| Spread | 5 pellets at −20/−10/0/+10/+20°; damage 1 each; 40 ammo; 450 ms cooldown |
| Rocket | 30 ammo; damage 6; 90→260 px/s, acceleration 380 px/s²; seek ≤65°/s; radius 20; cooldown 600 ms |
| Flame | 30 bursts; 0.4 damage per 80 ms per target; 48 px reach; 440 ms burst / 160 ms cooldown |
| Grenade | initial 10/max 30; velocity (±170,−260); gravity 900; bounce restitution .35; radius 28; damage 6; fuse fallback 1.67 s |
| Melee | 18 px range, damage 4; 110 ms anticipation, 55 ms active, 110 ms recovery |
| POW | 100 score at rescue; run-away speed 80 px/s; map-assigned gift |
| Food / life | fish 100, chicken 500, medal 1000, ration 200; life adds 1 (initial proposal) |

## Known gaps and Requests for other teams

- Phase B gameplay and integration are intentionally pending. Animation needs an in-game background/readability pass and real-time feel review; the current art is an original stylized pixel treatment, not a claim of matching Metal Slug's hand-animation fidelity. The torso keeps a fixed head orientation while the weapon aims; consider extra directional head acting in the later polish pass.
- Engine: expose pooled ProjectileSystem spawn/update/collision hooks for rocket acceleration, gentle seeking, piercing flame with per-target tick cooldown, and grenade bounce count. Provide hurtbox queries for melee/POW interception, time-scaled update hooks, and a safe respawn position query. Confirm whether `ctx.player()` is assigned via a setter or registration callback.
- Engine/Lead: ensure asset-pack JSON loader supports `aseprite` entries and `createFromAseprite` registers globally unique tags. Metadata is included as the JSON key `knotz_meta`. Respect non-looping state tags when configuring generated animations.
- FX: use `player:shoot` muzzle coordinates directly. Author muzzle flashes facing +X for weapon IDs pistol/hmg/spread/rocket/flame; knife smear is already in the player art. Attach flame at its emitter origin. Keep grenade and rocket explosion damage separate from visuals.
- Levels: use the documented map pickup kinds; attach POW `item` properties. Clarify point item subtype property (`item` or `subtype`) before Phase B.
- Audio/UI: use weapon IDs above; listen to the existing event catalog. The life pickup is a helmet portrait medallion; HUD provides any literal “1UP” text through the bitmap font.

## Validation at handoff

- Rebuilt every source with the shared KBE batch pipeline: 21 sheets / 234 frames.
- Independently checked pack paths, PNG sheet bounds, untrimmed/unrotated frame canvases, and all tag ranges.
- Aseprite pixel audit checked all 234 cels: master palette plus transparency only.
- Exported all 21 4× GIFs and PNG contact strips; inspected combined hero poses, torso attack strips, death/respawn/salute, POW cycles, projectiles and pickup overview.
- `npm run check:phaser4` could not run: `game/tools/check-phaser4.mjs` has not been created by the rules team yet.
- `npm run typecheck` currently fails in Engine-owned `src/core/contracts.ts` because `./events` and `./projectiles` are not present yet. No player TypeScript was added in Phase A.

## Phase B — implemented against the real engine (2026-10-16)

Owned runtime files:
- `src/entities/player/index.ts`: player factory, animation setup, pickup/POW registration.
- `src/entities/player/controller.ts`: instance-based Knotz controller, one Arcade body and split display sprites, metadata sockets, input/action/locomotion states, damage/death/respawn/victory, camera clamp, debug queries and cheats.
- `src/entities/player/animations.ts`: repairs only player-team Aseprite tags. Phaser 4.2.1's helper indexes numeric frame names, while these atlases use `texture#N`; empty helper-generated animations otherwise crash on first play. Explicit durations preserve authored timing; transitions play once and loops repeat.
- `src/entities/weapons/index.ts`: shared ProjectileSystem pistol, HMG sweep, five-pellet spread, accelerating/seeking rocket, piercing flame bursts, arcing/bouncing grenade and radial explosions.
- `src/entities/pickups/index.ts`: weapons, bombs, life, points/food, bob/shine and collection pop. Points support `props.subtype` or `props.item`, explicit `props.points`, food kinds and `points_<food>` aliases.
- `src/entities/pow/index.ts`: touch/shot rescue, freed → salute → gift → run-left, ignoring explosion/flame damage. Emits one `pow:freed`; Engine alone awards rescue/score.
- `src/config/tuning/player.ts`: movement, body sizes, timers, ammo, combat and food values.

### Integration and controls

Open `?scene=Game&mute=1&debug=1&god=1`. The player replaces Engine's placeholder automatically. Standard controls from GDD §11 apply; down+jump drops through a one-way platform. Shift/L holds aim-lock. `__KBE.cheats.give('hmg', 200)` equips weapons; `give('spread'|'rocket'|'flame'|'pistol')` also works. `kill()` is overridden to lose the current player life for QA, even during invulnerability; normal damage respects God mode and i-frames. `shotsFired` is monotonic within a player instance and counts weapon triggers, not spread pellets, flame ticks, knives, or grenades. `playerController` exposes action state, HP, crouch, angle, immunity and velocity.

Current directional controls (2026-10-17): aim-lock is **Shift / L / gamepad RB**. Left/right changes facing while locked; horizontal movement brakes to zero as before. Mirroring supplies the other three directions.

| Direction | Grounded with aim-lock | Grounded without aim-lock |
|---|---|---|
| Up | Standing, shoots up | Standing, shoots up |
| Up + left/right | Standing, shoots up-diagonal; turns | Runs, shoots up-diagonal |
| Left/right | Standing, shoots forward; turns | Runs, shoots forward |
| Down + left/right | Crouched, shoots down-diagonal; turns | Crouch-walks, shoots forward |
| Down | Crouched, shoots straight down | Crouched, shoots forward |
| Neutral | Shoots forward in retained facing | Shoots forward in retained facing |
| Air directions | Existing eight-way air aim | Existing eight-way air aim |

Both downward locked ground poses use the **12×18 px crouched hurtbox** immediately. Standing still requires headroom. Down + jump retains one-way drop-through. Shoot is X; a nearby enemy still selects knife. Grenade is C and keeps its facing-based upward throw.

Spawn contracts: `player_start`; `pickup:<kind>` or `pickup` with `props.kind`; `pow:<item>` or `pow` with `props.item`. Feet coordinates use bottom-center origins. Published `PlayerQuery.teleport` resets the Arcade body and composite position. Scene cleanup removes damage/collision registrations, subscriptions and display layers.

All weapon equips/fallbacks use `state.setWeapon`; ammo consumption uses the observable ammo setter to avoid replaying `weapon:changed` callouts on every round. One `player:shoot` carries the authored world muzzle socket and actual angle per trigger; five pellets and flame ticks do not multiply the event. Animation art supplies the pixel recoil. Heavy triggers request shake tier 1. Land emits the stored pre-collision vertical speed. Initial spawn and respawn blink for two seconds; Casual loses HP without a life event until its third damage point. Grenade impact callbacks ignore repeated contacts at the same projectile age, because Engine currently retains the old movement vector through a bounce's remaining substeps.

### Tuning and sound

Starting values: run 105, crouch 35, acceleration 1750, jump −318, release clamp −120, coyote/buffer 90/120 ms. Standing body 14×32; crouch 16×20. Pistol tap/hold intervals 143/333 ms. HMG 14/s with 90 ms aim sweep; spread 450 ms; rocket 600 ms, 90→260 px/s and ≤65°/s seeking; flame 400 ms bursts with 80 ms ticks / 480 ms cadence. Ammo H/S/R/F = 200/40/30/30. Knife anticipation 110 ms, damage 4. Grenade damage 6, radius 28, fuse fallback 1670 ms. All values are exported from the owned tuning file.

Audio keys used: `pistol`, `hmg`, `spread`, `rocket`, `flame`, `grenade_throw`, `knife`, `jump`, `land`, `pickup`, `weapon_get`. The UI/audio team doc was absent when implementation started; missing sound keys safely no-op. Coordinate event-driven audio with these direct calls to avoid doubled playback.

### Verification evidence

- Player code passes strict typecheck; the full project typecheck and Phaser 4 checker both passed after the concurrent Engine/Enemy fixes landed (54 files, zero findings at the latest check).
- Real Chromium screenshot runs used `game/tools/shot.mjs`. Inspected `/tmp/kbe-player/run.png`, `air.png`, `up.png`, `diagonal.png`, `crouch.png`, `hmg.png`, `hmg-up.png`, `spread.png`, `rocket.png`, `flame.png`, `throw.png`, `knife.png`, `victory.png`, `pow-gift.png`. Composite proportions and belt seam remain aligned; up/diagonal sockets and heavy bullet trajectories read correctly. No player runtime exceptions after animation repair.
- Observed bomb consumption 10→9; one-round HMG fired once then reverted to infinite pistol; POW shot rescue yielded exactly +100/+1, gift collected as HMG/200; bomb pickup yielded 10→20.
- Real DamageService Casual check: two immediate hits left HP 2 (second blocked), separated hits produced HP 1 then death/lives 3→2, Engine respawn restored HP 3 with 2 s blink.
- One-way check: standing on sandbox plank `(736,176)` reported `onOneWay=true`; down+jump descended to y=219 then landed y=224, without jumping upward.
- Camera reproduction: right for 2.5 s reached x=308, cameraX=164, then stopped naturally at the sandbox step. QA's failed camera run screenshot instead showed x≈48; concurrent Vite HMR resets were observed during other screenshot runs.
- Required exact QA command completed: **11 passed, 4 skipped, 1 failed**, 2.9 min. Failure: camera advance assertion (cameraX=0). `/tmp/kbe-player/qa.log` contains the run, with interleaved local-port startup diagnostics. No full-suite acceptance claimed.
- An extra unchanged-suite run with an ephemeral-port temporary config and Vite file watching disabled produced **2 passed, 1 skipped, 13 failed**: Engine snapshot referenced undefined `SANDBOX_NAME`, and Chromium reported `ERR_NETWORK_CHANGED` / a missing canvas. Engine subsequently removed that reference; final settled rerun below supersedes it. Scratch config/runner and logs stay in `/tmp/kbe-player/`.

### Known issues / Requests for other teams

- **Engine/QA:** rerun acceptance on a settled checkout. During this pass, HMR reset scenes mid-input, fixed port 4310 stalled its first availability probe, and concurrent Engine edits briefly broke debug snapshots (`SANDBOX_NAME`) and flow typing. Latest direct player checks passed; these observations are not attributed to player gameplay.
- **Engine:** consider rebuilding remaining substep displacement after a projectile bounce. Player guards same-frame duplicate terrain contacts locally. The projectile pool currently stores only eight pierced hurtboxes, so extreme overlapping crowds can exceed flame's per-projectile hit memory.
- **FX/Engine:** Engine added `fx:emit` during integration; player now emits run dust every 140 ms, reversal skid dust and fatal water splashes, with sampled surface material. Land/jump already have dedicated events. FX should use supplied muzzle coordinates. Rocket exhaust has no dedicated socket event; its sprite position and angle are available from pooled projectiles.
- **UI/Audio:** supply the listed keys and choose one sound owner per existing event. Player already makes direct sound calls. Missing keys are safe.
- **Levels:** weapon/POW/pickup integration was exercised through the real registry in the sandbox. Recheck headroom, hazards and body alignment on the finished map. No core, level, enemy, FX, UI, test source, assets or git state were edited by this team.
- Art remains the Phase A stylized treatment; directional head acting and broader visual polish remain future work. No claim of Metal Slug animation fidelity or completed full-game acceptance.

Final settled QA rerun: **13 passed, 3 skipped, 0 failed (30.2 s)**. Same 16 test sources; temporary config only selected an ephemeral already-started Vite server, disabled file watching to prevent other teams' HMR resets, and placed artifacts in `/tmp/kbe-player/test-results`. Log: `/tmp/kbe-player/qa-final.log`. The three skips remain UI/flow capability coverage, not passed acceptance. Both mandatory static checks passed again afterward.

Final grenade telemetry: first bounce retained a live grenade at age 683 ms / y=222.65 / vy=−124.23 with zero explosions; subsequent contact left zero projectiles and exactly one explosion. Screenshot `/tmp/kbe-player/bounce.png`.

Post-FX-wiring smoke: `/tmp/kbe-player/skid.png` and `final.png` inspected; reversal dust rendered, facing mirrored correctly, debug errors stayed empty, sampled FPS 60 and FX peak 3. Only warning was the intentional sandbox mystery-box placeholder. No further runtime edits followed this check.

## Phase D — player polish (2026-10-16)

### Art and composition

Rebuilt the 21 player atlases through `npm --prefix game run art -- art-src/player/build.lua` (sources stay editable Aseprite). The eight-frame run now has contact/down/passing/up poses with independently bent knees and lifted recovery feet, at **65 ms/frame** (was 75). Rise tucks the rear leg; fall reaches toward the landing. Landing is a two-frame, **130 ms** compression (was a 90 ms controller window), with a 3 px torso dip on its first frame. Runtime samples the leg animation's local frame for run bob `[1,0,-1,0,1,0,-1,0]` and facing-scaled sway `[0,1,1,0,0,-1,-1,0]`; the same translation applies to the muzzle. POST_UPDATE composition still follows Arcade's final sprite correction. Removed independent torso idle bob so shooting/idle tags cannot drift out of phase with the legs. Pistol recoil is **1 art pixel**, heavy recoil remains 2/1/0. Lua now exports the matching muzzle coordinates, rather than requiring a separate metadata edit.

POWs raise their hand into a held, eyebrow-raised salute (90/140/180/90 ms), then extend a visible supply packet over three frames and release it. Freed lasts 400 ms; salute 500 ms; gift appears at 360 ms into hand-off; escape starts at 560 ms, after the complete gesture. One-time reward and explosion immunity are preserved. Grenades gained a bright cap/core highlight to read against terrain during the existing spin/ballistic arc.

### Feel and tuning diffs

- Standing body/hurtbox: **14×32 → 12×30**, centered and feet-aligned; crouch: **16×20 → 12×18**. The crouch silhouette now gains protection rather than a wider collider. This is also the Arcade level-collision body; headroom samples are at -5/0/+5.
- Coyote: **90 → 100 ms**; jump buffer stays **120 ms**, jump 318, jump-cut 120, run 105 and acceleration 1750 unchanged. Respawn immunity stays **2000 ms**; low blink phase **0.4 → 0.25 alpha**, alternating every 80 ms, returning to full alpha on expiry. Casual remains 3 HP.
- Knife connections request **55 ms hitstop via `ctx.fx.hitstop`**, only when `damage.deal` accepts at least one hit; the existing authored two-frame slash smear is retained.
- HMG retains the 90 ms shortest-angle sweep while firing, but the first shot after >180 ms idle starts at the requested aim instead of sweeping from a stale heading. Spread/rocket/flame damage and ammo are unchanged.
- Pistol tap/hold stays 143/333 ms. `state.setWeapon` remains the single observable `weapon:changed` path; the UI owns the weapon-get callout. Bombs decrement immediately on throw acceptance through the observable setter, so HUD count changes before release.
- Camera review: current Engine look-ahead is 36 px with exponential rate 2.5/s, follow 7/s and forward-only scroll; observed mid-run screenshots preserve useful space ahead. No core edits or Engine API change required.

### Rules review P1–P3

P1: reuse the muzzle scratch point and headroom array; cache leg/torso animation keys by pose/weapon/shoot-state change. Rocket seeking uses the shared `damage.queryRect` array and a reused 240×240 search rectangle instead of an allocating `forEach` callback/snapshot each rocket tick. P2: delete player atlas reconstruction; shared Preload builder owns exact durations/directions. Registration only applies loop policy; playback checks `hasAnim`. P3: uncollected pickups beyond 320 px from the camera center skip bob/query updates; collected pickups finish their short exit normally.

### Evidence

Scratch and screenshots live under `/tmp/kbe-player/`, all Phase D files use `phase-d-` prefixes. Inspected 4× leg/POW frame strips and the assembled eight-frame run strip (`phase-d-run-composite.png`, companion animated GIF). Also exported 4× GIFs for legs, pistol/heavy torso, POW and grenade. Inspected real in-game `phase-d-run1.png`, `phase-d-run2.png`, `phase-d-run-fire.png`, knife contact and respawn blink captures. Contact/passing poses and the belt seam read correctly.

`phase-d-probe.json`: all **61 player/POW/pickup/projectile animation tags actually play** through the shared builder, zero failures; a real knife kill records 55 ms player hitstop (plus 48 ms FX hitstop); respawn starts near 1983 ms at 0.25 alpha and ends at 0 ms/alpha 1; no browser/runtime errors. Typecheck and strict Phaser checks pass for all six owned entity TypeScript files.

Follow-up from the QA run: the crouch transition exposed Arcade counting an offset change as movement in `Body.postUpdate`. Resizing now shifts body position plus `prev`/`prevFrame` by the offset delta, preserving the pending simulation movement and feet pivot. Focused repro at a real forest one-way: standing sprite/feet Y=128, crouched Y=128 with 18 px body, down+jump then falls to Y=203. Before this correction the sprite shifted to Y=140 and jumped instead. Evidence: `phase-d-feel.json`.

Inspected `phase-d-weapon-get.png` and `phase-d-grenade-arc.png`: real pickup emits `{weapon:'hmg',ammo:200}`, HUD displays **HEAVY MACHINE GUN!**, and bomb count visibly changes **10→9** while the highlighted grenade travels above Knotz. Inspected `phase-d-jump-rise.png` and `phase-d-jump-fall.png`: tucked rise and extended fall remain distinct with the heavy torso. No errors in this focused run.

Accepted rounds explicitly restart the torso shoot animation, so a held pistol/HMG trigger continues showing recoil on each shot instead of freezing on the last frame after the first burst.

Final validation: **70/70 systems checks passed**, all five weapons × eight directions, finite ammo fallback, grenade, knife, crouch, POW/rewards, difficulty damage, hazards, one-way drop-through and animation validity. Zero console/runtime errors. Report: `/tmp/kbe-player/phase-d-systems/2026-10-16T19-29-31-463Z-phase-c-systems-3531055/report.json`. This is QA’s unchanged systems logic in a scratch copy except its hard-coded crouch-height expectation is 18 instead of the obsolete 20; repository QA sources were untouched. Initial unadjusted run was 68/70 (old height assertion plus the now-fixed resize/drop-through defect).

Full QA E2E final run: **18/19 passed** (`/tmp/kbe-player/phase-d-qa-final.log`). Remaining failure is `flow.spec.ts:3`, Title → Game → Pause → resume: Escape leaves native Pause active (expected paused false, got true). Player movement/jump/fire/camera/damage/death/Continue/hooks checks passed. Earlier runs also caught transient FX asset availability and browser startup/network failures during concurrent work; they are retained in `phase-d-qa.log` and `phase-d-qa-stable.log`, not counted as a clean acceptance run. No core/UI/FX files were changed.

Final visual probe (`phase-d-final-visual.json`) confirms four held pistol rounds each restart recoil at animation frame 1, with zero browser/runtime errors. Captured and inspected `phase-d-pow-salute.png`, `phase-d-pow-handoff.png`, and `phase-d-pow-runoff.png`; the extended packet and hand release precede escape. No npm installs, commits, index changes or branch operations were performed by this implementation agent.

## Phase E — ice, laser, entrances and part carry (2026-10-16)

Implemented only in Player-owned paths. Existing dry-ground movement values remain unchanged.

- `src/config/tuning/player.ts`: ice acceleration **420 px/s²**, passive deceleration **280 px/s²**, crouch/aim-lock brake **700 px/s²**. Run/crouch speed remains **105/35 px/s**. Ice is sampled only when grounded through optional `physics.surfaceAt` at the body feet +1 px. Ordinary dust is suppressed on ice; braking emits `fx:emit {effect:'ice_skid',x,y}` every **100 ms** above 20 px/s. Air control, jump buffering/coyote, aiming and weapon handling keep their existing behavior. From full speed the theoretical passive stop is 375 ms / 19.7 px; crouch/aim-lock stops in 150 ms / 7.9 px.
- `src/entities/weapons/index.ts`: weapon ID **`laser`**, **100 ammo**, **100 ms** interval, **1.25 damage**, **1000 px/s**, **430 ms** lifetime, **2 px** collision radius, unlimited hurtbox piercing (one hit per target per pulse), terrain stops the pulse. Nominal single-target output is **12.5 DPS**, versus HMG's **14 DPS**; piercing rewards lined-up targets. Uses the heavy torso and all eight existing aim sockets. Each round emits `player:shoot`, calls SFX **`laser`**, and consumes one ammo; exhaustion returns immediately to pistol/Infinity. Engine emits `projectile:impact` for every pierced target and terrain hit. Player renders its own brief laser muzzle/impact sprites.
- `src/entities/pickups/index.ts`, `src/entities/pow/index.ts`: register `pickup:laser` / `pow:laser`; generic pickup `kind=laser` and POW `item=laser` work. Crate letter **L**. `__KBE.cheats.give('laser', ammo?)` uses the normal equip path.
- `src/entities/player/{controller,index,animations}.ts`: player_start `entry=walk|jump_down|tumble`. Walk: **280 ms**, **50 px/s**. Jump-down starts **48 px** above the authored feet, velocity **(45,80)**. Tumble starts **24 px** above the feet, velocity **(85,-100)**, with a full-body roll. Air entrances release after grounding and **450 ms**, hard cap **1050 ms**. All entrances ignore control/damage during the short action and stay fully visible; existing 2 s spawn immunity continues afterward. Author the object at a safe landing feet coordinate with at least ~55 px clear space to its right. No entry property preserves the previous spawn behavior.
- Spawn explicitly equips the Engine-restored `state.weapon/state.ammo` and publishes normal weapon/ammo events. Death respawn still restores pistol as before. HUD can also read the restored RunState at launch.
- Art: `art-src/player/laser.lua` builds `laser_beam`, `laser_muzzle`, `laser_impact`, `pickup_l` through shared `tools/aseprite/kbe.lua`. Rebuild with `bash game/tools/build-art.sh art-src/player/laser.lua`. Four editable `.aseprite` sources, PNG/JSON pairs in `public/assets/sprites/player/`, and pack entries in `public/assets/packs/player.json`. Globally unique tags: `laser_beam_fly`, `laser_muzzle_flash`, `laser_impact_flash`, `pickup_l_shine`; master palette only. Beam is 64×8; muzzle 20×16; impact/crate 20×20. Muzzle and impact play once.

### Phase E verification

`npm --prefix game run check` passes (TypeScript and Phaser 4 scanner, zero errors/warnings). Requested `tools/shot.mjs` used for screenshots and runtime probes; no repository QA files edited. Scratch evidence lives in `/tmp/kbe-player/`:

- `phase-e-laser-{right,up-right,up,up-left,left,down-left,down,down-right}.png`: inspected all eight angles. Shot events confirm exact multiples of π/4 and real socket coordinates; terrain impacts and finite ammo work. `phase-e-visual.log` records the probe.
- `phase-e-ice-slide.png`: inspected the slide on clear existing ground with `surfaceAt` overridden to ice in the probe only. `phase-e-focused.json`: 100.33→39.67→0 px/s, **18.82 px** remaining slide, three ice_skid events. The earlier probe against a camp crate was discarded as a slide measurement.
- `phase-e-entry-{walk,jump_down,tumble}.png`: inspected all three entrances. Each rejects a real DamageService hit with god disabled and returns to ready. `phase-e-crouch.png` and probe confirm body top moves **306→318** at the same **336 px feet** (30→18 px height).
- `phase-e-crate-l.png`: inspected L crate. `phase-e-items.log`: a single laser pulse hit two registered targets exactly once each and emitted two laser impact events; one-ammo exhaustion restores pistol/Infinity; collecting the L crate and freeing a laser POW both equip laser/100, POW rescue tally increments once.
- `phase-e-carry-laser.png`, `phase-e-url-part.png`: URL `?part=1-2` and live `cheats.part('1-2',true)` exercised after Engine landed. Laser/37, score 12345, bombs 7 and lives 3 survive; HUD reads laser/37. Pistol remains actual **Infinity** in RunState and displays **∞** after the next part. Debug serialization represents Infinity as -1. No runtime errors.

### Requests for other teams / remaining integration

- **Levels:** ship/load `m1p2` and `m1p3`, set player_start entry `jump_down` / `tumble`, put `material=ice` on lake tiles, and place laser crates or POW `item=laser`. During verification those maps were not yet loaded and the level still rendered the camp, so final train/lake visual placement remains to check. The player mechanics were verified independently on existing terrain.
- **UI:** add a HUD laser weapon icon and laser pickup callout mapping for weapon ID `laser` (current HUD receives the correct ID/ammo but shows its fallback gun icon). The L crate is in the Player pack; HUD art belongs to UI.
- **Audio:** add **`laser`** SFX, called once per accepted pulse at up to 10 Hz. Current catalog reports this unknown key; no audio files changed here.
- **FX:** consume `ice_skid` at body feet (100 ms spacing while braking). Laser's Player-owned muzzle/impact art is already rendered; consider the generic player:shoot muzzle fallback when wiring laser-specific FX to avoid a duplicate orange flash.
- **Bosses/Levels:** use the Heights section above. Standing-height sweeps should clear the 18 px crouch hurtbox with margin.

## Phase E rules review P2 — pooled laser flashes (2026-10-17)

`src/entities/weapons/index.ts` prewarms two muzzle and two impact sprites per Weapons instance and reuses each kind round-robin. Animation completion hides/deactivates a slot; replaying a busy slot restarts its animation. Scene SHUTDOWN destroys all four sprites and clears the pools. Firing and piercing hits create no flash sprites or delayed calls.

Validation: `npm run check` passes (98 files, zero errors/warnings). Ran the requested three-second laser hold and inspected `/tmp/kbe-player-laser-pooled.png` (28 shots, clean console). A second shot-tool probe sampled the display list before firing and after each second: **524 → 524 → 524 → 524**, always four flash sprites. Injecting 100 impact callbacks reused those same slots with zero new flash sprites or 120 ms timers; all slots hid after completion. Restarted part 1-1 with an active impact: all old sprites were destroyed, their animation listeners removed, and exactly four fresh slots appeared, with no runtime errors. Probe steps: `/tmp/kbe-player-laser-pool-steps.json`; stress/restart PNGs: `/tmp/kbe-player-laser-pool-{stress,restart}.png`.


## Owner playtest fix — grounded aim-lock (2026-10-17)

Player-owned controller now accepts positive vertical aim on the ground while aim-lock is held. It resolves `crouch_down45` / `crouch_down`, keeps the crouched physics/hurtbox, and renders those torsos immediately rather than briefly borrowing the forward crouch-entry pose. Unlocked Down and Down+forward still shoot forward; air aim, braking, knife selection, and grenade release logic are unchanged. Debug `playerController` now includes `aimTag`, `aimLocked`, `facing`, and the current world `muzzle` alongside angle and hurtbox dimensions.

The shared Aseprite Lua pipeline rebuilt both editable torso sources and PNG/JSON atlases: **65 frames each**, adding four tags per variant (4-frame idle and 3-frame shoot for each new direction). `lib/poses.lua` accepts an authored barrel length; heavy straight-down crouch uses 12 px so the tip/outline fit within the 48 px canvas and stay above the feet. New idle socket offsets from feet: pistol down-diagonal `(11,-7)`, heavy down-diagonal `(14,-4)`, both straight-down `(3,-3)`. Shoot sockets include the existing pistol 1/1/0 and heavy 2/1/0 px X recoil. Left-facing mirrors X. The Lua exporter creates all muzzle entries and refreshes torso inventory/tag ranges from the exported atlas; Aseprite JSON values are copied into ordinary Lua tables before editing so newly added keys persist.

All six weapons receive those world sockets through the existing shared firing path, including HMG's shortest-angle sweep and spread's fan. Flame checks the 22 px emitter-to-centered-art gap with the existing `physics.solidAt` query before spawning, emitting the normal material impact if blocked; later flame terrain hits also use normal impacts. This prevents low/downward flame emission from starting below the floor. Rocket keeps its existing explosion impact. No one-way, bridge, or core projectile collision rules were changed.

Verification used only the requested screenshot tool and fast checks, with the exact part 1-1 / x=200 query. Every PNG below was opened and visually inspected; capture logs report clean consoles and empty runtime errors. Required views (retaken after spawn blinking expired):

- `/tmp/kbe-player/aim-up.png`
- `/tmp/kbe-player/aim-up-forward.png`
- `/tmp/kbe-player/aim-forward.png`
- `/tmp/kbe-player/aim-down-forward.png`
- `/tmp/kbe-player/aim-down.png`
- `/tmp/kbe-player/aim-crouch-walk.png`
- `/tmp/kbe-player/aim-hmg-down-forward.png`
- `/tmp/kbe-player/aim-laser-down.png`

Additional inspected captures: `/tmp/kbe-player/aim-{spread,rocket,flame}-{down-forward,down}.png`, `aim-down-left.png`, `aim-hmg-sweep.png`, `aim-knife.png`, `aim-grenade.png`, and `aim-weapons-final.png`. Also inspected `aim-unlocked-down.png`, `aim-air-down.png`, and `aim-air-unlocked-down.png`: unlocked grounded Down remains angle 0 / `crouch_fwd` with an 18 px body; locked and unlocked air Down remain π/2 / `aim_down` with a 30 px body. Matching `steps-aim-*.json` / `aim-*.log` files retain reproducible inputs and event telemetry. Pistol/HMG/spread/laser emit normal snow-floor impacts, rocket emits its normal explosion (two verified), and flame's gap check emits snow impacts at the floor. HMG sweeps across down-diagonal/down/back while held. Knife against a temporary registered in-range enemy hurtbox produces exactly one accepted 4-damage melee hit; grenade count changes 10→9 with normal `(facing*10,-33)` release.

`npm run check` passes: strict TypeScript and Phaser 4 scanner, **98 files / zero errors / zero warnings**. `npm run audit` passes reachability and every arena for **all three parts**. Log: `/tmp/kbe-player/aim-audit.log`. Browser tools required running outside the filesystem sandbox to bind their local Vite port. No commits, index changes, branch operations, or other git state changes were performed.
