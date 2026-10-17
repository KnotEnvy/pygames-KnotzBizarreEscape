// Event-driven sound: everything the catalog marks as event-driven that no team plays directly.
// Direct calls that already exist in gameplay code (pistol/hmg/spread/rocket/flame, jump, land, knife, pickup,
// weapon_get, grenade_throw, enemy_shoot/alert/panic/die, shield_tink, turret_windup, boss_roar/cannon/stomp/
// steam/flame/explode, crate_break, gate_smash) are NOT doubled here; the wiring only positions or specialises
// them through `hint()` / `stopRecent()` when an event carries better information than the call did.
// Phase F: boss:intro siren, bg:event → distant `bg_*` sounds (UI.audio.bgEvents lookup, panned by x), weapon layers
// under player:shoot, section ambient beds cross-faded by camera x (UI.audio.sections), arena ducking of the beds.
import type { GameContext, ImpactMaterial } from '../core/contracts';
import { UI } from '../config/tuning/ui';
import type { AudioEngine, LoopHandle } from './engine';
import { GAMEPLAY_MUSIC, bossMusicFor } from './catalog';

/** Phase E: the part being played, read defensively (the field is on GameContext since Engine's campaign work landed). */
function partOf(ctx: GameContext): { id: string; music?: string } {
    const p = (ctx as { part?: { id?: string; music?: string } }).part;
    return { id: p?.id ?? '1-1', music: p?.music };
}

function impactKey(material: ImpactMaterial): string {
    switch (material) {
        case 'flesh': return 'impact_body';
        case 'metal': return 'impact_metal';
        case 'wood': return 'impact_wood';
        case 'shield': return 'shield_tink';
        default: return 'impact_dirt';
    }
}

