# Your Phase H job: UI/Audio, new enemy sounds and the title card / radio overlap
**Ownership:** your usual UI, HUD and audio paths (`src/scenes/ui/**`, `src/ui/**`, `src/audio/**`, `config/tuning/ui.ts`, `tools/audio/**`, audio assets, `docs/teams/ui-audio.md`).

**Build:**
1. **Five new sounds,** keys exactly as in `docs/PHASE-H.md` (Enemies plays them with `ctx.audio.sfx`):
   - `buzzard_gun`
   - `heli_crash`
   - `hopper_land`
   - `mech_pop`
   - `airboat_sink`

   Make them in your synth pipeline (`game/tools/audio/`, chunked OGG writer, peaks ≤ 0.8 before encoding) and register them
   in `src/audio/catalog.ts` with sensible `vol`, `vary`, `max` and `minMs`. Mission 2-only sounds go in the Mission 2 audio pack, as in Phase G.

   Match the family:
   - `buzzard_gun` sits beside the `buzzard_rotor` loop;
   - `hopper_land` beside `hopper_hop` and `hopper_croak`;
   - `mech_pop` is comic and punchy, short enough for a 6-gnat swarm (cap it).

   Run your analyzer for levels against the Mission 1 and 2 sounds.
2. **Title card / radio overlap.** Hazel's radio box (screen y 31–54) opens while the part title is still up, and it covers the big title text.
   - Today `UI.radio.delayMs` is 2650 while the title holds until `titleAt + holdMs` (2840 ms) plus its out-tween and the card's
     own 350 ms delay. See `/tmp/kbe-lead/polish/ctx_hopper.png` (title showing) and `ctx_hopper_1.png` (the radio covering it), taken 1.5 s apart.
   - Fix it so the box never overlaps the title. For example, open the radio only after the title's out-tween completes (event-driven, not a guessed delay), or move the title card.
   - Check it with frame-by-frame shots at 0.25 s steps from part start for **all six parts** (`?debug=1&scene=Game&fast=1&mute=1&part=1-1` … `2-3`), and for a mid-run part start (the PartClear → next part flow).
   - The briefing must still be readable before the first enemy shows up: the openings keep their first threat at least 224 px away.
3. **Optional, if time allows:** a quick look for any other place the radio strip or a callout covers gameplay or the boss bar in Missions 1–2. Report it, or fix it if it's yours.
