#!/usr/bin/env node
// Mission 1 Part II "TIMBER EXPRESS" (map m1p2): Knotz fights along a moving logging train toward the armored
// locomotive IRONHORN. The world is a static train; the landscape drifts past at the map's `drift` (px/s), with
// telegraph poles, pines and track whipping past (src/level/parallax.ts), low bridges (`hazard_sweep`) and tunnels
// (`tunnel`) sliding over the train (src/level/train.ts). Falling between cars drops the player off the map (death).
//   node art-src/maps/build_m1p2.mjs   -> art-src/maps/m1p2.tmx; art-src/maps/build.sh m1p2 exports + validates.
//
// Car geometry (rows of 16 px): deck (walkable) row 19 = y 304; log stacks / coal / gun pedestal rows 17-18 = top y 272;
// armor walls row 18 = top y 288; boxcar roof (one-way) row 16 = y 256; underframe row 20; bogies stand on the rail
// at y 352 (row 22). The track and ballast are parallax strips (they scroll at train speed), not tiles.
import { mapkit } from './lib/mapkit.mjs';

const W = 336, H = 24, D = 19;
const k = mapkit({ W, H, G: D, tilesets: ['stage1', 'm1_train'] });
const { put, mat, run, sandbags, sp, spPx, tr, enemy, prop, pow, pickup, hash, finish, write } = k;
const T = (n) => `m1_train:${n}`;
const LOW = 17, TOP = 16; // log/coal stack rows 17-18; boxcar roof row 16

// ------------------------------------------------------------------------------------------------ car builders
const cars = [];
/** Deck + underframe + two bogies; every car starts with this. */
function chassis(x0, x1) {
  for (let x = x0; x <= x1; x++) {
    const n = x === x0 ? 'deck_l' : x === x1 ? 'deck_r' : (() => { const h = hash(x, D, 7); return h < 0.6 ? 'deck_m' : h < 0.8 ? 'deck_m2' : 'deck_m3'; })();
    put('ground', x, D, T(n));
    if (x > x0 && x < x1) put('back', x, D + 1, T(x === x0 + 1 ? 'under_l' : x === x1 - 1 ? 'under_r' : 'under_m'));
  }
  // two bogies (long cars get a twin truck at each end)
  for (const bx of x1 - x0 >= 19 ? [x0 + 2, x0 + 5, x1 - 5, x1 - 2] : [x0 + 2, x1 - 2]) prop('bogie', bx, 22, { layer: 'back' });
  cars.push([x0, x1]);
}
/** Log stack: rows 17-18 (two courses) or row 18 only (one course), solid wood. Stakes at both ends in the back layer. */
function logs(x0, x1, courses = 2) {
  if (courses === 2) run('ground', x0, x1, LOW, T('logs_top'), ['_m2'], x0);
  run('ground', x0, x1, LOW + 1, courses === 2 ? T('logs_low') : T('logs_top'), ['_m2'], x0 + 3);
  for (const sx of [x0 - 1, x1 + 1]) { if (courses === 2) put('back', sx, LOW, T('stake_top')); put('back', sx, LOW + 1, courses === 2 ? T('stake_mid') : T('stake_top')); }
}
/** Boxcar: side wall (back layer, the player walks in front of it), roof one-way platform on row 16. */
function boxcar(x0, x1, emblem = true) {
  const rows = [['box_tl', 'box_tm', 'box_tr'], ['box_ml', 'box_mm', 'box_mr'], ['box_bl', 'box_bm', 'box_br']];
  for (let r = 0; r < 3; r++) for (let x = x0; x <= x1; x++) {
    let n = x === x0 ? rows[r][0] : x === x1 ? rows[r][2] : rows[r][1];
    if (r === 1 && n === 'box_mm' && (x - x0) % 4 === 2) n = 'box_mm2';
    put('back', x, TOP + r, T(n));
  }
  if (emblem) {
    const ex = x0 + 2;
    put('back', ex, TOP + 1, T('box_emblem_tl')); put('back', ex + 1, TOP + 1, T('box_emblem_tr'));
    put('back', ex, TOP + 2, T('box_emblem_bl')); put('back', ex + 1, TOP + 2, T('box_emblem_br'));
  }
  for (let x = x0; x <= x1; x++) put('ground', x, TOP, T(x === x0 ? 'roof_l' : x === x1 ? 'roof_r' : (x - x0) % 5 === 3 ? 'roof_m2' : 'roof_m'));
}
/** Coal gondola: steel sides with coal heaped to the rim, rows 17-18 (walkable top y 272). */
function gondola(x0, x1) {
  run('ground', x0, x1, LOW, T('gon_top'), ['_m2'], x0);
  run('ground', x0, x1, LOW + 1, T('gon_low'), ['_m2'], x0 + 5);
}
/** Half-height armor wall (row 18, top y 288). */
function armor(x0, x1) { run('ground', x0, x1, LOW + 1, T('armor'), ['_m2'], x0); }
/** Coupling between two cars (gap columns g0..g1). */
function coupling(g0, g1) { spPx('prop', ((g0 + g1 + 1) / 2) * 16, (D + 1) * 16, { kind: 'coupling', layer: 'back' }); }

