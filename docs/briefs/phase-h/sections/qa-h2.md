# Your Phase H2 job: QA, the visual and regression review of the H1 facelift
**Ownership:** `docs/teams/qa-bugs.md` and `docs/teams/qa.md`, your test tooling (`game/tests/**`, if present), and scratch space. **Report only:
don't edit game code or art.** Owners fix in the next round.

**Scope: the H1 work, committed in `3704ab1..97d8e5c` on `mission-2`** (`git log --oneline 3704ab1..97d8e5c`):
- **Enemies A:** the Buzzard gunship and the attack hound (`AssaultEnemy.ts`).
- **Enemies B:** hopper, airboat, piranha, gnat and lurker (`BayouEnemy.ts`).
- **FX:** `rotor_wash`, `boat_wake`, `mech_pop`, `smoke_trail`, and the machine kill feel.
- **UI/Audio:** five new sounds, and the radio now opens after the title card leaves.

**Out of scope, in progress right now** (don't file against these; they may change under you): GATORGEDDON's legs, MEGA-SKEETER,
the hopper's hop squash and stretch, and the far background actors. Take your baseline from the committed HEAD and note it.

**Check, against `docs/PHASE-H.md` (rules and design direction), `docs/ART-STYLE.md` and `docs/LESSONS.md`:**
1. **Each new enemy in its real map location** (URLs: `?debug=1&scene=Game&fast=1&mute=1&god=1&part=<p>&x=<x>`; press F2 to hide the
   debug overlay for clean shots):
   - **Buzzard:** 1-2 (x about 2104, 3368, 4872), 2-1 (about 4968), 2-2 (about 2440).
   - **Hound:** 1-3 (about 600–1768).
   - **Hopper:** 2-1 (about 2776–5704), 2-2 (about 2376–2488), 2-3 (about 1080–3112).
   - **Airboat:** 2-2 (about 680–4520).
   - **Piranha:** 2-1 (about 1144–2072), 2-3 (about 536–1544).
   - **Gnat:** 2-1 (about 1816–3496), 2-2, 2-3.
   - **Lurker:** 2-1 and 2-3.

   For each one:
   - **Readability:** does it read at 1×, with contrast against that background? Is it in the same family as the grunt and SHELLSHOCK?
   - **Facing:** correct in both directions.
   - **States:** every animation state actually shows in play. Capture sequences with `__KBE.sim.advance(ms)`.
   - **Hurtbox:** matches the visible body (`debug=1` boxes).
   - **Death:** plays fully, isn't clipped, and stays inside the locked view.
   - **FX:** they show (rotor wash on snow, mud and water; boat wake; mech_pop; smoke when damaged).
   - **Layout:** nothing hides behind the HUD or Hazel's strip (screen y 31–54). The Buzzard cruises at screen y 62–110.
2. **Gameplay regression:**
   - the hopper's 500 ms tongue cue, then its 64 px tongue (is the drawn tongue on its hit line?), and shotgun knockback;
   - the airboat's 3-shot volley and its leaper drops;
   - the Buzzard's strafe telegraph and that its crash doesn't hurt the player unexpectedly;
   - the hound's pounce cue;
   - piranha leaps and gnat dives;
   - `npm --prefix game run audit` and `selftest`.
   Compare with Phase G's behaviour (`git show 3704ab1:game/src/entities/enemies/BayouEnemy.ts` and `AssaultEnemy.ts`).
3. **Title card and radio:** spot-check two part starts and one PartClear → next part start. No overlap, and the briefing is readable before the first threat.
4. **Performance:**
   - Measure FPS in the heaviest new scenes: 2-2 with several airboats, gnats and the Buzzard; 1-2 with the Buzzard; a gnat-swarm kill.
   - Other agents are running browsers on this host, so **also measure the 1-1 opening in the same session as a baseline** and
     report both. Phase G measured about 60 FPS on a quiet host.
5. **Audio wiring** (nobody can listen here): confirm the five new keys load and are triggered by their events with no missing-key warnings.

**Report:** append a **Phase H** section at the top of `docs/teams/qa-bugs.md` (same format as Phase G):
- a ranked table, with IDs `KBE-QA-H01…`, severity S1–S4, the owner team, the URL and repro, expected versus actual, and the screenshot paths;
- a short "Confirmed working" list.

Your final reply is the ranked table plus the top 5 visual improvements you'd still make.
