// UI team registration (called by GameScene.create after FX, before the player/enemies/level):
//   - hands score popups to the HUD scene (FX fallback off),
//   - wires event-driven sound into the run's AudioEngine,
//   - launches the mission Intro over the first seconds of a mission's first part (skipped with ?fast=1),
//   - keeps the part:start payload for the HUD title card (the HUD scene starts one frame after the event),
//   - exposes `__KBE.state().ui`.
import type { RegisterContext } from '../core/contracts';
import type { GameEvents } from '../core/events';
import type { PartDef } from '../config/campaign';
import { missionOf } from '../config/campaign';
import { PARAMS } from '../core/params';
import { sceneExists } from '../core/flow';
import { registerDebug } from '../core/debug/hooks';
import { AudioEngine, wireAudioEvents } from '../audio';
import { UI } from '../config/tuning/ui';

/** Flow timestamps (performance.now()) the menus use to tell the opening press from new ones. */
export const flowStamps = { pauseRequestedAt: 0 };

export const uiDebug = { intro: false, hud: null as unknown, lastPrompt: '', lastCallout: '', log: [] as string[] };

/**
 * Facts about the current run the Results scene needs after the Game is gone (the engine's payload lacks them).
 * `powTotals` keeps every part's reported POW count across the parts of a run (the module outlives Game scenes).
 */
export const runInfo = { stage: 0, powTotal: 0, partId: '', powTotals: {} as Record<string, number> };

let pendingPart: GameEvents['part:start'] | null = null;

/** The part:start the HUD missed because it was launched on the same frame (consumed once). */
export function takePendingPart(): GameEvents['part:start'] | null {
    const p = pendingPart;
    pendingPart = null;
    return p;
}

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
    pendingPart = null;
    // Phase E: the part being played (read defensively; Engine's campaign context may land after this code).
    const part = (ctx as { part?: PartDef }).part;
    // The level reports its POW count on LevelQuery (optional): remember it for the Results rank (per part).
    const notePows = (stage: number): void => {
        runInfo.stage = stage;
        runInfo.powTotal = ctx.level?.powTotal ?? 0;
        runInfo.partId = part?.id ?? '';
        if (part && runInfo.powTotal > 0) runInfo.powTotals[part.id] = runInfo.powTotal;
    };
    bus.on('stage:start', e => notePows(e.stage));
    bus.on('stage:clear', e => notePows(e.stage));
    bus.on('part:start', e => { pendingPart = e; });
    bus.once('stage:start', e => {
        const mission = part?.mission ?? e.stage;
        const partNo = part?.part ?? 1;
        // The "MISSION n START!" slam opens a mission; later parts get the HUD title card only.
        if (PARAMS.fast || partNo !== 1 || !sceneExists(ctx.scene, 'Intro')) return;
        uiDebug.intro = true;
        const m = part ? missionOf(part.id) : undefined;
        ctx.scene.scene.launch('Intro', { stage: mission, name: m?.name ?? e.name, tagline: UI.intro.taglines[mission] });
    });
    registerDebug('ui', () => ({ intro: uiDebug.intro, lastPrompt: uiDebug.lastPrompt, lastCallout: uiDebug.lastCallout, hud: uiDebug.hud, log: uiDebug.log.slice(), runInfo: { ...runInfo, powTotals: { ...runInfo.powTotals } } }));
}
