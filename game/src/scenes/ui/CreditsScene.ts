// Credits overlay (from the Title): a slow scroll of the teams and the original pygame game over a dim panel.
// Any input (after a short grace) or the end of the scroll closes it.
import Phaser from 'phaser';
import { getAudio } from '../../audio';
import { C, F, H, W, dimmer, panel, text } from '../../ui/widgets';
import { MenuInput } from '../../ui/input';

const LINES: Array<[string, string] | null> = [
    ['KNOTZ BIZARRE ESCAPE', F.fire],
    ['A PHASER 4 REMAKE OF THE PYGAME ORIGINAL', F.hud],
    null,
    ['ORIGINAL PYGAME GAME', F.sand], ['KNOTENVY', F.hud],
    null,
    ['LEAD & DIRECTION', F.sand], ['THE LEAD', F.hud],
    null,
    ['ENGINE', F.sand], ['ENGINE TEAM', F.hud],
    null,
    ['PLAYER & WEAPONS', F.sand], ['PLAYER TEAM', F.hud],
    null,
    ['ENEMIES & MOOSEZILLA', F.sand], ['ENEMIES TEAM', F.hud],
    null,
    ['LEVELS & CONTENT', F.sand], ['LEVEL TEAM', F.hud],
    null,
    ['EFFECTS & GAME FEEL', F.sand], ['FX TEAM', F.hud],
    null,
    ['UI, HUD & AUDIO', F.sand], ['UI/AUDIO TEAM', F.hud],
    null,
    ['KEY ART', F.sand], ['IMAGE GENERATION TEAM', F.hud],
    null,
    ['QUALITY ASSURANCE', F.sand], ['QA TEAM', F.hud],
    null,
    ['PHASER 4 RULES', F.sand], ['RULES TEAM', F.hud],
    null,
    ['MUSIC & SOUND', F.sand], ['SYNTHESIZED WITH NUMPY & SCIPY', F.hud],
    null,
    ['MADE WITH', F.sand], ['PHASER 4.2.1  ●  TYPESCRIPT  ●  VITE', F.hud], ['ASEPRITE  ●  TILED', F.hud],
    null, null,
    ['THANKS FOR PLAYING!', F.fire]
];

export class CreditsScene extends Phaser.Scene {
    private onClose: (() => void) | undefined;
    private menuInput!: MenuInput;
    private roll!: Phaser.GameObjects.Container;
    private rollH = 0;
    private age = 0;
    private closing = false;

    constructor() { super('Credits'); }

    init(data: { onClose?: () => void }): void {
        this.onClose = data?.onClose;
    }

    create(): void {
        this.age = 0; this.closing = false;
        dimmer(this, 0.7);
        panel(this, 40, 18, 304, 180);
        text(this, W / 2, 28, 'CREDITS', F.sand, [0.5, 0]);
        this.roll = this.add.container(0, 0);
        let y = 0;
        for (const line of LINES) {
            if (!line) { y += 8; continue; }
            const [s, font] = line;
            this.roll.add(text(this, W / 2, y, s, font, [0.5, 0]));
            y += font.startsWith('font_callout') ? 22 : 11;
        }
        this.rollH = y;
        this.roll.setPosition(0, 170);
        // mask the scroll to the panel's inner area: a cheap cover above and below instead of a filter mask
        this.add.rectangle(42, 20, 300, 28, C.outline, 1).setOrigin(0, 0).setAlpha(0.001);
        this.add.rectangle(42, 46, 300, 2, C.sand3, 1).setOrigin(0, 0).setAlpha(0.4);
        this.add.rectangle(42, 180, 300, 2, C.sand3, 1).setOrigin(0, 0).setAlpha(0.4);
        text(this, W / 2, 190, 'ANY KEY: BACK', F.plain, [0.5, 0.5]).setAlpha(0.6);
        this.coverRects();
        this.menuInput = new MenuInput(this);
    }

    /** Hide the roll outside the window with two opaque bands (panel-coloured) above and below it. */
    private coverRects(): void {
        this.add.rectangle(0, 0, W, 48, C.dim, 1).setOrigin(0, 0).setAlpha(0.0).setDepth(2);
        const top = this.add.rectangle(42, 20, 300, 28, 0x2a2338, 1).setOrigin(0, 0).setDepth(2);
        const bottom = this.add.rectangle(42, 182, 300, 16, 0x2a2338, 1).setOrigin(0, 0).setDepth(2);
        const above = this.add.rectangle(0, 0, W, 18, C.dim, 1).setOrigin(0, 0).setAlpha(0.7).setDepth(2);
        const below = this.add.rectangle(0, 198, W, H - 198, C.dim, 1).setOrigin(0, 0).setAlpha(0.7).setDepth(2);
        for (const r of [top, bottom, above, below]) r.setScrollFactor(0);
        // re-add the header and footer over the covers
        text(this, W / 2, 28, 'CREDITS', F.sand, [0.5, 0]).setDepth(3);
        text(this, W / 2, 190, 'ANY KEY: BACK', F.plain, [0.5, 0.5]).setAlpha(0.6).setDepth(3);
    }

    private close(): void {
        if (this.closing) return;
        this.closing = true;
        getAudio(this).sfx('ui_back');
        const cb = this.onClose;
        this.scene.stop();
        cb?.();
    }

    update(_time: number, delta: number): void {
        if (this.closing) return;
        const dt = Math.min(100, delta);
        this.age += dt;
        this.menuInput.update(dt);
        const fast = this.menuInput.isDown('down') || this.menuInput.isDown('confirm');
        this.roll.y -= dt * (fast ? 0.09 : 0.018);
        // Lines outside the panel window are hidden (no mask filter): the covers only trim partially visible ones.
        for (const line of this.roll.list as Phaser.GameObjects.BitmapText[]) {
            const y = this.roll.y + line.y;
            line.setVisible(y > 40 && y + line.height < 186);
        }
        if (this.roll.y < 60 - this.rollH || (this.age > 400 && (this.menuInput.back || this.menuInput.justDown('pause') || this.menuInput.justDown('jump') || this.menuInput.justDown('shoot')))) this.close();
    }
}
