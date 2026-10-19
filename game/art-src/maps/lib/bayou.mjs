// Bayou kit: Mission 2 builders on top of mapkit (tiles from art-src/tiles/m2_bayou_tiles.json, plus m2_boat / m2_mill).
//   const k = mapkit({ W, H, G, tilesets: ['m2_bayou', ...] }); const b = bayou(k);
// Ground surface row G (y 336). Coordinates in tiles; spawns are feet points (bottom-centre).
// Water: deep water = `hazard=water` (the player drowns), shallow = `material=shallow` riverbed at row G (the floor stays at
// y 336; src/level/water.ts draws the wading surface over the legs), mud = `material=mud` ground, sinking logs = `sink=true`
// tiles at row G over deep water (src/level/water.ts swaps their frames using the map property `sink_gids`).
export function bayou(k) {
  const { W, H, G, put, putIfEmpty, mat, empty, tileAt, hash, gidOf } = k;

  /** Peat bank ground from row `top` down. */
  const bank = (x0, x1, top = G) => { k.clear('ground', x0, x1, top, H - 1); mat('ground', x0, x1, top, H - 1, 'bank'); };
  /** Mud flats (slow, short jumps), with the odd animated bubble on the surface. */
  function mud(x0, x1, top = G, bubbles = true) {
    k.clear('ground', x0, x1, top, H - 1);
    mat('ground', x0, x1, top, H - 1, 'mud');
    if (bubbles) for (let x = x0 + 1; x < x1; x++) if (hash(x, top, 61) < 0.18) put('ground', x, top, 'mud_bubble_f0');
  }
  /** Deep water (hazard). */
  const deep = (x0, x1, surf = G) => k.water(x0, x1, surf);
  /**
   * Shallow pool: a one-tile depression. Wading riverbed tiles on row `row + 1` (floor y 352 for row G), bank fill below,
   * a dark far bank in the back layer behind the water, lily pads on the waterline (front layer). The runtime draws the
   * translucent water surface from y 338 over the legs. Jumping out of a pool clears 1 row easily (x0.9 jump).
   */
  function pool(x0, x1, row = G) {
    for (let x = x0; x <= x1; x++) {
      const n = x === x0 ? 'shallow_l' : x === x1 ? 'shallow_r' : hash(x, row, 62) < 0.35 ? 'shallow_m2' : 'shallow_m';
      put('ground', x, row + 1, n);
      k.clear('ground', x, x, row, row);
      if (hash(x, row, 63) < 0.16) putIfEmpty('front', x, row, hash(x, row, 64) < 0.5 ? 'lily_a' : 'lily_b');
    }
    k.backMass(x0, x1, row, row, 'bank');
    mat('ground', x0, x1, row + 2, H - 1, 'bank');
    pools.push([x0, x1, row]);
  }
  const pools = [];
  /** Spawns authored on a pool's rim height drop to its floor (lurkers rise from the water, enemies wade). */
  function fixPoolSpawns() {
    for (const o of k.spawns) for (const [x0, x1, row] of pools) {
      if (o.x >= x0 * 16 && o.x < (x1 + 1) * 16 && o.y === row * 16) o.y = (row + 1) * 16;
    }
  }
  /** Sinking log (2-5 tiles) floating on deep water at row G. */
  function sinkLog(x0, x1) {
    deep(x0, x1);
    for (let x = x0; x <= x1; x++) put('ground', x, G, x === x0 ? 'sinklog_l' : x === x1 ? 'sinklog_r' : 'sinklog_m');
  }
  /** Stable fallen log (one-way) at `row`. */
  function log(x0, x1, row = G) {
    for (let x = x0; x <= x1; x++) put('ground', x, row, x === x0 ? 'log_l' : x === x1 ? 'log_r' : hash(x, row, 65) < 0.4 ? 'log_m2' : 'log_m');
  }
  /** The map property the runtime needs to sink/resurface logs (frames resolved by tile name). */
  function sinkGids() {
    const f = (p) => [`sinklog_${p}`, `sinklog_${p}_bob`, `sinklog_${p}_s1`, `sinklog_${p}_s2`].map(gidOf);
    return JSON.stringify({ l: f('l'), m: f('m'), r: f('r'), water: gidOf('water_top_f0') });
  }

  /** Posts under a deck/walk from row+1 down to the ground or the water line (back layer). */
  function posts(xs, row, base = G) {
    for (const x of xs) {
      put('back', x, row + 1, 'post_top');
      for (let y = row + 2; y < base; y++) put('back', x, y, 'post_mid');
      const g = tileAt('ground', x, base);
      const wet = g && /^(water_|shallow_|sinklog_)/.test(g.name);
      if (row + 1 < base) put('back', x, base - 1, wet ? 'post_wl' : 'post_base');
    }
  }
  /** Boardwalk (one-way) at `row` with posts every `every` tiles. */
  function walk(x0, x1, row, every = 4, broken = []) {
    for (let x = x0; x <= x1; x++) {
      const n = broken.includes(x) ? 'walk_broken' : x === x0 ? 'walk_l' : x === x1 ? 'walk_r' : hash(x, row, 66) < 0.35 ? 'walk_m2' : 'walk_m';
      put('ground', x, row, n);
    }
    const xs = []; for (let x = x0; x <= x1; x += every) xs.push(x); if (xs[xs.length - 1] !== x1) xs.push(x1);
    if (row < G - 1) posts(xs, row);
  }
  /** Rotten dock (one-way) at `row` with handrail posts. */
  function dock(x0, x1, row, every = 3) {
    for (let x = x0; x <= x1; x++) put('ground', x, row, x === x0 ? 'dock_l' : x === x1 ? 'dock_r' : hash(x, row, 67) < 0.4 ? 'dock_m2' : 'dock_m');
    const xs = []; for (let x = x0; x <= x1; x += every) xs.push(x);
    posts(xs, row);
    for (let x = x0; x <= x1; x++) put('back', x, row - 1, (x - x0) % every === 0 ? 'rail_post' : 'rail_m');
  }
  /** Mangrove-root platform (one-way) with hanging roots below; root legs into the water. */
  function roots(x0, x1, row) {
    for (let x = x0; x <= x1; x++) {
      put('ground', x, row, x === x0 ? 'root_l' : x === x1 ? 'root_r' : hash(x, row, 68) < 0.4 ? 'root_m2' : 'root_m');
      if (row + 1 < G) putIfEmpty('back', x, row + 1, hash(x, row, 69) < 0.5 ? 'roots_hang_a' : 'roots_hang_b');
    }
    for (const x of [x0, Math.round((x0 + x1) / 2), x1]) for (let y = row + 2; y < G; y++) putIfEmpty('back', x, y, 'roots_leg');
  }
  /** Climbing limb (one-way) off a cypress trunk. */
  function limb(x0, x1, row) { for (let x = x0; x <= x1; x++) put('ground', x, row, x === x0 ? 'limb_l' : x === x1 ? 'limb_r' : 'limb_m'); }

  /** Rope bridge deck (one-way) at `row` between two decks, with sagging rope rails. */
  const RAIL7 = ['rope_3_5', 'rope_5_7', 'rope_7_8', 'rope_8_8', 'rope_8_7', 'rope_7_5', 'rope_5_3'];
  function ropeBridge(x0, x1, row) {
    for (let x = x0; x <= x1; x++) put('ground', x, row, ['rbridge_a', 'rbridge_b', 'rbridge_c'][Math.floor(hash(x, row, 5) * 3)]);
    const span = x1 - x0 + 1;
    for (let i = 0; i < span; i++) {
      put('back', x0 + i, row - 2, RAIL7[Math.min(6, Math.floor((i + 0.5) / span * 7))]);
      put('back', x0 + i, row - 1, 'rope_hangers');
    }
  }

  /**
   * Stilt shack: deck (one-way) at `deck` from x0..x1, plank walls rows deck-3..deck-1 inset by one tile, tin roof (one-way)
   * at deck-4, stilts from the deck down to the ground/water. opts: { door: x (dark doorway, a shack_door prop goes there),
   * windows: [x...], lit: bool, stilts: [x...] }.
   */
  function shack(x0, x1, deck, opts = {}) {
    const top = deck - 3, w0 = x0 + 1, w1 = x1 - 1, roofRow = deck - 4;
    for (let y = top; y < deck; y++) for (let x = w0; x <= w1; x++) {
      const r = y === top ? 't' : y === deck - 1 ? 'b' : 'm';
      const c = x === w0 ? 'l' : x === w1 ? 'r' : 'm';
      let n = `shack_${r}${c}`;
      if (n === 'shack_mm' && hash(x, y, 70) < 0.4) n = 'shack_mm2';
      put('back', x, y, n);
    }
    for (const wx of opts.windows ?? []) put('back', wx, top + 1, opts.dark?.includes(wx) ? 'shack_win_dark' : opts.boarded?.includes(wx) ? 'shack_win_boarded' : 'shack_win_lit');
    if (opts.door !== undefined) { put('back', opts.door, deck - 2, 'shack_doorway_t'); put('back', opts.door, deck - 1, 'shack_doorway_b'); }
    for (let x = x0; x <= x1; x++) put('ground', x, roofRow, x === x0 ? 'roof_l' : x === x1 ? 'roof_r' : hash(x, roofRow, 71) < 0.35 ? 'roof_m2' : 'roof_m');
    for (let x = x0; x <= x1; x++) put('ground', x, deck, x === x0 ? 'sdeck_l' : x === x1 ? 'sdeck_r' : hash(x, deck, 72) < 0.35 ? 'sdeck_m2' : 'sdeck_m');
    const st = opts.stilts ?? [x0, Math.round((x0 + x1) / 2), x1];
    for (const x of st) {
      for (let y = deck + 1; y < G; y++) put('back', x, y, y === deck + 2 && (x === x0 || x === x1) ? 'stilt_x' : 'stilt_mid');
      if (deck + 1 < G) put('back', x, deck + 1, 'stilt_top');
      const g = tileAt('ground', x, G);
      if (g && /^(water_|shallow_)/.test(g.name) && deck + 1 < G - 1) put('back', x, G - 1, 'stilt_wl');
    }
  }

  /**
   * Giant cypress: 2-wide trunk at x (columns x, x+1) from the top of the map to the buttress flare on `base` (the flare's
   * lower row sits on row base-1), canopy masses at the top on both sides with moss curtains, optional limbs.
   */
  function cypress(x, base = G, { canopyRows = [1, 5], moss = true, v2 = false, flare = true } = {}) {
    const L = v2 ? 'cyp2_l' : 'cyp_l', R = v2 ? 'cyp2_r' : 'cyp_r';
    const flareTop = base - 2;
    for (let y = 0; y < (flare ? flareTop : base); y++) { put('back', x, y, L); put('back', x + 1, y, R); }
    if (flare) for (let r = 0; r < 2; r++) for (let c = 0; c < 4; c++) put('back', x - 1 + c, flareTop + r, `cflare_${r}${c}`);
    // The top canopy spreads to both sides; lower boughs alternate sides. Moss beards hang from each canopy's middle.
    canopyRows.forEach((cy, i) => {
      const dir = i % 2 ? -1 : 1;
      const side = (d) => (d > 0 ? x + 2 : x - 1);
      for (const d of i === 0 ? [dir, -dir] : [dir]) {
        for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) putIfEmpty('back', side(d) + c * d, cy - 1 + r, `canopy_${r}${c}`, d < 0);
        if (moss) for (const c of [1, 2]) {
          const mx = side(d) + c * d, my = cy + 2;
          const len = 2 + Math.floor(hash(mx, my, 73) * 2);
          putIfEmpty('back', mx, my, 'moss_top');
          for (let j = 1; j < len; j++) putIfEmpty('back', mx, my + j, hash(mx, my + j, 74) < 0.5 ? 'moss_mid' : 'moss_mid2');
          putIfEmpty('back', mx, my + len, 'moss_tip');
        }
      }
    });
  }
  /** Moss curtain (back) hanging from row y for len tiles. */
  function mossCurtain(x, y, len) {
    put('back', x, y, 'moss_top');
    for (let j = 1; j < len - 1; j++) put('back', x, y + j, hash(x, y + j, 75) < 0.5 ? 'moss_mid' : 'moss_mid2');
    put('back', x, y + len - 1, 'moss_tip');
  }
  /** Distant cypress silhouette in the bg_far_deco layer. */
  function farCyp(x, top, base = G - 1, v = 1) {
    const p = v === 1 ? 'far_cyp' : 'far_cyp2';
    for (const [dx, s] of [[0, 'l'], [1, 'r']]) {
      putIfEmpty('bg_far_deco', x + dx, top, `${p}_top_${s}`);
      for (let y = top + 1; y < base; y++) putIfEmpty('bg_far_deco', x + dx, y, `${p}_mid_${s}`);
      putIfEmpty('bg_far_deco', x + dx, base, `${p}_base_${s}`);
    }
  }
  function farShack(x, row) {
    putIfEmpty('bg_far_deco', x, row, 'far_shack_tl'); putIfEmpty('bg_far_deco', x + 1, row, 'far_shack_tr');
    putIfEmpty('bg_far_deco', x, row + 1, 'far_shack_bl'); putIfEmpty('bg_far_deco', x + 1, row + 1, 'far_shack_br');
  }

  /**
   * Swamp dressing on exposed bank/mud tops (reeds, knees, ferns, tufts in the back layer row above; sparse front reeds),
   * cypress knees poking out of water, and roots under overhangs. Call after the terrain is laid out, before finish().
   */
  function dress({ x0 = 0, x1 = W - 1, density = 1 } = {}) {
    const g = k.L.ground;
    for (let x = x0; x <= x1; x++) for (let y = 1; y < H; y++) {
      const m = g.mat[k.idx(x, y)];
      const t = g.tile[k.idx(x, y)];
      const above = k.idx(x, y - 1);
      const open = !g.mat[above] && !g.tile[above];
      if (m && open && (m === 'bank' || m === 'mud')) {
        const h = hash(x, y, 81);
        if (!empty('back', x, y - 1)) continue;
        const d = density;
        if (m === 'bank') {
          if (h < 0.1 * d) put('back', x, y - 1, ['reeds_a', 'reeds_b', 'reeds_c'][Math.floor(h / (0.1 * d) * 3)]);
          else if (h < 0.15 * d) put('back', x, y - 1, ['knee_a', 'knee_b', 'knee_c'][Math.floor(hash(x, y, 82) * 3)]);
          else if (h < 0.2 * d) put('back', x, y - 1, hash(x, y, 83) < 0.5 ? 'fern_a' : 'fern_b');
          else if (h < 0.27 * d) put('back', x, y - 1, `btuft_${1 + Math.floor(hash(x, y, 84) * 3)}`);
          else if (h < 0.29 * d) put('back', x, y - 1, hash(x, y, 85) < 0.5 ? 'cattail_a' : 'cattail_b');
          else if (h < 0.3 * d) put('back', x, y - 1, hash(x, y, 86) < 0.5 ? 'mushroom' : 'rock_moss');
        } else {
          if (h < 0.06 * d) put('back', x, y - 1, 'cattail_b');
          else if (h < 0.1 * d) put('back', x, y - 1, 'bones_s');
          else if (h < 0.14 * d) put('back', x, y - 1, 'btuft_3');
        }
        if (hash(x, y, 87) < 0.07 * d) putIfEmpty('front', x, y - 1, hash(x, y, 88) < 0.5 ? 'reeds_front_a' : 'reeds_front_b');
      }
      if (t && t.name.startsWith('water_top') && y === G && hash(x, y, 89) < 0.06 && empty('back', x, y - 1)) put('back', x, y - 1, 'knee_c');
      if (t && /^water_top/.test(t.name) && hash(x, y, 90) < 0.07) putIfEmpty('front', x, y, hash(x, y, 91) < 0.5 ? 'lily_a' : 'lily_b');
    }
  }

  return { fixPoolSpawns, bank, mud, deep, pool, sinkLog, log, sinkGids, posts, walk, dock, roots, limb, ropeBridge, shack, cypress, mossCurtain, farCyp, farShack, dress };
}
