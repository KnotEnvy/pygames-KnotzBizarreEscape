// MenuInput: a menu's view of the engine's action-mapped input (keyboard + gamepad). Adds:
//   arming   nothing counts until every menu action is released once (the key that opened the menu, e.g. the
//            Escape that paused the game, must not immediately act inside the menu);
//   repeat   held up/down/left/right repeat after a delay, like a real menu cursor.
import Phaser from 'phaser';
import { createInput, type Action, type InputState } from '../core';
import { anyBoundKeyHeld } from './keys';

const MENU_ACTIONS: readonly Action[] = ['up', 'down', 'left', 'right', 'confirm', 'back', 'pause', 'jump', 'shoot'];
const REPEAT_DELAY = 340;
const REPEAT_EVERY = 105;

export class MenuInput {
    readonly raw: InputState;
    private armed = false;
    private age = 0;
    private repeatV = 0;
    private repeatH = 0;
    private v = 0;
    private h = 0;

    constructor(private readonly scene: Phaser.Scene) {
        this.raw = createInput(scene);
    }

    /** Call once per frame (real dt). */
    update(dt: number): void {
        this.age += dt;
        this.v = 0; this.h = 0;
        if (!this.armed) {
            let down = false;
            for (const a of MENU_ACTIONS) if (this.raw.isDown(a)) { down = true; break; }
            if (!down && !anyBoundKeyHeld(MENU_ACTIONS) && this.age >= 40) this.armed = true;
            return;
        }
        this.v = this.axis('up', 'down', dt, 'repeatV');
        this.h = this.axis('left', 'right', dt, 'repeatH');
    }

    private axis(neg: Action, pos: Action, dt: number, timer: 'repeatV' | 'repeatH'): number {
        const d = (this.raw.isDown(pos) ? 1 : 0) - (this.raw.isDown(neg) ? 1 : 0);
        if (d === 0) { this[timer] = 0; return 0; }
        if (this.raw.justDown(pos) || this.raw.justDown(neg)) { this[timer] = REPEAT_DELAY; return d; }
        this[timer] -= dt;
        if (this[timer] <= 0) { this[timer] = REPEAT_EVERY; return d; }
        return 0;
    }

    /** -1 up, +1 down, 0 none (edge + auto-repeat). */
    get vertical(): number { return this.v; }
    /** -1 left, +1 right, 0 none (edge + auto-repeat). */
    get horizontal(): number { return this.h; }

    get ready(): boolean { return this.armed; }

    justDown(a: Action): boolean { return this.armed && this.raw.justDown(a); }
    isDown(a: Action): boolean { return this.armed && this.raw.isDown(a); }

    /** Confirm = confirm action or jump (A). */
    get confirm(): boolean { return this.justDown('confirm') || this.justDown('jump'); }
    /** Back = back action (Esc / B / X). */
    get back(): boolean { return this.justDown('back'); }
    /** Any menu action edge (wake attract mode, skip). */
    get any(): boolean {
        if (!this.armed) return false;
        for (const a of MENU_ACTIONS) if (this.raw.justDown(a)) return true;
        return false;
    }

    /** Re-arm (after a sub-screen closes: the key that closed it must not act here). */
    rearm(): void { this.armed = false; this.age = 0; }

    destroy(): void {
        (this.raw as { destroy?: () => void }).destroy?.();
    }

    /** True when a gamepad is connected (controls display picks the pad row). */
    get hasPad(): boolean {
        const gp = this.scene.input.gamepad;
        return !!gp && gp.total > 0;
    }
}
