// Metal Slug camera: forward-only horizontal scrolling with deadzone + look-ahead, vertical follow inside the
// level bounds, arena lock/unlock with an eased transition, and shake tiers that respect the options flag.
// Scroll is computed manually at POST_UPDATE (after physics), so there's no Phaser startFollow.
// Shake is our own scroll-space offset, not Phaser's cam.shake (which offsets the render past the world bounds
// and exposed flat background strips at the level edges, KBE-QA-E02). An offset that would leave the world bounds
// is reflected back inside, so the shake keeps its full amplitude even when the camera sits against an edge.
import Phaser from 'phaser';
import type { CameraService, PlayerQuery, ShakeTier } from './contracts';
import type { EventBus } from './events';
import { settings } from './settings';
import { createRng } from './rng';
import { PARAMS } from './params';
import { ENGINE } from '../config/tuning/engine';

interface FollowTarget { x: number; y: number; facing?: number; sprite?: { body?: unknown }; body?: unknown }

/** On the ground? null when the target has no Arcade body to ask. */
function isGrounded(t: FollowTarget): boolean | null {
    const b = (t.sprite?.body ?? t.body) as Phaser.Physics.Arcade.Body | undefined;
    if (!b || !b.blocked) return null;
    return b.blocked.down || b.touching.down;
}

const T = ENGINE.camera;

export class CameraController implements CameraService {
    readonly cam: Phaser.Cameras.Scene2D.Camera;
    private target: FollowTarget | null = null;
    private bounds = new Phaser.Geom.Rectangle(0, 0, ENGINE.width, ENGINE.height);
    private focusX = 0;
    private focusY = 0;
    private look = 0;
    private minScroll = -Infinity;
    private locked = false;
    private lockX0 = 0;
    private lockX1 = 0;
    /** 0..1 progress of the lock/unlock transition (1 = settled). */
    private blend = 1;
    private blendFrom = 0;
    private readonly viewRect = new Phaser.Geom.Rectangle();
    private x = 0;
    private y = 0;
    private falling = false;
    /** Shake jitter has its own seeded stream: ?seed= runs (turbo audits) see the same view every time. */
    private readonly shakeRng = createRng(PARAMS.seed);
    private shakeLeft = 0;
    private shakeDur = 0;
    private shakeAmpX = 0;
    private shakeAmpY = 0;

    constructor(scene: Phaser.Scene, private readonly events: EventBus, private readonly playerQuery: () => PlayerQuery | null) {
        this.cam = scene.cameras.main;
        this.cam.setRoundPixels(true);
        events.on('fx:shake', e => this.shake(e.tier));
        events.on('fx:flash', e => this.flash(e.color, e.ms));
    }

    setBounds(b: Phaser.Geom.Rectangle): void {
        this.bounds.setTo(b.x, b.y, b.width, b.height);
        this.cam.setBounds(b.x, b.y, Math.max(b.width, this.cam.width), Math.max(b.height, this.cam.height));
        this.minScroll = -Infinity;
    }

    follow(t: Phaser.GameObjects.GameObject | null): void {
        this.target = t as unknown as FollowTarget | null;
        if (this.target) this.snapTo(this.target.x, this.target.y);
    }

    /**
     * Hard cut: finishes any running lock/unlock blend and restarts forward-only scrolling from the new view.
     * While locked, a snap point inside the arena lands the view inside it; a snap point outside it is a teleport
     * out (the caller unlocks next), so it isn't dragged back to the arena.
     */
    snapTo(x: number, y: number): void {
        this.focusX = x;
        this.focusY = y;
        this.look = 0;
        let sx = x - this.cam.width * T.anchorX;
        if (this.locked && x >= this.lockX0 && x <= this.lockX1) sx = Phaser.Math.Clamp(sx, this.lockX0, this.lockX1 - this.cam.width);
        this.x = this.clampScrollX(sx);
        this.y = this.clampScrollY(y - this.cam.height * T.anchorY);
        this.blend = 1;
        this.blendFrom = this.x;
        this.minScroll = this.x;
        this.cam.setScroll(this.x, this.y);
        this.updateView();
    }

    lock(x0: number, x1: number): void {
        this.blendFrom = this.x;
        this.locked = true;
        this.lockX0 = x0;
        this.lockX1 = Math.max(x1, x0 + this.cam.width);
        this.blend = 0;
        this.events.emit('camera:lock', { x0, x1: this.lockX1 });
    }

    unlock(): void {
        if (!this.locked) return;
        this.locked = false;
        this.blendFrom = this.x;
        this.blend = 0;
        // Resume forward scrolling from where the arena left the camera.
        this.minScroll = this.x;
        this.events.emit('camera:unlock', {});
    }

    isLocked(): boolean { return this.locked; }

    shake(tier: ShakeTier): void {
        if (!settings.get().shake) return;
        const s = ENGINE.shake[tier] ?? ENGINE.shake[1];
        const ax = s.intensity * this.cam.width, ay = s.intensity * this.cam.height;
        // A weaker shake never cuts a stronger one short; a stronger one takes over at full amplitude.
        if (this.shakeLeft > 0 && ax * s.ms <= this.shakeAmpX * this.envelope() * this.shakeLeft) return;
        this.shakeAmpX = ax;
        this.shakeAmpY = ay;
        this.shakeDur = this.shakeLeft = s.ms;
    }

    /** Remaining shake strength 0..1: holds near full for the first frames, then eases out. */
    private envelope(): number {
        return this.shakeDur > 0 ? Math.sqrt(Math.max(0, this.shakeLeft) / this.shakeDur) : 0;
    }

    flash(color: number, ms: number): void {
        const k = settings.get().reducedFlash ? 0.35 : 1;
        if (k < 1) ms *= 0.5;
        this.cam.flash(ms, ((color >> 16) & 0xff) * k, ((color >> 8) & 0xff) * k, (color & 0xff) * k, true);
    }

