# Phase G brief: UI, HUD and audio

# Context (read carefully)
You are the **UI, HUD and audio** team on "Knotz Bizarre Escape", a fan remake of an old pygame shooter as a **Phaser 4.2.1 + TypeScript + Vite** run-and-gun aiming at **Metal Slug 1–3 / Contra** quality (384×216 internal, pixel art, 16 px tiles, Arcade physics).
- **Repo:** /home/knotz2/code/KnotzBizarreEscape/KnotzBizarreEscape. The game is in `game/`. Branch `mission-2`.
- **Shared checkout:** other teams are working in the same checkout right now (Engine, Player, Enemies A, Enemies B, Levels, FX, UI/Audio, Imagegen).
- **Mission 1** (3 parts, juice pass) is finished, and the owner loves it: the graphics, background animations, sounds and transitions. Now we build **Mission 2 "Bayou Blackout"** at the same quality **from the first build**.

**Read first, in this order:**
1. `docs/MISSION2.md`: the design and the shared contract. Read the whole thing, especially your team's parts.
2. `docs/LESSONS.md`: the definition of done from Mission 1. **Mandatory: check your work against it before reporting.**
3. `docs/ARCHITECTURE.md`: ownership, the integration pattern, the events and debug hooks.
4. `docs/PHASER4-RULES.md`: Phaser 4 API rules.
5. `docs/JUICE.md` and `docs/CAMPAIGN.md`: the existing APIs (background director, camera cinematic, parts).
6. Your own notes in `docs/teams/ui-audio.md`, which show how Mission 1 was built. Reuse your pipelines, helpers and tools.

**The shared contract is already in the code:**
- `src/config/campaign.ts` has Mission 2: parts `2-1`/`2-2`/`2-3`, maps `m2p1..3`, music `music_m2p1..3`.
- `events.ts` has `water:splash` and the ambience kinds `swamp|rain|storm|fog|river`.
- `contracts.ts` has the `mud` material.
- **Mission 2 assets go in a new `game/public/assets/packs/<team>.m2.json`** (same format as your main pack). Boot loads these packs today as a Lead
  stopgap; Engine is replacing that with on-demand per-mission loading, which needs no changes from you.

# Rules
- **Edit only the paths your team owns** (ARCHITECTURE.md). If you need something outside them, list it under **"Requests for other teams"** in your report.
- **No git commands that change state:** no commit, add, checkout, stash, reset or restore. The Lead commits.
- **Other teams' work in progress:**
  - Transient typecheck errors in their files are expected; don't touch their files.
  - At the end, run `npm --prefix game run check` and make sure **your** files are clean.
  - Report foreign errors briefly.
