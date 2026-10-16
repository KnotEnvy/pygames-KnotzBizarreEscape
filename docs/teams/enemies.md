# Enemies, AI and bosses — Phase A handoff

Phase A delivers original art and data only. No enemy AI or boss implementation is present, and this team has not written under `game/src/`. No archived graphics were copied. All opaque colors come from `K.PAL`; no palette exceptions.

## Files and rebuilding

- Build scripts: `game/art-src/enemies/{grunt,grenadier,shield,paratrooper,turret,drone,parachute,projectiles,moosezilla}.lua`.
- Shared original pose/drawing helpers: `game/art-src/enemies/lib/{draw,soldier}.lua`.
- Editable sources: 20 `.aseprite` files beside those scripts.
- Runtime outputs: 20 PNG sheets + 20 Aseprite atlas JSONs in `game/public/assets/sprites/enemies/`.
- Rig: `game/public/assets/sprites/enemies/moosezilla_rig.json`.
- Phase B tuning and animation markers: `game/public/assets/sprites/enemies/enemy_data.json`.
- Phaser pack: `game/public/assets/packs/enemies.json` (20 `aseprite` entries and two `json` data entries).
- Repeatable visual inspection script: `game/art-src/enemies/lib/preview.lua`; deliberately excluded from the general build scan.

From repository root:

```sh
bash game/tools/build-art.sh art-src/enemies/grunt.lua art-src/enemies/grenadier.lua art-src/enemies/shield.lua art-src/enemies/paratrooper.lua art-src/enemies/turret.lua art-src/enemies/drone.lua art-src/enemies/parachute.lua art-src/enemies/projectiles.lua art-src/enemies/moosezilla.lua
mkdir -p /tmp/kbe-enemies
/home/knotz2/.local/bin/aseprite --batch --script-param root="$PWD/game" --script-param kbe="$PWD/game/tools/aseprite/kbe.lua" --script game/art-src/enemies/lib/preview.lua
/home/knotz2/.local/bin/aseprite --batch game/art-src/enemies/grunt.aseprite --scale 4 --save-as /tmp/kbe-enemies/grunt.gif
/home/knotz2/.local/bin/aseprite --batch game/art-src/enemies/grunt.aseprite --scale 4 --sheet-type horizontal --sheet /tmp/kbe-enemies/grunt-strip.png --data /tmp/kbe-enemies/grunt-strip.json
```

The two last commands work for every source stem. `moosezilla.lua` builds ten parts; `projectiles.lua` builds three projectiles. The rig and tuning JSONs are authored data, not rewritten by art builds. Lua helper edits require rebuilding their dependent sprites.

## Sprite inventory

**366 exported frames, 104 globally unique tags, 20 texture keys.** Tags below are suffixes: prepend `<key>_`. Each number is an actual frame count, including held poses where appropriate. All sheets are untrimmed, unrotated RGBA at native size; transparent space is intentional.

