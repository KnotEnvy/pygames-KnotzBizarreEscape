import Phaser from 'phaser';
import { settings, type GameContext } from '../core';
import { FX } from '../config/tuning/fx';

// One texture sample: fixed logical scanlines, restrained vignette and optional mild barrel.
// UVs are Y-up in Phaser 4. Quantize after distortion to retain authored pixel edges.
const FRAGMENT = `
#pragma phaserTemplate(shaderName)
precision mediump float;
uniform sampler2D uMainSampler;
uniform float uHeight;
uniform float uScanline;
uniform float uVignette;
uniform float uBarrel;
varying vec2 outTexCoord;
void main() {
    vec2 p = outTexCoord * 2.0 - 1.0;
    vec2 uv = 0.5 + p * (1.0 + uBarrel * dot(p,p)) * 0.5;
    vec2 grid = vec2(uHeight * 16.0 / 9.0, uHeight);
    vec2 pixel = (floor(uv * grid) + 0.5) / grid;
    vec4 c = texture2D(uMainSampler, clamp(pixel, vec2(0.0), vec2(1.0)));
    float line = 1.0 - uScanline * mod(floor(uv.y * uHeight), 2.0);
    float edge = 1.0 - uVignette * smoothstep(0.25, 1.8, dot(p,p));
    gl_FragColor = vec4(c.rgb * line * edge, c.a);
}`;
class CrtNode extends Phaser.Renderer.WebGL.RenderNodes.BaseFilterShader {
    constructor(manager: Phaser.Renderer.WebGL.RenderNodes.RenderNodeManager) { super('KbeFxCrt', manager, undefined, FRAGMENT); }
    setupUniforms(controller: Phaser.Filters.Controller): void {
        this.programManager.setUniform('uHeight', controller.camera.height);
        this.programManager.setUniform('uScanline', FX.crt.scanline);
        this.programManager.setUniform('uVignette', FX.crt.vignette);
        this.programManager.setUniform('uBarrel', FX.crt.barrel);
    }
}
export class FxFilters {
    private readonly bloom: Phaser.Types.Actions.AddEffectBloomReturn;
    private readonly crt: Phaser.Filters.Controller;
    private readonly offSettings: () => void;
    private readonly internal: Phaser.GameObjects.Components.FilterList;
    private readonly external: Phaser.GameObjects.Components.FilterList;
    private readonly noBloom = new URLSearchParams(location.search).get('fxbloom') === '0';
    constructor(ctx: GameContext) {
        const camera = ctx.scene.cameras.main;
        this.internal = camera.filters.internal; this.external = camera.filters.external;
        const renderer = ctx.scene.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer;
        if (!renderer.renderNodes.hasNode('KbeFxCrt')) renderer.renderNodes.addNodeConstructor('KbeFxCrt', CrtNode);
        [this.bloom] = Phaser.Actions.AddEffectBloom(camera, {
            threshold: FX.bloom.threshold, blurRadius: 1, blurSteps: 2, blurQuality: 0,
            blendAmount: FX.bloom.strength, blendMode: Phaser.BlendModes.ADD, useInternal: true
        });
        this.bloom.parallelFilters.active = false;
        this.crt = camera.filters.external.add(new Phaser.Filters.Controller(camera, 'KbeFxCrt'));
        this.applySettings();
        this.offSettings = settings.onChange(() => this.applySettings());
    }
    applySettings(): void { this.crt.active = settings.get().crt; }
    update(hot: number): void { this.bloom.parallelFilters.active = FX.bloom.enabled && !this.noBloom && hot > 0; }
    get mode(): string { return this.bloom.parallelFilters.active ? this.crt.active ? 'bloom+crt' : 'bloom' : this.crt.active ? 'plain+crt' : 'plain'; }
    destroy(): void {
        this.offSettings();
        // CameraManager may already have shut down; retained lists are safe even after their clear.
        this.internal.remove(this.bloom.parallelFilters);
        this.external.remove(this.crt);
    }
}
