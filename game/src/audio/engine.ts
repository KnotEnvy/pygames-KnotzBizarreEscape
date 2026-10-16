// AudioEngine: one per Phaser.Game, shared by every scene (Title music keeps playing into the Game, the Game's
// stage music survives the Pause scene...). Wraps the global sound manager with:
//   sfx     voice limiting per key, min retrigger interval, pitch/volume variance, positional stereo panning
//           relative to the Game camera, alias resolution for keys other teams guessed, unknown-key reporting
//   loop    looping handles (flame, rocket whoosh, boss steam) with fade-out and optional auto-stop
//   music   crossfades between at most two tracks, one-shot jingles that stop the music and emit 'music:ended',
//           ducking (player death, boss roar, callouts), pause ducking
//   buses   master (UI prefs) × music / sfx (engine settings); mute stays with the engine's bindGlobalMute
//   unlock  sfx before the first gesture are dropped, the last music request is queued and starts on UNLOCKED
// Fades run on the game STEP clock, so they keep moving while the Game scene is paused or in hitstop.
import Phaser from 'phaser';
import { settings } from '../core/settings';
import { applyMute } from '../core/audio';
import { registerDebug } from '../core/debug/hooks';
import { UI } from '../config/tuning/ui';
import { getPrefs, onPrefsChange } from '../ui/prefs';
import { MUSIC_ALIASES, MUSIC_META, SFX_ALIASES, SFX_META } from './catalog';

type WASound = Phaser.Sound.WebAudioSound;

export interface SfxOptions {
    volume?: number;
    /** Cents. When given, the catalog's random variance is skipped. */
    detune?: number;
    /** World x for stereo panning and distance falloff (relative to the Game camera). */
    x?: number;
    rate?: number;
}

export interface LoopOptions extends SfxOptions {
    /** Stop automatically after this long (with `fadeMs`). */
    durationMs?: number;
    fadeMs?: number;
}

export interface LoopHandle {
    readonly key: string;
    readonly active: boolean;
    stop(fadeMs?: number): void;
    setX(x: number): void;
    setVolume(v: number): void;
}

export interface MusicOptions {
    /** Crossfade ms (default UI.audio.musicFadeMs). */
    fade?: number;
    /** Track volume 0..1 before the music bus (default 1). */
    volume?: number;
}

export interface SfxHint {
    /** Play this key instead. */
    replace?: string;
    x?: number;
    volume?: number;
    detune?: number;
}

export interface AudioDebugState {
    recent: string[];
    unknown: string[];
    voices: number;
    loops: number;
    music: string | null;
    musicVol: number;
    outgoing: number;
    pending: string | null;
    locked: boolean;
    context: string;
    played: number;
    dropped: number;
    stolen: number;
    lockedDrops: number;
    duck: number;
    master: number;
    musicBus: number;
    sfxBus: number;
    muted: boolean;
}

interface Voice {
    key: string;
    sound: WASound;
    started: number;
    done: boolean;
    loop: boolean;
    /** meta.vol × opts.volume × variance. */
    base: number;
    /** Distance falloff. */
    gain: number;
    /** Loop handle volume. */
    user: number;
    /** 0..1 fade-out multiplier. */
    fade: number;
    fadeTotal: number;
    /** Engine clock time to auto-stop at (0 = never). */
    untilMs: number;
    autoFadeMs: number;
    pausedByEngine: boolean;
}

interface Track {
    key: string;
    sound: WASound;
    /** 0..1 fade position. */
    vol: number;
    target: number;
    fadeMs: number;
    jingle: boolean;
    done: boolean;
}

interface Hint extends SfxHint { until: number }

const DEV = import.meta.env.DEV;
const GAMEPLAY_MUSIC = /^music_(stage|boss)/;

function pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

export class AudioEngine {
    private static readonly byGame = new WeakMap<Phaser.Game, AudioEngine>();

    static for(game: Phaser.Game): AudioEngine {
        let e = AudioEngine.byGame.get(game);
        if (!e) {
            e = new AudioEngine(game);
            AudioEngine.byGame.set(game, e);
        }
        return e;
    }

    /** 'music:ended' (key) when a jingle finishes. */
    readonly events = new Phaser.Events.EventEmitter();

