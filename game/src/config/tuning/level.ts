// Levels and content tuning (Mission 1 "Pine Ridge Breakout" m1p1..3, Mission 2 "Bayou Blackout" m2p1..3). Times in ms, distances in px.

/** One parallax layer. Repeating TileSprite unless `once` (a single image anchored at screen x = once - camX * sfX). */
export interface ParallaxLayerDef {
    key: string;
    sfX: number;
    sfY: number;
    /** Screen y when the camera rests on the map bottom. */
    y: number;
    /** Depth offset inside the band (BG_FAR + depth, or `band`). */
    depth: number;
    alpha?: number;
    fade?: 'in' | 'out';
    /** Multiplier on the map's `drift` (default 1: physically correct, the layer drifts at drift * sfX). */
    drift?: number;
    once?: number;
    /** Depth band: 'far' (BG_FAR, default), 'near' (BG_NEAR), 'track' (just above the back tiles), 'front' (over actors). */
    band?: 'far' | 'near' | 'track' | 'front';
    /** Hidden while a tunnel covers the view (train foreground / poles). */
    tunnelHide?: boolean;
    /** Hidden while any of these cover groups is up (Part II 'gorge': the background drops away). */
    hideIn?: string[];
    /** Only visible while this cover group is up (alpha × cover). */
    showIn?: string;
    /** Only visible while camX is in [from, to], fading over `fadePx` outside that span. */
    span?: [number, number, number];
    /** Hidden while camX is inside any of these [from, to, fadePx] spans (a local backdrop replaces this band there). */
    gaps?: [number, number, number][];
    /** Vertical texture scroll (px/s, scaled clock): rain sheets falling. */
    fall?: number;
}

/** Sounds and effects of cracking tiles (map property `crack_style`). */
export interface CrackStyle { crackFx: string; breakFx: string; crackSfx: string; breakSfx: string; material?: 'wood' | 'metal'; splash: boolean }

