// Small construction helpers shared by the UI scenes (bitmap text, 9-slice panels, atlas tag frames, dimmers).
import Phaser from 'phaser';
import { TEX, hasAnim, tagFrame } from '../core';
import { UI } from '../config/tuning/ui';

export const F = UI.fonts;
export const C = UI.colors;
export const W = UI.screen.w;
export const H = UI.screen.h;

type Scene = Phaser.Scene;

function sizeOf(font: string): number {
    return font.startsWith('font_callout') ? F.calloutSize : F.hudSize;
}

/** Bitmap text at the font's native size. `origin` = [0..1, 0..1] (default top-left). */
export function text(scene: Scene, x: number, y: number, str: string, font: string = F.hud, origin: [number, number] = [0, 0]): Phaser.GameObjects.BitmapText {
    const t = scene.add.bitmapText(x, y, font, str, sizeOf(font));
    t.setOrigin(origin[0], origin[1]);
    return t;
}

/** 9-slice panel with its top-left at (x, y). `thin` uses the 12 px panel with 4 px borders. */
export function panel(scene: Scene, x: number, y: number, w: number, h: number, thin = false): Phaser.GameObjects.NineSlice {
    const b = thin ? 4 : 8;
    const p = scene.add.nineslice(x, y, thin ? 'ui_panel_thin' : 'ui_panel', undefined, w, h, b, b, b, b);
    p.setOrigin(0, 0);
    return p;
}

/** Full-screen dimmer (alpha 0 → use tweens to fade it in). */
export function dimmer(scene: Scene, alpha = 0, color: number = C.dim): Phaser.GameObjects.Rectangle {
    return scene.add.rectangle(0, 0, W, H, color, 1).setOrigin(0, 0).setAlpha(alpha).setScrollFactor(0);
}

/** 1 px white pixel stretched to a rect (bars, separators). */
export function bar(scene: Scene, x: number, y: number, w: number, h: number, color: number, alpha = 1): Phaser.GameObjects.Image {
    return scene.add.image(x, y, TEX.px).setOrigin(0, 0).setDisplaySize(w, h).setTint(color).setAlpha(alpha);
}

/**
 * An image showing a static Aseprite tag of `texture` (core's `tagFrame`). Missing art falls back to the engine's
 * magenta `TEX.missing` so it is obvious in a screenshot, and is reported once in dev.
 */
export function icon(scene: Scene, x: number, y: number, texture: string, tag: string): Phaser.GameObjects.Image {
    const frame = tagFrame(scene, tag);
    if (frame === undefined || !scene.textures.exists(texture)) {
        if (import.meta.env.DEV) console.warn(`[ui] icon '${tag}' of '${texture}' is missing`);
        return scene.add.image(x, y, TEX.missing).setOrigin(0, 0);
    }
    return scene.add.image(x, y, texture, frame).setOrigin(0, 0);
}

/** Play a tag on a sprite if it is a valid animation (core's `hasAnim`: exists AND has frames); missing art never throws. */
export function playTag(sprite: Phaser.GameObjects.Sprite, tag: string, repeat = -1): boolean {
    if (!sprite.scene || !hasAnim(sprite.scene, tag)) return false;
    sprite.play({ key: tag, repeat }, true);
    return true;
}

export function pad(n: number, digits: number): string {
    const s = String(Math.max(0, Math.floor(n)));
    return s.length >= digits ? s : '0'.repeat(digits - s.length) + s;
}

export function mmss(ms: number): string {
    const s = Math.max(0, Math.floor(ms / 1000));
    return `${pad(Math.floor(s / 60), 2)}:${pad(s % 60, 2)}`;
}

export const WEAPON_NAMES: Record<string, string> = {
    hmg: 'HEAVY MACHINE GUN!', spread: 'SPREAD SHOT!', rocket: 'ROCKET LAUNCHER!', flame: 'FLAME SHOT!', laser: 'LASER GUN!', shotgun: 'SHOTGUN!'
};

/** 1 → 'I', 2 → 'II', 3 → 'III', 4 → 'IV' (part numerals on title cards and tallies). */
export function roman(n: number): string {
    const table: [number, string][] = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    let v = Math.max(0, Math.floor(n)), out = '';
    for (const [k, s] of table) while (v >= k) { out += s; v -= k; }
    return out || '0';
}

/** Greedy word wrap for the monospace bitmap fonts: lines of at most `cols` characters (long words are cut). */
export function wrapText(text: string, cols: number): string[] {
    const lines: string[] = [];
    let line = '';
    for (const word of text.split(/\s+/).filter(Boolean)) {
        let w = word;
        while (w.length > cols) {
            if (line) { lines.push(line); line = ''; }
            lines.push(w.slice(0, cols));
            w = w.slice(cols);
        }
        if (!line) line = w;
        else if (line.length + 1 + w.length <= cols) line += ' ' + w;
        else { lines.push(line); line = w; }
    }
    if (line) lines.push(line);
    return lines;
}