| Texture key | Canvas | Animation suffix → frames |
|---|---|---|
| `grunt` | 48×48 | idle 4; walk 8; alert 3; shoot 4; crouch_shoot 3; panic 6; hurt 1; death_launched 6; death_flame 6; death_explosion 4 |
| `grenadier` | 48×48 | idle 4; walk 8; alert 3; throw 6; retreat 6; hurt 1; death_launched 6; death_flame 6; death_explosion 4 |
| `shield` | 48×48 | idle 4; walk 6; alert 3; block 3 (two holds + spark); shoot 4; shield_break 4; hurt 1; death_launched 6; death_flame 6; death_explosion 4 |
| `paratrooper` | 48×48 | idle 4; walk 8; alert 3; descent 4; chute_torn 3; landing 3; hurt 1; death_launched 6; death_flame 6; death_explosion 4 |
| `parachute` | 48×48 | descent 4; torn 3 |
| `turret` | 32×32 | aim_0…aim_7: 1 each; fire_0…fire_7: 3 each; windup_0…windup_7: 4 each; destroyed 4 |
| `drone` | 32×24 | fly 6; dive 2; hit 1; destroyed 4 |
| `enemy_bullet` | 8×8 | fly 2 |
| `enemy_grenade` | 12×12 | fuse 4 |
| `turret_bullet` | 12×8 | fly 2 |
| `moosezilla_body` | 112×64 | idle 4; vent 4; damaged 4; critical 4 |
| `moosezilla_legs_back` | 104×48 | idle 1; walk 8; stomp 4; paw 4 |
| `moosezilla_legs_front` | 104×48 | idle 1; walk 8; stomp 4; paw 4 |
| `moosezilla_head` | 64×56 | idle 4; jaw 4; roar 4; flame 4 |
| `moosezilla_jaw` | 40×24 | closed 1; open 4 |
| `moosezilla_antler_l` | 56×48 | idle 1; fire 4; broken 2 |
| `moosezilla_antler_r` | 56×48 | idle 1; fire 4; broken 2 |
| `moosezilla_armor` | 80×40 | intact 1; falling 4 |
| `moosezilla_core` | 32×32 | pulse 4 |
| `moosezilla_debris` | 24×24 | bolt 1; plate 1; gear 1; pipe 1 |

`paratrooper` deliberately shares the infantry visual language, but converts to the `grunt` texture after landing; it does not duplicate grunt firing animations. Its HP and original score identity survive conversion. The chute is independently damageable and detachable. Shield death art depicts the soldier after the shield has separated; trigger shield-break fragments when appropriate.

## Pivots, hitboxes and sockets

Every humanoid faces **right** in source art; origin `(0.5,1)`, local source pivot `(24,48)`. Feet remain on the same baseline through locomotion. Canvas-space coordinates below are before mirroring. Convert a socket to actor-space by subtracting the pivot, then negate X when facing left.

| Asset/socket | Source pixels | Relative to actor pivot |
|---|---|---|
| Infantry rifle, resting | (44,26) | (+20,−22) |
| Infantry rifle, release/recoil | (42,26) | (+18,−22) |
| Grunt crouch rifle, resting | (44,34) | (+20,−14) |
| Grunt crouch rifle, release | (42,34) | (+18,−14) |
| Grenadier hand, release frame 4 | (34,13) | (+10,−35) |
| Infantry body, suggested rectangle | (18,14), 16×34 | (−6,−34), 16×34 |
| Shield blocking rectangle | (31,19), 12×27 | (+7,−29), 12×27 |
| Turret pivot | (16,32) | bottom-center |
| Turret aim joint | (16,14) | (0,−18) |
| Turret body rectangle | (8,8), 18×21 | (−8,−24), 18×21 |
| Drone pivot | (16,12) | center; use origin (0.5,0.5) |
| Drone body rectangle | (9,5), 20×15 | (−7,−7), 20×15 |
| Parachute pivot | (24,48) | chute actor at infantry feet + (0,−33) |
| Chute target rectangle | (3,5), 42×18 | relative to chute pivot: (−21,−43), 42×18 |

Turret directions are **0 E, 1 NE, 2 N, 3 NW, 4 W, 5 SW, 6 S, 7 SE**. Barrel tip = aim joint + `(12*dx,10*dy)` with dx/dy each −1/0/+1; recoil moves two source pixels toward the joint. Use normalized vectors for projectile velocity. Its sandbags are part of the texture; turret artwork is never flipped to track aim.

Projectiles use centered origins. Bullet bright core: (4,4); turret bullet core: (8,4); grenade body center: (5,7). Projectile collision radii: 2, 2, and 3 px respectively. Keep bullet sprites unrotated or snap their rotation to eight directions to preserve the high-contrast core.

## MOOSEZILLA rig

The rig JSON is authoritative. Root is the ground-center point, facing right. Each part position is `root + attach`, and its origin is `pivot / sourceSize`. Sort local z-order ascending. Mirror the **whole assembly** around the root for left-facing entry; independently flipping parts breaks the attachment transforms. Keep world depth within `ENEMIES` (40), below player/projectiles.

