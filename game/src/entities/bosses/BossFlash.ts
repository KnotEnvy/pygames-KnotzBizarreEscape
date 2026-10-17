import Phaser from 'phaser';
import { settings } from '../../core/settings';

/** One flash owns every affected part, even when it leaves the boss container. */
export class BossFlash {
    private remaining = 0;
    private readonly parts = new Set<Phaser.GameObjects.Sprite>();

    start(parts: Iterable<Phaser.GameObjects.Sprite>, death = false): void {
        this.clear();
        this.remaining = death ? 100 : 50;
        const reduced = settings.get().reducedFlash;
        for (const sprite of parts) {
            if (!sprite.active) continue;
            this.parts.add(sprite);
            sprite.setTint(reduced ? 0xb8c8d8 : 0xffffff)
                .setTintMode(reduced ? Phaser.TintModes.MULTIPLY : Phaser.TintModes.FILL);
        }
    }

    /** Raw time keeps hitstop and slow motion from holding a white silhouette. */
    update(rawDt: number): void {
        if (this.remaining > 0 && (this.remaining -= rawDt) <= 0) this.clear();
    }

    clear(): void {
        for (const sprite of this.parts) if (sprite.active) sprite.clearTint();
        this.parts.clear();
        this.remaining = 0;
    }
}
