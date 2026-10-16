// Fallback AudioService: plays keys from the Phaser sound cache if present, silently ignores missing keys,
// respects mute/volumes from settings. The UI/audio team's createAudioService (src/audio) may wrap or replace it.
import Phaser from 'phaser';
import type { AudioService } from './contracts';
import { settings } from './settings';

export class FallbackAudio implements AudioService {
    private current: Phaser.Sound.BaseSound | null = null;
    private currentKey: string | null = null;
    private readonly offSettings: () => void;

    constructor(private readonly scene: Phaser.Scene) {
        this.applySettings();
        this.offSettings = settings.onChange(() => this.applySettings());
    }

    applySettings(): void {
        this.scene.sound.mute = settings.muted;
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
