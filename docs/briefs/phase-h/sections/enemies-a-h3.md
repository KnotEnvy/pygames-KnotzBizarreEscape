## Your items: Enemies A (Buzzard and hound, `AssaultEnemy.ts`, `art-src/enemies/buzzard.lua` and `hound.lua`)
1. **KBE-QA-H01 (S4):** the Buzzard's crash art clips its own 112×80 canvas.
   - Death poses 5–11 are cut at the bottom, and the last four also lose rotor and tail pixels at the top.
   - Fix: enlarge the canvas, or reposition the poses so the nose, bent rotor and snapped tail stay complete until impact.
     Keep the origin and anchor so the in-world position doesn't jump.
2. **KBE-QA-H03 (S4):** `buzzard_fire` (and `buzzard_damaged_fire`) has 3 × 60 ms frames, but the cosmetic `muzzleMs` window is 120 ms,
   so the recoil frame never shows.
   - Fix: make the clip fit its window, or hold the pose for the whole clip. Don't change the shot timing.
3. **Rules H1 (W):** the death path clamps x to `[left+56, right-56]` every frame, even when the camera isn't locked.
   A gunship killed while still flying in teleports up to about 90 px.
   - Fix: clamp only when locked, or ease toward the clamped value.
4. **Rules H2 (N):** create the telegraph `Graphics` lazily, and clear it only when something was drawn (as `BayouEnemy` does).
5. **Rules H3 (N):** `hound_leap` is 640 ms against a 650 ms state, so the animation restarts for the last 10 ms. Line them up.

**Evidence:** a death sequence over the real 2-1 or 2-2 arena showing the complete silhouette, and a fire-frame trace showing all 3 frames.
