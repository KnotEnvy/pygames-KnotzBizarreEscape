# Your Phase H job: FX, effects for the enemy facelift
**Ownership:** your usual FX paths (`src/fx/**`, `config/tuning/fx.ts`, `art-src/fx/**`, FX sprites and packs, `docs/teams/fx.md`).

**Build** (the contract is in `docs/PHASE-H.md`; Enemies A and B start emitting these during this round):
1. **New `fx:emit` recipes:**
   - **`rotor_wash`:** a radial ring blown outward from `x` along the surface at `y`, with `width` and strength `count` (0–1).
     - `snow`: powder streaks.
     - `dirt` or `mud`: dust.
     - `water`: a spray ring and ripples.
     - `wood` or `metal`: grit.
     About every 120 ms per craft, so it has to be cheap.
   - **`boat_wake`:**
     - bow spray, a curl of white water at `x` facing `angle`;
     - a stern foam trail that lingers about 600 ms and drifts (it should read on the moving 2-2 river and on still water).
     About every 100 ms per boat.
   - **`mech_pop`:** a small comic machine death burst sized by `scale` (0.5–1.5):
     - bolts and plates with gravity and bounce;
     - one or two springs, glass glints and a shower of sparks;
     - a short puff of dark oily smoke.
     Reuse `fx_debris_metal` where it helps.
   - **`smoke_trail`:** one dark puff that drifts up and stretches.
2. **Kill feel:** add the Phase G kinds to `MACHINE` in `src/fx/director.ts` (hopper, airboat, piranha, gnat, buzzard, hound, skeeter, shellshock, gatorgeddon).
   - The hound is an armoured dog, so give it the normal kill feel.
   - Make sure a killed swarm of 6 gnats doesn't stack hitstop into a stutter.
3. **Budgets and settings:**
   - pooled, with no per-frame allocation (Rules F2);
   - caps per recipe, so 3 airboats plus a Buzzard plus a gnat swarm stays at 60 FPS on SwiftShader;
   - reduced flash and screen shake respected.
4. **Preview:** add the new recipes to your FX gallery (`src/fx/gallery.ts`), and make a contact sheet of each:
   - over a Mission 1 snow background;
   - over the 2-2 river, and over 2-1 mud.
   Then, once the enemies emit them, take in-context shots: 2-2 airboats, the Buzzard over 1-2 snow and the 2-2 river, and a hopper and piranha kill in 2-1.

**Time:** the recipes come first (about 30–45 minutes), so the enemies see them working. Then polish them against the in-game shots.
