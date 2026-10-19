// Action-mapped input: keyboard (two keys per action) + gamepad (standard mapping), per player index.
// Sampled once per frame at PRE_UPDATE, so isDown/justDown/justUp are stable for the whole frame.
// Usable from any scene: `const input = createInput(this)` (UI scenes do this for menus).
import Phaser from 'phaser';
import { ACTIONS, type Action, type Aim, type InputState } from './contracts';
import { settings } from './settings';
import { ENGINE } from '../config/tuning/engine';

const N = ACTIONS.length;
const IDX: Record<Action, number> = Object.fromEntries(ACTIONS.map((a, i) => [a, i])) as Record<Action, number>;
const A_LEFT = IDX.left, A_RIGHT = IDX.right, A_UP = IDX.up, A_DOWN = IDX.down;

/** Every live InputService (so __KBE.press reaches menus and gameplay alike). */
export const liveInputs = new Set<InputService>();

/**
 * Key objects are shared per scene keyboard plugin and key code (addKey returns the existing one). Count how many
 * InputServices use each code we created, so a rebind or a destroyed menu input removes keys nobody polls any more,
 * without pulling a key from under another InputService of the same scene. Codes we did not create are never removed.
 */
const keyRefs = new WeakMap<Phaser.Input.Keyboard.KeyboardPlugin, Map<number, number>>();

function acquireKey(kb: Phaser.Input.Keyboard.KeyboardPlugin, code: number): Phaser.Input.Keyboard.Key {
    let refs = keyRefs.get(kb);
    if (!refs) keyRefs.set(kb, refs = new Map());
    const n = refs.get(code);
    if (n !== undefined) refs.set(code, n + 1);
    else if (!kb.keys[code]) refs.set(code, 1);
    return kb.addKey(code, true, false);
}

function releaseKey(kb: Phaser.Input.Keyboard.KeyboardPlugin, code: number): void {
    const refs = keyRefs.get(kb);
    const n = refs?.get(code);
    if (!refs || n === undefined) return;
    if (n > 1) { refs.set(code, n - 1); return; }
    refs.delete(code);
    kb.removeKey(code, true, true);
}

export class InputService implements InputState {
    private readonly cur = new Uint8Array(N);
    private readonly prev = new Uint8Array(N);
    private readonly held = new Float32Array(N);
    /** Remaining ms of programmatic presses. */
    private readonly virtual = new Float32Array(N);
    /** Actions held through latchHeld(): read as up until the hardware releases them. */
    private readonly latched = new Uint8Array(N);
    /** Keys seen down by a fresh (non-repeat) keydown, and keys whose down came from an auto-repeat (held over). */
    private readonly keysDown = new Set<Phaser.Input.Keyboard.Key>();
    private readonly staleKeys = new Set<Phaser.Input.Keyboard.Key>();
    private keys: Phaser.Input.Keyboard.Key[][] = [];
    /** Key codes this service acquired (released on rebind/destroy). */
    private codes: number[] = [];
    private padButtons: number[][] = [];
    private readonly aimOut = { x: 0 as -1 | 0 | 1, y: 0 as -1 | 0 | 1 };
    private readonly offSettings: () => void;
    private lastTime = -1;

    /**
     * @param index player index (0 = P1). P1 gets keyboard + pad 0; P2+ get pad `index` only.
     * @param autoSample sample at the scene's PRE_UPDATE (default). Pass false and call `sample()` yourself if needed.
     */
    constructor(private readonly scene: Phaser.Scene, readonly index = 0, autoSample = true) {
        this.bind();
        liveInputs.add(this);
        this.offSettings = settings.onChange(() => this.bind());
        if (autoSample) scene.events.on(Phaser.Scenes.Events.PRE_UPDATE, this.onPreUpdate, this);
        // After a pause, re-baseline so the key that resumed the game doesn't count as a fresh press.
        scene.events.on(Phaser.Scenes.Events.RESUME, this.rebaseline, this);
        // A key/button still held from the scene that started this one is ignored until released.
        scene.events.once(Phaser.Scenes.Events.CREATE, this.latchHeld, this);
        scene.events.on(Phaser.Scenes.Events.WAKE, this.rebaseline, this);
        scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
    }

    /** (Re)build key objects from settings. Called automatically when settings change. */
    bind(): void {
        const s = settings.get();
        const kb = this.scene.input.keyboard;
        const codes = Phaser.Input.Keyboard.KeyCodes as unknown as Record<string, number>;
        const old = this.codes;
        this.codes = [];
        // Acquire the new set before releasing the old one, so a code bound both before and after keeps its Key.
        this.keys = ACTIONS.map(a => {
            if (!kb || this.index !== 0) return [];
            return (s.keys[a] ?? []).filter(n => codes[n] !== undefined).map(n => {
                this.codes.push(codes[n]);
                return acquireKey(kb, codes[n]);
            });
        });
        if (kb) for (const c of old) releaseKey(kb, c);
        this.padButtons = ACTIONS.map(a => s.pad[a] ?? []);
    }

    private onPreUpdate(time: number, delta: number): void {
        if (time === this.lastTime) return;
        this.lastTime = time;
        this.sample(delta);
    }

