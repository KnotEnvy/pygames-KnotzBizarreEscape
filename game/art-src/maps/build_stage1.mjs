#!/usr/bin/env node
// Mission 1 "Pine Ridge Breakout" map generator.
//   node art-src/maps/build_stage1.mjs        -> writes art-src/maps/stage1.tmx (embedded tileset)
// Then art-src/maps/build.sh exports public/assets/maps/stage1.tmj and renders previews.
// Tile ids come from art-src/tiles/stage1_tiles.json (written by art-src/tiles/stage1.lua), never by hand.
// Coordinates below are in TILES unless a name says px. Spawn points are bottom-center (feet) in px.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '../..');
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'art-src/tiles/stage1_tiles.json'), 'utf8'));
const TILE = Object.fromEntries(man.tiles.map((t) => [t.name, t]));
const propsOf = (t) => (t.props && !Array.isArray(t.props) ? t.props : {});

const W = 420, H = 24, TS = 16;
const G = 21; // default ground surface row
const FLIP_X = 0x80000000;

function hash(x, y, s = 0) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ------------------------------------------------------------------------------------------------
// layers
class Layer {
  constructor(name) { this.name = name; this.mat = new Array(W * H).fill(null); this.tile = new Array(W * H).fill(null); }
}
const LAYERS = ['bg_far_deco', 'back', 'ground', 'front'];
const L = Object.fromEntries(LAYERS.map((n) => [n, new Layer(n)]));
const inb = (x, y) => x >= 0 && y >= 0 && x < W && y < H;
const idx = (x, y) => y * W + x;

function mat(layer, x0, x1, y0, y1, m) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inb(x, y)) L[layer].mat[idx(x, y)] = m;
}
function clear(layer, x0, x1, y0, y1) {
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (inb(x, y)) { L[layer].mat[idx(x, y)] = null; L[layer].tile[idx(x, y)] = null; }
}
function put(layer, x, y, name, flip = false) {
  if (!TILE[name]) throw new Error(`unknown tile ${name}`);
  if (!inb(x, y)) return;
  L[layer].tile[idx(x, y)] = { name, flip };
}
const empty = (layer, x, y) => inb(x, y) && !L[layer].mat[idx(x, y)] && !L[layer].tile[idx(x, y)];
function putIfEmpty(layer, x, y, name, flip = false) { if (empty(layer, x, y)) put(layer, x, y, name, flip); }

// ------------------------------------------------------------------------------------------------
// building blocks
/** ground column(s) from `top` down to the map bottom */
const ground = (x0, x1, top, m = 'ground') => mat('ground', x0, x1, top, H - 1, m);
const backMass = (x0, x1, top, bottom, m) => mat('back', x0, x1, top, bottom, m);

