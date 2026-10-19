// Persistent player settings (localStorage). Global singleton: `settings.get()`, `settings.update({...})`.
import type { Action, Difficulty } from './contracts';
import { PARAMS } from './params';

export interface Settings {
    musicVolume: number; // 0..1
    sfxVolume: number; // 0..1
    mute: boolean;
    crt: boolean;
    shake: boolean;
    /** Phase B: dim and shorten full-screen flashes (fx:flash) for photosensitive players. FX may read it too. */
    reducedFlash: boolean;
    difficulty: Difficulty;
    /** Keyboard bindings: Phaser KeyCodes names (e.g. 'LEFT', 'Z', 'SPACE', 'SHIFT', 'ESC'). */
    keys: Record<Action, string[]>;
    /** Gamepad bindings: standard-mapping button indices (A=0 B=1 X=2 Y=3 LB=4 RB=5 Back=8 Start=9 D-pad=12..15). */
    pad: Record<Action, number[]>;
}

export const DEFAULT_KEYS: Readonly<Record<Action, string[]>> = {
    left: ['LEFT', 'A'],
    right: ['RIGHT', 'D'],
    up: ['UP', 'W'],
    down: ['DOWN', 'S'],
    jump: ['Z', 'SPACE'],
    shoot: ['X', 'J'],
    grenade: ['C', 'K'],
    aimlock: ['SHIFT', 'L'],
    pause: ['ESC', 'ENTER'],
    confirm: ['ENTER', 'Z', 'SPACE'],
    back: ['ESC', 'BACKSPACE', 'X']
};

export const DEFAULT_PAD: Readonly<Record<Action, number[]>> = {
    left: [14],
    right: [15],
    up: [12],
    down: [13],
    jump: [0],
    shoot: [2],
    grenade: [1],
    aimlock: [5],
    pause: [9],
    confirm: [0, 9],
    back: [1, 8]
};

const STORAGE_KEY = 'kbe.settings.v1';

function defaults(): Settings {
    return {
        musicVolume: 0.7,
        sfxVolume: 0.9,
        mute: false,
        crt: false,
        shake: true,
        reducedFlash: false,
        difficulty: 'arcade',
        keys: structuredClone(DEFAULT_KEYS) as Record<Action, string[]>,
        pad: structuredClone(DEFAULT_PAD) as Record<Action, number[]>
    };
}

function load(): Settings {
    const s = defaults();
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const saved = JSON.parse(raw) as Partial<Settings>;
            Object.assign(s, saved, {
                keys: { ...s.keys, ...(saved.keys ?? {}) },
                pad: { ...s.pad, ...(saved.pad ?? {}) }
            });
        }
    } catch {
        // Corrupt or unavailable storage: defaults are fine.
    }
    return s;
}

type Listener = (s: Readonly<Settings>) => void;

class SettingsStore {
    private data = load();
    private readonly listeners = new Set<Listener>();

    /** Current settings. URL `?mute=1` and `?difficulty=` override without being saved. */
    get(): Readonly<Settings> {
        return this.data;
    }

    get muted(): boolean {
        return this.data.mute || PARAMS.mute;
    }

    get difficulty(): Difficulty {
        return PARAMS.difficulty ?? this.data.difficulty;
    }

    update(patch: Partial<Settings>): void {
        this.data = { ...this.data, ...patch };
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        } catch {
            // Private mode etc.: settings still apply for this session.
        }
        for (const l of this.listeners) l(this.data);
    }

    reset(): void {
        this.update(defaults());
    }

    /** Subscribe to changes; returns an unsubscribe fn. */
    onChange(l: Listener): () => void {
        this.listeners.add(l);
        return () => { this.listeners.delete(l); };
    }
}

export const settings = new SettingsStore();
