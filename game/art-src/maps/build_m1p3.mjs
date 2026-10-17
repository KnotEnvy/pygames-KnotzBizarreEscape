#!/usr/bin/env node
// Mission 1 Part III "MOOSE LAKE" (map m1p3): the derailed train's crash site on the lake shore, across the frozen
// lake (slippery `material=ice`, cracking `crack=true` ice that breaks into water, floes over open water) to
// Dr. Von Antler's lakeside lab (Project ANTLER): the lab-gate arena, then MOOSEZILLA in the lab yard on the ice,
// whose phase-3 stomps crack the arena floor (`crack=stomp`, src/level/ice.ts).
//   node art-src/maps/build_m1p3.mjs   -> art-src/maps/m1p3.tmx; art-src/maps/build.sh m1p3 exports + validates.
// Lake surface (ice top) is row 21 (y 336), like the ground in Part I. Crack runs are at most 3 tiles, so even fully
// broken they stay jumpable (the validator checks the route with every crack tile turned to water).
import { mapkit } from './lib/mapkit.mjs';

const W = 262, H = 24, G = 21;
const k = mapkit({ W, H, G, tilesets: ['stage1', 'm1_lake'] });
const { put, putIfEmpty, mat, ground, backMass, run, hills, fence, sandbags, water, facade, farPine, trunk, sp, tr, enemy, prop, pow,
  pickup, hash, decorate, finish, write, gidOf } = k;
const I = (n) => `m1_lake:${n}`;

// ------------------------------------------------------------------------------------------------ lake builders
/** Ice sheet on row G over under-ice water. Broken edges (`ice_l`/`ice_r`) where it meets open water (not shore). */
function ice(x0, x1, { lEdge = true, rEdge = true } = {}) {
  for (let x = x0; x <= x1; x++) {
    let n = 'ice_m';
    if (x === x0 && lEdge) n = 'ice_l';
    else if (x === x1 && rEdge) n = 'ice_r';
    else { const h = hash(x, G, 31); n = h < 0.55 ? 'ice_m' : h < 0.8 ? 'ice_m2' : 'ice_m3'; }
    put('ground', x, G, I(n));
    underIce(x);
  }
}
function underIce(x) { put('ground', x, G + 1, I('ice_under')); for (let y = G + 2; y < H; y++) put('ground', x, y, I('ice_under_deep')); }
/** Cracking ice (crack=true): telegraphed darker ice that breaks into water ~600 ms after the player stands on it. */
function crackIce(x0, x1) { for (let x = x0; x <= x1; x++) { put('ground', x, G, I('crack_m')); underIce(x); } }
/** Arena ice that only MOOSEZILLA's heavy stomps crack. */
function stompIce(x0, x1) { for (let x = x0; x <= x1; x++) { put('ground', x, G, I('crack_stomp')); underIce(x); } }
/** Open water with floes at the given [x0, x1] runs. Floes replace the water surface tile (flush with the ice level). */
function openWater(x0, x1, floes) {
  water(x0, x1, G);
  for (const [a, b] of floes) {
    if (a === b) put('ground', a, G, I('floe_single'));
    else for (let x = a; x <= b; x++) put('ground', x, G, I(x === a ? 'floe_l' : x === b ? 'floe_r' : 'floe_m'));
  }
}
function drift(x0, x1) { for (let x = x0; x <= x1; x++) putIfEmpty('back', x, G - 1, I(x === x0 ? 'ice_drift_l' : x === x1 ? 'ice_drift_r' : 'ice_drift_m')); }
function reeds(xs) { for (const x of xs) putIfEmpty('back', x, G - 1, I(['reeds_a', 'reeds_b', 'reeds_c'][Math.floor(hash(x, 3, 9) * 3)])); }
function shards(xs) { for (const x of xs) putIfEmpty('back', x, G - 1, I(hash(x, 5, 2) < 0.5 ? 'ice_shard_a' : 'ice_shard_b')); }
/** Lab steel floor on row G (solid, not slippery) over concrete. */
function labFloor(x0, x1) {
  for (let x = x0; x <= x1; x++) put('ground', x, G, I(x === x0 ? 'labfloor_l' : x === x1 ? 'labfloor_r' : (hash(x, G, 4) < 0.6 ? 'labfloor_m' : 'labfloor_m2')));
  mat('ground', x0, x1, G + 1, H - 1, 'concrete');
}
/** Lab facade (back layer concrete) with lab windows and vents baked on. */
function labFacade(x0, x1, top, bottom, deco = []) {
  backMass(x0, x1, top, bottom, 'concrete');
  for (const [x, y, n] of deco) put('back', x, y, I(n));
}