function platform(kind, x0, x1, y, layer = 'ground') {
  const ends = { plank: ['plank_l', 'plank_m', 'plank_r', 'plank_m2'], log: ['log_l', 'log_m', 'log_r', 'log_m2'],
    catwalk: ['catwalk_l', 'catwalk_m', 'catwalk_r', 'catwalk_m2'] }[kind];
  for (let x = x0; x <= x1; x++) {
    let n = ends[1];
    if (x0 === x1) n = ends[1];
    else if (x === x0) n = ends[0];
    else if (x === x1) n = ends[2];
    else if (hash(x, y, 3) < 0.3) n = ends[3];
    put(layer, x, y, n);
  }
}
/** branch growing out of a trunk; dir 1 = to the right of x (x is the first branch tile) */
function branch(x, y, len, dir) {
  for (let i = 0; i < len; i++) {
    const n = i === 0 ? 'branch_l' : i === len - 1 ? 'branch_r' : 'branch_m';
    put('ground', x + i * dir, y, n, dir < 0);
  }
}
/** needle tier around a branch row y. dir 1 = right of the trunk starting at column x; -1 = left, mirrored */
function tier(x, y, n, dir) {
  for (let r = 0; r < 3; r++) for (let c = 0; c < n; c++) put('back', x + c * dir, y - 1 + r, `tier${n}_${r}${c}`, dir < 0);
}
/** giant 2-wide pine trunk from the top of the map down to the ground (base on row groundTop-1) */
function bigTree(x, groundTop, branches = [], seed = 0) {
  for (let y = 0; y < groundTop - 1; y++) { put('back', x, y, 'trunk_l'); put('back', x + 1, y, 'trunk_r'); }
  put('back', x, groundTop - 1, 'trunk_base_l'); put('back', x + 1, groundTop - 1, 'trunk_base_r');
  for (const b of branches) {
    const n = Math.max(3, Math.min(4, b.len));
    if (b.dir > 0) { branch(x + 2, b.y, b.len, 1); tier(x + 2, b.y, n, 1); }
    else { branch(x - 1, b.y, b.len, -1); tier(x - 1, b.y, n, -1); }
  }
  // decorative crown tiers at the top of the map (out of jump reach), small clumps lower down
  if (branches.length) { tier(x + 2, 2, 4, 1); tier(x - 1, 2, 4, -1); tier(x + 2, 5, 3, 1); tier(x - 1, 4, 3, -1); }
  else { tier(x + 2, 3 + (seed % 2), 3, 1); tier(x - 1, 2 + ((seed + 1) % 2), 3, -1); }
}
/** background trunk without platforms (forest depth) */
function trunk(x, groundTop) { bigTree(x, groundTop, [], x); }
/** irregular background hill/cliff silhouette in the back layer */
function hills(x0, x1, lo, hi, m, seed, bottom = G - 1) {
  let h = Math.round((lo + hi) / 2), run = 0;
  for (let x = x0; x <= x1; x++) {
    if (run-- <= 0) { // plateaus 3-5 columns wide, stepping by one row
      const r = hash(x, 1, seed);
      h += r < 0.5 ? -1 : 1;
      if (h < lo) h = lo + 1; if (h > hi) h = hi - 1;
      run = 2 + Math.floor(hash(x, 2, seed) * 3);
    }
    const edge = Math.min(x - x0, x1 - x);
    const top = Math.max(h, bottom - 1 - edge * 2);
    mat('back', x, x, top, bottom, m);
  }
}
function fence(x0, x1, base, rows, postEvery = 6) {
  for (let x = x0; x <= x1; x++) {
    const isPost = (x - x0) % postEvery === 0 || x === x1;
    for (let r = 0; r < rows; r++) {
      const y = base - rows + 1 + r;
      const part = r === 0 ? 'top' : r === rows - 1 ? 'base' : 'mid';
      put('back', x, y, isPost ? `fence_post_${part}` : `fence_${part}`);
    }
  }
}
function palisade(x0, x1, base, rows, layer = 'back') {
  for (let x = x0; x <= x1; x++) for (let r = 0; r < rows; r++) put(layer, x, base - rows + 1 + r, r === 0 ? 'stake_top' : 'stake_mid');
}
function sandbags(x0, x1, top, bottom) {
  for (let y = top; y <= bottom; y++) for (let x = x0; x <= x1; x++) {
    const row = y === top ? 't' : 'm';
    const col = x === x0 ? 'l' : x === x1 ? 'r' : 'm';
    put('ground', x, y, `sandbag_${row}${col}`);
  }
}
function water(x0, x1, surf) {
  for (let x = x0; x <= x1; x++) {
    put('ground', x, surf, 'water_top_f0');
    put('ground', x, surf + 1, 'water_body_f0');
    for (let y = surf + 2; y < H; y++) put('ground', x, y, 'water_deep');
  }
}
const RAIL7 = ['rope_3_5', 'rope_5_7', 'rope_7_8', 'rope_8_8', 'rope_8_7', 'rope_7_5', 'rope_5_3'];
/** rope bridge: deck on row `deck`, handrail posts at `posts`, pylons into the river */
function ropeBridge(x0, x1, deck, posts, gaps = []) {
  const inGap = (x) => gaps.some(([a, b]) => x >= a && x <= b);
  for (let x = x0; x <= x1; x++) if (!inGap(x)) put('ground', x, deck, ['bridge_a', 'bridge_b', 'bridge_c'][Math.floor(hash(x, deck, 5) * 3)]);
  for (const p of posts) {
    put('back', p, deck - 2, 'bridge_post_top'); put('back', p, deck - 1, 'bridge_post_mid');
    for (let y = deck + 1; y < H; y++) put('back', p, y, 'post_mid');
  }
  for (let i = 0; i < posts.length - 1; i++) {
    const a = posts[i], b = posts[i + 1];
    if (inGap(a + 1) || inGap(b - 1)) continue;
    const span = b - a - 1;
    for (let k = 0; k < span; k++) {
      // resample the 7-tile catenary to any span length
      const r = RAIL7[Math.min(6, Math.floor((k + 0.5) / span * 7))];
      put('back', a + 1 + k, deck - 2, r); put('back', a + 1 + k, deck - 1, 'rope_hangers');
    }
  }
}
/** concrete facade in the back layer with baked wall decorations */
function facade(x0, x1, top, bottom, deco = []) {
  backMass(x0, x1, top, bottom, 'concrete');
  for (const [x, y, n] of deco) put('back', x, y, n);
}
function farPine(x, top, base, v = 1) {
  const p = v === 1 ? 'far_pine' : 'far_pine2';
  for (const [dx, side] of [[0, 'l'], [1, 'r']]) {
    putIfEmpty('bg_far_deco', x + dx, top, `${p}_top_${side}`);
    for (let y = top + 1; y < base; y++) putIfEmpty('bg_far_deco', x + dx, y, `${p}_mid_${side}`);
    putIfEmpty('bg_far_deco', x + dx, base, `${p}_base_${side}`);
  }
}