    private readonly sound: Phaser.Sound.BaseSoundManager;
    private readonly voices: Voice[] = [];
    private readonly lastPlay = new Map<string, number>();
    private readonly hints = new Map<string, Hint>();
    private readonly unknown = new Set<string>();
    private readonly recent: string[] = [];
    private readonly timers: { at: number; fn: () => void }[] = [];
    private clock = 0;
    private current: Track | null = null;
    private readonly outgoing: Track[] = [];
    private pending: { key: string; opts: MusicOptions } | null = null;
    private duckGain = 1;
    private duckHold = 0;
    private duckRecoverMs: number = UI.audio.duckRecoverMs;
    private pauseDuck = 1;
    private listener: (() => number) | null = null;
    private lastGameplay: string | null = null;
    private readonly stats = { played: 0, dropped: 0, stolen: 0, lockedDrops: 0 };

    private constructor(private readonly game: Phaser.Game) {
        this.sound = game.sound;
        game.events.on(Phaser.Core.Events.STEP, this.step, this);
        game.events.once(Phaser.Core.Events.DESTROY, this.destroy, this);
        this.sound.on(Phaser.Sound.Events.UNLOCKED, this.onUnlocked, this);
        settings.onChange(() => this.applySettings());
        onPrefsChange(() => this.applySettings());
        this.applySettings();
        registerDebug('audio', () => this.debugState());
    }

    // ---------------------------------------------------------------- state

    get locked(): boolean {
        return this.sound.locked === true;
    }

    get musicKey(): string | null {
        return this.current && !this.current.done ? this.current.key : null;
    }

    /** The last looping stage/boss track that was requested (restored after a continue). */
    get lastGameplayMusic(): string | null {
        return this.lastGameplay;
    }

    /** Who hears: world x of the camera center. The Game run sets it; UI scenes leave it null (no panning). */
    setListener(fn: (() => number) | null): void {
        this.listener = fn;
    }

    private get cache(): Phaser.Cache.BaseCache {
        return this.game.cache.audio;
    }

    // ---------------------------------------------------------------- sfx

    sfx(key: string, opts: SfxOptions = {}): void {
        const hint = this.hints.get(key);
        const o: SfxOptions = { ...opts };
        if (hint) {
            this.hints.delete(key);
            if (hint.until >= this.clock) {
                if (hint.replace) key = hint.replace;
                if (o.x === undefined) o.x = hint.x;
                if (hint.volume !== undefined) o.volume = (o.volume ?? 1) * hint.volume;
                if (hint.detune !== undefined) o.detune = (o.detune ?? 0) + hint.detune;
            }
        }
        this.play(key, o, 0);
    }

    /**
     * Pre-arrange the next direct `sfx(key)` call within `ms`: position it, change its volume, or swap the key.
     * Used by the event wiring when an event (with x) precedes a team's positionless sfx call.
     */
    hint(key: string, spec: SfxHint, ms = 50): void {
        this.hints.set(key, { ...spec, until: this.clock + ms });
    }

    /** Stop the most recent voice of `key` if it started within `withinMs` (replace a generic sound with a specific one). */
    stopRecent(key: string, withinMs = 40): boolean {
        let newest: Voice | null = null;
        for (const v of this.voices) if (v.key === key && !v.done && (!newest || v.started > newest.started)) newest = v;
        if (!newest || this.clock - newest.started > withinMs) return false;
        this.kill(newest);
        return true;
    }

    loop(key: string, opts: LoopOptions = {}): LoopHandle {
        const noop: LoopHandle = { key, active: false, stop() {}, setX() {}, setVolume() {} };
        const alias = SFX_ALIASES[key];
        if (alias && !this.cache.exists(key)) {
            if (!alias.key) return noop;
            key = alias.key;
            opts = { ...opts, volume: (opts.volume ?? 1) * (alias.volume ?? 1), detune: (opts.detune ?? 0) + (alias.detune ?? 0), durationMs: opts.durationMs ?? alias.loopMs };
        }
        if (!this.cache.exists(key)) { this.reportUnknown(key); return noop; }
        if (this.locked) { this.stats.lockedDrops++; return noop; }
        const meta = SFX_META[key] ?? {};
        const max = meta.max ?? 2;
        let n = 0, oldest: Voice | null = null;
        for (const v of this.voices) if (v.loop && v.key === key && !v.done) { n++; if (!oldest || v.started < oldest.started) oldest = v; }
        if (n >= max && oldest) { this.kill(oldest); this.stats.stolen++; }
        const sp = this.spatial(opts.x) ?? { gain: UI.audio.pan.farGain, pan: 0 };
        const v = this.startVoice(key, (meta.vol ?? 1) * (opts.volume ?? 1), sp.gain, opts.detune ?? 0, sp.pan, true, opts.rate ?? 1);
        if (!v) return noop;
        v.untilMs = opts.durationMs ? this.clock + opts.durationMs : 0;
        v.autoFadeMs = opts.fadeMs ?? 120;
        const engine = this;
        return {
            key,
            get active() { return !v.done; },
            stop(fadeMs = 80) { engine.fadeOut(v, fadeMs); },
            setX(x: number) {
                const s = engine.spatial(x);
                v.gain = s ? s.gain : 0;
                engine.setPan(v.sound, s ? s.pan : 0);
                engine.applyVoice(v);
            },
            setVolume(vol: number) { v.user = Math.max(0, vol); engine.applyVoice(v); }
        };
    }

