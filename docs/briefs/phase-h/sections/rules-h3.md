## Your item: Rules, a light review of the H2 code
Review `git diff df3d3c7..f9736c3 -- game/src`. That's mostly `src/entities/bosses/Gatorgeddon.ts` (the leg rig: plants, stomp, dust, buckle)
and `src/level/background.ts` plus `config/tuning/level.ts` (the far actors' depth). Same checklist as your H1 review:
per-frame allocation, cleanup, tint mode, depth, locked-view safety and correctness.

Append the findings to your Phase H review section in `docs/teams/rules-review.md` as "H2 code", with IDs H9 onward, and list them in your final reply.
Owners are fixing H1–H7 in parallel right now, so don't re-review those.
