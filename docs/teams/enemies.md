# Enemies, AI and bosses — Phase A art and Phase B gameplay

The Phase A handoff below describes the original art delivery. Phase B gameplay and verification are documented at the end of this file. No archived graphics were copied. All opaque colors come from `K.PAL`; no palette exceptions.

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

## Phase B gameplay implementation

Owned runtime files:

- `game/src/entities/enemies/index.ts`: all six enemy factories and `boss:moosezilla`, debug snapshots, opt-in sandbox fixture.
- `game/src/entities/enemies/Enemy.ts`: shared lifecycle and six scaled state machines; independent chute hurtbox, frontal shield guard, LOS/terrain movement, projectile attacks, panic, personality deaths and cleanup.
- `game/src/entities/enemies/animations.ts`: repair this team's Aseprite animations using actual `texture#N` names and authored per-frame durations. Phaser 4.2.1's built-in helper assumes numeric frame names and otherwise creates empty animations. The repair touches no other team's animations.
- `game/src/entities/bosses/Moosezilla.ts`: cached JSON rig assembly/socket transforms, all three phases, cannon HP/bonus, weak core, charge, stomp, flies, attached steam, detached parts/head/antler wobble and delayed defeat.
- `game/src/config/tuning/enemies.ts`: HP/score/movement/range/windup/cooldown defaults and budgets.
- This document. No engine, player, effects, map, pack, git state or dependency changes.

All score enters through `enemy:killed`; no direct score writes. One composite boss hurtbox routes cannon/core hits by world location, avoiding overlapping part/hull double damage for explosions and piercing shots. Cannons each have 45 HP and award 500 only when player-destroyed, independently of shared boss HP. Threshold crossing loops emit phase 2 and phase 3 even on a single lethal hit. The final 5000 award and `boss:defeated` occur once after the 3000 **gameplay-ms** chain; hitstop/slowmo can make it longer in real time. Boss defeat clears enemy bullets and destroys its remaining flies. The level owns mission completion after `boss:defeated`.

Factories accept `facing` (`left`/`right` or ±1), numeric `patrol` radius (false/0 disables it), and retain `wave` in the actor/debug snapshot. Boss optionally accepts `arenaX0`/`arenaX1`; defaults to a 384px camera arena. Foot-based ground actors use `groundBelow` and terrain/hazard queries, rather than creating redundant Arcade bodies. Ordinary actors suspend AI/clocks outside camera +32 and destroy themselves >96px behind it without scoring. All damage registrations, updater subscriptions, chute sprites and ally-death listeners are released on destruction. Enemy count is bounded at 24 (including corpses).

### Tuning and behavior

Reference HP/score: grunt 3/100, grenadier 4/150, shield 6/200, turret 12/300, drone 2/150, paratrooper 3/150. Infantry has a 360ms alert before its weapon anticipation. Rifle anticipation 420ms, grenade 400ms, turret 500ms glow plus 80ms release, drone bank 320ms. Rifle bullets are 110px/s, turret 130, cannon 105; bullets use engine pooling and `team:'enemy'`. A cone/8px LOS sampling prevents infantry spotting through terrain; committed shots also recheck visibility and LOS. Close rifle shots cancel inside 18px.

Grenades use 105px/s horizontal launch, −230px/s vertical, gravity 650, 1650ms fuse, one .35 bounce then rest; explosion radius 26. Grenadiers approach beyond 140px and retreat below 80px (continue retreat to 112px during recovery). Shield blocks ordinary frontal bullets, consumes their live projectile, returns false to DamageService and emits a shield impact; rear/above/flame/explosion/rocket attacks bypass it. Shield opens for rifle release and recovery, and has 10 blocking HP.

Turret aim locks to one of eight directions through its five-shot burst (120ms spacing). Drone flight has a 12px/1800ms sine, 125px/s committed dive, 700ms dive cap and 900ms recovery. A torn 1HP chute accelerates the 3HP soldier into freefall, then converts it to grunt animations after a 660ms landing/grace interval, retaining 150-point identity. Nearby ally deaths have seeded 30% panic chance, 72px/s flee for 900ms. Bullet/explosion deaths use authored launch/spin frames plus a ballistic arc; flame soot remains at ground level.

Boss: 400 HP; thresholds 240 and 100; core takes 2× within 19px of its socket. Phase 1 cannon spreads alternate with a 360ms stomp/90px/s low shockwave and cosmetic vents; recovery movement reverses at arena margins. Phase 2 has a 400ms furnace windup, 900ms/88px flame sweep and groups of at most three flies, with no replacement group while flies survive. Phase 3 uses 500ms pawing then a fixed-direction 130px/s charge, alternating flame. Phase transitions provide 700ms safe roar and cancel pending releases; surviving flies are removed before phase 3. Death sends 17 positioned explosion events about 180ms apart, T4 shake, flash, hitstop and slowmo, flies parts, and lands a head with damped antler wobble.

### Exact sandbox commands

From repo root; `shot.mjs` starts an independent random-port server. All fixture behavior is opt-in and requires `enemytest`. Keep source edits paused during a run to avoid Vite reload invalidating the scene. `__KBE_ENEMYTEST` exists only in this fixture and is deleted on scene shutdown. `hitAt` routes through the actual damage service; `hit` is radial, `spawn` calls the real factory, and `bossHp` changes the real boss HP/phase state.

```bash
mkdir -p /tmp/kbe-enemies
# Each of the six kinds: captures the opening and a full attack/recovery cycle.
for kind in grunt grenadier shield turret drone paratrooper; do
  node game/tools/shot.mjs --out "/tmp/kbe-enemies/${kind}-cycle.png" --query "scene=Game&fast=1&mute=1&god=1&enemytest=${kind}" --wait 800 --steps '[{"wait":1200},{"wait":1800},{"wait":2800}]'
done

# Grunt burst; shoot it or use hit() below to see the launched corpse.
node game/tools/shot.mjs --out /tmp/kbe-enemies/grunt.png --query 'scene=Game&fast=1&mute=1&god=1&enemytest=grunt' --steps '[{"wait":800},{"shot":"/tmp/kbe-enemies/grunt-attack.png"},{"eval":"__KBE_ENEMYTEST.hit(\"grunt\",10,\"bullet\")"},{"wait":250}]'

# Grenadier arc/fuse/explosion, then explosion death.
node game/tools/shot.mjs --out /tmp/kbe-enemies/grenadier.png --query 'scene=Game&fast=1&mute=1&god=1&enemytest=grenadier' --steps '[{"wait":1000},{"shot":"/tmp/kbe-enemies/grenadier-arc.png"},{"wait":1800},{"shot":"/tmp/kbe-enemies/grenadier-blast.png"},{"eval":"__KBE_ENEMYTEST.hit(\"grenadier\",10,\"explosion\")"},{"wait":250}]'

# Shield frontal fire, firing window, then soot death.
node game/tools/shot.mjs --out /tmp/kbe-enemies/shield-soot.png --query 'scene=Game&fast=1&mute=1&god=1&enemytest=shield' --steps '[{"hold":"x","ms":700},{"shot":"/tmp/kbe-enemies/shield-block.png"},{"wait":900},{"shot":"/tmp/kbe-enemies/shield-open.png"},{"eval":"__KBE_ENEMYTEST.hit(\"shield\",10,\"flame\")"},{"wait":600}]'

# Turret: wait for the actual glow state, then capture burst.
node game/tools/shot.mjs --out /tmp/kbe-enemies/turret-cycle-end.png --query 'scene=Game&fast=1&mute=1&god=1&enemytest=turret' --steps '[{"eval":"(async()=>{for(let i=0;i<60;i++){if(__KBE.state().enemyAI[0].state===\"windup\")return;await new Promise(r=>setTimeout(r,50));}throw Error(\"no windup\");})()"},{"shot":"/tmp/kbe-enemies/turret-glow.png"},{"wait":650},{"shot":"/tmp/kbe-enemies/turret-burst.png"},{"wait":1200}]'

# Drone sine/bank/dive/recovery, then shot-down death.
node game/tools/shot.mjs --out /tmp/kbe-enemies/drone-death.png --query 'scene=Game&fast=1&mute=1&god=1&enemytest=drone' --wait 900 --steps '[{"shot":"/tmp/kbe-enemies/drone-bank.png"},{"wait":500},{"shot":"/tmp/kbe-enemies/drone-dive.png"},{"wait":1500},{"shot":"/tmp/kbe-enemies/drone-recover.png"},{"eval":"__KBE_ENEMYTEST.hit(\"drone\",10,\"bullet\")"},{"wait":250}]'

# Chute destruction, freefall and grunt conversion; omit hitAt to see full descent.
node game/tools/shot.mjs --out /tmp/kbe-enemies/chute-torn.png --query 'scene=Game&fast=1&mute=1&god=1&enemytest=paratrooper' --wait 850 --steps '[{"eval":"(()=>{const s=__KBE.state().enemyAI[0];__KBE_ENEMYTEST.hitAt(s.x,s.y-67);})()"},{"wait":180},{"shot":"/tmp/kbe-enemies/chute-tear.png"},{"wait":1400},{"shot":"/tmp/kbe-enemies/chute-freefall-land.png"},{"wait":1000}]'

# All three boss phases and death. HP values 239 and 99 cross the real thresholds.
node game/tools/shot.mjs --out /tmp/kbe-enemies/boss-final.png --query 'scene=Game&fast=1&mute=1&god=1&enemytest=boss' --steps '[{"shot":"/tmp/kbe-enemies/boss-cannon.png"},{"wait":4500},{"eval":"__KBE_ENEMYTEST.bossHp(239)"},{"wait":1500},{"shot":"/tmp/kbe-enemies/boss-flame.png"},{"wait":2300},{"shot":"/tmp/kbe-enemies/boss-flies-active.png"},{"eval":"__KBE_ENEMYTEST.bossHp(99)"},{"wait":1100},{"shot":"/tmp/kbe-enemies/boss-paw.png"},{"wait":500},{"shot":"/tmp/kbe-enemies/boss-charge.png"},{"eval":"__KBE_ENEMYTEST.bossHp(0)"},{"wait":1500},{"shot":"/tmp/kbe-enemies/boss-death.png"},{"wait":9000}]'

# Precisely observe stomp anticipation and ground shockwave.
node game/tools/shot.mjs --out /tmp/kbe-enemies/boss-stomp-end.png --query 'scene=Game&fast=1&mute=1&god=1&enemytest=boss' --steps '[{"eval":"(async()=>{for(let i=0;i<120;i++){if(__KBE.state().boss.state===\"stomp\")return;await new Promise(r=>setTimeout(r,100));}throw Error(\"no stomp\");})()"},{"shot":"/tmp/kbe-enemies/boss-stomp-windup.png"},{"wait":420},{"shot":"/tmp/kbe-enemies/boss-shockwave.png"}]'
```

