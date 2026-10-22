# Phase H3: the fix round
H1 and H2 are committed on `mission-2`. QA reviewed H1 (`docs/teams/qa-bugs.md`, Phase H section at the top) and Rules reviewed the
H1 code (`docs/teams/rules-review.md`, Phase H review section). Your items are below. **Read the full finding text in those files
first.** They have exact repros, URLs and evidence paths.
- Keep every fix small and inside your paths.
- Keep the gameplay unchanged: attack timings, hurtboxes, HP and damage.
- Re-verify each fix with the same repro QA or Rules used, and open the images.
- At the end, run `npm --prefix game run check` and `npm --prefix game run audit`.
- Append a short "Phase H3" note to your team file listing each item as fixed or won't-fix, with a reason.
