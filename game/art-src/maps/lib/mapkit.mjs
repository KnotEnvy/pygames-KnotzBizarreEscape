// Map kit: the small level DSL shared by every Mission map generator (art-src/maps/build_<map>.mjs).
//   const k = mapkit({ W, H, G, tilesets: ['stage1', 'm1_train'] });
// Tile ids always come from the tileset manifests (art-src/tiles/<name>_tiles.json), never by hand.
// Tile names resolve in tileset order; prefix `<tileset>:` to pick one explicitly (e.g. 'm1_train:stake_top').
// Coordinates are in TILES unless a name says px. Spawn points are bottom-center (feet) in px.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const ROOT = path.resolve(HERE, '../../..');
export const TS = 16;
const FLIP_X = 0x80000000;

export function hash(x, y, s = 0) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function mapkit({ W, H, G, tilesets = ['stage1'] }) {
  // ---------------------------------------------------------------------------------------------- tilesets
  const sets = [];
  let firstgid = 1;
  for (const name of tilesets) {
    const man = JSON.parse(fs.readFileSync(path.join(ROOT, `art-src/tiles/${name}_tiles.json`), 'utf8'));
    const byName = Object.fromEntries(man.tiles.map((t) => [t.name, t]));
    sets.push({ name, man, byName, firstgid });
    firstgid += man.columns * man.rows;
  }
  /** name or 'set:name' -> { set, t } */
  const resolve = (full) => {
    const i = full.indexOf(':');
    if (i > 0) {
      const s = sets.find((q) => q.name === full.slice(0, i));
      const t = s && s.byName[full.slice(i + 1)];
      return t ? { set: s, t } : null;
    }
    for (const s of sets) if (s.byName[full]) return { set: s, t: s.byName[full] };
    return null;
  };
  const propsOf = (t) => (t.props && !Array.isArray(t.props) ? t.props : {});
  const tileProps = (full) => { const r = resolve(full); return r ? propsOf(r.t) : {}; };
  /** Global tile id (Tiled gid) of a tile name in this map. */
  const gidOf = (full) => { const r = resolve(full); if (!r) throw new Error(`unknown tile ${full}`); return r.set.firstgid + r.t.id; };

  // ---------------------------------------------------------------------------------------------- layers
  class Layer { constructor(name) { this.name = name; this.mat = new Array(W * H).fill(null); this.tile = new Array(W * H).fill(null); } }
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
    if (!resolve(name)) throw new Error(`unknown tile ${name}`);
    if (!inb(x, y)) return;
    L[layer].tile[idx(x, y)] = { name, flip };
  }
  const empty = (layer, x, y) => inb(x, y) && !L[layer].mat[idx(x, y)] && !L[layer].tile[idx(x, y)];
  function putIfEmpty(layer, x, y, name, flip = false) { if (empty(layer, x, y)) put(layer, x, y, name, flip); }
  const tileAt = (layer, x, y) => (inb(x, y) ? L[layer].tile[idx(x, y)] : null);

  // ---------------------------------------------------------------------------------------------- building blocks
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
  /** A run of l/m/r tiles: `pre` + _l / _m (with optional variants) / _r. variants = ['_m2', ...] */
  function run(layer, x0, x1, y, pre, variants = [], seed = 0, single = null) {
    for (let x = x0; x <= x1; x++) {
      let n = `${pre}_m`;
      if (x0 === x1 && single) n = single;
      else if (x === x0) n = `${pre}_l`;
      else if (x === x1) n = `${pre}_r`;
      else if (variants.length) {
        const h = hash(x, y, 40 + seed);
        const k = Math.floor(h * (variants.length + 2)) - 2; // ~half plain
        if (k >= 0) n = `${pre}${variants[k]}`;
      }
      put(layer, x, y, n);
    }
  }
  function branch(x, y, len, dir) {
    for (let i = 0; i < len; i++) {
      const n = i === 0 ? 'branch_l' : i === len - 1 ? 'branch_r' : 'branch_m';
      put('ground', x + i * dir, y, n, dir < 0);
    }
  }
  function tier(x, y, n, dir) {
    for (let r = 0; r < 3; r++) for (let c = 0; c < n; c++) put('back', x + c * dir, y - 1 + r, `tier${n}_${r}${c}`, dir < 0);
  }
  /** giant 2-wide pine trunk from the top of the map down to the ground (base on row groundTop-1) */
  function bigTree(x, groundTop, branches = [], seed = 0, boughs = []) {
    for (let y = 0; y < groundTop - 1; y++) { put('back', x, y, 'trunk_l'); put('back', x + 1, y, 'trunk_r'); }
    put('back', x, groundTop - 1, 'trunk_base_l'); put('back', x + 1, groundTop - 1, 'trunk_base_r');
    for (const b of branches) {
      const n = Math.max(3, Math.min(4, b.len));
      if (b.dir > 0) { branch(x + 2, b.y, b.len, 1); tier(x + 2, b.y, n, 1); }
      else { branch(x - 1, b.y, b.len, -1); tier(x - 1, b.y, n, -1); }
    }
    if (branches.length) { tier(x + 2, 2, 4, 1); tier(x - 1, 2, 4, -1); tier(x + 2, 5, 3, 1); tier(x - 1, 4, 3, -1); }
    else {
      tier(x + 2, 3 + (seed % 2), 3, 1); tier(x - 1, 2 + ((seed + 1) % 2), 3, -1);
      // Lower boughs, alternating sides and widening downwards, so the trunk reads as a pine from the resting camera.
      // The lowest stays 6 rows above the ground: the combat lane in front of the trunk stays clear.
      const s = seed % 2 ? 1 : -1;
      const at = (d) => (d > 0 ? x + 2 : x - 1);
      tier(at(s), 8, 3, s); tier(at(-s), 11, 4, -s); tier(at(s), Math.min(14, groundTop - 6), 4, s);
    }
    for (const b of boughs) tier(b.dir > 0 ? x + 2 : x - 1, b.y, b.n, b.dir);
  }
  function trunk(x, groundTop) { bigTree(x, groundTop, [], x); }
  /** irregular background hill/cliff silhouette in the back layer */
  function hills(x0, x1, lo, hi, m, seed, bottom = G - 1) {
    let h = Math.round((lo + hi) / 2), run = 0;
    for (let x = x0; x <= x1; x++) {
      if (run-- <= 0) {
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
        const r = RAIL7[Math.min(6, Math.floor((k + 0.5) / span * 7))];
        put('back', a + 1 + k, deck - 2, r); put('back', a + 1 + k, deck - 1, 'rope_hangers');
      }
    }
  }
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

  // ---------------------------------------------------------------------------------------------- objects
  const spawns = [], triggers = [];
  const px = (t) => t * TS;
  function sp(type, tx, row, props = {}, name = '') { spawns.push({ type, name, x: px(tx) + 8, y: px(row), props }); }
  function spPx(type, x, y, props = {}, name = '') { spawns.push({ type, name, x, y, props }); }
  function tr(type, tx0, tx1, ty0, ty1, props = {}, name = '') {
    triggers.push({ type, name, x: px(tx0), y: px(ty0), w: px(tx1 - tx0 + 1), h: px(ty1 - ty0 + 1), props });
  }
  const enemy = (kind, tx, row, p = {}) => sp('enemy', tx, row, { kind, facing: 'left', ...p });
  const prop = (kind, tx, row, p = {}) => sp('prop', tx, row, { kind, ...p });
  const pow = (item, tx, row, p = {}) => sp('pow', tx, row, { item, ...p });
  const pickup = (kind, tx, row, p = {}) => sp('pickup', tx, row, { kind, ...p });

  // ---------------------------------------------------------------------------------------------- autotile + decoration
  function solid(layer, x, y, fg) {
    if (x < 0 || x >= W || y >= H) return true;
    if (y < 0) return false;
    const i = idx(x, y);
    if (L[layer].mat[i]) return true;
    if (fg) { const t = L[layer].tile[i]; if (t) { const p = tileProps(t.name); return !!p.collides && !p.oneway; } }
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
          const earthy = m === 'ground' || m === 'rock' || m === 'bank' || m === 'mud'; // Mission 2 swamp banks and mud
          const plain = earthy ? (bg ? 0.6 : 0.25) : 0.6;
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
  /** snowy tufts/rocks/drifts on exposed ground tops, icicles & roots under overhangs */
  function decorate({ x0 = 0, x1 = W - 1 } = {}) {
    const g = L.ground;
    for (let y = 1; y < H; y++) for (let x = x0; x <= x1; x++) {
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
    for (let y = 0; y < H - 1; y++) for (let x = x0; x <= x1; x++) {
      const t = g.tile[idx(x, y)];
      if (t && /^(bridge_|plank_)/.test(t.name) && hash(x, y, 23) < 0.25 && empty('ground', x, y + 1)) putIfEmpty('front', x, y + 1, 'icicles_a');
    }
  }
  function finish() {
    autotile('ground', false);
    autotile('back', true);
    autotile('bg_far_deco', true);
  }

  // ---------------------------------------------------------------------------------------------- TMX writer
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
  function gid(cell) {
    if (!cell) return 0;
    const r = resolve(cell.name);
    return ((r.set.firstgid + r.t.id) | (cell.flip ? FLIP_X : 0)) >>> 0;
  }
  /** Write art-src/maps/<key>.tmx. mapProps = { name, music, parallax, sections, drift?, ... } */
  function write(key, mapProps, { background = '#6aa2dc' } = {}) {
    let out = '';
    out += '<?xml version="1.0" encoding="UTF-8"?>\n';
    out += `<map version="1.10" tiledversion="1.12.2" orientation="orthogonal" renderorder="right-down" width="${W}" height="${H}" tilewidth="${TS}" tileheight="${TS}" infinite="0" backgroundcolor="${background}" nextlayerid="7" nextobjectid="${spawns.length + triggers.length + 1}">\n`;
    out += propXml(mapProps, ' ');
    for (const s of sets) {
      const { man } = s;
      const tilecount = man.columns * man.rows;
      out += ` <tileset firstgid="${s.firstgid}" name="${s.name}" tilewidth="${TS}" tileheight="${TS}" tilecount="${tilecount}" columns="${man.columns}">\n`;
      out += `  <image source="../../public/assets/tiles/${man.image || s.name + '.png'}" width="${man.columns * TS}" height="${man.rows * TS}"/>\n`;
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
    }
    LAYERS.forEach((name, li) => {
      const rows = [];
      for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(gid(L[name].tile[idx(x, y)])); rows.push(r.join(',')); }
      out += ` <layer id="${li + 1}" name="${name}" width="${W}" height="${H}">\n  <data encoding="csv">\n${rows.join(',\n')}\n</data>\n </layer>\n`;
    });
    let oid = 1;
    const objXml = (o, rect) => {
      let s = `  <object id="${oid++}"${o.name ? ` name="${esc(o.name)}"` : ''} type="${esc(o.type)}" x="${o.x}" y="${o.y}"${rect ? ` width="${o.w}" height="${o.h}"` : ''}>\n`;
      s += propXml(o.props, '   ');
      if (!rect) s += '   <point/>\n';
      return s + '  </object>\n';
    };
    out += ' <objectgroup id="5" name="spawns">\n' + spawns.map((o) => objXml(o, false)).join('') + ' </objectgroup>\n';
    out += ' <objectgroup id="6" name="triggers">\n' + triggers.map((o) => objXml(o, true)).join('') + ' </objectgroup>\n';
    out += '</map>\n';
    const file = path.join(ROOT, `art-src/maps/${key}.tmx`);
    fs.writeFileSync(file, out);
    console.log(`wrote ${key}.tmx: ${W}x${H}, ${spawns.length} spawns, ${triggers.length} triggers, tilesets ${sets.map((s) => s.name).join('+')}`);
  }

  return {
    W, H, G, TS, L, sets, resolve, tileProps, gidOf, inb, idx, hash,
    mat, clear, put, putIfEmpty, empty, tileAt, ground, backMass, platform, run, branch, tier, bigTree, trunk, hills, fence,
    palisade, sandbags, water, ropeBridge, facade, farPine,
    spawns, triggers, px, sp, spPx, tr, enemy, prop, pow, pickup,
    solid, autotile, decorate, finish, write,
  };
}