### Audio keys

`docs/teams/ui-audio.md` did not exist during implementation. Calls use safe no-op keys: `enemy_shout`, `enemy_shoot`, `enemy_die`, `enemy_panic`, `grenade_throw`, `shield_tink`, `turret_windup`, `drone_buzz`, `chute_tear`, `boss_roar`, `boss_cannon`, `boss_stomp`, `boss_flame`, `boss_explode`, `steam`.

### Verification evidence and limitations

Typecheck and Phaser 4 checker both passed after implementation (54 files, 0 checker errors/warnings). Visual inspection used the real sandbox, god mode and actual art, not a mock scene. Inspected rifle shots, grenade motion, turret glow/burst, shield exposure and soot, drone dive/spin death, chute descent/tear/landing/grunt conversion, all boss phases, stomp shockwave, flies, core, chain explosions and landed head/antlers. PNGs are in `/tmp/kbe-enemies/` with descriptive names matching the commands above.

Focused browser assertions passed: shield front returns false without body HP loss, rear bullet damages; chute tear preserves all 3 body HP and lands; drone kill yields 150 once; cannon destruction subtracts shared HP and yields 500; core damage 3 subtracts 6; large HP threshold jump emits `[2,3]`; final boss defeat occurs once and total score is 5500 with that cannon bonus. Boss fly spawning was separately asserted. Failed early runs found and fixed the empty-animation crash, missing drone death target height, suppressed boss flies and falling soot corpses. Some simultaneous browser runs were invalidated by Vite reload or transient `ERR_NETWORK_CHANGED`; their incomplete captures are not acceptance evidence.

Full QA initial run: **8 passed, 6 failed, 2 skipped** (2.8 min). Failures were Engine `SANDBOX_NAME is not defined` during concurrent hook edits, a hook disappearing on reload, and a `Preload`/Game readiness assertion. A final rerun is recorded below when complete. Tests do not include enemy combat acceptance; the focused fixture checks supply that coverage.

Known integration limits: actual Stage 1 is not yet registered, so wave arenas/terrain routes and mission completion have not been accepted. Boss damage uses one broad silhouette rectangle with coordinate-routed parts, not per-pixel geometry. Flame uses bright orange engine projectiles for its sweep. Steam is cosmetic and guarded until FX registers a nonempty vent animation. Phase A's separate 16-corpse/12-grenade pools were replaced by a bounded actor count and Engine's shared projectile pool. Physical god-mode survival and jump timing are visually exercised with cheats, not a no-cheat balance/playthrough acceptance.

### Requests for other teams — Phase B

- **Levels:** spawn the registered factories when map objects activate; pass `facing`, numeric `patrol` and `wave`. Boss arena limits may be supplied as `arenaX0`/`arenaX1`. Listen for delayed `boss:defeated` to release stage-end/mission completion; this team does not emit `stage:clear` itself. Wave bookkeeping should track spawned actor lifecycle, since a chute contributes an additional enemy hurtbox. There is no typed wave/despawn event in the current contract.
- **Engine/QA:** keep `__KBE.ready` false until Game factories, level and player are ready, and rerun after concurrent hook edits settle. Initial full-suite failures and paths are recorded above; do not count skips as accepted gameplay.
- **UI/audio:** map the 15 safe SFX keys above to the final audio catalog. Render `boss:spawn`/`boss:hp`/`boss:phase`/`boss:defeated` and popup events. No audio or UI source was edited here.
- **FX:** enemy emits its own machine/boss explosion positions and final boss event only after its death chain; avoid starting another positional chain on `boss:defeated`. Keep `fx_steam_vent` playable and registered; attached steam is locally reused.

Full QA second default-config run: **9 passed, 4 failed, 3 skipped** (2.8 min). The run reported port 4310 already occupied, missing shared trace/artifact files (`ENOENT`), then canvas/network failures and `ERR_CONNECTION_REFUSED` when the shared server stopped. This is an invalid shared-runner acceptance result. A `/tmp/kbe-enemies/playwright.config.ts` wrapper imports the unchanged QA config and overrides only port/baseURL (4479) and artifact directory (`/tmp/kbe-enemies/qa-results`); it preserves test files, timeouts, assertions and browser settings. Run it with:

```bash
node game/node_modules/@playwright/test/cli.js test --config /tmp/kbe-enemies/playwright.config.ts --reporter=line
```

Final integration updates: Engine added `enemy:shoot` and optional boss event x/y while this work was in flight. Infantry/turret and cannon releases now emit the real muzzle socket through `enemy:shoot`; every boss lifecycle payload includes x/y, and stomp emits `fx:emit {effect:'shockwave'}`. Fixed behind-camera culling to run before the dormancy early-return. Drone recovery now moves back toward its original flight corridor and reverses toward the corridor at its boundaries; terrain collision causes a spin-fall death. Chute tearing stays visible for 350ms and descent has 4px cosmetic sway.

Isolated unchanged **dev-server QA: 12 passed, 1 failed, 3 skipped** (2.9 min). Remaining failure: `gameplay.spec.ts:42` expected camera X to advance >5 after 2500ms right, received 0. Stage 1 registered during the run; Player remains at x104 in the camp by the initial cage/props. This needs Player/Levels/QA investigation; no camera/player/map edits were made by Enemies. Three skips are Title/Pause flow, Continue UI, and pause/resume scene capability gates, so these flows remain unaccepted.

To finish visual verification despite concurrent HMR, built a frozen production bundle with `node game/node_modules/vite/bin/vite.js build game --outDir /tmp/kbe-enemies/frozen-build`. A scratch copy `/tmp/kbe-enemies/shot-snapshot.mjs` of the repository harness changes only module import paths/server root to serve that bundle; all steps and capture behavior are identical. Stage 1 had landed by this build. **Frozen boss run passed**, console clean, score 5000, exactly one delayed defeat and phase events `[2,3]`. Inspected `/tmp/kbe-enemies/frozen-boss-{flame,flies,charge,death,final}.png` against the actual map. This is supplementary integration smoke coverage; it does not establish full Stage 1 traversal/balance acceptance. Frozen panic/dormancy/culling assertions also passed (no behind-camera actor remained; offscreen grenadier stayed at x900).

A final suite run against the frozen bundle uses the unchanged tests with `/tmp/kbe-enemies/playwright-frozen.config.ts` (port 4481, artifacts `/tmp/kbe-enemies/qa-frozen-results`). Last source checks passed: typecheck; Phaser checker **63 files, 0 errors/warnings**; production build succeeded.

Frozen drone recovery assertion passed using the actual actor home x (214), rather than the player's later cage-adjusted x: recovery moved x129.75 → x144.83 toward home, then its shot-down death awarded 150. Inspected `/tmp/kbe-enemies/frozen-drone-recovery.png`. Earlier player-relative recovery assertion was a test-target error, not an AI failure.

Remaining actionable request from the isolated QA run: **Player + Levels + QA** investigate `gameplay.spec.ts:42` at the actual camp start (player x104, camera x0). The old sandbox assumed a clear 2500ms run; the new camp has cage/prop collision and different traversal. Reproduce before deciding whether the test needs a clear camera-test corridor or the spawn/collision needs repair. Enemies did not change these owned systems. Existing Levels wave logic already accepts our public numeric HP/active lifecycle, so no new wave event is required for current integration.

Final QA accounting: the extra frozen-production suite terminated with **exit 143 / SIGTERM**, without a test summary; it is interrupted and supplies no additional acceptance. The most recent **completed** full QA result remains **12 passed, 1 failed, 3 skipped** from the isolated dev-server run. The original required default-config command was run and reported separately above. No failing Player/Levels/Engine/UI files were edited. All enemy/boss runtime sources pass project typecheck and the Phaser checker; the frozen production build and focused enemy/boss browser checks completed successfully.

## Phase D — QA fixes and polish (2026-10-16)

Owned changes stay in `game/src/entities/{enemies,bosses}`, `game/art-src/enemies`, the enemy sprite outputs, and this handoff. No installs, commits, staging, or branch changes.

- **KBE-QA-N01:** factories consume `idle=sleep/crouch/flee`, `from=door`, and turret `mount=sandbag/roof/pedestal`. Sleep has a closed-eye animation and floating `Zzz`, wakes to sight, nearby shots/explosions/ally deaths or damage, then jolts into alert. Door entry walks for 650 scaled ms before normal AI or authored fleeing. Crouch has a held low pose and lower hurtbox. Pen guards keep running away from the player. Turret steel roof/pedestal bases cover the baked sandbags; default sandbags remain unchanged.
- **KBE-QA-N02:** removed the 152×116 silhouette target. Thirteen rig-relative rectangles cover hull, head, separated legs, antler roots/palms, and phase-3 core. Empty top corners and the space between feet miss. Detached parts stop receiving hits; destroyed antler palms stop receiving hits and retain broken art. Core is registered last, brought above the assembly in phase 3, and takes 2× damage. Projectile pierce memory includes sibling boss boxes; synchronous radial/melee traversal suppresses repeated pool damage across the shapes.
- **KBE-QA-N03:** descent and landing update outside the visibility margin. Behind-camera cleanup still applies, and falls below the level bounds are cleaned up. Tested the specific 88-pixel-behind-camera case.
- **Rules N1:** steam goes through `fx:emit {effect:'vent_steam'}` at the rig socket. Removed the private steam sprite and duplicate audio request; Audio owns the event's hiss. **N2:** reset tint only when a flash expires. **N3:** cache enemy pose tags and remove atlas reconstruction. Engine's landed `hasAnim()` and Preload builder own validation, direction and original durations. The small enemy animation registration now sets only projectile loop policy.
- **QA #6:** hostile projectiles are outlined round pearls with a white/yellow core and red rim, without tracer tails. The larger turret pearl uses outlined side tabs. Lua source and PNG/JSON/ASE outputs rebuilt; screenshots inspected against snow, fence and rock.
- **QA #7:** every shield block emits `shield_spark` and holds the block pose briefly. Recovery has a new low-shield animation, stays vulnerable, and returns to a raised shield afterward. Broken shields switch to unshielded grunt poses. Front block and exposed recovery are tested separately.
- **QA #9:** cannon charge uses head/cannon anticipation, a floor target bracket and `turret_windup`; the second antler's anticipation is staggered with its actual shot. Flame uses the furnace/jaw pose, an 88-pixel reach line and `flame_start`. Charge uses pawing/roar, a red floor lane with directional chevrons and `boss_charge`. Phase-3 core stays on top. All cues use the scaled boss clock and disappear on interruption/death.
- **Art:** longer, overhanging drooping nasal bridge/lip, two large leaf ears, a hanging copper bell, and broad riveted palmate antler plates with crown tines. Slimmed the cosmetic lower jaw so it no longer hides the muzzle. Existing canvas sizes, pivots, attachments, sockets and rig JSON remain compatible. Rebuilt through the Lua/Aseprite pipeline and inspected the assembled preview.

