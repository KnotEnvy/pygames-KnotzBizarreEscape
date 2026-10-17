// Levels and content tuning (Mission 1 "Pine Ridge Breakout", parts m1p1 / m1p2 / m1p3). Times in ms, distances in px.

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
}

export const LEVEL = {
    /** Default map (the part's map comes from ctx.part.map). Engine's GameScene also falls back to this key. */
    map: { key: 'm1p1', stage: 1, sky: '#6aa2dc' },
    /** Tileset name in Tiled → texture key `${texturePrefix}${name}` (every tileset embedded in a map is attached). */
    texturePrefix: 'tiles_',
    /** Per map: camera background colour (shown only if a strip is ever uncovered). */
    skies: { m1p1: '#6aa2dc', m1p2: '#7f98b8', m1p3: '#3a4a6e' } as Record<string, string>,

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
        clearLandWaitMs: 1500
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
                    { key: 'bg1_pines_far', sfX: 0.18, sfY: 0.08, y: 91, depth: 2 },
                    { key: 'bg1_pines_mid', sfX: 0.34, sfY: 0.15, y: 90, depth: 3, fade: 'out' },
                    { key: 'bg1_outpost_far', sfX: 0.23, sfY: 0.12, y: 67, depth: 3, fade: 'in' },
                    { key: 'bg1_haze', sfX: 0.5, sfY: 0.3, y: 112, depth: 10, alpha: 0.7 }
                ] as ParallaxLayerDef[],
                /** Camera x span over which the forest backdrop crossfades to the outpost backdrop. */
                crossfade: { from: 3700, to: 4084 }
            },
            m1p2: {
                layers: [
                    { key: 'bg2_sky', sfX: 0.015, sfY: 0, y: 0, depth: 0 },
                    { key: 'bg2_peaks', sfX: 0.08, sfY: 0.04, y: 30, depth: 1 },
                    { key: 'bg2_slopes', sfX: 0.22, sfY: 0.1, y: 80, depth: 2 },
                    { key: 'bg2_near_pines', sfX: 0.42, sfY: 0.18, y: 104, depth: 3 },
                    // Telegraph poles just behind the train, whipping past (speed illusion)
                    { key: 'bg2_poles', sfX: 0.85, sfY: 0.85, y: 56, depth: 2, band: 'near', tunnelHide: true },
                    // Rails + sleepers under the cars (world speed: sf 1), then the ballast edge over everything
                    { key: 'bg2_track', sfX: 1, sfY: 1, y: 184, depth: 0, band: 'track' },
                    { key: 'bg2_ballast', sfX: 1, sfY: 1, y: 200, depth: 0, band: 'front' },
                    // Foreground snowbank, pines and the odd pole in front of the train
                    { key: 'bg2_fg', sfX: 1.6, sfY: 1, y: 120, depth: 1, band: 'front', tunnelHide: true }
                ] as ParallaxLayerDef[],
                crossfade: null
            },
            m1p3: {
                layers: [
                    { key: 'bg3_sky', sfX: 0.015, sfY: 0, y: 0, depth: 0 },
                    { key: 'bg3_mountains', sfX: 0.08, sfY: 0.04, y: 35, depth: 1 },
                    { key: 'bg3_lake_far', sfX: 0.16, sfY: 0.08, y: 112, depth: 2 },
                    // The lab compound doesn't repeat: one image that slides in near the end of the map
                    { key: 'bg3_lab_far', sfX: 0.24, sfY: 0.12, y: 38, depth: 3, once: 806 }
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
            promptMs: 2200
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
        wallMargin: 40
    },

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
        sandbag: { hp: 10, body: [0, 3, 32, 13], material: 'wood', solid: true, damagedAt: [5], debris: 'wood', sfx: '' }
    } as Record<string, { hp: number; body: [number, number, number, number]; material: 'wood' | 'metal'; solid: boolean; damagedAt: number[]; debris: 'wood' | 'metal'; sfx: string }>,

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
