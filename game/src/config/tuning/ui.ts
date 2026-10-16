// UI, HUD and audio tuning (owned by the UI/audio team). Times in ms, positions in 384×216 screen px.
export const UI = {
    screen: { w: 384, h: 216 },

    fonts: {
        hud: 'font_hud', gold: 'font_hud_gold', plain: 'font_hud_plain',
        fire: 'font_callout_fire', sand: 'font_callout_sand', steel: 'font_callout_steel', white: 'font_callout_white',
        hudSize: 7, calloutSize: 17
    },

    colors: {
        outline: 0x1a1220, dim: 0x08060c, white: 0xffffff,
        fire5: 0xffe066, fire4: 0xffae22, sand5: 0xf0e0a8, sand4: 0xd2b878, sand3: 0xa88c52,
        red4: 0xd4483a, red5: 0xf07a5a, ink3: 0x6e6680, ink5: 0xc9c3d1, olive5: 0xa2b85a, steel4: 0x75899c, sky5: 0xa8d4f0,
        popupScore: 0xffe066, popupAlert: 0xffe478
    },

    transition: { wipeMs: 320, fadeMs: 260 },

    hud: {
        scoreDigits: 8,
        /** Score display catches up with the real score at this fraction of the gap per 16 ms frame. */
        tallyRate: 0.22,
        lowAmmo: 10,
        callout: { y: 74, dropMs: 220, flashFrames: 4, holdMs: 1300, outMs: 220 },
        go: { x: 384 - 68, y: 88, showMs: 2200 },
        bossBar: { x: 90, y: 198, hiddenY: 232, slideMs: 420, ghostLagMs: 220, fillW: 198, fillH: 6 },
        popup: { life: 820, rise: 22, cap: 12 },
        prompt: { y: 200, hiddenY: 236, defaultMs: 3500, slideMs: 220 },
        multiKill: { windowMs: 700, bonusPerExtra: 50 },
        clearFadeAtMs: 2800
    },

    intro: { durationMs: 1800, slamAt: 260, outAt: 1480, duck: 0.4 },

    title: { logoDropMs: 700, glitchMinMs: 4000, glitchMaxMs: 7000, attractIdleMs: 12000, blinkOnMs: 520, blinkOffMs: 380 },

    pause: { dim: 0.55, musicDuck: 0.4 },

    continue: { seconds: 9, dim: 0.6, musicDelayMs: 900, gameOverHoldMs: 3200 },

    results: {
        rowStartMs: 700, rowGapMs: 520, countMs: 560, tallyTickMs: 30, stampDelayMs: 500, autoAdvanceMs: 22000,
        powBonus: 1000,
        /** Stage 1 has five POWs; the engine doesn't report the total, so we assume it per stage. */
        powTotal: { 1: 5 } as Record<number, number>,
        /** Rank points: accuracy 0..40, rescues 0..40, deaths 0..20. */
        rank: { s: 84, a: 64, b: 42 }
    },

    audio: {
        /** Positional panning: pan = clamp(dx / panRange, -1, 1) × panMax. Falloff: full within `near`, `farGain` at `far`, silent past `cutoff`. */
        pan: { range: 192, max: 0.6, near: 160, far: 576, farGain: 0.3, cutoff: 700 },
        vary: { detuneCents: 60, volume: 0.1 },
        defaultVoices: 4,
        musicFadeMs: 600,
        duckRecoverMs: 450,
        completeJingleDelayMs: 1100,
        flameLoopHoldMs: 450,
        rocketWhooshMs: 1400,
        recentKeys: 24
    }
} as const;

export type UiTuning = typeof UI;
