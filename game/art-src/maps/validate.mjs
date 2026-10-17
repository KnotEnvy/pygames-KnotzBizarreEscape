#!/usr/bin/env node
// Validates an exported map against the Tiled contract (docs/ARCHITECTURE.md, docs/CAMPAIGN.md) and prints a summary.
//   node art-src/maps/validate.mjs public/assets/maps/m1p2.tmj
// Also runs a static traversal check: from player_start, walking / stepping up <= 3 tiles / jumping gaps (the player's
// jump is ~56 px up, ~74 px across), can the player reach the boss arena / stage_end? It's run twice: with cracking
// ice intact, and with every `crack` tile turned into a hole (worst case after the player cracked them).
// Exit code 1 on errors (warnings don't fail).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GAME = path.resolve(HERE, '../..');
const file = process.argv[2] || path.join(GAME, 'public/assets/maps/m1p1.tmj');
const map = JSON.parse(fs.readFileSync(file, 'utf8'));
const errors = [], warns = [];
const err = (m) => errors.push(m), warn = (m) => warns.push(m);

const ENEMY_KINDS = ['grunt', 'grenadier', 'shield', 'turret', 'drone', 'paratrooper', 'leaper', 'buzzard', 'hound'];
const BOSS_KINDS = ['moosezilla', 'snowcat', 'ironhorn'];
const ITEMS = ['hmg', 'spread', 'rocket', 'flame', 'bombs', 'laser'];
const PICKUPS = [...ITEMS, 'points', 'life'];
const PROP_KINDS = ['crate', 'supply_crate', 'barrel', 'explosive_barrel', 'sandbag', 'watchtower', 'prison_cell', 'pine_fg',
  'pine_mid', 'pine_dead', 'sign_jump', 'sign_bomb', 'sign_shoot', 'sign_arrow', 'sign_danger', 'sign_crouch', 'gate', 'alarm_light',
  'searchlight', 'searchlight_beam', 'flag', 'banner', 'bunker_door', 'lamp_post', 'wire_coil',
  // Part II (train)
  'bogie', 'coupling', 'boxcar_door', 'sign_duck', 'low_bridge', 'train_lamp',
  // Part III (lake / lab)
  'wreck_boxcar', 'wreck_engine', 'wreck_bogie', 'log_spill', 'sign_thin_ice', 'lab_sign', 'tesla_coil', 'ice_hole'];
const AIR_KINDS = ['drone', 'paratrooper', 'buzzard', 'leaper'];
const AMBIENCE = ['snow', 'embers', 'fireflies', 'steam', 'train', 'tunnel', 'blizzard'];
const FACING = ['left', 'right'];

const props = (o) => Object.fromEntries((o.properties || []).map((p) => [p.name, p.value]));
const need = (o, p, key, ok, where) => {
  if (p[key] === undefined) err(`${where}: missing property "${key}"`);
  else if (ok && !ok.includes(p[key])) err(`${where}: ${key}="${p[key]}" not in [${ok.join(', ')}]`);
};

// --- structure
const layerNames = map.layers.map((l) => l.name);
const EXPECT = ['bg_far_deco', 'back', 'ground', 'front', 'spawns', 'triggers'];
for (const n of EXPECT) if (!layerNames.includes(n)) err(`missing layer ${n}`);
const mp = props(map);
for (const k of ['music', 'parallax', 'name']) if (!mp[k]) err(`map property "${k}" missing`);
if (mp.drift !== undefined && typeof mp.drift !== 'number') err('map property "drift" must be a number (px/s)');
if (!map.tilesets.length) err('no tileset');
for (const ts of map.tilesets) {
  if (ts.source) err(`tileset ${ts.name} must be embedded`);
  if (ts.margin || ts.spacing) err(`tileset ${ts.name} must have 0 margin/spacing`);
}
const L = Object.fromEntries(map.layers.map((l) => [l.name, l]));
for (const n of EXPECT.slice(0, 4)) if (L[n] && (L[n].encoding || L[n].compression)) err(`layer ${n} must be uncompressed`);

