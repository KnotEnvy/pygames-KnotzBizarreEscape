// UI-owned persistent preferences that the engine's Settings doesn't cover (master volume).
const STORAGE_KEY = 'kbe.ui.v1';

export interface UiPrefs {
    /** Master volume 0..1 (applied to the global sound manager). */
    master: number;
}

type Listener = (p: Readonly<UiPrefs>) => void;

function defaults(): UiPrefs {
    return { master: 1 };
}

function load(): UiPrefs {
    const p = defaults();
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const saved = JSON.parse(raw) as Partial<UiPrefs>;
            if (typeof saved.master === 'number' && Number.isFinite(saved.master)) p.master = Math.min(1, Math.max(0, saved.master));
        }
    } catch {
        // Unavailable storage: defaults are fine.
    }
    return p;
}

let data = load();
const listeners = new Set<Listener>();

export function getPrefs(): Readonly<UiPrefs> {
    return data;
}

export function updatePrefs(patch: Partial<UiPrefs>): void {
    data = { ...data, ...patch };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
        // Private mode etc.
    }
    for (const l of listeners) l(data);
}

export function onPrefsChange(l: Listener): () => void {
    listeners.add(l);
    return () => { listeners.delete(l); };
}
