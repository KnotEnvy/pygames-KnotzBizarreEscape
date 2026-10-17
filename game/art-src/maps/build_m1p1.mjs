#!/usr/bin/env node
// Mission 1 Part I "THE CAMP" (map m1p1): prison camp, pine forest, rope bridge, outpost, then the fenced yard
// where WARDEN'S SNOWCAT (mid-boss) crashes through the gate.
//   node art-src/maps/build_m1p1.mjs   -> art-src/maps/m1p1.tmx; art-src/maps/build.sh m1p1 exports + validates.
// The DSL lives in lib/mapkit.mjs. Coordinates are in TILES unless a name says px.
import { mapkit } from './lib/mapkit.mjs';

const k = mapkit({ W: 420, H: 24, G: 21, tilesets: ['stage1'] });
const { H, G, mat, clear, put, putIfEmpty, ground, backMass, platform, bigTree, trunk, hills, fence, palisade, sandbags, water,
  ropeBridge, facade, farPine, sp, tr, enemy, prop, pow, pickup, hash, decorate, finish, write } = k;
const W = k.W;

const SECTIONS = [
  { id: 'prison_camp', x0: 0, x1: 60 },
  { id: 'pine_forest', x0: 60, x1: 170 },
  { id: 'river_bridge', x0: 170, x1: 250 },
  { id: 'regime_outpost', x0: 250, x1: 360 },
  { id: 'warden_yard', x0: 360, x1: 420 },
];

// ================================================================================================
// 1. PRISON CAMP (0-60): gentle intro. Broken cell, sleeping guard, watchtowers, first POW (hmg),
//    sandbag turret taught by the BOMB sign.
// ================================================================================================
ground(0, 59, G);
mat('ground', 0, 1, 8, G - 1, 'rock');          // left cliff closes the stage
mat('ground', 2, 2, 14, G - 1, 'rock');
mat('ground', 3, 9, G - 1, G - 1, 'concrete');   // cell slab (1-tile step)
sandbags(14, 15, G - 2, G - 1);                  // first jump (2 tiles), under the JUMP sign
ground(29, 33, G - 1);                           // small mound
platform('plank', 26, 28, 16);                   // watchtower 1 deck (prop drawn over it)
sandbags(50, 52, G - 2, G - 1);                  // turret emplacement
platform('plank', 43, 46, 18);                   // supply shelf on posts
for (const x of [43, 46]) { put('back', x, 19, 'post_mid'); put('back', x, 20, 'post_base'); }
platform('plank', 55, 57, 16);                   // watchtower 2 deck

hills(2, 9, 12, 15, 'rock', 1);
fence(8, 33, G - 1, 4, 5);
facade(34, 43, 15, G - 1, [[35, 17, 'wall_window_lit'], [38, 17, 'wall_window_dark'], [41, 17, 'wall_window_lit'],
  [36, 19, 'wall_vent'], [42, 19, 'wall_warn'], [39, 19, 'wall_crack']]);
fence(44, 53, G - 1, 4, 5);
palisade(54, 59, G - 1, 4);
for (const x of [24, 25]) put('front', x, G - 1, 'barbwire_coil');
for (let x = 8; x <= 33; x++) putIfEmpty('back', x, G - 5, 'barbwire_strand');

player();
function player() { sp('player_start', 6, G - 1, {}, 'player_start'); }
prop('prison_cell', 5, G - 1, { variant: 'broken', layer: 'back' });
prop('flag', 9, G - 1, { layer: 'back' });
prop('sign_shoot', 10, G);                       // 2 tiles apart: signs are 32 px wide
prop('sign_jump', 12, G);
enemy('grunt', 20, G, { idle: 'sleep', facing: 'right' }); // back to the player: a free sneak-up beat (wakes on sight/noise)
prop('watchtower', 27, G, { layer: 'back' });
enemy('grunt', 27, 16, { facing: 'left' });
enemy('grunt', 25, G, { patrol: 32 });          // patrols clear of the sleeper (x376-432)
pow('hmg', 31, G - 1);
// crouch lesson: painted DOWN + FIRE sign, then one low crate holding the first reward. Standing fire sails over
// it, the crouch shot breaks it. The first crouching (low-cover) grunt follows right after.
prop('sign_crouch', 34, G);
prop('crate', 37, G, { contains: 'points' });
enemy('grunt', 39, G, { patrol: 32 });
prop('lamp_post', 40, G, { layer: 'back' });
enemy('grunt', 42, G, { idle: 'crouch' });
prop('supply_crate', 44, 18, { contains: 'bombs' });
prop('sign_bomb', 47, G);
prop('explosive_barrel', 49, G);
enemy('turret', 51, G - 2, { mount: 'sandbag' });
prop('watchtower', 56, G, { layer: 'back' });
prop('searchlight', 56, 16, { layer: 'back', sweep: 1 });
enemy('grunt', 57, 16);
prop('alarm_light', 54, 15, { layer: 'back', on: false });
prop('flag', 59, G - 4, { layer: 'back' });

