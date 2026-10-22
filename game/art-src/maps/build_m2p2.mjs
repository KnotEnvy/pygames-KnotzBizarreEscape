#!/usr/bin/env node
// Mission 2 Part II "RIVER RUN" (map m2p2, 5408 px, drift 200): a Regime tow of barges behind the sternwheeler BAYOU QUEEN,
// moving downriver at night. The world is static; the river, banks and a foreground speed layer drift past
// (src/level/parallax.ts), low branches sweep over the decks (`hazard_sweep kind=branch`), a fog bank slides over the boat
// (`fog`), airboats ride the water lane beside the barges (y 344). Water between barges is deep water (death).
// Ends on the QUEEN's foredeck with MEGA-SKEETER (gateless flying boss). docs/MISSION2.md § 2-2.
//   node art-src/maps/build_m2p2.mjs -> art-src/maps/m2p2.tmx; art-src/maps/build.sh m2p2 exports + validates + previews.
// Rows: barge/QUEEN main deck 19 (y 304), hull 20, under water 21+ (river surface y 336), containers 2 rows each (top 272 /
// 240), promenade deck 16 (one-way, y 256), hurricane roof 13 (one-way, y 208).
import { mapkit } from './lib/mapkit.mjs';

const W = 338, H = 24, G = 21, D = 19, PROM = 16, ROOF = 13;
const LANE = 344; // airboat water lane (Enemies B: laneY)
const k = mapkit({ W, H, G, tilesets: ['m2_boat', 'm2_bayou'] });
const { put, sp, spPx, tr, enemy, prop, pow, pickup, hash, finish, write } = k;
const T = (n) => `m2_boat:${n}`;

const SECTIONS = [
  { id: 'fuel_barges', x0: 0, x1: 81 },
  { id: 'container_barges', x0: 81, x1: 169 },
  { id: 'bayou_queen', x0: 169, x1: 306 },
  { id: 'foredeck', x0: 306, x1: 338 },
];
const bg = (id, x0, x1, p = {}) => tr('bg_event', x0, x1, 0, H - 1, { id, ...p });
const prompt = (text, x0, x1, y0 = 6, y1 = G - 1) => tr('prompt', x0, x1, y0, y1, { text });
const cp = (id, x) => tr('checkpoint', x, x + 1, 0, H - 1, { id });
const airboat = (x, p = {}) => spPx('enemy', x * 16 + 8, LANE, { kind: 'airboat', facing: 'left', laneY: LANE, ...p });

// ------------------------------------------------------------------------------------------------ the river everywhere
for (let x = 0; x < W; x++) {
  put('ground', x, G, T('river_top_f0'));
  put('ground', x, G + 1, T('river_body_f0'));
  put('ground', x, G + 2, T('river_deep'));
}

