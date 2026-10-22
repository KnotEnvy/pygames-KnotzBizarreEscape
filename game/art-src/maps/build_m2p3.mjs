#!/usr/bin/env node
// Mission 2 Part III "GATOR'S DEN" (map m2p3, 4320 px = 3808 + the 512 px den): a night storm. The BAYOU QUEEN lies
// beached and burning (Part II's vehicle), then the sunken forest (sinking logs, roots, mud, gas vents), the Drowned Mill
// on its pilings (arena `mill`, its gate blows open on clear), the den approach, and GATORGEDDON's den: a pier over the
// channel, `crack=stomp` planks that its tail slams break into holes (src/level/ice.ts, crack_style=wood), the channel water
// strip at depth 21 behind the pier (trigger `channel`, water line y 328; the submerged gator renders behind it).
//   node art-src/maps/build_m2p3.mjs -> art-src/maps/m2p3.tmx; art-src/maps/build.sh m2p3 exports + validates + previews.
import { mapkit } from './lib/mapkit.mjs';
import { bayou } from './lib/bayou.mjs';

const W = 270, H = 24, G = 21, MF = 19; // ground row; mill floor row (y 304, on pilings over the water)
const k = mapkit({ W, H, G, tilesets: ['m2_bayou', 'm2_mill'] });
const { put, mat, sp, spPx, tr, enemy, prop, pow, pickup, hash, finish, write, gidOf } = k;
const b = bayou(k);
const { bank, mud, deep, pool, sinkLog, log, roots, limb, cypress, mossCurtain, farCyp, dress } = b;
const M = (n) => `m2_mill:${n}`;

const SECTIONS = [
  { id: 'wreck_shore', x0: 0, x1: 44 },
  { id: 'sunken_forest', x0: 44, x1: 125 },
  { id: 'drowned_mill', x0: 125, x1: 206 },
  { id: 'den_approach', x0: 206, x1: 238 },
  { id: 'the_den', x0: 238, x1: 270 },
];
const bg = (id, x0, x1, p = {}) => tr('bg_event', x0, x1, 0, H - 1, { id, ...p });
const prompt = (text, x0, x1, y0 = 8, y1 = G - 1) => tr('prompt', x0, x1, y0, y1, { text });
const cp = (id, x) => tr('checkpoint', x, x + 1, 0, H - 1, { id });
const vent = (x, p = {}) => tr('hazard_vent', x, x, G - 4, G - 1, { period: 3200, on: 1100, ...p });

// (No bg_far_deco silhouettes in Mission 2: Imagegen's painted cypress layers carry the distance.)

// ================================================================================================
// 1. WRECK SHORE (0-44): the BAYOU QUEEN beached and burning, heavy rain. Knotz crawls out of the wreck into the shallows.
//    Lurkers, piranhas.
// ================================================================================================
mat('ground', 0, 1, 8, G - 1, 'bank');                                        // the shore closes the left edge
bank(0, 3);
pool(4, 15);
spPx('prop', 13 * 16, G * 16, { kind: 'queen_wreck', layer: 'back' });
sp('player_start', 8, G, {}, 'player_start');
bank(16, 29);
pow('hmg', 24, G);
enemy('lurker', 28, G);                                     // Lead: was 19 (+176 px from the start, fired within ~2 s); Mission 1 keeps first threats 224+ px out
enemy('grunt', 27, G, { patrol: 16 });
prop('fuel_drum', 22, G);
deep(30, 35);
log(30, 35, G);
enemy('piranha', 33, G);
bank(36, 46);
enemy('lurker', 40, G);
enemy('grunt', 44, G, { idle: 'crouch' });
cypress(38, G, { canopyRows: [1, 5], v2: true });
cp('cp_wreck', 2);
tr('music', 0, 1, 0, H - 1, { key: 'music_m2p3' });