const SECTIONS = [
  { id: 'crash_site', x0: 0, x1: 48 },
  { id: 'frozen_lake', x0: 48, x1: 151 },
  { id: 'lab_shore', x0: 151, x1: 232 },
  { id: 'lab_yard', x0: 232, x1: 262 },
];

// ================================================================================================
// 1. CRASH SITE (0-48): the derailed train on the shore: an overturned boxcar, spilled logs, IRONHORN nose-down in
//    the ice at the waterline, burning. Survivors regroup; the first hound pack.
// ================================================================================================
ground(0, 47, G);
mat('ground', 0, 1, 9, G - 1, 'rock');          // left cliff closes the part
mat('ground', 2, 2, 15, G - 1, 'rock');
ground(17, 23, G - 1);                           // mound under the wrecked boxcar
ground(19, 21, G - 2);
hills(3, 16, 13, 16, 'rock', 31);
hills(24, 47, 14, 17, 'ground', 32);
for (const x of [8, 29]) trunk(x, G);

sp('player_start', 5, G, {}, 'player_start');
prop('sign_danger', 9, G);
prop('wreck_boxcar', 20, G - 2, { layer: 'back' });
prop('log_spill', 13, G, { layer: 'back' });
prop('wreck_bogie', 26, G, { layer: 'back' });
prop('log_spill', 31, G, { layer: 'back' });
k.spPx('prop', 44 * 16 + 8, G * 16 + 4, { kind: 'wreck_engine', layer: 'back' }); // nose plunged into the ice
prop('explosive_barrel', 24, G);
prop('crate', 15, G, { contains: 'bombs' });
pow('hmg', 28, G);
enemy('grunt', 20, G - 2, { patrol: 8 });
enemy('grunt', 33, G, { patrol: 32 });
enemy('hound', 37, G, { patrol: 24 });
enemy('hound', 40, G, { patrol: 24 });
enemy('grunt', 46, G, { idle: 'crouch' });
prop('pine_mid', 35, G, { layer: 'back' });

tr('checkpoint', 2, 3, 0, H - 1, { id: 'cp_crash' });
tr('music', 0, 1, 0, H - 1, { key: 'music_m1p3' });
tr('prompt', 34, 38, 10, G - 1, { text: 'HOUNDS! KEEP FIRING!' });

// ================================================================================================
// 2. FROZEN LAKE (48-151): slippery ice, thin cracking ice (THIN ICE! signs), floes over open water, a rock island
//    (laser POW), hound packs, shields and drones in the blizzard.
// ================================================================================================
ice(48, 70, { lEdge: false });
crackIce(71, 73);
ice(74, 84, { lEdge: false });
openWater(85, 96, [[87, 88], [91, 92], [95, 95]]);
ice(97, 99);
crackIce(100, 102);
ice(103, 105, { rEdge: false, lEdge: false });
crackIce(106, 107);
ice(108, 115, { lEdge: false });
mat('ground', 116, 121, 18, H - 1, 'rock');     // rock island (top y 288)
mat('ground', 117, 120, 17, 17, 'rock');        // its crown (top y 272)
ice(122, 127, { lEdge: false });
crackIce(128, 130);
ice(131, 135, { lEdge: false, rEdge: false });
crackIce(136, 138);
ice(139, 139, { lEdge: false });
openWater(140, 147, [[142, 143], [146, 146]]);
ice(148, 150, { rEdge: false });
for (let x = 50; x < 151; x += 7) if (hash(x, 0, 77) < 0.7) farPine(x, 15 + Math.floor(hash(x, 1, 7) * 3), 20, 2);
reeds([49, 52, 60, 66, 99, 109, 124, 133, 149]);
drift(56, 58); drift(77, 79); drift(111, 113); drift(132, 133);
shards([63, 82, 104, 126, 150]);

