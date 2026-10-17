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
    amb_lab: { vol: 1, loop: true, max: 1 }
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
    thunder: { key: 'bg_artillery', detune: -300 },
    bg_thunder: { key: 'bg_artillery', detune: -300 },
    far_roar: { key: 'bg_roar' },
    distant_roar: { key: 'bg_roar' }
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
    part_clear_jingle: { loop: false, durationMs: 4800 }
};

/** Phase E: which looping track a `boss:spawn` picks, by boss name (upper-cased, substring match). Default: the mid-boss theme. */
export function bossMusicFor(name: string): string {
    return /MOOSEZILLA|KING ANTLER/.test(name.toUpperCase()) ? 'music_boss' : 'music_midboss';
}

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
    music_snowcat: 'music_midboss', music_ironhorn: 'music_midboss', music_part_clear: 'part_clear_jingle', jingle_part_clear: 'part_clear_jingle'
};

export function isMusicKey(key: string): boolean {
    return key in MUSIC_META || key in MUSIC_ALIASES;
}
