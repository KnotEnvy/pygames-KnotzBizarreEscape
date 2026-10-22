#!/usr/bin/env node
// Mission 2 Part I "CYPRESS DEEP" (map m2p1, 6400 px): Blackwater Bayou at dusk turning to night. Teaches the bayou:
// wading (shallow pools), sinking logs over deep water, mud flats and swamp-gas vents. Ends with SHELLSHOCK surfacing from
// the turtle pond (gateless boss arena). docs/MISSION2.md § 2-1.
//   node art-src/maps/build_m2p1.mjs -> art-src/maps/m2p1.tmx; art-src/maps/build.sh m2p1 exports + validates + previews.
// Ground row 21 (y 336). Deep water = death; jumps from mud/shallow clear only 2 rows (the validator checks it).
import { mapkit } from './lib/mapkit.mjs';
import { bayou } from './lib/bayou.mjs';

const W = 400, H = 24, G = 21;
const k = mapkit({ W, H, G, tilesets: ['m2_bayou'] });
const { put, mat, sp, spPx, tr, enemy, prop, pow, pickup, hash, finish, write, sandbags } = k;
const b = bayou(k);
const { bank, mud, deep, pool, sinkLog, log, walk, dock, roots, limb, ropeBridge, shack, cypress, mossCurtain, farCyp, farShack, dress } = b;

const SECTIONS = [
  { id: 'landing', x0: 0, x1: 56 },
  { id: 'drowned_forest', x0: 56, x1: 144 },
  { id: 'stilt_village', x0: 144, x1: 244 },
  { id: 'bog', x0: 244, x1: 338 },
  { id: 'turtle_pond', x0: 338, x1: 400 },
];
const bg = (id, x0, x1, p = {}) => tr('bg_event', x0, x1, 0, H - 1, { id, ...p });
const amb = (fx, x0, x1) => tr('ambience', x0, x1, 0, H - 1, { fx });
/** A lantern hung under a shack roof's eave (the prop's hook is at its top edge, 20 px above its feet). */
const lantern = (x, roofRow) => spPx('prop', x * 16 + 8, roofRow * 16 + 9 + 20, { kind: 'lantern', layer: 'back' });
const prompt = (text, x0, x1, y0 = 8, y1 = G - 1) => tr('prompt', x0, x1, y0, y1, { text });
const cp = (id, x) => tr('checkpoint', x, x + 1, 0, H - 1, { id });

// far silhouettes along the whole map (bg_far_deco)
// (No bg_far_deco silhouettes in Mission 2: Imagegen's painted cypress layers carry the distance.)

// ================================================================================================
// 1. LANDING (0-56): Hazel's skiff at a rotten dock, boardwalks, cypress knees, fireflies. Grunts, the first shallow
//    water (WADING SLOWS YOU), POW hmg.
// ================================================================================================
deep(0, 15);
dock(0, 14, 19);
spPx('prop', 3 * 16, G * 16 + 2, { kind: 'skiff', layer: 'back' });          // moored at the dock, keel at the waterline
sp('player_start', 7, 19, {}, 'player_start');
prop('lantern_post', 12, 19, { layer: 'back' });
bank(15, 28);
mat('ground', 15, 15, G - 1, G - 1, 'bank');                                 // the dock steps down onto the bank
cypress(21, G, { canopyRows: [2, 6] });
prop('net', 18, G, { layer: 'back' });
enemy('grunt', 24, G, { patrol: 24 });
pool(29, 38);
prop('sign_wade', 27, G);
prompt('WADING SLOWS YOU', 26, 30);
enemy('grunt', 36, G, { patrol: 16 });                                       // knee-deep in the pool
bank(39, 56);
pow('hmg', 43, G);
walk(46, 54, 18, 4);
enemy('grunt', 52, 18, { patrol: 16 });
enemy('grunt', 49, G, { idle: 'crouch' });
spPx('prop', 47 * 16 + 8, 18 * 16 + 4, { kind: 'lantern', layer: 'back' });   // hung from the boardwalk rail
cypress(55, G, { canopyRows: [1, 5], v2: true });
cp('cp_dock', 2);
tr('music', 0, 1, 0, H - 1, { key: 'music_m2p1' });