### Phase D evidence

Scratch and verification scripts: `/tmp/kbe-enemies/`.

- Before boss: `/tmp/kbe-enemies/before-boss.png`; before authored props: QA's `game/tests/artifacts/2026-10-16T18-58-07-454Z-phase-c-investigations-3486424/003-ignored-sleep-flee-mount.png`.
- After roster: `/tmp/kbe-enemies/after-{grunt,grenadier,shield,turret,drone,paratrooper}.png` (`?enemytest=<kind>`).
- Acting: `after-authored-entry-sleep.png`, `after-authored-flee-crouch-mounts.png`, `after-sleep-wake.png`; shield: `after-shield-block.png`, `after-shield-exposed.png`.
- Boss phases: `after-boss-phase1-cannon.png`, `after-boss-phase2-flame.png`, `after-boss-phase3-charge.png`, `after-boss-defeat.png`.
- Bullet contrast: `after-bullets-{snow,fence,rock}.png`. Art: `moosezilla-assembled.png`, `moosezilla-assembled.gif`, `moosezilla-phases.png`.
- `verification.json`: all 19 focused assertions pass; no browser console/page errors in the clean run. Includes all six valid animation fixtures, sleeping/entry/flee/wake, shield block/exposure, off-view descent, empty-corner and foot-gap misses, antler routing, one shared-pool explosion hit, 2× core and defeat completion.
- `npm --prefix game run typecheck`: PASS. Strict Phaser 4 checks on both owned entity directories: PASS, zero errors/warnings.
- Requested Playwright suite: first run 15/19 (Pause resume plus three transient `ERR_NETWORK_CHANGED` failures); clean rerun **18/19**. Remaining failure is `flow.spec.ts:3`, Title → Game → Pause → resume (Pause remains active), outside enemy ownership. Logs: `/tmp/kbe-enemies/qa-rerun.log`; traces/screenshots: `/tmp/kbe-enemies/qa-rerun/`.

Remaining verification limit: screenshots use `mute=1`; sound trigger/key coverage is exercised, but audible mix quality was not judged.

Final focused smoke: `/tmp/kbe-enemies/final-smoke.json` passes actual projectile piercing (400→398 exactly once) and one steam event, with no browser errors. Additional inspected captures: `after-boss-steam.png`, `after-turret-mounts.png`, `after-shield-block-spark.png`. FX's concurrently landed anticipation contract is now wired once at each committed windup: `boss_cannon_charge` (staggered sockets), `boss_flame_reach` (88/84 scale), `boss_charge_lane` (leading foot/direction). Boss-owned floor graphics continue to provide the full arena lane and interruption-safe timing.

Final smoke also matches the player's actual melee implementation, which creates a fresh `HitInfo` per queried shape: one knife swing at 3 damage subtracts 3 HP total (398→395), while piercing subtracts 2 once (400→398). Final focused rerun remains 19/19, console clean. Typecheck and both strict owned-directory checks pass after the final changes.

## Antler silhouette revision (2026-10-16)

Replaced the upright crown with broad rearward brass palm scoops, steel rims and six short, splayed cannon tines per side. Far-side art uses the shadow ramp and its attachment moves from `[29,-77]` to `[24,-81]`; near attachment stays `[38,-74]`. Both source canvases are now `80×48`, pivots `[72,44]`, and active palm cannon sockets `[70,28]`. The recessed breech recoils behind a fixed muzzle. Broken palms end in a jagged mid-plate tear with exposed wire and animated sparks. Source-space antler damage rectangles follow the new root/palm; destroyed palms stay disabled. Death-head antler origins now read the rig instead of the old hardcoded canvas/pivot.

Rebuilt with `bash game/tools/build-art.sh art-src/enemies/moosezilla.lua`. Inspected 4× assembly, intact/fire/broken contacts, pure-black silhouette and the requested in-game capture. Scratch previews: `/tmp/kbe-enemies/antlers-before.png`, `moosezilla-assembled.png`, `antlers-silhouette.png`, `antlers.png`. Focused boss report: `/tmp/kbe-enemies/antlers-verification.json` (7/7: muzzle events, 45-HP destruction/500 points, no destroyed-palm firing/hurtbox, phase-2 detach/flame, phase-3 charge/2× core, single defeat/landed origins, clean browser console). Project typecheck and full strict Phaser checker pass (84 files, zero errors/warnings).

Existing focused enemy/boss checks also rerun successfully: **19/19**, browser console clean (`/tmp/kbe-enemies/verification.json`).

## Final hook gate and drone audio (2026-10-16)

- Gate the entire `enemytest` fixture block on `ctx.debug.cheatsEnabled`, including fixture spawning, event counters and `window.__KBE_ENEMYTEST` mutation methods. Production without `debug=1` exposes no fixture/API and spawns no test boss; production with `debug=1` enables the fixture and boss HP control. Dev-server fixtures remain available.
- Each visible living drone owns a `getAudio(scene).loop('drone_buzz', { x })` handle, waits for audio unlock, and updates its position with `setX`. Leaving view, death, destruction/despawn and scene shutdown stop the loop. Retain stolen handles until the next visibility activation so the catalog's voice cap cannot trigger repeated restarts. Windup now requests the dedicated `drone_dive` one-shot.
- `npm --prefix game run typecheck`: PASS. `npm --prefix game run check:phaser4 -- --strict`: PASS, 84 files, zero errors/warnings. `npm --prefix game run build`: PASS; served the resulting `game/dist` with installed Vite preview on port 4487.
- Production browser checks: **9/9 PASS**, no page errors. Verified ignored fixture/API without debug, enabled fixture/HP control with debug, two independent buzz loops, positional updates, loops **2 → 1 → 0** after actual drone deaths, zero loops after despawn, and zero after scene shutdown. Evidence: `/tmp/kbe-enemies/production-audio.{mjs,json,log}`. An earlier position assertion sampled stationary windup; the final check applies a controlled position change and verifies `setX` follows it.
- Existing focused enemy/boss checks: **19/19 PASS**, browser console clean (`/tmp/kbe-enemies/final-focused.log`, `/tmp/kbe-enemies/verification.json`). QA's unchanged dev-server Playwright suite: **19/19 PASS**, 59.4 s (`/tmp/kbe-enemies/final-qa.log`, `/tmp/kbe-enemies/final-qa/`).
- Browser verification used the existing repository Playwright setup because T3 preview reported missing host browser libraries. No installs or git state-changing commands; source edits limited to the two enemy files and this handoff. Audible mix quality was not judged.

## Phase E — Snowcat, Ironhorn and the train/lake roster (2026-10-16)

### Owned delivery

- Runtime: `game/src/entities/bosses/MachineBoss.ts` (both mid-bosses), `game/src/entities/bosses/Moosezilla.ts`, `game/src/entities/enemies/AssaultEnemy.ts` (hound/Buzzard), `Enemy.ts` (leaper entry and existing infantry patrol home), `index.ts` (factories, snapshots and fixtures).
- Tuning: `game/src/config/tuning/enemies.ts`; new mid-boss values live in `MIDBOSSES`, ordinary roster values in `ENEMIES`.
- Art builder: `game/art-src/enemies/phase-e.lua`, using the existing KBE palette/drawing helpers. Rebuild with `bash game/tools/build-art.sh art-src/enemies/phase-e.lua`.
- Eleven editable `.aseprite` files and matching packed PNG/JSON-hash atlases: `snowcat`, `snowcat_tread`, `warden`, `ironhorn`, `ironhorn_turret`, `driver`, `hound`, `buzzard`, `leaper`, `coal`, `cinder`. Sources are under `game/art-src/enemies/`; outputs under `game/public/assets/sprites/enemies/`; registered in `game/public/assets/packs/enemies.json`. **177 frames, 41 globally prefixed tags**, all 41 verified present in Phaser's animation manager. Master palette only.

### Boss contract and attacks

Both factories accept `arenaX0`/`arenaX1`, lock the camera and keep their hull inside the current view. All clocks use scaled `ctx.onUpdate` time; interrupting a state or dying cancels unreleased attacks. Death clears enemy projectiles, marker graphics and local arcing ordnance. `boss:spawn`, `boss:hp`, `boss:phase` and `boss:defeated` include the display name, HP, phase and world position. Defeat occurs exactly once at the end of the chain; Levels owns `stage:clear`. Debug `boss`/`bossPhase` expose both kinds, including their states, clock, arena bounds, markers, live shell count, turrets and actual hurtboxes. Piercing shots remember sibling hurtboxes; melee/radial traversal damages the shared pool once.

**WARDEN'S SNOWCAT — 150 HP, 2500 score.** Hull 1×, rear engine grille 1.5× (`x > root+26`, above the tread), Warden 2×. Phase notifications at 100 and 50 HP; all three attacks remain in the rotation.

- **Plow charge:** **700 ms** engine/exhaust/tread anticipation, then 180 px/s leftward charge and an 850 ms backing recovery. The root stops 104 px inside the wall: the plow/contact envelope leaves **48 px** of clear space. Jumping also clears its low contact zone. The plow faces left; standing behind the machine exposes the grille.
- **Roof mortar:** **650 ms** anticipation; three shells at 180 ms spacing, each with a fixed blinking ground marker and an **850 ms** visible arc. Landing radius 17. Aim is committed when the state starts, so movement or a jump avoids it.
- **Warden MG:** **650 ms** sight line/DUCK warning, then eight horizontal rounds at 100 ms spacing, 155 px/s. Round center **feet−24 px**, radius **2 px**. Player documents 12×30 standing and 12×18 crouched: standing intersects; crouch has **4 px** clearance below the round envelope on the same floor. The Warden's roof controls drive the low hull MG.
- **Death:** **3400 ms** chain, fist-shaking parachute ejection (height capped to preserve the canopy on screen), separate rolling treads, explosions and a wreck.

**IRONHORN — 220 HP, 3500 score.** Two independent **40 HP turrets** consume the first 80 HP. Direct hull hits route into the remaining turret so ordinary horizontal gunfire can dismantle both. Destroyed turrets stop firing and lose their hurtboxes. Phase two runs 140→70 HP; phase three opens the cab and exposes the central boiler, which takes **2×** while the remaining shell takes 1×.