| Part | Pivot in its canvas | Attach from ground root | Local z |
|---|---|---|---|
| rear legs | (52,48) | (−8,−3) | 0 |
| left/far antler cannon | (8,44) | (+29,−77) | 1 |
| hull | (56,54) | (−14,−26) | 2 |
| core | (16,16) | (−16,−50) | 3 |
| armor | (40,20) | (−16,−52) | 4 |
| front legs | (52,48) | (−14,0) | 5 |
| head | (12,28) | (+28,−60) | 6 |
| jaw | (4,4) | (+45,−47) | 7 |
| right/near antler cannon | (8,44) | (+38,−74) | 8 |

The complete assembly occupies approximately 166×121 px including antlers. Front and rear legs have opposite gait phases baked into their art; play their tags at the same frame index. Do not additionally offset the rear animation by four frames. Use a heavy 800 ms full gait, small hull y bob (≤1 px), and a stomp shake only when the raised foot lands. Rear feet sit three pixels above the front baseline for perspective.

Sockets live in their part's source coordinates: mouth `(61,43)`, each cannon `(53,21)`, steam `(58,3)`, core `(16,16)`. Transform through pivot, attach and facing. The stomp root point is `(+58,0)`; mirror it for a left-facing stomp. Jaw is a cosmetic child in behavior; the head owns the mouth socket. Jaw-open tag is a full open/close cycle, and can also be paused on frame 3 for a sustained roar/flame.

Core renders behind the armor from spawn but has no active hurtbox until phase 3. Armor is cosmetic and inherits the boss pool; cannon parts each have 45 HP. Every part hit also subtracts from the shared pool once, so overlapping part and hull queries must deduplicate by hit token. Core takes 2× damage. Destroying each cannon awards 500 points once and switches it to broken art; the broken stump can detach at the 60% phase transition. Armor falls at 25%; instantiate three plate debris pieces and play the falling tag once. Death ejects bolts, plates, gears and pipes separately; detach the head and surviving antler stumps with physics motion.

## Animation timing contract

Aseprite frame durations are intentional. Preserve individual durations when creating Phaser animations; do not flatten attack tags to a single frame rate. All attack tags and transitions are non-looping; idle, locomotion, pulse and projectile shimmer loop. Attack releases are one-based **within their tag**, not global atlas indices.

| Attack | Readable anticipation | Commit point |
|---|---|---|
| grunt standing | 160+160+100 = 420 ms | frame 4, rifle recoil/flash |
| grunt crouch | 160+160 = 320 ms | frame 3, low muzzle flash |
| grenadier | 140+120+140 = 400 ms | frame 4, grenade leaves hand |
| shield rifle | 420 ms; shield lowers at 320 ms | frame 4 |
| turret | 4×125 = 500 ms glow | then fire tag; frame 2 at +80 ms |
| drone | 2×160 = 320 ms banking pose | start dive motion after tag completes |
| antler cannon | 160+160 = 320 ms | frame 3, recoil/flash |
| boss stomp | 180+180 = 360 ms foot lift | frame 3, shockwave and footfall |
| mouth flame | 200+200 = 400 ms furnace glow | frame 3, flame cone starts |
| boss charge | 4×125 = 500 ms pawing | accelerate after paw tag completes |

Schedule release **once per action token**, either from animation progress or a scaled gameplay timer, never both. Interrupting or killing a unit invalidates its token. Frozen hitstop must freeze anticipation and projectile release together. During a sustained attack, hold/loop the active poses rather than repeatedly showing a fresh anticipation with no new attack.

## Phase B AI design

Use Engine's real registration APIs after Phase A. Register `enemy:grunt`, `enemy:grenadier`, `enemy:shield`, `enemy:turret`, `enemy:drone`, `enemy:paratrooper`, and `boss:moosezilla`. Factories consume `facing`, `patrol`, and `wave` from map spawns, with defaults. Do not import Player or Level classes; use `ctx.player()`, `ctx.level`, damage service, seeded RNG, pools and the typed event bus. Read the final core contracts before implementation.

