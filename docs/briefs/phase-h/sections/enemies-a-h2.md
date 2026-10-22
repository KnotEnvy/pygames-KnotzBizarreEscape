# Your Phase H2 job: Enemies A, the GATORGEDDON legs and claws pass
You did H1 (Buzzard and hound; it's committed, nice work). This round is **GATORGEDDON**, which is all yours as in Phase G:
`src/entities/bosses/Gatorgeddon*.ts`, `tuning/gatorgeddon.ts`, `art-src/enemies/gatorgeddon*`, `sprites/enemies/gatorgeddon*`,
`packs/gatorgeddon.m2.json`, `docs/teams/enemies-gatorgeddon.md`. B still owns everything else under Enemies' paths.
Don't touch your H1 files unless a bug shows up; if one does, fix it and say so.

**Why:** next to MOOSEZILLA, GATORGEDDON's legs are thin pistons and tread-like feet under a huge armoured body
(`/tmp/kbe-lead/polish/bosses2.png`, `b_gator_1.png`). The body, head and tail read well. The legs don't sell the weight of a mech crocodile.

**Reference:** `game/art-src/refs/gatorgeddon_legs/` (concept, pixel, poses, parts) and `game/art-src/refs/sheet_gatorgeddon_legs.png`.
Read `game/art-src/refs/README.md`; the manifest notes say the boss envelopes are provisional, so fit them to your rig.

**Build:**
1. **New front and back legs:**
   - thick armoured gator legs in the body's green and steel;
   - elbow and knee plates, visible hydraulic rams;
   - big splayed three-claw feet that grip the ground.
   Redo every leg tag: idle, walk, crouch, stomp, and anything else the rig uses. Give them weight:
   - the foot plants and the claws spread;
   - the rams compress on the stomp;
   - dust or mud on each plant (`dust_land`/`mud_splat` fx).
2. **Damage states:** the 66% and 33% cosmetic states carry through to the legs (cracked plates, a leaking ram, sparks).
3. **Death:** the legs buckle as part of the death chain. The LESSONS.md §2 boss rules all still hold.
4. **Fit:** look at the whole composite in its **real 2-3 arena**, the intro, every attack and the death, beside Knotz.
   If any other part now falls below the legs (the body's underside or the jaw hinge), give it a light matching touch.
   No silhouette redesign.

**Keep the gameplay:** the same hurtboxes (within about ±4 px), timings, attacks, HP and phases. `npm --prefix game run audit` must pass for 2-3, including the boss phases.

**Evidence:**
- before/after contact sheets of the leg tags at 4×;
- a composite boss sheet of the idle, a stomp, the 66% and 33% states and the death;
- in-arena shots of the walk and stomp.
