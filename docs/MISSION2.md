# Mission 2: BAYOU BLACKOUT (Phase G)

**Owner's brief:** bring Mission 1's intensity and quality to Mission 2 from the first build.
- The main boss is a mech alligator, like MOOSEZILLA for Mission 1: **GATORGEDDON**.
- Mission 2 has several different mechs to fight. They are Von Antler's war mechs that **escaped**, and Knotz is hunting them down
  to **save the city**.
- The setting is deep in the forest and the river bayous.
- The game's final boss (Mission 5) is an **Arachnid** mech, and it will be epic.

**Read first:** [LESSONS.md](LESSONS.md), the definition of done from Mission 1. Also [CAMPAIGN.md](CAMPAIGN.md) (part
contract), [JUICE.md](JUICE.md) (the event, background director and camera APIs) and [ARCHITECTURE.md](ARCHITECTURE.md) (ownership).
Mission 1's notes in `docs/teams/*.md` show how each system works.

## Story (light: Hazel's radio lines only)
When MOOSEZILLA fell, Dr. Von Antler opened the pens. His menagerie of animal-shaped war mechs broke loose and is heading south
toward **Port Delacroix**, the city. Knotz and Hazel hunt them one by one. Mission 2 follows the trail into **Blackwater Bayou**:
- **SHELLSHOCK**, a mech snapping turtle, guards the bayou.
- **MEGA-SKEETER**, a mech mosquito gunship, escorts a Regime riverboat hauling fuel cells.
- **GATORGEDDON**, Von Antler's prize mech alligator, nests under the Drowned Mill.

## Mission at a glance
| Part | Map | Title / location | Rhythm (new verb) | Ends with |
|---|---|---|---|---|
| 2-1 | `m2p1` (~6400 px) | **CYPRESS DEEP**, Blackwater Bayou | Infiltrate: boardwalks, stilt village, bog. **Wading, mud, sinking logs, swamp-gas vents** | Mid-boss **SHELLSHOCK** (`boss kind=shellshock`) |
| 2-2 | `m2p2` (~5400 px, `drift` ≈ 200) | **RIVER RUN**, Blackwater River | Moving set piece: a barge tow, then the multi-deck riverboat **BAYOU QUEEN**. **Airboats** alongside, **low branches**, a **fog bank** | Mid-boss **MEGA-SKEETER** (`boss kind=skeeter`), a flying boss |
| 2-3 | `m2p3` (~3800 + 512 px) | **GATOR'S DEN**, the Drowned Mill | Short, intense, night storm: wreck shore, sunken forest, the Drowned Mill | Main boss **GATORGEDDON** (`boss kind=gatorgeddon`), then MISSION COMPLETE |

The ground line stays at y 336, as in Mission 1, and the maps stay 24 tiles tall.

**Palette and mood:**
- 2-1: dusk turning to night (violet and amber sky, teal water, moss green, lantern orange).
- 2-2: night, under a moon then rain.
- 2-3: a heavy storm with lightning and green swamp-gas glow.
- The master palette (docs/ART-STYLE.md) still applies. If a swamp ramp is missing, Imagegen and Levels propose additions to the Lead.

### 2-1 "CYPRESS DEEP" (teaches the bayou)
| Section | Approx. x | Beats |
|---|---|---|
| Landing | 0–900 | Knotz hops off Hazel's skiff onto a rotten dock at dusk. Boardwalks, cypress knees, fireflies. Grunts, then the first **shallow water** (prompt: WADING SLOWS YOU). **POW hmg** |
| Drowned forest | 900–2300 | Giant cypress trunks, hanging moss, mangrove-root platforms. Deep water crossed on **sinking logs** and roots (prompt: LOGS SINK, KEEP MOVING!). **Piranhas** leap from deep water, **lurkers** rise from the shallows, a **gnat** swarm. **POW shotgun** on a root island (introduces the new weapon) |
| Stilt village | 2300–3900 | A Regime-occupied fishing village on stilts: shacks with one-way decks at 2–3 heights, rope bridges, nets, lanterns, POWs tied up in shacks. **Arena `stilts`** (3 waves: shack-door grunts, **hoppers**, roof grenadiers, a gnat swarm). Rain starts as you leave |
| Bog | 3900–5400 | **Mud** flats (slower, lower jump), **swamp-gas vents** (bubbles, then a flame column), a Regime pump-station outpost with turrets and sandbags. **Arena `pump`** (3 waves, one with a Buzzard paratrooper drop). A short **fog bank** with lanterns |
| Turtle pond | 5400–6400 | Bubbles and a huge wake in the pond: SHELLSHOCK's foreshadowing. **Boss arena `shellshock`** (480 px): a muddy bank with a shallow pool in the middle. Gateless: the boss surfaces from the pond as the camera arrives. Map property `clearSfx=boat_horn` (the riverboat, far away) |

