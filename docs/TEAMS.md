# Teams and Build Plan

| Team | Model / effort | Owns (see ARCHITECTURE.md) |
|---|---|---|
| Lead / Architect | Claude Opus 5.5 | docs, tooling, integration, commits, task routing |
| Engine and core systems | Claude Opus 5.5 · medium | `src/core`, Boot/Preload/Game scenes, services, debug hooks |
| Player and weapons | GPT-6.1-Sol · medium | Knotz, weapons, projectiles, pickups, POWs (code + sprites) |
| Enemies, AI and bosses | GPT-6.1-Sol · medium | enemy roster, AI, MOOSEZILLA (code + sprites) |
| Levels and content | Claude Opus 5.5 · high | tilesets, props, Tiled maps, level loader/spawner/triggers, parallax |
| Effects and game feel | GPT-6-Astra · high | FX sprites, particles, hitstop/shake tuning, filters |
| UI, HUD and audio | Claude Fable 5.1 · xhigh | all menus/HUD scenes, font, UI art, SFX + music, AudioService impl |
| QA | GPT-6.1-Sol · high | Playwright e2e, playtests, bug reports |
| Phaser 4 rules checker | Claude Sonnet 5.5 · medium | `tools/check-phaser4.mjs`, API compliance reviews |
| Image generation (on demand) | GPT-6.1-Sol · low | painterly backgrounds/key art with transparency, palette-quantized |

## Phases
- **Phase 0 (Lead):** archive the pygame game, scaffold Phaser 4.2.1 + Vite + TS, docs, art pipeline, screenshot tool. ✅
- **Phase A (parallel):** Engine builds the core framework. Content teams build **art and data only** (no `src/` code yet,
  except Engine). The rules checker writes the linter. QA builds the test harness. Image gen paints backgrounds and key art. ✅
- **Phase B (parallel):** gameplay teams implement code in their owned `src/` dirs against the Engine's real API. ✅
- **Phase C:** QA playtest and the rules review, then fix rounds routed to the owning teams. ✅
- **Phase D:** polish pass, then hand-off to the owner for player testing. ✅ (final QA verification in `docs/teams/qa-bugs.md`)
- **Owner playtest 1:** bridge arena stalled after its final wave (5/5 runs). Lead fixed it (enemies stay on a locked screen,
  plus an off-view pull/cull safety net). **QA rule: clear arenas by real play, never with `warp` or `killEnemies`.**
- **Phase E (now): Mission 1 in 3 parts** ([CAMPAIGN.md](CAMPAIGN.md)). E1, in parallel: Engine campaign system; Levels Part I
  re-end plus Parts II and III; Enemies' Snowcat, Ironhorn, leaper, Buzzard and hound; Player's ice, laser and part entrances; FX train speed,
  tunnels, ice and transitions; UI PartClear, title cards, part select and new music; Imagegen Part II/III backgrounds.
  E2 ✅: fast test kit (`npm run audit`, about 4 s for all parts; it replaces bot playthroughs), Ironhorn on the rails, tunnel lamps,
  missing SFX and mix trim, the slim radio strip, rules review (0 E) plus fixes. **Next:** owner playtest of the full 3-part Mission 1.
- **Testing rule:** verify with `npm run audit` + `check` + `selftest` + targeted screenshots. No real-time bot playthroughs; every
  verification attempt is time-boxed (about 10 min).