tr('checkpoint', 2, 3, 0, H - 1, { id: 'cp_camp' });
tr('music', 0, 1, 0, H - 1, { key: 'music_stage1' });
tr('ambience', 0, 59, 0, H - 1, { fx: 'snow' });
tr('prompt', 10, 13, 12, G - 1, { text: 'SHOOT: X   JUMP: Z' });
tr('prompt', 45, 48, 12, G - 1, { text: 'BOMB: C' });
tr('prompt', 29, 32, 12, G - 1, { text: 'FREE THE POW!' });
tr('prompt', 34, 36, 12, G - 1, { text: 'CROUCH SHOT: HOLD \u2193 + X' });

// ================================================================================================
// 2. PINE FOREST (60-170): stepped terrain, rock outcrop with an upper route, two climbable giant
//    pines (branch platforms), POW in a tree (spread), drones, grenadiers on ledges, log over a
//    spiked ravine, a breather clearing, then the first shield trooper.
// ================================================================================================
ground(60, 71, G);
ground(72, 79, G - 1);
ground(80, 87, G - 2);
ground(88, 94, G - 1);
ground(95, 101, G);
mat('ground', 102, 103, G - 2, H - 1, 'rock');
mat('ground', 104, 115, 17, 19, 'rock'); ground(104, 115, 20);
mat('ground', 116, 118, 17, 18, 'rock');          // overhang (icicles under it)
ground(116, 145, G);
ground(140, 145, G - 1);
ground(146, 149, H - 1);                          // ravine floor
for (let x = 146; x <= 149; x++) put('ground', x, H - 2, 'spikes_wood');
backMass(145, 150, G - 1, H - 1, 'ground'); // pit walls behind the ravine
ground(150, 160, G - 1);
ground(161, 169, G);
platform('log', 84, 88, 16);
platform('log', 96, 100, 18);
platform('log', 118, 121, 14);                    // outcrop -> tree 1
platform('log', 145, 150, G - 1);                 // log across the ravine
bigTree(123, G, [{ y: 17, len: 3, dir: 1 }, { y: 11, len: 4, dir: 1 }, { y: 8, len: 3, dir: -1 }], 0,
  [{ y: 13, n: 4, dir: -1 }]);                     // behind the outcrop log: that route enters the canopy
bigTree(134, G, [{ y: 12, len: 3, dir: -1 }, { y: 15, len: 3, dir: 1 }, { y: 9, len: 4, dir: 1 }], 0,
  [{ y: 12, n: 3, dir: 1 }, { y: 16, n: 3, dir: -1 }]); // right cone R15/R12/R9 climbs to the tree POW
for (const x of [66, 91, 143, 158]) {
  const gt = (x >= 72 && x <= 79) ? G - 1 : (x >= 80 && x <= 87) ? G - 2 : (x >= 140 && x <= 145) || (x >= 150 && x <= 160) ? G - 1 : G;
  trunk(x, gt);
}
hills(94, 122, 14, 16, 'rock', 2);              // kept low: less stone behind the outcrop combat lane
hills(58, 70, 16, 18, 'ground', 3);
hills(146, 168, 15, 18, 'ground', 4);

