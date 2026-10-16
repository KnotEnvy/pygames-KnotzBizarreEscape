// Generic pooled projectiles for player AND enemy teams. Manual integration (no Arcade bodies), sub-stepped so
// fast shots never tunnel, tile collision via LevelQuery.solidAt, hurtbox hits via the damage service.
// Emits projectile:impact with the material it hit. Allocation-free per frame once the pool is warm.
//
//   ctx.projectiles.spawn({ x, y, vx: 420 * facing, vy: 0, team: 'player', damage: 1, texture: 'pistol_bullet', weapon: 'pistol' });
import Phaser from 'phaser';
import type { DamageService, HitInfo, Hurtbox, ImpactMaterial, LevelPhysics, Team } from './contracts';
import type { EventBus } from './events';
import type { CameraController } from './camera';
import { DEPTH } from './depth';
import { TEX } from './textures';
import { ENGINE } from '../config/tuning/engine';
import { hasAnim } from './anims';

export interface ImpactInfo {
    x: number;
    y: number;
    material: ImpactMaterial;
    /** The hurtbox hit, or null for terrain. */
    hurtbox: Hurtbox | null;
    /** Surface normal for terrain hits (axis-aligned), 0,0 for hurtbox hits. */
    normalX: number;
    normalY: number;
}

export interface ProjectileSpec {
    x: number;
    y: number;
    /** px/s */
    vx: number;
    vy: number;
    team: Team;
    damage: number;
    /** Texture key (falls back to the engine bullet if missing). */
    texture?: string;
    frame?: string | number;
    /** Animation key to play (looped by the anim's own config). */
    anim?: string;
    /** px/s² (grenades, arcing shots). Default 0. */
    gravity?: number;
    /** ms before it expires in the air. Default 2000. */
    lifetime?: number;
    /** How many extra hurtboxes it passes through (flame/rail). Default 0. Infinity = never stops on hurtboxes. */
    pierce?: number;
    /**
     * Phase B: with pierce, the same hurtbox may be hit again after this many ms of projectile age (flame tick
     * damage per target). Default: each hurtbox is hit once per projectile.
     */
    rehitMs?: number;
    /** Hit radius in px. Default 2. */
    radius?: number;
    weapon?: string;
    kind?: HitInfo['kind'];
    /** Collide with solid tiles. Default true. */
    collideTiles?: boolean;
    /** Rotate the sprite to its velocity. Default true. */
    rotate?: boolean;
    /** Skip the projectile:impact event (when onImpact makes its own effect). Default false. */
    silent?: boolean;
    depth?: number;
    scale?: number;
    tint?: number;
    alpha?: number;
    /**
     * Called on any impact (hurtbox or terrain). Return true to keep the projectile alive (bounce, stick, etc.):
     * you may change p.vx/p.vy inside. The `impact` object is reused: don't keep it.
     */
    onImpact?(p: Projectile, impact: ImpactInfo): boolean | void;
    /**
     * Phase B: called on every hurtbox hit that connected, including pierced ones (onImpact only sees the hit
     * that stops the projectile). Use it for per-target effects (flame ignite, rocket bypass bookkeeping).
     */
    onHit?(p: Projectile, impact: ImpactInfo): void;
    /** Called every frame before moving with scaled dt in seconds (seeking, acceleration). Return false to kill. */
    onUpdate?(p: Projectile, dt: number): boolean | void;
    /** Called when the lifetime runs out (e.g. a grenade fuse or rocket fizzle). */
    onExpire?(p: Projectile): void;
    /** Free slot for the owning team's data (e.g. bounce count). */
    data?: Record<string, unknown>;
}

const MAX_PIERCE_MEMORY = 32;