    leftEdge(): number { return this.locked ? Math.max(this.x, this.lockX0) : this.x; }
    rightEdge(): number { return this.locked ? Math.min(this.x + this.cam.width, this.lockX1) : this.x + this.cam.width; }

    clampX(x: number, halfW = 8): number {
        const l = this.leftEdge() + halfW;
        const r = this.rightEdge() - halfW;
        return x < l ? l : x > r ? r : x;
    }

    view(): Phaser.Geom.Rectangle { return this.viewRect; }

    /** Called by the engine at POST_UPDATE with real dt (ms). Lock transitions run on real time (not hitstop). */
    update(rawDtMs: number): void {
        const dt = Math.min(rawDtMs, ENGINE.maxDeltaMs) / 1000;
        const p = this.playerQuery();
        const t: FollowTarget | null = p && p.alive() ? p : this.target ?? p;
        const w = this.cam.width, h = this.cam.height;

        if (t) {
            // Vertical: Metal Slug platform snap. Track the standing center from the feet (crouching doesn't move
            // it), follow it while grounded, and hold through jumps so hops never bob the view.
            const ty = t.y - T.centerAboveFeet;
            const grounded = isGrounded(t);
            this.falling = grounded === false && ty > this.focusY;
            if (grounded !== false) {
                if (ty > this.focusY + T.deadzoneY) this.focusY = ty - T.deadzoneY;
                else if (ty < this.focusY - T.deadzoneY) this.focusY = ty + T.deadzoneY;
            } else if (ty < this.focusY - T.airUp) this.focusY = ty + T.airUp;
            else if (ty > this.focusY + T.airDown) this.focusY = ty - T.airDown;
            // Horizontal deadzone: the focus only moves when the target leaves the window around it.
            if (t.x > this.focusX + T.deadzoneX) this.focusX = t.x - T.deadzoneX;
            else if (t.x < this.focusX - T.deadzoneX) this.focusX = t.x + T.deadzoneX;
            const facing = t.facing ?? 1;
            this.look += (facing * T.lookAhead - this.look) * (1 - Math.exp(-T.lookAheadRate * dt));
        }

        let desiredX = this.focusX + this.look - w * T.anchorX;
        const desiredY = this.clampScrollY(this.focusY - h * T.anchorY);

        if (this.locked) {
            desiredX = Phaser.Math.Clamp(desiredX, this.lockX0, this.lockX1 - w);
        } else if (T.forwardOnly) {
            desiredX = Math.max(desiredX, this.minScroll);
        }
        desiredX = this.clampScrollX(desiredX);

        if (this.blend < 1) {
            this.blend = Math.min(1, this.blend + (dt * 1000) / T.lockTweenMs);
            this.x = Phaser.Math.Linear(this.blendFrom, desiredX, Phaser.Math.Easing.Sine.InOut(this.blend));
        } else {
            this.x += (desiredX - this.x) * (1 - Math.exp(-T.followRateX * dt));
            if (Math.abs(desiredX - this.x) < 0.01) this.x = desiredX;
        }
        if (T.forwardOnly && !this.locked && this.blend >= 1) this.x = Math.max(this.x, this.minScroll);
        // Falls catch up faster than climbs/landings so a drop leads the view instead of dragging the margin.
        const rateY = this.falling && desiredY > this.y ? T.followRateFall : T.followRateY;
        this.y += (desiredY - this.y) * (1 - Math.exp(-rateY * dt));
        if (t) {
            // Hard margins: a long fall or a tall climb never outruns the smoothing off the screen.
            this.y = this.clampScrollY(Phaser.Math.Clamp(this.y, t.y - h + T.marginBottom, t.y - T.centerAboveFeet * 2 - T.marginTop));
        }

        if (!this.locked && this.x > this.minScroll) this.minScroll = this.x;
        let sx = this.x, sy = this.y;
        if (this.shakeLeft > 0) {
            if (!settings.get().shake) this.shakeLeft = 0;
            else {
                const k = this.envelope();
                const b = this.bounds;
                sx = reflect(this.x + (this.shakeRng.next() * 2 - 1) * this.shakeAmpX * k, b.x, b.right - w);
                sy = reflect(this.y + (this.shakeRng.next() * 2 - 1) * this.shakeAmpY * k, b.y, b.bottom - h);
                this.shakeLeft -= dt * 1000;
            }
        }
        // The shake only moves the rendered scroll: view(), edges and clamps stay on the steady camera.
        this.cam.setScroll(sx, sy);
        this.updateView();
    }

    private updateView(): void {
        this.viewRect.setTo(this.x, this.y, this.cam.width, this.cam.height);
    }

    private clampScrollX(x: number): number {
        const b = this.bounds;
        return Phaser.Math.Clamp(x, b.x, Math.max(b.x, b.right - this.cam.width));
    }

    private clampScrollY(y: number): number {
        const b = this.bounds;
        return Phaser.Math.Clamp(y, b.y, Math.max(b.y, b.bottom - this.cam.height));
    }

    /** Debug info for the overlay / __KBE.state(). */
    debugInfo(): { x: number; minScroll: number; locked: boolean; x0: number; x1: number; blend: number } {
        return { x: this.x, minScroll: this.minScroll, locked: this.locked, x0: this.lockX0, x1: this.lockX1, blend: this.blend };
    }
}

/** Fold v back into [lo, hi] (mirror at the edges); a range narrower than zero pins to lo. */
function reflect(v: number, lo: number, hi: number): number {
    if (hi <= lo) return lo;
    if (v < lo) v = 2 * lo - v;
    if (v > hi) v = 2 * hi - v;
    return v < lo ? lo : v;
}
