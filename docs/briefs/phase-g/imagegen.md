# Phase G brief: Image generation

# Context (read carefully)
You are the **Image generation** team on "Knotz Bizarre Escape", a fan remake of an old pygame shooter as a **Phaser 4.2.1 + TypeScript + Vite** run-and-gun aiming at **Metal Slug 1–3 / Contra** quality (384×216 internal, pixel art, 16 px tiles, Arcade physics).
- **Repo:** /home/knotz2/code/KnotzBizarreEscape/KnotzBizarreEscape. The game is in `game/`. Branch `mission-2`.
- **Shared checkout:** other teams are working in the same checkout right now (Engine, Player, Enemies A, Enemies B, Levels, FX, UI/Audio, Imagegen).
- **Mission 1** (3 parts, juice pass) is finished, and the owner loves it: the graphics, background animations, sounds and transitions. Now we build **Mission 2 "Bayou Blackout"** at the same quality **from the first build**.

**Read first, in this order:**
1. `docs/MISSION2.md`: the design and the shared contract. Read the whole thing, especially your team's parts.
2. `docs/LESSONS.md`: the definition of done from Mission 1. **Mandatory: check your work against it before reporting.**
3. `docs/ARCHITECTURE.md`: ownership, the integration pattern, the events and debug hooks.
4. `docs/PHASER4-RULES.md`: Phaser 4 API rules.
5. `docs/JUICE.md` and `docs/CAMPAIGN.md`: the existing APIs (background director, camera cinematic, parts).
6. Your own notes in `docs/teams/imagegen.md`, which show how Mission 1 was built. Reuse your pipelines, helpers and tools.

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
- **Scratch output:** `/tmp/kbe-imagegen/`.
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
  - Append a **Phase G** section to `docs/teams/imagegen.md`: what you built (paths), how to see it (exact shot.mjs commands or URLs), tuning decisions and known issues.
  - Your **final reply** is a concise report: what you built, the verification evidence (paths of screenshots you inspected, check and audit results), known issues, and **Requests for other teams**.

# Your Phase G job: Image generation (you own `public/assets/backgrounds/*/gen_*`, `art-src/backgrounds/gen/**`, `public/assets/ui/keyart/**`)
Paint the **painterly, transparent, palette-quantized parallax layers** for Mission 2. Use the same pipeline and conventions as your Mission 1 work (read `docs/teams/imagegen.md` first; your tools and the offline Python env `UV_CACHE_DIR=/tmp/kbe-imagegen/uv-cache /home/knotz2/.local/bin/uv run --offline --with pillow ...` are documented there).

**Output dirs:** `game/public/assets/backgrounds/m2p1/`, `m2p2/`, `m2p3/`. Files named `gen_*.png`, with sources and scripts in `game/art-src/backgrounds/gen/`.
- **Size and format:** match Mission 1's layers (widths that tile seamlessly horizontally where a layer repeats; heights per depth band; transparency everywhere except the sky).
- **Palette:** the master palette quantization (docs/ART-STYLE.md).

| Part | Layers (back to front) |
|---|---|
| 2-1 CYPRESS DEEP (dusk → night) | sky (violet-amber dusk gradient, low moon, clouds); far cypress silhouette line with hanging moss; mid cypress trunks and moss curtains over dark water reflections; a far **stilt village** silhouette strip (a `once` set piece) with warm lantern windows; near mangrove roots and knees (tileable); a bog strip with a far Regime pump station silhouette |
| 2-2 RIVER RUN (night, moon, then rain) | night sky with moon and clouds; a storm-sky variant (darker, rain streaks) for after the storm front; far tree-line riverbank (tileable, it **drifts**: seamless); mid riverbank with jetties, stilt shacks and wrecks (tileable, drift); river-surface reflection strip (tileable, drift); a **BAYOU QUEEN far view** still (the riverboat seen from afar, for the opening) |
| 2-3 GATOR'S DEN (storm) | storm sky (dark, heavy clouds) plus a **lightning-lit variant** of the same sky (Levels crossfades on flashes); far drowned forest silhouettes; **the Drowned Mill far view** (`once`: ruined mill with a big waterwheel and crane); near sunken trunks and roots (tileable); a den backdrop (`once`: the far bank behind the boss channel, with green reactor glow, chains and cages) |

**Rules (LESSONS.md):**
- Layers only, not small actors. Your Mission 1 actor stills were 2–3× too big for the far bands, and Levels animates actors in Aseprite.
- Contrast stays below the gameplay layer: muted, atmospheric, darker toward night.
- Make horizontal repeats seamless, and check with a 3× repeat contact sheet.
- Look at every output, composite the layers in order over each other into a preview per part at 384×216 and at 3×, and inspect the composites.

**Report** each layer's path, size, suggested scroll factor and depth band, and whether it tiles, so Levels can integrate quickly. Write them into `docs/teams/imagegen.md` too.

**Model note:** Sol 6.1 at low effort. Keep it efficient. Budget: about 90 minutes.