export class Projectile {
    readonly sprite: Phaser.GameObjects.Sprite;
    active = false;
    /** In the pool (not in the live list). Guards against a double release. */
    pooled = true;
    x = 0; y = 0; vx = 0; vy = 0;
    gravity = 0;
    team: Team = 'player';
    damage = 1;
    age = 0;
    lifetime = 0;
    pierce = 0;
    rehitMs = 0;
    radius = 2;
    weapon: string | undefined;
    kind: HitInfo['kind'] = 'bullet';
    collideTiles = true;
    rotate = true;
    silent = false;
    onImpact: ProjectileSpec['onImpact'];
    onUpdate: ProjectileSpec['onUpdate'];
    onExpire: ProjectileSpec['onExpire'];
    onHit: ProjectileSpec['onHit'];
    data: Record<string, unknown> | undefined;
    /** Hurtboxes already hit (pierce), so one box is hit once per projectile. */
    readonly hitList: Hurtbox[] = [];
    /** Projectile age (ms) when each hitList entry was hit (parallel array, for rehitMs). */
    readonly hitAge: number[] = [];

    /** Remember a hurtbox so it isn't hit again (until rehitMs). Oldest entry is dropped when full. */
    remember(h: Hurtbox): void {
        if (this.hitList.length >= MAX_PIERCE_MEMORY) { this.hitList.shift(); this.hitAge.shift(); }
        this.hitList.push(h);
        this.hitAge.push(this.age);
    }

    constructor(scene: Phaser.Scene) {
        this.sprite = scene.add.sprite(0, 0, TEX.bullet).setActive(false).setVisible(false);
    }

    /** Remove it (no impact event): hidden now, recycled by the system's next update. Safe from any callback. */
    kill(): void {
        this.active = false;
        this.sprite.setVisible(false);
    }
}

export class ProjectileSystem {
    private readonly pool: Projectile[] = [];
    private readonly live: Projectile[] = [];
    private readonly impact: ImpactInfo = { x: 0, y: 0, material: 'dirt', hurtbox: null, normalX: 0, normalY: 0 };
    private readonly hitInfo: HitInfo = { damage: 0, source: 'player', x: 0, y: 0, dirX: 0, dirY: 0, kind: 'bullet' };
    /**
     * True while update() walks `live`. Team callbacks run inside it (onHit → damage.deal → a boss dies →
     * clear('enemy')), so nothing may splice `live` then: clear()/kill() only deactivate, update() and sweep() recycle.
     */
    private updating = false;

    constructor(
        private readonly scene: Phaser.Scene,
        private readonly events: EventBus,
        private readonly damage: DamageService,
        private readonly level: LevelPhysics,
        private readonly camera: CameraController
    ) {}

    /** Warm the pool so the first firefight doesn't allocate. */
    prewarm(n: number): void {
        for (let i = this.pool.length; i < n; i++) this.pool.push(new Projectile(this.scene));
    }

    spawn(s: ProjectileSpec): Projectile | null {
        if (this.live.length >= ENGINE.projectiles.max) return null;
        const p = this.pool.pop() ?? new Projectile(this.scene);
        p.active = true;
        p.pooled = false;
        p.x = s.x; p.y = s.y; p.vx = s.vx; p.vy = s.vy;
        p.gravity = s.gravity ?? 0;
        p.team = s.team;
        p.damage = s.damage;
        p.age = 0;
        p.lifetime = s.lifetime ?? ENGINE.projectiles.defaultLifetimeMs;
        p.pierce = s.pierce ?? 0;
        p.rehitMs = s.rehitMs ?? 0;
        p.radius = s.radius ?? ENGINE.projectiles.defaultRadius;
        p.weapon = s.weapon;
        p.kind = s.kind ?? 'bullet';
        p.collideTiles = s.collideTiles ?? true;
        p.rotate = s.rotate ?? true;
        p.silent = s.silent ?? false;
        p.onImpact = s.onImpact;
        p.onUpdate = s.onUpdate;
        p.onExpire = s.onExpire;
        p.onHit = s.onHit;
        p.data = s.data;
        p.hitList.length = 0;
        p.hitAge.length = 0;

        const spr = p.sprite;
        const tex = s.texture && this.scene.textures.exists(s.texture) ? s.texture : s.team === 'enemy' ? TEX.enemyBullet : TEX.bullet;
        spr.setTexture(tex, s.frame);
        spr.setActive(true).setVisible(true).setPosition(s.x, s.y)
            .setDepth(s.depth ?? DEPTH.PROJECTILES).setScale(s.scale ?? 1).setAlpha(s.alpha ?? 1).setRotation(0).setFlipX(false);
        if (s.tint !== undefined) spr.setTint(s.tint); else spr.clearTint();
        // hasAnim, not anims.exists: a zero-frame animation exists but play() throws.
        if (s.anim && hasAnim(this.scene, s.anim)) spr.play(s.anim);
        else spr.stop();
        if (p.rotate) spr.setRotation(Math.atan2(p.vy, p.vx));
        this.live.push(p);
        return p;
    }