prop('sign_thin_ice', 68, G);
prop('sign_thin_ice', 98, G);
prop('ice_hole', 54, G, { layer: 'back' });
prop('ice_hole', 112, G, { layer: 'back' });
enemy('grunt', 58, G, { patrol: 32 });
enemy('hound', 63, G, { patrol: 24 });
enemy('hound', 65, G, { patrol: 24 });
enemy('hound', 67, G, { patrol: 24 });
enemy('shield', 80, G, { patrol: 16 });
enemy('drone', 90, 13);
enemy('grunt', 98, G, { idle: 'crouch' });
enemy('hound', 110, G, { patrol: 24 });
enemy('hound', 113, G, { patrol: 24 });
pow('laser', 118, 17);
enemy('grenadier', 120, 17, { patrol: 8 });
enemy('grunt', 125, G, { patrol: 16 });
enemy('drone', 128, 13);
enemy('shield', 134, G, { patrol: 16 });
enemy('hound', 132, G, { patrol: 24 });
enemy('hound', 135, G, { patrol: 24 });
enemy('drone', 144, 12);
pickup('points', 143, 17, { float: true });

tr('checkpoint', 50, 51, 0, H - 1, { id: 'cp_lake' });
tr('prompt', 52, 56, 10, G - 1, { text: 'ICE! IT\'S SLIPPERY!' });
tr('prompt', 66, 69, 10, G - 1, { text: 'THIN ICE: KEEP MOVING!' });
tr('checkpoint', 97, 98, 0, H - 1, { id: 'cp_lake_b' });

// ================================================================================================
// 3. LAB SHORE (151-232): the Project ANTLER compound: perimeter fence, searchlights, a wall block with a turret,
//    lab windows glowing weird green. Then the lab-gate arena (x 192-215): waves of door grunts, hounds, drones;
//    the gate blows open when it's cleared.
// ================================================================================================
ground(151, 231, G);
sandbags(166, 167, G - 2, G - 1);                // step up to the wall block
mat('ground', 168, 176, 17, G - 1, 'concrete');  // wall block (top y 272)
hills(151, 165, 15, 18, 'ground', 33);
fence(151, 165, G - 1, 4, 5);
labFacade(169, 191, 11, G - 1, [[171, 13, 'wall_lab_window'], [175, 13, 'wall_lab_window_dark'], [179, 13, 'wall_lab_window'],
  [183, 13, 'wall_lab_window'], [187, 13, 'wall_lab_window_dark'], [177, 18, 'wall_lab_vent'], [185, 18, 'wall_lab_vent'],
  [181, 16, 'wall_antler_tl'], [182, 16, 'wall_antler_tr'], [181, 17, 'wall_antler_bl'], [182, 17, 'wall_antler_br'],
  [172, 16, 'wall_lab_pipe'], [173, 16, 'wall_lab_pipe'], [174, 16, 'wall_lab_pipe'], [188, 16, 'wall_lab_hazard'], [189, 16, 'wall_lab_hazard']]);
labFacade(192, 215, 10, G - 1, [[194, 12, 'wall_lab_window'], [198, 12, 'wall_lab_window_dark'], [202, 12, 'wall_lab_window'],
  [206, 12, 'wall_lab_window'], [200, 15, 'wall_antler_tl'], [201, 15, 'wall_antler_tr'], [200, 16, 'wall_antler_bl'], [201, 16, 'wall_antler_br'],
  [195, 17, 'wall_lab_pipe'], [196, 17, 'wall_lab_pipe'], [197, 17, 'wall_lab_pipe'], [205, 17, 'wall_lab_pipe'], [206, 17, 'wall_lab_pipe'],
  [209, 13, 'wall_lab_hazard'], [210, 13, 'wall_lab_hazard'], [211, 13, 'wall_lab_hazard']]);
labFacade(216, 231, 12, G - 1, [[218, 14, 'wall_lab_window'], [222, 14, 'wall_lab_window_dark'], [226, 14, 'wall_lab_window'],
  [220, 18, 'wall_lab_vent'], [228, 18, 'wall_lab_vent'], [224, 17, 'wall_lab_hazard'], [225, 17, 'wall_lab_hazard']]);
reeds([152, 156, 161]);

prop('searchlight', 158, G, { layer: 'back', sweep: 1 });
enemy('grunt', 156, G, { patrol: 32 });
enemy('hound', 161, G, { patrol: 24 });
enemy('hound', 163, G, { patrol: 24 });
enemy('turret', 172, 17, { mount: 'roof' });
enemy('shield', 175, 17, { patrol: 0 });
prop('alarm_light', 170, 12, { layer: 'back', on: true });
prop('tesla_coil', 179, G, { layer: 'back' });
enemy('grunt', 181, G, { patrol: 32 });
prop('supply_crate', 186, G, { contains: 'hmg' });
pow('rocket', 189, G);