prop('sign_arrow', 62, G);
enemy('grunt', 68, G, { patrol: 48 });
enemy('grunt', 77, G - 1, { idle: 'crouch' });
enemy('grenadier', 85, 16);                       // log-ledge grenadier alone: no grunt stacked under it
pickup('points', 86, 15, { float: true });
enemy('drone', 92, 12);
prop('crate', 90, G - 1, { contains: 'bombs' });
prop('explosive_barrel', 97, G);
enemy('grunt', 98, G);
enemy('grunt', 100, G, { patrol: 32 });
enemy('grenadier', 110, 17);                      // 5 tiles of safe landing on the outcrop's left end
enemy('grunt', 115, 17, { idle: 'crouch' });
prop('pine_dead', 106, 17, { layer: 'back' });
enemy('grunt', 117, G);
enemy('grenadier', 126, 17, { facing: 'left' });
enemy('drone', 120, 12);                          // drones stay inside the resting view: no off-screen dives
enemy('grunt', 130, G, { patrol: 64 });
pow('spread', 138, 9, { pose: 'tree' });
enemy('drone', 133, 7);
enemy('grunt', 127, 11);
pickup('points', 121, 7, { float: true });
prop('barrel', 141, G - 1);
enemy('grunt', 143, G - 1);
enemy('drone', 147, 13);
prop('supply_crate', 153, G - 1, { contains: 'hmg' });
prop('pine_fg', 151, G - 1, { layer: 'front' });
pickup('points', 156, G - 1);
enemy('shield', 163, G);
prop('sign_danger', 168, G);
for (const [x, gt] of [[64, G], [83, G - 2], [99, G], [131, G], [139, G], [157, G - 1], [165, G]]) prop('pine_mid', x, gt, { layer: 'back' });

tr('checkpoint', 60, 61, 0, H - 1, { id: 'cp_forest' });
tr('checkpoint', 128, 129, 0, H - 1, { id: 'cp_forest_b' });
tr('ambience', 60, 169, 0, H - 1, { fx: 'snow' });
tr('ambience', 118, 140, 0, H - 1, { fx: 'fireflies' });
tr('prompt', 121, 124, 4, 16, { text: 'AIM UP: HOLD UP + X' });

// ================================================================================================
// 3. RIVER BRIDGE (170-250): rope bridge over a deadly river, two jump gaps, paratroopers,
//    camera-lock arena #1 on a mid-river rock island, POW with the rocket launcher.
// ================================================================================================
mat('ground', 170, 171, G - 2, H - 1, 'rock');
mat('ground', 172, 172, 18, H - 1, 'rock');
water(173, 205, G);
mat('ground', 206, 221, 18, H - 1, 'rock');
water(222, 247, G);
mat('ground', 248, 250, 18, H - 1, 'rock');
mat('ground', 251, 252, G - 2, H - 1, 'rock');
ropeBridge(173, 205, 18, [173, 180, 186, 190, 197, 205], [[187, 189]]);
ropeBridge(222, 247, 18, [222, 229, 234, 238, 247], [[235, 237]]);
sandbags(213, 214, 17, 17);
hills(166, 176, 13, 16, 'rock', 5);
hills(207, 220, 14, 16, 'rock', 6, 17);
hills(245, 255, 12, 15, 'rock', 7);
for (let x = 174; x <= 246; x += 9) farPine(x, 15, 19, 2);

