// Keyboard helpers for menus: a page-wide tracker of physical key presses (so a menu opened by a key press
// doesn't react to that same, still-held key, and so a new press is seen the moment it starts), key-name ↔
// keyCode lookups and prompt-sprite mapping.
import Phaser from 'phaser';
import { settings, type Action } from '../core';

const CODES = Phaser.Input.Keyboard.KeyCodes as unknown as Record<string, number>;
const NAMES = new Map<number, string>();
for (const [name, code] of Object.entries(CODES)) if (typeof code === 'number' && !NAMES.has(code)) NAMES.set(code, name);

const held = new Set<number>();
/** keyCode → performance.now() of the press that started the current hold (auto-repeat doesn't refresh it). */
const downAt = new Map<number, number>();
/** keyCode → performance.now() of the most recent fresh press, kept after release (a tap shorter than a frame still counts). */
const pressAt = new Map<number, number>();
let installed = false;

function onKeyDown(e: KeyboardEvent): void {
    if (held.has(e.keyCode)) return;
    held.add(e.keyCode);
    // A repeat as the first event we see means the key was held before we listened (page load, refocus): not a press.
    if (e.repeat) return;
    const t = performance.now();
    downAt.set(e.keyCode, t);
    pressAt.set(e.keyCode, t);
}
function onKeyUp(e: KeyboardEvent): void { held.delete(e.keyCode); downAt.delete(e.keyCode); }
function onBlur(): void { held.clear(); downAt.clear(); }

function install(): void {
    if (installed || typeof window === 'undefined') return;
    installed = true;
    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    window.addEventListener('blur', onBlur);
    // Vite HMR re-evaluates this module: drop the old listeners instead of stacking a second set.
    import.meta.hot?.dispose(() => {
        window.removeEventListener('keydown', onKeyDown, true);
        window.removeEventListener('keyup', onKeyUp, true);
        window.removeEventListener('blur', onBlur);
        installed = false;
    });
}

export function keyCodeOf(name: string): number | undefined {
    return CODES[name];
}

/** When the key's current hold started (performance.now()), or undefined if it isn't held. */
export function keyDownTime(code: number): number | undefined {
    install();
    return downAt.get(code);
}

/** When the key's most recent press started (performance.now()), held or already released; undefined if never pressed. */
export function keyPressTime(code: number): number | undefined {
    install();
    return pressAt.get(code);
}

/** DOM keyCodes bound to an action (settings.keys), resolved through Phaser's KeyCodes. */
export function boundKeyCodes(action: Action): number[] {
    const out: number[] = [];
    for (const name of settings.get().keys[action] ?? []) {
        const code = CODES[name];
        if (code !== undefined) out.push(code);
    }
    return out;
}

/** Phaser KeyCodes name for a DOM keyCode (e.g. 27 → 'ESC'), or null if Phaser has no name for it. */
export function keyNameOf(code: number): string | null {
    return NAMES.get(code) ?? null;
}

/** Short on-screen label for a key name ('LEFT' → '←', 'ESC' → 'ESC', 'SPACE' → 'SPACE'). */
export function keyLabel(name: string): string {
    switch (name) {
        case 'LEFT': return '←';
        case 'RIGHT': return '→';
        case 'UP': return '↑';
        case 'DOWN': return '↓';
        case 'SPACE': return 'SPACE';
        case 'ENTER': return 'ENTER';
        case 'BACKSPACE': return 'BKSP';
        case 'SHIFT': return 'SHIFT';
        case 'ESC': return 'ESC';
        default: return name.length <= 5 ? name : name.slice(0, 5);
    }
}

const KEY_PROMPTS: Record<string, string> = {
    Z: 'prompt_key_z', X: 'prompt_key_x', C: 'prompt_key_c', J: 'prompt_key_j', K: 'prompt_key_k', L: 'prompt_key_l',
    SHIFT: 'prompt_key_shift', ESC: 'prompt_key_esc', ENTER: 'prompt_key_enter', SPACE: 'prompt_key_space',
    UP: 'prompt_key_up', DOWN: 'prompt_key_down', LEFT: 'prompt_key_left', RIGHT: 'prompt_key_right'
};
const PAD_PROMPTS: Record<number, string> = {
    0: 'prompt_pad_a', 1: 'prompt_pad_b', 2: 'prompt_pad_x', 3: 'prompt_pad_y', 9: 'prompt_pad_start', 5: 'prompt_pad_rb',
    12: 'prompt_pad_dpad', 13: 'prompt_pad_dpad', 14: 'prompt_pad_dpad', 15: 'prompt_pad_dpad'
};

/** `ui_prompts` tag for a key name, or null when there is no key-cap art for it (draw a text label instead). */
export function keyPromptTag(name: string): string | null {
    return KEY_PROMPTS[name] ?? null;
}

export function padPromptTag(button: number): string | null {
    return PAD_PROMPTS[button] ?? null;
}
