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
