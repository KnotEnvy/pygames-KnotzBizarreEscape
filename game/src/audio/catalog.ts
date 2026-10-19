// Audio key catalog: per-key playback rules, the alias table (keys other teams guessed before the catalog
// existed → real asset keys) and the music metadata. The asset keys are the OGG stems in
// public/assets/audio/{sfx,music}/ (see docs/teams/ui-audio.md §3).

export interface SfxMeta {
    /** Volume multiplier on top of the pre-balanced file (default 1). */
    vol?: number;
    /** Random detune range in cents (±). */
    vary?: number;
    /** Max simultaneous voices for the key (the oldest is stolen). */
    max?: number;
    /** Minimum ms between two starts of the key (extra requests are dropped). */
    minMs?: number;
    /** The asset is authored as a seamless loop (a plain sfx() call still plays it once). */
    loop?: boolean;
    /**
     * Rapid-fire fatigue: when a start follows the previous one within `ms`, the volume drops by `step` per
     * consecutive shot down to `floor` (the first shots of a burst keep their punch, a held trigger settles under
     * the music). The counter resets after a gap longer than `ms`.
     */
    burst?: { ms: number; step: number; floor: number };
}

export const SFX_META: Record<string, SfxMeta> = {
    // weapons and explosions
    pistol: { vol: 0.9, vary: 60, max: 3, minMs: 30, burst: { ms: 200, step: 0.05, floor: 0.7 } },
    // 14 shots/s on a held trigger: a 70 ms file at 71 ms spacing is one continuous voice; fatigue it to 0.6× after 7.
    hmg: { vol: 0.7, vary: 60, max: 2, minMs: 40, burst: { ms: 140, step: 0.06, floor: 0.6 } },
    spread: { vol: 1, max: 3, minMs: 40 },
    rocket_launch: { vol: 1, max: 2 },
    rocket_whoosh: { vol: 0.6, loop: true, max: 2 },
    flame_start: { vol: 0.8, max: 2, minMs: 120 },
    flame_loop: { vol: 0.7, loop: true, max: 2 },
    grenade_throw: { vol: 0.8, max: 3, minMs: 40 },
    grenade_bounce: { vol: 0.7, vary: 60, max: 3 },
    explo_s: { vol: 1, vary: 40, max: 4, minMs: 30 },
    explo_m: { vol: 1, vary: 40, max: 2, minMs: 40 },
    explo_l: { vol: 1, vary: 40, max: 2, minMs: 60 },
    explo_xl: { vol: 1, vary: 40, max: 2, minMs: 80 },
    // impacts and melee
    // HMG hits arrive at 14/s too: same fatigue. impact_metal is a 21 dB crest-factor tink (peak −1 dBFS): quieter.
    impact_dirt: { vol: 0.7, vary: 60, max: 3, minMs: 25, burst: { ms: 140, step: 0.08, floor: 0.5 } },
    impact_wood: { vol: 0.7, vary: 60, max: 3, minMs: 25, burst: { ms: 140, step: 0.08, floor: 0.5 } },
    impact_metal: { vol: 0.5, vary: 60, max: 3, minMs: 25, burst: { ms: 140, step: 0.08, floor: 0.5 } },
    impact_body: { vol: 0.7, vary: 60, max: 3, minMs: 25, burst: { ms: 140, step: 0.08, floor: 0.5 } },
    shield_tink: { vol: 0.8, vary: 60, max: 3, minMs: 40 },
    melee_slash: { vol: 1, max: 2, minMs: 60 },
    melee_hit: { vol: 1, max: 2, minMs: 60 },
    // player
    jump: { vol: 0.7, max: 2, minMs: 40 },
    land: { vol: 0.6, max: 2, minMs: 60 },
    pickup: { vol: 0.9, max: 3 },
    pickup_bombs: { vol: 0.9, max: 2 },
    weapon_get: { vol: 1, max: 1 },
    player_death: { vol: 1, max: 1 },
    respawn: { vol: 0.8, max: 1 },
    one_up: { vol: 1, max: 1 },
    // POWs and enemies
    pow_freed: { vol: 1, max: 2 },
    pow_salute: { vol: 0.7, max: 2 },
    enemy_alert: { vol: 0.8, max: 3, minMs: 80 },
    enemy_death_1: { vol: 0.9, vary: 60, max: 3, minMs: 30 },
    enemy_death_2: { vol: 0.9, vary: 60, max: 3, minMs: 30 },
    enemy_death_3: { vol: 0.9, vary: 60, max: 3, minMs: 30 },
    enemy_shoot: { vol: 0.6, vary: 30, max: 3, minMs: 40 },
    enemy_panic: { vol: 0.7, max: 2, minMs: 120 },
    turret_windup: { vol: 0.9, max: 2, minMs: 100 },
    turret_fire: { vol: 0.8, vary: 30, max: 3, minMs: 50 },
    drone_buzz: { vol: 0.5, loop: true, max: 3 },
    drone_dive: { vol: 0.8, max: 2, minMs: 100 },
    chute_open: { vol: 0.7, max: 2 },
    // boss
    boss_roar: { vol: 1, max: 1 },
    boss_stomp: { vol: 1, max: 2, minMs: 100 },
    boss_steam: { vol: 0.6, loop: true, max: 2 },
    boss_hurt: { vol: 0.6, vary: 60, max: 2, minMs: 80 },
    // Both antlers fire at once: one cannon sound per volley (two identical peaks at −3 dBFS would sum past 0).
    boss_cannon: { vol: 0.75, max: 2, minMs: 120 },
    boss_charge: { vol: 1, max: 1 },
    boss_death: { vol: 1, max: 1 },
    // environment and props
    steam_hiss: { vol: 0.5, max: 2, minMs: 300 },
    crate_break: { vol: 0.8, vary: 50, max: 3, minMs: 30 },
    gate_smash: { vol: 1, max: 1 },
    checkpoint: { vol: 0.8, max: 1 },
    // UI and stingers
    ui_move: { vol: 0.8, max: 2, minMs: 30 },
    ui_select: { vol: 0.8, max: 2 },
    ui_back: { vol: 0.8, max: 2 },
    ui_pause: { vol: 0.9, max: 1 },
    ui_unpause: { vol: 0.9, max: 1 },
    ui_start: { vol: 1, max: 1 },
    continue_tick: { vol: 0.9, max: 2 },
    continue_final: { vol: 1, max: 1 },
    mission_start: { vol: 1, max: 1 },
    mission_complete: { vol: 1, max: 1 },
    game_over: { vol: 1, max: 1 },
    callout: { vol: 0.9, max: 2, minMs: 80 },
    score_tally: { vol: 0.5, max: 3, minMs: 25 },
    rank_stamp: { vol: 1, max: 1 },
    // Phase E: train (Part II). The ambience loops are 1-voice: the Audio layer starts them on part:start and a Levels call can't double them.
    train_clack: { vol: 0.9, loop: true, max: 1 },
    train_horn: { vol: 1, max: 1, minMs: 400 },
    train_whistle: { vol: 0.9, max: 1, minMs: 400 },
    /** Low-bridge girder passing overhead (Levels `hazard_sweep`), positional; two can overlap on a tight gap. */
    bridge_whoosh: { vol: 0.9, vary: 50, max: 2, minMs: 120 },
    wind: { vol: 0.8, loop: true, max: 1 },
    // Phase E: ice / laser
    ice_crack: { vol: 0.8, vary: 80, max: 3, minMs: 60 },
    ice_shatter: { vol: 0.9, vary: 60, max: 2, minMs: 80 },
    laser: { vol: 0.8, vary: 40, max: 3, minMs: 45, burst: { ms: 160, step: 0.05, floor: 0.65 } },
    // Phase E: bosses and enemies
    snowcat_engine: { vol: 1, max: 1, minMs: 500 },
    snowcat_tread: { vol: 0.7, loop: true, max: 1 },
    mortar_thump: { vol: 0.9, vary: 50, max: 3, minMs: 60 },
    loco_steam: { vol: 0.8, max: 2, minMs: 250 },
    loco_cannon: { vol: 0.9, vary: 40, max: 2, minMs: 120 },
    cinder: { vol: 0.7, vary: 120, max: 4, minMs: 30, burst: { ms: 140, step: 0.08, floor: 0.5 } },
    hound_bark: { vol: 0.9, vary: 150, max: 3, minMs: 70 },
    hound_growl: { vol: 0.8, vary: 80, max: 2, minMs: 200 },
    buzzard_rotor: { vol: 0.6, loop: true, max: 2 },
    // Phase E: radio / menus
    radio_blip: { vol: 0.8, max: 2, minMs: 40 },
    radio_static: { vol: 0.7, max: 1, minMs: 150 },
    // Phase F: WARNING siren, HUD ticks
    warning_siren: { vol: 1, max: 1, minMs: 1500 },
    ammo_click: { vol: 0.8, max: 1, minMs: 200 },
    combo_sting: { vol: 0.9, max: 1 },
    // Phase F: weapon layers (played under the weapon's own shot; same fatigue as the shot so a held trigger settles)
    hmg_punch: { vol: 0.9, vary: 40, max: 2, minMs: 40, burst: { ms: 140, step: 0.06, floor: 0.55 } },
    laser_tail: { vol: 0.8, vary: 60, max: 2, minMs: 45, burst: { ms: 160, step: 0.06, floor: 0.5 } },
    rocket_punch: { vol: 1, vary: 40, max: 1, minMs: 150 },
    flame_crackle: { vol: 0.9, vary: 80, max: 2, minMs: 300 },
    // Phase F: background moments (distant tiers; the files are already low-passed and reverberant)
    bg_zeppelin: { vol: 1, max: 1, minMs: 2000 },
    bg_plane: { vol: 1, max: 1, minMs: 2000 },
    bg_train_pass: { vol: 1, max: 1, minMs: 2000 },
    bg_crows: { vol: 1, vary: 80, max: 2, minMs: 400 },
    bg_waterfall: { vol: 1, max: 1, minMs: 3000 },
    bg_artillery: { vol: 1, vary: 100, max: 2, minMs: 250 },
    bg_flak: { vol: 1, vary: 100, max: 2, minMs: 250 },
    bg_siren: { vol: 1, max: 1, minMs: 2500 },
    bg_avalanche: { vol: 1, max: 1, minMs: 3000 },
    bg_tesla: { vol: 1, vary: 120, max: 2, minMs: 120 },
    bg_aurora: { vol: 1, max: 1, minMs: 4000 },
    bg_fissure: { vol: 1, vary: 60, max: 1, minMs: 800 },
    bg_roar: { vol: 1, max: 1, minMs: 1500 },
    bg_engine: { vol: 1, max: 1, minMs: 1500 },
    bg_searchlight: { vol: 1, vary: 60, max: 2, minMs: 300 },
    bg_loco: { vol: 1, max: 1, minMs: 2000 },
    // Phase F: section beds (1 voice each; the Audio layer cross-fades them by camera x)
    amb_camp: { vol: 1, loop: true, max: 1 },
    amb_forest: { vol: 1, loop: true, max: 1 },
    amb_river: { vol: 1, loop: true, max: 1 },
    amb_outpost: { vol: 1, loop: true, max: 1 },
    amb_lake: { vol: 1, loop: true, max: 1 },
    amb_lab: { vol: 1, loop: true, max: 1 },
    // Phase G (Mission 2): player and water. Wading steps arrive every ~180 ms: fatigue them like the HMG so wading settles under the music.
    shotgun_fire: { vol: 1, vary: 30, max: 2, minMs: 80 },
    shotgun_pump: { vol: 0.8, vary: 40, max: 2, minMs: 100 },
    wade_step: { vol: 0.7, vary: 90, max: 2, minMs: 120, burst: { ms: 260, step: 0.08, floor: 0.55 } },
    mud_step: { vol: 0.8, vary: 90, max: 2, minMs: 120, burst: { ms: 260, step: 0.08, floor: 0.55 } },
    splash_s: { vol: 0.8, vary: 80, max: 3, minMs: 60, burst: { ms: 300, step: 0.1, floor: 0.5 } },
    splash_m: { vol: 0.9, vary: 60, max: 3, minMs: 80 },
    splash_l: { vol: 1, vary: 40, max: 2, minMs: 120 },
    splash_xl: { vol: 1, vary: 30, max: 2, minMs: 200 },
    drown: { vol: 1, max: 1, minMs: 500 },
    // Phase G: regular enemies (the two loops are positional handles: `getAudio(scene).loop(key, { x })`, one per enemy, max 4 / 2)
    lurker_rise: { vol: 0.9, vary: 60, max: 3, minMs: 80 },
    piranha_leap: { vol: 0.8, vary: 80, max: 3, minMs: 60 },
    piranha_bite: { vol: 0.9, vary: 60, max: 3, minMs: 50 },
    hopper_croak: { vol: 0.9, vary: 80, max: 2, minMs: 150 },
    hopper_hop: { vol: 0.8, vary: 80, max: 3, minMs: 60 },
    hopper_tongue: { vol: 0.9, vary: 50, max: 2, minMs: 100 },
    gnat_buzz: { vol: 0.5, loop: true, max: 4 },
    airboat_motor: { vol: 0.7, loop: true, max: 2 },
    airboat_gun: { vol: 0.8, vary: 30, max: 2, minMs: 120 },
    // Phase G: SHELLSHOCK
    turtle_hiss: { vol: 0.9, max: 1, minMs: 300 },
    turtle_snap: { vol: 1, vary: 40, max: 2, minMs: 150 },
    shell_clank: { vol: 0.8, vary: 90, max: 3, minMs: 40, burst: { ms: 200, step: 0.1, floor: 0.5 } },
    shell_spin: { vol: 0.8, loop: true, max: 1 },
    egg_lob: { vol: 0.9, vary: 60, max: 3, minMs: 60 },
    egg_beep: { vol: 0.7, vary: 30, max: 3, minMs: 60 },
    // Phase G: MEGA-SKEETER
    skeeter_whine: { vol: 0.7, loop: true, max: 1 },
    skeeter_laser: { vol: 0.9, max: 1, minMs: 300 },
    skeeter_dive: { vol: 1, vary: 40, max: 1, minMs: 300 },
    skeeter_drill: { vol: 1, max: 1, minMs: 300 },
    larva_pop: { vol: 0.9, vary: 80, max: 3, minMs: 60 },
    stinger_fire: { vol: 0.9, vary: 40, max: 2, minMs: 150 },
    // Phase G: GATORGEDDON (the headline: hot tiers, few voices)
    gator_roar: { vol: 1, max: 1, minMs: 800 },
    gator_snap: { vol: 1, vary: 40, max: 2, minMs: 150 },
    gator_hiss: { vol: 0.9, max: 1, minMs: 300 },
    gator_tail: { vol: 1, vary: 40, max: 1, minMs: 300 },
    gator_submerge: { vol: 1, max: 1, minMs: 500 },
    gator_surface: { vol: 1, max: 1, minMs: 500 },
    gator_roll: { vol: 1, max: 1, minMs: 800 },
    gator_missile: { vol: 0.9, vary: 60, max: 4, minMs: 60 },
    gator_gatling: { vol: 0.9, vary: 30, max: 2, minMs: 120 },
    gator_gas: { vol: 0.9, max: 1, minMs: 400 },
    gator_flame: { vol: 1, max: 1, minMs: 400 },
    gator_death: { vol: 1, max: 1 },
    // Phase G: level props and hazards
    log_bob: { vol: 0.8, vary: 80, max: 3, minMs: 100 },
    log_sink: { vol: 0.9, vary: 50, max: 2, minMs: 150 },
    gas_bubble: { vol: 0.8, vary: 90, max: 3, minMs: 120 },
    gas_vent: { vol: 1, vary: 40, max: 2, minMs: 150 },
    boardwalk_creak: { vol: 0.8, vary: 120, max: 2, minMs: 200 },
    boat_horn: { vol: 1, max: 1, minMs: 800 },
    branch_whoosh: { vol: 0.9, vary: 50, max: 2, minMs: 120 },
    paddlewheel: { vol: 0.8, loop: true, max: 1 },
    mill_wheel: { vol: 0.8, loop: true, max: 1 },
    /** One clap per flash: FX accepts flashes ≥ 1.5 s apart, so a direct call and the event-driven delayed clap never both play. */
    thunder: { vol: 1, vary: 80, max: 2, minMs: 1400 },
    plank_break: { vol: 0.9, vary: 60, max: 3, minMs: 60 },
    warning_major: { vol: 1, max: 1, minMs: 1500 },
    // Phase G: Mission 2 background moments (distant tiers)
    bg_herons: { vol: 1, vary: 60, max: 2, minMs: 400 },
    bg_patrol_boat: { vol: 1, max: 1, minMs: 2000 },
    bg_wisps: { vol: 1, vary: 40, max: 1, minMs: 2500 },
    bg_pond_wake: { vol: 1, max: 1, minMs: 2000 },
    bg_gator_pod: { vol: 1, max: 1, minMs: 2500 },
    bg_burning_barge: { vol: 1, max: 1, minMs: 2500 },
    bg_skeeter_swarm: { vol: 1, max: 1, minMs: 2500 },
    bg_airboat_race: { vol: 1, max: 1, minMs: 2500 },
    bg_mill_creak: { vol: 1, vary: 60, max: 1, minMs: 2000 },
    bg_den_glow: { vol: 1, max: 1, minMs: 2000 },
    bg_gator_roar: { vol: 1, max: 1, minMs: 1500 },
    bg_wreck_collapse: { vol: 1, max: 1, minMs: 2000 },
    bg_thunder: { vol: 1, vary: 120, max: 2, minMs: 700 },
    // Phase G: ambient beds by fx:ambience kind (UI.audio.ambienceKinds), 1 voice each
    amb_swamp: { vol: 1, loop: true, max: 1 },
    amb_rain: { vol: 1, loop: true, max: 1 },
    amb_storm: { vol: 1, loop: true, max: 1 },
    amb_fog: { vol: 1, loop: true, max: 1 },
    amb_riverboat: { vol: 1, loop: true, max: 1 }
};