prop('sign_danger', 171, G - 2);
enemy('paratrooper', 179, 1);
enemy('grunt', 183, 18);
enemy('paratrooper', 190, 1);                     // lands well before the arena's lock edge
enemy('drone', 192, 12);                          // met before the arena, not hovering on its left wall
prop('flag', 210, 18, { layer: 'back' });
prop('lamp_post', 218, 18, { layer: 'back' });
prop('supply_crate', 209, 18, { contains: 'bombs' });
// arena #1 waves (spawned by the camera lock, not by proximity). Every member and its patrol stays inside the
// locked view (x 200-223): off-view enemies freeze, which stalled this arena in the owner's playtest.
const A1 = { lock: 'bridge' };
enemy('grunt', 219, 18, { ...A1, wave: 1, patrol: 16 });
enemy('grunt', 216, 18, { ...A1, wave: 1, delay: 600, patrol: 16 });
enemy('paratrooper', 209, 0, { ...A1, wave: 1, delay: 2400 });  // the drop follows the grunts instead of joining them
enemy('paratrooper', 217, 0, { ...A1, wave: 1, delay: 3400 });
enemy('shield', 219, 18, { ...A1, wave: 2, patrol: 16 });
// wave 2/3 threats arrive one side at a time (staggered), never a simultaneous two-sided crossfire
enemy('grunt', 203, 18, { ...A1, wave: 2, facing: 'right', delay: 1600, patrol: 16 });
enemy('grenadier', 220, 18, { ...A1, wave: 2, delay: 3400, patrol: 8 });
enemy('shield', 203, 18, { ...A1, wave: 3, facing: 'right', patrol: 16 });
enemy('drone', 218, 12, { ...A1, wave: 3, delay: 1400 });
enemy('drone', 204, 12, { ...A1, wave: 3, delay: 3200 });
enemy('paratrooper', 213, 0, { ...A1, wave: 3, delay: 4600 });
pow('rocket', 225, 18);                           // recovery beat: the POW right after the arena, no enemy on top of it
enemy('paratrooper', 240, 0);
enemy('drone', 243, 12);
enemy('grunt', 249, 18, { idle: 'crouch' });

tr('checkpoint', 170, 171, 0, H - 1, { id: 'cp_bridge' });
tr('camera_lock', 200, 223, 0, H - 1, { id: 'bridge', release: 'clear', waves: 3 });
tr('ambience', 170, 249, 0, H - 1, { fx: 'snow' });
tr('prompt', 172, 175, 10, 17, { text: 'DON\'T FALL IN!' });

// ================================================================================================
// 4. REGIME OUTPOST (250-360): concrete bunkers, catwalks, wall turrets, shield troopers, a spike
//    pit, a tunnel with an optional roof route to a hidden 1UP, POW with the flamethrower, and
//    camera-lock arena #2 (bunker breach).
// ================================================================================================
ground(253, 359, G, 'concrete');
ground(253, 253, G - 1, 'rock');
mat('ground', 256, 259, G, G, 'steel');
sandbags(257, 260, G - 2, G - 1);                 // wide landing step up to bunker A's roof (no trough)
mat('ground', 261, 270, 17, G - 1, 'concrete');   // bunker A
platform('catwalk', 271, 283, 17);
mat('ground', 284, 293, 14, G - 1, 'concrete');   // bunker B
clear('ground', 298, 300, G, G + 1);              // spike pit
for (let x = 298; x <= 300; x++) put('ground', x, G + 1, 'spikes');
backMass(297, 301, G, H - 1, 'concrete');
platform('catwalk', 302, 304, 18);
platform('catwalk', 305, 307, 15);
mat('ground', 308, 317, 12, 17, 'concrete');      // structure C (tunnel below)
platform('catwalk', 318, 320, 9);
platform('catwalk', 313, 315, 6);
platform('catwalk', 325, 329, 18);
platform('catwalk', 339, 343, 18);
sandbags(333, 334, G - 1, G - 1);
mat('ground', 346, 347, 17, G - 1, 'concrete');   // turret pillar
mat('ground', 350, 359, G, G, 'steel');

// skyline of separate buildings with gaps (the generated outpost backdrop shows through)
facade(254, 263, 15, G - 1, [[256, 17, 'wall_window_lit'], [260, 17, 'wall_window_dark'], [258, 19, 'wall_vent'], [262, 19, 'wall_warn']]);
facade(265, 281, 11, G - 1, [[267, 13, 'wall_window_lit'], [271, 13, 'wall_window_dark'], [275, 13, 'wall_window_lit'], [279, 13, 'wall_window_lit'],
  [273, 15, 'wall_poster_top'], [273, 16, 'wall_poster_bot'], [266, 18, 'wall_lamp'], [281, 18, 'wall_lamp'],
  [268, 16, 'wall_pipe_h'], [269, 16, 'wall_pipe_h'], [270, 16, 'wall_pipe_h'], [276, 19, 'wall_rivets'], [277, 19, 'wall_rivets']]);
