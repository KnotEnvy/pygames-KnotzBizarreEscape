# Knotz Bizarre Escape: Game Design Doc (v1 "Mission 1" vertical slice)

Target feel: **Metal Slug 1–3 × Contra / Super Contra.** Chunky, hand-animated pixel art, readable
silhouettes, huge explosions, humor, and tight one-hit-death run-and-gun with generous checkpoints.
This doc is the source of truth for scope. If something's ambiguous, follow the spirit (fun, juicy, readable),
then record your decision in your team report.

## 1. Pillars
1. **Every shot feels good.** Muzzle flash, recoil pixel shift, shell casings, impact sparks, enemy hit-flash
   (fill tint), hitstop on kills, screen shake scaled to violence.
2. **Readable chaos.** Enemy bullets are bright and high-contrast against every background. Telegraphs
   precede every dangerous attack (≥ 300 ms wind-up). Player always reads on top.
3. **Bizarre humor.** Metal Slug-style personality: enemies panic, flee, get launched; the boss is a
   mechanical moose. POWs salute and drop gifts. Nothing gory: cartoon knockback, "poof", scorch marks.
4. **Arcade structure.** Lives, continues, score, rescue tally, stage intro and results screen.

## 2. Premise
Knotz, a green-helmeted commando, has been captured by the **Bizarre Regime**: a cult army in red
uniforms run by a mad engineer who builds animal-shaped war machines. Mission 1, *"Pine Ridge
Breakout"*, starts in a mountain prison camp (pine forests and snowy peaks, the original game's
setting). It runs through the forest, across a river bridge and into a regime outpost, and ends in a
boss fight with **MOOSEZILLA**, a steam-and-steel moose tank.

## 3. Technical frame
- Phaser **4.2.1**, WebGL, TypeScript, Vite. Internal resolution **384×216**, `pixelArt: true`,
  Scale FIT + CENTER_BOTH (integer zoom where possible: ×5 = 1920×1080).
- Tile grid **16×16**. Arcade physics. Fixed-feel tuning in **px/s** (delta-time based, never per-frame).
- 60 FPS target on mid hardware. Pool all bullets, particles and casings.

## 4. Player: Knotz
Body: ~**24×36 px** visible within a **48×48** frame, bottom-center pivot. Split-body recommended
(legs + torso composited) so aim/shoot states combine freely with locomotion, like Metal Slug.

| Action | Spec (starting tuning, the player team owns final values) |
|---|---|
| Run | 105 px/s, quick accel (≈0.06 s to full), short skid frame on reversal |
| Jump | Variable height: hold for full (~56 px apex = 3.5 tiles), release early to cut. Gravity ≈ 900 px/s². Coyote time 90 ms, jump buffer 120 ms |
| Crouch | Down on ground: crouch (hitbox ~60% height), can crouch-walk slowly (35 px/s) and shoot forward low |
| Aim | 8-way. Up = shoot up (standing still or running). Up+forward = diagonal. In air, Down = shoot down. On ground, Down = crouch. Optional **aim-lock** button (hold to stand still and aim freely) |
| Shoot | Pistol default, infinite ammo, ~7 shots/s if mashing, 3/s on hold auto-fire (rewards tapping like Metal Slug). Bullet 420 px/s |
| Knife | Pressing shoot while an enemy is within ~18 px does a melee slash (2-frame wind-up, big damage, satisfying sound). Like Metal Slug |
| Grenade | Separate button. Arc throw (vx 170, vy −260), bounces once, explodes on second ground contact or enemy hit. Start 10, max 30. Blast radius 28 px (circle) |
| Death | One hit (Arcade mode). Death animation → respawn at the same spot after 1.2 s with 2 s blinking invulnerability, if lives remain. Screen-clearing "respawn bomb" pushback optional |
| Lives | 3 lives, continue screen with 9-second countdown, score resets on continue, unlimited continues |

**Difficulty option** (title menu): *Arcade* = 1-hit death. *Casual* = 3 HP per life with 1 s i-frames after a hit.

## 5. Weapons (pickups carried by POWs or crates)
Letter-crate pickups like Metal Slug. Ammo-limited; reverting to pistol when empty.

