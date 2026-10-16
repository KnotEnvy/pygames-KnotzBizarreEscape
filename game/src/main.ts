import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { PreloadScene } from './scenes/PreloadScene';
import { GameScene } from './scenes/GameScene';
import { uiScenes } from './scenes/ui';
import { installKbe } from './core/debug/hooks';
import { bindGlobalMute } from './core/audio';
import { PARAMS } from './core/params';
import { ENGINE } from './config/tuning/engine';

export const VERSION = '0.1.0';

// Scene keys contract: 'Boot','Preload','Title','Intro','Game','HUD','Pause','Continue','Results','Options','Credits'.
const game = new Phaser.Game({
    type: Phaser.WEBGL,
    parent: 'game-container',
    width: ENGINE.width,
    height: ENGINE.height,
    pixelArt: true,
    backgroundColor: '#0b0810',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: ENGINE.gravity }, debug: PARAMS.debug }
    },
    input: { gamepad: true },
    audio: { noAudio: false },
    scene: [BootScene, PreloadScene, GameScene, ...uiScenes]
});

installKbe(game, `${VERSION} (phaser ${Phaser.VERSION})`);
const unbindMute = bindGlobalMute(game);

// Dev: if Vite ever hot-swaps this module instead of reloading the page, tear the old game down first so
// listeners, sounds and WebGL contexts are never duplicated.
if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        unbindMute();
        game.destroy(true);
    });
}
