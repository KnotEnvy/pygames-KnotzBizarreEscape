// UI/audio team: the AudioService installed on every GameContext (`ctx.audio`) plus `getAudio(scene)` for UI scenes.
// The AudioEngine is one per Phaser.Game and outlives Game runs; a run's service wires the camera listener in and
// stops the run's loops/voices on shutdown. Event-driven sound is wired by registerUi (src/ui/index.ts).
import type Phaser from 'phaser';
import type { AudioService } from '../core/contracts';
import { AudioEngine } from './engine';

export function createAudioService(scene: Phaser.Scene): AudioService {
    const engine = AudioEngine.for(scene.game);
    engine.setListener(() => scene.cameras.main.scrollX + scene.cameras.main.width / 2);
    return {
        sfx: (key, opts) => engine.sfx(key, opts),
        music: (key, opts) => engine.music(key, opts),
        applySettings: () => engine.applySettings(),
        destroy: () => engine.endRun()
    };
}

/** The shared engine from any scene (Title music, menu blips, Results tally). */
export function getAudio(scene: Phaser.Scene): AudioEngine {
    return AudioEngine.for(scene.game);
}

export { AudioEngine, type LoopHandle, type SfxOptions, type MusicOptions, type AudioDebugState } from './engine';
export { wireAudioEvents } from './events';
export { SFX_ALIASES, SFX_META, MUSIC_ALIASES, MUSIC_META, GAMEPLAY_MUSIC, bossMusicFor } from './catalog';
