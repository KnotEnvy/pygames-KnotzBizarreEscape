// UI team registration (called by GameScene.create after FX, before the player/enemies/level):
//   - hands score popups to the HUD scene (FX fallback off),
//   - wires event-driven sound into the run's AudioEngine,
//   - launches the mission Intro over the first seconds of gameplay (skipped with ?fast=1),
//   - exposes `__KBE.state().ui`.
import type { RegisterContext } from '../core/contracts';
import { PARAMS } from '../core/params';
import { sceneExists } from '../core/flow';
import { registerDebug } from '../core/debug/hooks';
import { AudioEngine, wireAudioEvents } from '../audio';

export const uiDebug = { intro: false, hud: null as unknown, lastPrompt: '', lastCallout: '', log: [] as string[], traceInput: 0 };

/** Dev trace of UI flow moments (`__KBE.state().ui.log`): scene opens/closes with a ms timestamp. */
export function uiLog(msg: string): void {
    uiDebug.log.push(`${Math.round(performance.now())} ${msg}`);
    if (uiDebug.log.length > 40) uiDebug.log.shift();
}

export function registerUi(ctx: RegisterContext): void {
    ctx.scene.registry.set('fx.popups', false);
    const engine = AudioEngine.for(ctx.scene.game);
    wireAudioEvents(ctx, engine);

    const bus = ctx.events.scoped(ctx.scene);
    // Subscribe now (the HUD scene only exists a frame later) so the engine's dev fallback prompt stays off.
    bus.on('ui:prompt', e => { uiDebug.lastPrompt = e.text; });
    uiDebug.intro = false;
    bus.once('stage:start', e => {
        if (PARAMS.fast || !sceneExists(ctx.scene, 'Intro')) return;
        uiDebug.intro = true;
        ctx.scene.scene.launch('Intro', { stage: e.stage, name: e.name });
    });
    registerDebug('ui', () => ({ intro: uiDebug.intro, lastPrompt: uiDebug.lastPrompt, lastCallout: uiDebug.lastCallout, hud: uiDebug.hud, log: uiDebug.log.slice() }));
}