// ------------------------------------------------------------------------------------------------ builders
/** Barge: deck row 19, hull row 20, the hull below the waterline on row 21 (water), railing posts and bollards. */
function barge(x0, x1, { rail = true } = {}) {
  for (let x = x0; x <= x1; x++) {
    const n = x === x0 ? 'bdeck_l' : x === x1 ? 'bdeck_r' : (() => { const h = hash(x, D, 7); return h < 0.6 ? 'bdeck_m' : h < 0.8 ? 'bdeck_m2' : 'bdeck_m3'; })();
    put('ground', x, D, T(n));
    put('ground', x, D + 1, T(x === x0 ? 'bhull_l' : x === x1 ? 'bhull_r' : (x - x0) % 6 === 3 ? 'bhull_tire' : hash(x, D + 1, 8) < 0.4 ? 'bhull_m2' : 'bhull_m'));
    put('ground', x, G, T(x === x0 ? 'bhull_sub_l' : x === x1 ? 'bhull_sub_r' : 'bhull_sub_m'));
    if (rail && (x === x0 + 1 || x === x1 - 1)) put('back', x, D - 1, T('bollard'));
  }
}
/** Railing segment on the row above a deck (back layer). */
function rail(x0, x1, row = D - 1) { for (let x = x0; x <= x1; x++) k.putIfEmpty('back', x, row, T((x - x0) % 4 === 0 ? 'brail_post' : 'brail_m')); }
/** Tow cable across a gap (back layer, decor). */
function tow(g0, g1) { for (let x = g0; x <= g1; x++) put('back', x, D + 1, T('tow_rope')); }
/** Shipping container (solid, 2 rows) with its top at `top`; c = 'cr' | 'cs' | 'co'. */
function container(x0, x1, top, c, stencil = true) {
  for (let x = x0; x <= x1; x++) {
    const mid = stencil && x === Math.floor((x0 + x1) / 2) && x1 - x0 >= 2;
    const t = x === x0 ? 'tl' : x === x1 ? 'tr' : mid ? 'stencil_t' : hash(x, top, 9) < 0.4 ? 'tm2' : 'tm';
    const bt = x === x0 ? 'bl' : x === x1 ? 'br' : mid ? 'stencil_b' : hash(x, top + 1, 9) < 0.4 ? 'bm2' : 'bm';
    put('ground', x, top, T(`${c}_${t}`));
    put('ground', x, top + 1, T(`${c}_${bt}`));
  }
}
function fuelTank(x0, top) {
  const row = (r, x) => (x === 0 ? `ftank_${r}l` : x === 3 ? `ftank_${r}r` : x === 1 ? `ftank_${r}m` : `ftank_${r}m2`);
  for (let i = 0; i < 4; i++) { put('back', x0 + i, top, T(row('t', i))); put('back', x0 + i, top + 1, T(row('b', i))); }
}

// ================================================================================================
// 1. SKIFF AND FUEL BARGES (0-81): Knotz jumps from Hazel's skiff onto the last barge. Fuel tanks, explosive drums,
//    cargo nets, fuel cells. Airboats pull alongside and their leapers jump aboard. Gnats.
// ================================================================================================
spPx('prop', 2 * 16 + 8, G * 16 + 2, { kind: 'skiff', layer: 'back' });
barge(5, 24);
sp('player_start', 8, D, {}, 'player_start');
fuelTank(10, D - 2);
prop('fuel_drum', 15, D); prop('fuel_drum', 16, D);
prop('fuel_cell', 18, D, { layer: 'back' }); prop('fuel_cell', 19, D, { layer: 'back' });
pow('hmg', 21, D);
rail(6, 9); rail(20, 23);
tow(25, 26);
barge(27, 46);
container(32, 34, D - 2, 'co');
enemy('grunt', 30, D, { patrol: 16 });
enemy('grenadier', 33, D - 2, { patrol: 8 });
prop('drum_rack', 38, D, { layer: 'back' });
fuelTank(40, D - 2);
enemy('grunt', 44, D, { idle: 'crouch' });
airboat(42);
enemy('gnat', 45, 15); enemy('gnat', 46, 14, { delay: 300 }); enemy('gnat', 47, 15, { delay: 600 });
tow(47, 48);
barge(49, 68);
container(55, 58, D - 2, 'cr'); container(56, 58, D - 4, 'cs');
enemy('grenadier', 55, D - 2, { patrol: 0 });   // the step, not the stack top (G01: y >= 62 from the deck)
enemy('shield', 62, D, { patrol: 16 });
put('back', 51, D - 2, T('cnet_top')); put('back', 51, D - 1, T('cnet_a')); put('back', 52, D - 2, T('cnet_top')); put('back', 52, D - 1, T('cnet_b'));
prop('fuel_drum', 65, D);
prop('supply_crate', 53, D, { contains: 'bombs' });
airboat(64, { delay: 400 });
rail(59, 67);
tow(69, 70);
prompt('GAPS: JUMP! THE RIVER KILLS', 22, 26);
cp('cp_skiff', 6);
tr('music', 0, 1, 0, H - 1, { key: 'music_m2p2' });

