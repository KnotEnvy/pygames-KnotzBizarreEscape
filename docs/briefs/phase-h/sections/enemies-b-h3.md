## Your items: Enemies B (`BayouEnemy.ts`, `phase-g.lua` and the roster libs)
1. **KBE-QA-H02 (S4):** the airboat's final sink frames leave the locked crane view in 2-2 (x about 2320 lock).
   - Fix: keep the crew escape, the fan collapse and the last debris visible inside the water lane until cleanup, for example by limiting
     the runtime downward drift so the art's own sink reads. The hull can still disappear under the surface.
2. **Rules H4 (N):** a piranha or hopper killed mid-leap hangs in the air for its whole death.
   - Fix: let it fall to its floor or water line during the death (a short gravity fall), with a splash where it lands in water.
3. **Rules H5 (N):** the piranha's ellipse cue width changes every frame, so its redraw cache never hits. Round it.
4. **QA suggestion 4:** the hopper blends into olive ground and Knotz's olive.
   - Fix: give it a clearer lit belly and a steel edge, a crisper outline at the feet, and a more legible small red flank marking,
     in all tags, including the new hop.
5. **QA suggestion 5:** the gnat's glass wing panes read as a thin slash at 1×.
   - Fix: make the wings legible at 1×, for example a slightly larger pane with a 1 px pale rim and a dark interior.
     Keep the small body and the dive hitbox. Levels' far `bg_skeeter` copies the gnat, so mention what changed in your note.

**Evidence:**
- before/after contact sheets for the hopper and gnat at 1× and 4×, beside Knotz, plus an in-context 2-1 shot;
- an airboat sink sequence in the real 2-2 lock;
- a piranha killed mid-leap.
