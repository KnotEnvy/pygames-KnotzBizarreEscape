// Hurtbox registry + hit queries. Team rules: player → enemy|neutral, enemy → player, neutral → everyone.
// God mode (ctx.cheats.god) is enforced here: player-team hurtboxes ignore all hits.
import Phaser from 'phaser';
import type { DamageService, HitInfo, Hurtbox, Team } from './contracts';
import type { EventBus } from './events';

export class DamageRegistry implements DamageService {
    private readonly boxes: Hurtbox[] = [];
    private readonly scratchRect = new Phaser.Geom.Rectangle();
    private readonly rectOut: Hurtbox[] = [];
    private readonly radialInfo: HitInfo = { damage: 0, source: 'neutral', x: 0, y: 0, dirX: 0, dirY: 0, kind: 'explosion' };
    /** Snapshot used while iterating so hits that register/unregister boxes don't break the loop. */
    private readonly iterBuf: Hurtbox[] = [];

    /** Player-team hurtboxes ignore hits while true (the camera's boss-intro cinematic sets it). */
    playerShield = false;

    constructor(private readonly events: EventBus, private readonly cheats: { god: boolean }) {}

    register(h: Hurtbox): () => void {
        this.boxes.push(h);
        let done = false;
        return () => {
            if (done) return;
            done = true;
            const i = this.boxes.indexOf(h);
            if (i >= 0) this.boxes.splice(i, 1);
        };
    }

    canHit(source: Team, target: Team): boolean {
        if (source === 'neutral') return true;
        if (source === 'player') return target !== 'player';
        return target === 'player';
    }

    rectOf(h: Hurtbox): Phaser.Geom.Rectangle {
        const b = h.body;
        const r = this.scratchRect;
        if (typeof b === 'function') {
            const src = b();
            r.setTo(src.x, src.y, src.width, src.height);
        } else if (b instanceof Phaser.Geom.Rectangle) {
            r.setTo(b.x, b.y, b.width, b.height);
        } else {
            r.setTo(b.x, b.y, b.width, b.height);
        }
        return r;
    }

    private eligible(h: Hurtbox, source: Team): boolean {
        if (!this.canHit(source, h.team) || !h.alive()) return false;
        if (h.team === 'player' && (this.cheats.god || this.playerShield)) return false;
        return !(h.invulnerable?.() ?? false);
    }

    queryPoint(x: number, y: number, source: Team): Hurtbox | null {
        for (let i = this.boxes.length - 1; i >= 0; i--) {
            const h = this.boxes[i];
            if (!this.eligible(h, source)) continue;
            const r = this.rectOf(h);
            if (x >= r.x && x <= r.right && y >= r.y && y <= r.bottom) return h;
        }
        return null;
    }

    queryCircle(x: number, y: number, rad: number, source: Team, exclude?: readonly Hurtbox[]): Hurtbox | null {
        const r2 = rad * rad;
        for (let i = this.boxes.length - 1; i >= 0; i--) {
            const h = this.boxes[i];
            if (exclude && exclude.indexOf(h) >= 0) continue;
            if (!this.eligible(h, source)) continue;
            const r = this.rectOf(h);
            const cx = x < r.x ? r.x : x > r.right ? r.right : x;
            const cy = y < r.y ? r.y : y > r.bottom ? r.bottom : y;
            const dx = x - cx, dy = y - cy;
            if (dx * dx + dy * dy <= r2) return h;
        }
        return null;
    }

    queryRect(q: Phaser.Geom.Rectangle, source: Team): readonly Hurtbox[] {
        const out = this.rectOut;
        out.length = 0;
        for (let i = 0; i < this.boxes.length; i++) {
            const h = this.boxes[i];
            if (!this.eligible(h, source)) continue;
            const r = this.rectOf(h);
            if (r.x <= q.right && r.right >= q.x && r.y <= q.bottom && r.bottom >= q.y) out.push(h);
        }
        return out;
    }

    deal(h: Hurtbox, info: HitInfo): boolean {
        if (!this.eligible(h, info.source)) return false;
        if (h.hit(info) === false) return false;
        this.events.emit('entity:hurt', {
            x: info.x, y: info.y, team: h.team, kind: info.kind, material: h.material ?? 'flesh', damage: info.damage, entity: h.kind
        });
        return true;
    }

    applyRadial(x: number, y: number, radius: number, damage: number, source: Team, kind: HitInfo['kind'] = 'explosion', weapon?: string): number {
        const r2 = radius * radius;
        const list = this.iterBuf;
        list.length = 0;
        for (let i = 0; i < this.boxes.length; i++) list.push(this.boxes[i]);
        const info = this.radialInfo;
        let hits = 0;
        for (let i = 0; i < list.length; i++) {
            const h = list[i];
            if (!this.eligible(h, source)) continue;
            const r = this.rectOf(h);
            const cx = x < r.x ? r.x : x > r.right ? r.right : x;
            const cy = y < r.y ? r.y : y > r.bottom ? r.bottom : y;
            const dx = cx - x, dy = cy - y;
            if (dx * dx + dy * dy > r2) continue;
            // Direction from blast center to the box center (pushes things away).
            let ux = r.centerX - x, uy = r.centerY - y;
            const len = Math.hypot(ux, uy);
            if (len > 0.001) { ux /= len; uy /= len; } else { ux = 0; uy = -1; }
            info.damage = damage; info.source = source; info.kind = kind; info.weapon = weapon;
            info.x = cx; info.y = cy; info.dirX = ux; info.dirY = uy;
            if (this.deal(h, info)) hits++;
        }
        list.length = 0;
        return hits;
    }

    count(team: Team): number {
        let n = 0;
        for (let i = 0; i < this.boxes.length; i++) if (this.boxes[i].team === team && this.boxes[i].alive()) n++;
        return n;
    }

    forEach(fn: (h: Hurtbox) => void): void {
        const list = this.boxes.slice();
        for (let i = 0; i < list.length; i++) fn(list[i]);
    }

    clear(): void {
        this.boxes.length = 0;
    }
}