// ================================================================================================
// 2. CONTAINER BARGES (81-169): stacked containers as platforms and cover, container doors spawn grunts. Low branches
//    (boat horn, LOW BRANCHES! DUCK) and a fog bank with lanterns drifting past. Arena `crane` on the crane barge.
// ================================================================================================
barge(71, 90);
container(74, 76, D - 2, 'cs');
container(83, 86, D - 2, 'cr'); container(84, 86, D - 4, 'co');
prop('container_door', 81, D, { layer: 'back', spawns: 'grunt', count: 2, interval: 2600 });   // an end-on container beside the stack
enemy('grunt', 78, D, { patrol: 16 });
enemy('grenadier', 83, D - 2, { patrol: 0 });
tr('hazard_sweep', 77, 79, 0, H - 1, { kind: 'branch', y: 282, count: 1 });    // deck standing height: get off the containers
tow(91, 92);
barge(93, 114);
container(96, 98, D - 2, 'co');
container(103, 107, D - 2, 'cs'); container(104, 106, D - 4, 'cr');
prop('container_door', 101, D, { layer: 'back', spawns: 'grunt', count: 2, interval: 2400 });
pow('spread', 105, D - 4);
enemy('shield', 111, D, { patrol: 16 });
enemy('drone', 100, 15);
airboat(108, { delay: 300 });
tr('fog', 99, 101, 0, H - 1, { ms: 7000 });
tow(115, 116);
barge(117, 136);
container(120, 122, D - 2, 'cr');
container(129, 133, D - 2, 'co'); container(131, 133, D - 4, 'cs');
prop('container_door', 127, D, { layer: 'back', spawns: 'grunt', count: 1 });
enemy('grunt', 123, D, { patrol: 16 });
enemy('grenadier', 129, D - 2, { patrol: 8 });
enemy('leaper', 125, D);
tr('hazard_sweep', 123, 125, 0, H - 1, { kind: 'branch', y: 282, count: 2, gap: 1500 });
tow(137, 138);
cp('cp_containers', 72);
cp('cp_fog', 94);
cp('cp_crane', 118);

// Arena `crane` (x 140-163): the crane barge. Crane tower at the right end, boom over the deck, hook hanging.
barge(139, 164);
// Crane (back layer): base on the deck, operator cab on it, lattice mast above, boom reaching right to the hook.
put('back', 146, D - 1, T('crane_base_l')); put('back', 147, D - 1, T('crane_base_r'));
put('back', 146, D - 3, T('crane_cab_tl')); put('back', 147, D - 3, T('crane_cab_tr')); put('back', 146, D - 2, T('crane_cab_bl')); put('back', 147, D - 2, T('crane_cab_br'));
for (let y = 7; y <= D - 4; y++) put('back', 146, y, T('crane_mast'));
put('back', 146, 6, T('crane_mast_top'));
for (let x = 147; x <= 156; x++) put('back', x, 6, T(x === 147 ? 'crane_boom_l' : x === 156 ? 'crane_boom_r' : 'crane_boom_m'));
spPx('prop', 156 * 16 + 8, 7 * 16, { kind: 'crane_hook', layer: 'back' });   // hangs from the boom tip (origin top)
container(142, 143, D - 2, 'cr');
container(154, 156, D - 2, 'cs');
prop('alarm_light', 152, D - 1, { layer: 'back', lock: 'crane' });
const CR = { lock: 'crane' };
airboat(152, { ...CR, wave: 1, patrol: 48 });
enemy('grunt', 150, D, { ...CR, wave: 1, delay: 600, patrol: 16 });
enemy('grunt', 142, D - 2, { ...CR, wave: 1, delay: 1400, facing: 'right', patrol: 8 });
enemy('buzzard', 152, 11, { ...CR, wave: 2, delay: 400, patrol: 48 });
enemy('hopper', 155, D - 2, { ...CR, wave: 2, delay: 1600, patrol: 8 });
enemy('hopper', 148, D, { ...CR, wave: 3, facing: 'right', patrol: 16 });
enemy('shield', 158, D, { ...CR, wave: 3, delay: 800, patrol: 16 });
enemy('shield', 145, D, { ...CR, wave: 3, delay: 1800, facing: 'right', patrol: 8 });
tr('camera_lock', 140, 163, 0, H - 1, { id: 'crane', release: 'clear', waves: 3 });
tow(165, 166);