export const LEVEL = {
    /** Default map (the part's map comes from ctx.part.map). Engine's GameScene also falls back to this key. */
    map: { key: 'm1p1', stage: 1, sky: '#6aa2dc' },
    /** Tileset name in Tiled → texture key `${texturePrefix}${name}` (every tileset embedded in a map is attached). */
    texturePrefix: 'tiles_',
    /** Per map: camera background colour (shown only if a strip is ever uncovered). */
    skies: { m1p1: '#6aa2dc', m1p2: '#7f98b8', m1p3: '#3a4a6e', m2p1: '#2b2635', m2p2: '#12234a', m2p3: '#1c2433' } as Record<string, string>,

    /** Proximity spawning: objects spawn once the camera view (+ margin) reaches them. */
    activation: {
        /** Ground enemies, POWs, pickups. Enemies only think within 32 px of the view, so spawning earlier gains nothing. */
        margin: 32,
        /** Drones. */
        flyingMargin: 64,
        /** Paratroopers spawn once their x is this far inside the view, so they drop in on screen. */
        paraInside: 64,
        /** Objects this far behind the view's left edge are skipped (warps, fast forward scrolling). */
        behindMargin: 96,
        /** A factory that returned nothing (enemy cap reached) is retried after this delay. */
        retryMs: 400,
        /** Paratroopers spawn with their feet this far above the view top so they drift in (they freeze while off-view). */
        paraAboveView: 20
    },

    arena: {
        /** Lock as soon as the camera is this close to the arena's left edge (the camera then pans right into place). */
        lockLead: 48,
        /** Arena already this far behind the camera (warp) → skipped instead of locked. */
        skipPast: 64,
        /** Pause between a cleared wave and the next one. */
        waveGapMs: 700,
        /** Pause between the last kill and the unlock ("GO!"). */
        releaseDelayMs: 600,
        /** Wave enemies placed beyond the arena walls spawn this far inside them, with at most `edgePatrol` px of patrol. */
        edgeInset: 12,
        edgePatrol: 20,
        /** Default for `release=time` when the trigger has no `time` (seconds) property. */
        defaultReleaseSec: 20,
        /** Door enemies step out this long after the door starts opening. */
        doorDelayMs: 260,
        /** "WAVE n/N" / "FINAL WAVE!" prompt time at each wave start. */
        waveCallMs: 1600,
        /** A live wave member off screen this long is pulled back into view (off-view enemies freeze → stalled wave). */
        offscreenPullMs: 1500,
        /** ...and removed if it's still off screen this long after the pull, so an arena can never stall. */
        offscreenCullMs: 4000
    },

    boss: {
        /** Gate rumble before it bursts and MOOSEZILLA spawns. */
        rumbleMs: 1300,
        /** The intro starts when the view's right edge is this far past the gate's centre. */
        gateOnScreen: 16,
        smashExplosion: 'l' as const,
        /** boss:defeated (end of the death chain) → automatic stage:clear after this beat (covers FX's 0.9 s slow-mo). */
        clearDelayMs: 1400,
        /** Then wait at most this long for an airborne player to land, so the victory pose plays on the ground. */
        clearLandWaitMs: 1500,
        /** boss:intro display names by boss kind (Enemies match them case-insensitively against their boss:spawn name). */
        names: { snowcat: "WARDEN'S SNOWCAT", ironhorn: 'IRONHORN', moosezilla: 'MOOSEZILLA',
            shellshock: 'SHELLSHOCK', skeeter: 'MEGA-SKEETER', gatorgeddon: 'GATORGEDDON' } as Record<string, string>,
        /** boss:intro focus point: this far above the boss spawn's feet (the gate's middle). */
        introFocusUp: 40
    },

    /** Background director (src/level/background.ts, docs/JUICE.md). Screen positions are at rest (camera on the map
     *  bottom); `sf` = parallax scroll factor, anchors (`ax`) are parallax x (screen x = ax - camX * sf). */
    bg: {
        zoneFadeMs: 600,
        beam: { alpha: 0.26, sweepDeg: 16, periodMs: 5200 },
        // Part I
        campBeams: { sf: 0.18, y: 118, anchors: [130, 290, 470] },
        // Sky flyers keep to screen y ~62-110: above that sit the HUD row and Hazel's radio strip (y ~30-55).
        zeppelin: { sf: 0.06, y: 84, speed: 12, alpha: 0.92 },
        plane: { sf: 0.5, y: 76, speed: 125, alpha: 1 },
        crows: { sf: 0.18, y: 116, count: 13, lifeMs: 4200, cooldownMs: 7000, alpha: 0.95, rise: [26, 48], speed: [34, 70], burstS: 0.55 },
        waterfall: { sf: 0.29, ax: 1100, y: 150, alpha: 0.8, mistEveryMs: 1400, cliffKey: 'bg1_waterfall_cliff' },
        towers: { sf: 0.18, y: 128, anchors: [636, 746, 876], lampUp: 50, staggerMs: 260, alpha: 1 },
        flak: { sf: 0.23, yMin: 64, yMax: 82, minMs: 700, maxMs: 2000, alpha: 0.9, fxChance: 0.25 },
        // ax: over the stockade as you reach the yard (x~6100), above the fence left of the bunker in the arena. tint: dark engine smoke.
        yardSmoke: { sf: 0.45, ax: 3020, y: 150, alpha: 0.9, tint: 0x5c606c },
        // Part II
        gorge: { ms: 8000, fadeMs: 700 },
        buzzard: { sf: 0.2, y: 86, alpha: 0.9, periodS: 2.6, rx: 40, ry: 12, lifeMs: 6500 },
        armTrain: { y: 128, speed: 170, alpha: 0.9 },
        avalanche: { sx: 270, y: 100, alpha: 0.9, lifeMs: 3600 },
        ironPlume: { x0: 360, x1: 296, y0: 150, y1: 122, alpha: 0.85 },
        // Part III (lab anchors are pixel coords inside gen_lab_far.png at once=806, y=38; tesla tips inside gen_lab_towers.png)
        aurora: { sf: 0.03, y: 6, tiles: 4, alpha: 0.35 },
        labBeams: { once: 806, labY: 38, anchors: [[110, 78], [245, 95], [590, 92]] as [number, number][] },
        tesla: { once: 934, sf: 0.28, y: 30, tips: [[92, 6], [228, 50], [358, 6], [422, 26]] as [number, number][], minMs: 900, maxMs: 2600, alpha: 0.9, skyChance: 0.2 },
        fissure: { sx: 90, y: 150, alpha: 0.9, lifeMs: 4200 },
        moosezilla: { y: 118, speed: 34, walkInMs: 4200, roarMs: 1600, lifeMs: 11000, alpha: 1 },
        // ---------------------------------------------------------------- Mission 2 (screen y at rest; far water line ~150)
        // 2-1 CYPRESS DEEP
        fireflies: { sf: 0.22, yMin: 112, yMax: 150, minMs: 1400, maxMs: 2800 },
        herons: { sf: 0.17, y: 146, count: 7, lifeMs: 5200, cooldownMs: 8000, alpha: 0.75, rise: [34, 58], speed: [28, 52], burstS: 0.7, enterDelayMs: 1800 },
        patrolBoat: { sf: 0.17, y: 141, speed: 30, lifeMs: 16000, alpha: 0.85, lamp: [34, 2] as [number, number], beamBase: 62, beamSweep: 28 },
        wisps: { sf: 0.2, yMin: 138, yMax: 158, minMs: 500, maxMs: 1300, lifeMs: [1600, 3000] as [number, number], alpha: 0.7 },
        gatorSil: { sf: 0.12, sx: 250, y: 150, litMs: 260, darkMs: 2200, fadeMs: 1200, alpha: 0.9 },
        pondWake: { sf: 0.22, y: 156, sx: 360, speed: -34, shellAtMs: 3800, shellHoldMs: 1800, repeatMs: 11000, alpha: 0.85 },
        // 2-2 RIVER RUN (drift 200): far bank props drift with the bank layer
        riverbank: { sf: 0.23, y: 138, minMs: 2600, maxMs: 5200, alpha: 0.75 },
        // vx is on top of the drift (bank layers slide left at drift × sf): these slide past slower than the bank
        gatorPod: { sf: 0.36, y: 146, count: 4, vx: 30, alpha: 0.85 },
        burningBarge: { sf: 0.23, y: 138, vx: 16, blastMs: 4200, alpha: 0.9, lifeMs: 15000 },
        // KBE-QA-G08: every opaque pixel at screen y >= 62 (8×5 gnat frames, centre origin): 86 - 10 - bob 3 - 3 = 70 .. 101
        // depth (over BG_FAR): in front of the far riverbank treeline (2), behind the QUEEN far view (3) and the mid bank (5)
        skeeters: { sf: 0.03, count: 30, y: 86, spread: [70, 10] as [number, number], bob: 3, speed: -38, lifeMs: 11000, alpha: 0.85, depth: 2.5 },
        storm: { fadeMs: 4000, boltSx: 300, lightningAfterMs: 2500 },
        airboatRace: { sf: 0.23, y: 139, count: 3, speed: 150, alpha: 0.85 },
        // 2-3 GATOR'S DEN (and 2-2 after the storm front)
        // Requested from FX (the single lightning gate); the crossfade runs on fx:lightning with its strength. A rejected request
        // retries `retries` times every retryMs; if FX never answers in a scene, a dim fallback (no bolt) at most every fallbackMs.
        lightning: { minMs: 3500, maxMs: 8000, peak: 1, upMs: 50, holdMs: 70, downMs: 520, boltAlpha: 0.8, boltSf: 0.05, boltY: 22, thunderMs: 350,
            fxScale: 0.8, retryMs: 1600, retries: 3, fallbackMs: 4000, fallbackPeak: 0.3, doubleMs: 300, doublePeak: 0.6 },
        // bg_millwheel_big's hub sits on the painted wheel's hub: pixel (152, 74) of gen_mill_far (once 228, y 60)
        millWheel: { sf: 0.2, sfY: 0.1, ax: 228 + 152, y: 60 + 74, alpha: 1, creakMs: 4200 },
        denGlow: { sf: 0.24, ax: 1119, y: 150, alpha: 0.5, rattleMs: 6500 },
        // waits (up to waitMs) until the camera has left the mill (its back walls would hide the far water)
        gatorWake: { sf: 0.2, sx: 420, y: 142, speed: -40, tailAtMs: 3400, lifeMs: 9000, alpha: 0.95, minCamX: 3280, waitMs: 20000 },
        boatWreck: { sf: 0.3, sx: 250, y: 158, alpha: 0.9 },
        /** Event hooks per map: `start:<arena>`, `wave:<arena>:<n>`, `clear:<arena>`, `tunnel_end:<n>` → moment ids (`id@delayMs`). */
        hooks: {
            m1p1: { 'start:bridge': ['tower_lights'], 'wave:bridge:1': ['plane@500'], 'wave:bridge:3': ['plane@2600'] },
            m1p2: { 'start:guncar': ['armored_train_ltr@600'], 'wave:guncar:3': ['armored_train_rtl@400'], 'tunnel_end:2': ['avalanche@1400'] },
            m1p3: { 'clear:labgate': ['moosezilla@900'] },
            m2p1: { 'wave:pump:2': ['plane@300'] },
            m2p2: { 'start:crane': ['airboat_race@500'], 'clear:crane': ['storm_front@400'] },
            m2p3: { 'clear:mill': ['gator_wake@900'] }
        } as Record<string, Record<string, string[]>>
    },

    /** Parallax stacks by the map's `parallax` property (see docs/teams/level.md). y = offset + (restScrollY - camY) * sfY;
     *  tilePositionX = (camX + drift * t) * sfX, where drift is the map property (px/s, the moving train). */
    parallax: {
        restScrollY: 168,
        sets: {
            stage1: {
                layers: [
                    { key: 'bg1_sky', sfX: 0.015, sfY: 0, y: 0, depth: 0 },
                    { key: 'bg1_mountains', sfX: 0.08, sfY: 0.04, y: 34, depth: 1 },
                    // Phase F: far prison-camp watchtowers behind the forest (camp and early forest only)
                    { key: 'bg1_camp_far', sfX: 0.13, sfY: 0.06, y: 65, depth: 1.5, span: [0, 1500, 500] },
                    { key: 'bg1_pines_far', sfX: 0.18, sfY: 0.08, y: 91, depth: 2 },
                    // Bridge-side cliff + waterfall (one image; the director animates mist/water over it)
                    { key: 'bg1_waterfall_cliff', sfX: 0.29, sfY: 0.13, y: 26, depth: 2.6, once: 1000 },
                    { key: 'bg1_pines_mid', sfX: 0.34, sfY: 0.15, y: 82, depth: 3, fade: 'out' },
                    { key: 'bg1_outpost_far', sfX: 0.23, sfY: 0.12, y: 67, depth: 3, fade: 'in' },
                    { key: 'bg1_outpost_chimneys', sfX: 0.25, sfY: 0.12, y: 45, depth: 3.2, once: 1150 },
                    { key: 'bg1_haze', sfX: 0.5, sfY: 0.3, y: 112, depth: 10, alpha: 0.7 }
                ] as ParallaxLayerDef[],
                /** Camera x span over which the forest backdrop crossfades to the outpost backdrop. */
                crossfade: { from: 3700, to: 4084 }
            },
            m1p2: {
                layers: [
                    { key: 'bg2_sky', sfX: 0.015, sfY: 0, y: 0, depth: 0 },
                    { key: 'bg2_peaks', sfX: 0.08, sfY: 0.04, y: 30, depth: 1 },
                    { key: 'bg2_slopes', sfX: 0.22, sfY: 0.1, y: 80, depth: 2, hideIn: ['gorge'] },
                    { key: 'bg2_near_pines', sfX: 0.42, sfY: 0.18, y: 100, depth: 3, hideIn: ['gorge'] },
                    // Trestle over a gorge (bg_event gorge): the valley drops away below the train for a few seconds
                    { key: 'bg2_gorge_walls', sfX: 0.1, sfY: 0.05, y: 56, depth: 1.5, showIn: 'gorge' },
                    { key: 'bg2_valley_river', sfX: 0.18, sfY: 0.09, y: 114, depth: 2.4, showIn: 'gorge' },
                    // Levels' drawn gorge (spurs falling away to the river far below) over Imagegen's walls/valley
                    { key: 'bg2_gorge', sfX: 0.22, sfY: 0.1, y: 80, depth: 2.5, showIn: 'gorge' },
                    // Telegraph poles just behind the train, whipping past (speed illusion)
                    { key: 'bg2_poles', sfX: 0.85, sfY: 0.85, y: 56, depth: 2, band: 'near', tunnelHide: true, hideIn: ['gorge'] },
                    // Rails + sleepers under the cars (world speed: sf 1), then the ballast edge over everything
                    { key: 'bg2_track', sfX: 1, sfY: 1, y: 184, depth: 0, band: 'track', hideIn: ['gorge'] },
                    { key: 'bg2_ballast', sfX: 1, sfY: 1, y: 200, depth: 0, band: 'front', hideIn: ['gorge'] },
                    { key: 'bg2_trestle', sfX: 1, sfY: 1, y: 184, depth: 0.5, band: 'front', showIn: 'gorge' },
                    // Foreground snowbank, pines and the odd pole in front of the train
                    { key: 'bg2_fg', sfX: 1.6, sfY: 1, y: 120, depth: 1, band: 'front', tunnelHide: true, hideIn: ['gorge'] }
                ] as ParallaxLayerDef[],
                crossfade: null
            },
            m1p3: {
                layers: [
                    // Phase F: the aurora sky variant (the director adds a shimmering curtain on top)
                    { key: 'bg3_sky', sfX: 0.015, sfY: 0, y: 0, depth: 0 },
                    { key: 'bg3_mountains', sfX: 0.08, sfY: 0.04, y: 35, depth: 1 },
                    { key: 'bg3_lake_far', sfX: 0.16, sfY: 0.08, y: 112, depth: 2 },
                    // The lab compound doesn't repeat: one image that slides in near the end of the map
                    { key: 'bg3_lab_far', sfX: 0.24, sfY: 0.12, y: 38, depth: 3, once: 806 },
                    // Closer coil towers and antler antennas (tesla arcs from the director)
                    { key: 'bg3_lab_towers', sfX: 0.28, sfY: 0.14, y: 30, depth: 3.5, once: 934 },
                    { key: 'bg3_ice_ridges', sfX: 0.3, sfY: 0.15, y: 153, depth: 4 }
                ] as ParallaxLayerDef[],
                crossfade: null
            },
            // ---------------------------------------------------------------- Mission 2 (Imagegen's gen_* layers: keys bg_<map>_<name>,
            // pack imagegen.m2.json; Levels' runtime strips: keys m2p*_<name>, pack level.m2.json). `once` values centre a
            // set piece on the section it belongs to: once = camCentre * sfX + 192 - width / 2.
            m2p1: {
                layers: [
                    { key: 'bg_m2p1_sky', sfX: 0.015, sfY: 0, y: 0, depth: 0 },
                    { key: 'bg_m2p1_cypress_far', sfX: 0.1, sfY: 0.05, y: 62, depth: 2 },
                    // The stilt village rises on the far bank through the village section (camX ~2300-3700)
                    { key: 'bg_m2p1_village_far', sfX: 0.17, sfY: 0.08, y: 88, depth: 4, once: 333 },
                    // Bog: the Regime pump station far off (camX ~3700-5300), replacing the dense mid cypress there
                    { key: 'bg_m2p1_bog_pump', sfX: 0.2, sfY: 0.09, y: 110, depth: 5, span: [3700, 5600, 400] },
                    { key: 'bg_m2p1_cypress_mid', sfX: 0.28, sfY: 0.13, y: 74, depth: 7, gaps: [[2500, 3500, 300], [3900, 5300, 400]] },
                    { key: 'bg_m2p1_roots_near', sfX: 0.42, sfY: 0.2, y: 150, depth: 2, band: 'near' },
                    { key: 'm2p1_haze', sfX: 0.5, sfY: 0.3, y: 140, depth: 4, band: 'near', alpha: 0.5 }
                ] as ParallaxLayerDef[],
                crossfade: null
            },
            m2p2: {
                layers: [
                    { key: 'bg_m2p2_sky', sfX: 0.015, sfY: 0, y: 0, depth: 0, drift: 0.2 },
                    // storm_front (hook clear:crane): the storm sky fades in over the moonlit one, rain starts
                    { key: 'bg_m2p2_sky_storm', sfX: 0.015, sfY: 0, y: 0, depth: 0.1, drift: 0.2, showIn: 'storm' },
                    { key: 'bg_m2p2_riverbank_far', sfX: 0.1, sfY: 0.05, y: 38, depth: 2 },
                    // The BAYOU QUEEN far upriver at the start (towing us: it doesn't drift); gone by the container barges
                    { key: 'bg_m2p2_bayou_queen_far', sfX: 0.16, sfY: 0.08, y: 52, depth: 3, once: 212, drift: 0 },
                    // raised so the far shore's waterline (image y ~78) sits just above the barge decks (screen y 136)
                    { key: 'bg_m2p2_riverbank_mid', sfX: 0.23, sfY: 0.11, y: 60, depth: 5 },
                    { key: 'bg_m2p2_river_surface', sfX: 0.36, sfY: 0.18, y: 128, depth: 1, band: 'near' },
                    { key: 'm2p2_haze', sfX: 0.5, sfY: 0.3, y: 132, depth: 4, band: 'near', alpha: 0.45, tunnelHide: true },
                    // Wake foam under the hulls (world speed, behind the tiles) and the foam line over the waterline (front)
                    { key: 'm2p2_river_wake', sfX: 1, sfY: 1, y: 174, depth: 0, band: 'track' },
                    { key: 'm2p2_river_front', sfX: 1, sfY: 1, y: 162, depth: 0, band: 'front' },
                    // Near-bank cypress trunks whipping past BEHIND the boat and the actors (KBE-QA-G02; M1's poles are the model)
                    { key: 'm2p2_fg_trunks', sfX: 0.9, sfY: 0, y: 0, depth: 6, band: 'near', tunnelHide: true },
                    // Foreground speed layers, in front, outside the combat band so they never cover an enemy, a cue or a bullet:
                    // a canopy fringe in the top margin (screen y <= 28) and near-bank reeds anchored below the airboat lane
                    // (world y 352+, = screen y 200+ from the main deck)
                    { key: 'm2p2_fg_speed', sfX: 1.6, sfY: 0, y: 0, depth: 1, band: 'front', tunnelHide: true },
                    { key: 'm2p2_fg_reeds', sfX: 1.6, sfY: 1, y: 352 - 168, depth: 1.1, band: 'front', tunnelHide: true }
                ] as ParallaxLayerDef[],
                crossfade: null
            },
            m2p3: {
                layers: [
                    { key: 'bg_m2p3_sky', sfX: 0.015, sfY: 0, y: 0, depth: 0 },
                    // Lightning (bg_event lightning): the lit sky flashes in over the storm sky (dimmed with reduced flash)
                    { key: 'bg_m2p3_sky_lightning', sfX: 0.015, sfY: 0, y: 0, depth: 0.1, showIn: 'flash' },
                    { key: 'bg_m2p3_forest_far', sfX: 0.1, sfY: 0.05, y: 60, depth: 2 },
                    // The Drowned Mill far ahead through the sunken forest and the mill (wheel left, crane right)
                    { key: 'bg_m2p3_mill_far', sfX: 0.2, sfY: 0.1, y: 60, depth: 4, once: 228 },
                    // The den's far bank behind the gator channel (boss arena camX 3808-3936)
                    { key: 'bg_m2p3_den_backdrop', sfX: 0.24, sfY: 0.12, y: 80, depth: 6, once: 735, span: [3200, 5000, 300] },
                    { key: 'bg_m2p3_roots_near', sfX: 0.4, sfY: 0.2, y: 150, depth: 2, band: 'near', gaps: [[3700, 5000, 200]] },
                    { key: 'm2p3_haze', sfX: 0.5, sfY: 0.3, y: 138, depth: 4, band: 'near', alpha: 0.5 },
                    { key: 'm2p3_rain_sheet', sfX: 1.3, sfY: 1, y: 0, depth: 0, band: 'front', alpha: 0.22, fall: 260 }
                ] as ParallaxLayerDef[],
                crossfade: null
            }
        } as Record<string, { layers: ParallaxLayerDef[]; crossfade: { from: number; to: number } | null }>
    },

    /** The moving train (map property `drift`): low bridges (`hazard_sweep`) and tunnels (`tunnel`). */
    train: {
        /** Fallback when the map has no drift property but uses train triggers. */
        defaultDrift: 260,
        sweep: {
            /** Beam bottom (world y) when the trigger has no `y`: boxcar roofs are at 256, so standing there (head at 226)
             *  is hit and crouching (head at 238) clears it; log/coal tops (272) and decks (304) are safe. */
            y: 234,
            /** Damaging girder width (px) and how far above the bottom it reaches. */
            width: 50,
            reach: 240,
            /** Warning (horn + DUCK! sign + prompt) to the beam entering the view. */
            warnMs: 1900,
            /** Gap between beams when a trigger has count > 1. */
            gapMs: 1500,
            damage: 1,
            /** Enemies caught standing on a roof get smashed too. */
            enemyDamage: 99,
            signY: 352,
            prompt: 'LOW BRIDGE! DUCK: HOLD \u2193',
            promptMs: 2200,
            /** Per `kind` overrides (Mission 2 river: kind=branch, a mossy cypress limb instead of the girder). */
            kinds: {
                branch: { sprite: 'prop_branch', sign: 'prop_sign_branch', horn: 'boat_horn', whoosh: 'branch_whoosh', width: 44,
                    signY: 340, prompt: 'LOW BRANCHES! DUCK: HOLD \u2193' }
            } as Record<string, { sprite: string; sign: string; horn: string; whoosh: string; width: number; signY: number; prompt: string }>
        },
        /** Moving fog bank (trigger `fog`, Mission 2 river): an fx:zone of kind 'fog' slides over the boat at drift speed. */
        fog: {
            ms: 6000,
            /** Lantern buoys drifting past inside the fog (every this many px of fog). */
            lanternEveryPx: 260,
            lanternY: 340,
            prompt: ''
        },
        tunnel: {
            /** Default time inside a tunnel when the trigger has no `ms`. */
            ms: 6000,
            edgeWidth: 48,
            ceilingY: 168
        }
    },

    /** Cracking ice (`crack=true` tiles crack when the player stands on them; `crack=stomp` only on boss:stomp). */
    ice: {
        /** Intact → f1 → f2 → f3 → water, one stage per `stageMs` (600 ms total). */
        stageMs: 150,
        /** A broken tile refreezes after this long (so a route can never be lost after a respawn). */
        refreezeMs: 9000,
        stompRefreezeMs: 5000,
        /** boss:stomp power needed to crack the arena ice (MOOSEZILLA's phase-3 stomps are power 2). */
        stompMinPower: 2,
        /** Stomp holes: centred this far from the stomp point, toward the player, 2 tiles wide. */
        stompOffset: 56,
        stompSpacing: 72,
        /** Never crack within this distance of the arena walls (the player always has a corner to stand in). */
        wallMargin: 40,
        /** Per map (KBE-QA-G04): `offset` replaces stompOffset; `nearest` > 0 (tiles) moves a hole that would fall outside
         *  the wall margin or off the crackable planks onto the nearest crackable columns instead of skipping it.
         *  GATORGEDDON's stomp x is already its committed, marked tail target: lead 0, holes open at the marker. */
        perMap: { m2p3: { offset: 0, nearest: 4 } } as Record<string, { offset: number; nearest: number }>,
        /** Map property `crack_style`: sounds and effects of the cracking tiles. */
        styles: {
            ice: { crackFx: 'ice_crack', breakFx: 'ice_shatter', crackSfx: 'ice_crack', breakSfx: 'ice_break', splash: false },
            wood: { crackFx: 'debris', breakFx: 'debris', crackSfx: 'boardwalk_creak', breakSfx: 'plank_break', material: 'wood', splash: true }
        } as Record<string, CrackStyle>
    },

    /** Mission 2 water (src/level/water.ts). */
    water: {
        /** Wading surface over `material=shallow` runs: drawn over the legs (above actors, under bullets and FX). */
        //  KBE-QA-G06: murky face (alpha .72) fading into the riverbed, dim broken ripples, soft dithered ends with foam
        //  (wade_edge = 2 frames of edgeW px, swapped every foamMs).
        wade: { key: 'm2p1_wade', crest: 'm2p1_wade_crest', edge: 'm2p1_wade_edge', edgeW: 12, foamMs: 450, above: 14, alpha: 0.72, crestAlpha: 0.6, speed: 6, crestSpeed: -10 },
        /** 2-3 den channel (trigger `channel`): opaque water strip at TILES_BACK + 1, top at the rect's y (326; water line 328). */
        channel: { key: 'm2p3_channel', glint: 'm2p3_channel_glint', speed: 9, glintSpeed: -16, glintAlpha: 0.8 },
        /** Sinking logs (tile sink=true): standing time to sink (decays at half speed off the log), bob frame period,
         *  sink stage time, time under, and how long a body over the log delays the resurfacing. */
        sink: { standMs: 800, bobMs: 180, stageMs: 140, underMs: 2500, retryMs: 300 }
    },

    /** Swamp-gas vents (trigger `hazard_vent`: `period`, `on`, `offset`, ms). */
    vent: {
        period: 3400,
        on: 1100,
        /** Bubbling telegraph before every flame (never less than 700 ms). */
        telegraphMs: 900,
        /** The flame (and its damage column) starts this far above the vent's feet (the nozzle mouth). */
        nozzleUp: 10,
        /** Damage column above the nozzle. */
        width: 14,
        height: 64,
        damage: 1,
        enemyDamage: 3,
        /** Vents further than this from the view don't animate or sound. */
        activeMargin: 160,
        bubbleEveryMs: 220
    },

    /** Arena/spawner kind groups (docs/LESSONS.md §3): fliers clamp x and y when pulled back into a locked view (the Buzzard
     *  as in Mission 1), x-only kinds keep their height (the airboat's water lane), swimmers are only ever placed over water,
     *  everything else is a walker (lurker, hopper and leaper included) and snaps to the ground. */
    kinds: {
        flyXY: ['drone', 'gnat', 'buzzard'],
        flyX: ['airboat'],
        swim: ['piranha'],
        /** Kinds that keep their authored y when placed (everything else snaps to the ground below). */
        keepY: ['drone', 'paratrooper', 'buzzard', 'gnat', 'airboat', 'piranha'],
        /** Spawn with the flying margin (they enter from the side). */
        flyingMargin: ['drone', 'buzzard', 'gnat', 'airboat']
    } as Record<string, readonly string[]>,

    /** Mid-boss parts: map property `clearSfx` (e.g. the distant train whistle in Part I) plays this long after boss:defeated. */
    clearSfxDelayMs: 600,

    /** Warp cheat surface search: ±searchPx sideways, `headroom` px of free space above the feet, cost per px sideways. */
    warp: { searchPx: 64, headroom: 24, sideCost: 3 },

    /** Tutorial prompt display time. */
    promptMs: 3500,

    /** Music trigger key → audio key (files are public/assets/audio/music/music_<key>.ogg). */
    music: { prefix: 'music_' },

    /** Destructible props. body = [x, y, w, h] in canvas px (canvas origin bottom-centre). */
    destructibles: {
        crate: { hp: 3, body: [1, 3, 14, 13], material: 'wood', solid: true, damagedAt: [2], debris: 'wood', sfx: 'crate_break' },
        supply_crate: { hp: 4, body: [1, 4, 22, 12], material: 'wood', solid: true, damagedAt: [2], debris: 'wood', sfx: 'crate_break' },
        barrel: { hp: 5, body: [2, 4, 12, 16], material: 'metal', solid: true, damagedAt: [2], debris: 'metal', sfx: 'crate_break' },
        explosive_barrel: { hp: 3, body: [2, 4, 12, 16], material: 'metal', solid: true, damagedAt: [2, 1], debris: 'metal', sfx: '' },
        sandbag: { hp: 10, body: [0, 3, 32, 13], material: 'wood', solid: true, damagedAt: [5], debris: 'wood', sfx: '' },
        // Mission 2: rusty Regime fuel drums explode like the explosive barrels
        fuel_drum: { hp: 3, body: [2, 4, 12, 16], material: 'metal', solid: true, damagedAt: [2, 1], debris: 'metal', sfx: '' }
    } as Record<string, { hp: number; body: [number, number, number, number]; material: 'wood' | 'metal'; solid: boolean; damagedAt: number[]; debris: 'wood' | 'metal'; sfx: string }>,

    /** Gate props (canvas size and solid body [x, y, w, h] while closed). `lock` = the arena that bursts/blows them. */
    gates: {
        gate: { w: 96, h: 96, body: [12, 16, 72, 80] },
        mill_gate: { w: 64, h: 80, body: [8, 8, 48, 72] }
    } as Record<string, { w: number; h: number; body: [number, number, number, number] }>,

    explosiveBarrel: {
        radius: 44,
        damage: 6,
        /** A barrel set off by another explosion waits this long (chain reactions read better staggered). */
        chainDelayMs: 140
    },

    /** Stacked props fall to the next surface when their support breaks. */
    propFallMs: 220,

    searchlight: { lens: [11, -21], centerDeg: 132, sweepDeg: 26, periodMs: 3600, alpha: 0.55 },

    /** Bunker door trickle spawns (`spawns`/`count`/`interval` props). Only while the door is on screen. */
    door: { defaultCount: 3, defaultIntervalMs: 2500, firstDelayMs: 900 }
} as const;