    /** Engine calls this every frame with scaled dt (ms). */
    update(dtMs: number): void {
        if (dtMs <= 0) { this.sweep(); return; }
        this.updating = true;
        try {
            this.run(dtMs);
        } finally {
            this.updating = false;
        }
    }

    private run(dtMs: number): void {
        const dt = dtMs / 1000;
        const view = this.camera.view();
        const m = ENGINE.projectiles.offscreenMargin;
        const left = view.x - m, right = view.right + m, top = view.y - m * 3, bottom = view.bottom + m;
        for (let i = this.live.length - 1; i >= 0; i--) {
            const p = this.live[i];
            if (p.active) {
                try {
                    this.step(p, dt, dtMs);
                } catch (e) {
                    // A team callback (onUpdate/onImpact/onHit/onExpire) threw: drop this projectile, keep the rest.
                    p.active = false;
                    this.reportError(p, e);
                }
            }
            if (p.active && (p.x < left || p.x > right || p.y < top || p.y > bottom)) p.active = false;
            if (!p.active) this.removeAt(i);
        }
    }

    /**
     * Swap-remove live[i] and return it to the pool. Only update()'s own loop and sweep() call it: callbacks can only
     * append to `live` (spawn), never remove, so the backwards walk stays valid.
     */
    private removeAt(i: number): void {
        const p = this.live[i];
        const last = this.live.pop()!;
        if (i < this.live.length) this.live[i] = last;
        this.recycle(p);
    }

    /** Recycle every inactive live projectile (hit-stop frames, clear() outside update). */
    private sweep(): void {
        if (this.updating) return;
        for (let i = this.live.length - 1; i >= 0; i--) if (!this.live[i].active) this.removeAt(i);
    }

    private step(p: Projectile, dt: number, dtMs: number): void {
        if (p.onUpdate && p.onUpdate(p, dt) === false) { p.active = false; return; }
        if (!p.active) return;
        p.age += dtMs;
        if (p.rehitMs > 0) {
            for (let i = p.hitAge.length - 1; i >= 0; i--) {
                if (p.age - p.hitAge[i] >= p.rehitMs) { p.hitList.splice(i, 1); p.hitAge.splice(i, 1); }
            }
        }
        if (p.age >= p.lifetime) {
            p.onExpire?.(p);
            p.active = false;
            return;
        }
        p.vy += p.gravity * dt;
        const dx = p.vx * dt, dy = p.vy * dt;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const steps = Math.max(1, Math.ceil(dist / ENGINE.projectiles.substepPx));
        const sx = dx / steps, sy = dy / steps;
        for (let k = 0; k < steps && p.active; k++) {
            const px = p.x, py = p.y;
            p.x += sx; p.y += sy;
            if (p.collideTiles && this.level.solidAt(p.x, p.y)) {
                this.terrainImpact(p, px, py);
                continue;
            }
            const h = this.damage.queryCircle(p.x, p.y, p.radius, p.team, p.hitList);
            if (h) this.hurtboxImpact(p, h);
        }
        const spr = p.sprite;
        spr.x = p.x; spr.y = p.y;
        if (p.rotate && (p.gravity !== 0 || p.onUpdate)) spr.rotation = Math.atan2(p.vy, p.vx);
    }

