#!/usr/bin/env node
// Writes public/assets/packs/level.m2.json (Mission 2 assets, loaded by Engine when a part of mission 2 starts):
// the three maps, the m2_* tilesets, the Mission 2 props (art-src/props/manifest_m2a.json + manifest_m2b.json), the
// Mission 2 background actors and the runtime strips. Imagegen's gen_* layers are in their own pack (imagegen.m2.json),
// so they're NOT listed here (duplicate keys). Only files that exist are listed (a missing file would be a load error).
//   node art-src/maps/build_pack_m2.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GAME = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PUB = path.join(GAME, 'public');
const exists = (url) => fs.existsSync(path.join(PUB, url));
const files = [];
const missing = [];
const add = (entry, ...urls) => { if (urls.every(exists)) files.push(entry); else missing.push(entry.key); };

for (const m of ['m2p1', 'm2p2', 'm2p3']) add({ type: 'tilemapTiledJSON', key: m, url: `assets/maps/${m}.tmj` }, `assets/maps/${m}.tmj`);
for (const t of ['m2_bayou', 'm2_boat', 'm2_mill']) add({ type: 'image', key: `tiles_${t}`, url: `assets/tiles/${t}.png` }, `assets/tiles/${t}.png`);

const props = [];
for (const f of ['manifest_m2a.json', 'manifest_m2b.json']) {
  const p = path.join(GAME, 'art-src/props', f);
  if (fs.existsSync(p)) props.push(...JSON.parse(fs.readFileSync(p, 'utf8')));
}
for (const e of props) {
  const png = e.png ?? `assets/sprites/props/${e.key}.png`, json = e.json ?? `assets/sprites/props/${e.key}.json`;
  add({ type: 'aseprite', key: e.key, textureURL: png, atlasURL: json }, png, json);
}

const ACTORS = ['bg_heron', 'bg_patrolboat', 'bg_wisp', 'bg_gator_sil', 'bg_shell', 'bg_wake', 'bg_gator_ridge', 'bg_barge_fire', 'bg_skeeter',
  'bg_airboat', 'bg_shack', 'bg_jetty', 'bg_millwheel', 'bg_millwheel_big', 'bg_den_glow', 'bg_gator_wake', 'bg_debris', 'bg_bolt'];
for (const a of ACTORS) add({ type: 'aseprite', key: a, textureURL: `assets/sprites/bg/${a}.png`, atlasURL: `assets/sprites/bg/${a}.json` },
  `assets/sprites/bg/${a}.png`, `assets/sprites/bg/${a}.json`);

const STRIPS = { m2p1: ['wade', 'wade_crest', 'wade_edge', 'haze'], m2p2: ['river_front', 'river_wake', 'fg_speed', 'fg_reeds', 'fg_trunks', 'haze'], m2p3: ['channel', 'channel_glint', 'haze', 'rain_sheet'] };
for (const [m, list] of Object.entries(STRIPS)) for (const n of list) {
  const url = `assets/backgrounds/${m}/${n}.png`;
  add({ type: 'image', key: `${m}_${n}`, url }, url);
}

const out = path.join(PUB, 'assets/packs/level.m2.json');
fs.writeFileSync(out, JSON.stringify({ level_m2: { files } }, null, 2) + '\n');
console.log(`wrote ${path.relative(GAME, out)}: ${files.length} files${missing.length ? `; not yet built: ${missing.join(', ')}` : ''}`);