const SECTIONS = [
  { id: 'rear_cars', x0: 0, x1: 68 },
  { id: 'log_cars', x0: 68, x1: 141 },
  { id: 'boxcars', x0: 141, x1: 198 },
  { id: 'gun_car', x0: 198, x1: 224 },
  { id: 'coal_cars', x0: 224, x1: 312 },
  { id: 'locomotive', x0: 312, x1: 336 },
];

// ================================================================================================
// 1. REAR CARS (0-68): the rear flatcar Knotz jumped onto, a log car, the first boxcar (door enemies, roof grenadier)
//    and the first LOW BRIDGE (roof standing height: crouch on the roof, or stay on the deck).
// ================================================================================================
chassis(0, 17);
prop('train_lamp', 0, D, { layer: 'back' });
sp('player_start', 4, D, {}, 'player_start');
prop('crate', 9, D, { contains: 'bombs' });
prop('crate', 10, D);
pow('hmg', 14, D);
coupling(18, 19);

chassis(20, 33);
logs(22, 25); logs(29, 31);
enemy('grunt', 23, LOW, { patrol: 16 });
enemy('grunt', 27, D, { idle: 'crouch' });
enemy('grunt', 30, LOW, { patrol: 8 });
coupling(34, 35);

chassis(36, 51);
boxcar(36, 51);
prop('boxcar_door', 44, D, { layer: 'back', spawns: 'grunt', count: 2, interval: 2600 });
enemy('grenadier', 48, TOP, { patrol: 24 });
enemy('drone', 41, 12);
coupling(52, 53);

chassis(54, 67);
prop('supply_crate', 57, D, { contains: 'hmg' });
enemy('leaper', 61, D);
enemy('leaper', 65, D, { facing: 'left' });
prop('explosive_barrel', 63, D);

tr('checkpoint', 2, 3, 0, H - 1, { id: 'cp_rear' });
tr('music', 0, 1, 0, H - 1, { key: 'music_m1p2' });
tr('prompt', 30, 33, 6, D - 1, { text: 'GAPS: JUMP! DON\'T FALL!' });
tr('hazard_sweep', 38, 41, 0, H - 1, { count: 2, gap: 1700 });

// ================================================================================================
// 2. LOG CARS (68-141): log stacks as cover and steps, grenadiers on the stacks, leapers jumping on from trackside,
//    the tree-top POW (spread), tunnel #1 (darkness + lamps, fight continues), a Buzzard gunship dropping troopers.
// ================================================================================================
chassis(68, 83);
logs(70, 73); logs(76, 77, 1); logs(79, 82);
enemy('grunt', 75, D, { patrol: 8 });
enemy('grenadier', 81, LOW, { patrol: 8 });
pickup('points', 77, 15, { float: true });
coupling(84, 86);

chassis(87, 100);
logs(88, 92); logs(95, 99);
enemy('leaper', 93, D);
enemy('drone', 94, 12);
pow('spread', 97, LOW);
enemy('grunt', 90, LOW, { patrol: 16 });
coupling(101, 102);

chassis(103, 116);
prop('crate', 106, D);
prop('crate', 106, D - 1, { stacked: true, contains: 'points' });
enemy('leaper', 109, D);
enemy('shield', 113, D, { patrol: 16 });
coupling(117, 118);

chassis(119, 138);
logs(121, 125); logs(128, 129, 1); logs(132, 137);
enemy('grunt', 127, D, { patrol: 8 });
enemy('buzzard', 131, 11);
enemy('grenadier', 135, LOW, { patrol: 8 });
enemy('grunt', 123, LOW, { idle: 'crouch' });
coupling(139, 140);

tr('checkpoint', 70, 71, 0, H - 1, { id: 'cp_logs' });
tr('checkpoint', 104, 105, 0, H - 1, { id: 'cp_logs_b' });
tr('tunnel', 107, 110, 0, H - 1, { ms: 6000 });

// ================================================================================================
// 3. BOXCARS (141-198): two boxcars (roof route vs deck route; doors burst open), low bridge #2 over the roofs,
//    then a sandbagged flatcar before the gun car.
// ================================================================================================
chassis(141, 156);
boxcar(141, 156);
prop('boxcar_door', 147, D, { layer: 'back', spawns: 'grunt', count: 2, interval: 2400 });
enemy('shield', 151, TOP, { patrol: 16 });
enemy('drone', 149, 11);
coupling(157, 158);

chassis(159, 174);
boxcar(159, 174, false);
prop('boxcar_door', 163, D, { layer: 'back', spawns: 'grunt', count: 1 });
prop('boxcar_door', 170, D, { layer: 'back', spawns: 'grunt', count: 2, interval: 2200 });
enemy('grenadier', 167, TOP, { patrol: 16 });
enemy('leaper', 172, D);
coupling(175, 176);

chassis(177, 195);
sandbags(185, 186, LOW, LOW + 1);
enemy('turret', 185, LOW, { mount: 'sandbag' });
prop('supply_crate', 180, D, { contains: 'bombs' });
enemy('shield', 191, D, { patrol: 16 });
enemy('paratrooper', 189, 1);
coupling(196, 197);