// ================================================================================================
// 2. DROWNED FOREST (56-144): giant cypress trunks, moss curtains, mangrove roots. Deep water crossed on sinking logs and
//    roots (LOGS SINK, KEEP MOVING!). Piranhas, lurkers rising from the shallows, a gnat swarm, POW shotgun on a root island.
// ================================================================================================
deep(57, 76);
prop('sign_logs', 54, G);
prompt('LOGS SINK, KEEP MOVING!', 53, 57);
sinkLog(58, 60);
bank(62, 65, G - 1);                                                         // root island A (top y 320)
mat('ground', 62, 65, G - 1, G - 1, 'bank');
sinkLog(67, 69);
enemy('piranha', 71, G);
sinkLog(72, 74);
bank(76, 88);
cypress(77, G, { canopyRows: [0, 4] });
pool(80, 86);
enemy('lurker', 82, G, { facing: 'left' });
enemy('lurker', 85, G, { facing: 'left' });
deep(89, 110);
roots(88, 93, 18);
enemy('piranha', 91, G);
roots(96, 100, 18);
enemy('grunt', 98, 18, { patrol: 8 });
enemy('piranha', 101, G);
log(101, 105, G);
cypress(103, G, { canopyRows: [1, 5], v2: true });
limb(101, 104, 15);                                                          // a high perch off the roots (medal)
pickup('points', 103, 14, { float: true });
sinkLog(107, 109);
bank(111, 116);
enemy('gnat', 113, 13);
enemy('gnat', 115, 12, { delay: 200 });
enemy('gnat', 117, 14, { delay: 400 });
deep(117, 118);
bank(119, 123, G - 2);                                                       // root island B: the shotgun POW
mat('ground', 119, 123, G - 2, G - 1, 'bank');
pow('shotgun', 121, G - 2);
deep(124, 129);
sinkLog(125, 127);
enemy('piranha', 129, G);
bank(130, 144);
cypress(133, G, { canopyRows: [2, 6] });
enemy('grunt', 136, G, { patrol: 24 });
enemy('grenadier', 141, G, { patrol: 8 });
mossCurtain(126, 9, 4); mossCurtain(94, 10, 3); mossCurtain(85, 9, 4);
cp('cp_forest', 57);
cp('cp_forest_b', 111);

// ================================================================================================
// 3. STILT VILLAGE (144-244): a Regime-occupied fishing village on stilts over the shallows: decks at y 288/240, rope
//    bridges, nets, lanterns, POWs tied up in shacks. Arena `stilts` (x 204-228, 3 waves). Rain starts as you leave.
// ================================================================================================
bank(144, 150);
walk(148, 151, 19, 3);                                                       // porch step up to the first deck
pool(151, 175);
shack(152, 158, 17, { door: 155, windows: [153, 157] });
prop('shack_door', 155, 17, { layer: 'back', spawns: 'grunt', count: 2, interval: 2600 });
pow('rocket', 157, 17);                                                      // tied up on shack A's deck
lantern(152, 13);
ropeBridge(159, 163, 17);
shack(164, 171, 14, { windows: [166, 169], boarded: [169] });                // shack B, higher
walk(172, 175, 17, 3);                                                       // step back down
enemy('grunt', 167, 14, { patrol: 16 });
enemy('grenadier', 168, 10, { patrol: 8 });                                  // on shack B's roof (row 10)
enemy('hopper', 173, G);
prop('net', 177, G, { layer: 'back' });
bank(176, 181);
enemy('lurker', 179, G);
pool(182, 194);
walk(180, 183, 19, 3);                                                       // step up from the bank to shack C's deck
shack(184, 190, 18, { door: 187, windows: [185, 189] });
prop('shack_door', 187, 18, { layer: 'back', spawns: 'grunt', count: 1 });
enemy('grunt', 192, G, { patrol: 16 });
deep(195, 198);                                                              // a deep channel: cross on the bridge
ropeBridge(191, 200, 18);
bank(199, 203);
cp('cp_stilts', 199);
// Arena `stilts` (x 204-228): shacks with doors on both sides, wading floor in the middle.
pool(204, 228);
shack(205, 210, 18, { door: 208, windows: [206] });
prop('shack_door', 208, 18, { layer: 'back' });
shack(220, 227, 16, { door: 223, windows: [221, 226] });
prop('shack_door', 223, 16, { layer: 'back' });
walk(211, 214, 18, 3);
walk(202, 204, 19, 2);                                                       // porch: bank → shack D's deck
walk(215, 219, 18, 4);                                                       // ...and on to shack E
const ST = { lock: 'stilts' };
enemy('grunt', 208, 18, { ...ST, wave: 1, from: 'door', facing: 'right', patrol: 8 });
enemy('grunt', 223, 16, { ...ST, wave: 1, from: 'door', delay: 900, patrol: 8 });
enemy('grunt', 216, G, { ...ST, wave: 1, delay: 1600, patrol: 16 });
enemy('hopper', 218, G, { ...ST, wave: 2, patrol: 16 });
enemy('hopper', 212, G, { ...ST, wave: 2, delay: 1400, facing: 'right', patrol: 16 });
enemy('lurker', 215, G, { ...ST, wave: 2, delay: 2400 });
enemy('grenadier', 207, 14, { ...ST, wave: 3, facing: 'right', patrol: 8 });  // shack D's roof (row 14)
enemy('grenadier', 224, 12, { ...ST, wave: 3, delay: 700, patrol: 8 });       // shack E's roof (row 12)
enemy('gnat', 214, 13, { ...ST, wave: 3, delay: 1600 });
enemy('gnat', 218, 12, { ...ST, wave: 3, delay: 2000 });
enemy('gnat', 216, 14, { ...ST, wave: 3, delay: 2400 });
tr('camera_lock', 204, 227, 0, H - 1, { id: 'stilts', release: 'clear', waves: 3 });
lantern(206, 14); lantern(226, 12);
bank(229, 244);
prop('supply_crate', 232, G, { contains: 'bombs' });
cp('cp_village', 145);