for (let y = 11; y <= G - 1; y++) put('back', 264, y, y === 11 ? 'ladder_top' : 'ladder_mid');
facade(284, 297, 12, G - 1, [[286, 12, 'wall_vent'], [290, 12, 'wall_vent'], [295, 13, 'wall_poster_top'], [295, 14, 'wall_poster_bot'],
  [294, 17, 'wall_window_lit'], [296, 19, 'wall_warn']]);
for (let x = 284; x <= 297; x++) put('back', x, 11, x % 5 === 4 ? 'railing_post' : 'railing');
facade(301, 307, 14, G - 1, [[303, 16, 'wall_window_lit'], [302, 19, 'wall_vent'], [306, 18, 'wall_lamp']]);
facade(308, 317, 18, G - 1, [[310, 18, 'wall_lamp'], [315, 18, 'wall_lamp'], [312, 19, 'wall_hazard_band'], [313, 19, 'wall_hazard_band']]);
facade(318, 321, 13, G - 1, [[319, 15, 'wall_window_dark'], [320, 18, 'wall_warn']]);
for (let y = 2; y <= 11; y++) put('back', 316, y, y === 2 ? 'ladder_top' : 'ladder_mid');
for (let y = 6; y <= 11; y++) put('back', 312, y, 'hazard_post');
facade(322, 349, 12, G - 1, [[324, 14, 'wall_window_lit'], [330, 14, 'wall_poster_top'], [330, 15, 'wall_poster_bot'],
  [336, 14, 'wall_window_dark'], [344, 14, 'wall_window_lit'], [334, 17, 'wall_hazard_band'], [335, 17, 'wall_hazard_band'],
  [332, 12, 'wall_vent'], [348, 18, 'wall_warn'], [323, 18, 'wall_lamp'], [338, 19, 'wall_rivets'], [339, 19, 'wall_rivets']]);
for (let x = 322; x <= 349; x++) put('back', x, 11, x % 7 === 0 ? 'railing_post' : 'railing');
palisade(351, 359, G - 1, 4);

prop('sign_danger', 254, G);
enemy('grunt', 255, G, { idle: 'crouch' });
enemy('shield', 266, 17, { patrol: 0 });          // holds its post: the roof edge (x261-264) stays a clear landing
enemy('turret', 268, 17, { mount: 'roof' });
prop('alarm_light', 265, 12, { layer: 'back', on: true });
prop('banner', 278, 16, { layer: 'back' });
prop('bunker_door', 277, G, { layer: 'back', spawns: 'grunt', count: 3, interval: 2500 });
prop('explosive_barrel', 273, G);
prop('explosive_barrel', 274, G);
enemy('grunt', 279, 17);
enemy('grunt', 281, G);
mat('ground', 282, 283, 19, G - 1, 'steel');       // turret pedestal under the catwalk
enemy('turret', 283, 19, { mount: 'pedestal', facing: 'left' });
enemy('grenadier', 290, 14);
enemy('grunt', 287, 14, { patrol: 48 });
prop('alarm_light', 292, 12, { layer: 'back', on: true });
enemy('shield', 302, G);
enemy('shield', 306, G, { delay: 400 });
enemy('grunt', 311, 12, { idle: 'crouch' });
pickup('life', 314, 6, { hidden: true });
enemy('drone', 320, 6);
prop('crate', 310, G, { contains: 'bombs' });
pow('flame', 319, G);
// arena #2: bunker breach
const A2 = { lock: 'bunker' };
prop('bunker_door', 327, G, { layer: 'back', lock: 'bunker' });
prop('bunker_door', 341, G, { layer: 'back', lock: 'bunker' });
enemy('grunt', 327, G, { ...A2, wave: 1, from: 'door' });
enemy('grunt', 341, G, { ...A2, wave: 1, from: 'door', delay: 700 });
enemy('grunt', 327, 18, { ...A2, wave: 1, delay: 1400 });
enemy('turret', 347, 17, { mount: 'roof' });
enemy('shield', 343, G, { ...A2, wave: 2, patrol: 8 });
enemy('shield', 324, G, { ...A2, wave: 2, facing: 'right', delay: 600, patrol: 8 });
enemy('grenadier', 341, 18, { ...A2, wave: 2, delay: 1000 });
enemy('grunt', 341, G, { ...A2, wave: 2, from: 'door', delay: 1600 });
enemy('grunt', 327, G, { ...A2, wave: 2, from: 'door', delay: 2200 });
prop('alarm_light', 337, 12, { layer: 'back', on: true, lock: 'bunker' });
prop('flag', 352, G - 4, { layer: 'back' });
prop('flag', 357, G - 4, { layer: 'back' });
prop('supply_crate', 349, G, { contains: 'bombs' }); // recovery beat after the bunker arena
enemy('grunt', 356, G, { idle: 'crouch' });