### Shared lifecycle and fairness

`Dormant → Spawn/Idle → locomotion → Telegraph → Attack → Recover`; any living state can enter Hurt, then resume or die. Death states stop AI/hurtboxes immediately, emit a single `enemy:killed`, award score once, and play one of three personality deaths (bullet/melee launched; flame soot/flail; explosion spin). Art rotation is already baked into death frames; apply world-space ballistic translation, not a second continuous sprite rotation. Default corpse impulse ±100 X, −240 Y, gravity 900; corpses are non-colliding cosmetic actors.

Activate within camera bounds plus 32 px, including vertical bounds. No firing before the player is alive and the emitter is inside the camera. Do not spawn lethal projectiles into the player; cancel a rifle shot at <18 px and allow melee vulnerability. Sample LOS with `solidAt` every 8 px; sight checks at 100 ms intervals are enough. Ground units turn before a ledge or wall; never walk into water while patrolling. Once alert, retain the target for 800 ms through brief occlusion, but do not shoot through terrain. Use delta-scaled movement and seeded RNG only. Despawn ordinary enemies 96 px behind the camera without score, and retain camera-lock wave accounting by emitting/returning the eventual agreed despawn signal.

A scene owns pooled enemy projectiles (64 bullets / 12 grenades initially), with 16 cosmetic corpse slots and a soft maximum of 24 active enemies. If a pool is exhausted, skip that spawn/shot; do not allocate in the hot loop. Unregister damage queries, cancel action tokens and remove event listeners on destruction, checkpoint reset and scene shutdown. Debug counters should expose per-kind counts, current boss phase, and projectile-pool use.

### Grunt

`Patrol ↔ Idle → Alert → Aim → Burst → Recover`; `Panic → Patrol` can interrupt recovery when an ally dies within 72 px. Walk 28 px/s over a default ±48 px patrol; LOS 160 px, forward cone half-angle 55°. Alert is 360 ms, then standing aim is 420 ms (first shot ~780 ms after sight). Fire 1–3 bullets at 110 px/s, 180 ms apart; the whole burst is advertised by the initial telegraph. Replay/hold the firing recoil pose for subsequent burst bullets. Cooldown 1000–1500 ms. Seeded 25% crouch-shot choice only on level ground. Nearby deaths trigger panic with 30% probability, running 72 px/s away for 900 ms, arms flailing and no gunfire. Panic cannot recursively trigger itself. HP 3, score 100.

### Grenadier

`Approach → SetFeet → Windup → Throw → Recover`, with hysteretic `Retreat` below 80 px until distance exceeds 112 px. Preferred range 120 px; approach 24 px/s, retreat 52. Telegraph 400 ms, cooldown seeded 2200–2800 ms. Throw at ±105 X, −230 Y, gravity 650, 1650 ms fuse; one bounce at restitution 0.35, then rest until fuse ends. Blink fuse through the four-frame tag. Fuse explosion uses radius 26 and 1 player damage; emit `explosion` separately from applying damage. Reject throws obstructed directly above the hand or landing beyond the camera; reposition instead. HP 4, score 150.

### Shield trooper

`Advance → Brace → Lower → Fire → Raise`, with `BlockSpark` as a short visual overlay and `ShieldBroken → Unshielded` as a permanent branch. Advance 18 px/s. Front bullet impacts within a 65° half-angle hit the 10-HP shield instead of the 6-HP body. Bullets from above/behind, melee, flame, grenades and rockets can bypass it; detect rocket identity before treating it as an ordinary bullet. Never count a blocked hit on both shield and body. Lower at 320 ms, fire at 420 ms, stay exposed through recovery; then raise. Bullet 110 px/s, cooldown 1500–1900 ms. After shield break, use unshielded body/death art and grunt movement/attacks, retaining 200-point identity. HP 6, score 200.

### Turret