### 2-2 "RIVER RUN" (moving set piece)
The world is static, and motion is an illusion, using Mission 1's train tech: `drift`, a foreground speed layer, `hazard_sweep`, and moving `fx:zone`.
The **BAYOU QUEEN** is a Regime-armoured sternwheel riverboat towing a line of barges downriver. Water between barges is
`hazard=water` (falling in = death, like the train gaps).
| Section | Approx. x | Beats |
|---|---|---|
| Skiff and fuel barges | 0–1300 | Knotz boards from a skiff. Fuel barges (explosive drums, cargo nets, a crane). **Airboats** pull alongside, and their leapers jump aboard. Gnats |
| Container barges | 1300–2700 | Stacked containers as platforms and cover; container doors spawn grunts. **Low branches** (`hazard_sweep kind=branch`: mossy cypress limbs, prompt LOW BRANCHES! DUCK: HOLD ↓, warned by `boat_horn`). A **fog bank** (tunnel-style zone `kind=fog`: dark, with lantern light passing). **Arena `crane`** on the crane barge (3 waves: airboat, Buzzard, hoppers, shields) |
| The BAYOU QUEEN | 2700–4900 | A huge red **paddlewheel** with spray at the stern (animated set piece). Then the riverboat's decks: main deck (y 304), promenade deck (one-way, y 256), hurricane roof (one-way, y 208), smokestacks, wheelhouse. Enemies on several decks shoot down, plus turrets and a dark boiler-room passage |
| Foredeck | 4900–5400 | **Boss arena `skeeter`** (384–480 px) on the bow, gateless. MEGA-SKEETER drops out of the night sky |
| Clear | | MEGA-SKEETER crashes into the river. The riverboat, out of control, heads for the shore by the Drowned Mill → PART CLEAR |

