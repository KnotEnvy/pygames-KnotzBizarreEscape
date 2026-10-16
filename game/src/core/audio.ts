// Fallback AudioService: plays keys from the Phaser sound cache if present, silently ignores missing keys,
// respects mute/volumes from settings. The UI/audio team's createAudioService (src/audio) may wrap or replace it.
import Phaser from 'phaser';
import type { AudioService } from './contracts';
import { settings } from './settings';

/**
 * Mute/unmute a Phaser sound manager so `sound.mute` reads back correctly at once. WebAudio's `mute` setter uses
 * `gain.setValueAtTime`, which doesn't update `gain.value` while the AudioContext is still suspended (no user
 * gesture yet), so the getter would keep reporting false. Writing `.value` as well updates it immediately.
 */
export function applyMute(sound: Phaser.Sound.BaseSoundManager, muted: boolean): void {
    sound.mute = muted;
    const node = (sound as unknown as { masterMuteNode?: GainNode }).masterMuteNode;
    if (node) node.gain.value = muted ? 0 : 1;
}

let boundGame: Phaser.Game | null = null;

/**
 * Engine (main.ts): keep the game-wide sound manager's mute in sync with settings (`?mute=1` or the options
 * toggle) from boot onwards, whatever scene is running and whichever AudioService the UI/audio team installs.
 */
export function bindGlobalMute(game: Phaser.Game): () => void {
    if (boundGame === game) return () => {};
    boundGame = game;
    const apply = (): void => { if (game.sound) applyMute(game.sound, settings.muted); };
    const start = (): void => {
        apply();
        // Unlocking the AudioContext (first gesture) must not undo the mute.
        game.sound?.on(Phaser.Sound.Events.UNLOCKED, apply);
    };
    if (game.isBooted) start(); else game.events.once(Phaser.Core.Events.READY, start);
    const off = settings.onChange(apply);
    return () => {
        off();
        game.events.off(Phaser.Core.Events.READY, start);
        game.sound?.off(Phaser.Sound.Events.UNLOCKED, apply);
        if (boundGame === game) boundGame = null;
    };
}

export class FallbackAudio implements AudioService {
    private current: Phaser.Sound.BaseSound | null = null;
    private currentKey: string | null = null;
    private readonly offSettings: () => void;

    constructor(private readonly scene: Phaser.Scene) {
        this.applySettings();
        this.offSettings = settings.onChange(() => this.applySettings());
    }

    applySettings(): void {
        applyMute(this.scene.sound, settings.muted);
        if (this.current && 'setVolume' in this.current) {
            (this.current as Phaser.Sound.WebAudioSound).setVolume(settings.get().musicVolume);
        }
    }

    sfx(key: string, opts?: { volume?: number; detune?: number; x?: number }): void {
        if (settings.muted || !this.scene.cache.audio.exists(key)) return;
        let pan = 0;
        if (opts?.x !== undefined) {
            const cam = this.scene.cameras.main;
            pan = Phaser.Math.Clamp((opts.x - (cam.scrollX + cam.width / 2)) / cam.width, -0.6, 0.6);
        }
        this.scene.sound.play(key, { volume: settings.get().sfxVolume * (opts?.volume ?? 1), detune: opts?.detune ?? 0, pan });
    }

    music(key: string | null, opts?: { fade?: number }): void {
        if (key === this.currentKey) return;
        const old = this.current;
        if (old) {
            const fade = opts?.fade ?? 0;
            if (fade > 0) {
                this.scene.tweens.add({ targets: old, volume: 0, duration: fade, onComplete: () => old.destroy() });
            } else old.destroy();
        }
        this.current = null;
        this.currentKey = key;
        if (!key || !this.scene.cache.audio.exists(key)) return;
        this.current = this.scene.sound.add(key, { loop: true, volume: settings.get().musicVolume });
        this.current.play();
    }

    destroy(): void {
        this.offSettings();
        this.current?.destroy();
        this.current = null;
        this.currentKey = null;
    }
}