// ------------------------------------------------------------------------------------------------
// objects
const spawns = [], triggers = [];
const px = (t) => t * TS;
/** spawn at tile column tx (centered) standing on surface row `row` */
function sp(type, tx, row, props = {}, name = '') { spawns.push({ type, name, x: px(tx) + 8, y: px(row), props }); }
function spPx(type, x, y, props = {}, name = '') { spawns.push({ type, name, x, y, props }); }
function tr(type, tx0, tx1, ty0, ty1, props = {}, name = '') {
  triggers.push({ type, name, x: px(tx0), y: px(ty0), w: px(tx1 - tx0 + 1), h: px(ty1 - ty0 + 1), props });
}
const enemy = (kind, tx, row, p = {}) => sp('enemy', tx, row, { kind, facing: 'left', ...p });
const prop = (kind, tx, row, p = {}) => sp('prop', tx, row, { kind, ...p });
const pow = (item, tx, row, p = {}) => sp('pow', tx, row, { item, ...p });
const pickup = (kind, tx, row, p = {}) => sp('pickup', tx, row, { kind, ...p });

const SECTIONS = [
  { id: 'prison_camp', x0: 0, x1: 60 },
  { id: 'pine_forest', x0: 60, x1: 170 },
  { id: 'river_bridge', x0: 170, x1: 250 },
  { id: 'regime_outpost', x0: 250, x1: 360 },
  { id: 'moose_pen', x0: 360, x1: 420 },
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
enemy('grunt', 20, G, { idle: 'sleep' });
prop('watchtower', 27, G, { layer: 'back' });
enemy('grunt', 27, 16, { facing: 'left' });
enemy('grunt', 24, G, { patrol: 64 });
pow('hmg', 31, G - 1);
prop('crate', 35, G);
prop('crate', 36, G);
prop('crate', 36, G - 1, { stacked: true });
enemy('grunt', 38, G, { patrol: 48 });
prop('lamp_post', 40, G, { layer: 'back' });
enemy('grunt', 42, G);
prop('supply_crate', 44, 18, { contains: 'bombs' });
prop('sign_bomb', 47, G);
prop('explosive_barrel', 49, G);
enemy('turret', 51, G - 2, { mount: 'sandbag' });
enemy('grunt', 53, G, { idle: 'crouch' });
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
bigTree(123, G, [{ y: 17, len: 3, dir: 1 }, { y: 11, len: 4, dir: 1 }, { y: 8, len: 3, dir: -1 }]);
bigTree(134, G, [{ y: 12, len: 3, dir: -1 }, { y: 15, len: 3, dir: 1 }, { y: 9, len: 4, dir: 1 }]);
for (const x of [66, 91, 143, 158]) {
  const gt = (x >= 72 && x <= 79) ? G - 1 : (x >= 80 && x <= 87) ? G - 2 : (x >= 140 && x <= 145) || (x >= 150 && x <= 160) ? G - 1 : G;
  trunk(x, gt);
}
hills(94, 122, 12, 15, 'rock', 2);
hills(58, 70, 16, 18, 'ground', 3);
hills(146, 168, 15, 18, 'ground', 4);

prop('sign_arrow', 62, G);
enemy('grunt', 68, G, { patrol: 48 });
enemy('grunt', 74, G - 1);
enemy('grunt', 77, G - 1, { idle: 'crouch' });
enemy('grenadier', 85, 16);
enemy('grunt', 84, G - 2);
pickup('points', 86, 15, { float: true });
enemy('drone', 92, 12);
prop('crate', 90, G - 1, { contains: 'bombs' });
prop('explosive_barrel', 97, G);
enemy('grunt', 98, G);
enemy('grunt', 100, G, { patrol: 32 });
enemy('drone', 101, 10);
enemy('grenadier', 108, 17);
enemy('grunt', 112, 17, { idle: 'crouch' });
prop('pine_dead', 106, 17, { layer: 'back' });
enemy('grunt', 117, G);
enemy('grenadier', 126, 17, { facing: 'left' });
enemy('drone', 120, 9);
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
enemy('paratrooper', 184, 0);
enemy('grunt', 183, 18);
enemy('paratrooper', 194, 1);
enemy('drone', 199, 11);
prop('flag', 210, 18, { layer: 'back' });
prop('lamp_post', 218, 18, { layer: 'back' });
prop('supply_crate', 209, 18, { contains: 'bombs' });
// arena #1 waves (spawned by the camera lock, not by proximity)
const A1 = { lock: 'bridge' };
enemy('grunt', 225, 18, { ...A1, wave: 1 });
enemy('grunt', 227, 18, { ...A1, wave: 1, delay: 600 });
enemy('paratrooper', 209, 0, { ...A1, wave: 1, delay: 1200 });
enemy('paratrooper', 217, 0, { ...A1, wave: 1, delay: 1800 });
enemy('shield', 226, 18, { ...A1, wave: 2 });
enemy('grunt', 198, 18, { ...A1, wave: 2, facing: 'right', delay: 800 });
enemy('grunt', 227, 18, { ...A1, wave: 2, delay: 1400 });
enemy('grenadier', 228, 18, { ...A1, wave: 2, delay: 2000 });
enemy('shield', 198, 18, { ...A1, wave: 3, facing: 'right' });
enemy('drone', 226, 9, { ...A1, wave: 3, delay: 400 });
enemy('drone', 199, 7, { ...A1, wave: 3, delay: 900 });
enemy('paratrooper', 213, 0, { ...A1, wave: 3, delay: 1500 });
pow('rocket', 225, 18);
enemy('grunt', 231, 18);
enemy('paratrooper', 240, 0);
enemy('drone', 243, 10);
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
sandbags(257, 258, G - 2, G - 1);
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
enemy('grunt', 260, G, { idle: 'crouch' });
enemy('shield', 263, 17);
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
enemy('grunt', 305, 15);
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
enemy('shield', 349, G, { ...A2, wave: 2 });
enemy('shield', 320, G, { ...A2, wave: 2, facing: 'right', delay: 600 });
enemy('grenadier', 341, 18, { ...A2, wave: 2, delay: 1000 });
enemy('grunt', 341, G, { ...A2, wave: 2, from: 'door', delay: 1600 });
enemy('grunt', 327, G, { ...A2, wave: 2, from: 'door', delay: 2200 });
prop('alarm_light', 337, 12, { layer: 'back', on: true, lock: 'bunker' });
prop('flag', 352, G - 4, { layer: 'back' });
prop('flag', 357, G - 4, { layer: 'back' });
enemy('grunt', 353, G);
enemy('grunt', 356, G, { idle: 'crouch' });

tr('checkpoint', 252, 253, 0, H - 1, { id: 'cp_outpost' });
tr('checkpoint', 318, 319, 0, H - 1, { id: 'cp_outpost_b' });
tr('camera_lock', 322, 345, 0, H - 1, { id: 'bunker', release: 'clear', waves: 2 });
tr('ambience', 250, 359, 0, H - 1, { fx: 'embers' });

// ================================================================================================
// 5. MOOSE PEN / BOSS ARENA (360-420): breather approach with supplies, then a 30-tile yard
//    (camera lock 480 px wide, camera drifts), gate on the right smashes open for MOOSEZILLA.
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
sp('boss', 414, G, { kind: 'moosezilla', lock: 'boss', wave: 1 }, 'moosezilla');

tr('checkpoint', 360, 361, 0, H - 1, { id: 'cp_pen' });
tr('checkpoint', 388, 389, 0, H - 1, { id: 'cp_boss' });
tr('music', 389, 389, 0, H - 1, { key: 'music_boss' });
tr('camera_lock', 390, 419, 0, H - 1, { id: 'boss', release: 'clear', waves: 1 });
tr('stage_end', 404, 417, 0, H - 1, { requires: 'boss' });
tr('ambience', 360, 419, 0, H - 1, { fx: 'snow' });

// far silhouettes along the whole stage (deepest tile layer)
for (let x = 2; x < W - 2; x += 3) {
  if (x >= 172 && x <= 248) continue; // river already has its own
  const h = hash(x, 0, 99);
  if (h < 0.75) farPine(x, 14 + Math.floor(h * 6), 20, h < 0.4 ? 1 : 2);
}

// ================================================================================================
// autotile + decoration passes
// ================================================================================================
function solid(layer, x, y, fg) {
  if (x < 0 || x >= W || y >= H) return true;
  if (y < 0) return false;
  const i = idx(x, y);
  if (L[layer].mat[i]) return true;
  if (fg) { const t = L[layer].tile[i]; if (t) { const p = propsOf(TILE[t.name]); return !!p.collides && !p.oneway; } }
  return false;
}
function autotile(layer, bg) {
  const out = new Array(W * H).fill(null);
  const fg = !bg;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = idx(x, y);
    const m = L[layer].mat[i];
    if (!m || L[layer].tile[i]) continue;
    const s = (dx, dy) => solid(layer, x + dx, y + dy, fg);
    const mask = (s(0, -1) ? 0 : 1) | (s(1, 0) ? 0 : 2) | (s(0, 1) ? 0 : 4) | (s(-1, 0) ? 0 : 8);
    const pre = bg ? `${m}_bg_` : `${m}_`;
    let n;
    if (mask === 0) {
      if (!s(-1, -1)) n = 'ic_tl'; else if (!s(1, -1)) n = 'ic_tr'; else if (!s(-1, 1)) n = 'ic_bl'; else if (!s(1, 1)) n = 'ic_br';
      else {
        let depth = 0; while (y - depth - 1 >= 0 && L[layer].mat[idx(x, y - depth - 1)]) depth++;
        const h = hash(x, y, 11);
        const earthy = m === 'ground' || m === 'rock';
        const plain = earthy ? 0.25 : 0.6; // man-made surfaces are mostly clean panels
        if (earthy && (y === H - 1 || depth >= 4)) n = `deep_v${Math.floor(h * 4)}`;
        else n = h < plain ? 'm0' : `fill_v${1 + Math.floor((h - plain) / (1 - plain) * 3)}`;
      }
    } else if (mask === 1) {
      const h = hash(x, y, 12);
      n = h < 0.4 ? 'm1' : `top_v${1 + Math.floor((h - 0.4) / 0.6 * 3)}`;
    } else n = `m${mask}`;
    out[i] = pre + n;
  }
  for (let i = 0; i < W * H; i++) if (out[i]) L[layer].tile[i] = { name: out[i], flip: false };
}

