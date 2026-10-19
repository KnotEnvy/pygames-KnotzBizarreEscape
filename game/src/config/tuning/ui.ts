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
        /**
         * Level prompts (DUCK!, WAVE 2/3, trigger hints) rest at `y` over the lower band. While a boss bar is up they move to
         * `bossY`, the row just above the boss name (name y 188..195, frame from 198), so a cue never covers the HP fill (KBE-QA-G05).
         */
        prompt: { y: 200, bossY: 178, hiddenY: 236, defaultMs: 3500, slideMs: 220 },
        multiKill: { windowMs: 700, bonusPerExtra: 50 },
        clearFadeAtMs: 2800,
        /** Phase F juice: the score counter bumps while it rolls and blinks white when it locks in. */
        scoreRoll: { bumpPx: 1, lockFlashMs: 70 },
        /** Low-ammo blink period (ms per half-cycle) and the soft click on each "on" phase. */
        lowAmmoBlinkMs: 250, lowAmmoClick: 'ammo_click',
        /** Weapon icon pop on a weapon change: drop from above with a bounce, white flash for the first frames. */
        iconPop: { fromDy: -7, ms: 420, flashMs: 70 },
        /**
         * Multi-kill callouts: chain length → word; one callout per `minGapMs`, only when the tier rises within a chain.
         * `y` 66 sits in the upper third under the radio strip (y 30..55), above the walking lane and clear of the WARNING band (92..132).
         */
        combo: {
            tiers: [[2, 'NICE!'], [3, 'GREAT!'], [5, 'EXCELLENT!']] as ReadonlyArray<readonly [number, string]>,
            minGapMs: 1400, holdMs: 620, y: 66, sfx: 'combo_sting', detunePerTier: 250
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
        sfx: 'warning_siren',
        /**
         * Phase G: the main-boss variant (names matching catalog MAJOR_BOSS, i.e. GATORGEDDON and MOOSEZILLA): a taller band that
         * grows out from the centre, a slower, heavier strobe, the name in the big fire font, a longer hold, and `warning_major`
         * (deep klaxon + heartbeat) layered under the siren by the audio wiring.
         */
        major: { y: 84, h: 56, growMs: 220, strobeMs: 170, nameFont: 'fire' as 'fire' | 'hud', textY: 101, nameY: 124, nameAt: 800, outAt: 2800, outMs: 360, sfx: 'warning_major' }
    },

    intro: {
        durationMs: 2000, slamAt: 260, outAt: 1650, duck: 0.4,
        /** Phase E: one short, fun line of the escape premise under the mission name (per mission). */
        taglines: { 1: 'BREAK OUT. CATCH THE TRAIN. HEAD SOUTH.', 2: 'THE MECHS ARE LOOSE. HUNT THEM DOWN.' } as Record<number, string>
    },

    /** Phase G: one-line tips per part (PART SELECT info row; the Results mission break uses the next part's). */
    tips: {
        '1-1': 'GET PAST THE CAMP. THE TRAIN LEAVES TONIGHT.',
        '1-2': 'HEADS DOWN ON THE DECK. LOW BRIDGES AHEAD.',
        '1-3': "CROSS THE LAKE FAST. THE ICE WON'T HOLD.",
        '2-1': 'WADING SLOWS YOU. LOGS SINK, KEEP MOVING.',
        '2-2': 'DUCK THE BRANCHES. MIND THE GAPS BETWEEN BARGES.',
        '2-3': 'STAY OFF THE MARKS. IT STRIKES FROM BELOW.'
    } as Record<string, string>,

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
        /** Map image placement (the route maps are 160×72). */
        map: { x: 207, y: 54, w: 160, h: 72 },
        /**
         * Phase G: one route map per mission (art-src/ui/campaign.lua): the image key, the pictogram per part, the marker anchors
         * (bottom-centre of the pictogram, map px), the polyline the Knotz marker travels along and each part's index on it.
         */
        maps: {
            1: {
                key: 'ui_map_m1', pictograms: { 1: 'map_camp', 2: 'map_train', 3: 'map_lake' },
                anchors: { 1: { x: 25, y: 41 }, 2: { x: 86, y: 37 }, 3: { x: 141, y: 36 } },
                route: [[25, 44], [38, 47], [50, 44], [62, 40], [74, 36], [86, 34], [98, 36], [108, 40], [116, 44], [124, 46], [134, 42], [141, 38]],
                routeIndex: { 1: 0, 2: 5, 3: 11 }
            },
            2: {
                key: 'ui_map_m2', pictograms: { 1: 'map_bayou', 2: 'map_boat', 3: 'map_mill' },
                anchors: { 1: { x: 28, y: 22 }, 2: { x: 84, y: 41 }, 3: { x: 136, y: 58 } },
                route: [[28, 25], [38, 30], [50, 34], [62, 39], [72, 42], [84, 44], [96, 47], [106, 51], [116, 54], [126, 58], [136, 61]],
                routeIndex: { 1: 0, 2: 5, 3: 10 }
            }
        } as Record<number, { key: string; pictograms: Record<number, string>; anchors: Record<number, { x: number; y: number }>; route: ReadonlyArray<readonly [number, number]>; routeIndex: Record<number, number> }>,
        dotEvery: 2,
        /** Phase G: the quiet loop under the map, by mission (Mission 1 wind, Mission 2 swamp). */
        bed: { 1: 'wind', 2: 'amb_swamp' } as Record<number, string>,
        /** Below the map: NEXT title / location, a rule, then Hazel's one-liner about the next part (≤ 2 rows × `teaserChars`). */
        nextY: 132, teaserY: 157, teaserChars: 25,
        teaser: {
            '1-2': 'Heads down on the deck. Low bridges ahead.',
            '1-3': "Cross the lake fast. The ice won't hold.",
            '2-1': 'The trail runs south into the bayou. Hunt them.',
            '2-2': 'Board the riverboat. Mind the gaps.',
            '2-3': 'It nests under the old mill. Put it down.'
        } as Record<string, string>
    },

    /** Phase E/G: Title → PART SELECT panel: parts grouped by mission (a header row per mission, `missionGap` px above it). */
    partSelect: { x: 40, y: 32, w: 304, h: 160, rowHeight: 13, missionGap: 14, valueX: 318 },

    title: { logoDropMs: 700, glitchMinMs: 4000, glitchMaxMs: 7000, attractIdleMs: 12000, blinkOnMs: 520, blinkOffMs: 380, menuRowHeight: 12 },

    pause: { dim: 0.55, musicDuck: 0.4 },

    continue: { seconds: 9, dim: 0.6, musicDelayMs: 900, gameOverHoldMs: 3200 },

    results: {
        rowStartMs: 700, rowGapMs: 520, countMs: 560, tallyTickMs: 30, stampDelayMs: 500, autoAdvanceMs: 22000,
        powBonus: 1000,
        /** Stage 1 has five POWs; the engine doesn't report the total, so we assume it per stage. */
        powTotal: { 1: 5 } as Record<number, number>,
        /** Phase E: POWs per part when the level didn't report `powTotal` for that part (mission total = sum). */
        powTotalByPart: { '1-1': 5, '1-2': 4, '1-3': 3, '2-1': 4, '2-2': 4, '2-3': 4 } as Record<string, number>,
        /**
         * Phase G: mission chaining. With `next` in the Results data the confirm reads CONTINUE TO MISSION n; the mission break
         * (black, the next mission's route map and name, Hazel's teaser, a radio blip) holds `breakMs` before Game starts.
         */
        continueText: 'CONTINUE TO MISSION', quitText: 'QUIT TO TITLE', breakMs: 3200, breakFadeMs: 500,
        /** Idle auto-continue is visible: the CONTINUE row carries a seconds countdown (`autoAdvanceMs`), shown once it is at or below this. */
        countdownFromS: 20,
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
            ],
            // Phase G (docs/MISSION2.md sections). Levels' fx:ambience kinds override these while on; they are the fallback.
            '2-1': [
                { x: 0, bed: 'amb_swamp', volume: 0.9 },
                { x: 2300, bed: 'amb_swamp', volume: 0.6 },
                { x: 3900, bed: 'amb_rain', volume: 0.8 },
                { x: 5400, bed: 'amb_swamp', volume: 0.85 }
            ],
            '2-2': [
                { x: 0, bed: 'amb_riverboat', volume: 0.9 }
            ],
            '2-3': [
                { x: 0, bed: 'amb_storm', volume: 0.9 },
                { x: 3800, bed: 'amb_storm', volume: 0.6 }
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
            lab_searchlights: { key: 'bg_searchlight' }, lab_tesla: { key: 'bg_tesla' },
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
            bg_lightning: { key: 'bg_tesla' },
            fissure: { key: 'bg_fissure' }, ice_boom: { key: 'bg_fissure' },
            moosezilla_silhouette: { key: 'bg_roar' }, silhouette: { key: 'bg_roar' }, moose_roar: { key: 'bg_roar' },
            roar: { key: 'bg_roar' }, boss_silhouette: { key: 'bg_roar' },
            // Phase G, Mission 2 (docs/MISSION2.md § Background moments; Levels' final ids first, synonyms after)
            // 2-1 CYPRESS DEEP
            fireflies_swarm: { key: '' }, fireflies: { key: '' }, firefly_swarm: { key: '' },
            herons: { key: 'bg_herons' }, heron: { key: 'bg_herons' }, egrets: { key: 'bg_herons' }, birds_marsh: { key: 'bg_herons' },
            patrol_boat: { key: 'bg_patrol_boat' }, patrolboat: { key: 'bg_patrol_boat' }, boat_patrol: { key: 'bg_patrol_boat' }, searchlight_boat: { key: 'bg_patrol_boat' },
            wisps: { key: 'bg_wisps' }, wisp: { key: 'bg_wisps' }, swamp_gas: { key: 'bg_wisps' }, gas_flames: { key: 'bg_wisps' },
            gator_glimpse: { key: 'bg_gator_roar', volume: 0.7 }, gator_silhouette: { key: 'bg_gator_roar', volume: 0.7 }, gatorgeddon_glimpse: { key: 'bg_gator_roar', volume: 0.7 },
            pond_wake: { key: 'bg_pond_wake' }, wake: { key: 'bg_pond_wake' }, turtle_wake: { key: 'bg_pond_wake' }, shellshock_wake: { key: 'bg_pond_wake' },
            pond_shell: { key: 'bg_pond_shell' }, shell_splash: { key: 'bg_pond_shell' }, shellshock_glimpse: { key: 'bg_pond_shell' }, turtle_shell: { key: 'bg_pond_shell' },
            // 2-2 RIVER RUN
            riverbank: { key: '' }, river_bank: { key: '' }, bank: { key: '' },
            gator_pod: { key: 'bg_gator_pod' }, gators: { key: 'bg_gator_pod' }, pod: { key: 'bg_gator_pod' },
            burning_barge: { key: 'bg_burning_barge' }, barge_fire: { key: 'bg_burning_barge' }, wreck_drift: { key: 'bg_burning_barge' },
            barge_blast: { key: 'bg_barge_blast' }, barge_explosion: { key: 'bg_barge_blast' }, barge_explode: { key: 'bg_barge_blast' }, barge_boom: { key: 'bg_barge_blast' },
            skeeter_swarm: { key: 'bg_skeeter_swarm' }, swarm: { key: 'bg_skeeter_swarm' }, mosquito_swarm: { key: 'bg_skeeter_swarm' }, skeeter_cloud: { key: 'bg_skeeter_swarm' },
            storm_front: { key: 'bg_thunder' }, storm: { key: 'bg_thunder' }, rain_start: { key: 'bg_thunder', volume: 0.7 },
            airboat_race: { key: 'bg_airboat_race' }, airboats: { key: 'bg_airboat_race' }, airboat_far: { key: 'bg_airboat_race' },
            // 2-3 GATOR'S DEN
            lightning: { key: 'bg_thunder' }, lightning_flash: { key: 'bg_thunder' }, thunder: { key: 'bg_thunder' }, bg_thunder: { key: 'bg_thunder' },
            mill_wheel: { key: 'bg_mill_creak' }, mill: { key: 'bg_mill_creak' }, waterwheel: { key: 'bg_mill_creak' },
            den_glow: { key: 'bg_den_glow' }, den: { key: 'bg_den_glow' }, reactor_glow: { key: 'bg_den_glow' },
            gator_wake: { key: 'bg_gator_wake' }, gatorgeddon_wake: { key: 'bg_gator_wake' }, gator_surge: { key: 'bg_gator_wake' }, den_wake: { key: 'bg_gator_wake' },
            gator_roar: { key: 'bg_gator_roar_huge' }, gatorgeddon_roar: { key: 'bg_gator_roar_huge' }, den_roar: { key: 'bg_gator_roar_huge' },
            gator_far: { key: 'bg_gator_roar' }, gator_roar_far: { key: 'bg_gator_roar' },
            boat_wreck: { key: 'bg_wreck_collapse' }, wreck: { key: 'bg_wreck_collapse' }, wreck_collapse: { key: 'bg_wreck_collapse' }, queen_wreck: { key: 'bg_wreck_collapse' }
        } as Record<string, { key: string; volume?: number; detune?: number }>,
        /** Background pan: pan = clamp(dx / bgPanRange) × bgPanMax (gentler than gameplay sounds). */
        bgPanRange: 384, bgPanMax: 0.45,
        /**
         * Phase G fix round: thunder follows FX's accepted flashes (`fx:lightning`). The clap is delayed by distance when the flash
         * has an x (`nearMs` at the camera centre, `farMs` at `farPx` away or beyond), else a random delay in that range; its volume is
         * `volume` × strength (reduced flash dims the strength to .14, so the clap is a far rumble). One clap per `gapMs` across every
         * thunder path (the delayed clap, Levels' `bg:event lightning`), so a flash that both report never doubles.
         */
        thunder: { nearMs: 300, farMs: 1200, farPx: 900, volume: 0.9, doubleGapMs: 280, doubleVolume: 0.55, gapMs: 1800 },
        /** Phase F: weapon layers played under the weapon's own shot (`player:shoot`), positional. */
        weaponLayers: {
            hmg: { key: 'hmg_punch', volume: 1 },
            laser: { key: 'laser_tail', volume: 1 },
            rocket: { key: 'rocket_punch', volume: 1 },
            flame: { key: 'flame_crackle', volume: 1 }
        } as Record<string, { key: string; volume: number }>,
        /** WARNING siren duck (music gain, hold, recover); the main-boss variant ducks deeper and longer. */
        warningDuck: { gain: 0.45, holdMs: 1900, recoverMs: 700 },
        warningDuckMajor: { gain: 0.3, holdMs: 2800, recoverMs: 900 },
        /**
         * Phase G: `fx:ambience` kinds → ambient beds (loops under the music). While a kind is on it overrides the part's
         * x-sections; `null` or an unlisted kind (snow, embers, tunnel, blizzard...) hands the choice back to the sections.
         */
        ambienceKinds: {
            swamp: { bed: 'amb_swamp', volume: 0.9 },
            rain: { bed: 'amb_rain', volume: 0.85 },
            storm: { bed: 'amb_storm', volume: 0.9 },
            fog: { bed: 'amb_fog', volume: 1 },
            river: { bed: 'amb_riverboat', volume: 0.9 }
        } as Record<string, { bed: string; volume?: number }>
    }
} as const;

export type UiTuning = typeof UI;