    private play(key: string, o: SfxOptions, depth: number): void {
        if (depth > 3) return;
        const alias = SFX_ALIASES[key];
        if (alias && !this.cache.exists(key)) {
            const o2: SfxOptions = { ...o, volume: (o.volume ?? 1) * (alias.volume ?? 1), detune: alias.detune === undefined ? o.detune : (o.detune ?? 0) + alias.detune };
            if (alias.also) for (const k of alias.also) this.play(k, { ...o }, depth + 1);
            const target = alias.key ?? (alias.keys ? pick(alias.keys) : undefined);
            if (!target) return;
            if (alias.loopMs) { this.loop(target, { ...o2, durationMs: alias.loopMs, fadeMs: 120 }); return; }
            this.remember(key + '→' + target);
            this.play(target, o2, depth + 1);
            return;
        }
        if (!this.cache.exists(key)) { this.reportUnknown(key); return; }
        const meta = SFX_META[key] ?? {};
        if (this.locked) { this.stats.lockedDrops++; return; }
        const minMs = meta.minMs ?? 0;
        const last = this.lastPlay.get(key);
        if (minMs > 0 && last !== undefined && this.clock - last < minMs) { this.stats.dropped++; return; }
        const max = meta.max ?? UI.audio.defaultVoices;
        let n = 0, oldest: Voice | null = null;
        for (const v of this.voices) if (!v.loop && v.key === key && !v.done) { n++; if (!oldest || v.started < oldest.started) oldest = v; }
        if (n >= max && oldest) { this.kill(oldest); this.stats.stolen++; }
        const sp = this.spatial(o.x);
        if (!sp) { this.stats.dropped++; return; }
        let base = (meta.vol ?? 1) * (o.volume ?? 1);
        let detune = o.detune ?? 0;
        if (meta.vary) {
            if (o.detune === undefined) detune += (Math.random() * 2 - 1) * meta.vary;
            base *= 1 + (Math.random() * 2 - 1) * UI.audio.vary.volume;
        }
        this.startVoice(key, base, sp.gain, detune, sp.pan, false, o.rate ?? 1);
    }

    private startVoice(key: string, base: number, gain: number, detune: number, pan: number, loop: boolean, rate: number): Voice | null {
        const sfxBus = settings.get().sfxVolume;
        let sound: WASound;
        try {
            sound = this.sound.add(key, { loop, volume: Math.min(1, base * gain * sfxBus), detune, rate }) as WASound;
        } catch (e) {
            if (DEV) console.warn(`[audio] could not create '${key}':`, e);
            return null;
        }
        this.setPan(sound, pan);
        const v: Voice = { key, sound, started: this.clock, done: false, loop, base, gain, user: 1, fade: 1, fadeTotal: 0, untilMs: 0, autoFadeMs: 120, pausedByEngine: false };
        const finish = (): void => {
            if (v.done) return;
            v.done = true;
            const i = this.voices.indexOf(v);
            if (i >= 0) this.voices.splice(i, 1);
        };
        sound.once(Phaser.Sound.Events.COMPLETE, () => { finish(); sound.destroy(); });
        sound.once(Phaser.Sound.Events.DESTROY, finish);
        if (!sound.play()) { finish(); sound.destroy(); return null; }
        this.voices.push(v);
        this.lastPlay.set(key, this.clock);
        this.stats.played++;
        this.remember(key);
        return v;
    }

    private setPan(sound: WASound, pan: number): void {
        if (typeof sound.setPan === 'function') sound.setPan(Phaser.Math.Clamp(pan, -1, 1));
    }

    private applyVoice(v: Voice): void {
        if (v.done) return;
        v.sound.setVolume(Phaser.Math.Clamp(v.base * v.gain * v.user * v.fade * settings.get().sfxVolume, 0, 1));
    }

    private fadeOut(v: Voice, ms: number): void {
        if (v.done) return;
        if (ms <= 0) { this.kill(v); return; }
        v.untilMs = 0;
        v.fadeTotal = ms;
    }

