// Depth (z-order) bands. Use these constants; offset within a band for fine ordering (e.g. DEPTH.ENEMIES + 1).
export const DEPTH = {
    BG_FAR: 0, // 0..9 parallax
    BG_NEAR: 10, // 10..19
    TILES_BACK: 20,
    DECALS: 25,
    PROPS: 30,
    ENEMIES: 40,
    POW: 45,
    PLAYER: 50,
    PROJECTILES: 60,
    FX: 70,
    TILES_FRONT: 80,
    FX_TOP: 90,
    /** Engine debug overlay (above everything in the Game scene; HUD lives in its own scene). */
    DEBUG: 1000
} as const;

export type DepthBand = keyof typeof DEPTH;