// --- tile properties (every tileset)
const gidInfo = new Map();
let animated = 0;
for (const ts of map.tilesets) for (const t of ts.tiles || []) {
  gidInfo.set(ts.firstgid + t.id, { p: props(t), set: ts.name });
  if (t.animation) animated++;
}
const gidProps = (gid) => (gidInfo.get((gid & 0x1fffffff) >>> 0) || {}).p || {};
const W = map.width, H = map.height, TS = map.tilewidth;
const groundAt = (tx, ty) => (tx < 0 || ty < 0 || tx >= W || ty >= H) ? 0 : L.ground.data[ty * W + tx];
const solidAt = (tx, ty) => { const g = groundAt(tx, ty); if (!g) return false; const p = gidProps(g); return !!p.collides && !p.oneway; };
const standable = (tx, ty) => { const g = groundAt(tx, ty); if (!g) return false; return !!gidProps(g).collides; };
if (!animated) warn('no animated tiles');
const hazards = { water: 0, spikes: 0 };
let ice = 0, crack = 0, crackStomp = 0;
for (const g of L.ground.data) {
  if (!g) continue;
  const p = gidProps(g);
  if (p.hazard) hazards[p.hazard] = (hazards[p.hazard] || 0) + 1;
  if (p.material === 'ice') ice++;
  if (p.crack === 'true' || p.crack === true) crack++;
  if (p.crack === 'stomp') crackStomp++;
}
for (const n of ['bg_far_deco', 'back', 'front']) for (const g of L[n].data) if (g && gidProps(g).collides) { err(`collidable tile in non-collision layer ${n}`); break; }

// --- spawns
const count = {};
const bump = (k) => (count[k] = (count[k] || 0) + 1);
const locks = new Map();
for (const o of L.triggers.objects) if (o.type === 'camera_lock') locks.set(props(o).id, { o, waves: props(o).waves, seen: new Set(), members: [] });
let starts = 0, start = null;
const sections = (mp.sections || '').split(',').filter(Boolean).map((s) => { const [id, r] = s.split(':'); const [a, b] = r.split('-').map(Number); return { id, a, b, n: {} }; });
const sectionOf = (x) => sections.find((s) => x / TS >= s.a && x / TS < s.b);
let bossObj = null;

for (const o of L.spawns.objects) {
  const p = props(o);
  const where = `spawn #${o.id} ${o.type}${p.kind ? ':' + p.kind : ''}${p.item ? ':' + p.item : ''} @(${o.x},${o.y})`;
  if (!o.point) warn(`${where}: spawns should be point objects`);
  if (o.x < 0 || o.x > W * TS || o.y < 0 || o.y > H * TS) err(`${where}: outside the map`);
  const tx = Math.floor(o.x / TS), feet = Math.floor((o.y - 1) / TS), below = Math.floor(o.y / TS);
  let key = o.type;
  switch (o.type) {
    case 'player_start': starts++; start = o; break;
    case 'enemy':
      need(o, p, 'kind', ENEMY_KINDS, where); key += ':' + p.kind;
      if (p.facing !== undefined && !FACING.includes(p.facing)) err(`${where}: facing must be left|right`);
      if (p.patrol !== undefined && typeof p.patrol !== 'number') err(`${where}: patrol must be a number (px)`);
      if (p.wave !== undefined) {
        const lk = locks.get(p.lock);
        if (!lk) err(`${where}: wave enemy needs lock= an existing camera_lock id (got ${p.lock})`);
        else { if (p.wave < 1 || p.wave > lk.waves) err(`${where}: wave ${p.wave} outside 1..${lk.waves}`); lk.seen.add(p.wave); lk.members.push({ o, p, where }); }
      }
      break;
    case 'pow': need(o, p, 'item', ITEMS, where); key += ':' + p.item; break;
    case 'pickup': need(o, p, 'kind', PICKUPS, where); key += ':' + p.kind; break;
    case 'boss': need(o, p, 'kind', BOSS_KINDS, where); key += ':' + p.kind; bossObj = o; break;
    case 'prop': need(o, p, 'kind', PROP_KINDS, where); key += ':' + p.kind;
      if (p.contains !== undefined && !PICKUPS.includes(p.contains)) err(`${where}: contains="${p.contains}" is not a pickup kind`);
      break;
    default: err(`${where}: unknown spawn type "${o.type}"`);
  }
  bump(key);
  const s = sectionOf(o.x); if (s) s.n[o.type] = (s.n[o.type] || 0) + 1;
  const airborne = (o.type === 'enemy' && AIR_KINDS.includes(p.kind)) || o.type === 'boss';
  const isDecor = o.type === 'prop' && p.layer;
  if (!airborne && !isDecor && solidAt(tx, feet)) err(`${where}: feet inside a solid tile (${tx},${feet})`);
  if (!airborne && !isDecor && !p.wave && !p.stacked && !p.float && !standable(tx, below) && !(o.type === 'prop' && ['alarm_light', 'searchlight'].includes(p.kind)))
    warn(`${where}: nothing to stand on at tile (${tx},${below})`);
}
if (starts !== 1) err(`expected exactly 1 player_start, found ${starts}`);
for (const [id, lk] of locks) for (let w = 1; w <= lk.waves; w++) if (!lk.seen.has(w) && id !== 'boss') err(`camera_lock ${id}: wave ${w} has no enemies`);
if (!bossObj) err('no boss spawn');

