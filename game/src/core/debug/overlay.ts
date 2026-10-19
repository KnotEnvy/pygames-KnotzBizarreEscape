// ?debug=1 overlay: FPS + engine stats, Arcade physics debug, hurtboxes (team-colored), camera edges/lock.
// F2 toggles it at runtime. Debug only, so per-frame cost here is not a concern.
import Phaser from 'phaser';
import type { GameContext, Team } from '../contracts';
import type { EngineInternals } from '../context';
import { DEPTH } from '../depth';

const TEAM_COLOR: Record<Team, number> = { player: 0x39d98a, enemy: 0xf07a5a, neutral: 0xffe066 };

export class DebugOverlay {
    private readonly g: Phaser.GameObjects.Graphics;
    private readonly text: Phaser.GameObjects.Text;
    private on = true;

    constructor(private readonly ctx: GameContext, private readonly internals: EngineInternals) {
        const scene = ctx.scene;
        this.g = scene.add.graphics().setDepth(DEPTH.DEBUG);
        this.text = scene.add.text(2, 2, '', {
            fontFamily: 'monospace', fontSize: '8px', color: '#b6ff6a', backgroundColor: '#1a1220aa', padding: { x: 2, y: 1 }
        }).setScrollFactor(0).setDepth(DEPTH.DEBUG);
        const world = scene.physics.world;
        if (!world.debugGraphic) world.createDebugGraphic();
        world.drawDebug = true;
        world.debugGraphic?.setDepth(DEPTH.DEBUG - 1);
        scene.input.keyboard?.on('keydown-F2', () => this.toggle());
    }

    toggle(): void {
        this.on = !this.on;
        const world = this.ctx.scene.physics.world;
        world.drawDebug = this.on;
        world.debugGraphic?.clear().setVisible(this.on);
        this.g.setVisible(this.on);
        this.text.setVisible(this.on);
    }

    update(): void {
        if (!this.on) return;
        const { ctx, internals } = this;
        const g = this.g;
        g.clear();
        ctx.damage.forEach(h => {
            const r = ctx.damage.rectOf(h);
            g.lineStyle(1, TEAM_COLOR[h.team], h.alive() ? 1 : 0.3).strokeRect(r.x, r.y, r.width, r.height);
        });
        const view = ctx.camera.view();
        const cam = internals.camera.debugInfo();
        g.lineStyle(1, 0x39d98a, 0.8).lineBetween(ctx.camera.leftEdge() + 1, view.y, ctx.camera.leftEdge() + 1, view.bottom);
        if (cam.locked) {
            g.lineStyle(1, 0xf07a5a, 1).lineBetween(cam.x0 + 1, view.y, cam.x0 + 1, view.bottom).lineBetween(cam.x1 - 1, view.y, cam.x1 - 1, view.bottom);
        }
        const b = ctx.level.bounds;
        g.lineStyle(1, 0xa64cc4, 0.8).strokeRect(b.x, b.y, b.width, b.height);
        const p = ctx.player();
        const loop = ctx.scene.game.loop;
        this.text.setText([
            `fps ${loop.actualFps.toFixed(0)}  t×${ctx.time.scale.toFixed(2)}${ctx.time.frozen ? ' FROZEN' : ''}`,
            `cam ${view.x.toFixed(0)},${view.y.toFixed(0)}${cam.locked ? ` LOCK ${cam.x0}-${cam.x1}` : ''}`,
            `p ${p ? `${p.x.toFixed(0)},${p.y.toFixed(0)}${p.alive() ? '' : ' DEAD'}` : '-'}  lives ${ctx.state.lives}`,
            `proj ${internals.projectiles.count}  hurt e${ctx.damage.count('enemy')} p${ctx.damage.count('player')}`,
            ctx.cheats.god ? 'GOD' : ''
        ].join('\n'));
    }
}
