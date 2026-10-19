// Generic object pools. Free-list based, no allocation on get/release once warmed up.
import type { Pool, PoolService } from './contracts';

export class SimplePool<T> implements Pool<T> {
    private readonly freeList: T[] = [];
    private total = 0;

    constructor(private readonly factory: () => T, private readonly reset?: (item: T) => void, prealloc = 0) {
        for (let i = 0; i < prealloc; i++) { this.freeList.push(factory()); this.total++; }
    }

    get(): T {
        if (this.freeList.length > 0) return this.freeList.pop() as T;
        this.total++;
        return this.factory();
    }

    release(item: T): void {
        this.reset?.(item);
        this.freeList.push(item);
    }

    get size(): number { return this.total; }
    get free(): number { return this.freeList.length; }
}

export class PoolRegistry implements PoolService {
    private readonly pools = new Map<string, Pool<unknown>>();

    create<T>(key: string, factory: () => T, reset?: (item: T) => void, prealloc = 0): Pool<T> {
        const existing = this.pools.get(key);
        if (existing) return existing as Pool<T>;
        const pool = new SimplePool<T>(factory, reset, prealloc);
        this.pools.set(key, pool as Pool<unknown>);
        return pool;
    }

    get<T>(key: string): Pool<T> | undefined {
        return this.pools.get(key) as Pool<T> | undefined;
    }

    stats(): Record<string, { size: number; free: number }> {
        const out: Record<string, { size: number; free: number }> = {};
        for (const [k, p] of this.pools) out[k] = { size: p.size, free: p.free };
        return out;
    }
}