- **Two cannons:** **650 ms** glowing barrel/sight anticipation; second cannon fires 250 ms later (900 ms total warning). Each surviving turret fires a slow, downward shell, 100 X / 30 Y px/s. Crouching/jumping/repositioning works according to the lane.
- **Cinder rain:** **700 ms** blinking ground markers, four launches 200 ms apart, **900 ms** arcs, radius 16. Targets are committed at state entry, with spaces between them.
- **Driver coal/grenades:** **600 ms** raised-hand/cab/ground-marker anticipation. Coal flies **650 ms**, radius 13; grenades **1100 ms**, radius 24. Both target the committed marked position and can be moved away from or jumped over.
- **Death:** **3800 ms** boiler burst/chain, rocking locomotive and downward derail motion; only then emits `boss:defeated` so FX/Levels can continue the train-to-lake transition.

### New enemies and locked-view behavior

- **Leaper:** 3 HP, 150 score. A **900 ms** entry arc begins 76 px below its authored feet, lifts 108 px, moves 56 px toward the train and clamps the landing X inside a locked view. Entry updates outside the visibility margin. A 360 ms braced landing leads into grunt walking, LOS, 360 ms alert + 420 ms rifle anticipation, bursts and the existing personality deaths. The authored Y is the intended train/deck neighborhood; the landing floor is probed there.
- **Buzzard:** 40 HP, 750 score, 48 px/s. Animated rotor/door/gunner, drops up to three paratroopers through `ctx.spawn('enemy','paratrooper',...)` at 1.2/3.0/4.8 seconds. **700 ms** ground-lane anticipation precedes five strafe rounds at 180 ms spacing. It keeps flying through the free-pass off-view margin and despawns; a locked arena clamps its entire 96 px silhouette and reverses it. Audio owns a positional `buzzard_rotor` loop, stopped on death, exit, destruction and shutdown.
- **Hound:** 2 HP, 100 score. Fast 84 px/s patrol; **450 ms** crouch/growl/lane cue before a **280 ms** 140 px/s charge and **650 ms** 36 px leap, followed by 900 ms recovery. Antler nubs, glowing eyes, red collar, eight-frame gallop, compressed anticipation and airborne poses. Charge/landing positions are clamped inside the lock and avoid authored hazards. Levels should place packs of 2–3.
- **MOOSEZILLA:** every actual stomp emits `boss:stomp {x,y,power}` at its mirrored foot socket (power 1 normally, **2 in phase three**). Phase-three rotation now includes charge/flame/stomp so lake ice listeners can receive heavy stomps. Existing **360 ms** foot-lift anticipation is preserved. Arena placement continues to use supplied bounds; there are no map-name or old-camp coordinate assumptions.

### Test URLs and evidence

Use the existing dev server, adding this suffix (fixtures require dev mode or `debug=1`):

```
/?scene=Game&fast=1&debug=1&god=1&mute=1&x=6280&enemytest=snowcat
/?scene=Game&fast=1&debug=1&god=1&mute=1&x=6280&enemytest=ironhorn
/?scene=Game&fast=1&debug=1&god=1&mute=1&enemytest=buzzard
/?scene=Game&fast=1&debug=1&god=1&mute=1&enemytest=hound
/?scene=Game&fast=1&debug=1&god=1&mute=1&enemytest=leaper
/?scene=Game&fast=1&debug=1&god=1&mute=1&part=1-3&x=6280&enemytest=boss
```

The x=6280 mid-boss fixture URLs currently use the existing flat end yard; after Levels lands the new maps, use their actual end arena coordinates. Hound/Buzzard/leaper fixtures also work without a warp at the current camp. All scratch scripts, logs and captures stay in `/tmp/kbe-enemies/`, with `e-` output prefixes.

- `npm --prefix game run check`: **PASS**, full TypeScript + Phaser checker (90 files, zero findings at this check).
- `e-snowcat-shots.log`, `e-ironhorn-shots.log`: both full bosses killed with **ordinary HMG fire**, god-mode movement bot, no HP/kill cheats. Captured every attack before firing, then shot through all HP and the full death chain. **152 / 222 shots** in the recorded fixtures; phase events `[2,3]`, exactly one delayed named defeat and one `stage:clear`; actual level arena reports `boss:done`; no runtime errors.
- `e-locked-view.json`: two of each new kind, seeded at opposite screen edges pointing outward, **960 frames / 16 seconds**, zero off-view/vanished members. Both Buzzards dropped all three troopers, remained on screen and continued strafing; both leapers completed entry and fought. A separate free-pass ship was removed after exiting.
- The same report includes a **fresh real `ArenaController` spawning Snowcat**, supplied bounds 6138–6522, then a full HMG kill: exactly one defeat, arena `enemy-regression:done`, 161 shots, no runtime errors. `e-arena-ironhorn.json` repeats this real factory/arena check for Ironhorn: 222 shots, exactly one defeat, arena done, no runtime errors. No boss HP/kill controls in these completion tests.
- `e-mg-crouch.log`, `e-mg-standing.log`: god disabled, actual MG sweep, same floor. Crouch remains alive at 1 HP with no death event; standing is killed by the sweep. The test holds down through the complete burst.
- `e-{snowcat,ironhorn}-weakpoints.log`: measured Snowcat hull/warden/grille losses **1 / 2 / 1.5**, radial loss 3 once; Ironhorn turret losses **40 / 40**, phase stays 1 after the first, becomes 2 after both, core/shell losses **2 / 1**, phase-three centered radial loss 6 once. These isolated multiplier tests use controlled damage/HP; they are separate from the shooting-only completion runs.
- `e-moose-stomp.log`: context is `1-3` / `m1p3`, actual phase-three stomp sends one `{x:6216.44,y:336,power:2}`; FX's stomp counter becomes 1; no runtime errors. **The actual lake map is not yet loaded**, so this uses the existing level fallback and does not establish lake-hole collision acceptance.
- All PNGs below were produced by `node game/tools/shot.mjs ...` and visually inspected. T3 preview could not launch because host browser libraries were missing, so the documented shot workflow supplied Chromium with its existing library path. No browser packages were installed.

**Screenshot paths** (all under `/tmp/kbe-enemies/`):

- Snowcat: `e-snowcat-charge-cue.png`, `e-snowcat-charge.png`, `e-snowcat-mortar-cue.png`, `e-snowcat-mortar.png`, `e-snowcat-mg-cue.png`, `e-snowcat-mg.png`, `e-snowcat-death.png`, `e-snowcat-final.png`.
- Ironhorn: `e-ironhorn-cannon-cue.png`, `e-ironhorn-cannon.png`, `e-ironhorn-cinder-cue.png`, `e-ironhorn-cinder.png`, `e-ironhorn-coal-cue.png`, `e-ironhorn-coal.png`, `e-ironhorn-grenade-cue.png`, `e-ironhorn-grenade.png`, `e-ironhorn-death.png`, `e-ironhorn-final.png`.
- Hound: `e-hound-cue.png`, `e-hound-charge.png`, `e-hound-leap.png`, `e-hound-death.png`.
- Buzzard: `e-buzzard-cue.png`, `e-buzzard-strafe.png`, `e-buzzard-drop.png`, `e-buzzard-death.png`.
- Leaper: `e-leaper-entry.png`, `e-leaper-land.png`, `e-leaper-aim.png`, `e-leaper-fire.png`, `e-leaper-death.png`.
- Integration: `e-mg-crouch.png`, `e-mg-standing.png`, `e-locked-view.png`, `e-moose-stomp.png`.

### Known issues / Requests for other teams

- **Levels:** this checkout still has only `stage1.tmj` and `registerLevel` reads the old default map. Land/select `m1p1/m1p2/m1p3`, place the three boss kinds and new roster, and rerun end-to-end part traversal plus ice-crack collisions. Both mid-boss factories are ready for real `ArenaController` props. In `arenas.ts`, consider treating `buzzard` as flying in `spawnMember`/`watchOffscreen` (currently only `drone` gets that classification). Its own clamp already prevents stranding. Also fix the no-gate trigger edge: `v.right < a.x0 + v.width + gateOnScreen` delays an exact-width arena until 16 px past its edge; the arena harness offsets the trigger start 24 px to enter the current contract.
- **UI/Audio:** requested keys are used exactly: `snowcat_engine`, `snowcat_tread`, `mortar_thump`, `loco_steam`, `loco_cannon`, `cinder`, `hound_bark`, `hound_growl`, `buzzard_rotor` (positional loop). They were still unknown-key warnings in the last muted browser run; please supply the catalog/assets. No additional new sound keys requested. Existing `turret_windup` and the inherited grunt/paratrooper sounds are reused. Audible balance was not evaluated.
- **FX/Levels:** use named `boss:defeated` for the full Ironhorn derail continuation; boss-owned visuals supply its initial burst/rock/fall. The `boss:stomp` event is now real in phase three. Verify the lake's hole placement still leaves a survivable ground/jump route in Arcade.
- No claimed full mission/part-transition acceptance while the three maps are absent. Regular enemy death screenshots use targeted damage; boss completion evidence uses only normal shooting. Files outside enemy ownership and git state were not changed.

Final Phase E follow-up: raised the opened cab's driver above the broken turret in phase three (`e-ironhorn-driver.png`, inspected). Restored the original drone fixture's −75 px offset; Buzzard alone uses −95. Added defensive vertical recovery for locked hounds and for leaper landing targets beyond the view. `e-vertical-lock.json` seeds hound/leaper **160 px below the locked screen**, confirms they enter/return to visible fighting states with no vanished/off-view members after entry, then checks another free Buzzard exit. Final aggregate evidence: `/tmp/kbe-enemies/e-verification.json`, **19/19 checks passed**. The final full-project `npm --prefix game run check` passes, 90 files and zero Phaser findings. The three new maps and nine requested audio keys remain the integration requests above.

## Ironhorn locomotive redesign — 2026-10-16

Replaced Ironhorn's tread/slab silhouette in `game/art-src/enemies/phase-e.lua` with a **right-facing armored steam locomotive**. The player approaches its left-hand tender: two independently damageable red turrets aim backward toward the player, followed by the tall windowed cab, long cylindrical boiler with riveted armor bands, flared funnel, iron bull horns, headlamp and slatted cow-catcher. The cab shutter opens in phase three and reveals the existing driver; the visible boiler firebox glows through its grille. Red armor and spiral-eye emblems retain the Regime identity. Snowcat's drawing and gameplay were left intact.

