# Your Phase H2 job: Rules, the Phaser 4 review of the H1 facelift code
**Ownership:** `docs/teams/rules-review.md`, `docs/teams/rules.md` and `game/tools/check-phaser4.mjs`. **Review only:** don't edit game code.
New lint rules are welcome when a finding generalizes, as long as `npm --prefix game run check` stays at 0 errors and 0 warnings on HEAD.

**Scope:** the code changes in `3704ab1..97d8e5c` on `mission-2` (`git diff 3704ab1..97d8e5c -- game/src game/tools`):
- `src/entities/enemies/AssaultEnemy.ts` (Buzzard and hound);
- `src/entities/enemies/BayouEnemy.ts` (hopper, airboat, piranha, gnat);
- `src/fx/{director,pool,machines,gallery}.ts` and `config/tuning/fx.ts`;
- `src/ui/{titlecard,callout}.ts` and `src/audio/catalog.ts`;
- the audio tool changes in `tools/audio/*.py` (light touch).

GATORGEDDON and MEGA-SKEETER are being changed right now; leave them for the next round.

**Review against `docs/PHASER4-RULES.md` and your Phase G review:**
- Phaser 4 API correctness, no Phaser 3 habits.
- **Per-frame allocation and pooling.** This matters most: per-frame `drawTongue` Graphics, the FX emit rates (`rotor_wash` about every 120 ms per craft,
  `boat_wake` about every 100 ms per boat) and how they're capped.
- Listener, timer and tween cleanup on shutdown and destroy (callouts' `onHidden`, the titlecard part token).
- **Tint mode:** FILL tint on hit flash must only touch binary-alpha art (LESSONS §2).
- Depth and draw order, and the reduced-flash and screen-shake settings.
- Locked-view and arena safety for the new death animations (crash, sink, launched crew).
- Correctness bugs you spot along the way.

**Report:** append a **Phase H review** section to `docs/teams/rules-review.md`, with findings as E (error), W (warning) or N (note), each with
`file:line`, why it matters and the suggested fix, plus any lint rules you added. Your final reply is the findings table.