// lab-gate arena (spawned by the camera lock). Every member and its patrol stays inside the locked view (x 192-215).
const LG = { lock: 'labgate' };
prop('bunker_door', 196, G, { layer: 'back', lock: 'labgate' });
prop('bunker_door', 205, G, { layer: 'back', lock: 'labgate' });
prop('gate', 211, G, { layer: 'back', lock: 'labgate' });
prop('alarm_light', 203, 11, { layer: 'back', lock: 'labgate' });
enemy('grunt', 196, G, { ...LG, wave: 1, from: 'door', facing: 'right', patrol: 16 });
enemy('grunt', 205, G, { ...LG, wave: 1, from: 'door', delay: 800, patrol: 16 });
enemy('grunt', 208, G, { ...LG, wave: 1, delay: 1600, patrol: 16 });
enemy('hound', 207, G, { ...LG, wave: 2, patrol: 16 });
enemy('hound', 205, G, { ...LG, wave: 2, delay: 500, patrol: 16 });
enemy('hound', 197, G, { ...LG, wave: 2, delay: 1800, facing: 'right', patrol: 16 });
enemy('shield', 206, G, { ...LG, wave: 2, delay: 2600, patrol: 16 });
enemy('drone', 203, 13, { ...LG, wave: 3 });
enemy('drone', 199, 12, { ...LG, wave: 3, delay: 1400 });
enemy('grenadier', 205, G, { ...LG, wave: 3, from: 'door', delay: 2200, patrol: 8 });

// lab yard approach (breather, then the boss checkpoint)
prop('lab_sign', 219, G, { layer: 'back' });
prop('tesla_coil', 223, G, { layer: 'back' });
pow('bombs', 225, G);
prop('crate', 228, G, { contains: 'bombs' });
pickup('rocket', 221, G);

tr('checkpoint', 152, 153, 0, H - 1, { id: 'cp_shore' });
tr('checkpoint', 186, 187, 0, H - 1, { id: 'cp_lab' });
tr('camera_lock', 192, 215, 0, H - 1, { id: 'labgate', release: 'clear', waves: 3 });
tr('checkpoint', 228, 229, 0, H - 1, { id: 'cp_boss' });
tr('music', 231, 231, 0, H - 1, { key: 'music_boss' });

// ================================================================================================
// 4. LAB YARD (232-262): MOOSEZILLA's arena on the lake ice. Steel lab floor near the walls; the middle is arena
//    ice that its phase-3 stomps crack into short-lived holes. The gate in the lab gatehouse bursts as before.
// ================================================================================================
labFloor(232, 235);
stompIce(236, 253);
labFloor(254, 259);
mat('ground', 260, 261, 9, H - 1, 'concrete');
facade(251, 259, 11, G - 1, [[252, 13, 'wall_warn'], [258, 13, 'wall_warn'], [253, 12, 'wall_vent'], [257, 12, 'wall_vent']]);
labFacade(236, 250, 14, G - 1, [[238, 16, 'wall_lab_window'], [243, 16, 'wall_lab_window_dark'], [248, 16, 'wall_lab_window'],
  [240, 18, 'wall_lab_pipe'], [241, 18, 'wall_lab_pipe'], [242, 18, 'wall_lab_pipe'], [245, 18, 'wall_lab_hazard'], [246, 18, 'wall_lab_hazard']]);
prop('tesla_coil', 233, G, { layer: 'back' });
prop('searchlight', 249, 14, { layer: 'back', sweep: 1 });
prop('flag', 236, 14, { layer: 'back' });
prop('gate', 256, G, { layer: 'back', lock: 'boss' });
sp('boss', 256, G, { kind: 'moosezilla', lock: 'boss', wave: 1 }, 'moosezilla');
tr('camera_lock', 232, 261, 0, H - 1, { id: 'boss', release: 'clear', waves: 1 });
tr('stage_end', 232, 259, 0, H - 1, { requires: 'boss' });

tr('ambience', 0, W - 1, 0, H - 1, { fx: 'blizzard' });

decorate({ x0: 0, x1: 47 });
decorate({ x0: 151, x1: 231 });
finish();
write('m1p3', { name: 'Pine Ridge Breakout', title: 'MOOSE LAKE', music: 'music_m1p3', parallax: 'm1p3',
  crack_gids: [I('crack_f1'), I('crack_f2'), I('crack_f3'), 'stage1:water_top_f0'].map(gidOf).join(','),
  sections: SECTIONS.map((s) => `${s.id}:${s.x0}-${s.x1}`).join(',') }, { background: '#3a4a6e' });