- Editable source: `game/art-src/enemies/ironhorn.aseprite`, **192×112**, opaque width **184 px** including the horns/plow. Packed outputs: `game/public/assets/sprites/enemies/ironhorn.{png,json}`. Same texture key and four prefixed tags: `ironhorn_idle`, `ironhorn_damaged`, `ironhorn_core`, `ironhorn_death`; each now **8×100 ms**. Phase E inventory becomes **193 frames / 41 tags**. Rebuild with `bash game/tools/build-art.sh art-src/enemies/phase-e.lua`.
- Three **24 px spoked driving wheels** on the visible side, three offset far-side drivers, separate tender trucks, eight wheel/crank positions, connected side rod, reciprocating piston and a one-pixel chassis bob. `MachineBoss.ts` emits the existing FX `smoke_stack` at the funnel every **320 scaled ms**, count 2 / scale .8. Smoke stops on death. Ironhorn's rightmost extent stays within a **98 px root inset** on the arena's right side.
- Gameplay HP **220**, individual turret HP **40**, phase thresholds **140/70**, cannon/cinder/throw cues **650/700/600 ms**, attacks, projectile velocities, scoring and **3800 ms** death remain unchanged. Phase-two recovery retains damaged hull art; phase three retains its open cab/firebox.

### Geometry changes (relative to the boss's ground root)

The wider shape requires these Ironhorn-only changes in `game/src/entities/bosses/MachineBoss.ts`; Snowcat offsets are unchanged:

- Hull rectangle: old `(-52,-40),104×40` → **`(-88,-65),176×65`**.
- Tender turret pivots: **`(-68,-40)`**, **`(-43,-55)`**. Hurtboxes: **`(-80,-64),27×22`**, **`(-55,-79),27×22`**. Cannon markers, muzzle/projectile release and turret-destruction bursts follow these pivots; muzzle = pivot + `(-22,-14)`.
- Firebox 2× weak region: center **`(+16,-36)`**, absolute X/Y distance `<13` from the center. This replaces the former broad lower-center region and matches the visible 26 px firebox rim. No extra shared-pool hit is introduced.
- Stack/cinder socket **`(+49,-98)`**. Driver feet/pivot **`(-17,-49)`**; thrown ordnance starts at driver + `(-10,-20)`.

### Verification and screenshots

All evidence is under `/tmp/kbe-enemies/`, with the **`loco-`** prefix to distinguish this redesign from the prior tank-shaped version. Tested URL: `?scene=Game&debug=1&god=1&enemytest=ironhorn` (capture runner also adds `fast=1&mute=1`). T3 preview open failed with missing `libnspr4.so, libnss3.so, libnssutil3.so, libasound.so.2`; the repository `game/tools/shot.mjs` Chromium workflow supplied its existing library path. No packages installed.

- **Visually inspected** all cue/attack captures: `loco-ironhorn-{cannon,cinder,coal,grenade}-cue.png`, `loco-ironhorn-{cannon,cinder,coal,grenade}.png`, and `loco-ironhorn-death.png`. Final disappearance: `loco-ironhorn-final.png`.
- **Same-scale side-by-side**: `loco-silhouettes.png`, plus `loco-silhouettes.gif` for the wheel/rod cycle. Generated directly from the editable sprites by `/tmp/kbe-enemies/loco-comparison.lua`; Snowcat is short, low and tracked while Ironhorn is long, tall, horned and spoked. Motion contact sheet: `loco-wheel-cycle.png`.
- **Full real-fire fight:** `/tmp/kbe-enemies/loco-shots.mjs ironhorn` drives real player HMG input, god-mode movement and an ammo grant; **no boss HP, direct damage or kill cheats**. **209 shots**, phases **[2,3]**, **one defeat**, **one kill / 3500 score**, death completes at **3804.84 scaled ms**, zero runtime/load errors. Details: `loco-fight-summary.json`, `loco-new-fight.log`, `loco-ironhorn-shots.log`. This run used the dev sandbox while Levels was changing map registration; it does not claim train-arena or part-clear acceptance.
- Separate controlled weak-point test: `loco-ironhorn-weakpoints.log`: turret **40/40**, phase remains 1 after first turret and becomes 2 after both, firebox/shell **2/1**, radius-8 firebox explosion **6 once**. All **41** Phase E animation tags exist in Phaser. These controlled hits are separate from the real-fire completion run.
- `loco-art-audit.log`: all opaque pixels use the master palette, alpha is binary, all four tags are prefixed and contain eight frames. `npm --prefix game run check:phaser4` passes (90 files, zero findings).

Final integration status at this handoff: **full `npm --prefix game run check` is blocked by six concurrent Levels-owned diagnostics, all in `src/level/index.ts`**: lines 24/66/109 still use `rt.gate` after `LevelRuntime` switched to `gates`; line 26 calls the new four-argument `buildMap` with two arguments; line 28 calls the new three-argument `createParallax` with one. No Enemies diagnostics. Latest output: `/tmp/kbe-enemies/loco-check.log`. These foreign files were not edited. `game/public/assets/maps/m1p2.tmj` and its source are **not present**, so the conditional real train-arena screenshot cannot yet be taken. Existing Audio warnings for `loco_steam`, `loco_cannon`, `cinder` also remain. This section supersedes earlier Phase E claims of full-project check/map readiness for this live checkout. No git state was changed.

## IRONHORN rail placement polish — 2026-10-17

`MachineBoss.ts` now places IRONHORN on the `m1p2` visual rails at y 352 instead of the map's y 304 enemy/deck spawn. Cannon velocity aims from each turret socket toward the player's actual center. IRONHORN's arc floor search starts 96 px above its root; cinder, coal and grenade landing endpoints and anticipation markers share that lookup. Snowcat's placement, mortar lookup and markers retain their previous behavior; MOOSEZILLA is untouched.

Verification: inspected `/tmp/kbe-enemies/rails.png` in the real boss arena (4992–5376), boss x 5278/y 352, player x 5040/y 304. The requested x=5040 screenshot alone leaves the arena idle; the final capture adds a brief debug warp to x 5160, returns the player to x 5040, then advances simulation to close the title card. No keyboard bot. A separate fast controlled phase check confirmed all four cinder marker floors at y 304 and both cinder/grenade endpoints at y 302; capture `/tmp/kbe-enemies/rails-targeting.png`. Both browser runs had clean consoles.

`npm run audit:arenas -- --part 1-2` passed: IRONHORN phases **1/2/3 → PartClear**, no off-view time. The npm script prepends `--part all` and the parser uses the first occurrence, so this command also audited 1-1 and 1-3; both passed. `npm run check` passed (TypeScript and Phaser check: 98 files, zero errors/warnings). These current results supersede the older integration blockers above. Only the boss implementation and these notes were edited; no git operations.

## Phase F — boss detail, life and destruction (2026-10-17)

Implemented the JUICE contract in Enemies-owned files. All HP, weak-point multipliers, hurtbox rectangles, phase thresholds, attack cue/release times, projectile tuning, scores and death-chain durations retain their pre-pass values. The spawn grace is now **1100 scaled ms** (previously 900), so attacks start after Engine's approximately one-second cinematic hold. Phase-transition recovery times are unchanged.

### Runtime and art paths

- `game/src/entities/bosses/MachineBoss.ts`: Snowcat's rev/entry slide and Warden salute, Ironhorn's steam blast and turret covers unfolding, idle exhaust/steam, persistent 66%/33% cosmetic damage skins during attacks and recovery, and large threshold/death fragments.
- `game/src/entities/bosses/Moosezilla.ts`: eight-frame spawn rear/roar with jaw and eye flare; visible breathing leg pistons and idle antler sway; 66% cracked armor/tines, 33% missing corner plating and exposed glowing ribs; smoke/sparks; large death pieces. The original **60% / 25% gameplay phases**, cannon HP, antler detachment and core activation remain unchanged. Cosmetic 33% internals do not activate the weak point early.
- `game/src/entities/bosses/BossDebris.ts`: shared cosmetic-only heavy plates, horn fragments, gears, pipes and bolts, capped at **18 pieces**, with gravity, bounce and a **2400 ms** lifetime. No damage/physics registrations. Cleaned up on boss destruction.
- `game/src/entities/enemies/index.ts`: consumes `boss:intro` before the boss exists, giving the gate rumble socket puffs and machine rev/steam sound; the full sprite intro always starts on spawn, including debug fixtures. Every listener is removed on shutdown.
- `game/art-src/enemies/phase-e.lua`, `moosezilla.lua`: authored machine/rig changes; rebuilt their editable `.aseprite` sources and corresponding `game/public/assets/sprites/enemies/*.{png,json}`. No new pack entries or palette exceptions.
- Light roster art polish: `game/art-src/enemies/lib/soldier.lua`, `drone.lua`, `turret.lua`, plus hound/Buzzard/leaper helpers in `phase-e.lua`. Infantry blink, stronger alert brows, separating helmets in late death frames, drone banking eyes, brighter turret anticipation, hound snarl and Buzzard gunner bracing. Existing action frame counts and durations are preserved.

Rebuild from repository root:

```sh
bash game/tools/build-art.sh art-src/enemies/phase-e.lua art-src/enemies/moosezilla.lua art-src/enemies/grunt.lua art-src/enemies/grenadier.lua art-src/enemies/shield.lua art-src/enemies/paratrooper.lua art-src/enemies/turret.lua art-src/enemies/drone.lua
/home/knotz2/.local/bin/aseprite --batch --script-param root="$PWD/game" --script-param kbe="$PWD/game/tools/aseprite/kbe.lua" --script game/art-src/enemies/lib/phase-f-preview.lua
```

### Contact sheets — enlarged and visually inspected

The repeatable source is `game/art-src/enemies/lib/phase-f-preview.lua`; MOOSEZILLA is assembled from the **current shipped rig**, including the wide cupped antlers and their correct pivots. Sheets are **3× nearest-neighbor**. Four columns sample different frames; rows are:

- `/tmp/kbe-enemies/f-snowcat.png`: idle, intro, 66%, 33%, charge, mortar, MG, death/debris.
- `/tmp/kbe-enemies/f-ironhorn.png`: idle, intro, 66%, 33%, cannon, cinder, coal, grenade, death/debris.
- `/tmp/kbe-enemies/f-moosezilla.png`: idle, intro, 66%, 33%, cannon, stomp, flame, paw/charge, exposed core, death/debris.
- `/tmp/kbe-enemies/f-roster.png`: nine regular enemy kinds; idle/entry, cue, action, death/landing samples.

### Real-arena screenshots and checks

