// Engine tuning. Times in ms, speeds in px/s, accelerations in px/s².
export const ENGINE = {
    width: 384,
    height: 216,
    tile: 16,
    gravity: 900,
    /** Longest frame step gameplay ever sees (prevents tunneling after tab switches). */
    maxDeltaMs: 50,

    camera: {
        // Phase D feel pass (real player, every section; see docs/teams/engine.md "Camera feel"). Metal Slug: steady
        // horizontal scroll with a forward bias, vertical follow by platform height only.
        /** Where the player sits horizontally (0..1 of the view width) when the camera is caught up (before look-ahead). */
        anchorX: 0.4,
        /** Where the player's standing center sits vertically (0..1 of the view height). */
        anchorY: 0.62,
        /** Standing center above the feet (px). The camera tracks feet − this, so crouching never moves it. */
        centerAboveFeet: 16,
        /** Half-width of the horizontal deadzone around the follow focus (px). */
        deadzoneX: 12,
        /** Grounded vertical deadzone (px): ignores slope/one-tile-curb noise; real ledges move the camera. */
        deadzoneY: 6,
        /** Airborne window (px above / below the last grounded focus). A full jump (~56 px) stays inside it, so hops
         *  never move the camera; big climbs follow on landing, falls follow once past airDown. */
        airUp: 72,
        airDown: 24,
        /** Hard screen margins (px) for the feet / head: fast falls and climbs never leave the view. */
        marginBottom: 28,
        marginTop: 24,
        /** Look-ahead distance in the facing direction (px). */
        lookAhead: 36,
        /** Exponential follow rates (1/s). Higher = snappier. */
        followRateX: 7,
        followRateY: 3.5,
        /** Vertical rate while the player falls below the held focus (drops lead instead of dragging the margin). */
        followRateFall: 9,
        lookAheadRate: 2.5,
        /** Arena lock / unlock transition duration. */
        lockTweenMs: 700,
        /** Never scroll back left (Metal Slug). */
        forwardOnly: true,
        /** Phase F run lead: extra px in the direction the player is actually moving (on top of lookAhead). */
        runLead: 10,
        /** Horizontal speed (px/s) above which the run lead applies. */
        runLeadMinSpeed: 30,
        runLeadRate: 3,
        /** focus(): farthest the view is pushed off the follow position (px), and how far inside the view the
         *  player always stays (px from either edge) while a focus is active. */
        focusMaxPushX: 96,
        focusMaxPushY: 32,
        focusPlayerMargin: 64,
        /** Cinematic bar height (px, top and bottom). Kept at about 14 so the HUD's top and bottom rows stay clear. */
        letterboxPx: 14,
        /** zoomPunch amount cap (1 + amount is the peak zoom) and longest punch. Nearest-neighbour sampling
         *  shimmers at non-integer zoom, so punches stay small and short (rules review F3). */
        zoomPunchMax: 0.06,
        zoomPunchMaxMs: 180,
        /** Boss framing (while locked in a boss arena): keep the boss's hurtbox union `pad` px inside the view and
         *  the player at least `playerMargin` px inside it (the player wins when both can't fit). Eased in/out. */
        bossFrame: {
            pad: 8,
            playerMargin: 48,
            easeInMs: 700,
            easeOutMs: 700
        },
        /** Auto boss-intro cinematic (on boss:intro). Runs on real time; it never blocks input. */
        bossIntro: {
            letterboxMs: 450,
            /** Slow push toward the boss/gate (the focus transition time). */
            pushMs: 1400,
            /** Push strength toward the boss point, 0..1 of the way (then capped by focusMaxPushX). */
            pushAmount: 0.6,
            /** Release this long after boss:spawn. */
            holdAfterSpawnMs: 1000,
            releaseMs: 900,
            /** Safety: end the cinematic if boss:spawn never comes. */
            timeoutMs: 9000
        }
    },

    /** Camera shake tiers 1..4: duration (ms) and intensity (fraction of the view size). */
    shake: {
        1: { ms: 90, intensity: 0.004 },
        2: { ms: 160, intensity: 0.008 },
        3: { ms: 260, intensity: 0.014 },
        4: { ms: 480, intensity: 0.022 }
    } as Record<1 | 2 | 3 | 4, { ms: number; intensity: number }>,

    /** Max single hitstop (safety clamp). */
    maxHitstopMs: 250,

    input: {
        /** Gamepad stick threshold for digital directions. */
        stickDeadzone: 0.45,
        /** Default duration of a programmatic press. */
        pressMs: 90
    },

    projectiles: {
        max: 512,
        /** Sub-step length so fast shots can't tunnel through 16 px tiles or thin hurtboxes. */
        substepPx: 6,
        /** Kill projectiles this far outside the camera view. */
        offscreenMargin: 48,
        defaultLifetimeMs: 2000,
        defaultRadius: 2
    },

    oneWay: {
        /** How long down+jump ignores one-way platforms. */
        dropMs: 260
    },

    run: {
        startLives: 3,
        startBombs: 10,
        maxBombs: 30,
        startWeapon: 'pistol',
        respawnDelayMs: 1200,
        powScore: 100,
        stageClearDelayMs: 3500
    },

    /** Placeholder (dev sandbox) player tuning, mirrors GDD §4 starting values. */
    dev: {
        runSpeed: 105,
        accelTime: 0.06,
        jumpVelocity: 330,
        jumpCutFactor: 0.45,
        coyoteMs: 90,
        bufferMs: 120,
        bulletSpeed: 420,
        fireCooldownMs: 140
    }
};

export type EngineTuning = typeof ENGINE;