// ================================================================================================
// 3. THE BAYOU QUEEN (169-306): the red sternwheel churning at the stern (crossed on a catwalk over it), then the
//    riverboat's decks: main (y 304), promenade (one-way 256), hurricane roof (one-way 208), smokestacks, wheelhouse,
//    enemies on several decks, roof turrets and a dark boiler-room passage.
// ================================================================================================
barge(167, 176);
container(169, 171, D - 2, 'co');
enemy('grunt', 173, D, { patrol: 16 });
// Paddlewheel set piece over the water gap 177-185: housing frame (back), the spinning wheel, a catwalk over it.
for (let x = 177; x <= 185; x++) {
  put('back', x, 14, T(x === 177 ? 'phouse_tl' : x === 185 ? 'phouse_tr' : 'phouse_tm'));
  for (let y = 15; y <= D; y++) put('back', x, y, T(x === 177 ? 'phouse_ml' : x === 185 ? 'phouse_mr' : 'phouse_dark'));
}
spPx('prop', 181 * 16 + 8, 22 * 16 + 4, { kind: 'paddlewheel', layer: 'back' });
k.run('ground', 176, 186, PROM, 'm2_bayou:catwalk');
prompt('DON\'T FALL IN THE WHEEL!', 172, 176);
// The QUEEN's hull runs from the stern (186) to the bow at the map's end.
const Q0 = 186, Q1 = W - 1;
for (let x = Q0; x <= Q1 - 2; x++) {
  put('ground', x, D, T(x === Q0 ? 'qdeck_l' : hash(x, D, 11) < 0.35 ? 'qdeck_m2' : 'qdeck_m'));
  put('ground', x, D + 1, T(x === Q0 ? 'qhull_l' : (x - Q0) % 7 === 3 ? 'qhull_port' : (x - Q0) % 13 === 6 ? 'qhull_armor' : hash(x, D + 1, 12) < 0.4 ? 'qhull_m2' : 'qhull_m'));
  put('ground', x, G, T(x === Q0 ? 'qhull_sub_l' : 'qhull_sub_m'));
}
for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) put('ground', Q1 - 1 + c, D + r, T(`qbow_${r}${c}`));
/** A deck level of the QUEEN: floor (one-way) on `row`; under it (back layer) the cabin wall in three rows: tops in the
 *  deck's own row (they hang below the deck strip), middle row+1, bottom row+2 (down to the deck below); columns at both
 *  ends; railing on the row above where no cabin is. Without walls the deck edge gets gingerbread trim instead. */
