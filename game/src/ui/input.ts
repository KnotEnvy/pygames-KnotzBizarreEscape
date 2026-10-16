// MenuInput: a menu's view of the engine's action-mapped input (keyboard + gamepad). Adds:
//   opening-key filter   a keyboard press that started before the menu was requested (`since`) is ignored for its
//                        whole hold: the Escape that paused the game can't close the Pause menu on the same press,
//                        while a *new* press of the same key is accepted at once, even if the menu's first frame
//                        came late (slow first render). Pad/virtual actions held at the first sample are ignored
//                        until released;
//   repeat               held up/down/left/right repeat after a delay, like a real menu cursor;
//   anyHeld              for handing control to the Game (see TitleScene / ContinueScene).
import Phaser from 'phaser';
import { createInput, type Action, type InputState } from '../core';
import { anyBoundKeyHeld, boundKeyCodes, keyDownTime } from './keys';

const MENU_ACTIONS: readonly Action[] = ['up', 'down', 'left', 'right', 'confirm', 'back', 'pause', 'jump', 'shoot'];
const HANDOFF_ACTIONS: readonly Action[] = ['confirm', 'pause', 'back', 'jump', 'shoot'];
const REPEAT_DELAY = 340;
const REPEAT_EVERY = 105;

export class MenuInput {
    readonly raw: InputState;
    /** Keyboard presses that started at or before this time belong to whoever opened the menu. */
    private since: number;
    /** Actions down at the first sample without a tracked key (gamepad, virtual presses), dropped when released. */
    private readonly ignoredActions = new Set<Action>();
    private fresh = true;
    private repeatV = 0;
    private repeatH = 0;
    private v = 0;
    private h = 0;

    /** @param since performance.now() of the moment the menu was requested (default: now). */
    constructor(private readonly scene: Phaser.Scene, since: number = performance.now()) {
        this.raw = createInput(scene);
        this.since = since;
    }

    /** Call once per frame (real dt). */
    update(dt: number): void {
        this.v = 0; this.h = 0;
        if (this.fresh) {
            this.fresh = false;
            for (const a of MENU_ACTIONS) if (this.raw.isDown(a)) this.ignoredActions.add(a);
        } else {
            for (const a of this.ignoredActions) if (!this.raw.isDown(a)) this.ignoredActions.delete(a);
        }
        this.v = this.axis('up', 'down', dt, 'repeatV');
        this.h = this.axis('left', 'right', dt, 'repeatH');
    }

    private axis(neg: Action, pos: Action, dt: number, timer: 'repeatV' | 'repeatH'): number {
        const d = (this.isDown(pos) ? 1 : 0) - (this.isDown(neg) ? 1 : 0);
        if (d === 0) { this[timer] = 0; return 0; }
        if (this.justDown(pos) || this.justDown(neg)) { this[timer] = REPEAT_DELAY; return d; }
        this[timer] -= dt;
        if (this[timer] <= 0) { this[timer] = REPEAT_EVERY; return d; }
        return 0;
    }

    /** -1 up, +1 down, 0 none (edge + auto-repeat). */
    get vertical(): number { return this.v; }
    /** -1 left, +1 right, 0 none (edge + auto-repeat). */
    get horizontal(): number { return this.h; }

    /** Is the action's current press one that started after the menu was requested? */
    private accepted(a: Action): boolean {
        let keyboard = false;
        for (const code of boundKeyCodes(a)) {
            const t = keyDownTime(code);
            if (t === undefined) continue;
            keyboard = true;
            if (t > this.since) return true;
        }
        if (keyboard) return false;
        return !this.ignoredActions.has(a);
    }

    justDown(a: Action): boolean { return this.raw.justDown(a) && this.accepted(a); }
    isDown(a: Action): boolean { return this.raw.isDown(a) && this.accepted(a); }

    /** Confirm = confirm action or jump (A). */
    get confirm(): boolean { return this.justDown('confirm') || this.justDown('jump'); }
    /** Back = back action (Esc / B / X). */
    get back(): boolean { return this.justDown('back'); }
    /** Any menu action edge (wake attract mode, skip). */
    get any(): boolean {
        for (const a of MENU_ACTIONS) if (this.justDown(a)) return true;
        return false;
    }

    /**
     * True while a confirm/pause/back/jump/shoot key is still held (sampled or physical). Scenes that hand control
     * to the Game wait for this to clear: Phaser steps scenes top-down, so a menu acts on a key edge before the
     * Game samples it, and the Game would otherwise see the same press as a fresh `pause`.
     */
    get anyHeld(): boolean {
        for (const a of HANDOFF_ACTIONS) if (this.raw.isDown(a)) return true;
        return anyBoundKeyHeld(HANDOFF_ACTIONS);
    }

    /** Re-arm (after a sub-screen closes: the key that closed it must not act here until released). */
    rearm(): void {
        this.since = performance.now();
        this.fresh = true;
        this.ignoredActions.clear();
    }

    destroy(): void {
        (this.raw as { destroy?: () => void }).destroy?.();
    }

    /** True when a gamepad is connected (controls display picks the pad row). */
    get hasPad(): boolean {
        const gp = this.scene.input.gamepad;
        return !!gp && gp.total > 0;
    }
}