`Track → Glow → Burst → Cooldown`; tracking selects one of eight directions within 192 px LOS. Lock the direction when the 500 ms glow begins; never retarget a burst toward the moving player mid-telegraph. Fire five 130 px/s bullets at 120 ms intervals. Fire tag frame 2 releases the first bullet 80 ms after glow ends; subsequent bullets repeat the brief active recoil. Cooldown 1600 ms. Destroyed art ends with a smoking disabled base, with FX providing falling metal fragments. HP 12, score 300.

### Buzzard drone

`Cruise → Bank → Dive → Recover → Cruise`. Cruise 44 px/s on a sine of amplitude 12 px and period 1800 ms. Detect at 144 px; bank for 320 ms, lock a target point, then dive at 125 px/s for ≤700 ms, followed by a 900 ms climb/recovery. Limit the bank to one dive per visible pass and clamp the recovery inside flight bounds. Contact damage activates during the committed dive only; terrain contact destroys the drone. Death uses four spin-fall frames plus translation/gravity and metal sparks. HP 2, score 150.

### Paratrooper

`ChuteDescent → Land → Grunt`; `ChuteHit → Freefall → Land` is the alternate path. Descend at 28 px/s with gentle 4 px sway (cosmetic, no aim wobble). Chute has 1 HP; body has 3 independent HP. Shooting the chute plays tear art and detaches fragments, then gravity 550 accelerates the body to a 190 px/s cap. Landing compresses across 300 ms, then gives 360 ms grace before grunt alert/aim. No falling body contact damage. Initial descent is clamped to a valid ground corridor by the level spawner. Chute destruction awards no score; the soldier retains its 150-point identity after conversion.

### MOOSEZILLA

Boss registration locks the arena and emits `boss:spawn`; phase/HP changes emit the typed boss events. Root health 400, core 2× weakness. Each cycle chooses a single attack, with 700 ms vulnerable recovery between major attacks and a short reposition. Avoid back-to-back versions of the same attack. Boss hurtboxes are custom rectangles/circles transformed with the rig; ground legs are cosmetic, not four separate colliding Arcade bodies.

- **Phase 1 (100–60%):** enter from the right facing left, walk 18 px/s within 24 px arena margins. Alternate cannon volleys and stomps. Each intact cannon advertises 320 ms, then fires a three-bullet spread at −18°/0°/+18°, speed 105 px/s. Stagger cannon sides by 250 ms; volley cooldown 1800 ms. Every second volley, raise a forefoot for 360 ms, stomp and send a ground shockwave toward the player at 90 px/s. Steam pulses accompany recovery; damaging steam requires its own 500 ms advertised vent and an explicit FX request, so initial steam is cosmetic.
- **Phase 2 (60–25%):** cancel pending attack tokens, enter a 700 ms safe roar, then break/detach surviving antler barrels. Retain cannon bonus awards only for player-destroyed cannons. Alternate mouth flame (400 ms furnace glow; 900 ms cone, 88 px range, slow −15°…+25° sweep; damage ticks ≥120 ms) and drone release (500 ms vent/roar before spawning). Spawn at most three drones at 450 ms spacing; do not add more while the previous group remains. Keep at least a 64 px safe gap beyond the flame cone. Stomps can return as a third choice after both signature attacks have appeared.
- **Phase 3 (<25%):** armor separates after a safe 700 ms roar; activate the core hurtbox. Alternate paw/charge and shortened flame recoveries. Paw 500 ms, then charge at 130 px/s toward the previously locked side; stop before arena limits, recover 700 ms. Never reverse or track the player during a committed charge. The player can jump the charge/stomp; don't combine a charge with airborne drone contact in the same instant. Keep core collision positioned from the rig throughout movement.
- **Defeat:** disable damage/contact and cancel all attack spawns immediately. Run chain explosions for exactly 3000 ms at ~180 ms intervals, emit hitstop/flash/shake/slowmo requests, and detach pieces. Drop the head near ground with a damped bounce and wobble attached broken antlers. Award 5000 points once; only then emit `boss:defeated` and release the level's stage-clear flow. Death art debris uses its four named one-frame variants; physics supplies flight and rotation.

## Verification and previews

