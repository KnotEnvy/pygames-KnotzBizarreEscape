// Enemies A (Phase G, docs/MISSION2.md): GATORGEDDON, Mission 2's main boss (mech alligator).
// Stub landed by the Lead so the A/B split never edits the same file. Enemies A owns this file and fills it in.
import type Phaser from 'phaser';
import type { RegisterContext } from '../../core/contracts';

/** What registerEnemies' debug hooks (`boss`, `bossPhase`) and fixtures read from any boss. */
export interface TrackedBoss extends Phaser.GameObjects.GameObject {
    phase: number;
    snapshot(): unknown;
    setHp(value: number): void;
}

/**
 * Registers `boss:gatorgeddon` (and the `enemytest=gatorgeddon` fixture). Called from registerEnemies.
 * Call `track(boss)` when the boss spawns so the shared `boss` / `bossPhase` debug hooks report it.
 */
export function registerGatorgeddon(ctx: RegisterContext, track: (boss: TrackedBoss) => void): void {
    void ctx; void track;
}
