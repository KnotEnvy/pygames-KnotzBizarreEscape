// Escape-route map (Phase E PART CLEAR, Phase G Results mission break): the mission's field map (ui_map_m1 Pine Ridge,
// ui_map_m2 Blackwater Bayou; UI.partClear.maps) with a pictogram per part on the route, dotted route, the Knotz marker
// that travels from the cleared part to the next one and a bouncing pin.
import Phaser from 'phaser';
import { TEX, hasAnim, tagFrame } from '../core';
import { getAudio } from '../audio';
import { UI } from '../config/tuning/ui';
import { C, F, roman, text } from './widgets';

type MapSpec = (typeof UI.partClear.maps)[number];

/** The route map of a mission (Mission 1's when a mission has none yet). */
export function mapSpec(mission: number): MapSpec {
    return UI.partClear.maps[mission] ?? UI.partClear.maps[1];
}

export class RouteMap {
    private readonly spec: MapSpec;
    readonly container: Phaser.GameObjects.Container;
    readonly width: number;
    readonly height: number;
    private readonly dots: Phaser.GameObjects.Image[] = [];
    private readonly dotT: number[] = [];
    private readonly knotz: Phaser.GameObjects.Sprite;
    private readonly pin: Phaser.GameObjects.Sprite;
    private readonly cum: number[] = [];
    private readonly total: number;
    private travelled = false;
    private tween: Phaser.Tweens.Tween | null = null;

    constructor(private readonly scene: Phaser.Scene, x: number, y: number, private readonly from: number, private readonly to: number, parts: number[], mission = 1) {
        const M = UI.partClear;
        const spec = this.spec = mapSpec(mission);
        this.width = M.map.w; this.height = M.map.h;
        this.container = scene.add.container(x, y);
        if (scene.textures.exists(spec.key)) this.container.add(scene.add.image(0, 0, spec.key).setOrigin(0, 0));
        else this.container.add(scene.add.rectangle(0, 0, M.map.w, M.map.h, 0xa88c52, 1).setOrigin(0, 0));
        // polyline lengths
        const R = spec.route;
        this.cum.push(0);
        for (let i = 1; i < R.length; i++) this.cum.push(this.cum[i - 1] + Phaser.Math.Distance.Between(R[i - 1][0], R[i - 1][1], R[i][0], R[i][1]));
        this.total = this.cum[this.cum.length - 1];
        // route dots between the two markers (lit as the marker passes)
        const a = spec.routeIndex[from] ?? 0, b = spec.routeIndex[to] ?? R.length - 1;
        const d0 = this.cum[Math.min(a, b)], d1 = this.cum[Math.max(a, b)];
        for (let d = d0 + 3; d < d1 - 2; d += 4) {
            const p = this.pointAt(d);
            const dot = scene.add.image(Math.round(p.x) - 1, Math.round(p.y) - 1, TEX.px).setOrigin(0, 0).setDisplaySize(2, 2).setTint(C.sand5).setAlpha(0.55);
            this.dots.push(dot);
            this.dotT.push((d - d0) / Math.max(1, d1 - d0));
            this.container.add(dot);
        }
        // pictograms + numerals
        for (const n of parts) {
            const anchor = spec.anchors[n];
            if (!anchor) continue;
            const tag = spec.pictograms[n];
            const frame = tag ? tagFrame(scene, tag) : undefined;
            const img = frame !== undefined ? scene.add.image(anchor.x, anchor.y, 'ui_map', frame).setOrigin(0.5, 1) : scene.add.rectangle(anchor.x, anchor.y, 10, 8, 0xd4483a, 1).setOrigin(0.5, 1);
            if (n < from || (n === from && from !== to)) img.setAlpha(0.75);
            this.container.add(img);
            const lab = text(scene, anchor.x, anchor.y + 3, roman(n), n === to ? F.gold : F.hud, [0.5, 0]);
            if (n !== to) lab.setTint(n === from ? C.white : C.ink3);
            this.container.add(lab);
        }
        // the player marker at the cleared part, the pin hidden at the next one
        const start = this.pointAt(this.cum[a]);
        this.knotz = scene.add.sprite(Math.round(start.x), Math.round(start.y) - 1, 'ui_map').setOrigin(0.5, 1);
        const kf = tagFrame(scene, 'map_knotz');
        if (kf !== undefined) this.knotz.setFrame(kf);
        if (hasAnim(scene, 'map_knotz')) this.knotz.play({ key: 'map_knotz', repeat: -1 });
        const end = this.pointAt(this.cum[b]);
        this.pin = scene.add.sprite(Math.round(end.x), Math.round(end.y) - 14, 'ui_map').setOrigin(0.5, 1).setVisible(false);
        const pf = tagFrame(scene, 'map_pin');
        if (pf !== undefined) this.pin.setFrame(pf);
        this.container.add([this.knotz, this.pin]);
    }

