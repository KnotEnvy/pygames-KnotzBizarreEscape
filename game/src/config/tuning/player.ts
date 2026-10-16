export const PLAYER = {
    run: 105, crouchRun: 35, acceleration: 1750, skidMs: 120, dustMs: 140,
    jump: 318, gravity: 900, jumpCut: 120, coyoteMs: 90, bufferMs: 120,
    standing: { width: 14, height: 32 }, crouching: { width: 16, height: 20 },
    respawnMs: 2000, hurtMs: 1000, knifeRange: 18, knifeDamage: 4,
    knifeWindupMs: 110, knifeMs: 300, throwReleaseMs: 120, throwMs: 320,
    pistolTapMs: 143, pistolHoldMs: 333, bulletSpeed: 420,
    hmgMs: 1000 / 14, sweepMs: 90, spreadMs: 450, rocketMs: 600,
    rocketStart: 90, rocketMax: 260, rocketAcceleration: 380, rocketSeek: 65 * Math.PI / 180,
    flameMs: 480, flameTickMs: 80, flameBurstMs: 400, flameReach: 48,
    grenadeSpeed: 170, grenadeUp: 260, grenadeFuseMs: 1670, grenadeRadius: 28, grenadeDamage: 6,
    ammo: { pistol: Infinity, hmg: 200, spread: 40, rocket: 30, flame: 30 },
    points: { fish: 100, chicken: 500, medal: 1000, ration: 200 },
} as const;
export type Weapon = keyof typeof PLAYER.ammo;
export function isWeapon(value: string): value is Weapon { return Object.hasOwn(PLAYER.ammo, value); }
