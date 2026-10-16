// Run flow: lives → death → respawn → game over → continue/quit, pause, stage clear.
// Uses the UI team's scenes when they exist ('Pause', 'Continue', 'Results', 'Title'), otherwise a tiny
// built-in fallback so the game is always playable.
import Phaser from 'phaser';
import type { FlowService, GameContext } from './contracts';
import type { RunStateStore } from './state';
import { DEPTH } from './depth';
import { latchHeldInputs } from './input';
import { ENGINE } from '../config/tuning/engine';

export function sceneExists(scene: Phaser.Scene, key: string): boolean {
    return scene.scene.manager.keys[key] !== undefined;
}

export class GameFlow implements FlowService {
    private isOver = false;
    /**
     * Set by resume()/continueGame(): the key that closed Pause/Continue (Esc/Enter are both `pause`) must not
     * pause the game again on its way up. Cleared once `pause` is released.
     */
    private pauseLatch = false;
    private lastDeath = { x: 0, y: 0, index: 0 };
    private overlay: Phaser.GameObjects.Text | null = null;
    private countdownMs = 0;
    private internalPause = false;
    private cleared = false;
    /** Player indexes whose death was counted and who haven't been sent game:respawn yet (dedupes player:died). */
    private readonly dead = new Set<number>();

    constructor(private readonly ctx: GameContext, private readonly store: RunStateStore) {
        const ev = ctx.events;
        ev.on('player:died', e => this.onDied(e.x, e.y, e.index ?? 0));
        ev.on('stage:clear', e => this.onClear(e.stage));
    }

    get over(): boolean { return this.isOver; }

    isDead(index = 0): boolean { return this.dead.has(index); }

    private get scene(): Phaser.Scene { return this.ctx.scene; }

    private onDied(x: number, y: number, index: number): void {
        if (this.isOver || this.dead.has(index)) return;
        this.dead.add(index);
        this.lastDeath.x = x; this.lastDeath.y = y; this.lastDeath.index = index;
        this.store.stats.deaths++;
        this.store.lives -= 1;
        if (this.store.lives > 0) {
            this.scene.time.delayedCall(ENGINE.run.respawnDelayMs, () => this.respawn());
        } else {
            this.scene.time.delayedCall(ENGINE.run.respawnDelayMs, () => this.gameOver());
        }
    }

    /** Respawn near the death spot, on safe ground inside the camera. */
    respawn(): void {
        const { x, y } = this.safeSpot(this.lastDeath.x);
        this.dead.delete(this.lastDeath.index);
        this.ctx.events.emit('game:respawn', { x, y, index: this.lastDeath.index });
    }

    safeSpot(nearX: number): { x: number; y: number } {
        const cam = this.ctx.camera;
        const phys = this.ctx.physics;
        const view = cam.view();
        const l = cam.leftEdge() + 24, r = cam.rightEdge() - 24;
        const x0 = Phaser.Math.Clamp(nearX, l, r);
        const top = Math.max(this.ctx.level.bounds.y, view.y - 32);
        const probe = (x: number): number | null => {
            const g = phys.groundBelow(x, top, view.height + 96);
            return g !== null && !phys.hazardAt(x, g - 4) ? g : null;
        };
        for (let d = 0; d <= r - l; d += 8) {
            for (const x of [x0 + d, x0 - d]) {
                if (x < l || x > r) continue;
                const g = probe(x);
                if (g !== null) return { x, y: g };
            }
        }
        const cp = this.store.checkpoint;
        if (cp) return { x: cp.x, y: cp.y };
        return { x: x0, y: view.y + 16 };
    }

    private gameOver(): void {
        this.isOver = true;
        this.ctx.events.emit('game:over', {});
        if (sceneExists(this.scene, 'Continue')) {
            this.scene.scene.launch('Continue');
            return;
        }
        this.countdownMs = 9000;
        this.showOverlay('');
    }