    private kill(v: Voice): void {
        if (v.done) return;
        v.done = true;
        const i = this.voices.indexOf(v);
        if (i >= 0) this.voices.splice(i, 1);
        v.sound.stop();
        v.sound.destroy();
    }

    /** Distance falloff and pan for a world x; null when too far to hear. */
    private spatial(x: number | undefined): { gain: number; pan: number } | null {
        if (x === undefined || !this.listener) return { gain: 1, pan: 0 };
        const P = UI.audio.pan;
        const d = x - this.listener();
        const a = Math.abs(d);
        if (a > P.cutoff) return null;
        const gain = a <= P.near ? 1 : Math.max(P.farGain, 1 - (a - P.near) / (P.far - P.near) * (1 - P.farGain));
        return { gain, pan: Phaser.Math.Clamp(d / P.range, -1, 1) * P.max };
    }

    // ---------------------------------------------------------------- music

    music(key: string | null, opts: MusicOptions = {}): void {
        if (key) {
            key = MUSIC_ALIASES[key] ?? key;
            if (!this.cache.exists(key)) { this.reportUnknown(key); return; }
        }
        const fade = opts.fade ?? UI.audio.musicFadeMs;
        if (key && GAMEPLAY_MUSIC.test(key)) this.lastGameplay = key;
        if (this.locked) {
            this.pending = key ? { key, opts } : null;
            if (this.current) this.retire(this.current, 0);
            this.current = null;
            return;
        }
        if (key && this.current && this.current.key === key && !this.current.done) {
            this.current.target = opts.volume ?? 1;
            return;
        }
        const meta = key ? MUSIC_META[key] : undefined;
        const jingle = !!key && !!meta && !meta.loop;
        if (this.current) this.retire(this.current, jingle ? Math.min(fade, 250) : fade);
        this.current = null;
        if (!key) return;
        let sound: WASound;
        try {
            sound = this.sound.add(key, { loop: meta?.loop ?? true, volume: 0 }) as WASound;
        } catch (e) {
            if (DEV) console.warn(`[audio] could not create music '${key}':`, e);
            return;
        }
        const track: Track = { key, sound, vol: jingle || fade <= 0 ? 1 : 0, target: opts.volume ?? 1, fadeMs: jingle ? 60 : Math.max(1, fade), jingle, done: false };
        sound.once(Phaser.Sound.Events.COMPLETE, () => {
            if (track.done) return;
            track.done = true;
            if (this.current === track) this.current = null;
            sound.destroy();
            this.events.emit('music:ended', key);
        });
        this.current = track;
        this.applyTrack(track);
        if (!sound.play()) {
            track.done = true;
            this.current = null;
            sound.destroy();
            return;
        }
        this.remember('♪' + key);
    }

    /** Temporarily lower the music (gain 0..1) for `holdMs`, then recover over `recoverMs`. Overlaps take the min/max. */
    duck(gain: number, holdMs: number, recoverMs: number = UI.audio.duckRecoverMs): void {
        this.duckGain = Math.min(this.duckGain, Phaser.Math.Clamp(gain, 0, 1));
        this.duckHold = Math.max(this.duckHold, holdMs);
        this.duckRecoverMs = Math.max(50, recoverMs);
    }

    /** Real-time delayed call on the engine clock (survives scene pauses and hitstop). */
    after(ms: number, fn: () => void): void {
        this.timers.push({ at: this.clock + ms, fn });
    }

    private retire(t: Track, fadeMs: number): void {
        if (t.done) return;
        t.done = true;
        if (fadeMs <= 0) { t.sound.stop(); t.sound.destroy(); return; }
        t.fadeMs = fadeMs;
        this.outgoing.push(t);
    }

    private applyTrack(t: Track): void {
        const v = t.vol * t.target * settings.get().musicVolume * this.duckGain * this.pauseDuck;
        t.sound.setVolume(Phaser.Math.Clamp(v, 0, 1));
    }

    private onUnlocked(): void {
        const p = this.pending;
        this.pending = null;
        if (p) this.music(p.key, p.opts);
    }

    // ---------------------------------------------------------------- gameplay pause / run teardown

    pauseGameplay(): void {
        this.pauseDuck = UI.pause.musicDuck;
        for (const v of this.voices) {
            if (v.done || v.pausedByEngine || !v.sound.isPlaying) continue;
            if (v.sound.pause()) v.pausedByEngine = true;
        }
        if (this.current) this.applyTrack(this.current);
    }