/** One alias target. `keys` picks randomly; `loopMs` runs the key as a loop for that long; `also` layers more keys. */
export interface AliasSpec {
    key?: string;
    keys?: readonly string[];
    volume?: number;
    detune?: number;
    loopMs?: number;
    also?: readonly string[];
}

/**
 * Keys other teams call (`ctx.audio.sfx('<key>')`) → catalog keys. Everything that isn't a catalog key and isn't
 * listed here is reported once as unknown (dev console + `__KBE.state().audio.unknown`).
 */
export const SFX_ALIASES: Record<string, AliasSpec> = {
    // player / weapons (src/entities/weapons, player/controller.ts, dev sandbox)
    rocket: { key: 'rocket_launch' },
    flame: { key: 'flame_start' },
    knife: { key: 'melee_slash' },
    melee: { key: 'melee_slash' },
    sfx_pistol: { key: 'pistol' },
    shoot: { key: 'pistol' },
    grenade: { key: 'grenade_throw' },
    bounce: { key: 'grenade_bounce' },
    death: { key: 'player_death' },
    die: { key: 'player_death' },
    player_die: { key: 'player_death' },
    '1up': { key: 'one_up' },
    life: { key: 'one_up' },
    powerup: { key: 'weapon_get' },
    pow: { key: 'pow_freed' },
    // enemies (src/entities/enemies/Enemy.ts)
    enemy_shout: { key: 'enemy_alert' },
    enemy_die: { keys: ['enemy_death_1', 'enemy_death_2', 'enemy_death_3'] },
    enemy_death: { keys: ['enemy_death_1', 'enemy_death_2', 'enemy_death_3'] },
    chute_tear: { key: 'chute_open', detune: -500, volume: 0.8 },
    /** The drone calls it once at dive wind-up; the dive whoosh fits that moment better than a 0.45 s buzz loop. */
    drone_buzz: { key: 'drone_dive' },
    turret_shoot: { key: 'turret_fire' },
    shield_block: { key: 'shield_tink' },
    // boss (src/entities/bosses/Moosezilla.ts)
    boss_explode: { key: 'boss_death', also: ['explo_xl'] },
    steam: { key: 'boss_steam', loopMs: 1800 },
    boss_flame: { key: 'flame_start', detune: -400, also: ['boss_flame_loop'] },
    boss_flame_loop: { key: 'flame_loop', detune: -300, loopMs: 1300, volume: 0.8 },
    boss_hit: { key: 'boss_hurt' },
    boss_phase: { key: 'boss_roar' },
    // level props (src/level/props.ts)
    door_open: { key: 'steam_hiss', volume: 0.7, detune: -200 },
    crate: { key: 'crate_break' },
    barrel_break: { key: 'crate_break', detune: -300 },
    gate: { key: 'gate_smash' },
    explosion: { key: 'explo_m' },
    hit: { key: 'impact_body' },
    // UI synonyms
    select: { key: 'ui_select' },
    move: { key: 'ui_move' },
    back: { key: 'ui_back' },
    pause: { key: 'ui_pause' },
    unpause: { key: 'ui_unpause' },
    start: { key: 'ui_start' },
    tick: { key: 'continue_tick' },
    // Phase E synonyms
    laser_shot: { key: 'laser' },
    laser_fire: { key: 'laser' },
    rotor: { key: 'buzzard_rotor' },
    heli: { key: 'buzzard_rotor' },
    buzzard: { key: 'buzzard_rotor' },
    horn: { key: 'train_horn' },
    whistle: { key: 'train_whistle' },
    clack: { key: 'train_clack' },
    bark: { key: 'hound_bark' },
    growl: { key: 'hound_growl' },
    hound_alert: { key: 'hound_bark' },
    hound_leap: { key: 'hound_bark', detune: 200 },
    mortar: { key: 'mortar_thump' },
    mortar_fire: { key: 'mortar_thump' },
    mortar_land: { key: 'explo_m' },
    cannon: { key: 'loco_cannon' },
    turret_cannon: { key: 'loco_cannon' },
    steam_blast: { key: 'loco_steam' },
    smokestack: { key: 'loco_steam' },
    crack: { key: 'ice_crack' },
    ice_break: { key: 'ice_shatter' },
    shatter: { key: 'ice_shatter' },
    snowcat_rev: { key: 'snowcat_engine' },
    snowcat_charge: { key: 'snowcat_engine' },
    engine: { key: 'snowcat_engine' },
    tread: { key: 'snowcat_tread' },
    radio: { key: 'radio_blip' },
    static: { key: 'radio_static' },
    part_clear: { key: 'part_clear_jingle' },
    // Phase F synonyms
    warning: { key: 'warning_siren' },
    boss_warning: { key: 'warning_siren' },
    klaxon: { key: 'warning_siren' },
    combo: { key: 'combo_sting' },
    multikill: { key: 'combo_sting' },
    /** The Buzzard circling far off: the rotor loop, small and low, for 2.5 s. */
    bg_buzzard: { key: 'buzzard_rotor', volume: 0.35, detune: -250, loopMs: 2500 },
    /** The gorge under the trestle: the river bed far below for 6 s. */
    bg_gorge: { key: 'amb_river', volume: 0.5, detune: -200, loopMs: 6000 },
    /** MOOSEZILLA's silhouette stomping behind the lab: the stomp, small, low and far. */
    bg_stomp: { key: 'boss_stomp', volume: 0.3, detune: -400 },
    far_roar: { key: 'bg_roar' },
    distant_roar: { key: 'bg_roar' },
    // Phase G (Mission 2) synonyms: the MISSION2.md keys are real files; these are the guesses teams are likely to make.
    shotgun: { key: 'shotgun_fire' },
    pump: { key: 'shotgun_pump' },
    wade: { key: 'wade_step' },
    splash: { key: 'splash_m' },
    water_splash: { key: 'splash_m' },
    sink: { key: 'drown' },
    mud: { key: 'mud_step' },
    squelch: { key: 'mud_step' },
    gnat: { key: 'gnat_buzz' },
    airboat: { key: 'airboat_motor' },
    hopper_leap: { key: 'hopper_hop' },
    tongue: { key: 'hopper_tongue' },
    piranha: { key: 'piranha_leap' },
    lurker: { key: 'lurker_rise' },
    turtle_roar: { key: 'turtle_hiss' },
    shellshock_roar: { key: 'turtle_hiss' },
    shell_hit: { key: 'shell_clank' },
    egg: { key: 'egg_lob' },
    egg_pop: { key: 'explo_s', volume: 0.8 },
    skeeter_roar: { key: 'skeeter_dive' },
    skeeter_crash: { key: 'splash_xl', also: ['explo_l'] },
    larva: { key: 'larva_pop' },
    stinger: { key: 'stinger_fire' },
    gator: { key: 'gator_roar' },
    gator_lunge: { key: 'gator_snap' },
    gator_bite: { key: 'gator_snap' },
    gator_dive: { key: 'gator_submerge' },
    gator_rise: { key: 'gator_surface' },
    gator_slam: { key: 'boss_stomp', also: ['plank_break'] },
    gator_rocket: { key: 'gator_missile' },
    gator_explode: { key: 'gator_death', also: ['explo_xl'] },
    // Phase G1 follow-up: Levels' last bg:event ids, layered from existing keys. An `also` layer plays at the caller's volume
    // and detune (not the alias's), so each quieter layer is its own alias.
    /** SHELLSHOCK foreshadowing (2-1 pond): a big far splash and the turtle's hiss, low and small. */
    bg_pond_shell: { key: 'splash_xl', volume: 0.45, detune: -500, also: ['bg_shell_hiss'] },
    bg_shell_hiss: { key: 'turtle_hiss', volume: 0.4, detune: -400 },
    /** The barge going up far downriver (2-2): the artillery thump, lower, with a spray of debris into the water. */
    bg_barge_blast: { key: 'bg_artillery', detune: -300, also: ['bg_barge_spray'] },
    bg_barge_spray: { key: 'splash_l', volume: 0.3, detune: -600 },
    /** GATORGEDDON from the den (2-3, after the mill arena): the boss roar itself, far and huge, under the distant tier. */
    bg_gator_roar_huge: { key: 'gator_roar', volume: 0.35, detune: -500, also: ['bg_gator_roar'] },
    /** GATORGEDDON's wake surging past (2-3): the pond wake, bigger and lower, with a surfacing surge. */
    bg_gator_wake: { key: 'bg_pond_wake', detune: -400, also: ['bg_gator_surge'] },
    bg_gator_surge: { key: 'gator_surface', volume: 0.3, detune: -700 },
    vent: { key: 'gas_vent' },
    bubbles: { key: 'gas_bubble' },
    creak: { key: 'boardwalk_creak' },
    horn_boat: { key: 'boat_horn' },
    riverboat_horn: { key: 'boat_horn' },
    branch: { key: 'branch_whoosh' },
    lightning: { key: 'thunder' },
    plank: { key: 'plank_break' },
    plank_crack: { key: 'ice_crack', detune: -200 },
    /** The riverboat's horn far off (map `clearSfx` after SHELLSHOCK): small and low. */
    boat_horn_far: { key: 'boat_horn', volume: 0.5, detune: -250 }
};

