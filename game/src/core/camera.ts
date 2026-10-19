// Metal Slug camera: forward-only horizontal scrolling with deadzone + look-ahead, vertical follow inside the
// level bounds, arena lock/unlock with an eased transition, and shake tiers that respect the options flag.
// Scroll is computed manually at POST_UPDATE (after physics), so there's no Phaser startFollow.
// Shake is our own scroll-space offset, not Phaser's cam.shake (which offsets the render past the world bounds
// and exposed flat background strips at the level edges, KBE-QA-E02). An offset that would leave the world bounds
// is reflected back inside, so the shake keeps its full amplitude even when the camera sits against an edge.
import Phaser from 'phaser';
import type { CameraService, Hurtbox, PlayerQuery, ShakeTier } from './contracts';
import type { EventBus } from './events';
import { settings } from './settings';
import { createRng } from './rng';
import { PARAMS } from './params';
import { ENGINE } from '../config/tuning/engine';
import { DEPTH } from './depth';

interface FollowTarget { x: number; y: number; facing?: number; sprite?: { body?: unknown }; body?: unknown }

/** Arcade body of the follow target, if any. */
function bodyOf(t: FollowTarget): Phaser.Physics.Arcade.Body | undefined {
    return (t.sprite?.body ?? t.body) as Phaser.Physics.Arcade.Body | undefined;
}

/** A 0..1 value easing from `from` to `to` over `ms` (Sine.InOut). */
class Ramp {
    value = 0;
    private from = 0;
    private to = 0;
    private t = 1;
    private ms = 1;
    set(to: number, ms: number): void {
        this.from = this.value;
        this.to = to;
        this.ms = Math.max(1, ms);
        this.t = ms > 0 ? 0 : 1;
        if (this.t >= 1) this.value = to;
    }
    step(dtMs: number): void {
        if (this.t >= 1) return;
        this.t = Math.min(1, this.t + dtMs / this.ms);
        this.value = Phaser.Math.Linear(this.from, this.to, Phaser.Math.Easing.Sine.InOut(this.t));
    }
    get target(): number { return this.to; }
}