// --- arena placement (lesson from the bridge-arena stall): every wave member and its patrol inside the locked view
for (const [id, lk] of locks) {
  const x0 = lk.o.x, x1 = lk.o.x + lk.o.width;
  for (const m of lk.members) {
    // Enemy default patrol is 48 px (drones at least 48); turrets don't move; paratroopers land where they're placed.
    const k = m.p.kind;
    let patrol = typeof m.p.patrol === 'number' ? m.p.patrol : 48;
    if (k === 'drone' || k === 'buzzard') patrol = Math.max(48, patrol);
    if (k === 'turret') patrol = 0;
    if (m.o.x - patrol < x0 + 8 || m.o.x + patrol > x1 - 8) err(`${m.where}: arena '${id}' member or its patrol (${patrol}) leaves the locked view ${x0}-${x1}`);
  }
}

// --- triggers
const ids = new Set();
for (const o of L.triggers.objects) {
  const p = props(o);
  const where = `trigger #${o.id} ${o.type} @x=${o.x / TS}`;
  if (o.point || !o.width || !o.height) err(`${where}: triggers must be rectangles`);
  switch (o.type) {
    case 'camera_lock': need(o, p, 'id', null, where); need(o, p, 'release', ['clear', 'time'], where); need(o, p, 'waves', null, where);
      if (p.release === 'time' && !p.time) err(`${where}: release=time needs time (s)`);
      if (o.width < 384) err(`${where}: lock narrower than the 384 px screen`); break;
    case 'checkpoint': need(o, p, 'id', null, where); if (ids.has(p.id)) err(`${where}: duplicate checkpoint id ${p.id}`); ids.add(p.id); break;
    case 'stage_end': break;
    case 'music': need(o, p, 'key', null, where); break;
    case 'prompt': need(o, p, 'text', null, where); break;
    case 'ambience': need(o, p, 'fx', AMBIENCE, where); break;
    case 'hazard_sweep': if (p.y !== undefined && typeof p.y !== 'number') err(`${where}: y must be a number (beam bottom, px)`); break;
    case 'tunnel': if (typeof p.ms !== 'number') err(`${where}: tunnel needs ms (duration)`); break;
    default: err(`${where}: unknown trigger type "${o.type}"`);
  }
  bump('trigger:' + o.type);
}
if (!L.triggers.objects.some((o) => o.type === 'stage_end')) err('no stage_end trigger');

