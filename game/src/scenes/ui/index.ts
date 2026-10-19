// UI scenes (owned by the UI/HUD/audio team). Scene keys contract:
//   'Title','Intro','HUD','Pause','Continue','PartClear','Results','Options','Credits'
// List order = render order for scenes running at the same time: HUD over Game, Intro over HUD, Pause over HUD,
// Options/Credits over Title or Pause, Continue over everything in-game.
import type Phaser from 'phaser';
import { TitleScene } from './TitleScene';
import { HudScene } from './HudScene';
import { IntroScene } from './IntroScene';
import { PauseScene } from './PauseScene';
import { ContinueScene } from './ContinueScene';
import { ResultsScene } from './ResultsScene';
import { PartClearScene } from './PartClearScene';
import { OptionsScene } from './OptionsScene';
import { CreditsScene } from './CreditsScene';

export const uiScenes: Phaser.Types.Scenes.SceneType[] = [
    TitleScene, HudScene, IntroScene, PauseScene, ContinueScene, PartClearScene, ResultsScene, OptionsScene, CreditsScene
];

export { TitleScene, HudScene, IntroScene, PauseScene, ContinueScene, PartClearScene, ResultsScene, OptionsScene, CreditsScene };