    resumeGameplay(): void {
        this.pauseDuck = 1;
        for (const v of this.voices) {
            if (v.done || !v.pausedByEngine) continue;
            v.pausedByEngine = false;
            v.sound.resume();
        }
        if (this.current) this.applyTrack(this.current);
    }

    /** A Game run ended: stop every gameplay voice and loop (music is left to the next scene). */
    endRun(): void {
        for (const v of [...this.voices]) this.fadeOut(v, 80);
        this.hints.clear();
        this.listener = null;
        this.pauseDuck = 1;
        this.timers.length = 0;
    }

    applySettings(): void {
        this.sound.volume = Phaser.Math.Clamp(getPrefs().master, 0, 1);
        applyMute(this.sound, settings.muted);
        for (const v of this.voices) this.applyVoice(v);
        if (this.current) this.applyTrack(this.current);
        for (const t of this.outgoing) this.applyTrack(t);
    }

    // ---------------------------------------------------------------- per-step

    private step(_time: number, delta: number): void {
        const dt = Math.min(100, delta);
        this.clock += dt;
        // ducking
        if (this.duckHold > 0) this.duckHold -= dt;
        else if (this.duckGain < 1) this.duckGain = Math.min(1, this.duckGain + dt / this.duckRecoverMs);
        // music fades
        const cur = this.current;
        if (cur && !cur.done) {
            if (cur.vol < 1) cur.vol = Math.min(1, cur.vol + dt / cur.fadeMs);
            this.applyTrack(cur);
        }
        for (let i = this.outgoing.length - 1; i >= 0; i--) {
            const t = this.outgoing[i];
            t.vol -= dt / t.fadeMs;
            if (t.vol <= 0) {
                this.outgoing.splice(i, 1);
                t.sound.stop();
                t.sound.destroy();
            } else this.applyTrack(t);
        }
        // voices: auto-stop, fade-outs, stale cleanup
        for (let i = this.voices.length - 1; i >= 0; i--) {
            const v = this.voices[i];
            if (v.done) { this.voices.splice(i, 1); continue; }
            if (v.untilMs > 0 && this.clock >= v.untilMs) this.fadeOut(v, v.autoFadeMs);
            if (v.fadeTotal > 0) {
                v.fade -= dt / v.fadeTotal;
                if (v.fade <= 0) { this.kill(v); continue; }
                this.applyVoice(v);
            } else if (!v.loop && !v.pausedByEngine && !v.sound.isPlaying && !v.sound.isPaused && this.clock - v.started > 250) {
                // Finished without a COMPLETE (e.g. stopped by the manager): drop it.
                this.kill(v);
            }
        }
        // timers
        for (let i = 0; i < this.timers.length; i++) {
            const t = this.timers[i];
            if (this.clock >= t.at) {
                this.timers.splice(i--, 1);
                try { t.fn(); } catch (e) { console.error('[audio] timer threw:', e); }
            }
        }
    }

    private destroy(): void {
        this.game.events.off(Phaser.Core.Events.STEP, this.step, this);
        this.sound.off(Phaser.Sound.Events.UNLOCKED, this.onUnlocked, this);
        this.events.removeAllListeners();
        AudioEngine.byGame.delete(this.game);
    }

    // ---------------------------------------------------------------- diagnostics

    private remember(key: string): void {
        this.recent.push(key);
        if (this.recent.length > UI.audio.recentKeys) this.recent.shift();
    }

    private reportUnknown(key: string): void {
        if (this.unknown.has(key)) return;
        this.unknown.add(key);
        if (DEV) console.warn(`[audio] unknown key '${key}': add it to the catalog or SFX_ALIASES (src/audio/catalog.ts)`);
    }

    debugState(): AudioDebugState {
        const ctx = (this.sound as unknown as { context?: AudioContext }).context;
        const s = settings.get();
        let loops = 0;
        for (const v of this.voices) if (v.loop) loops++;
        return {
            recent: this.recent.slice(),
            unknown: [...this.unknown],
            voices: this.voices.length,
            loops,
            music: this.musicKey,
            musicVol: this.current ? Math.round(this.current.vol * this.current.target * 100) / 100 : 0,
            outgoing: this.outgoing.length,
            pending: this.pending?.key ?? null,
            locked: this.locked,
            context: ctx ? ctx.state : 'none',
            played: this.stats.played,
            dropped: this.stats.dropped,
            stolen: this.stats.stolen,
            lockedDrops: this.stats.lockedDrops,
            duck: Math.round(this.duckGain * this.pauseDuck * 100) / 100,
            master: getPrefs().master,
            musicBus: s.musicVolume,
            sfxBus: s.sfxVolume,
            muted: settings.muted
        };
    }
}