The documented `tools/shot.mjs` Vite + SwiftShader workflow was adapted into `/tmp/kbe-enemies/f-capture.mjs` for frozen, fixed-step simulation and multiple captures. **No real-time bot playthrough.** All three bosses were spawned by their real arena controllers, using `part=1-1/1-2/1-3`, fast/mute/god and a warp toward their actual boss gates. Damage uses **`__KBE.cheats.damageBoss(n)`**, preserving weak-point and phase handling. The capture runner never changes shared source files or runtime tuning.

All screenshots below are under `/tmp/kbe-enemies/`, **1152×648**, and were visually inspected individually or in `f-review-{snowcat,ironhorn,moosezilla}.png`:

- All three: `f-<boss>-intro.png`, `f-<boss>-idle.png`, `f-<boss>-damaged.png`, `f-<boss>-damaged-settled.png`, `f-<boss>-critical.png`, `f-<boss>-critical-settled.png`, `f-<boss>-death.png`.
- Snowcat attacks: `f-snowcat-{charge,mortar,mg}-cue.png` and `f-snowcat-{charge,mortar,mg}.png`.
- Ironhorn cannon: `f-ironhorn-cannon-cue.png`, `f-ironhorn-cannon.png`.
- MOOSEZILLA: `f-moosezilla-{cannon,stomp}-cue.png`, `f-moosezilla-{cannon,stomp}.png`, `f-moosezilla-core.png`.
- Summary: `f-captures.json` / `f-captures.log`. All three remain in **intro at ~850 ms after spawn**, with positive intro time and no attack. Recorded cosmetic tiers: Snowcat **94 / 42 HP**, Ironhorn **140 / 64 HP**, MOOSEZILLA **260 / 124 HP**. MOOSEZILLA's extra core capture is at **90 HP**.

Final validation:

- **`npm --prefix game run check`: PASS**, TypeScript + Phaser 4 checker, **102 files / zero findings** (`f-check.log`). The transient Levels `boss.names` / `introFocusUp` errors encountered mid-pass were fixed by the concurrent Levels work before this final check.
- **`npm --prefix game run audit`: PASS**, all reach targets and every arena; Snowcat **1/2/3 → PartClear**, Ironhorn **1/2/3 → PartClear**, MOOSEZILLA **1/2/3 → Results**, zero boss off-view time (`f-audit-final.log`).
- Art validation: **31 assets, 733 frames, 175 unique tags**, pack/atlas/rig bounds and original attack anticipation timings pass; **1,490,310 opaque source pixels** checked against `K.PAL`, no exceptions (`f-art-audit.log`).
- Final screenshot runs have no page exceptions. Part II logged two concurrent Levels/parallax warnings: missing textures **`bg2_gorge` / `bg2_trestle`**. Snowcat and MOOSEZILLA consoles were clean. T3 preview itself could not start because host browser libraries were missing; the repository Chromium workflow already supplies its own library path. No packages installed.
- These are targeted visual and simulation checks; no sustained GPU/60-FPS benchmark is claimed. No git operations or non-Enemies source edits were made.

## Boss flash cleanup — 2026-10-17

Fixed the Phase F partial white silhouette: machine bosses flashed only their hull; MOOSEZILLA applied its hit flash after lethal damage detached the head, and detached parts could leave the map used for tint cleanup. New Enemies-owned `game/src/entities/bosses/BossFlash.ts` owns the affected sprite references through separation. Both boss implementations now start one synchronized flash after damage/phase/death setup, including the operator, turrets, newly detached rig parts, replacement head antlers and Snowcat tread scraps. Detachment clears inherited tint; the shared flash clears every affected surviving sprite and releases references on expiry/destruction. Cosmetic heavy debris starts untinted.

Hit flashes last **50 raw ms**, death flashes **100 raw ms**. Cleanup runs even during hitstop and slow motion, before the scaled gameplay update can return. `settings.get().reducedFlash` selects a soft `0xb8c8d8` multiplicative tint that preserves sprite detail instead of white fill. MOOSEZILLA's accompanying screen-flash request is shortened to 100 ms; existing FX accessibility handling remains in charge of that overlay.

Verification used the repository `tools/shot.mjs` Vite/Chromium setup, adapted to frozen fixed-step captures in `/tmp/kbe-enemies/flash-capture.mjs`. All three real arenas were checked with normal and reduced flashes, **21 captures per run / 126 total**, including 0/33/67 ms hit samples, threshold separation, 0/50/117 ms death samples and then every 100 ms through 1117 ms. Runtime probes verify identical tint/mode across affected parts, no lingering tint after expiry, and no white-filled debris after expiry. Hit flashes are cleared at 67 ms; death flashes are cleared at 117 ms, including MOOSEZILLA's hitstop/slowmo. Initial captures that put MOOSEZILLA offscreen were replaced with captures keeping the player inside the locked arena.

Visually inspected all six contact sheets (left-to-right, top-to-bottom: idle, hit 0/33/67, threshold 0/100, death 0/50/117/217/517/1017 ms):

- `/tmp/kbe-enemies/flash-review-moosezilla-{normal,soft}.png`
- `/tmp/kbe-enemies/flash-review-snowcat-{normal,soft}.png`
- `/tmp/kbe-enemies/flash-review-ironhorn-{normal,soft}.png`

Full-resolution source captures: `/tmp/kbe-enemies/flash-<boss>-<normal|soft>-<sample>.png`. Probe report: `/tmp/kbe-enemies/flash-captures.json`; runner log: `/tmp/kbe-enemies/flash-captures.log`.

`npm run check` **PASS**: TypeScript plus Phaser checker, **103 files, zero errors/warnings**. `npm run audit` **PASS**: every reach target and arena; Snowcat/Ironhorn phases 1/2/3 → PartClear, MOOSEZILLA phases 1/2/3 → Results, zero boss off-view time (`/tmp/kbe-enemies/flash-audit.log`). The first sandboxed audit could not bind its loopback server; the approved local-server rerun passed. Capture runs had no page exceptions; Part III reported existing unmapped background-audio events `lab_searchlights` / `lab_tesla`. Only Enemies source/notes were edited; no git commands or git state changes.

## Phase G — Enemies B: bayou mid-bosses and roster (2026-10-18)

Built only Enemies B paths; GATORGEDDON and its registration call remain Enemies A's. No git state changes.

### Implementation and assets

- `game/src/entities/bosses/BayouBoss.ts`: SHELLSHOCK **170 HP / 3000 points**, MEGA-SKEETER **200 HP / 3500 points**. Each has a 1100 ms safe sprite intro, living idle, persistent 66%/33% art, `BossDebris`, synchronized `BossFlash`, one scaled state clock, preallocated three-slot local ordnance, death cancellation and one final defeat. Levels still owns stage clear.
- SHELLSHOCK surfaces shell-first, then reveals its articulated snapping beak. Alternating high/low **650 ms** head-angle cues; crouch high and jump low. Head takes **2× during extension**. Three shootable **25-point** eggs have fixed landing marks, an 850 ms arc, and 1200 ms blinking fuse. Spin has **700 ms** anticipation, three bounces, a visibly flattened low shell, clank-only hits and a **55+ px** wall refuge. At 33% missing plate/core art exposes a **2×** core. Death flips its shell, flails its feet, throws heavy fragments and pops its head on a spring.
- MEGA-SKEETER has a four-wing mosquito/drill silhouette, a three-gnat entrance swarm and positional whine. Its target is pinned during the **700 ms** laser cue; dive is 440 ms (340 critical), stuck/punish window **700 ms**. Pods bounce/land and hatch gnats; the registry caps **all live gnats at four**. Leg guns cue **600 ms** then release five 92 px/s stingers, 0.32 radians apart. Tank is **1.5×**, then **2×** at 33%; a torn wing accompanies erratic critical flight. Death spins toward the river, fades/sinks, and emits an XL splash. Horizontal **80 px** and vertical clamps keep its 144×88 canvas inside the view; flight art stays below the radio band.
- `game/src/entities/enemies/BayouEnemy.ts`: piranha **1/100**, hopper **4/200**, gnat **1/50**, airboat **16/500**. Piranhas wait for a visible water surface, cue 500 ms, leap 80 px and splash on both ends; only the explicit fixture bypasses the water check. Hoppers check every 8 px of their landing path and never change floors; 450 ms hop squat, 500 ms inflated-throat cue and 64 px tongue. Gnats sine-weave, cue 400 ms and commit to a fixed dive target. Airboats bob on the authored water lane, cue 600 ms before three-shot bursts and drop two leapers with the parent wave. Airboats explode and sink; free boats exit after nine seconds. Gnat/boat loops stop on death, exit, destruction and shutdown.
- `game/src/entities/enemies/Enemy.ts`: lurker **3/150**, seven-frame **700 ms** rise into grunt rifle AI. `sleep` is accepted alongside existing idle/facing/patrol/wave/from props. Ground walkers receive a **160 ms** decaying shotgun shove through the existing wall/ledge/hazard/locked-view movement checks; stationary turrets and airborne entry states are excluded. Hoppers get the same short shove when grounded.
- `game/src/entities/enemies/index.ts`, `game/src/config/tuning/enemies.ts`: all factories, fixtures, shared debug tracking, four-gnat cap, approach pond bubbles/rising whine. `registerGatorgeddon(ctx, track)` is preserved.
- Original editable art: `game/art-src/enemies/phase-g.lua`, nine corresponding `.aseprite` sources. Outputs: `game/public/assets/sprites/enemies/{shellshock,shellshock_head,skeeter,lurker,piranha,hopper,gnat,airboat,turtle_egg}.{png,json}`. Mission pack: **`game/public/assets/packs/enemies.m2.json`**. No Mission 1 assets or packs were rebuilt. **9 assets / 605 frames / 104 unique prefixed tags**; **1,499,629 opaque pixels** checked against the master palette, binary alpha, no exceptions (`/tmp/kbe-enemies-b/art-audit.log`).

Rebuild and inspect every authored state at 3×:

```sh
bash game/tools/build-art.sh art-src/enemies/phase-g.lua
mkdir -p /tmp/kbe-enemies-b
/home/knotz2/.local/bin/aseprite --batch --script-param root="$PWD/game" --script-param kbe="$PWD/game/tools/aseprite/kbe.lua" --script game/art-src/enemies/lib/phase-g-preview.lua
```

### Fixtures and inspected evidence

All seven URLs work before the new maps exist:
`?scene=Game&god=1&fast=1&mute=1&enemytest=shellshock|skeeter|lurker|piranha|hopper|gnat|airboat` (choose one kind). Mission packs preload automatically for enemy fixtures. The skeeter fixture uses the player's actual floor as its virtual deck. Default dev mode allows cheats without a debug overlay; add `debug=1` for hurtboxes.

