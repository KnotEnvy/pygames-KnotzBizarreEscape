/** GATORGEDDON clocks use scaled milliseconds; every damaging release has a full cue. */
export const GATORGEDDON = {
    hp: 450, podHp: 50, score: 6000,
    phase2: 300, phase3: 150,
    introMs: 1500, spawnGraceMs: 1100, recoveryMs: 850, deathMs: 4200,
    wallGap: 48, viewInset: 8,
    lungeCue: 800, fastLungeCue: 700, lungeDistance: 160, lungeMs: 600,
    missileCue: 750, missileSpacing: 180, missileFlight: 950, missileRadius: 17,
    tailCue: 700, gatlingCue: 750, gatlingSpacing: 110,
    diveMs: 600, wakeMs: 900, ambushCue: 700, burstMs: 800, climbMs: 850,
    rollCue: 750, slamCue: 800, gasCue: 900,
} as const;
