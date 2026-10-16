import Phaser from 'phaser';

class BootProbe extends Phaser.Scene {
    constructor() { super('BootProbe'); }
    create() {
        this.add.text(192, 108, 'KNOTZ BIZARRE ESCAPE\nPhaser ' + Phaser.VERSION, { fontFamily: 'monospace', fontSize: '12px', align: 'center' }).setOrigin(0.5);
    }
}

new Phaser.Game({
    type: Phaser.WEBGL,
    parent: 'game-container',
    width: 384,
    height: 216,
    pixelArt: true,
    backgroundColor: '#0b0810',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [BootProbe]
});