Example exact capture command (no real-time bot):

```sh
node game/tools/shot.mjs --wait 1200 --query 'scene=Game&god=1&fast=1&mute=1&enemytest=skeeter' --steps '[{"eval":"(__KBE.sim.freeze(),__KBE.sim.advance(2200),__KBE.sim.render(),1)"}]' --out /tmp/kbe-enemies-b/skeeter-fixture.png
```

All verification scratch is **`/tmp/kbe-enemies-b/`**. The bounded runners reuse `shot.mjs`'s Vite/SwiftShader/library setup and always close their browser/server. `verify.mjs`, `real-fire.mjs`, `quality.mjs`, `edges.mjs` deliberately intercept only the level pack to choose the Engine's isolated dev sandbox; they do not edit any shared map/code or weaken combat. This avoids Mission 1 authored soldiers and gates in a Mission 2 fixture. Real-fire results still include the sandbox dummy's score, shot eggs and shot gnats; **the one-defeat count is specifically the boss event**.

Visually opened and inspected:

- **Silhouette before animation**: `silhouettes.png`, both bosses at Knotz's native scale. Improved the turtle's foreground claws after this inspection.
- **3× complete state sheets**: `states-shellshock.png`, `states-shellshock_head.png`, `states-skeeter.png`, `states-roster.png`. Boss rows are the source pose order, repeated for intact/damaged/critical; four frame samples each. Flattened spin art was rebuilt and re-inspected.
- **Fixture contacts**: `review-shellshock.png`, `review-skeeter.png`, `review-lurker.png`, `review-piranha.png`, `review-hopper.png`, `review-gnat.png`, `review-airboat.png`. These cover every encountered cue/action, phase art, deaths and late deaths. Individual captures are `<kind>-<state>.png`; `captures.json` lists them and records probes. Specific full-size inspections include `shellshock-snap.png`, `shellshock-spin.png`, `shellshock-death-late.png`, `skeeter-laser.png`, `skeeter-idle.png`.
- **Real player HMG completions**: `review-real-fire.png`, with originals `fire-<kind>-<sample>.png` and `fire-<kind>-finished.png`. Fresh runs use only god mode, HMG/ammo grant and real player shoot input in 500 ms fixed-step batches: **SHELLSHOCK 240 shots; MEGA-SKEETER 241 shots**, both phases **[2,3]**, **exactly one defeat**, no page/runtime errors. **No HP cheats or direct damage in these runs.** `real-fire.json` contains all samples; `real-fire.log` is the summary.
- **Quality probes**, separate from real fire: `review-quality.png`, `quality.json`, and `quality-<boss>-<normal|soft>-*.png`. Initial intro snapshots at about 17–77 ms; visible `intro700` shots show the surfaced shell/head and entrance gnat swarm. The earlier `intro` screenshots show the existing part-entry wipe, so they are not evidence of boss silhouette. Per mode, **500 samples / 25 simulated seconds** check boss hurtboxes at least 8 px inside the view, with zero failures. Hit flashes synchronize all parts and clear by **67 raw ms**; death flashes clear by **117 raw ms**, including reduced-flash multiply tint. Three-point area hits deal **3 once** across overlapping parts; extended head **2×**, tank **1.5×**, critical core/tank **2×**. Death clears all local eggs/adds and enemy bullets. Each completed quality run also records exactly one defeat.
- **Locked edges**: opened `locked-edges.png`; `locked-edges.json` has **400 samples / 20 seconds**, all five new kinds seeded 12 px beyond both edges, with gnats above and airboats below the view. Zero off-view failures; extra gnat spawns stop at four. Wall-adjacent shotgun hits stay inside the view; separate middle-floor hits verify actual displacement. This is an implementation-level fixture test, not Levels' future arena acceptance.

### Validation and current integration limits

- `npm --prefix game run audit`: **Mission 1 reach and arenas PASS**, Snowcat/Ironhorn/MOOSEZILLA phases 1/2/3 and expected PartClear/Results, zero boss off-view time (`audit.log`). Mission 2 skips while maps are absent.
- Explicit `node game/tools/arena-audit.mjs --part 2-1` and `--part 2-2`: **SKIP, maps missing** (`audit-2-1.log`, `audit-2-2.log`). No real pond/foredeck acceptance is claimed yet.
- `npm --prefix game run selftest`: **all passed** (`selftest.log`), including mission-pack preload/cache, material mapping, mission chain and listener stability.
- The first full `npm --prefix game run check` passed with zero findings. Final check status is recorded in `check-final.log`; the final shared check has **four Levels-owned diagnostics**: `src/level/ice.ts:36` TS2352 (wood/ice style cast), `src/level/props.ts:256` two missing `LEVEL.gates` references, and `src/level/train.ts:114` unused `S`. **No Enemies B diagnostics.** Separate Phaser output **passes: 112 files / zero findings** (`phaser-final.log`). Earlier GATORGEDDON warnings disappeared during A's concurrent changes; its files were left untouched.
- The precise Mission 2 audio keys are emitted, but the shared Audio catalog/mission pack was still in progress during captures. Missing keys degrade silently; playback/mix is not accepted yet.
- Fixed-step SwiftShader correctness and visual review were performed; **no sustained 60-FPS benchmark** is claimed. No git state changes, new dependencies, real-time bot traversal or non-owned source edits.

### Requests for other teams

- **Levels:** classify **`gnat`, `airboat`, `piranha` as fliers/swimmers** in both arena off-view recovery and edge-spawn floor projection (`arenas.ts` currently special-cases drone/Buzzard). Preserve their authored Y. Piranhas need `hazard=water` at surface+8 and a visible surface. Airboats accept **`laneY`** (also `waterY`, default **344 in 2-2**, otherwise authored spawn Y); please author the water lane near **344**, beside the barges. Boss spawn Y / optional `floorY` is the pond bank or **304 px foredeck**. Keep the two boss arenas gateless; emit exact `boss:intro` names **SHELLSHOCK** and **MEGA-SKEETER**. Once maps land, rerun both real arena audits and inspect in context.
- **UI/Audio:** supply/register the exact MISSION2 keys used here: lurker_rise, piranha_leap/bite, hopper_croak/hop/tongue, gnat_buzz, airboat_motor/gun; turtle_hiss/snap, shell_clank/spin, egg_lob/beep; skeeter_whine/laser/dive/drill, larva_pop, stinger_fire. Route music via boss names; whine, spin, buzz and motor use positional loop handles.
- **Lead / QA:** rerun final check after concurrent Levels fixes, then Mission 2 real-map/part-clear and sustained performance acceptance. Preserve Enemies A's GATORGEDDON files and inspect its own separate report.

## Phase G — Enemies B mid-boss art detail pass (2026-10-19)

SHELLSHOCK now has bevelled/riveted scutes, chipped paint/rust, moss/weed and animated water drops, a darker segmented chassis, spiral-eye stencil, hydraulic feet/neck and a bright beak eye lamp. MEGA-SKEETER gets a shaded blood tank with a six-frame sloshing meniscus/reflections, thorax seams/vents, opaque rotor echoes, hydraulic legs/hoses and an incandescent drill tip during `laser`. Details persist through both damage tiers and death. Only `phase-g.lua` and the three bosses' Aseprite/PNG/JSON outputs were rebuilt; `--script-param only=bosses` skips the regular roster. Combat code, hurtboxes, sockets and HP are untouched. Atlas comparison confirms identical canvases, tags, durations and **108 + 108 + 162 frames**. No git state changes or GATORGEDDON edits.

Inspected the supplied reference silhouettes and every new 3× image under **`/tmp/kbe-enemies-b/detail-pass/`**: `comparison-3x.png` (before/after beside unchanged MOOSEZILLA/GATORGEDDON), `shellshock_{intact,damaged,critical}-3x.png`, `shellshock_head_{intact,damaged,critical}-3x.png`, `skeeter_{intact,damaged,critical}-3x.png`. State sheets include all six frames of every pose/death. Baseline atlases: `before/`; sheet runner: `review.py`.

**PASS:** `npm --prefix game run check` (113 files, zero Phaser findings); source audit (9 assets / 605 frames / 104 prefixed tags / 1,548,721 opaque master-palette pixels / binary alpha); atlas contracts; **`node game/tools/arena-audit.mjs --part 2-1,2-2`** (both bosses phases 1/2/3 → PartClear; zero off-view time). Logs: `{check,art-audit,contracts,arena-audit}.log` in that directory. Temporary local-server approval succeeded after the transient reviewer capacity failure.

Real-arena runner: **`node /tmp/kbe-enemies-b/detail-pass/capture.mjs`**, output manifest `arena-captures.json`. It loads `?part=2-1&debug=1&fast=1&god=1` / `part=2-2` plus `scene=Game&mute=1&seed=843`, freezes the sim, calls `__KBE.cheats.boss()`, and uses fixed-step input to enter the authored pond/foredeck arenas. Captures are `arena-{shellshock,skeeter}-<state>.png`: intro/idle, every attack, 66%/33% damage tiers and early/late death. **All 24 arena PNGs were opened and inspected**, with zero page/console errors; the original intro/idle captures include the warning banner, while later attack frames show the art clearly. An optional recapture after that banner faded (plus later death samples) was not executed because automatic approval review timed out twice; the successful original captures and audit remain the evidence. No real-time bot playthrough.

## Phase G — Enemies B rules fixes (2026-10-19)

G2: `BayouBoss`, `BayouEnemy` and the existing `AssaultEnemy` buzzard now check `LoopHandle.active` and retry refused/stolen voices at most every **500 raw ms** while audible. Positional updates use active handles; death, exit, destruction and shutdown retain their cleanup. G6: Bayou cues allocate Graphics lazily, retain unchanged geometry/style, clear once when unused and hide while empty/offscreen. G7: Bayou poses compare tag/phase before constructing animation keys or requesting playback; SHELLSHOCK's head caches its pose independently.