- **Testing (the owner's hard rule): NO real-time bot playthroughs.**
  - Use `npm --prefix game run check`, `npm --prefix game run audit` (or `node game/tools/arena-audit.mjs --part 2-1`), `npm --prefix game run selftest`, your `enemytest=`/sandbox fixtures, `__KBE.sim.advance(ms)` (fixed-step turbo), `__KBE.cheats.*`, and targeted `game/tools/shot.mjs` screenshots and contact sheets.
  - **Open and look at** every image you cite.
  - **Time-box each verification attempt to about 10 minutes.** If a check won't converge, stop and report it.
  - Warping between arenas is fine; clearing arenas with warp/killEnemies hides bugs.
- **Scratch output:** `/tmp/kbe-ui/`.
- **Shell:**
  - `cd` is aliased by fnm and errors. Use `builtin cd`, absolute paths, or `npm --prefix game ...`.
  - **Never** use `pkill -f` or `killall` with patterns (an agent once killed its own shell that way). Kill by PID.
  - Stop every dev server or browser you start before you finish.
- **Browser:** `game/tools/shot.mjs` already sets up Chromium (`LD_LIBRARY_PATH=/home/knotz2/.local/opt/chromium-libs/root/usr/lib/x86_64-linux-gnu`, SwiftShader). Reuse or adapt it. Shot tips:
  - wrap `scene.start` evals in `(…, 1)`;
  - use unique shot names;
  - allow about 1.2 s of boot.
- **Pixel art:**
  - Aseprite is at `/home/knotz2/.local/bin/aseprite` (guide: `/home/knotz2/.local/opt/pixel-tools/PIXEL-TOOLS.md`); Tiled at `/home/knotz2/.local/bin/tiled-headless`.
  - Master palette only (`docs/ART-STYLE.md`), binary alpha.
  - **Aseprite tags are global animation keys:** prefix every tag with its sprite key.
  - Build with `bash game/tools/build-art.sh <lua>`.
- **Quality bar:** this has to look and feel like Metal Slug. Silhouettes read at 1×, there's life in every idle, telegraphs are fair, impacts are juicy, and it holds 60 FPS on SwiftShader. Reduced-flash and screen-shake settings are respected.
- **Sound keys:** use exactly the names in MISSION2.md. Missing sounds are silent; UI/Audio is making them all in parallel.
- **When done:**
  - Append a **Phase G** section to `docs/teams/ui-audio.md`: what you built (paths), how to see it (exact shot.mjs commands or URLs), tuning decisions and known issues.
  - Your **final reply** is a concise report: what you built, the verification evidence (paths of screenshots you inspected, check and audit results), known issues, and **Requests for other teams**.

# Your Phase G job: UI, HUD and audio (you own `src/scenes/ui/**`, `src/ui/**`, `src/audio/**`, `src/config/tuning/ui.ts`, `public/assets/{ui,fonts,audio}/**`, `art-src/ui/**`, `tools/audio/**`, `packs/ui*.json`)
1. **Every sound key in MISSION2.md § Sound keys:**
   - **Music:** `music_m2p1` (swampy dusk: slide guitar, washboard percussion, tense), `music_m2p2` (driving river chase), `music_m2p3` (storm, dark, heavy), `music_boss_m2` (mid-bosses), and `music_boss_gator` (**epic**: the GATORGEDDON fight is the mission's headline).
   - **Ambient beds** per `fx:ambience` kind (`swamp`, `rain`, `storm`, `fog`, `river`).
   - **Player, enemies, the three bosses, level and background-moment sounds.**
   - Synthesized with your existing `tools/audio` pipeline, matched to Mission 1's measured levels and mix. Mission 2-only audio goes in `packs/ui.m2.json`, so check with Engine's lazy loader notes that your AudioEngine sees those keys when Game starts.
2. **`water:splash` sounds** (the new event): `kind:'step'` → `wade_step`; others → `splash_s`/`splash_m`/`splash_l`/`splash_xl` by size. Rate-limit them sensibly so wading doesn't machine-gun.
3. **`bg:event` mapping** (`UI.audio.bgEvents`): MISSION2.md lists the planned Mission 2 ids. Levels will report its final ids. Map every one; this was Mission 1's silent-key lesson.
4. **Mission chaining:** Engine is adding `next: PartDef` and `carry` to the Results data, read in `docs/teams/engine.md` once they write it; until then, code defensively.
   - When `next` is present, Results shows **CONTINUE TO MISSION 2** (Enter) as well as quitting to Title, and starts `scene.start('Game', { part: next.id, carry })`.
   - Make the transition feel like Metal Slug's mission break.
5. **Title cards:**
   - The first part of a mission shows the mission banner (**MISSION 2: BAYOU BLACKOUT**) before the part card.
   - Hazel's briefing lines come from `campaign.ts`. 2-1 has 2 lines, so make sure the radio strip handles them.
6. **PART SELECT and route map:**
   - Show 6 parts grouped by mission (only unlocked ones selectable).
   - `TitleScene` currently uses `CAMPAIGN[0]` in places. Generalise it.
   - Route map art for Mission 2 (`map_m2.png`, the escape route south into the bayou), and per-part tips in `UI.tips` for 2-1..2-3.
   - The PartClear POW totals (`UI.powTotalByPart`) for 2-1..2-3: get the counts from Levels' report or the maps.
7. **HUD:**
   - a shotgun weapon icon (letter S) and the "SHOTGUN!" pickup callout;
   - the WARNING banner and siren work for SHELLSHOCK, MEGA-SKEETER and GATORGEDDON (by name, from `boss:intro`);
   - the boss bar works with their names;
   - give GATORGEDDON a bigger, more ominous WARNING beat if your banner supports variants.
8. **Verification:**
   - Your audio manifests with peak, RMS and loop seams.
   - Screenshots: the Results mission chain, the mission banner, PART SELECT, the route map, the shotgun HUD.
   - `npm --prefix game run check` clean in your files.
   - Nobody can listen, so state levels numerically against Mission 1's references.

**Model note:** Fable 5.1 at high effort.
