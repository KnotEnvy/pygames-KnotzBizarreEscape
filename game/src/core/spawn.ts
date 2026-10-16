// Spawn registry. Lookup order for ctx.spawn(type, kind, ...): '<type>:<kind>' → '<type>:*' → '<type>'.
// Unknown keys log one warning per key and spawn a magenta placeholder box (never crash). A factory that throws
// logs one console.error per key and also gets a placeholder.
import Phaser from 'phaser';
import type { GameContext, SpawnFactory, SpawnRegistry } from './contracts';
import { DEPTH } from './depth';
import { TEX } from './textures';

export class SpawnTable implements SpawnRegistry {
    private readonly factories = new Map<string, SpawnFactory>();
    private readonly warned = new Set<string>();
    private readonly failed = new Set<string>();
    /** Count of spawns per key (debug). */
    readonly counts = new Map<string, number>();

    register(key: string, f: SpawnFactory): void {
        this.factories.set(key, f);
    }

    has(key: string): boolean {
        return this.factories.has(key);
    }

    resolve(type: string, kind: string): SpawnFactory | undefined {
        if (kind) return this.factories.get(`${type}:${kind}`) ?? this.factories.get(`${type}:*`) ?? this.factories.get(type);
        return this.factories.get(type) ?? this.factories.get(`${type}:*`);
    }

    spawn(ctx: GameContext, type: string, kind: string, props: Record<string, unknown>, x: number, y: number): unknown {
        const key = kind ? `${type}:${kind}` : type;
        this.counts.set(key, (this.counts.get(key) ?? 0) + 1);
        const f = this.resolve(type, kind);
        if (f) {
            try {
                return f(ctx, x, y, props);
            } catch (e) {
                // A broken factory must not take down the level load: log it (once per key) and place a placeholder.
                if (!this.failed.has(key)) {
                    this.failed.add(key);
                    console.error(`[spawn] factory for '${key}' threw at (${Math.round(x)}, ${Math.round(y)}); placing a placeholder:`, e);
                }
                return placeholder(ctx.scene, x, y, key);
            }
        }
        if (!this.warned.has(key)) {
            this.warned.add(key);
            console.warn(`[spawn] no factory for '${key}', placing a placeholder at (${Math.round(x)}, ${Math.round(y)})`);
        }
        return placeholder(ctx.scene, x, y, key);
    }

    keys(): string[] {
        return [...this.factories.keys()];
    }
}

/** Magenta box, bottom-center anchored, labeled in debug mode. */
export function placeholder(scene: Phaser.Scene, x: number, y: number, label: string): Phaser.GameObjects.Image {
    const img = scene.add.image(x, y, TEX.missing).setOrigin(0.5, 1).setDepth(DEPTH.PROPS);
    img.setName(`placeholder:${label}`);
    return img;
}