export function wireAudioEvents(ctx: GameContext, engine: AudioEngine): void {
    const bus = ctx.events.scoped(ctx.scene);
    engine.setListener(() => ctx.camera.view().centerX);

    let clock = 0;
    let flame: LoopHandle | null = null;
    let flameUntil = 0;
    let whoosh: LoopHandle | null = null;
    let lives = ctx.state.lives;
    let bossHp = Infinity;
    /** Phase E: part ambience loops (train clack, wind) the Audio layer owns for the run. */
    const ambience: LoopHandle[] = [];
    /** Phase F: the section bed (one `amb_*` loop at a time, cross-faded), its volume ramp and the arena duck. */
    let bed: { key: string; handle: LoopHandle; vol: number; target: number } | null = null;
    let bedsOn = true;
    let bedPoll = 0;
    let arenaGain = 1;
    const bedFade = UI.audio.bedFadeMs;

    const stopLoops = (): void => {
        flame?.stop(80); flame = null;
        whoosh?.stop(120); whoosh = null;
    };
    const stopBed = (fadeMs = 600): void => {
        bed?.handle.stop(fadeMs);
        bed = null;
        engine.bedKey = null;
    };
    const stopAmbience = (fadeMs = 600): void => {
        for (const h of ambience) h.stop(fadeMs);
        ambience.length = 0;
        stopBed(fadeMs);
    };
    const bedFor = (x: number): { bed: string | null; volume?: number } | null => {
        const list = UI.audio.sections[partOf(ctx).id];
        if (!list || list.length === 0) return null;
        let pick: { bed: string | null; volume?: number } | null = null;
        for (const s of list) { if (s.x <= x) pick = s; else break; }
        return pick;
    };
    /** Poll the camera centre; when the section changes, fade the old bed out and the new one in (`bedFadeMs`). */
    const updateBed = (dt: number): void => {
        if (bed) {
            const goal = bed.target * arenaGain;
            const step = dt / Math.max(1, bedFade);
            bed.vol = bed.vol < goal ? Math.min(goal, bed.vol + step) : Math.max(goal, bed.vol - step);
            bed.handle.setVolume(bed.vol);
        }
        bedPoll += dt;
        if (bedPoll < UI.audio.bedPollMs) return;
        bedPoll = 0;
        if (!bedsOn || engine.locked) return;
        const sec = bedFor(ctx.camera.view().centerX);
        const key = sec?.bed ?? null;
        if ((bed?.key ?? null) === key) return;
        stopBed(bedFade);
        if (key) {
            const handle = engine.loop(key, { volume: 0.001 });
            if (handle.active) { bed = { key, handle, vol: 0, target: sec?.volume ?? 1 }; engine.bedKey = key; }
        }
    };
    /** Background moments: pan by world x (no distance falloff), never positional gain. */
    const bgPan = (x: number | undefined): number => {
        if (x === undefined) return 0;
        const d = x - ctx.camera.view().centerX;
        return Math.max(-1, Math.min(1, d / UI.audio.bgPanRange)) * UI.audio.bgPanMax;
    };
    const defaultMusic = (): string => partOf(ctx).music ?? 'music_stage1';

    // combat
    bus.on('projectile:impact', e => {
        const key = impactKey(e.material);
        engine.sfx(key, e.material === 'water' ? { x: e.x, volume: 0.5, detune: -700 } : { x: e.x, volume: e.team === 'enemy' ? 0.6 : 1 });
    });
    bus.on('explosion', e => {
        engine.sfx(`explo_${e.size}`, { x: e.x });
        if (e.team === 'player' && whoosh) { whoosh.stop(60); whoosh = null; }
    });
    bus.on('entity:hurt', e => {
        if (e.kind === 'melee' && e.team !== 'player') engine.sfx('melee_hit', { x: e.x });
    });
    bus.on('enemy:shoot', e => {
        if (e.kind === 'moosezilla') engine.hint('boss_cannon', { x: e.x });
        else if (e.kind === 'snowcat') engine.hint(e.weapon === 'mortar' ? 'mortar_thump' : 'enemy_shoot', { x: e.x });
        else if (e.kind === 'ironhorn') engine.hint('loco_cannon', { x: e.x });
        else engine.hint('enemy_shoot', { x: e.x, replace: e.kind === 'turret' ? 'turret_fire' : undefined });
    });
    bus.on('fx:emit', e => {
        if (e.effect === 'vent_steam') engine.sfx('steam_hiss', { x: e.x, volume: 0.6 });
    });

    // player
    bus.on('player:shoot', e => {
        // Phase F: a low/bright layer under the weapon's own shot gives the guns more punch (same fatigue as the shot).
        const layer = UI.audio.weaponLayers[e.weapon];
        if (layer) engine.sfx(layer.key, { x: e.x, volume: layer.volume });
        if (e.weapon === 'flame') {
            flameUntil = clock + UI.audio.flameLoopHoldMs;
            if (!flame || !flame.active) flame = engine.loop('flame_loop', { x: e.x });
        } else if (e.weapon === 'rocket') {
            whoosh?.stop(60);
            whoosh = engine.loop('rocket_whoosh', { x: e.x, durationMs: UI.audio.rocketWhooshMs, fadeMs: 150 });
        }
    });
    bus.on('player:land', e => {
        const speed = Math.abs(e.vy ?? 180);
        engine.hint('land', { volume: speed < 120 ? 0.6 : speed > 260 ? 1.25 : 1 });
    });
    bus.on('player:died', e => {
        stopLoops();
        engine.sfx('player_death', { x: e.x });
        engine.duck(0.5, 1000, 600);
    });
    bus.on('player:respawn', () => engine.sfx('respawn'));
    bus.on('lives:changed', e => {
        if (e.value > lives) engine.sfx('one_up');
        lives = e.value;
    });
    bus.on('pickup:collected', e => {
        if (e.kind === 'bombs') { engine.stopRecent('pickup'); engine.sfx('pickup_bombs', { x: e.x }); }
        else if (e.kind === 'life') engine.stopRecent('pickup');
    });
    bus.on('pow:freed', e => engine.sfx('pow_freed', { x: e.x }));
    bus.on('checkpoint', () => engine.sfx('checkpoint'));

    // boss (Phase E: the mid-bosses get their own theme, MOOSEZILLA keeps music_boss)
    bus.on('boss:spawn', e => {
        bossHp = e.hp;
        engine.music(bossMusicFor(e.name ?? ''), { fade: 800 });
        engine.duck(0.55, 1500, 500);
    });
    // The boss's own `sfx('boss_stomp')` call follows the event: position it (no doubling).
    bus.on('boss:stomp', e => engine.hint('boss_stomp', { x: e.x, volume: e.power >= 2 ? 1.1 : 1 }));
    bus.on('boss:hp', e => {
        if (e.hp < bossHp) engine.sfx('boss_hurt', { x: e.x });
        bossHp = e.hp;
    });
    bus.on('boss:phase', e => { bossHp = e.hp; engine.duck(0.55, 1200, 500); });
    bus.on('boss:defeated', () => engine.music(null, { fade: 2500 }));
    // Phase F: the WARNING banner's siren (the HUD draws the banner; the siren plays even without the HUD scene).
    bus.on('boss:intro', () => {
        engine.sfx(UI.warning.sfx);
        const d = UI.audio.warningDuck;
        engine.duck(d.gain, d.holdMs, d.recoverMs);
    });
    // Phase F: arenas duck the section bed (combat focus); the clear brings it back.
    bus.on('arena:start', () => { arenaGain = UI.audio.bedArenaGain; });
    bus.on('arena:clear', () => { arenaGain = 1; });
    // Phase F: background moments → distant sounds through the lookup table (ids are Levels' choice; see UI.audio.bgEvents).
    bus.on('bg:event', e => {
        const id = String(e.id ?? '');
        const spec = UI.audio.bgEvents[id] ?? UI.audio.bgEvents[id.replace(/^bg[_:]/, '')] ?? (engine.has(id) ? { key: id } : null);
        engine.noteBg(id, spec ? spec.key || '(silent)' : null);
        if (!spec || !spec.key) return;
        engine.sfx(spec.key, { pan: bgPan(e.x), volume: spec.volume, detune: spec.detune });
    });

    // Phase E: part start → default music (unless Levels' map property already started one) and the part's ambience.
    bus.on('part:start', e => {
        const cur = engine.musicKey;
        const music = partOf(ctx).music;
        if (music && !(cur && GAMEPLAY_MUSIC.test(cur))) engine.music(music, { fade: 700 });
        stopAmbience(200);
        const amb = UI.audio.ambience[e.id];
        if (amb) for (const [key, volume] of Object.entries(amb)) ambience.push(engine.loop(key, { volume }));
        bedsOn = true;
        arenaGain = 1;
        bedPoll = UI.audio.bedPollMs;
    });

    // flow
    bus.on('stage:clear', e => {
        stopLoops();
        bedsOn = false;
        stopAmbience(1500);
        engine.music(null, { fade: 250 });
        const final = e.final ?? (ctx as { part?: { final?: boolean } }).part?.final ?? true;
        engine.after(UI.audio.completeJingleDelayMs, () => engine.music(final ? 'jingle_complete' : 'part_clear_jingle'));
    });
    bus.on('game:over', () => {
        stopLoops();
        bedsOn = false;
        stopAmbience(800);
        engine.music(null, { fade: 300 });
        engine.sfx('game_over');
    });
    bus.on('game:continue', () => {
        lives = ctx.state.lives;
        engine.music(engine.lastGameplayMusic ?? defaultMusic(), { fade: 500 });
        const amb = UI.audio.ambience[partOf(ctx).id];
        if (amb && ambience.length === 0) for (const [key, volume] of Object.entries(amb)) ambience.push(engine.loop(key, { volume }));
        bedsOn = true;
        arenaGain = 1;
    });
    bus.on('game:pause', e => { if (e.paused) engine.pauseGameplay(); else engine.resumeGameplay(); });
    bus.on('settings:changed', () => engine.applySettings());

    ctx.onUpdate((_dt, rawDt) => {
        clock += rawDt;
        if (flame && clock > flameUntil) { flame.stop(80); flame = null; }
        updateBed(rawDt);
    });
}