// decoration: snowy tufts/rocks/drifts on exposed ground tops, icicles & roots under overhangs
function decorate() {
  const g = L.ground;
  for (let y = 1; y < H; y++) for (let x = 0; x < W; x++) {
    const m = g.mat[idx(x, y)];
    if (!m) continue;
    const above = idx(x, y - 1);
    const topExposed = !g.mat[above] && !g.tile[above];
    if (topExposed && (m === 'ground' || m === 'rock')) {
      const h = hash(x, y, 21);
      if (empty('back', x, y - 1)) {
        if (h < 0.16) put('back', x, y - 1, `tuft_${1 + Math.floor(h / 0.16 * 3)}`);
        else if (h < 0.22) put('back', x, y - 1, m === 'rock' ? 'rock_small' : 'rock_pair');
        else if (h < 0.26 && m === 'ground') put('back', x, y - 1, 'bush_l'), (empty('back', x + 1, y - 1) && put('back', x + 1, y - 1, 'bush_r'));
        else if (h < 0.29 && m === 'ground') put('back', x, y - 1, 'stump');
      } else if (h < 0.08 && empty('front', x, y - 1)) put('front', x, y - 1, 'tuft_' + (1 + Math.floor(h / 0.08 * 3)));
    }
    if (y + 1 < H && !g.mat[idx(x, y + 1)] && !g.tile[idx(x, y + 1)] && (m === 'ground' || m === 'rock')) {
      const h = hash(x, y, 22);
      if (m === 'ground' && h < 0.5) putIfEmpty('front', x, y + 1, 'roots');
      else if (h < 0.75) putIfEmpty('front', x, y + 1, h < 0.4 ? 'icicles_a' : 'icicles_b');
    }
  }
  // bridge planks and branches also get icicles underneath sometimes
  for (let y = 0; y < H - 1; y++) for (let x = 0; x < W; x++) {
    const t = g.tile[idx(x, y)];
    if (t && /^(bridge_|plank_)/.test(t.name) && hash(x, y, 23) < 0.25 && empty('ground', x, y + 1)) putIfEmpty('front', x, y + 1, 'icicles_a');
  }
}
decorate();
autotile('ground', false);
autotile('back', true);
autotile('bg_far_deco', true);

