// Levels and content tuning (Mission 1 "Pine Ridge Breakout"). Times in ms, distances in px.

export const LEVEL = {
    map: { key: 'map_stage1', tileset: 'stage1', texture: 'tiles_stage1', stage: 1, sky: '#6aa2dc' },

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

    /** Parallax stack (see docs/teams/level.md). y = offset + (restScrollY - camY) * sfY; tilePositionX = camX * sfX. */
    parallax: {
        restScrollY: 168,
        layers: [
            { key: 'bg1_sky', sfX: 0.015, sfY: 0, y: 0, depth: 0 },
            { key: 'bg1_mountains', sfX: 0.08, sfY: 0.04, y: 34, depth: 1 },
            { key: 'bg1_pines_far', sfX: 0.18, sfY: 0.08, y: 91, depth: 2 },
            { key: 'bg1_pines_mid', sfX: 0.34, sfY: 0.15, y: 90, depth: 3, fade: 'out' as const },
            { key: 'bg1_outpost_far', sfX: 0.23, sfY: 0.12, y: 67, depth: 3, fade: 'in' as const },
            { key: 'bg1_haze', sfX: 0.5, sfY: 0.3, y: 112, depth: 10, alpha: 0.7 }
        ],
        /** Camera x span over which the forest backdrop crossfades to the outpost backdrop. */
        crossfade: { from: 3700, to: 4084 }
    },

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