// ================================================================================================
// 2. SUNKEN FOREST (44-125): mostly water. Sinking logs, roots, mud islands, gas vents, hoppers, gnats.
// ================================================================================================
deep(47, 59);
sinkLog(48, 50);
roots(52, 56, 18);
enemy('piranha', 54, G);
sinkLog(57, 59);
mud(60, 68);
vent(64, { offset: 600 });
enemy('hopper', 67, G, { patrol: 8 });
deep(69, 80);
log(70, 74, G);
cypress(72, G, { canopyRows: [1, 5] });
enemy('piranha', 76, G);
sinkLog(77, 79);
bank(81, 88);
enemy('hopper', 85, G, { patrol: 16 });
enemy('gnat', 84, 13); enemy('gnat', 86, 12, { delay: 300 }); enemy('gnat', 88, 14, { delay: 600 });
deep(89, 104);
roots(90, 94, 18);
pow('spread', 92, 18);
roots(97, 100, 17);
enemy('piranha', 96, G);
enemy('grunt', 99, 17, { patrol: 8 });
sinkLog(102, 104);
mud(105, 114);
vent(108, { offset: 0 }); vent(112, { offset: 1600 });
enemy('lurker', 110, G);
deep(115, 118);
sinkLog(116, 118);
bank(119, 125);
cypress(121, G, { canopyRows: [2, 6], v2: true });
mossCurtain(58, 9, 4); mossCurtain(95, 10, 3);
prompt('FOLLOW THE LIGHTNING', 45, 48);
cp('cp_forest', 45);
cp('cp_forest_b', 81);

// ================================================================================================
// 3. THE DROWNED MILL (125-206): a ruined lumber mill on pilings (floor y 304) turned into GATORGEDDON's den: chains,
//    cages, giant bite marks, the turning waterwheel. Arena `mill` (x 180-204, 3 waves; the mill gate blows open on clear).
// ================================================================================================
deep(128, 206);
bank(125, 127);
spPx('prop', 132 * 16, 23 * 16, { kind: 'waterwheel', layer: 'back' });       // the big wheel turning in the race
for (let y = 13; y <= 20; y++) { put('back', 128, y, M(y === 13 ? 'wwframe_t' : y === 20 ? 'wwframe_b' : y === 17 ? 'wwframe_axle' : 'wwframe_m')); put('back', 136, y, M(y === 13 ? 'wwframe_t' : y === 20 ? 'wwframe_b' : y === 17 ? 'wwframe_axle' : 'wwframe_m')); }
k.run('ground', 128, 137, 18, M('mplank'));                                   // a gantry over the wheel race (one-way, y 288)
/**
 * Mill floor (solid) on pilings at row MF; a RUINED wall behind it: a ragged top (per column), storm gaps where whole
 * sections have collapsed to a few low boards, and the rusted roof (one-way) only over the intact stretches.
 */
function mill(x0, x1, top) {
  for (let x = x0; x <= x1; x++) {
    put('ground', x, MF, M(x === x0 ? 'mfloor_l' : x === x1 ? 'mfloor_r' : hash(x, MF, 21) < 0.35 ? 'mfloor_m2' : 'mfloor_m'));
    if ((x - x0) % 3 === 0) { put('back', x, MF + 1, M('pile_top')); }
  }
  const tops = [];
  for (let x = x0; x <= x1; x++) {
    const seg = Math.floor((x - x0) / 12), inSeg = (x - x0) % 12;
    const gap = seg % 2 === 1 && inSeg >= 3 && inSeg <= 9;                       // a collapsed stretch every other segment
    const h = hash(x, 0, 26);
    tops.push(gap ? MF - 2 + (h < 0.5 ? 0 : 1) : top + (h < 0.6 ? 0 : h < 0.85 ? 1 : 2));
  }
  for (let x = x0; x <= x1; x++) {
    const t = tops[x - x0];
    for (let y = t; y < MF; y++) {
      const r = y === t ? 't' : y === MF - 1 ? 'b' : 'm', c = x === x0 ? 'l' : x === x1 ? 'r' : 'm';
      let n = `mwall_${r}${c}`;
      if (r === 'm' && c === 'm') { const h = hash(x, y, 22); n = h < 0.1 ? 'mwall_broken_a' : h < 0.18 ? 'mwall_broken_b' : h < 0.24 ? 'mwall_win' : h < 0.3 ? 'mwall_mm2' : 'mwall_mm'; }
      put('back', x, y, M(n));
    }
    if (t === top) put('ground', x, top - 1, M(x === x0 ? 'mroof_l' : x === x1 ? 'mroof_r' : hash(x, top, 23) < 0.15 ? 'mroof_hole' : hash(x, top, 24) < 0.4 ? 'mroof_m2' : 'mroof_m'));
  }
}
mill(138, 206, 13);
// bite mark and claw gouges on the walls, chains, cages
/** Decor only on surviving wall (the ruin has gaps). */
const onWall = (x, y) => /mwall_/.test(k.tileAt('back', x, y)?.name ?? '');
const wallPut = (x, y, n) => { if (onWall(x, y)) put('back', x, y, M(n)); };
const bite = (x, y) => { if (![[0, 0], [1, 0], [0, 1], [1, 1]].every(([dx, dy]) => onWall(x + dx, y + dy))) return;
  put('back', x, y, M('mwall_bite_tl')); put('back', x + 1, y, M('mwall_bite_tr')); put('back', x, y + 1, M('mwall_bite_bl')); put('back', x + 1, y + 1, M('mwall_bite_br')); };