// ================================================================================================
// TMX writer
// ================================================================================================
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
function propXml(props, indent) {
  const e = Object.entries(props || {});
  if (!e.length) return '';
  const lines = e.map(([k, v]) => {
    const type = typeof v === 'boolean' ? 'bool' : typeof v === 'number' ? (Number.isInteger(v) ? 'int' : 'float') : 'string';
    return `${indent} <property name="${esc(k)}"${type === 'string' ? '' : ` type="${type}"`} value="${esc(v)}"/>`;
  });
  return `${indent}<properties>\n${lines.join('\n')}\n${indent}</properties>\n`;
}
function gid(cell) { if (!cell) return 0; return ((TILE[cell.name].id + 1) | (cell.flip ? FLIP_X : 0)) >>> 0; }

let out = '';
out += '<?xml version="1.0" encoding="UTF-8"?>\n';
out += `<map version="1.10" tiledversion="1.12.2" orientation="orthogonal" renderorder="right-down" width="${W}" height="${H}" tilewidth="${TS}" tileheight="${TS}" infinite="0" backgroundcolor="#6aa2dc" nextlayerid="7" nextobjectid="${spawns.length + triggers.length + 1}">\n`;
out += propXml({ name: 'Pine Ridge Breakout', music: 'music_stage1', parallax: 'stage1',
  sections: SECTIONS.map((s) => `${s.id}:${s.x0}-${s.x1}`).join(',') }, ' ');
