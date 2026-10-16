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
- **Next:** owner playtest → feedback rounds routed to teams.