    private terrainImpact(p: Projectile, px: number, py: number): void {
        const imp = this.impact;
        // Axis-aligned normal: which axis move put us into the wall?
        const hitX = this.level.solidAt(p.x, py);
        const hitY = this.level.solidAt(px, p.y);
        imp.normalX = hitX || !hitY ? -Math.sign(p.vx) : 0;
        imp.normalY = hitY ? -Math.sign(p.vy) : 0;
        imp.x = px; imp.y = py;
        imp.material = this.level.materialAt(p.x, p.y);
        imp.hurtbox = null;
        // Step back out of the wall so bounces start from free space.
        p.x = px; p.y = py;
        this.finishImpact(p);
    }

    private hurtboxImpact(p: Projectile, h: Hurtbox): void {
        const info = this.hitInfo;
        const speed = Math.hypot(p.vx, p.vy) || 1;
        info.damage = p.damage; info.source = p.team; info.kind = p.kind; info.weapon = p.weapon;
        info.x = p.x; info.y = p.y; info.dirX = p.vx / speed; info.dirY = p.vy / speed;
        if (!this.damage.deal(h, info)) {
            // Didn't connect (e.g. dying enemy): remember it and fly on.
            p.remember(h);
            return;
        }
        const imp = this.impact;
        imp.x = p.x; imp.y = p.y; imp.material = h.material ?? 'flesh'; imp.hurtbox = h;
        imp.normalX = 0; imp.normalY = 0;
        p.onHit?.(p, imp);
        if (p.pierce > 0) {
            p.pierce--;
            p.remember(h);
            this.emitImpact(p);
            return;
        }
        this.finishImpact(p);
    }

    private finishImpact(p: Projectile): void {
        this.emitImpact(p);
        const keep = p.onImpact ? p.onImpact(p, this.impact) === true : false;
        if (!keep) p.active = false;
    }

    private emitImpact(p: Projectile): void {
        if (p.silent) return;
        const imp = this.impact;
        this.events.emit('projectile:impact', { x: imp.x, y: imp.y, material: imp.material, weapon: p.weapon, team: p.team });
    }

    private recycle(p: Projectile): void {
        if (p.pooled) return;
        p.pooled = true;
        p.active = false;
        p.onImpact = p.onUpdate = p.onExpire = p.onHit = undefined;
        p.data = undefined;
        p.hitList.length = 0;
        p.hitAge.length = 0;
        p.sprite.stop();
        p.sprite.setActive(false).setVisible(false);
        this.pool.push(p);
    }

    /**
     * Remove every live projectile (optionally only one team's), e.g. on respawn or boss death. Safe to call from
     * inside any projectile callback: during update() they are only deactivated and hidden, and recycled by it.
     */
    clear(team?: Team): void {
        for (let i = 0; i < this.live.length; i++) {
            const p = this.live[i];
            if (team && p.team !== team) continue;
            p.kill();
        }
        this.sweep();
    }

    /** Live (active) projectiles of both teams. */
    get count(): number { return this.countTeam(); }

    /** Phase B: live projectiles of one team. */
    countTeam(team?: Team): number {
        let n = 0;
        for (let i = 0; i < this.live.length; i++) if (this.live[i].active && (!team || this.live[i].team === team)) n++;
        return n;
    }

    private readonly reported = new Set<string>();

    private reportError(p: Projectile, e: unknown): void {
        const key = `${p.team}:${p.weapon ?? '?'}`;
        if (this.reported.has(key)) return;
        this.reported.add(key);
        console.error(`[projectiles] callback of a '${key}' projectile threw (projectile removed; further errors for it muted):`, e);
    }

    /** Iterate live projectiles (e.g. a shield that deflects enemy shots). */
    forEach(fn: (p: Projectile) => void): void {
        for (let i = 0; i < this.live.length; i++) if (this.live[i].active) fn(this.live[i]);
    }
}
