export const PLAYER = {
    run: 105, crouchRun: 35, acceleration: 1750, skidMs: 120, dustMs: 140,
    iceAcceleration: 420, iceDeceleration: 280, iceBrake: 700, iceSkidMs: 100,
    entranceWalkMs: 280, entranceMinMs: 450, entranceMaxMs: 1050,
    laserMs: 100, laserSpeed: 1000, laserDamage: 1.25, laserLifetimeMs: 430,
    jump: 318, gravity: 900, jumpCut: 120, coyoteMs: 100, bufferMs: 120,
    standing: { width: 12, height: 30 }, crouching: { width: 12, height: 18 },
    respawnMs: 2000, hurtMs: 1000, knifeRange: 18, knifeDamage: 4,
    knifeHitstopMs: 55, knifeWindupMs: 110, knifeMs: 300, throwReleaseMs: 120, throwMs: 320,
    pistolTapMs: 143, pistolHoldMs: 333, bulletSpeed: 420,
    hmgMs: 1000 / 14, sweepMs: 90, spreadMs: 450, rocketMs: 600,
    rocketStart: 90, rocketMax: 260, rocketAcceleration: 380, rocketSeek: 65 * Math.PI / 180,
    flameMs: 480, flameTickMs: 80, flameBurstMs: 400, flameReach: 48,
    grenadeSpeed: 170, grenadeUp: 260, grenadeFuseMs: 1670, grenadeRadius: 28, grenadeDamage: 6,
    ammo: { pistol: Infinity, hmg: 200, spread: 40, rocket: 30, flame: 30, laser: 100 },
    points: { fish: 100, chicken: 500, medal: 1000, ration: 200 },
} as const;
export type Weapon = keyof typeof PLAYER.ammo;
export function isWeapon(value: string): value is Weapon { return Object.hasOwn(PLAYER.ammo, value); }