/** On the ground? null when the target has no Arcade body to ask. */
function isGrounded(t: FollowTarget): boolean | null {
    const b = bodyOf(t);
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
    /** Run lead (px, signed): eased toward the player's actual movement direction. */
    private runLead = 0;
    /** focus()/release(): eased weight toward the focus point (cosmetic offset on top of the follow camera). */
    private readonly focusW = new Ramp();
    private focusPX = 0;
    private focusPY = 0;
    /** Rendered (steady, pre-shake) scroll, i.e. follow camera + focus offset. */
    private rx = 0;
    private ry = 0;
    private readonly bars = new Ramp();
    private readonly barTop: Phaser.GameObjects.Rectangle;
    private readonly barBottom: Phaser.GameObjects.Rectangle;
    private punchLeft = 0;
    private punchDur = 0;
    private punchAmt = 0;
    /** Boss-intro cinematic: 'off' | 'intro' (waiting for boss:spawn) | 'hold' (counting down to release). */
    private cine: 'off' | 'intro' | 'hold' = 'off';
    private cineLeft = 0;
    /** Boss framing: the framed object (explicit or found from boss:spawn), its last known bounds and the blend. */
    private frameObj: Phaser.GameObjects.GameObject | null = null;
    /** boss:spawn position while the boss object isn't resolved yet (its hurtboxes may register a frame later). */
    private framePending: { x: number; y: number } | null = null;
    private readonly frameRect = new Phaser.Geom.Rectangle();
    private frameHave = false;
    private readonly frameW = new Ramp();

    constructor(scene: Phaser.Scene, private readonly events: EventBus, private readonly playerQuery: () => PlayerQuery | null,
        private readonly onCinematic: (on: boolean) => void = () => {},
        private readonly damage: { forEach(fn: (h: Hurtbox) => void): void } | null = null) {
        this.cam = scene.cameras.main;
        this.cam.setRoundPixels(true);
        // Bars are screen-fixed rects drawn above every gameplay band (the HUD scene still renders on top of them).
        // They're taller than needed so a zoom punch never shows a gap above/below them.
        const w = ENGINE.width, barH = ENGINE.height;
        this.barTop = scene.add.rectangle(-w, -barH, w * 3, barH, 0x000000).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.FX_TOP + 9).setVisible(false);
        this.barBottom = scene.add.rectangle(-w, ENGINE.height, w * 3, barH, 0x000000).setOrigin(0, 0).setScrollFactor(0).setDepth(DEPTH.FX_TOP + 9).setVisible(false);
        events.on('fx:shake', e => this.shake(e.tier));
        events.on('fx:flash', e => this.flash(e.color, e.ms));
        events.on('boss:intro', e => this.bossIntro(e.x, e.y));
        events.on('boss:spawn', e => {
            // Boss framing: find the boss from its hurtboxes near the spawn point (resolved lazily in update()).
            if (!this.frameObj) {
                this.framePending = { x: e.x ?? NaN, y: e.y ?? NaN };
                this.frameHave = false;
            }
            if (this.cine !== 'intro') return;
            this.cine = 'hold';
            this.cineLeft = T.bossIntro.holdAfterSpawnMs;
        });
        // Death, respawn or a warp ends it at once (no dangling bars or shield).
        events.on('player:died', () => this.endCinematic(0));
        events.on('game:respawn', () => this.endCinematic(0));
        // Release the boss framing after the death chain (boss:defeated) or whenever the arena opens.
        events.on('boss:defeated', () => this.frameTarget(null));
        events.on('camera:unlock', () => this.frameTarget(null));
    }

    // ---- Phase F camera API ------------------------------------------------------------------------------------

    letterbox(on: boolean, ms = 400): void {
        this.bars.set(on ? 1 : 0, ms);
    }

    zoomPunch(amount: number, ms = 220): void {
        if (!settings.get().shake || !(amount > 0) || !(ms > 0)) return;
        const a = Math.min(amount, T.zoomPunchMax);
        ms = Math.min(ms, T.zoomPunchMaxMs);
        // A weaker punch never cuts a stronger running one short.
        if (this.punchLeft > 0 && a <= this.punchAmt * this.punchEnv()) return;
        this.punchAmt = a;
        this.punchDur = this.punchLeft = ms;
    }

    focus(x: number, y: number, ms = 800): void {
        this.focusPX = x;
        this.focusPY = y;
        this.focusW.set(1, ms);
    }

    release(ms = 800): void {
        this.focusW.set(0, ms);
    }

    inCinematic(): boolean { return this.cine !== 'off'; }

    frameTarget(obj: Phaser.GameObjects.GameObject | null): void {
        this.framePending = null;
        this.frameObj = obj;
        this.frameHave = false;
        if (!obj) this.frameW.set(0, T.bossFrame.easeOutMs);
    }

    /** Resolve a pending boss:spawn to the enemy hurtbox owner nearest the spawn point. */
    private resolveFrame(): void {
        const pend = this.framePending;
        if (!pend || !this.damage) return;
        let best: Phaser.GameObjects.GameObject | null = null, bestD = Infinity;
        this.damage.forEach(h => {
            if (h.team !== 'enemy' || !h.owner || !h.alive()) return;
            const o = h.owner as unknown as { x?: number; y?: number };
            if (typeof o.x !== 'number' || typeof o.y !== 'number') return;
            const d = Number.isFinite(pend.x) ? Math.abs(o.x - pend.x) + Math.abs(o.y - pend.y) : 0;
            if (d < bestD) { bestD = d; best = h.owner!; }
        });
        // Only accept the boss itself (its origin is the spawn point), not a grunt that happens to be nearby.
        if (best && bestD <= 4) { this.frameObj = best; this.framePending = null; }
    }

    /** Union of the framed object's live hurtboxes (else its display bounds) into frameRect; keeps the last one. */
    private measureFrame(): void {
        const obj = this.frameObj;
        if (!obj) return;
        if (!obj.active) { this.frameTarget(null); return; }
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        this.damage?.forEach(h => {
            if (h.owner !== obj || !h.alive()) return;
            const b = h.body;
            const r = typeof b === 'function' ? b() : b instanceof Phaser.Geom.Rectangle ? b : null;
            const bx = r ? r.x : (b as Phaser.Physics.Arcade.Body).x, by = r ? r.y : (b as Phaser.Physics.Arcade.Body).y;
            const bw = r ? r.width : (b as Phaser.Physics.Arcade.Body).width, bh = r ? r.height : (b as Phaser.Physics.Arcade.Body).height;
            x0 = Math.min(x0, bx); y0 = Math.min(y0, by); x1 = Math.max(x1, bx + bw); y1 = Math.max(y1, by + bh);
        });
        if (x1 < x0) {
            const g = obj as unknown as { getBounds?: () => Phaser.Geom.Rectangle };
            // No live hurtbox (dying, invulnerable phase): keep the last bounds rather than snapping away.
            if (this.frameHave || typeof g.getBounds !== 'function') return;
            const r = g.getBounds();
            x0 = r.x; y0 = r.y; x1 = r.right; y1 = r.bottom;
        }
        this.frameRect.setTo(x0, y0, x1 - x0, y1 - y0);
        if (!this.frameHave) this.frameW.set(1, T.bossFrame.easeInMs);
        this.frameHave = true;
    }

    /** Scroll x that keeps the boss rect and the player on screen, as close to `x` as possible (player wins). */
    private framedX(x: number, px: number | null): number {
        const w = this.cam.width, F = T.bossFrame, r = this.frameRect;
        let lo = r.right + F.pad - w, hi = r.x - F.pad;
        if (lo > hi) lo = hi = (r.x + r.right) / 2 - w / 2; // wider than the view: center it
        x = Phaser.Math.Clamp(x, lo, hi);
        if (px !== null) x = Phaser.Math.Clamp(x, px + F.playerMargin - w, px - F.playerMargin);
        return Phaser.Math.Clamp(x, this.lockX0, this.lockX1 - w);
    }

    /** Boss intro: bars in, slow push toward the boss/gate, shield the player; released 1 s after boss:spawn. */
    private bossIntro(x: number, y: number): void {
        const c = T.bossIntro;
        this.cine = 'intro';
        this.cineLeft = c.timeoutMs;
        this.onCinematic(true);
        this.letterbox(true, c.letterboxMs);
        // Push part of the way from the current view center toward the point. Reduced motion (shake off): bars only.
        if (settings.get().shake) {
            const cx = this.x + this.cam.width / 2, cy = this.y + this.cam.height * T.anchorY;
            this.focus(cx + (x - cx) * c.pushAmount, cy + (y - cy) * c.pushAmount * 0.5, c.pushMs);
        }
    }

    private endCinematic(releaseMs: number): void {
        if (this.cine === 'off') return;
        this.cine = 'off';
        this.onCinematic(false);
        this.letterbox(false, releaseMs > 0 ? T.bossIntro.letterboxMs : 0);
        this.release(releaseMs);
    }

    private punchEnv(): number {
        if (this.punchLeft <= 0 || this.punchDur <= 0) return 0;
        // Fast attack (first 25%), eased decay.
        const t = 1 - this.punchLeft / this.punchDur;
        return t < 0.25 ? Math.sin((t / 0.25) * Math.PI / 2) : Phaser.Math.Easing.Sine.InOut(1 - (t - 0.25) / 0.75);
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
        this.runLead = 0;
        this.endCinematic(0);
        this.focusW.set(0, 0);
        let sx = x - this.cam.width * T.anchorX;
        if (this.locked && x >= this.lockX0 && x <= this.lockX1) sx = Phaser.Math.Clamp(sx, this.lockX0, this.lockX1 - this.cam.width);
        this.x = this.clampScrollX(sx);
        this.y = this.clampScrollY(y - this.cam.height * T.anchorY);
        this.blend = 1;
        this.blendFrom = this.x;
        this.minScroll = this.x;
        this.rx = this.x;
        this.ry = this.y;
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
        let l = this.leftEdge() + halfW;
        let r = this.rightEdge() - halfW;
        // Boss framing pins the view, so the player keeps the framing margin from the screen edges instead of the
        // camera following them out (eased with the framing blend; never past the arena walls).
        const fw = this.locked && this.frameHave ? this.frameW.value : 0;
        if (fw > 0) {
            const m = (T.bossFrame.playerMargin - halfW) * fw;
            if (m > 0 && r - l > 2 * m) { l = Math.max(l, this.x + halfW + m); r = Math.min(r, this.x + this.cam.width - halfW - m); }
        }
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
            // Run lead: a few px more in the direction the player actually moves (standing still eases it out).
            const vx = bodyOf(t)?.velocity?.x ?? 0;
            const lead = Math.abs(vx) > T.runLeadMinSpeed ? Math.sign(vx) * T.runLead : 0;
            this.runLead += (lead - this.runLead) * (1 - Math.exp(-T.runLeadRate * dt));
        }

        let desiredX = this.focusX + this.look + this.runLead - w * T.anchorX;
        const desiredY = this.clampScrollY(this.focusY - h * T.anchorY);

        if (this.locked) {
            desiredX = Phaser.Math.Clamp(desiredX, this.lockX0, this.lockX1 - w);
            // Boss framing: blend toward a scroll that keeps both the boss and the player on screen.
            if (this.framePending) this.resolveFrame();
            this.measureFrame();
            this.frameW.step(dt * 1000);
            const fw = this.frameW.value;
            if (fw > 0 && this.frameHave) desiredX = Phaser.Math.Linear(desiredX, this.framedX(desiredX, t ? t.x : null), fw);
        } else {
            this.frameW.step(dt * 1000);
            if (T.forwardOnly) desiredX = Math.max(desiredX, this.minScroll);
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
        const dtMs = dt * 1000;
        this.tickCinematic(dtMs);
        // Focus: a cosmetic offset on top of the follow camera (forward-only, minScroll and the arena clamps stay on
        // the follow camera). Capped, and the player always stays focusPlayerMargin inside the rendered view.
        this.focusW.step(dtMs);
        let rx = this.x, ry = this.y;
        const fw = this.focusW.value;
        if (fw > 0) {
            const ox = Phaser.Math.Clamp(this.focusPX - w / 2 - this.x, -T.focusMaxPushX, T.focusMaxPushX);
            const oy = Phaser.Math.Clamp(this.focusPY - h * T.anchorY - this.y, -T.focusMaxPushY, T.focusMaxPushY);
            rx = this.x + ox * fw;
            ry = this.y + oy * fw;
            const p = t ?? null;
            if (p) {
                const m = T.focusPlayerMargin;
                rx = Phaser.Math.Clamp(rx, Math.min(this.x, p.x + m - w), Math.max(this.x, p.x - m));
            }
            // Never show outside a locked arena (rules review F4); the follow camera itself may still be blending in.
            if (this.locked) rx = Phaser.Math.Clamp(rx, Math.min(this.x, this.lockX0), Math.max(this.x, this.lockX1 - w));
            rx = this.clampScrollX(rx);
            ry = this.clampScrollY(ry);
        }
        this.rx = rx;
        this.ry = ry;
        let sx = rx, sy = ry;
        if (this.shakeLeft > 0) {
            if (!settings.get().shake) this.shakeLeft = 0;
            else {
                const k = this.envelope();
                const b = this.bounds;
                sx = reflect(rx + (this.shakeRng.next() * 2 - 1) * this.shakeAmpX * k, b.x, b.right - w);
                sy = reflect(ry + (this.shakeRng.next() * 2 - 1) * this.shakeAmpY * k, b.y, b.bottom - h);
                this.shakeLeft -= dtMs;
            }
        }
        // The shake (and focus) only move the rendered scroll: view(), edges and clamps stay on the steady camera.
        this.cam.setScroll(sx, sy);
        this.updateZoomAndBars(dtMs);
        this.updateView();
    }

    private tickCinematic(dtMs: number): void {
        if (this.cine === 'off') return;
        if ((this.cineLeft -= dtMs) > 0) return;
        this.endCinematic(T.bossIntro.releaseMs);
    }

    private updateZoomAndBars(dtMs: number): void {
        let z = 1;
        if (this.punchLeft > 0) {
            if (!settings.get().shake) this.punchLeft = 0;
            else {
                z = 1 + this.punchAmt * this.punchEnv();
                this.punchLeft -= dtMs;
            }
        }
        if (this.cam.zoom !== z) this.cam.setZoom(z);
        this.bars.step(dtMs);
        const k = this.bars.value;
        const on = k > 0.001;
        this.barTop.setVisible(on);
        this.barBottom.setVisible(on);
        if (!on) return;
        // Screen-fixed objects still scale with the camera zoom around the view center: place the bars' inner
        // edges so they land on whole screen pixels at the current zoom.
        const h = this.cam.height, cy = h / 2;
        const edge = Math.round(T.letterboxPx * k);
        this.barTop.y = cy + (edge - cy) / z - this.barTop.height;
        this.barBottom.y = cy + (h - edge - cy) / z;
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
    debugInfo(): { x: number; minScroll: number; locked: boolean; x0: number; x1: number; blend: number; rx: number; ry: number; focus: number; bars: number; zoom: number; cine: string; frame: number; frameRect: { x: number; y: number; width: number; height: number } | null } {
        return { x: this.x, minScroll: this.minScroll, locked: this.locked, x0: this.lockX0, x1: this.lockX1, blend: this.blend,
            rx: this.rx, ry: this.ry, focus: this.focusW.value, bars: this.bars.value, zoom: this.cam.zoom, cine: this.cine,
            frame: this.frameW.value, frameRect: this.frameHave ? { x: this.frameRect.x, y: this.frameRect.y, width: this.frameRect.width, height: this.frameRect.height } : null };
    }
}

/** Fold v back into [lo, hi] (mirror at the edges); a range narrower than zero pins to lo. */
function reflect(v: number, lo: number, hi: number): number {
    if (hi <= lo) return lo;
    if (v < lo) v = 2 * lo - v;
    if (v > hi) v = 2 * hi - v;
    return v < lo ? lo : v;
}
