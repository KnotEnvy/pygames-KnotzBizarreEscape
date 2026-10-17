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

    intro: {
        durationMs: 2000, slamAt: 260, outAt: 1650, duck: 0.4,
        /** Phase E: one short, fun line of the escape premise under the mission name (per mission). */
        taglines: { 1: 'BREAK OUT. CATCH THE TRAIN. HEAD SOUTH.' } as Record<number, string>
    },

    /** Phase E: HUD title card on part:start ("MISSION 1 · PART II" / title / location), non-blocking. */
    titleCard: {
        /** Delay after part:start; when the Intro plays first, the card waits for it. */
        delayMs: 350, afterIntroMs: 2050,
        missionY: 42, titleY: 62, locationY: 82,
        /** Mission line slide, title slam offset, location fade, then how long everything holds. */
        lineMs: 260, titleAt: 240, locationAt: 520, holdMs: 2600, outMs: 220
    },

    /** Phase E: Hazel's radio box (bottom-left, under the HUD, over gameplay). */
    radio: {
        x: 8, y: 146, w: 240, h: 42, hiddenDy: 60, openMs: 240, closeMs: 180,
        /** Opens this long after the title card starts. */
        delayMs: 900,
        /** Typewriter speed and how long a fully typed page stays before the next one / the box closes. */
        charMs: 26, pageHoldMs: 1700, lastPageHoldMs: 2400,
        /** Text area: characters per row and rows per page (longer briefing lines paginate). */
        lineChars: 33, maxLines: 2,
        /** Static flicker when the box opens and between pages. */
        staticMs: 420, staticPixels: 14
    },

    /** Phase E: PART CLEAR tally + escape-route map between parts. */
    partClear: {
        rowStartMs: 650, rowGapMs: 420, countMs: 520, tallyTickMs: 30,
        /** After the tally: the marker leaves for the next part, then PRESS START; auto-advance after `autoAdvanceMs`. */
        travelDelayMs: 450, travelMs: 1500, autoAdvanceMs: 8000,
        /** Map image placement (ui_map_m1 is 160×72) and the marker anchors (bottom-centre of the pictogram, map px). */
        map: { x: 207, y: 54, w: 160, h: 72 },
        anchors: { 1: { x: 25, y: 41 }, 2: { x: 86, y: 37 }, 3: { x: 141, y: 36 } } as Record<number, { x: number; y: number }>,
        /** Route polyline (map px) the marker travels along; it matches the railway drawn in art-src/ui/campaign.lua. */
        route: [[25, 44], [38, 47], [50, 44], [62, 40], [74, 36], [86, 34], [98, 36], [108, 40], [116, 44], [124, 46], [134, 42], [141, 38]] as ReadonlyArray<readonly [number, number]>,
        /** Where each part's marker sits on the polyline (index into `route`). */
        routeIndex: { 1: 0, 2: 5, 3: 11 } as Record<number, number>,
        dotEvery: 2
    },

    /** Phase E: Title → PART SELECT panel. */
    partSelect: { x: 40, y: 46, w: 304, h: 128, rowHeight: 15, valueX: 318 },

    title: { logoDropMs: 700, glitchMinMs: 4000, glitchMaxMs: 7000, attractIdleMs: 12000, blinkOnMs: 520, blinkOffMs: 380, menuRowHeight: 12 },

    pause: { dim: 0.55, musicDuck: 0.4 },

    continue: { seconds: 9, dim: 0.6, musicDelayMs: 900, gameOverHoldMs: 3200 },

    results: {
        rowStartMs: 700, rowGapMs: 520, countMs: 560, tallyTickMs: 30, stampDelayMs: 500, autoAdvanceMs: 22000,
        powBonus: 1000,
        /** Stage 1 has five POWs; the engine doesn't report the total, so we assume it per stage. */
        powTotal: { 1: 5 } as Record<number, number>,
        /** Phase E: POWs per part when the level didn't report `powTotal` for that part (mission total = sum). */
        powTotalByPart: { '1-1': 5, '1-2': 4, '1-3': 3 } as Record<string, number>,
        /** Per-part breakdown rows appear one by one after the totals. */
        partRowMs: 260,
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
        recentKeys: 24,
        /**
         * Master safety limiter (a DynamicsCompressor after Phaser's master gain). Music alone peaks at about
         * −5.8 dBFS (file −2.7 + bus 0.7), so it never touches the threshold; it only catches coincident SFX peaks
         * (an explosion over a cannon shot over the music) that would otherwise hard-clip at the destination.
         */
        limiter: { thresholdDb: -3, kneeDb: 3, ratio: 20, attackS: 0.002, releaseS: 0.12 },
        /** Mix meter (`__KBE.state().audio.mix`): peak-hold window for the busiest moment. */
        mixHoldMs: 1500,
        /** Phase E ambience the Audio layer runs by part id (loop key → volume). Voice-limited to 1, so Levels may call them too. */
        ambience: { '1-2': { train_clack: 0.9, wind: 0.6 }, '1-3': { wind: 0.85 } } as Record<string, Record<string, number>>
    }
} as const;

export type UiTuning = typeof UI;