| ID | Name | Behavior | Ammo |
|---|---|---|---|
| `pistol` | Pistol | Single bullet, 1 dmg | ∞ |
| `hmg` | Heavy Machine Gun **H** | Rapid fire (~14/s), slight vertical spread, sweeps when changing aim direction (Metal Slug arc sweep). 1 dmg | 200 |
| `spread` | Spread **S** | 5-way fan (±20°), 1 dmg each | 40 |
| `rocket` | Rocket **R** | Slow-start rocket that accelerates and seeks gently, small explosion, 6 dmg | 30 |
| `flame` | Flame **F** | Short-range flame stream, pierces, 0.4 dmg/tick, big visual | 30 bursts |

Also pickups: `bombs` (+10 grenades), `points` (food/medals for score, Metal Slug-style), `life` (1UP, rare, hidden).

## 6. POWs
Bearded, tied-up prisoners (Metal Slug homage, the regime's other captives). Shoot or touch them to
free them. They untie, salute, **drop the item assigned in the map**, then run off-screen left. +1 rescue
tally and 100 points each. If they're hit by explosions they're unaffected (invulnerable).

## 7. Enemies (Bizarre Regime)
Every enemy has: idle, move, attack wind-up, attack, hurt flash, **death with personality** (launched
corpse arc, or panic flee), and score value. Enemies spawn when they enter camera range (+32 px margin).

| Kind (`kind` key) | Role | Behavior | HP | Score |
|---|---|---|---|---|
| `grunt` | Rifleman (the original game's red soldier) | Patrols. On spotting the player (LOS cone ~160 px), shouts "!" then fires 1–3 slow bullets (110 px/s). Sometimes panics and flees when allies die. Can crouch-shoot | 3 | 100 |
| `grenadier` | Lobs grenades | Keeps distance (~120 px), throws an arcing grenade with a blinking fuse every 2–3 s. Retreats if the player rushes | 4 | 150 |
| `shield` | Riot shield trooper | Walks forward, blocks frontal bullets (spark + "tink"), lowers shield to fire. Vulnerable from above, behind, or to grenades/rockets | 6 | 200 |
| `turret` | Wall/sandbag MG turret | Stationary, tracks in 8 directions, burst fire with a 0.5 s glowing wind-up. Explodes into debris | 12 | 300 |
| `drone` | "Buzzard" flying drone | Sine-wave flight, dives at the player, can be shot down. Bizarre: shaped like a mechanical vulture | 2 | 150 |
| `paratrooper` | Drops in | Spawns falling with a parachute (shootable chute), lands as a grunt | 3 | 150 |

### Boss: MOOSEZILLA (`boss` kind `moosezilla`)
A huge steam-punk moose tank (~160×120 px, built from multiple parts). Arena locks the camera.
- **Phase 1 (100–60%)**: walks forward and back, antler cannons fire 3-shot spreads, stomps (shockwave
  along the ground, jump over it), and vents steam from its back.
- **Phase 2 (60–25%)**: antlers break off (destructible parts, bonus points), mouth flamethrower sweep,
  launches drone "flies".
- **Phase 3 (<25%)**: armor plating falls off, exposed glowing core, enraged charge across the arena
  (telegraphed by pawing the ground), smoke and sparks everywhere.
- **Death**: chain explosions for 3 s, hitstop, white flash, slow-mo, pieces fly, the moose head lands
  and the antlers wobble. Then "MISSION COMPLETE!".
- HP ~ 400 (pistol dps ≈ 3–7, so the fight lasts ~60–90 s with weapons). Weak points take 2×.

## 8. Mission 1 layout: "Pine Ridge Breakout" (~3–4 min for a good player)
> **Phase E:** this map is now **Part I "THE CAMP"**, ending with the Warden's Snowcat mid-boss. MOOSEZILLA moves to Part III.
> See [CAMPAIGN.md](CAMPAIGN.md) for the 3-part structure, Parts II and III, and the escape route.
Map ≈ **420×24 tiles** (6720×384 px). The camera only scrolls forward (Metal Slug lock-left); vertical
camera follows within the map height. Sections:

1. **Prison Camp** (x 0–60 tiles): start in a broken cell, wooden watchtowers, barbed fences,
   sleeping/patrolling grunts, first POW (gives `hmg`), sandbag turret. Tutorial prompts are diegetic
   (painted signs: "JUMP ▲", "BOMB ●").
2. **Pine Forest** (60–170): multi-height platforms (logs, rocks, tree branches as one-way platforms),
   drones, grenadiers on ledges, a POW in a tree (`spread`), destructible crates/barrels.
3. **River Bridge** (170–250): wooden rope bridge over a river (water = death if you fall in, mirroring the
   original's water tiles). Paratroopers drop in. Camera lock arena #1 mid-bridge: wave of grunts plus shield
   troopers. POW gives `rocket`.
4. **Regime Outpost** (250–360): concrete bunkers, steel catwalks, wall turrets, shield troopers,
   alarm lights, a POW with `flame`, a hidden `life` 1UP up top.
5. **Moose Pen / Boss Arena** (360–420): a big fenced yard, gate smashes open, MOOSEZILLA bursts out.
   Camera locks to a 384 px arena (wider if needed, with some camera drift).

Checkpoints: start of each section. Pickup crates and POWs are placed generously.

## 9. Scoring and HUD (Metal Slug-inspired)
- Top-left: **1UP**, score (8 digits), lives × icon. Top-center: **ARMS** (ammo or ∞) and **BOMB** count with the
  weapon icon. Rescue tally (POW faces). Boss HP bar appears at the bottom/top during the boss fight.
- Popups: "+100" score text floats from kills. Multi-kill bonus. Weapon-pickup callout ("HEAVY MACHINE GUN!"
  with a voice-like SFX sting).
- Results screen: score, POWs rescued × 1000 bonus, accuracy, time, rank letter.

## 10. Game flow and scenes
Boot → Preload (styled progress bar) → **Title** (animated key art, logo, "PRESS START"; menu: Start,
Difficulty, Options (volume, CRT filter on/off, screen shake on/off, controls), Credits) → **Mission intro**
("MISSION 1 — START!") → Game (+ HUD overlay scene) ⇄ Pause (Esc/Start) → Continue/Game Over →
Results → Title. Every transition uses a polished wipe or fade.

## 11. Controls (keyboard default + gamepad)
| Action | Keyboard | Gamepad (standard mapping) |
|---|---|---|
| Move/aim | Arrow keys (WASD alternative) | D-pad / left stick |
| Jump | Z (or Space) | A |
| Shoot | X (or J) | X |
| Grenade | C (or K) | B |
| Aim-lock | Shift (or L) | RB / R1 |
| Pause | Esc / Enter | Start |

## 12. Game feel checklist (the effects team leads, everyone contributes)
Hitstop (40–90 ms on kills, 150 ms on big explosions), camera shake tiers, muzzle flashes per weapon,
casings with bounce, bullet impacts per surface (dirt puff, metal spark, wood chips), explosion tiers
(S/M/L with smoke, debris, scorch decal, shockwave ring), enemy fill-tint hit flash, corpse launch
physics, dust on land/skid, water splash, parallax with 4–6 layers, ambient particles (snowfall,
fireflies, embers near the outpost), camera filters (subtle bloom on fire and explosions, optional CRT/scanline
filter), slow-mo on boss death.

## 13. Out of scope for v1 (designed for, not built)
Vehicles (the "Slug" tank), 2-player co-op (keep the player/input code instance-based so a P2 can be added),
missions 2+ (outlined in CAMPAIGN.md), online leaderboards, transformations.

## 14. Legacy reference (from the archived pygame game)
- Old tuning (800×640, 40 px tiles): run 300 px/s, jump −10 px/frame with gravity 0.5, shots every 20 frames, 25 dmg vs
  100 HP enemies, grenade fuse 1.67 s, 50 dmg blast. These are reference only; the new scale is different.
- Old tile IDs: 0–8 solid, 9–10 water, 11–14 decoration, 15 player, 16 enemy, 17 ammo, 18 health, 19 grenade box, 20 exit.
- Identity to keep: the name, green hero vs red enemies, pine/mountain parallax, patrol→spot→shoot grunt, timed grenade.
- Legacy art lives in `archive/pygame-original/img` (license unknown, so placeholder/reference only, never shipped).