// ================================================================================================
// 4. BOG (244-338): mud flats (slower, lower jump), swamp-gas vents, the Regime pump-station outpost with turrets and
//    sandbags. Arena `pump` (x 298-322, 3 waves, a Buzzard paratrooper drop). A short fog bank with lanterns.
// ================================================================================================
mud(244, 272);
prompt('MUD: SLOW GOING, SHORT JUMPS', 245, 249);
prompt('GAS VENTS! WAIT FOR THE BUBBLES', 251, 254);
const vent = (x, p = {}) => tr('hazard_vent', x, x, G - 4, G - 1, { period: 3400, on: 1100, ...p });
vent(256, { offset: 0 }); vent(262, { offset: 1700 }); vent(268, { offset: 800 });
enemy('lurker', 259, G);
enemy('hopper', 266, G, { patrol: 24 });
prop('fuel_drum', 271, G);
deep(273, 277);
log(273, 277, G);
bank(278, 297);
sandbags(279, 280, G - 2, G - 1);
enemy('grunt', 282, G, { idle: 'crouch' });
mat('ground', 284, 289, G - 3, G - 1, 'pump');                                // pump building A (top y 288)
enemy('turret', 286, G - 3, { mount: 'roof' });
prop('danger_post', 283, G);
mat('ground', 292, 296, G - 4, G - 1, 'pump');                                // building B (top y 272)
k.run('ground', 290, 291, G - 4, 'catwalk');
enemy('grunt', 294, G - 4, { patrol: 16 });
prop('alarm_light', 293, G - 5, { layer: 'back', lock: 'pump' });
for (const [x, y, n] of [[285, 19, 'regime_w'], [287, 20, 'grate_w'], [293, 18, 'window_lit_w'], [295, 19, 'pipe_h_w']]) put('back', x, y, n);
k.backMass(284, 289, 15, G - 4, 'pump'); k.backMass(292, 296, 13, G - 5, 'pump');
// Arena `pump` (x 298-322): mud floor, a mid concrete pad, a vent in the middle, the pump tower behind.
mud(298, 322, G, false);
mat('ground', 308, 312, G - 2, G - 1, 'pump');                                // pad (top y 304)
vent(304, { period: 4200, on: 1000, offset: 2200 });
k.backMass(304, 316, 16, G - 1, 'pump'); k.backMass(309, 312, 12, 15, 'pump');      // low pump house + its tower
for (const [x, y, n] of [[305, 17, 'tank_tl_w'], [306, 17, 'tank_tr_w'], [305, 18, 'tank_bl_w'], [306, 18, 'tank_br_w'], [310, 13, 'regime_w'],
  [314, 17, 'window_lit_w'], [311, 14, 'window_lit_w'], [304, 19, 'pipe_v_w'], [315, 19, 'vent_w'], [312, 18, 'hazard_w'], [313, 18, 'hazard_w']]) put('back', x, y, n);