bite(146, 15); bite(171, 15); bite(193, 15); bite(141, 14);
for (const [x, y] of [[152, 16], [160, 14], [188, 16], [199, 15], [174, 15]]) wallPut(x, y, hash(x, y, 25) < 0.5 ? 'mwall_claw_a' : 'mwall_claw_b');
for (const x of [142, 157, 166, 184, 197]) {
  if (!k.tileAt('ground', x, 12)) continue;                                   // chains hang from the surviving roof only
  for (let y = 13; y <= 15; y++) put('back', x, y, M('mchain')); put('back', x, 16, M('mchain_hook'));
}
const cage = (x, y, broken) => { const p = broken ? 'cagex' : 'cage'; put('back', x, y, M(`${p}_tl`)); put('back', x + 1, y, M(`${p}_tr`)); put('back', x, y + 1, M(`${p}_bl`)); put('back', x + 1, y + 1, M(`${p}_br`)); };
cage(149, MF - 2, true); cage(163, MF - 2, false);
const gear = (x, y) => { if (!onWall(x, y) || !onWall(x + 1, y + 1)) return; for (const [dx, dy, n] of [[0, 0, 'gear_tl'], [1, 0, 'gear_tr'], [0, 1, 'gear_bl'], [1, 1, 'gear_br']]) put('back', x + dx, y + dy, M(n)); };
gear(154, 14); gear(177, 14);
const saw = (x, y) => { for (const [dx, dy, n] of [[0, 0, 'saw_tl'], [1, 0, 'saw_tr'], [0, 1, 'saw_bl'], [1, 1, 'saw_br']]) put('back', x + dx, y + dy, M(n)); };
saw(168, 16);
// upper floor (one-way) and lumber stacks for cover/steps
k.run('ground', 141, 147, 16, M('mplank'));
k.run('ground', 155, 162, 16, M('mplank'));
const lumber = (x0, x1, top) => { for (let x = x0; x <= x1; x++) { const c = x === x0 ? 'l' : x === x1 ? 'r' : 'm'; put('ground', x, top, M(`lumber_t${c}`)); put('ground', x, top + 1, M(`lumber_b${c}`)); } };
lumber(151, 153, MF - 2);
lumber(167, 168, MF - 2);
enemy('grunt', 144, MF, { patrol: 24 });
enemy('grenadier', 145, 16, { patrol: 8 });
enemy('hopper', 158, MF, { patrol: 16 });
enemy('grunt', 160, 16, { patrol: 16 });
pow('rocket', 165, MF);
enemy('grunt', 172, MF, { idle: 'crouch' });
prop('crate', 175, MF, { contains: 'bombs' });
// Arena `mill` (x 180-204)
k.run('ground', 183, 189, 16, M('mplank'));
k.run('ground', 194, 199, 15, M('mplank'));
lumber(191, 192, MF - 2);
prop('mill_gate', 201, MF, { lock: 'mill' });
prop('danger_post', 182, MF, { layer: 'back' });
const MI = { lock: 'mill' };
enemy('grunt', 196, MF, { ...MI, wave: 1, patrol: 16 });
enemy('grunt', 186, 16, { ...MI, wave: 1, delay: 700, patrol: 16 });
enemy('grenadier', 197, 15, { ...MI, wave: 1, delay: 1500, patrol: 8 });
enemy('hopper', 194, MF, { ...MI, wave: 2, patrol: 16 });
enemy('hopper', 186, MF, { ...MI, wave: 2, delay: 1200, facing: 'right', patrol: 16 });
enemy('gnat', 190, 12, { ...MI, wave: 2, delay: 2000 }); enemy('gnat', 193, 13, { ...MI, wave: 2, delay: 2300 }); enemy('gnat', 188, 13, { ...MI, wave: 2, delay: 2600 });
enemy('shield', 195, MF, { ...MI, wave: 3, patrol: 16 });
enemy('shield', 185, MF, { ...MI, wave: 3, delay: 1000, facing: 'right', patrol: 16 });
enemy('grenadier', 188, 16, { ...MI, wave: 3, delay: 1800, patrol: 8 });
tr('camera_lock', 180, 203, 0, H - 1, { id: 'mill', release: 'clear', waves: 3 });
cp('cp_mill', 126);
cp('cp_mill_b', 176);

