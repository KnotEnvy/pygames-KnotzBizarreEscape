// Engine-generated fallback textures (built once in BootScene with Graphics.generateTexture).
// Colors come from the master palette (docs/ART-STYLE.md).
import Phaser from 'phaser';

export const TEX = {
    px: 'kbe_px',
    missing: 'kbe_missing',
    bullet: 'kbe_bullet',
    enemyBullet: 'kbe_ebullet',
    devTiles: 'kbe_dev_tiles',
    devPlayer: 'kbe_dev_player',
    devTarget: 'kbe_dev_target',
    devSpark: 'kbe_dev_spark'
} as const;

export const PAL = {
    outline: 0x1a1220,
    ink2: 0x48405a, ink3: 0x6e6680, ink5: 0xc9c3d1,
    olive1: 0x1f2a14, olive2: 0x34461f, olive3: 0x4f6b2b, olive4: 0x73903c, olive5: 0xa2b85a,
    skin4: 0xe8a878,
    sand3: 0xa88c52, sand4: 0xd2b878, sand5: 0xf0e0a8,
    red2: 0x6b1a1e, red3: 0xa02a26, red4: 0xd4483a, red5: 0xf07a5a,
    dirt1: 0x2a1a12, dirt2: 0x4a2e1c, dirt3: 0x6e4628, dirt4: 0x9a6a3c,
    leaf3: 0x2a5e30, leaf4: 0x44843c, leaf5: 0x6eae4c,
    sky2: 0x1f3f7a, sky3: 0x3a6cb0, sky4: 0x6aa2dc, sky5: 0xa8d4f0,
    steel2: 0x2f3d52, steel3: 0x4c6075, steel4: 0x75899c,
    fire4: 0xffae22, fire5: 0xffe066, fire6: 0xfff8d0,
    weird1: 0x3c1452, magenta: 0xff00ff,
    white: 0xffffff
} as const;

type Draw = (g: Phaser.GameObjects.Graphics) => void;

function make(scene: Phaser.Scene, key: string, w: number, h: number, draw: Draw): void {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({ x: 0, y: 0 }, false);
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
}

