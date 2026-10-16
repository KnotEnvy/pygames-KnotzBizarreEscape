// Event-driven sound: everything the catalog marks as event-driven that no team plays directly.
// Direct calls that already exist in gameplay code (pistol/hmg/spread/rocket/flame, jump, land, knife, pickup,
// weapon_get, grenade_throw, enemy_shoot/alert/panic/die, shield_tink, turret_windup, boss_roar/cannon/stomp/
// steam/flame/explode, crate_break, gate_smash) are NOT doubled here; the wiring only positions or specialises
// them through `hint()` / `stopRecent()` when an event carries better information than the call did.
import type { GameContext, ImpactMaterial } from '../core/contracts';
import { UI } from '../config/tuning/ui';
import type { AudioEngine, LoopHandle } from './engine';

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

    const stopLoops = (): void => {
        flame?.stop(80); flame = null;
        whoosh?.stop(120); whoosh = null;
    };

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
        else engine.hint('enemy_shoot', { x: e.x, replace: e.kind === 'turret' ? 'turret_fire' : undefined });
    });
    bus.on('fx:emit', e => {
        if (e.effect === 'vent_steam') engine.sfx('steam_hiss', { x: e.x, volume: 0.6 });
    });

    // player
    bus.on('player:shoot', e => {
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

    // boss
    bus.on('boss:spawn', e => {
        bossHp = e.hp;
        engine.music('music_boss', { fade: 800 });
        engine.duck(0.55, 1500, 500);
    });
    bus.on('boss:hp', e => {
        if (e.hp < bossHp) engine.sfx('boss_hurt', { x: e.x });
        bossHp = e.hp;
    });
    bus.on('boss:phase', e => { bossHp = e.hp; engine.duck(0.55, 1200, 500); });
    bus.on('boss:defeated', () => engine.music(null, { fade: 2500 }));

    // flow
    bus.on('stage:clear', () => {
        stopLoops();
        engine.music(null, { fade: 250 });
        engine.after(UI.audio.completeJingleDelayMs, () => engine.music('jingle_complete'));
    });
    bus.on('game:over', () => {
        stopLoops();
        engine.music(null, { fade: 300 });
        engine.sfx('game_over');
    });
    bus.on('game:continue', () => {
        lives = ctx.state.lives;
        engine.music(engine.lastGameplayMusic ?? 'music_stage1', { fade: 500 });
    });
    bus.on('game:pause', e => { if (e.paused) engine.pauseGameplay(); else engine.resumeGameplay(); });
    bus.on('settings:changed', () => engine.applySettings());

    ctx.onUpdate((_dt, rawDt) => {
        clock += rawDt;
        if (flame && clock > flameUntil) { flame.stop(80); flame = null; }
    });
}