prop('shack_door', 301, G, { layer: 'back' });
prop('shack_door', 319, G, { layer: 'back' });
const PU = { lock: 'pump' };
enemy('grunt', 301, G, { ...PU, wave: 1, from: 'door', facing: 'right', patrol: 16 });
enemy('grunt', 319, G, { ...PU, wave: 1, from: 'door', delay: 800, patrol: 16 });
enemy('turret', 310, G - 2, { ...PU, wave: 1, mount: 'sandbag' });
enemy('buzzard', 310, 11, { ...PU, wave: 2, delay: 600, patrol: 48 });
enemy('grunt', 316, G, { ...PU, wave: 2, delay: 1800, patrol: 16 });
enemy('shield', 317, G, { ...PU, wave: 3, patrol: 16 });
enemy('shield', 302, G, { ...PU, wave: 3, delay: 900, facing: 'right', patrol: 16 });
enemy('grenadier', 310, G - 2, { ...PU, wave: 3, delay: 1600, patrol: 8 });
tr('camera_lock', 298, 321, 0, H - 1, { id: 'pump', release: 'clear', waves: 3 });
mud(323, 338);
prop('lantern_post', 325, G, { layer: 'back' }); prop('lantern_post', 331, G, { layer: 'back' }); prop('lantern_post', 336, G, { layer: 'back' });
pow('bombs', 329, G);
enemy('lurker', 333, G);
vent(334, { offset: 1200 });
cp('cp_bog', 245);
cp('cp_pump', 290);
cp('cp_fog', 324);
// A short fog bank rolls in over the bog from the right (slowly) past the lantern posts; FX draws the fog.
tr('fog', 324, 326, 0, H - 1, { ms: 9000, speed: 36, width: 420, lantern: 'none' });

// ================================================================================================
// 5. TURTLE POND (338-400): bubbles and a huge wake in the far pond (SHELLSHOCK's foreshadowing). Boss arena `shellshock`
//    (x 370-400, 480 px): a muddy bank with a shallow pool in the middle; gateless, the boss surfaces as the camera arrives.
// ================================================================================================
bank(338, 369);
cypress(343, G, { canopyRows: [1, 5] });
enemy('grunt', 348, G, { patrol: 16 });
enemy('hopper', 356, G, { patrol: 16 });
prop('crate', 352, G, { contains: 'bombs' });
prop('bones', 361, G, { layer: 'back' });
cp('cp_boss', 366);
tr('music', 368, 368, 0, H - 1, { key: 'music_boss_m2' });
mud(370, 378, G, false);
pool(379, 391);
mud(392, 399, G, false);
mat('ground', 399, 399, 8, G - 1, 'bank');                                   // the far bank closes the arena
sp('boss', 389, G, { kind: 'shellshock', lock: 'shellshock', wave: 1, facing: 'left' }, 'shellshock');
tr('camera_lock', 370, 399, 0, H - 1, { id: 'shellshock', release: 'clear', waves: 1 });
tr('stage_end', 370, 398, 0, H - 1, { requires: 'boss' });

// ------------------------------------------------------------------------------------------------ ambience + moments
amb('swamp', 0, 236);
amb('rain', 237, W - 1);
amb('fireflies', 0, 60);
bg('fireflies_swarm', 0, 150);
bg('herons', 30, 240);
bg('patrol_boat', 66, 67);
bg('wisps', 244, 338);
bg('gator_glimpse', 263, 264);
bg('pond_wake', 338, 372);

dress({ x0: 0, x1: W - 1 });
b.fixPoolSpawns();
finish();
write('m2p1', { name: 'Bayou Blackout', title: 'CYPRESS DEEP', music: 'music_m2p1', parallax: 'm2p1', clearSfx: 'boat_horn',
  sink_gids: b.sinkGids(), sections: SECTIONS.map((s) => `${s.id}:${s.x0}-${s.x1}`).join(',') }, { background: '#2b2635' });