export function createEngineTextures(scene: Phaser.Scene): void {
    make(scene, TEX.px, 1, 1, g => { g.fillStyle(PAL.white).fillRect(0, 0, 1, 1); });

    make(scene, TEX.missing, 16, 16, g => {
        g.fillStyle(PAL.magenta).fillRect(0, 0, 16, 16);
        g.fillStyle(PAL.outline).fillRect(0, 0, 16, 1).fillRect(0, 15, 16, 1).fillRect(0, 0, 1, 16).fillRect(15, 0, 1, 16);
        for (let i = 2; i < 14; i++) { g.fillRect(i, i, 1, 1); g.fillRect(15 - i, i, 1, 1); }
    });

    // Player shot: sand/white streak, 8×3, pointing right.
    make(scene, TEX.bullet, 8, 3, g => {
        g.fillStyle(PAL.sand4).fillRect(0, 1, 3, 1);
        g.fillStyle(PAL.sand5).fillRect(2, 0, 5, 3);
        g.fillStyle(PAL.white).fillRect(4, 1, 4, 1);
    });

    // Enemy shot: fire core with a red rim, 6×6 (must pop on every background).
    make(scene, TEX.enemyBullet, 6, 6, g => {
        g.fillStyle(PAL.red4).fillRect(1, 0, 4, 6).fillRect(0, 1, 6, 4);
        g.fillStyle(PAL.fire5).fillRect(1, 1, 4, 4);
        g.fillStyle(PAL.fire6).fillRect(2, 2, 2, 2);
    });

    make(scene, TEX.devSpark, 4, 4, g => {
        g.fillStyle(PAL.fire5).fillRect(1, 0, 2, 4).fillRect(0, 1, 4, 2);
        g.fillStyle(PAL.white).fillRect(1, 1, 2, 2);
    });

    // Dev tileset: 1 dirt, 2 grass-top dirt, 3 wooden one-way plank, 4 water, 5 steel block, 6 spikes.
    make(scene, TEX.devTiles, 96, 16, g => {
        const dirt = (ox: number) => {
            g.fillStyle(PAL.dirt3).fillRect(ox, 0, 16, 16);
            g.fillStyle(PAL.dirt2);
            for (let i = 0; i < 6; i++) g.fillRect(ox + ((i * 7 + 3) % 15), (i * 5 + 2) % 15, 2, 1);
            g.fillStyle(PAL.dirt4).fillRect(ox + 2, 5, 1, 1).fillRect(ox + 11, 10, 1, 1);
        };
        dirt(0);
        dirt(16);
        g.fillStyle(PAL.leaf4).fillRect(16, 0, 16, 4);
        g.fillStyle(PAL.leaf5).fillRect(16, 0, 16, 1);
        g.fillStyle(PAL.leaf3).fillRect(17, 4, 3, 1).fillRect(24, 4, 4, 1);
        // plank
        g.fillStyle(PAL.dirt4).fillRect(32, 0, 16, 5);
        g.fillStyle(PAL.sand3).fillRect(32, 0, 16, 1);
        g.fillStyle(PAL.dirt2).fillRect(32, 5, 16, 1).fillRect(39, 1, 1, 4);
        g.fillStyle(PAL.dirt2).fillRect(34, 6, 2, 4).fillRect(44, 6, 2, 4);
        // water
        g.fillStyle(PAL.sky3).fillRect(48, 0, 16, 16);
        g.fillStyle(PAL.sky4).fillRect(48, 0, 16, 2);
        g.fillStyle(PAL.sky5).fillRect(50, 0, 4, 1).fillRect(58, 1, 3, 1);
        g.fillStyle(PAL.sky2).fillRect(48, 10, 16, 6);
        // steel
        g.fillStyle(PAL.steel3).fillRect(64, 0, 16, 16);
        g.fillStyle(PAL.steel4).fillRect(64, 0, 16, 1).fillRect(64, 0, 1, 16);
        g.fillStyle(PAL.steel2).fillRect(64, 15, 16, 1).fillRect(79, 0, 1, 16);
        g.fillStyle(PAL.steel4).fillRect(67, 3, 1, 1).fillRect(76, 3, 1, 1).fillRect(67, 12, 1, 1).fillRect(76, 12, 1, 1);
        // spikes
        g.fillStyle(PAL.steel4);
        for (let i = 0; i < 4; i++) g.fillTriangle(80 + i * 4, 16, 82 + i * 4, 6, 84 + i * 4, 16);
        g.fillStyle(PAL.white);
        for (let i = 0; i < 4; i++) g.fillRect(82 + i * 4, 7, 1, 1);
    });

    // Placeholder player: olive soldier block, 14×28.
    make(scene, TEX.devPlayer, 14, 28, g => {
        g.fillStyle(PAL.outline).fillRect(0, 0, 14, 28);
        g.fillStyle(PAL.olive3).fillRect(1, 1, 12, 7); // helmet
        g.fillStyle(PAL.olive4).fillRect(2, 1, 9, 2);
        g.fillStyle(PAL.skin4).fillRect(3, 8, 9, 5); // face
        g.fillStyle(PAL.outline).fillRect(9, 9, 2, 2); // eye
        g.fillStyle(PAL.olive3).fillRect(1, 13, 12, 8); // torso
        g.fillStyle(PAL.sand3).fillRect(1, 17, 12, 2); // belt
        g.fillStyle(PAL.olive2).fillRect(1, 21, 5, 6).fillRect(8, 21, 5, 6); // legs
        g.fillStyle(PAL.steel2).fillRect(8, 15, 6, 2); // gun
    });

    // Dummy target: red regime block, 16×24.
    make(scene, TEX.devTarget, 16, 24, g => {
        g.fillStyle(PAL.outline).fillRect(0, 0, 16, 24);
        g.fillStyle(PAL.red3).fillRect(1, 1, 14, 22);
        g.fillStyle(PAL.red4).fillRect(1, 1, 14, 3);
        g.fillStyle(PAL.sand4).fillRect(4, 6, 8, 5);
        g.fillStyle(PAL.outline).fillRect(5, 8, 2, 1).fillRect(9, 8, 2, 1);
        g.fillStyle(PAL.red2).fillRect(1, 15, 14, 2);
        g.fillStyle(PAL.white).fillRect(6, 18, 4, 4);
        g.fillStyle(PAL.red3).fillRect(7, 19, 2, 2);
    });
}