    private pointAt(d: number): { x: number; y: number } {
        const R = this.spec.route;
        d = Phaser.Math.Clamp(d, 0, this.total);
        for (let i = 1; i < R.length; i++) {
            if (d <= this.cum[i]) {
                const seg = this.cum[i] - this.cum[i - 1];
                const k = seg > 0 ? (d - this.cum[i - 1]) / seg : 0;
                return { x: R[i - 1][0] + (R[i][0] - R[i - 1][0]) * k, y: R[i - 1][1] + (R[i][1] - R[i - 1][1]) * k };
            }
        }
        return { x: R[R.length - 1][0], y: R[R.length - 1][1] };
    }

    /** Animate the marker from the cleared part to the next one; `onArrive` fires when the pin drops. */
    travel(onArrive?: () => void): void {
        if (this.travelled) return;
        this.travelled = true;
        const M = UI.partClear;
        const R = this.spec;
        const a = R.routeIndex[this.from] ?? 0, b = R.routeIndex[this.to] ?? R.route.length - 1;
        const d0 = this.cum[a], d1 = this.cum[b];
        const prog = { t: 0 };
        this.tween = this.scene.tweens.add({
            targets: prog, t: 1, duration: M.travelMs, ease: 'Sine.easeInOut',
            onUpdate: () => {
                const p = this.pointAt(d0 + (d1 - d0) * prog.t);
                this.knotz.setPosition(Math.round(p.x), Math.round(p.y) - 1);
                this.dots.forEach((dot, i) => { if (this.dotT[i] <= prog.t) dot.setTint(C.fire5).setAlpha(1); });
            },
            onComplete: () => {
                this.pin.setVisible(true);
                if (hasAnim(this.scene, 'map_pin')) this.pin.play({ key: 'map_pin', repeat: -1 });
                getAudio(this.scene).sfx('radio_blip', { volume: 0.8, detune: 200 });
                onArrive?.();
            }
        });
    }

    /** Jump straight to the arrived state (tally skipped, or confirm while the marker is still travelling). */
    finish(): void {
        if (this.arrived) return;
        this.travelled = true;
        // A running travel tween would otherwise complete later and fire onArrive a second time.
        this.tween?.stop();
        this.tween = null;
        const R = this.spec;
        const end = this.pointAt(this.cum[R.routeIndex[this.to] ?? R.route.length - 1]);
        this.knotz.setPosition(Math.round(end.x), Math.round(end.y) - 1);
        for (const dot of this.dots) dot.setTint(C.fire5).setAlpha(1);
        this.pin.setVisible(true);
        if (hasAnim(this.scene, 'map_pin')) this.pin.play({ key: 'map_pin', repeat: -1 });
    }

    get arrived(): boolean { return this.pin.visible; }

    destroy(): void {
        this.tween?.stop();
        this.tween = null;
        this.container.destroy(true);
    }
}