tr('checkpoint', 252, 253, 0, H - 1, { id: 'cp_outpost' });
tr('checkpoint', 318, 319, 0, H - 1, { id: 'cp_outpost_b' });
tr('camera_lock', 322, 345, 0, H - 1, { id: 'bunker', release: 'clear', waves: 2 });
tr('ambience', 250, 359, 0, H - 1, { fx: 'embers' });

// ================================================================================================
// 5. WARDEN'S YARD / MID-BOSS ARENA (360-420): breather approach with supplies, then a 30-tile yard
//    (camera lock 480 px wide, camera drifts), gate on the right smashes open for WARDEN'S SNOWCAT.
// ================================================================================================
ground(360, 389, G);
ground(390, 417, G + 1, 'concrete');
mat('ground', 390, 417, G, G, 'steel');
mat('ground', 418, 419, 9, H - 1, 'concrete');
platform('plank', 392, 395, 18);
fence(360, 389, G - 1, 5, 6);
palisade(390, 408, G - 1, 3);
for (const x of [392, 395]) { put('back', x, 19, 'post_mid'); put('back', x, 20, 'post_base'); }
facade(409, 417, 11, G - 1, [[410, 13, 'wall_warn'], [416, 13, 'wall_warn'], [411, 12, 'wall_vent'], [415, 12, 'wall_vent']]); // gatehouse the gate prop sits in

prop('sign_danger', 362, G);
prop('supply_crate', 368, G, { contains: 'hmg' });
prop('crate', 372, G, { contains: 'bombs' });
prop('crate', 373, G);
pickup('rocket', 376, G);
enemy('grunt', 370, G, { idle: 'flee' });
enemy('grunt', 378, G, { idle: 'flee' });
pow('bombs', 382, G);
prop('barrel', 386, G);
prop('alarm_light', 384, 16, { layer: 'back', on: true });
prop('flag', 391, G - 3, { layer: 'back' });
prop('watchtower', 400, G, { layer: 'back' });
prop('lamp_post', 405, G, { layer: 'back' });
prop('gate', 414, G, { layer: 'back', lock: 'boss' });
sp('boss', 414, G, { kind: 'snowcat', lock: 'boss', wave: 1 }, 'snowcat'); // WARDEN'S SNOWCAT crashes through the gate

tr('checkpoint', 360, 361, 0, H - 1, { id: 'cp_pen' });
tr('checkpoint', 388, 389, 0, H - 1, { id: 'cp_boss' });
tr('music', 389, 389, 0, H - 1, { key: 'music_boss' });
tr('camera_lock', 390, 419, 0, H - 1, { id: 'boss', release: 'clear', waves: 1 });
tr('stage_end', 390, 417, 0, H - 1, { requires: 'boss' }); // fallback; boss:defeated also clears by itself
tr('ambience', 360, 419, 0, H - 1, { fx: 'snow' });

// far silhouettes along the whole stage (deepest tile layer)
for (let x = 2; x < W - 2; x += 3) {
  if (x >= 172 && x <= 248) continue; // river already has its own
  const h = hash(x, 0, 99);
  if (h < 0.75) farPine(x, 14 + Math.floor(h * 6), 20, h < 0.4 ? 1 : 2);
}

decorate();
finish();
write('m1p1', { name: 'Pine Ridge Breakout', title: 'THE CAMP', music: 'music_stage1', parallax: 'stage1', clearSfx: 'train_whistle',
  sections: SECTIONS.map((s) => `${s.id}:${s.x0}-${s.x1}`).join(',') });