// ================================================================================================
// 4. DEN APPROACH (206-238): crushed boats, bones, broken cage pens, DANGER: GATOR signs, claw marks. Tension, few enemies.
// ================================================================================================
bank(207, 216);
mat('ground', 207, 207, MF, G - 1, 'bank');                                  // step down off the mill floor
prop('sign_gator', 210, G);
prop('boat_wreck', 214, G, { layer: 'back' });
prop('bones', 218, G, { layer: 'back' });
pool(217, 224);
prop('cage', 227, G, { layer: 'back', variant: 'broken' });
prop('claw_marks', 230, G - 1, { layer: 'back' });
bank(225, 237);
prop('boat_wreck', 233, G, { layer: 'back', variant: 'b' });
pow('bombs', 229, G);
enemy('lurker', 221, G);
prop('danger_post', 236, G, { layer: 'back' });
cp('cp_boss', 234);
tr('music', 236, 236, 0, H - 1, { key: 'music_boss_gator' });

// ================================================================================================
// 5. THE DEN (238-270, x 3808-4320): boss arena `gator` (512 px). A wooden pier and a mud bank span the floor (y 336); the
//    deep channel lies behind it (the `channel` strip at depth 21, water line y 328). Pier planks are crack=stomp except
//    within 40 px of the walls. Gateless: the water churns as the camera arrives.
// ================================================================================================
mud(238, 240, G, false);
for (let x = 241; x <= 269; x++) {
  const stomp = x >= 241 && x <= 266;
  put('ground', x, G, M(stomp ? 'pier_stomp' : x === 269 ? 'pier_r' : hash(x, G, 31) < 0.4 ? 'pier_m2' : 'pier_m'));
  const under = x === 241 ? 'pier_under_l' : x === 269 ? 'pier_under_r' : (x - 241) % 4 === 2 ? 'pier_under' : 'pier_under2';
  put('ground', x, G + 1, M(under)); put('ground', x, G + 2, M(under));
}
put('ground', 241, G, M('pier_l'));
// The far bank and the den behind the channel (low, so the painted den backdrop shows above it)
for (let x = 238; x <= 269; x++) {
  const h = 18 + Math.floor(hash(x, 0, 32) * 2);
  for (let y = h; y <= G - 1; y++) put('back', x, y, M(y === h ? 'den_rock_top' : hash(x, y, 33) < 0.15 ? (hash(x, y, 34) < 0.5 ? 'den_glow_a' : 'den_glow_b') : hash(x, y, 35) < 0.5 ? 'den_rock_a' : 'den_rock_b'));
}
for (const x of [245, 258]) put('back', x, 19, M('den_pipe_h'));
put('back', 252, 18, M('gskull_l')); put('back', 253, 18, M('gskull_r'));
k.triggers.push({ type: 'channel', name: '', x: 238 * 16, y: 326, w: 32 * 16, h: 12, props: {} });
sp('boss', 263, G, { kind: 'gatorgeddon', lock: 'gator', wave: 1, facing: 'left' }, 'gatorgeddon');
tr('camera_lock', 238, 269, 0, H - 1, { id: 'gator', release: 'clear', waves: 1 });
tr('stage_end', 238, 268, 0, H - 1, { requires: 'boss' });

// ------------------------------------------------------------------------------------------------ ambience + moments
tr('ambience', 0, W - 1, 0, H - 1, { fx: 'storm' });
bg('lightning', 0, W - 1);
bg('boat_wreck', 18, 19);
bg('mill_wheel', 118, 206);
bg('den_glow', 206, W - 1);

dress({ x0: 0, x1: 137 });
dress({ x0: 207, x1: 240, density: 0.6 });
b.fixPoolSpawns();
finish();
write('m2p3', { name: 'Bayou Blackout', title: "GATOR'S DEN", music: 'music_m2p3', parallax: 'm2p3',
  sink_gids: b.sinkGids(), crack_style: 'wood',
  crack_gids: ['pier_crack_f1', 'pier_crack_f2', 'pier_crack_f3', 'pier_hole'].map((n) => gidOf(M(n))).join(','),
  sections: SECTIONS.map((s) => `${s.id}:${s.x0}-${s.x1}`).join(',') }, { background: '#1c2433' });