    continueGame(): void {
        if (!this.isOver) return;
        this.isOver = false;
        this.pauseLatch = true;
        // The Enter/Z that confirmed CONTINUE must not jump/shoot/pause the respawned player until released.
        latchHeldInputs(this.scene);
        this.hideOverlay();
        if (this.scene.scene.isActive('Continue')) this.scene.scene.stop('Continue');
        this.store.resetForContinue();
        this.ctx.events.emit('game:continue', {});
        this.respawn();
    }

    quit(): void {
        this.hideOverlay();
        const sm = this.scene.scene;
        for (const k of ['Continue', 'HUD', 'Pause']) if (sm.isActive(k) || sm.isPaused(k)) sm.stop(k);
        if (sceneExists(this.scene, 'Title')) sm.start('Title');
        else sm.restart();
    }

    pause(): void {
        if (this.isOver || this.ctx.time.paused || this.scene.scene.isPaused()) return;
        this.ctx.events.emit('game:pause', { paused: true });
        if (sceneExists(this.scene, 'Pause')) {
            this.scene.scene.launch('Pause');
            this.scene.scene.pause();
            return;
        }
        this.internalPause = true;
        this.ctx.time.setPaused(true);
        this.showOverlay('PAUSED\n\nEsc / Enter to resume');
    }

    resume(): void {
        this.pauseLatch = true;
        if (this.internalPause) {
            this.internalPause = false;
            this.ctx.time.setPaused(false);
            this.hideOverlay();
        } else {
            const sm = this.scene.scene;
            if (sm.isActive('Pause') || sm.isPaused('Pause')) sm.stop('Pause');
            if (sm.isPaused()) sm.resume();
        }
        this.ctx.events.emit('game:pause', { paused: false });
    }

    private onClear(stage: number): void {
        if (this.cleared) return;
        this.cleared = true;
        this.scene.time.delayedCall(ENGINE.run.stageClearDelayMs, () => {
            const sm = this.scene.scene;
            if (sceneExists(this.scene, 'Results')) {
                const s = this.store;
                const data = {
                    stage, score: s.score, rescued: s.rescued, kills: s.stats.kills, deaths: s.stats.deaths,
                    accuracy: s.stats.shots > 0 ? Math.min(1, s.stats.hits / s.stats.shots) : 0,
                    timeMs: this.ctx.time.now - s.stats.startedAt, difficulty: s.difficulty
                };
                if (sm.isActive('HUD')) sm.stop('HUD');
                sm.start('Results', data);
            } else {
                this.showOverlay('MISSION COMPLETE!');
            }
        });
    }

    /** Engine calls this every frame (real dt) for pause input and the fallback continue countdown. */
    update(rawDt: number): void {
        const input = this.ctx.input;
        if (this.internalPause) {
            if (input.justDown('pause')) this.resume();
            return;
        }
        if (this.isOver && this.overlay) {
            this.countdownMs -= rawDt;
            const n = Math.max(0, Math.ceil(this.countdownMs / 1000));
            this.overlay.setText(`GAME OVER\n\nCONTINUE?  ${n}\n\nPress Enter / Z`);
            if (input.justDown('confirm') || input.justDown('pause')) this.continueGame();
            else if (this.countdownMs <= 0) this.quit();
            return;
        }
        if (this.pauseLatch) {
            if (input.isDown('pause')) return;
            this.pauseLatch = false;
        }
        if (!this.isOver && input.justDown('pause')) this.pause();
    }

    private showOverlay(text: string): void {
        if (!this.overlay) {
            this.overlay = this.scene.add.text(this.scene.scale.width / 2, this.scene.scale.height / 2, '', {
                fontFamily: 'monospace', fontSize: '10px', color: '#f4f0f6', align: 'center',
                backgroundColor: '#1a1220cc', padding: { x: 10, y: 8 }
            }).setOrigin(0.5).setScrollFactor(0).setDepth(DEPTH.DEBUG - 1);
        }
        this.overlay.setText(text).setVisible(true);
    }

    private hideOverlay(): void {
        this.overlay?.setVisible(false);
    }
}
