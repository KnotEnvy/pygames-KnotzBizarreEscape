// STUB created by Engine — owned by UI, HUD and audio. Replace freely; keep `createAudioService(scene)`.
// The engine's FallbackAudio plays keys from the Phaser sound cache, ignores missing keys and respects mute.
import type Phaser from 'phaser';
import type { AudioService } from '../core/contracts';
import { FallbackAudio } from '../core/audio';

export function createAudioService(scene: Phaser.Scene): AudioService {
    return new FallbackAudio(scene);
}
