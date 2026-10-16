// Engine tuning. Times in ms, speeds in px/s, accelerations in px/s².
export const ENGINE = {
    width: 384,
    height: 216,
    tile: 16,
    gravity: 900,
    /** Longest frame step gameplay ever sees (prevents tunneling after tab switches). */
    maxDeltaMs: 50,

    camera: {
        /** Where the player sits horizontally (0..1 of the view width) when the camera is caught up. */
        anchorX: 0.4,
        /** Where the player's center sits vertically (0..1 of the view height). */
        anchorY: 0.62,
        /** Half-width of the horizontal deadzone around the follow focus (px). */
        deadzoneX: 12,
        /** Half-height of the vertical deadzone (px). */
        deadzoneY: 18,
        /** Look-ahead distance in the facing direction (px). */
        lookAhead: 36,
        /** Exponential follow rates (1/s). Higher = snappier. */
        followRateX: 7,
        followRateY: 4,
        lookAheadRate: 2.5,
        /** Arena lock / unlock transition duration. */
        lockTweenMs: 700,
        /** Never scroll back left (Metal Slug). */
        forwardOnly: true
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