// --- traversal (static reachability, in tiles). A "stand" is (x, r): tile row r is standable at column x, the two
// rows above are free (the 30 px player), and it's no hazard.
const JUMP_UP = 3, GAP = 3; // rows up (56 px jump), empty columns across at the same height
function traverse(holes) {
  const isCrack = (tx, ty) => { const p = gidProps(groundAt(tx, ty)); return p.crack === 'true' || p.crack === true; };
  const st = (tx, ty) => standable(tx, ty) && !(holes && isCrack(tx, ty));
  const so = (tx, ty) => solidAt(tx, ty) && !(holes && isCrack(tx, ty));
  const free = (tx, ty) => ty < 0 || (!so(tx, ty) && !(gidProps(groundAt(tx, ty)).hazard));
  const stands = [];
  for (let x = 0; x < W; x++) {
    const col = [];
    for (let r = 1; r < H; r++) if (st(x, r) && free(x, r - 1) && free(x, r - 2) && !gidProps(groundAt(x, r)).hazard) col.push(r);
    stands.push(col);
  }
  const key = (x, r) => x * 64 + r;
  const seen = new Set();
  const sx = Math.floor(start.x / TS);
  let sr = Math.floor(start.y / TS);
  if (!stands[sx].includes(sr)) sr = stands[sx].find((r) => r >= Math.floor((start.y - 1) / TS)) ?? stands[sx][0];
  const q = [[sx, sr]];
  seen.add(key(sx, sr));
  let maxX = sx;
  while (q.length) {
    const [x, r] = q.pop();
    maxX = Math.max(maxX, x);
    for (let dx = -GAP - 2; dx <= GAP + 2; dx++) {
      if (!dx) continue;
      const nx = x + dx;
      if (nx < 0 || nx >= W) continue;
      for (const nr of stands[nx]) {
        const up = r - nr; // >0 = higher
        const adx = Math.abs(dx);
        let ok;
        if (adx === 1) ok = up <= JUMP_UP; // step / hop up to 3 tiles, drop any depth
        else if (up >= 3) ok = adx <= 2;
        else if (up >= 1) ok = adx <= GAP + 1;
        else ok = adx <= GAP + 1 + Math.min(2, Math.floor(-up / 2));
        if (!ok) continue;
        // no wall in the way at take-off height for long jumps: the column between must be free at the higher row - 2
        let blocked = false;
        const top = Math.min(r, nr) - 3;
        const step = dx > 0 ? 1 : -1;
        for (let ix = x + step; ix !== nx && !blocked; ix += step) if (top >= 0 && so(ix, top)) blocked = true;
        if (blocked && adx > 1) continue;
        const k = key(nx, nr);
        if (seen.has(k)) continue;
        seen.add(k);
        q.push([nx, nr]);
      }
    }
  }
  return maxX;
}
// The goal: the boss arena's left edge (bosses end every part); otherwise the stage_end trigger.
const bossLock = [...locks.values()].find((l) => l.o === L.triggers.objects.find((o) => o.type === 'camera_lock' && props(o).id === 'boss'));
const goalX = Math.floor(((bossLock ? bossLock.o.x : L.triggers.objects.find((o) => o.type === 'stage_end')?.x) ?? W * TS) / TS) + 2;
let reach = { intact: 0, holes: 0 };
if (start) {
  reach.intact = traverse(false);
  reach.holes = crack ? traverse(true) : reach.intact;
  if (reach.intact < goalX) err(`traversal: from the start the player can only reach tile x=${reach.intact} (goal x=${goalX}); check walls/gaps there`);
  if (reach.holes < goalX) err(`traversal with every cracking-ice tile broken: reach x=${reach.holes} (goal x=${goalX}); keep crack runs jumpable`);
}

// --- summary
const pad = (s, n) => String(s).padEnd(n);
console.log(`map ${path.basename(file)}: ${W}x${H} tiles (${W * TS}x${H * TS} px), tilesets ${map.tilesets.map((t) => `${t.name}@${t.firstgid}`).join(' ')}, ${animated} animated tiles${mp.drift ? `, drift ${mp.drift} px/s` : ''}`);
console.log(`hazard tiles: water ${hazards.water || 0}, spikes ${hazards.spikes || 0}; ice ${ice}, crack ${crack}, crack=stomp ${crackStomp}`);
console.log('counts:');
for (const k of Object.keys(count).sort()) console.log(`  ${pad(k, 28)} ${count[k]}`);
console.log('sections (tiles):');
for (const s of sections) console.log(`  ${pad(s.id, 16)} x ${pad(`${s.a}-${s.b}`, 8)} ${Object.entries(s.n).map(([k, v]) => `${k} ${v}`).join(', ')}`);
console.log('camera locks:');
for (const [id, lk] of locks) console.log(`  ${pad(id, 8)} x ${lk.o.x / TS}-${(lk.o.x + lk.o.width) / TS} waves ${lk.waves}, members ${lk.members.length}`);
console.log('checkpoints: ' + L.triggers.objects.filter((o) => o.type === 'checkpoint').map((o) => `${props(o).id}@${o.x / TS}`).join(', '));
console.log(`traversal: goal tile x=${goalX}, reach ${reach.intact} (intact)${crack ? `, ${reach.holes} (all cracking ice broken)` : ''}`);
for (const w of warns) console.log('WARN  ' + w);
for (const e of errors) console.log('ERROR ' + e);
console.log(errors.length ? `FAILED: ${errors.length} error(s), ${warns.length} warning(s)` : `OK (${warns.length} warning(s))`);
process.exit(errors.length ? 1 : 0);
