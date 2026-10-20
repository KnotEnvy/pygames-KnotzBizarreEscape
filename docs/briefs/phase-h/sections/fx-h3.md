## Your items: FX
1. **Rules H6 (N):** since `MACHINE` widened, a machine kill gets both the director's 6 generic metal pieces and its own `mech_pop` debris.
   A six-gnat swarm death takes about 120 of the `combat` cap's 160 slots in one frame, which starves later kills.
   - Fix: skip the generic scatter (or cut it to about 2) for kinds that emit `mech_pop`. Check the gnat swarm and an airboat kill still feel juicy.
2. **Rules H7 (N):** recipe-cap refusals increment `dropped`, which is meant for lost effects. Count recipe-cap drops separately.
3. **Performance (QA):** the mixed stress scene measured 47.97 FPS against a same-session 1-1 baseline of 58–60, on a busy host.
   Measure the heaviest 2-2 airboat scene (3 airboats, a Buzzard, a gnat swarm) with your new recipes on and off (a debug toggle or
   tuning). If they cost more than about 2 FPS, trim them (spawn rate, lifetime or count). Report both numbers, plus a same-session 1-1 baseline.
