# Your Phase H job: Enemies B, the Mission 2 small enemies facelift
**Ownership:** everything under Enemies' paths except Enemies A's Phase H files. A has:
- `AssaultEnemy.ts`;
- the buzzard and hound art, including their section of `phase-e.lua`;
- the `hound` and `buzzard` lines of `tuning/enemies.ts`;
- all of GATORGEDDON.

A edits other lines of `tuning/enemies.ts` at the same time, so re-read it before each edit and keep patches minimal.
Your files include `BayouEnemy.ts`, `Enemy.ts`, `index.ts`, `art-src/enemies/phase-g.lua` and its preview, the sprites, and `docs/teams/enemies.md`.

**References:** Imagegen is painting them now under `game/art-src/refs/<kind>/` (concept, a game-scale `pixel.png`, poses and
parts) and marks each kind ready in `game/art-src/refs/manifest.json`. The queue order is hopper, airboat, then piranha and gnat after the Buzzard, then lurker.
- **Start without them:**
  - read the current code and art;
  - plan the per-kind tag sets, frame counts and canvases;
  - restructure the art build so each kind has its own animation set, replacing the shared 42-frame
    `idle/cue/attack/tongue_cue/tongue/fire/death` template;
  - build the procedural motion pieces (fan blur, wing blur, splashes).
- Then poll the manifest every 2–3 minutes (`sleep 150`), for up to about 40 minutes per kind. If a reference still isn't
  there, build from the PHASE-H design direction and say so.

**Build** (design direction in PHASE-H; current behaviour in `BayouEnemy.ts`):
1. **hopper (mech bullfrog).** The owner called it rough, so this one matters most.
   - **Idle (6 frames):** the throat sac pulses, the lenses iris, steam puffs.
   - **Croak:** the cue.
   - **Hop:** a crouch anticipation, a stretched airborne pose for the 720 ms hop, then a landing squash with **`hopper_land`**
     and a splash (`water:splash` in shallow water, `mud_splat` or `dust_land` on mud or ground).
   - **Tongue:** `tongue_cue` swells the sac and opens the mouth. Then a tongue that **visibly extends the full 64 px hit line**
     (y-17), over its 220 ms, and retracts. Use a separate tongue sprite or segment if that's cleaner than a wide canvas.
   - **Hurt:** a flinch. Shotgun knockback must still read.
   - **Death (≥ 8 frames):** the lenses pop out on springs and the plates fly. Play the **`mech_pop`** sound and emit the **`mech_pop`** fx (scale about 0.8).
   - Placed in 2-1 (x about 2776–5704), 2-2 (about 2376–2488) and 2-3 (about 1080–3112).
2. **airboat (Regime swamp airboat).**
   - **Cruise:** a 4-frame fan blur, a bob, and bow spray. Emit **`boat_wake`** about every 100 ms while it moves.
   - **Firing:** a gun cue (the gunner swings in and the muzzle glints), with muzzle flash frames on each of the 3 shots.
   - **At ≤ 50% HP:** damaged frames and `smoke_trail` puffs.
   - **Death (≥ 8 frames over its 1200 ms):** sparks from the cage, the nose dips, and the crew is launched (soldier
     `death_launched` style). It sinks with **`airboat_sink`**, `mech_pop` fx at scale 1.5, and the existing splash.
   - Placed in 2-2 (x about 680–4520).
3. **piranha:** swim with the fin breaking the surface, a bulge cue, an arched leap with the jaw wide, a bite snap, the fall back
   and splash, and a death (scales pop, the jaw drops off) with `mech_pop` fx at about 0.6. Placed in 2-1 (x about 1144–2072) and 2-3 (about 536–1544).
4. **gnat (mosquito drone):** a hover with a 3–4 frame wing blur, a dive cue with a glowing proboscis, the dive, and a death
   (wings snap, the bulb pops) with `mech_pop` fx at about 0.5. They come in swarms, so keep them tiny but crisp.
   Placed in 2-1 (x about 1816–3496), 2-2 and 2-3. MEGA-SKEETER's larva drop spawns them too.
5. **lurker:** clean up the noisy moss into a readable ghillie (a few big clumps and reeds, a mud hem, drips) on all its tags.

**Keep the gameplay** as PHASE-H says:
- hurtboxes within about ±4 px, realigned to the new art (check them with `debug=1`);
- the same timings, telegraphs and damage;
- entry, flight and swim behaviour unchanged.

`npm --prefix game run audit` must pass for 2-1, 2-2 and 2-3.

**Evidence:**
- a contact sheet per kind with every tag and frame at 4×, beside a grunt and Knotz;
- before/after shots in context for each kind;
- frame sequences of the hopper hop and tongue, the airboat firing and sinking, and the piranha leap.

**H2 heads-up:** you'll get the MEGA-SKEETER mosquito silhouette pass next round. Don't start it now.