export interface MusicMeta { loop: boolean; durationMs: number }

export const MUSIC_META: Record<string, MusicMeta> = {
    music_title: { loop: true, durationMs: 58182 },
    music_stage1: { loop: true, durationMs: 90353 },
    music_boss: { loop: true, durationMs: 62609 },
    music_continue: { loop: true, durationMs: 8000 },
    jingle_complete: { loop: false, durationMs: 7000 },
    jingle_gameover: { loop: false, durationMs: 6000 },
    // Phase E
    music_m1p2: { loop: true, durationMs: 76800 },
    music_m1p3: { loop: true, durationMs: 75000 },
    music_midboss: { loop: true, durationMs: 43636 },
    part_clear_jingle: { loop: false, durationMs: 4800 },
    // Phase G (Mission 2)
    music_m2p1: { loop: true, durationMs: 88889 },
    music_m2p2: { loop: true, durationMs: 70244 },
    music_m2p3: { loop: true, durationMs: 93913 },
    music_boss_m2: { loop: true, durationMs: 44651 },
    music_boss_gator: { loop: true, durationMs: 89600 }
};

/**
 * Phase E/G: which looping track a `boss:spawn` picks, by boss name (upper-cased, substring match). Mission 1's main boss keeps
 * `music_boss`, GATORGEDDON gets its own epic theme, the Mission 2 mid-bosses share `music_boss_m2`; anything else is Mission 1's mid-boss theme.
 */
