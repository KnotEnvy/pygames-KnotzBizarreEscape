// FX-owned budgets, in world pixels and milliseconds at 384 × 216.
export const FX = {
    caps: { explosion: 12, muzzle: 8, impact: 16, dust: 12, smoke: 16, combat: 160, ambient: 64, casing: 32, decal: 16, glow: 8 },
    readability: { smokeAlpha: 0.28, coverage: 0.16, cloudCoverage: 0.08 },
    popup: { enabled: true, cap: 12, life: 700 }, // UI may set scene.registry 'fx.popups' = false.
    bloom: { enabled: true, threshold: 0.82, strength: 0.10, hotMs: 220 },
    crt: { scanline: 0.06, vignette: 0.16, barrel: 0.006 },
    feel: { kill: 32, meleeKill: 48, machineKill: 55, death: 75, phase: 65, flashGate: 600, shakeGate: 75, stopGate: 160 },
    explosion: {
        s: { smoke: 1, debris: 3, embers: 4, delay: 180, ring: 0, scorch: 0, shake: 1, stop: 0, glow: 0.8 },
        m: { smoke: 2, debris: 6, embers: 8, delay: 220, ring: 0.55, scorch: 0.5, shake: 2, stop: 45, glow: 1.4 },
        l: { smoke: 3, debris: 10, embers: 14, delay: 260, ring: 1, scorch: 0.85, shake: 3, stop: 65, glow: 2.2 },
        xl: { smoke: 4, debris: 16, embers: 24, delay: 320, ring: 1.35, scorch: 1.2, shake: 4, stop: 100, glow: 3.3 }
    },
    ambientRate: { snow: 6, embers: 3, fireflies: 1, steam: 1.2 },
    casing: { gravity: 350, life: 650, interval: 1000 / 14 },
    decalMs: 8000,
    impactsPerFrame: 16,
    cullMargin: 128
} as const;