### 2-3 "GATOR'S DEN" (short and intense)
| Section | Approx. x | Beats |
|---|---|---|
| Wreck shore | 0–700 | The BAYOU QUEEN beached and burning (like Ironhorn's wreck opening 1-3), heavy rain, lurkers, piranhas |
| Sunken forest | 700–2000 | Mostly water: sinking logs, roots, mud, gas vents, hoppers, gnats. Lightning shows the way |
| The Drowned Mill | 2000–3300 | A ruined lumber mill on pilings, turned into GATORGEDDON's maintenance den: chains, cranes, giant bite marks, a huge turning **waterwheel**. **Arena `mill`** (3 waves; the mill gate blows open on clear, `lock=mill`) |
| Den approach | 3300–3800 | Crushed boats, bones, broken cage pens, DANGER: GATOR signs, claw marks. Tension, few enemies |
| The Den | 3800–4312 | **Boss arena `gator`** (512 px). A wooden **pier and mud bank** spans the arena floor; the deep channel lies **behind** it (a visual layer the boss can submerge into). Pier planks are `crack=stomp`, so heavy tail slams break holes into the water, as on Moose Lake. Gateless: the water churns as the camera arrives |

## The mechs (Enemies)
Boss rules: LESSONS.md §2, all of it.

### SHELLSHOCK: mech snapping turtle (2-1 mid-boss, ~170 HP, 3000 pts)
- **Look:** about 128×72 px. A domed, riveted shell with spikes and a mortar hatch, a hooked steel beak on a hydraulic neck, stubby clawed legs, eye lamps, and moss and pond weed hanging off it. Rust-green armour with the Regime spiral-eye on the shell.
- **Intro:** the shell breaks the pond surface first, water cascades off, the head pops out and hisses.
- **SNAP:** the head retracts and the eyes glow for at least 600 ms, then the neck shoots out.
  - Head angled **high**: a strike at standing height. **Crouch.**
  - Head angled **low**: a strike at ankle height. **Jump.**
  - This teaches reading the telegraph.
- **EGG MINES:** the hatch lobs 3 eggs on marked arcs. They land, blink and pop after about 1.2 s, and can be shot for points.
- **SHELL SPIN:** it pulls in its limbs and spins up for 700 ms, then slides and bounces off the arena walls 2–3 times.
  - It is low enough to jump.
  - It is **invulnerable** while spinning: hits make clear "clank" sparks with no damage.
  - It stops with a ≥ 48 px gap.
- **Weak point:** the head takes 2× while extended. Cosmetic cracks at 66%. At 33% the shell plates drop off and a glowing core is exposed (2×).
- **Death:** it flips onto its back with the legs flailing, chain-explodes, rocks to a stop, and the head pops off on a spring (comic beat).

### MEGA-SKEETER: mech mosquito gunship (2-2 mid-boss, ~200 HP, 3500 pts)
- **Look:** about 144×80 px. Four blurred rotor wings, a bulbous glowing red fuel-blood tank for an abdomen, a long drill proboscis, compound sensor-eye clusters, and thin jointed legs dangling with mini-guns.
- **Intro:** a gnat swarm and a rising whine, then it drops in from the sky above the bow and flares its legs.
- **DRILL DIVE:** a red laser line locks onto the player's spot for 700 ms, then it dives along that line and drives the drill into the deck.
  - It is **stuck for about 700 ms**, low and open: the punish window.
- **LARVA DROP:** 3 pods bounce and hatch gnats. No more than 4 gnats alive at once.
- **STINGER FAN:** the leg guns glow for 600 ms, then fire a slow downward fan. Gaps in the fan are readable.
- **Weak point:** the tank takes 1.5×, and 2× once it cracks at 33%.
  - From 33%, one wing is torn: erratic flight, sparks, faster dives.
  - It is framed by Engine's boss framing like any boss and stays inside the locked view (flier rules, LESSONS.md §3).
- **Death:** it spins out of control and crashes into the river beside the boat with a huge splash and explosion.

### GATORGEDDON: mech alligator (2-3 main boss, ~450 HP plus a 50 HP missile pod, 6000 pts)
- **Look:**
  - About 224–240×88–96 px: long, low and heavy.
  - A long snout of steel teeth, yellow eye lamps under brow plates.
  - Dorsal ridges made of exhaust stacks and spikes.
  - A back-mounted **missile pod**.
  - A segmented tail with a blade tip, four hydraulic legs.
  - Rust and swamp-green armour, hanging moss, the Regime spiral-eye on the flank.
  - It must read "gator" at a glance in silhouette.
- **Intro (`boss:intro`):** the swamp goes quiet, bubbles rise, the eye lamps snap on under the water, then the snout rises. It roars with the jaw wide open,
  steam and water pouring off, then climbs onto the pier.
- **Phase 1 (100–66%):**
  - **JAW LUNGE:** it crouches as the hydraulics hiss and the eyes flare (≥ 700 ms), then lunges about 160 px snapping and stops ≥ 48 px from the wall. Jump the low snout, or keep away.
  - **MISSILE POD:** 4 swamp rockets on marked arcs. Destroying the pod (50 HP) stops them and leaves a smoking socket.
  - **TAIL SWEEP:** used when the player is behind it. The tail coils for 600 ms, then sweeps low. **Jump.**
- **Phase 2 (66–33%):**
  - **SUBMERGE AMBUSH:** it dives behind the pier. A wake and bubbles track the player for about 900 ms, with the eye glow showing beneath.
    Then it bursts up at the marked spot, jaws snapping. Move off the mark. It does this 2–3 times, then climbs back up.
  - **JAW GATLING:** the jaw opens to reveal a gatling that sweeps at standing height. **Crouch.**
- **Phase 3 (33–0%):**
  - Armour is torn off and a glowing **reactor** is exposed on its back (2×).
  - **DEATH ROLL:** it rolls along the channel and throws a wave across the pier. Jump the wave.
  - **TAIL SLAM:** `boss:stomp` with power 2 breaks pier planks (`crack=stomp`) into holes that repair after about 5 s.
  - **SWAMP-GAS BREATH:** a green gas cloud, then a spark. A ground-level flame jet. Jump or keep distance.
  - Faster lunges.
- **Weak points:** the head and eyes take 1.5×, and the reactor 2× (phase 3 only).
- **Death:** it roars and staggers as explosions run down its body. The jaw falls off, it flips belly-up and sinks into the channel with bubbles.
  The eye lamps fade last. Big slow-mo.
- **Depth:** when submerged it renders behind the pier's front tiles. Hurtboxes are off while it's fully under, with a visible wake.

### New regular enemies (Mission 2 roster)
| Kind | What | HP / pts | Behaviour (telegraph) |
|---|---|---|---|
| `lurker` | Regime swamp trooper in marsh ghillie | 3 / 150 | Rises from shallow water or mud dripping weed (700 ms entry, clamped inside a locked view), then grunt rifle AI |
| `piranha` | Mech piranha | 1 / 100 | Lives in deep water. A ripple shows for 500 ms, then it leaps in an arc 64–96 px high and splashes back. Contact damage; shootable. Never leaps from off-screen |
| `hopper` | Bullfrog walker mini-mech | 4 / 200 | Squats for 450 ms, then a big arcing hop toward the player. Its throat sac inflates for 500 ms, then a **tongue harpoon** shoots out horizontally (about 64 px). Stays on its floor |
| `gnat` | Mech mosquito drone | 1 / 50 | Swarms of 3–4, weaving on a sine. Hovers with a red eye for 400 ms, then a dive-prick. Flier rules like `drone` |
| `airboat` | Regime airboat (fan, driver, gunner) | 16 / 500 | Rides the water lane beside the barges (2-2) and keeps pace. Gunner bursts (600 ms cue). Drops 1–2 `leaper`s, like the Buzzard drops paratroopers. Explodes and sinks. Locked-view rules like `buzzard`; positional `airboat_motor` loop |

Mission 1 enemies are reused across Mission 2: grunt, grenadier, shield, turret, drone (sparingly), paratrooper, leaper (from
airboats) and Buzzard. Hounds are not used.

## Player (new for Mission 2)
- **Wading** (`material=shallow`):
  - speed ×0.72 and jump ×0.9;
  - step splashes (`water:splash` s every ~180 ms while moving), a landing splash (m), and the wading sound;
  - crouch still works;
  - Levels draws a translucent water surface over the legs (`front` layer).
- **Mud** (`material=mud`): speed ×0.6, jump ×0.85, mud splats and a squelch.
- **Deep water** (`hazard=water`): a new **sinking death** (Knotz sinks flailing with bubbles), `water:splash` l.
- **New weapon: SHOTGUN** (`shotgun`, pickup letter **S**, ammo 30):
  - short range: a cone of about 72 px for heavy damage, plus a few pellets;
  - strong knockback on regular enemies, about 550 ms between shots, with a pump animation;
  - a big muzzle blast and a distinct silhouette in every pose;
  - balanced so it's strong but not a boss-melter.
- **Part entrances:**
  - 2-1: hop off the skiff onto the dock.
  - 2-2: jump from the skiff onto the barge.
  - 2-3: crawl out of the riverboat wreck into the shallows.

## Shared contract (the Lead lands these types before teams start)
- `events.ts`:
  - New `'water:splash': { x, y, size: 's'|'m'|'l'|'xl', kind?: 'step'|'enter'|'leap'|'surface'|'sink' }`. Anyone emits; FX
    (splash, rings) and Audio (`splash_s/m/l/xl`) listen.
  - `fx:ambience.kind` gains `'swamp' | 'rain' | 'storm' | 'fog' | 'river'`.
- `contracts.ts`: `TerrainMaterial` gains `'mud'`. Engine maps tile `material=shallow` → impact material `'water'` and `mud` → `'mud'`.
- `campaign.ts`: Mission 2 `BAYOU BLACKOUT` (biome `bayou`), parts `2-1`/`2-2`/`2-3` (maps `m2p1..3`, music `music_m2p1..3`, briefings).
- **Tiled vocabulary (Levels owns the validator):**
  - tile `material=shallow|mud`;
  - tile `sink=true` (sinking log: bobs when stood on, sinks after ~800 ms, the tile becomes water, and it resurfaces after ~2.5 s, never into a body);
  - trigger `hazard_vent` (`period`, `on`, `offset`; ≥ 700 ms bubbling telegraph);
  - `hazard_sweep kind=branch`;
  - tunnel-style zone `kind=fog`;
  - ambience ids above;
  - boss kinds `shellshock|skeeter|gatorgeddon`;
  - enemy kinds `lurker|piranha|hopper|gnat|airboat`;
  - POW/pickup item `shotgun`.
- `LEVEL.boss.names`: `shellshock: 'SHELLSHOCK'`, `skeeter: 'MEGA-SKEETER'`, `gatorgeddon: 'GATORGEDDON'`.
- **Mission asset packs (Engine):**
  - Mission 2 assets go in **`public/assets/packs/<team>.m2.json`**, which each team owns, the same format as its main pack.
  - Engine loads `packs/*.m<N>.json` when a part of mission N starts (cached after the first load, a small loading bar). A missing mission pack is not an error.
  - Mission 1's assets stay in the main packs.
  - Aseprite animations from mission packs are created on load.
- **Mission chaining (Engine + UI):**
  - When the final part of mission N clears and mission N+1 exists, the Results data carries `next: PartDef` (its first part) and `carry`.
  - Results' confirm starts `Game { part: next.id, carry }`, and the title card shows MISSION 2.
  - Clearing 1-3 unlocks 2-1.
  - The last mission's Results goes to Title as now.

## Background moments (Levels directs; FX particles, Audio sound, the director's art)
Rules from LESSONS.md §5: flyers stay at screen y 62–110, lower contrast than gameplay, and every id gets a sound mapping.

| Part | Moment id | Trigger (suggested) | What plays |
|---|---|---|---|
| 2-1 | `fireflies_swarm` | zone, landing + forest | Glowing swarms drift between the far trunks |
| 2-1 | `herons` | zone + explosions (like `crows`) | White egrets and herons lift off from the far marsh |
| 2-1 | `patrol_boat` | one-shot, forest | A Regime patrol boat with a sweeping searchlight glides along a far channel |
| 2-1 | `wisps` | zone, bog | Eerie green swamp-gas flames flicker on far water |
| 2-1 | `gator_glimpse` | one-shot, bog | **Lightning reveals GATORGEDDON's silhouette** far across the swamp, then it's gone (foreshadowing) |
| 2-1 | `plane` | hook `wave:pump:N` | The transport plane passes before paratroopers drop (reuse) |
| 2-1 | `pond_wake` | zone, the turtle-pond approach | A huge wake, then a shell breaks the far pond surface (SHELLSHOCK foreshadowing) |
| 2-2 | `riverbank` | zone, whole map | Stilt shacks, jetties and wrecks pass on the far bank (drift) |
| 2-2 | `gator_pod` | one-shot | A pod of mech-gator ridges cruises past in the far water |
| 2-2 | `burning_barge` | one-shot, container barges | A burning wreck drifts by with flames and an explosion |
| 2-2 | `skeeter_swarm` | one-shot, BAYOU QUEEN | A dark cloud of mech mosquitos crosses the moon with a distant whine (MEGA-SKEETER foreshadowing) |
| 2-2 | `storm_front` | hook `clear:crane` | Lightning on the horizon, then rain starts (ambience `rain`) |
| 2-2 | `airboat_race` | hook `start:crane` | Airboats race through a far channel |
| 2-3 | `lightning` | zone, whole map | Storm flashes light up the far cypress silhouettes (dimmed with reduced flash) |
| 2-3 | `mill_wheel` | zone, mill | The far mill's broken waterwheel turns and creaks |
| 2-3 | `den_glow` | zone, den approach | Green reactor glow pulses from the far den with chain rattles |
| 2-3 | `gator_wake` | hook `clear:mill` (+0.9 s) | GATORGEDDON's ridges slide through the far water, its tail breaks the surface, and a far roar (shake 2) |
| 2-3 | `boat_wreck` | one-shot, wreck shore | Burning BAYOU QUEEN debris collapses into the water |

## Sound keys (Audio supplies all of them; other teams use exactly these names)
- **Music:**
  - `music_m2p1`: swampy dusk, slide guitar and percussion, tense.
  - `music_m2p2`: driving river chase.
  - `music_m2p3`: storm, dark and heavy.
  - `music_boss_m2`: mid-bosses.
  - `music_boss_gator`: GATORGEDDON, epic.
- **Ambient beds** (by `fx:ambience` kind): `swamp` (frogs, crickets, cicadas), `rain`, `storm` (rain plus thunder), `fog`, `river` (water rush plus paddlewheel).
- **Player:** `shotgun_fire`, `shotgun_pump`, `wade_step`, `mud_step`, `splash_s`, `splash_m`, `splash_l`, `splash_xl`, `drown`.
- **Enemies:** `lurker_rise`, `piranha_leap`, `piranha_bite`, `hopper_croak`, `hopper_hop`, `hopper_tongue`, `gnat_buzz` (positional loop), `airboat_motor` (positional loop), `airboat_gun`.
- **SHELLSHOCK:** `turtle_hiss`, `turtle_snap`, `shell_clank`, `shell_spin` (loop), `egg_lob`, `egg_beep`.
- **MEGA-SKEETER:** `skeeter_whine` (loop), `skeeter_laser`, `skeeter_dive`, `skeeter_drill`, `larva_pop`, `stinger_fire`.
- **GATORGEDDON:** `gator_roar`, `gator_snap`, `gator_hiss`, `gator_tail`, `gator_submerge`, `gator_surface`, `gator_roll`, `gator_missile`, `gator_gatling`, `gator_gas`, `gator_flame`, `gator_death`.
- **Level:** `log_bob`, `log_sink`, `gas_bubble`, `gas_vent`, `boardwalk_creak`, `boat_horn`, `branch_whoosh`, `paddlewheel` (loop), `mill_wheel` (loop), `thunder`, `plank_break`.
- **Background moments:** every id in the table above gets a mapping in `UI.audio.bgEvents` (reuse existing keys where it fits).

## Team assignments (Phase G1, all in parallel)
| Team | Work |
|---|---|
| **Lead** | This doc, LESSONS.md, the CAMPAIGN.md outline, and the shared types above. Then integration, checks, commits |
| **Engine** (Opus 5.5 medium) | Mission asset packs (lazy per-mission loading); mission chaining and unlock; materials; `audit:reach` and `audit:arenas` for parts 2-1/2-2/2-3 (mud jump, `sink` tiles, deep water, flier boss); a `cheats.bg(id)` slot; boss framing check with a ~240 px boss in a 512 px arena |
| **Player** (Sol 6.1 high) | Wading, mud, sinking death, shotgun (art, sound hooks, pickup and POW icon), the 3 part entrances |
| **Enemies A** (Sol 6.1 high) | **GATORGEDDON**: art, rig, intro, damage states, debris, flash, submerge depth, `boss:stomp`, fixture `enemytest=gatorgeddon` |
| **Enemies B** (Sol 6.1 high) | **SHELLSHOCK**, **MEGA-SKEETER**, and `lurker`, `piranha`, `hopper`, `gnat`, `airboat`, with fixtures for each. Owns `index.ts` registration and shared tuning; wires in A's boss |
| **Levels** (Opus 5.5 high) | Tilesets (bayou, barge and riverboat, mill), props, maps `m2p1..3`, sinking logs, vents, branches, fog, wading water, the background director moments and actors, Imagegen layer integration, arena events, validator, audit passes |
| **FX** (Astra 6 medium) | Water (splash sizes, rings, wakes, bubbles, drips, river spray, paddlewheel spray), rain and storm with lightning flashes (reduced flash respected), fog, fireflies and swarms, swamp gas and flames, mud and water impact materials, the gator's surface cascade, background effects for the moments |
| **UI/Audio** (Fable 5.1 high) | Every key above; the mission-chain Results "CONTINUE TO MISSION 2", the MISSION 2 title card; PART SELECT and route map for 6 parts; the WARNING banner for the new bosses; a shotgun HUD icon |
| **Imagegen** (Sol 6.1 low) | Painterly transparent parallax for 3 parts: bayou dusk sky, far cypress, mid moss cypress, near roots, stilt village far, riverbanks (tileable for drift), storm sky with lightning variants, the Drowned Mill far and near, a BAYOU QUEEN far view |
| **QA, then Rules** (G2) | After integration: audits for every part, a visual review gallery and a contact sheet per part, then the Phaser 4 review |

## Test hooks
- `?part=2-1|2-2|2-3` and `__KBE.cheats.part('2-2')`.
- `enemytest=shellshock|skeeter|gatorgeddon|lurker|piranha|hopper|gnat|airboat`.
- `npm run audit -- --part 2-1` (Engine adds the parts to `all`).
- `__KBE.cheats.bg('<id>')`.