const tilecount = man.columns * man.rows;
out += ` <tileset firstgid="1" name="stage1" tilewidth="${TS}" tileheight="${TS}" tilecount="${tilecount}" columns="${man.columns}">\n`;
out += `  <image source="../../public/assets/tiles/stage1.png" width="${man.columns * TS}" height="${man.rows * TS}"/>\n`;
for (const t of man.tiles) {
  const p = propsOf(t);
  const hasP = Object.keys(p).length > 0;
  if (!hasP && !t.anim) continue;
  out += `  <tile id="${t.id}">\n`;
  out += propXml(p, '   ');
  if (t.anim) out += `   <animation>\n${t.anim.map((f) => `    <frame tileid="${f.id}" duration="${f.ms}"/>`).join('\n')}\n   </animation>\n`;
  out += '  </tile>\n';
}
out += ' </tileset>\n';
LAYERS.forEach((name, li) => {
  const rows = [];
  for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(gid(L[name].tile[idx(x, y)])); rows.push(r.join(',')); }
  out += ` <layer id="${li + 1}" name="${name}" width="${W}" height="${H}">\n  <data encoding="csv">\n${rows.join(',\n')}\n</data>\n </layer>\n`;
});
let oid = 1;
function objXml(o, rect) {
  let s = `  <object id="${oid++}"${o.name ? ` name="${esc(o.name)}"` : ''} type="${esc(o.type)}" x="${o.x}" y="${o.y}"${rect ? ` width="${o.w}" height="${o.h}"` : ''}>\n`;
  s += propXml(o.props, '   ');
  if (!rect) s += '   <point/>\n';
  return s + '  </object>\n';
}
out += ' <objectgroup id="5" name="spawns">\n' + spawns.map((o) => objXml(o, false)).join('') + ' </objectgroup>\n';
out += ' <objectgroup id="6" name="triggers">\n' + triggers.map((o) => objXml(o, true)).join('') + ' </objectgroup>\n';
out += '</map>\n';

fs.writeFileSync(path.join(HERE, 'stage1.tmx'), out);
console.log(`wrote stage1.tmx: ${W}x${H}, ${spawns.length} spawns, ${triggers.length} triggers`);
