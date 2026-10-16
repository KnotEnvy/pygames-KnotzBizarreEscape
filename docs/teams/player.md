# Player and weapons — Phase A

Delivered 21 Aseprite sheets, 234 frames, editable sources and shared Lua pose helpers. Phase A contains art/data only; no `game/src` changes. All art is original, uses the master palette, and references the legacy soldier only for green-helmet identity. Crate letters are diegetic stencil markings. No extra palette colors.

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
| `knotz_torso_heavy` | 48×48 | `knotz_heavy_aim_fwd` 4; `knotz_heavy_aim_fwd_shoot` 3; `knotz_heavy_aim_up45` 4; `knotz_heavy_aim_up45_shoot` 3; `knotz_heavy_aim_up` 4; `knotz_heavy_aim_up_shoot` 3; `knotz_heavy_aim_down45` 4; `knotz_heavy_aim_down45_shoot` 3; `knotz_heavy_aim_down` 4; `knotz_heavy_aim_down_shoot` 3; `knotz_heavy_crouch_fwd` 4; `knotz_heavy_crouch_fwd_shoot` 3; `knotz_heavy_knife` 5; `knotz_heavy_grenade_throw` 4 |
| `knotz_torso_pistol` | 48×48 | `knotz_pistol_aim_fwd` 4; `knotz_pistol_aim_fwd_shoot` 3; `knotz_pistol_aim_up45` 4; `knotz_pistol_aim_up45_shoot` 3; `knotz_pistol_aim_up` 4; `knotz_pistol_aim_up_shoot` 3; `knotz_pistol_aim_down45` 4; `knotz_pistol_aim_down45_shoot` 3; `knotz_pistol_aim_down` 4; `knotz_pistol_aim_down_shoot` 3; `knotz_pistol_crouch_fwd` 4; `knotz_pistol_crouch_fwd_shoot` 3; `knotz_pistol_knife` 5; `knotz_pistol_grenade_throw` 4 |
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