Built every owned Lua entry successfully. Data audit passed: 20 textures / 366 frames / 104 tags; required action counts, unique keys, pack file references, rig tags/pivots, atlas bounds and ≥300 ms attack anticipations. Visually inspected the roster, infantry deaths/throws/shield actions, turret's eight directions, drone flaps/spin, chute tear, boss hull variants, core pulse and assembled rig. Corrected crouch shot release, complete hurt flash, six-frame run seams, rear-leg visibility, and armor insignia after inspection. A source-pixel audit checked 325,863 opaque pixels; all use the shared palette.

- `/tmp/kbe-enemies/roster.png`: enemy readability against forest, timber and bunker palette swatches.
- `/tmp/kbe-enemies/moosezilla-assembled.png` and `.gif`: actual rig assembled at 4×, including opposite gait phases and cannon recoil.
- `/tmp/kbe-enemies/moosezilla-phases.png`: assembled intact, damaged/flame and exposed-core phase poses.
- `/tmp/kbe-enemies/<key>-contact.png`: one row per tag, in the inventory/export tag order.
- `/tmp/kbe-enemies/<key>-strip.png`: full 4× horizontal PNG strip; companion `-strip.json` lists durations.
- `/tmp/kbe-enemies/<key>.gif`: every source's full exported sequence at 4×.
- `/tmp/kbe-enemies/validate.py`: scratch metadata/timing validation, rerunnable during this session.

`npm --prefix game run check:phaser4` passed (17 files, zero findings at verification time). `npm --prefix game run typecheck` currently fails in Engine-owned `src/core/contracts.ts:299`: missing `./projectiles`. No changes were made outside ownership to resolve that in-progress dependency. In-game screenshot validation is deferred to Phase B because these assets have no gameplay implementation yet.

## Known gaps

Art is complete for the requested roster and boss parts. Phase B still needs animation registration/loop policy, rig assembly, independent hurtboxes, pooling, AI, collision, score/events and tuning playtests. Windups are encoded in durations and poses, but safety also depends on Phase B honoring cancellation, LOS and camera gating. Runtime flame cones, shockwaves, large steam plumes, muzzle particles and chain explosions are Effects-owned visuals; the small painted flashes/glows here mark anticipation/release. Final silhouettes need inspection against the actual moving stage backgrounds after integration; the current contrast board uses representative palette swatches.

## Requests for other teams

- **Engine:** load `packs/enemies.json`, preserve atlas per-frame durations, register all frameTags once, and expose scaled update/time semantics that keep release timers frozen during hitstop. Resolve the in-progress `./projectiles` import in core contracts. Confirm wave-clear handling for despawns and paratrooper-to-grunt conversion without counting a second spawn/death.
- **Player / Damage:** distinguish frontal shield blocks from body damage, preserve hit direction and `weapon` identity (rocket bypass), and deduplicate boss part/hull damage by projectile/action token. Chutes need their own enemy-team hurtbox with no score award.
- **Levels:** use the six exact enemy `kind` keys and `boss:moosezilla`; place chute spawns above safe landing corridors, keep boss arena edges at least 24 px clear, and reserve the ≥166×121 boss silhouette. Do not spawn bridge paratroopers directly over unavoidable water.
- **Effects:** provide a jumpable ground shockwave, an 88 px mouth flame cone, steam vent plume, shield spark, cannon-break metal bits and a 3 s boss chain-explosion sequence. Sockets and release timings are in the rig/data; gameplay owns damage separately from visual `explosion` events.
- **UI / Audio:** route the existing enemy-killed/boss events to score/HP display; add red-soldier alarm/panic, metal shield tink/break, Buzzard bank, cannon charge/fire, moose roar/stomp/flame and final head-clang cues. Lead should settle exact audio keys in Phase B.
- **QA:** verify ≥300 ms attack telegraphs at normal speed and slowmo, offscreen-fire suppression, no shield/body double hit, chute conversion score once, boss threshold transitions cancel pending shots, and cleanup on checkpoint/restart.