tr('checkpoint', 142, 143, 0, H - 1, { id: 'cp_box' });
tr('hazard_sweep', 161, 164, 0, H - 1, { count: 2, gap: 1500 });
tr('checkpoint', 190, 191, 0, H - 1, { id: 'cp_gun' });

// ================================================================================================
// 4. GUN CAR (198-224): camera-lock arena on the armored gun car. Every member and its patrol stays inside the
//    locked view (x 198-221). Wave 1: the pedestal turret + grunts; wave 2: leapers + a Buzzard; wave 3: shield,
//    grenadier, drone.
// ================================================================================================
chassis(198, 221);
armor(200, 202); armor(217, 219);
mat('ground', 208, 211, LOW, LOW + 1, 'steel');   // gun pedestal (top y 272)
const GA = { lock: 'guncar' };
enemy('turret', 209, LOW, { ...GA, wave: 1, mount: 'pedestal' });
enemy('grunt', 214, D, { ...GA, wave: 1, patrol: 16 });
enemy('grunt', 205, D, { ...GA, wave: 1, delay: 900, facing: 'right', patrol: 16 });
enemy('leaper', 213, D, { ...GA, wave: 2, patrol: 16 });
enemy('leaper', 204, D, { ...GA, wave: 2, delay: 1200, facing: 'right', patrol: 16 });
enemy('buzzard', 210, 11, { ...GA, wave: 2, delay: 2200, patrol: 48 });
enemy('shield', 215, D, { ...GA, wave: 3, patrol: 16 });
enemy('grenadier', 218, LOW + 1, { ...GA, wave: 3, delay: 800, patrol: 8 }); // on the armor wall
enemy('drone', 206, 13, { ...GA, wave: 3, delay: 1600 });
prop('alarm_light', 209, 15, { layer: 'back', lock: 'guncar' });
coupling(222, 223);

tr('camera_lock', 198, 221, 0, H - 1, { id: 'guncar', release: 'clear', waves: 3 });

// ================================================================================================
// 5. COAL CARS (224-312): gondolas heaped with coal, tunnel #2 (a fight in the dark), the laser POW, a boxcar
//    and low bridge #3 (three beams), then the last gondola before the locomotive (bombs POW, boss checkpoint).
// ================================================================================================
chassis(224, 239);
gondola(225, 238);
enemy('grunt', 230, LOW, { patrol: 16 });
enemy('grenadier', 236, LOW, { patrol: 8 });
coupling(240, 241);

chassis(242, 255);
pow('laser', 250, D);
prop('crate', 245, D);
enemy('leaper', 253, D);
coupling(256, 257);

chassis(258, 273);
gondola(259, 272);
enemy('drone', 262, 13);
enemy('grunt', 266, LOW, { patrol: 16 });
enemy('drone', 270, 12);
coupling(274, 275);

chassis(276, 291);
boxcar(276, 291);
prop('boxcar_door', 283, D, { layer: 'back', spawns: 'grunt', count: 2, interval: 2400 });
enemy('shield', 288, D, { patrol: 16 });
enemy('grunt', 285, TOP, { patrol: 24 });
coupling(292, 293);

chassis(294, 309);
gondola(295, 308);
pow('bombs', 300, LOW);
enemy('buzzard', 304, 11);
prop('train_lamp', 309, D, { layer: 'back' });
coupling(310, 311);

tr('checkpoint', 225, 226, 0, H - 1, { id: 'cp_coal' });
tr('tunnel', 244, 247, 0, H - 1, { ms: 7000 });
tr('checkpoint', 277, 278, 0, H - 1, { id: 'cp_coal_b' });
tr('hazard_sweep', 296, 299, 0, H - 1, { count: 3, gap: 1300 });
tr('checkpoint', 302, 303, 0, H - 1, { id: 'cp_boss' });
tr('music', 309, 309, 0, H - 1, { key: 'music_boss' });

// ================================================================================================
// 6. LOCOMOTIVE (312-336): the end arena. The player's car runs up to IRONHORN, which takes the right side of the
//    screen (boss-drawn: tender + loco); no gate, it locks as the camera arrives.
// ================================================================================================
chassis(312, 335);
sp('boss', 329, D, { kind: 'ironhorn', lock: 'boss', wave: 1, facing: 'left' }, 'ironhorn');
prop('crate', 315, D);
tr('camera_lock', 312, 335, 0, H - 1, { id: 'boss', release: 'clear', waves: 1 });
tr('stage_end', 312, 335, 0, H - 1, { requires: 'boss' });

tr('ambience', 0, W - 1, 0, H - 1, { fx: 'train' });

finish();
write('m1p2', { name: 'Pine Ridge Breakout', title: 'TIMBER EXPRESS', music: 'music_m1p2', parallax: 'm1p2', drift: 260,
  sections: SECTIONS.map((s) => `${s.id}:${s.x0}-${s.x1}`).join(',') }, { background: '#7f98b8' });
