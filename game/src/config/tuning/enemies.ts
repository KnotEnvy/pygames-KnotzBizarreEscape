/** World pixels / seconds; anticipation and cooldowns are scaled milliseconds. */
export const ENEMIES = {
    grunt: { hp: 3, score: 100, speed: 28, sight: 160, windup: 420, cooldown: 1250 },
    grenadier: { hp: 4, score: 150, speed: 24, sight: 180, windup: 400, cooldown: 2500 },
    shield: { hp: 6, score: 200, speed: 18, sight: 160, windup: 420, cooldown: 1700 },
    turret: { hp: 12, score: 300, speed: 0, sight: 192, windup: 580, cooldown: 1600 },
    drone: { hp: 2, score: 150, speed: 44, sight: 144, windup: 320, cooldown: 1800 },
    paratrooper: { hp: 3, score: 150, speed: 28, sight: 160, windup: 420, cooldown: 1250 },
    leaper: { hp: 3, score: 150, speed: 28, sight: 170, windup: 420, cooldown: 1250 },
    hound: { hp: 2, score: 100, speed: 84, sight: 220, windup: 450, cooldown: 900 },
    buzzard: { hp: 40, score: 750, speed: 48, sight: 384, windup: 700, cooldown: 2400 },
    boss: { hp: 400, score: 5000, antlerHp: 45, antlerScore: 500, recovery: 700, deathMs: 3000 },
    bulletSpeed: 110, activationMargin: 32, corpseMs: 1400, maxEnemies: 24,
    /** In a camera-locked arena enemies turn back this far inside the screen edges (off-view enemies freeze). */
    lockedViewInset: 10
} as const;
export type EnemyKind = Exclude<keyof typeof ENEMIES, 'boss' | 'bulletSpeed' | 'activationMargin' | 'corpseMs' | 'maxEnemies' | 'lockedViewInset'>;

export const MIDBOSSES = {
    snowcat: { hp: 150, score: 2500, chargeCue: 700, mortarCue: 650, mgCue: 650, deathMs: 3400 },
    ironhorn: { hp: 220, score: 3500, cannonCue: 650, cinderCue: 700, throwCue: 600, deathMs: 3800 }
} as const;