    /** Read hardware state for this frame. `delta` = real ms since last sample. */
    sample(delta: number): void {
        this.prev.set(this.cur);
        const pad = this.pad();
        const dz = ENGINE.input.stickDeadzone;
        const sx = pad ? pad.leftStick.x : 0;
        const sy = pad ? pad.leftStick.y : 0;
        for (let i = 0; i < N; i++) {
            let down = false;
            const ks = this.keys[i];
            for (let k = 0; k < ks.length; k++) if (this.keyDown(ks[k])) down = true;
            if (!down && pad) {
                const bs = this.padButtons[i];
                for (let b = 0; b < bs.length && !down; b++) down = pad.buttons[bs[b]]?.pressed === true;
                if (!down) {
                    if (i === A_LEFT) down = sx < -dz;
                    else if (i === A_RIGHT) down = sx > dz;
                    else if (i === A_UP) down = sy < -dz;
                    else if (i === A_DOWN) down = sy > dz;
                }
            }
            if (this.latched[i]) {
                if (down) down = false;
                else this.latched[i] = 0;
            }
            if (this.virtual[i] > 0) {
                down = true;
                this.virtual[i] -= delta;
            }
            this.cur[i] = down ? 1 : 0;
            this.held[i] = down ? this.held[i] + delta : 0;
        }
    }

    /**
     * Key state minus held-over keys: a Key that went down on an auto-repeat keydown was already held before this
     * scene's keyboard saw it (new scene, scene was paused, window refocus), so it stays up until released.
     */
    private keyDown(k: Phaser.Input.Keyboard.Key): boolean {
        if (!k.isDown) {
            this.keysDown.delete(k);
            this.staleKeys.delete(k);
            return false;
        }
        if (this.staleKeys.has(k)) return false;
        if (!this.keysDown.has(k)) {
            if ((k.originalEvent as KeyboardEvent | undefined)?.repeat) {
                this.staleKeys.add(k);
                return false;
            }
            this.keysDown.add(k);
        }
        return true;
    }

    private pad(): Phaser.Input.Gamepad.Gamepad | undefined {
        const gp = this.scene.input.gamepad;
        if (!gp || gp.total === 0) return undefined;
        return gp.getPad(this.index) ?? undefined;
    }

    private rebaseline(): void {
        this.sample(0);
        this.prev.set(this.cur);
    }

    /**
     * Every action currently held (keyboard or pad) reads as up until it is released, so the key that opened or
     * continued the game can't pause/jump/shoot. Runs on scene CREATE and from flow.continueGame(). Programmatic
     * presses are unaffected.
     */
    latchHeld(): void {
        this.sample(0);
        const v = this.virtual;
        for (let i = 0; i < N; i++) if (this.cur[i] && !(v[i] > 0)) this.latched[i] = 1;
        this.rebaseline();
    }

    isDown(a: Action): boolean { return this.cur[IDX[a]] === 1; }
    justDown(a: Action): boolean { const i = IDX[a]; return this.cur[i] === 1 && this.prev[i] === 0; }
    justUp(a: Action): boolean { const i = IDX[a]; return this.cur[i] === 0 && this.prev[i] === 1; }
    heldMs(a: Action): number { return this.held[IDX[a]]; }

    aim(): Aim {
        this.aimOut.x = (this.cur[A_RIGHT] - this.cur[A_LEFT]) as -1 | 0 | 1;
        this.aimOut.y = (this.cur[A_DOWN] - this.cur[A_UP]) as -1 | 0 | 1;
        return this.aimOut;
    }

    press(a: Action, ms: number = ENGINE.input.pressMs): void {
        const i = IDX[a];
        this.virtual[i] = Math.max(this.virtual[i], ms);
    }

    destroy(): void {
        if (!liveInputs.delete(this)) return;
        this.offSettings();
        this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy, this);
        const kb = this.scene.input.keyboard;
        if (kb) for (const c of this.codes) releaseKey(kb, c);
        this.codes = [];
        this.keys = [];
        this.scene.events.off(Phaser.Scenes.Events.PRE_UPDATE, this.onPreUpdate, this);
        this.scene.events.off(Phaser.Scenes.Events.RESUME, this.rebaseline, this);
        this.scene.events.off(Phaser.Scenes.Events.WAKE, this.rebaseline, this);
        this.scene.events.off(Phaser.Scenes.Events.CREATE, this.latchHeld, this);
        this.keysDown.clear();
        this.staleKeys.clear();
    }

    /** True if this service reads `scene`'s input. */
    belongsTo(scene: Phaser.Scene): boolean { return this.scene === scene; }
}

/** latchHeld() on every live InputService of a scene (flow.continueGame does this for the Game). */
export function latchHeldInputs(scene: Phaser.Scene): void {
    for (const s of liveInputs) if (s.belongsTo(scene)) s.latchHeld();
}

/** Convenience for any scene (menus, HUD, pause): an InputState sampled every frame. */
export function createInput(scene: Phaser.Scene, index = 0): InputService {
    return new InputService(scene, index);
}