function qdeck(x0, x1, row, { walls = true, windowsEvery = 3, open = [] } = {}) {
  const isOpen = (x) => open.some(([a, b]) => x >= a && x <= b);
  for (let x = x0; x <= x1; x++) {
    put('ground', x, row, T(x === x0 ? (row === ROOF ? 'qroof_l' : 'qprom_l') : x === x1 ? (row === ROOF ? 'qroof_r' : 'qprom_r') : row === ROOF ? 'qroof_m' : 'qprom_m'));
    k.putIfEmpty('back', x, row - 1, T((x - x0) % 4 === 0 ? 'qrail_post' : 'qrail_m'));
  }
  for (const x of [x0, x1]) { k.putIfEmpty('back', x, row, T('qpost_top')); k.putIfEmpty('back', x, row + 1, T('qpost_mid')); k.putIfEmpty('back', x, row + 2, T('qpost_base')); }
  if (!walls) { for (let x = x0 + 1; x < x1; x++) k.putIfEmpty('back', x, row, T(x === x0 + 1 ? 'qtrim_l' : x === x1 - 1 ? 'qtrim_r' : 'qtrim_m')); return; }
  // Open stretches (an open-air deck: columns and the trim only) let the night sky and far moments through.
  for (const [a, b] of open) for (const x of [a - 1, b + 1]) { k.putIfEmpty('back', x, row, T('qpost_top')); k.putIfEmpty('back', x, row + 1, T('qpost_mid')); k.putIfEmpty('back', x, row + 2, T('qpost_base')); }
  for (let x = x0 + 1; x < x1; x++) if (isOpen(x)) k.putIfEmpty('back', x, row, T('qtrim_m'));
  for (let x = x0 + 1; x <= x1 - 1; x++) for (const y of [row, row + 1, row + 2]) {
    if (isOpen(x)) continue;
    const c0 = x === x0 + 1 || isOpen(x - 1), c1 = x === x1 - 1 || isOpen(x + 1);
    const r = y === row ? 't' : y === row + 1 ? 'm' : 'b';
    const c = c0 ? 'l' : c1 ? 'r' : 'm';
    let n = `qcab_${r}${c}`;
    if (c === 'm' && r === 'm' && (x - x0) % windowsEvery === 0) n = hash(x, y, 13) < 0.25 ? 'qcab_win_dark' : 'qcab_win_lit';
    if (c === 'm' && (x - x0) % 11 === 5 && r !== 't') n = r === 'm' ? 'qcab_door_t' : 'qcab_door_b';
    else if (c === 'm' && r === 'b' && (x - x0) % 9 === 7) n = 'qcab_armor';
    k.putIfEmpty('back', x, y, T(n));
  }
}
// Hurricane roof (one-way y 208) first (its cabin walls sit on the promenade), then the promenade (one-way y 256).
qdeck(194, 206, ROOF, { windowsEvery: 4 });
qdeck(232, 284, ROOF, { windowsEvery: 4, open: [[243, 250], [264, 268]] });
// Promenade (one-way y 256) over the main deck: a stern section, the boiler passage (solid steel ceiling), a bow section.
qdeck(188, 209, PROM, { open: [[198, 203]] });
for (let x = 210; x <= 228; x++) {
  put('ground', x, PROM, T(x === 210 ? 'qsteel_l' : x === 228 ? 'qsteel_r' : 'qsteel_m'));
  for (const y of [PROM + 1, PROM + 2]) put('back', x, y, T(x % 5 === 2 ? 'boiler_pipe_h' : (x % 7 === 4 && y === PROM + 1) ? 'boiler_gauge' : hash(x, y, 14) < 0.5 ? 'boiler_m2' : 'boiler_m'));
}
put('back', 216, PROM + 1, T('boiler_furnace_t')); put('back', 216, PROM + 2, T('boiler_furnace_b'));
put('back', 224, PROM + 1, T('boiler_glow_f0')); put('back', 224, PROM + 2, T('boiler_furnace_b'));
prop('boiler_lamp', 213, PROM + 2, { layer: 'back' }); prop('boiler_lamp', 221, PROM + 2, { layer: 'back' });
qdeck(229, 290, PROM, { open: [[238, 245], [256, 262], [278, 284]] });
// Smokestacks and the wheelhouse on the hurricane roof.
for (const sx of [240, 252]) {
  put('back', sx, 2, T('stack_crown_l')); put('back', sx + 1, 2, T('stack_crown_r'));
  for (let y = 3; y < ROOF - 1; y++) { put('back', sx, y, T(y === 5 ? 'stack_band_l' : 'stack_l')); put('back', sx + 1, y, T(y === 5 ? 'stack_band_r' : 'stack_r')); }
  put('back', sx, ROOF - 1, T('stack_base_l')); put('back', sx + 1, ROOF - 1, T('stack_base_r'));
}
for (let x = 270; x <= 276; x++) for (let y = 10; y <= 11; y++) {
  const c = x === 270 ? 'l' : x === 276 ? 'r' : 'm';
  put('back', x, y, T(y === 10 ? `qcab_t${c}` : (c === 'm' && x % 2 === 0 ? 'qcab_win_lit' : `qcab_m${c}`)));
}
prop('wheelhouse_light', 273, 10, { layer: 'back' });
prop('queen_board', 200, PROM + 3, { layer: 'back' });
prop('life_ring', 236, PROM + 2, { layer: 'back' }); prop('life_ring', 262, D - 1, { layer: 'back' });
// Enemies on the main deck and the promenade only (KBE-QA-G01). The camera follows the floor the player stands on
// (feet at screen ~y152); anything standing more than ~44 px above the lowest floor of a stretch has its body under the
// HUD / radio strip (y < 62). The promenade (48 px up) is the highest threat deck; the hurricane roof is a quiet high
// route with points (from the promenade its deck is at screen ~y96, too high for a threat).
enemy('grunt', 192, D, { patrol: 16 });
enemy('grenadier', 198, PROM, { patrol: 16 });
enemy('grunt', 207, PROM, { patrol: 8 });
for (const x of [196, 200, 204]) pickup('points', x, ROOF - 1, { float: true });
pow('laser', 205, PROM);
enemy('grunt', 214, D, { idle: 'crouch' });                                   // in the boiler passage (dark)
enemy('shield', 225, D, { patrol: 8 });
enemy('grunt', 236, PROM, { patrol: 24 });
enemy('turret', 260, PROM, { mount: 'pedestal' });
enemy('grenadier', 248, PROM, { patrol: 16 });
for (const x of [244, 248, 266, 280]) pickup('points', x, ROOF - 1, { float: true });
enemy('grunt', 255, D, { patrol: 24 });
enemy('gnat', 254, 14); enemy('gnat', 256, 15, { delay: 250 }); enemy('gnat', 258, 14, { delay: 500 });
airboat(244, { delay: 200 });
airboat(282, { delay: 200 });
enemy('shield', 270, PROM, { patrol: 16 });
enemy('grunt', 281, PROM, { patrol: 16 });
enemy('grunt', 286, D, { patrol: 16 });
prop('crate', 294, D, { contains: 'bombs' });
pow('bombs', 298, D);
tr('hazard_sweep', 266, 268, 0, H - 1, { kind: 'branch', y: 234, count: 2, gap: 1400 });   // promenade standing height
tr('ambience', 210, 228, PROM, D, { fx: 'tunnel' });                         // the boiler passage is dark
prompt('BOILER ROOM: STAY LOW', 206, 209, PROM + 1, D - 1);
cp('cp_queen', 168);
cp('cp_decks', 230);
cp('cp_boss', 300);
tr('music', 304, 304, 0, H - 1, { key: 'music_boss_m2' });

