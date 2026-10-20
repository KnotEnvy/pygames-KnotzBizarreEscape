# Your Phase H2 job: Enemies B, the MEGA-SKEETER mosquito pass and a stronger hopper hop
Your H1 work (hopper, airboat, piranha, gnat, lurker) is committed. It's a big step up, nice work. Same ownership as H1.
Enemies A is reworking GATORGEDDON's legs at the same time (its files only).

**1. MEGA-SKEETER silhouette pass** (`boss:skeeter`, the 2-2 mid-boss, art in `art-src/enemies/phase-g.lua`, sprite `skeeter`).
- **Why:** it reads as a fat beetle-fly. The wings are an opaque blue-grey bar, and the body is a round red drum
  (`/tmp/kbe-lead/polish/bosses1.png`, `b_skeeter.png`). It must read as a **mosquito** at a glance (PHASE-H design direction).
- **Reference:** `game/art-src/refs/skeeter/` (concept, pixel, poses, parts) and `game/art-src/refs/sheet_skeeter.png`.
  The reference's visible envelope (144×104) is provisional. Fit it to your rig: about the current footprint ±15% for
  the body, with wings and legs free to reach further. The whole silhouette must stay inside the locked view and its vertical clamp.
- **Wings:** they flutter (a 3–4 frame wing blur). Show them as glassy with steel rims, veins and pale-blue panes (binary alpha).
- **Legs:** they dangle and twitch.
- **Weak point:** the abdomen fuel tank glows and pulses, so the weak point is obvious.
- **Proboscis:** the drill needle reads clearly in DRILL DIVE.
- **Tags:** redraw every one, including intro, idle, laser, dive, stuck, larva, fan_cue, fan, death, and the `_damaged` and `_critical` states.
  The torn wing at 33% must still be visible, and the death spin into the river still plays.
- **Gameplay stays the same:**
  - hurtboxes and their multipliers (the tank takes 1.5×, then 2× once it cracks);
  - every telegraph (the 700 ms laser line, the 600 ms fan cue);
  - the larva cap, HP, phases and the flier clamps.
  `npm --prefix game run audit` must pass for 2-2, including the boss phases.

**2. A stronger hopper hop.** In H1 the hop barely reads: the legs stay folded in the air (see your
`compare-context-hopper.png`, or `/tmp/kbe-lead/polish/new_hopper.png`). Give it real squash and stretch:
- **crouch:** lower, wider, with the legs visibly loaded;
- **airborne:** the body stretched and the hind legs **extended back**, with the front feet reaching;
- **landing:** a wide squash before it recovers.
Keep the hurtbox and the 720 ms arc.

**Evidence:**
- before/after MEGA-SKEETER contact sheets at 2× and 4×, beside Knotz;
- in-arena shots on the 2-2 riverboat foredeck: idle, laser cue, dive, stuck, fan, damaged, critical and death;
- a hopper hop sequence.