export function bossMusicFor(name: string): string {
    const n = name.toUpperCase();
    if (/MOOSEZILLA|KING ANTLER/.test(n)) return 'music_boss';
    if (/GATOR/.test(n)) return 'music_boss_gator';
    if (/SHELLSHOCK|TURTLE|SKEETER|MOSQUITO/.test(n)) return 'music_boss_m2';
    return 'music_midboss';
}

/** Phase G: the main-boss WARNING variant (bigger banner, deeper siren) keys on these names. */
export const MAJOR_BOSS = /GATORGEDDON|MOOSEZILLA/;

/** Phase E: loop keys the Audio layer counts as gameplay music (restored after a continue, left alone by part:start). */
export const GAMEPLAY_MUSIC = /^music_(stage|boss|midboss|m\d+p\d+)/;

/** Music keys other teams/maps may use (Levels prefixes trigger keys with `music_`). */
export const MUSIC_ALIASES: Record<string, string> = {
    stage1: 'music_stage1', music_stage: 'music_stage1', music_stage_1: 'music_stage1', stage: 'music_stage1',
    boss1: 'music_boss', boss: 'music_boss', music_boss1: 'music_boss', music_boss_1: 'music_boss',
    title: 'music_title', menu: 'music_title', music_menu: 'music_title',
    continue: 'music_continue', music_gameover: 'jingle_gameover', gameover: 'jingle_gameover', game_over: 'jingle_gameover',
    complete: 'jingle_complete', music_complete: 'jingle_complete', clear: 'jingle_complete', music_clear: 'jingle_complete',
    // Phase E
    music_m1p1: 'music_stage1', m1p1: 'music_stage1', m1p2: 'music_m1p2', m1p3: 'music_m1p3',
    stage2: 'music_m1p2', music_stage2: 'music_m1p2', train: 'music_m1p2', music_train: 'music_m1p2',
    stage3: 'music_m1p3', music_stage3: 'music_m1p3', lake: 'music_m1p3', lab: 'music_m1p3', music_lake: 'music_m1p3',
    midboss: 'music_midboss', music_midboss1: 'music_midboss', boss_snowcat: 'music_midboss', boss_ironhorn: 'music_midboss',
    music_snowcat: 'music_midboss', music_ironhorn: 'music_midboss', music_part_clear: 'part_clear_jingle', jingle_part_clear: 'part_clear_jingle',
    // Phase G (Mission 2)
    m2p1: 'music_m2p1', m2p2: 'music_m2p2', m2p3: 'music_m2p3', bayou: 'music_m2p1', music_bayou: 'music_m2p1', swamp: 'music_m2p1', music_swamp: 'music_m2p1',
    river: 'music_m2p2', music_river: 'music_m2p2', riverboat: 'music_m2p2', storm: 'music_m2p3', music_storm: 'music_m2p3', mill: 'music_m2p3', music_mill: 'music_m2p3',
    music_midboss2: 'music_boss_m2', midboss2: 'music_boss_m2', boss_m2: 'music_boss_m2', music_shellshock: 'music_boss_m2', music_skeeter: 'music_boss_m2',
    boss_shellshock: 'music_boss_m2', boss_skeeter: 'music_boss_m2', music_gator: 'music_boss_gator', music_gatorgeddon: 'music_boss_gator',
    boss_gator: 'music_boss_gator', boss_gatorgeddon: 'music_boss_gator', boss2: 'music_boss_gator', music_boss2: 'music_boss_gator'
};

export function isMusicKey(key: string): boolean {
    return key in MUSIC_META || key in MUSIC_ALIASES;
}