// ================================================================================================
// 4. FOREDECK (306-338): boss arena `skeeter` (x 308-338, 480 px) on the bow, deck y 304, gateless. MEGA-SKEETER drops
//    out of the night sky as the camera arrives.
// ================================================================================================
rail(309, 334);
prop('bell', 312, D - 1, { layer: 'back' });
prop('rope_coil', 318, D, { layer: 'back' });
prop('rope_coil', 330, D, { layer: 'back' });
sp('boss', 326, D, { kind: 'skeeter', lock: 'skeeter', wave: 1, facing: 'left', floorY: D * 16 }, 'skeeter');
tr('camera_lock', 308, W - 1, 0, H - 1, { id: 'skeeter', release: 'clear', waves: 1 });
tr('stage_end', 308, W - 2, 0, H - 1, { requires: 'boss' });

// ------------------------------------------------------------------------------------------------ ambience + moments
tr('ambience', 0, W - 1, 0, H - 1, { fx: 'river' });
bg('riverbank', 0, W - 1);
bg('gator_pod', 30, 31);
bg('burning_barge', 110, 111);
bg('skeeter_swarm', 240, 241);

finish();
write('m2p2', { name: 'Bayou Blackout', title: 'RIVER RUN', music: 'music_m2p2', parallax: 'm2p2', drift: 200, clearSfx: '',
  sections: SECTIONS.map((s) => `${s.id}:${s.x0}-${s.x1}`).join(',') }, { background: '#12234a' });
