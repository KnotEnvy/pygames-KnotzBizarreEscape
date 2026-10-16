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

/** Flow timestamps (performance.now()) the menus use to tell the opening press from new ones. */
export const flowStamps = { pauseRequestedAt: 0 };

export const uiDebug = { intro: false, hud: null as unknown, lastPrompt: '', lastCallout: '', log: [] as string[] };

/** Facts about the current run the Results scene needs after the Game is gone (the engine's payload lacks them). */
export const runInfo = { stage: 0, powTotal: 0 };

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
    bus.on('game:pause', e => { if (e.paused) flowStamps.pauseRequestedAt = performance.now(); });
    uiDebug.intro = false;
    // The level reports its POW count on LevelQuery (optional): remember it for the Results rank.
    const notePows = (stage: number): void => { runInfo.stage = stage; runInfo.powTotal = ctx.level?.powTotal ?? 0; };
    bus.on('stage:start', e => notePows(e.stage));
    bus.on('stage:clear', e => notePows(e.stage));
    bus.once('stage:start', e => {
        if (PARAMS.fast || !sceneExists(ctx.scene, 'Intro')) return;
        uiDebug.intro = true;
        ctx.scene.scene.launch('Intro', { stage: e.stage, name: e.name });
    });
    registerDebug('ui', () => ({ intro: uiDebug.intro, lastPrompt: uiDebug.lastPrompt, lastCallout: uiDebug.lastCallout, hud: uiDebug.hud, log: uiDebug.log.slice() }));
}
