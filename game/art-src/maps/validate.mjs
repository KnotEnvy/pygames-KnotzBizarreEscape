#!/usr/bin/env node
// Validates an exported map against the Tiled contract in docs/ARCHITECTURE.md and prints a summary.
//   node art-src/maps/validate.mjs [public/assets/maps/stage1.tmj]
// Exit code 1 on errors (warnings don't fail).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GAME = path.resolve(HERE, '../..');
const file = process.argv[2] || path.join(GAME, 'public/assets/maps/stage1.tmj');
const map = JSON.parse(fs.readFileSync(file, 'utf8'));
const errors = [], warns = [];
const err = (m) => errors.push(m), warn = (m) => warns.push(m);

const ENEMY_KINDS = ['grunt', 'grenadier', 'shield', 'turret', 'drone', 'paratrooper'];
const ITEMS = ['hmg', 'spread', 'rocket', 'flame', 'bombs'];
const PICKUPS = [...ITEMS, 'points', 'life'];
const PROP_KINDS = ['crate', 'supply_crate', 'barrel', 'explosive_barrel', 'sandbag', 'watchtower', 'prison_cell', 'pine_fg',
  'pine_mid', 'pine_dead', 'sign_jump', 'sign_bomb', 'sign_shoot', 'sign_arrow', 'sign_danger', 'sign_crouch', 'gate', 'alarm_light',
  'searchlight', 'searchlight_beam', 'flag', 'banner', 'bunker_door', 'lamp_post', 'wire_coil'];
const AIR_KINDS = ['drone', 'paratrooper'];
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
if (map.tilesets.length !== 1 || map.tilesets[0].source) err('tileset must be a single embedded tileset');
const ts = map.tilesets[0];
if (ts.margin || ts.spacing) err('tileset must have 0 margin/spacing');
const L = Object.fromEntries(map.layers.map((l) => [l.name, l]));
for (const n of EXPECT.slice(0, 4)) if (L[n] && (L[n].encoding || L[n].compression)) err(`layer ${n} must be uncompressed`);

// --- tile properties
const tileProps = new Map();
for (const t of ts.tiles || []) tileProps.set(t.id, props(t));
const gidProps = (gid) => tileProps.get(((gid & 0x1fffffff) >>> 0) - ts.firstgid) || {};
const W = map.width, H = map.height, TS = map.tilewidth;
const groundAt = (tx, ty) => (tx < 0 || ty < 0 || tx >= W || ty >= H) ? 0 : L.ground.data[ty * W + tx];
const solidAt = (tx, ty) => { const g = groundAt(tx, ty); if (!g) return false; const p = gidProps(g); return !!p.collides && !p.oneway; };
const standable = (tx, ty) => { const g = groundAt(tx, ty); if (!g) return false; return !!gidProps(g).collides; };
let animated = 0;
for (const t of ts.tiles || []) if (t.animation) animated++;
if (!animated) warn('no animated tiles (water should animate)');
let hazards = { water: 0, spikes: 0 };
for (const g of L.ground.data) { const h = g && gidProps(g).hazard; if (h) hazards[h] = (hazards[h] || 0) + 1; }
for (const n of ['bg_far_deco', 'back', 'front']) for (const g of L[n].data) if (g && gidProps(g).collides) { err(`collidable tile in non-collision layer ${n}`); break; }

// --- spawns
const count = {};
const bump = (k) => (count[k] = (count[k] || 0) + 1);
const locks = new Map();
for (const o of L.triggers.objects) if (o.type === 'camera_lock') locks.set(props(o).id, { o, waves: props(o).waves, seen: new Set() });
let starts = 0;
const sections = (mp.sections || '').split(',').filter(Boolean).map((s) => { const [id, r] = s.split(':'); const [a, b] = r.split('-').map(Number); return { id, a, b, n: {} }; });
const sectionOf = (x) => sections.find((s) => x / TS >= s.a && x / TS < s.b);

