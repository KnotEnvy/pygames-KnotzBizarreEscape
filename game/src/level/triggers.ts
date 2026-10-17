// Trigger rects from the `triggers` object layer, tested against the player's feet each frame.
//   checkpoint / music: fire once when the player crosses the strip's left edge (they're full-height strips,
//                       and cp_camp sits behind the player start).
//   prompt:             once per run, when the feet are inside the rect → ui:prompt.
//   ambience:           every rect is published to FX as an fx:zone at load; entering/leaving also emits
//                       fx:ambience with the innermost zone's kind (FX prefers zones when one is on camera).
//   stage_end:          inside the rect → stage:clear (requires=boss: armed only after boss:defeated).
//   boss clear:         boss:defeated (emitted after the death chain) → stage:clear by itself after a short beat,
//                       wherever the player stands, so the climax never ends in an invisible-trigger hunt. It waits
//                       while the player is dead/respawning, and briefly for them to land so the victory pose is grounded.
import type Phaser from 'phaser';
import type { GameContext, GameEvents } from '../core';
import { LEVEL } from '../config/tuning/level';
import { str, type LevelObject } from './types';

/** Ambience ids FX understands (Phase E adds the train's speed weather, tunnel darkness and the lake blizzard). */
type Ambience = 'snow' | 'embers' | 'fireflies' | 'steam' | 'train' | 'tunnel' | 'blizzard';
const AMBIENCES = new Set<string>(['snow', 'embers', 'fireflies', 'steam', 'train', 'tunnel', 'blizzard']);
type AmbiencePayload = GameEvents['fx:ambience']['kind'];

export class TriggerSystem {
    private readonly fired = new Set<LevelObject>();
    private readonly ambience: LevelObject[];
    private currentAmbience: Ambience | null | undefined = undefined;
    private bossDown = false;
    /** ms left before the automatic boss clear (-1 = not armed). */
    private clearTimer = -1;
    /** ms spent waiting for the player to land after the clear beat. */
    private landWait = 0;
    private cleared = false;
    /** Set while a moving tunnel covers the player (train): wins over the map's ambience rects. */
    private override: Ambience | null = null;
    lastCheckpoint = '';

    constructor(private readonly ctx: GameContext, private readonly triggers: LevelObject[], private readonly clearSfx = '') {
        this.ambience = triggers.filter(t => t.type === 'ambience' && AMBIENCES.has(str(t.props.fx)))
            .sort((a, b) => a.width * a.height - b.width * b.height);
        ctx.events.on('boss:defeated', () => {
            this.bossDown = true;
            if (this.clearTimer < 0) this.clearTimer = LEVEL.boss.clearDelayMs;
            // Part I: a logging train's whistle blows in the distance after the Snowcat goes down.
            if (this.clearSfx) ctx.scene.time.delayedCall(LEVEL.clearSfxDelayMs, () => ctx.audio.sfx(this.clearSfx));
        });
    }

    /** Publish ambient zones to FX (call once the level is ready). */
    publishZones(): void {
        for (const t of this.ambience) {
            this.ctx.events.emit('fx:zone', { id: `level_${t.id}`, kind: str(t.props.fx), active: true, x: t.x, y: t.y, width: t.width, height: t.height });
        }
    }

    update(dt: number): void {
        const p = this.ctx.player();
        if (!p) return;
        if (this.clearTimer >= 0 && !this.cleared) this.tickBossClear(p, dt);
        const x = p.x, y = p.y - 1;
        for (const t of this.triggers) {
            if (this.fired.has(t)) continue;
            switch (t.type) {
                case 'checkpoint':
                    if (x < t.x) break;
                    this.fired.add(t);
                    this.checkpoint(t, x, p.y);
                    break;
                case 'music':
                    if (x < t.x) break;
                    this.fired.add(t);
                    this.music(str(t.props.key));
                    break;
                case 'prompt':
                    if (!inside(t, x, y)) break;
                    this.fired.add(t);
                    this.ctx.events.emit('ui:prompt', { text: str(t.props.text), ms: LEVEL.promptMs });
                    break;
                case 'stage_end':
                    if (this.cleared || !inside(t, x, y)) break;
                    if (str(t.props.requires) === 'boss' && !this.bossDown) break;
                    this.fired.add(t);
                    this.clear();
                    break;
            }
        }
        // Innermost (smallest) ambience rect containing the player.
        let kind: Ambience | null = this.override;
        if (!kind) for (const t of this.ambience) if (x >= t.x && x <= t.x + t.width) { kind = str(t.props.fx) as Ambience; break; }
        if (kind !== this.currentAmbience) {
            this.currentAmbience = kind;
            // FX accepts the Phase E ids already; the shared event type may still list only the Phase B three.
            this.ctx.events.emit('fx:ambience', { kind: kind as AmbiencePayload });
        }
    }

    private tickBossClear(p: NonNullable<ReturnType<GameContext['player']>>, dt: number): void {
        if (this.ctx.flow.over || this.ctx.flow.isDead() || !p.alive()) return; // resumes after the respawn
        if (this.clearTimer > 0) { this.clearTimer = Math.max(0, this.clearTimer - dt); return; }
        const body = (p.sprite as Phaser.GameObjects.Sprite).body as Phaser.Physics.Arcade.Body | null;
        const grounded = !body || body.blocked.down || body.touching.down;
        if (!grounded && (this.landWait += dt) < LEVEL.boss.clearLandWaitMs) return;
        this.clear();
    }

    private clear(): void {
        if (this.cleared) return;
        this.cleared = true;
        this.clearTimer = -1;
        const part = (this.ctx as { part?: GameContext['part'] }).part;
        this.ctx.events.emit('stage:clear', { stage: this.ctx.level.stage ?? LEVEL.map.stage, ...(part ? { part: part.id, final: part.final } : {}) });
    }

    private checkpoint(t: LevelObject, px: number, py: number): void {
        const cx = Math.max(t.x + t.width / 2, Math.min(px, t.x + t.width));
        const y = this.ctx.physics.groundBelow(cx, py - 40, 160) ?? py;
        const id = str(t.props.id, `cp${t.id}`);
        this.lastCheckpoint = id;
        this.ctx.events.emit('checkpoint', { x: cx, y, id });
    }

    private music(key: string): void {
        if (!key) return;
        this.ctx.audio.music(key.startsWith(LEVEL.music.prefix) ? key : LEVEL.music.prefix + key);
    }

    /** Ambience override (a tunnel passing over the player); null hands control back to the map's rects. */
    setOverride(kind: Ambience | null): void { this.override = kind; }

    /** Checkpoint x by id (boss cheat). */
    checkpointX(id: string): number | null {
        const t = this.triggers.find(o => o.type === 'checkpoint' && str(o.props.id) === id);
        return t ? t.x + t.width / 2 : null;
    }
}

function inside(t: LevelObject, x: number, y: number): boolean {
    return x >= t.x && x <= t.x + t.width && y >= t.y && y <= t.y + t.height;
}