**PASS:** `npm --prefix game run check` (114 files, zero Enemies warnings or `loop-handle-no-active-check` findings; three unrelated `offset-returns-array` warnings in Levels' `background.ts`). **PASS:** `node game/tools/arena-audit.mjs --part 2-1,2-2,2-3`, all waves/bosses, phases 1/2/3 and expected PartClear/Results; zero off-view time. Eight fixed-step fixtures (both mid-bosses, lurker, piranha, hopper, gnat, airboat, buzzard) pass with no runtime/page errors. Forced inactive/refused and stolen handle probes recover at 500 ms; death prevents retries and spin exit stops audio. Unchanged poses/cues produce zero redundant play/clear calls; changed geometry and boss damage tiers update correctly. Evidence: `/tmp/kbe-enemies-b/rules-fix/{check.log,fixtures.mjs,fixtures.log,fixtures.json}` and `/tmp/kbe-enemies-b/rules-arena-audit.log`. No git operations, GATORGEDDON edits or bot playthroughs.

## Phase H — Enemies B: bayou roster facelift (2026-10-20)

Rebuilt **hopper, airboat, piranha and gnat** with independent, layered Aseprite animation sets and cleaned the **lurker** ghillie on every tag. All five Imagegen reference sets arrived through `game/art-src/refs/manifest.json`; inspected each concept, pixel preview and pose sheet before completing the redraw. Their pixels are design guides only: the shipped art is drawn in palette-keyed Lua, with binary alpha and no sampled/quantized generated sprites.

### Implementation and decisions

- **Art source:** `game/art-src/enemies/lib/phase-h-roster.lua`, called by `phase-g.lua`. Editable sources and PNG/JSON outputs are the five existing `{hopper,airboat,piranha,gnat,lurker}` assets under `art-src/enemies/` and `public/assets/sprites/enemies/`. Layers separate hydraulics/armour/head/motion, fan/crew/hull/weapon, fins/scales/jaw/surface, wings/body, and soldier/ghillie/water. `lib/phase-g-preview.lua` now names the new poses. `lib/phase-h-contact.py` produces every-tag/every-frame sheets at 1× and 4×, with a grunt and Knotz on each row.
- **Hopper: 46 frames / 9 tags.** Six-frame sac/lens/steam idle; croak → compressed haunches; six airborne frames spanning the existing 720 ms hop; a 180 ms landing squash inside the existing recovery; five-frame inflated tongue cue, eight mouth frames, two hurt frames and ten breakup frames. The amber lenses spring out and armour separates. A retained Graphics object draws the segmented red cable and steel claw to the actual sinusoidal **64 px** hit line at **y−17**, then retracts over the existing **220 ms**. Landing requests `hopper_land` and terrain-specific water splash / `mud_splat` / `dust_land`; death requests `mech_pop` sound and FX at **0.8**. The canvas is **64×56**, with transparent padding and an offset that preserves the original world anchor; this keeps spring lenses inside the death frames.
- **Airboat: 38 frames / 8 tags.** Olive fan cage, four propeller phases, readable red-cap crew, jerrycan/rope, rivets/rust, red stripe and spiral, raised bow, bob and spray; six-frame gun cue and a fresh three-frame flash/recoil animation on **each** shot. Cruise/cue/fire have persistent ≤50% HP variants. Moving boats request `boat_wake` every **100 ms**, damaged boats request `smoke_trail` every **150 ms**. Ten sink frames occupy the unchanged **1200 ms** death, with cage sparks, nose dip and tumbling crew; death requests `airboat_sink`, **1.5** `mech_pop` FX and the existing splash. Canvas **104×64** provides fan/debris space and seats the keel at the waterline. Original shot socket/timing/targets and leaper drops remain intact.
- **Piranha: 38 frames / 7 tags.** Fin/periscope and surface bulge, six drawn leap angles, jaw snap, descending poses, submerging splash and ten breakup frames with separating scales/jaw. Body pixels are omitted below the swim surface rather than fading the entire fish; vulnerability and trajectory remain unchanged. Death requests `mech_pop` sound and FX at **0.6**. Canvas **40×28**.
- **Gnat: 28 frames / 5 tags.** Tapered segmented red fuel bulb, needle, thin legs, four pale-pane wing phases, glowing dive cue, tucked dive legs, recovery and ten wing/bulb breakup frames. Death requests `mech_pop` sound and FX at **0.5**. Canvas **32×28**; original swarm cap, weave, fixed dive target and flight clamps retained.
- **Lurker: 67 frames / 12 existing tags.** Five large moss clumps, readable reeds/cattail, wet trouser hems and drips replace the noisy stripes. Clothing follows crouch/run and rotates with the soldier in launched/explosion deaths. Three deaths now have eight frames each. Rise remains **700 ms**; the grunt rifle AI is unchanged. Canvas **48×48**.
- **Runtime:** only `game/src/entities/enemies/BayouEnemy.ts` changed. Cosmetic pose clocks do not delay combat. Hurtbox dimensions/anchors, HP, damage, scoring, cues, attack trajectories and entry rules are unchanged. Shotgun displacement still uses the existing safe-ground probes. Pose/cue caching and loop cleanup are retained; a hit cannot hide an airboat shot flash, sleep flinches clear, and boats cruise while exiting. `BossFlash` continues handling reduced flash. No tuning, map, shared-contract, Enemies A, GATORGEDDON or H2 MEGA-SKEETER changes.

### Rebuild and reproduce

From the repository root, rebuild only this roster through the normal pipeline:

```sh
KBE_ART_ONLY=roster bash game/tools/build-art.sh art-src/enemies/phase-g.lua
UV_CACHE_DIR=/tmp/kbe-imagegen/uv-cache /home/knotz2/.local/bin/uv run --offline --with pillow,numpy python3 -I game/art-src/enemies/lib/phase-h-contact.py
```

`phase-g.lua` still accepts Aseprite's `--script-param only=roster` / `only=bosses`; the default full build retains the original bosses and egg. The roster-only build also deterministically rebuilds the unchanged turtle egg.

Exact context URLs, appended to the local dev origin:

- Hopper: `?scene=Game&fast=1&mute=1&god=1&part=2-1&x=2640`
- Airboat: `?scene=Game&fast=1&mute=1&god=1&part=2-2&x=600`
- Piranha: `?scene=Game&fast=1&mute=1&god=1&part=2-1&x=1000`
- Gnat: `?scene=Game&fast=1&mute=1&god=1&part=2-1&x=1700`
- Lurker: `?scene=Game&fast=1&mute=1&god=1&part=2-3&x=350`

Add `debug=1` for hurtboxes. Each kind also works with `?scene=Game&fast=1&mute=1&god=1&enemytest=<kind>`.

### Inspected evidence and verification

All scratch is **`/tmp/kbe-enemies-b/phase-h/`**. Opened and visually inspected:

- **Every frame/tag at 4× beside grunt/Knotz:** `contact-hopper-4x.png`, `contact-airboat-4x.png`, `contact-piranha-4x.png`, `contact-gnat-4x.png`, `contact-lurker-4x.png`. Matching `contact-<kind>-1x.png` files are also generated. Compact `review-<kind>.png` pose sheets helped refine haunches, throat volume, fish plates and wing panes.
- **Before/after real-map comparisons:** `compare-context-hopper.png`, `compare-context-airboat.png`, `compare-context-piranha.png`, `compare-context-gnat.png`, `compare-context-lurker.png`. Sources are `before-context-<kind>.png` and `after-context-<kind>.png`; `before-context.json` / `after-context.json` record locations and states. The final boat/fish shots use nearby lower, standable positions to show the waterline; these are contextual comparisons, not identical camera frames. The final capture calls the HUD card's hide helper to expose the actors. All five final contexts report **zero console/page errors**.
- **51 corrected fixed-step fixture captures:** `sequence-hopper.png`, `sequence-airboat.png`, `sequence-piranha.png`, `sequence-gnat.png`; originals `seq-<kind>-<sample>.png`, metadata `sequences.json`. These include the complete hop/crouch/landing, tongue extension/retraction, all three gun flashes, damaged boat/sink, fish bulge/leap/bite/fall/splash, gnat cue/dive/recovery and every kind's breakup. Specifically opened full-size `seq-hopper-tongue110.png` (**64 px** measured cable), `seq-airboat-fire2.png`, `seq-airboat-death-middle.png`, and `seq-piranha-bite.png`. Initial obscured/entry-wipe captures were replaced by the corrected run, which finishes the entry then seeds a fresh actor away from the left edge. The sandbox fixture deliberately intercepts only the level pack; real-map context captures and arena audits load actual maps.
- **Acceptance probes:** `probes.json` / `probes.log`: dirt/mud/water landings, spawn-facing, sleep flinch completion, firing during hurt, exit cruise, original hopper hurtbox, **100 unchanged pose requests / zero redundant plays**, exactly one kill after two lethal-hit attempts and released corpse. All four sequence fixtures destroy their corpses and have zero page/game errors. Recorded wake intervals are **100 ms**, smoke **150 ms**; the hopper still moves during a shotgun shove. The early death/landing fixtures recorded missing Phase H sound warnings; UI/Audio subsequently landed all three catalog entries, pack entries and OGG files before handoff (final cache check: `audio-integration.log`).
- **Art validation PASS:** `art-audit.log`, all nine Phase G assets **599 frames / 105 unique prefixed tags**, master-palette source pixels and binary alpha; five changed assets contain **217 frames / 41 tags**. `global-tags.log`: **696 unique atlas tags, zero duplicates** across the entire sprite tree. `build-final.log` records the successful normal-pipeline roster build.
- **`npm --prefix game run check`: PASS**, TypeScript and Phaser checker, **115 files / zero errors or warnings** (`check-final.log`).
- **`npm --prefix game run audit`: PASS**, reach and arenas for all six parts (`audit.log`). Final post-runtime-edit **`node game/tools/arena-audit.mjs --part 2-1,2-2,2-3`: PASS**, all Mission 2 waves and boss phases **1/2/3 → PartClear / Results**, **zero off-view time** (`audit-m2-final.log`).
- **`npm --prefix game run selftest`: FAIL, 2 Engine camera checks**, `letterbox/focus/zoomPunch render only and release cleanly` and `scene running (unlock blend progressed)` (`selftest.log`). Every other full-run check passes, including frame resolution, projectile pool, campaign/mission flow, load recovery and listener stability; zero page/game errors. One bounded `--only core` retry repeats both camera failures and additionally fails the held-Enter/fresh-pause input timing check (`selftest-core-retry.log`). These files are outside Enemies ownership and were left untouched. No selftest pass is claimed.

All verification attempts were bounded below ten minutes. No real-time bot playthrough, repo-root `playtest/` edit, new dependency or git state change. All started servers/browsers and the reference poller exited. Fixed-step correctness and visual review were checked; no sustained FPS benchmark is claimed.

### Requests for other teams

- **Engine / QA:** investigate the two camera selftest failures and the focused retry's held-Enter/fresh-pause failure above; rerun under settled browser load. The deterministic Enemies probes and every arena pass.
- **Lead / QA:** review the five reference-driven redraws and the inspected sheets/sequences for H2; sustained SwiftShader performance acceptance remains with the integration review. No new shared contract or map changes are requested.