for (const o of L.spawns.objects) {
  const p = props(o);
  const where = `spawn #${o.id} ${o.type}${p.kind ? ':' + p.kind : ''}${p.item ? ':' + p.item : ''} @(${o.x},${o.y})`;
  if (!o.point) warn(`${where}: spawns should be point objects`);
  if (o.x < 0 || o.x > W * TS || o.y < 0 || o.y > H * TS) err(`${where}: outside the map`);
  const tx = Math.floor(o.x / TS), feet = Math.floor((o.y - 1) / TS), below = Math.floor(o.y / TS);
  let key = o.type;
  switch (o.type) {
    case 'player_start': starts++; break;
    case 'enemy':
      need(o, p, 'kind', ENEMY_KINDS, where); key += ':' + p.kind;
      if (p.facing !== undefined && !FACING.includes(p.facing)) err(`${where}: facing must be left|right`);
      if (p.patrol !== undefined && typeof p.patrol !== 'number') err(`${where}: patrol must be a number (px)`);
      if (p.wave !== undefined) {
        const lk = locks.get(p.lock);
        if (!lk) err(`${where}: wave enemy needs lock= an existing camera_lock id (got ${p.lock})`);
        else { if (p.wave < 1 || p.wave > lk.waves) err(`${where}: wave ${p.wave} outside 1..${lk.waves}`); lk.seen.add(p.wave); }
      }
      break;
    case 'pow': need(o, p, 'item', ITEMS, where); key += ':' + p.item; break;
    case 'pickup': need(o, p, 'kind', PICKUPS, where); key += ':' + p.kind; break;
    case 'boss': need(o, p, 'kind', ['moosezilla'], where); key += ':' + p.kind; break;
    case 'prop': need(o, p, 'kind', PROP_KINDS, where); key += ':' + p.kind;
      if (p.contains !== undefined && !PICKUPS.includes(p.contains)) err(`${where}: contains="${p.contains}" is not a pickup kind`);
      break;
    default: err(`${where}: unknown spawn type "${o.type}"`);
  }
  bump(key);
  const s = sectionOf(o.x); if (s) s.n[o.type] = (s.n[o.type] || 0) + 1;
  // placement sanity: feet must not be inside a solid tile; ground units should stand on something
  const airborne = (o.type === 'enemy' && AIR_KINDS.includes(p.kind)) || o.type === 'boss';
  const isDecor = o.type === 'prop' && p.layer;
  if (!airborne && solidAt(tx, feet)) err(`${where}: feet inside a solid tile (${tx},${feet})`);
  if (!airborne && !isDecor && !p.wave && !p.stacked && !p.float && !standable(tx, below) && !(o.type === 'prop' && ['alarm_light', 'searchlight'].includes(p.kind)))
    warn(`${where}: nothing to stand on at tile (${tx},${below})`);
}
if (starts !== 1) err(`expected exactly 1 player_start, found ${starts}`);
for (const [id, lk] of locks) for (let w = 1; w <= lk.waves; w++) if (!lk.seen.has(w) && id !== 'boss') err(`camera_lock ${id}: wave ${w} has no enemies`);
if (!L.spawns.objects.some((o) => o.type === 'boss')) err('no boss spawn');

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
    case 'ambience': need(o, p, 'fx', ['snow', 'embers', 'fireflies'], where); break;
    default: err(`${where}: unknown trigger type "${o.type}"`);
  }
  bump('trigger:' + o.type);
}
if (!L.triggers.objects.some((o) => o.type === 'stage_end')) err('no stage_end trigger');

// --- summary
const pad = (s, n) => String(s).padEnd(n);
console.log(`map ${path.basename(file)}: ${W}x${H} tiles (${W * TS}x${H * TS} px), tileset ${ts.name} ${ts.imagewidth}x${ts.imageheight}, ${(ts.tiles || []).length} tiles with data, ${animated} animated`);
console.log(`hazard tiles: water ${hazards.water || 0}, spikes ${hazards.spikes || 0}`);
console.log('counts:');
for (const k of Object.keys(count).sort()) console.log(`  ${pad(k, 28)} ${count[k]}`);
console.log('sections (tiles):');
for (const s of sections) console.log(`  ${pad(s.id, 16)} x ${pad(`${s.a}-${s.b}`, 8)} ${Object.entries(s.n).map(([k, v]) => `${k} ${v}`).join(', ')}`);
console.log('camera locks:');
for (const [id, lk] of locks) console.log(`  ${pad(id, 8)} x ${lk.o.x / TS}-${(lk.o.x + lk.o.width) / TS} waves ${lk.waves}`);
console.log('checkpoints: ' + L.triggers.objects.filter((o) => o.type === 'checkpoint').map((o) => `${props(o).id}@${o.x / TS}`).join(', '));
for (const w of warns) console.log('WARN  ' + w);
for (const e of errors) console.log('ERROR ' + e);
console.log(errors.length ? `FAILED: ${errors.length} error(s), ${warns.length} warning(s)` : `OK (${warns.length} warning(s))`);
process.exit(errors.length ? 1 : 0);
