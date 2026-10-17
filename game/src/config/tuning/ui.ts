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
        clearFadeAtMs: 2800,
        /** Phase F juice: the score counter bumps while it rolls and blinks white when it locks in. */
        scoreRoll: { bumpPx: 1, lockFlashMs: 70 },
        /** Low-ammo blink period (ms per half-cycle) and the soft click on each "on" phase. */
        lowAmmoBlinkMs: 250, lowAmmoClick: 'ammo_click',
        /** Weapon icon pop on a weapon change: drop from above with a bounce, white flash for the first frames. */
        iconPop: { fromDy: -7, ms: 420, flashMs: 70 },
        /** Multi-kill callouts: chain length → word; one callout per `minGapMs`, only when the tier rises within a chain. */
        combo: {
            tiers: [[2, 'NICE!'], [3, 'GREAT!'], [5, 'EXCELLENT!']] as ReadonlyArray<readonly [number, string]>,
            minGapMs: 1400, holdMs: 620, y: 128, sfx: 'combo_sting', detunePerTier: 250
        },
        /** POW rescue flourish: "THANK YOU!" popup over the POW, the new face icon drops into the tally with a bounce. */
        powThanks: { text: 'THANK YOU!', riseY: 30, iconFromDy: -9, iconMs: 480 }
    },

    /**
     * Phase F: Metal Slug-style WARNING banner on boss:intro. A dark strip with hazard stripes sweeping along its top
     * and bottom edges, "WARNING!" in the middle and the boss name revealed under it. Sits between the HUD's top rows
     * (y ≤ 30) and the boss bar (y 198), clear of the engine's 14 px letterbox bars; it never blocks input.
     */
    warning: {
        y: 92, h: 40, stripeH: 6, stripeW: 12, panelAlpha: 0.72,
        /** Stripe sweep speed (px/s; the two edges run opposite ways) and the red/black strobe half-period. */
        sweepPxPerS: 90, strobeMs: 110,
        textY: 106, nameY: 123,
        /** Timeline (ms): text slam, name reveal, hold end, fade-out length. */
        inMs: 160, nameAt: 650, outAt: 1900, outMs: 300,
        sfx: 'warning_siren'
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

    /** Phase E: Hazel's radio box: a slim one-row strip in the sky band under the HUD's lives/RESCUED row (y 30..55), clear of the walking lane. */
    radio: {
        x: 8, y: 30, w: 368, h: 25, hiddenDy: -12, openMs: 240, closeMs: 180,
        /** Icon / speaker label / text columns inside the strip (the 24×24 radio art is drawn at frame x 3..22). */
        iconX: -1, iconY: 1, labelX: 26, labelY: 8, textX: 66, textY: 9,
        /** Opens this long after the title card starts: as the card's title leaves (titleAt + holdMs = 2840), so it never stacks with it. */
        delayMs: 2650,
        /** Typewriter speed and how long a fully typed page stays before the next one / the box closes. */
        charMs: 26, pageHoldMs: 1700, lastPageHoldMs: 2400,
        /** Text area: characters per row and rows per page (one row at a time; longer briefing lines paginate). */
        lineChars: 49, maxLines: 1,
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
        dotEvery: 2,
        /** Below the map: NEXT title / location, a rule, then Hazel's one-liner about the next part (≤ 2 rows × `teaserChars`). */
        nextY: 132, teaserY: 157, teaserChars: 25,
        teaser: {
            '1-2': 'Heads down on the deck. Low bridges ahead.',
            '1-3': "Cross the lake fast. The ice won't hold."
        } as Record<string, string>
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
        ambience: { '1-2': { train_clack: 0.9, wind: 0.6 }, '1-3': { wind: 0.85 } } as Record<string, Record<string, number>>,
        /**
         * Phase F: section ambient beds (seamless `amb_*` loops under the music), by part id and camera-centre x
         * (sorted; the last entry whose `x` ≤ camera x wins). Cross-faded over `bedFadeMs`; ducked to `bedArenaGain`
         * while an arena is live. Part II's bed is the Phase E `train_clack` + `wind` pair above (no extra loop).
         */
        sections: {
            '1-1': [
                { x: 0, bed: 'amb_camp', volume: 0.8 },
                { x: 960, bed: 'amb_forest', volume: 0.85 },
                { x: 2720, bed: 'amb_river', volume: 0.9 },
                { x: 4000, bed: 'amb_outpost', volume: 0.8 },
                { x: 5760, bed: 'amb_outpost', volume: 0.55 }
            ],
            '1-2': [],
            '1-3': [
                { x: 0, bed: 'amb_lake', volume: 0.85 },
                { x: 2416, bed: 'amb_lab', volume: 0.85 }
            ]
        } as Record<string, ReadonlyArray<{ x: number; bed: string | null; volume?: number }>>,
        bedFadeMs: 1800, bedArenaGain: 0.5, bedPollMs: 250,
        /**
         * Phase F: background moments (`bg:event { id, x? }`) → distant sound. Levels chooses the ids; this table maps
         * them (plus likely synonyms) to the `bg_*` keys, so a mismatch is a one-line fix. Unlisted ids that are catalog
         * keys/aliases play as themselves; anything else lands in `__KBE.state().audio.bgUnknown`.
         * Panned by x (no distance falloff: these are far away by definition).
         */
        bgEvents: {
            // Levels' background director ids (src/level/background.ts SHOTS/ZONES) come first; synonyms follow.
            camp_searchlights: { key: 'bg_searchlight' }, tower_lights: { key: 'bg_siren' }, zeppelin: { key: 'bg_zeppelin' }, crows: { key: 'bg_crows' },
            waterfall: { key: 'bg_waterfall' }, plane: { key: 'bg_plane' }, flak: { key: 'bg_flak' }, explosion: { key: 'bg_artillery' }, snowcat_roar: { key: 'bg_engine' },
            ironhorn_plume: { key: 'bg_loco' }, buzzard_circle: { key: 'bg_buzzard' }, armored_train: { key: 'bg_train_pass' }, gorge: { key: 'bg_gorge' },
            avalanche: { key: 'bg_avalanche' }, aurora: { key: 'bg_aurora' }, tesla: { key: 'bg_tesla' }, towers: { key: 'bg_searchlight' }, ice_fissure: { key: 'bg_fissure' },
            moosezilla_roar: { key: 'bg_roar' }, moosezilla: { key: 'bg_stomp' },
            /** Ambience zones that are visual only (key '' = known, silent). */
            tunnel: { key: '' }, phaser: { key: '' },
            // Part I, "The Camp"
            searchlight: { key: 'bg_searchlight' }, searchlights: { key: 'bg_searchlight' }, camp_searchlight: { key: 'bg_searchlight' },
            lab_searchlight: { key: 'bg_searchlight' }, searchlight_sweep: { key: 'bg_searchlight' },
            watchtower: { key: 'bg_siren' }, watchtower_lights: { key: 'bg_siren' }, far_siren: { key: 'bg_siren' }, siren: { key: 'bg_siren' },
            airship: { key: 'bg_zeppelin' }, blimp: { key: 'bg_zeppelin' },
            birds: { key: 'bg_crows' }, bg_birds: { key: 'bg_crows' }, crow_burst: { key: 'bg_crows' },
            mist: { key: 'bg_waterfall' }, bg_mist: { key: 'bg_waterfall' },
            transport: { key: 'bg_plane' }, transport_plane: { key: 'bg_plane' }, flyover: { key: 'bg_plane' }, paradrop: { key: 'bg_plane' },
            artillery: { key: 'bg_artillery' }, barrage: { key: 'bg_artillery' }, bg_explosion: { key: 'bg_artillery' }, far_explosion: { key: 'bg_artillery' },
            bg_flak: { key: 'bg_flak' },
            snowcat_engine: { key: 'bg_engine' }, engine_roar: { key: 'bg_engine' }, gate_engine: { key: 'bg_engine' }, yard_engine: { key: 'bg_engine' },
            snowcat_yard: { key: 'bg_engine' }, yard_smoke: { key: 'bg_engine' }, gate_smoke: { key: 'bg_engine' },
            // Part II, "Timber Express"
            smoke_plume: { key: 'bg_loco' }, plume: { key: 'bg_loco' }, bg_smoke_plume: { key: 'bg_loco' }, ironhorn_smoke: { key: 'bg_loco' },
            buzzard: { key: 'bg_buzzard' }, buzzard_far: { key: 'bg_buzzard' }, heli_far: { key: 'bg_buzzard' },
            parallel_train: { key: 'bg_train_pass' }, train_pass: { key: 'bg_train_pass' }, train_passby: { key: 'bg_train_pass' },
            enemy_train: { key: 'bg_train_pass' }, roar_by: { key: 'bg_train_pass' },
            trestle: { key: 'bg_gorge' }, valley: { key: 'bg_gorge' },
            bg_avalanche: { key: 'bg_avalanche' },
            // Part III, "Moose Lake"
            aurora_shimmer: { key: 'bg_aurora' },
            tesla_coil: { key: 'bg_tesla' }, tesla_arc: { key: 'bg_tesla' }, arc: { key: 'bg_tesla' },
            lightning: { key: 'bg_tesla' }, bg_lightning: { key: 'bg_tesla' },
            fissure: { key: 'bg_fissure' }, ice_boom: { key: 'bg_fissure' },
            moosezilla_silhouette: { key: 'bg_roar' }, silhouette: { key: 'bg_roar' }, moose_roar: { key: 'bg_roar' },
            roar: { key: 'bg_roar' }, boss_silhouette: { key: 'bg_roar' },

        } as Record<string, { key: string; volume?: number; detune?: number }>,
        /** Background pan: pan = clamp(dx / bgPanRange) × bgPanMax (gentler than gameplay sounds). */
        bgPanRange: 384, bgPanMax: 0.45,
        /** Phase F: weapon layers played under the weapon's own shot (`player:shoot`), positional. */
        weaponLayers: {
            hmg: { key: 'hmg_punch', volume: 1 },
            laser: { key: 'laser_tail', volume: 1 },
            rocket: { key: 'rocket_punch', volume: 1 },
            flame: { key: 'flame_crackle', volume: 1 }
        } as Record<string, { key: string; volume: number }>,
        /** WARNING siren duck (music gain, hold, recover). */
        warningDuck: { gain: 0.45, holdMs: 1900, recoverMs: 700 }
    }
} as const;

export type UiTuning = typeof UI;
