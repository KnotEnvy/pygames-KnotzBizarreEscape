#!/usr/bin/env node
// Static reachability check: can a player get from player_start to every arena, checkpoint and the stage_end
// without warps? No browser; reads the TMJ and the player tuning and runs in a second or two.
//
//   node tools/reach-check.mjs --part 1-1|1-2|1-3|all [--verbose] [--json]
//   node tools/reach-check.mjs --part 1-1 --tmj /tmp/wip.tmj   (check another map file as that part)
//   npm --prefix game run audit:reach               (all parts)
//
// Model (mirrors core/physics.ts + the player controller):
//   ground layer tiles: collides && !oneway = solid; oneway = jump-through platform (land on it from above only);
//   hazard=water|spikes = deadly (never stood on, never touched mid-air); crack=true ice counts as normal ground
//   (it holds long enough to cross once); crack=stomp ice too (only the boss cracks it).
//   Player body 12 x 30 (feet at y), run 105 px/s, jump 318 px/s, gravity 900, fall cap 520, jump cut 120 (all from
//   src/config/tuning/player.ts, except the fall cap from the controller). A full jump peaks ~53.5 px (60 Hz steps, as measured in game).
//   Down+jump drops through one-way platforms.
//   Nodes = (column, surface row) a player can stand on with 2 free tiles of headroom. Edges = walking to the next
//   column, and swept-AABB arcs (Arcade's 1/60 s semi-implicit Euler steps) for walk-offs and jumps (full / short / tap) at full, half and zero
//   run speed, from the column centre and from its overhang edge. Arcs that touch a hazard or leave the map die.
//   Ignored: props (crates/barrels/sandbags are shootable; gates open), moving trains and sweeps, camera lock-left,
//   enemies, coyote time (conservative), air turn-arounds.
// Exit 1 if an arena, checkpoint or stage_end is unreachable; POWs/pickups out of reach are listed as warnings.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const T0 = performance.now();
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const PARTS = { '1-1': 'm1p1', '1-2': 'm1p2', '1-3': 'm1p3' };
const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : d; };
const VERBOSE = argv.includes('--verbose');
const TMJ = arg('tmj', null);
const partArg = arg('part', 'all');
const parts = partArg === 'all' ? Object.keys(PARTS) : partArg.split(',');
if (TMJ && parts.length !== 1) { console.error('reach-check: --tmj needs a single --part'); process.exit(2); }
for (const p of parts) if (!PARTS[p]) { console.error(`reach-check: unknown part '${p}' (use 1-1, 1-2, 1-3 or all)`); process.exit(2); }
const watchdog = setTimeout(() => { console.error('reach-check: HARD TIMEOUT (60 s); aborting'); process.exit(3); }, 60000);
watchdog.unref();

// ------------------------------------------------------------------------------------------------ tuning
async function loadTuning() {
    const file = path.join(root, 'src/config/tuning/player.ts');
    let P;
    try { P = (await import(file)).PLAYER; } catch {
        // Older Node without type stripping: read the numbers out of the source.
        const src = fs.readFileSync(file, 'utf8');
        const num = k => Number(new RegExp(`\\b${k}:\\s*([\\d.]+)`).exec(src)?.[1]);
        P = { run: num('run'), jump: num('jump'), gravity: num('gravity'), jumpCut: num('jumpCut'), standing: { width: 12, height: 30 } };
    }
    const ctl = fs.readFileSync(path.join(root, 'src/entities/player/controller.ts'), 'utf8');
    const maxFall = Number(/setMaxVelocityY\((\d+)\)/.exec(ctl)?.[1] ?? 520);
    const t = { run: P.run, jump: P.jump, gravity: P.gravity, jumpCut: P.jumpCut, w: P.standing.width, h: P.standing.height, maxFall };
    for (const [k, v] of Object.entries(t)) if (!Number.isFinite(v) || v <= 0) throw new Error(`player tuning '${k}' unreadable (${v})`);
    // Same integration as Arcade at 60 Hz (measured in game: 53.6 px apex), not the continuous v²/2g (56.2 px).
    let y = 0, vy = -t.jump, top = 0, n = 0;
    do { vy += t.gravity / 60; y += vy / 60; top = Math.min(top, y); n++; } while (y < 0 && n < 600);
    t.apex = -top;
    t.flatReach = t.run * n / 60;
    return t;
}

// ------------------------------------------------------------------------------------------------ map
function loadMap(part) {
    const file = TMJ ? path.resolve(TMJ) : path.join(root, 'public/assets/maps', `${PARTS[part]}.tmj`);
    const m = JSON.parse(fs.readFileSync(file, 'utf8'));
    const props = o => Object.fromEntries((o.properties ?? []).map(p => [p.name, p.value]));
    const tileProps = new Map();
    for (const ts of m.tilesets) for (const t of ts.tiles ?? []) tileProps.set(ts.firstgid + t.id, props(t));
    const ground = m.layers.find(l => l.name === 'ground' && l.type === 'tilelayer');
    if (!ground) throw new Error(`${file}: no ground layer`);
    const W = m.width, H = m.height, TS = m.tilewidth;
    const KIND = { empty: 0, solid: 1, oneway: 2, hazard: 3 };
    const cell = new Uint8Array(W * H);
    const hazardName = new Map();
    for (let i = 0; i < W * H; i++) {
        const gid = ground.data[i] & 0x1fffffff;
        if (!gid) continue;
        const p = tileProps.get(gid) ?? {};
        if (p.hazard === 'water' || p.hazard === 'spikes') { cell[i] = KIND.hazard; hazardName.set(i, p.hazard); }
        else if (p.oneway === true) cell[i] = KIND.oneway;
        else if (p.collides === true) cell[i] = KIND.solid;
    }
    const objects = n => (m.layers.find(l => l.name === n)?.objects ?? []).map(o => ({ type: o.type || o.class, x: o.x, y: o.y, w: o.width, h: o.height, id: o.id, p: props(o) }));
    return { file, W, H, TS, KIND, cell, hazardName, spawns: objects('spawns'), triggers: objects('triggers') };
}

// ------------------------------------------------------------------------------------------------ analysis
function analyse(part, T) {
    const M = loadMap(part);
    const { W, H, TS, KIND, cell } = M;
    const at = (c, r) => (c < 0 || c >= W) ? KIND.solid : (r < 0 || r >= H) ? KIND.empty : cell[r * W + c];
    const isSolid = (c, r) => at(c, r) === KIND.solid;
    const isHazard = (c, r) => at(c, r) === KIND.hazard;
    const isSurface = (c, r) => { const k = at(c, r); return k === KIND.solid || k === KIND.oneway; };
    const hw = T.w / 2, bh = T.h, EPS = 0.001;
    const cols = (x) => [Math.floor((x - hw) / TS), Math.floor((x + hw - EPS) / TS)];
    const rows = (y) => [Math.floor((y - bh) / TS), Math.floor((y - EPS) / TS)];
    function bodyHits(x, y, test) {
        const [c0, c1] = cols(x), [r0, r1] = rows(y);
        for (let c = c0; c <= c1; c++) for (let r = r0; r <= r1; r++) if (test(c, r)) return true;
        return false;
    }
    /** Standable node at (column c, surface row r): surface tile, body above it free of solids and hazards. */
    const standable = (c, r) => isSurface(c, r) && !bodyHits(c * TS + TS / 2, r * TS, (cc, rr) => isSolid(cc, rr) || isHazard(cc, rr));
    const key = (c, r) => r * W + c;

    /** Swept arc from feet (x,y). Returns the landing node key, or null (death / timeout). */
    function arc(x, y, vx, vy, holdS) {
        const dt = 1 / 60; // Arcade's fixed step: velocity first, then position (semi-implicit Euler)
        let t = 0;
        let crossedMinX = x;
        for (let i = 0; i < 240; i++) {
            t += dt;
            if (t > holdS && vy < -T.jumpCut) vy = -T.jumpCut;
            vy = Math.min(vy + T.gravity * dt, T.maxFall);
            const nx = Math.max(hw, Math.min(W * TS - hw, x + vx * dt));
            if (!bodyHits(nx, y, isSolid)) x = nx;
            let ny = y + vy * dt;
            if (vy < 0) {
                if (bodyHits(x, ny, isSolid)) { vy = 0; ny = y; }
            } else {
                // Landing: the feet cross a surface tile top this step (one-way platforms only from above).
                const rPrev = Math.floor((y - EPS) / TS), rNext = Math.floor((ny - EPS) / TS);
                if (rNext > rPrev) {
                    const r = rNext;
                    const [c0, c1] = cols(x);
                    let best = null;
                    for (let c = c0; c <= c1; c++) if (isSurface(c, r) && (!best || Math.abs(c * TS + TS / 2 - x) < Math.abs(best * TS + TS / 2 - x))) best = c;
                    if (best !== null) {
                        const fy = r * TS;
                        if (bodyHits(x, fy, isHazard)) return null;
                        return { node: key(best, r), x, t };
                    }
                }
            }
            y = ny;
            if (bodyHits(x, y, isHazard)) return null;
            if (y - bh > H * TS) return null;
            crossedMinX = Math.min(crossedMinX, x);
        }
        return null;
    }

    const start = M.spawns.find(s => s.type === 'player_start');
    if (!start) throw new Error(`${M.file}: no player_start`);
    // player_start's surface: the first standable surface at or below its feet.
    let sc = Math.floor(start.x / TS), sr = -1;
    for (let r = Math.max(0, Math.floor((start.y - 1) / TS)); r < H; r++) if (standable(sc, r)) { sr = r; break; }
    if (sr < 0) throw new Error(`player_start (${start.x},${start.y}) has no standable ground below it`);

    const seen = new Uint8Array(W * H);
    const queue = [key(sc, sr)];
    seen[queue[0]] = 1;
    const edgesOut = new Map();
    const HOLDS = [10, 0.18, 0];
    const SPEEDS = [1, 0.5, 0];
    while (queue.length) {
        const k = queue.shift();
        const c = k % W, r = (k - c) / W;
        const fy = r * TS;
        const add = n => { if (n !== null && n !== undefined && !seen[n]) { seen[n] = 1; queue.push(n); } };
        // Down+jump on a one-way platform drops through it (ENGINE.oneWay.dropMs): fall from just under its top.
        if (at(c, r) === KIND.oneway) {
            for (const s of [0, 1, -1]) for (const x0 of [c * TS + TS / 2]) { const a = arc(x0, fy + 1, s * T.run, 0, 0); if (a) add(a.node); }
        }
        for (const d of [-1, 1]) {
            // Walk to the next column on the same surface row.
            const nc = c + d;
            if (standable(nc, r)) add(key(nc, r));
            // Start points: the column centre and the overhang edge (last px still supported) in direction d.
            const edgeX = d > 0 ? (c + 1) * TS + hw - 1 : c * TS - hw + 1;
            const xs = [c * TS + TS / 2, edgeX];
            for (const x0 of xs) {
                if (bodyHits(x0, fy, isSolid)) continue;
                // Walk off the edge.
                if (x0 === edgeX && !isSurface(nc, r)) { const a = arc(x0 + d, fy, d * T.run, 0, 0); if (a) add(a.node); }
                for (const s of SPEEDS) for (const hold of HOLDS) {
                    const a = arc(x0, fy, d * s * T.run, -T.jump, hold);
                    if (a) add(a.node);
                }
            }
        }
    }

    // ---- targets
    const reachableIn = (x0, x1) => {
        for (let c = Math.max(0, Math.floor(x0 / TS)); c <= Math.min(W - 1, Math.floor((x1 - EPS) / TS)); c++)
            for (let r = 0; r < H; r++) if (seen[key(c, r)]) return true;
        return false;
    };
    const maxReachX = (beforeX) => {
        let best = null;
        for (let c = 0; c < W && c * TS < beforeX; c++) for (let r = 0; r < H; r++) if (seen[key(c, r)]) best = { c, r };
        return best;
    };
    /** Why can't the player get further right than node (c, r)? */
    function describeBlock(c, r) {
        const x = (c + 1) * TS, fy = r * TS;
        // Wall: solid in the body rows of the next column.
        const nc = c + 1;
        let wallTop = null;
        for (let rr = r - 1; rr >= 0 && isSolid(nc, rr); rr--) wallTop = rr;
        if (wallTop !== null) {
            const hgt = (r - wallTop) * TS;
            const capped = wallTop === 0 ? ' (to the top of the map)' : '';
            return { kind: 'wall', x, y: fy, heightPx: hgt, text: `${hgt} px wall at x=${x}${capped}, standing at y=${fy}; a full jump clears ${Math.floor(T.apex)} px, no step within reach` };
        }
        // Low ceiling: the next column has a surface but no headroom.
        if (isSurface(nc, r) && !standable(nc, r)) return { kind: 'low-ceiling', x, y: fy, text: `headroom under 2 tiles at x=${x}, y=${fy} (player body is ${T.h} px tall)` };
        // Gap or hazard: next standable surface to the right (any row within 6 rows up / 12 down).
        for (let cc = nc; cc < Math.min(W, nc + 40); cc++) {
            for (let rr = Math.max(0, r - 6); rr < Math.min(H, r + 12); rr++) {
                if (!standable(cc, rr)) continue;
                const gap = (cc - nc) * TS, dy = (r - rr) * TS;
                const haz = [];
                for (let hc = nc; hc < cc; hc++) for (let hr = r; hr < H; hr++) if (isHazard(hc, hr)) { haz.push(M.hazardName.get(hr * W + hc)); break; }
                const what = haz.length ? `${[...new Set(haz)].join('/')} gap` : 'gap';
                return { kind: 'gap', x, y: fy, gapPx: gap, riseP: dy, text: `${gap} px ${what} from x=${x} to x=${cc * TS} (landing ${dy >= 0 ? dy + ' px higher' : -dy + ' px lower'}); jump reach on the flat is ~${Math.round(T.flatReach)} px, apex ${Math.floor(T.apex)} px` };
            }
        }
        return { kind: 'unknown', x, y: fy, text: `no standable ground within 40 tiles right of x=${x}, y=${fy}` };
    }

    const targets = [];
    for (const t of M.triggers) {
        if (t.type === 'camera_lock') targets.push({ what: `arena ${t.p.id}`, x0: t.x, x1: t.x + t.w, hard: true });
        else if (t.type === 'checkpoint') targets.push({ what: `checkpoint ${t.p.id}`, x0: t.x, x1: t.x + t.w, hard: true });
        else if (t.type === 'stage_end') targets.push({ what: 'stage_end', x0: t.x, x1: t.x + t.w, hard: true });
    }
    for (const s of M.spawns) if (s.type === 'pow' || s.type === 'pickup') targets.push({ what: `${s.type} ${s.p.kind ?? s.p.item ?? ''}#${s.id}`.trim(), x0: s.x - 8, x1: s.x + 8, hard: false, y: s.y, point: true });
    targets.sort((a, b) => a.x0 - b.x0);

    // POWs / pickups: reachable if a reachable node stands within a jump of them (feet within 3 tiles below, 2 above).
    const nearPoint = (x, y) => {
        const c0 = Math.floor((x - 24) / TS), c1 = Math.floor((x + 24) / TS);
        for (let c = Math.max(0, c0); c <= Math.min(W - 1, c1); c++)
            for (let r = Math.max(0, Math.floor(y / TS) - 2); r <= Math.min(H - 1, Math.floor(y / TS) + 4); r++) if (seen[key(c, r)]) return true;
        return false;
    };

    const fails = [], warns = [], ok = [];
    for (const t of targets) {
        const reached = t.point ? nearPoint((t.x0 + t.x1) / 2, t.y) : reachableIn(t.x0, t.x1);
        if (reached) { ok.push(t.what); continue; }
        const last = maxReachX(t.x0);
        const block = last ? describeBlock(last.c, last.r) : { text: 'nothing reachable before it' };
        const entry = { part, target: t.what, x: t.x0, ...(t.y !== undefined ? { y: t.y } : {}), lastReach: last ? { x: last.c * TS + TS / 2, y: last.r * TS } : null, blocked: block };
        (t.hard ? fails : warns).push(entry);
    }
    let nodes = 0, reached = 0;
    for (let c = 0; c < W; c++) for (let r = 0; r < H; r++) if (standable(c, r)) { nodes++; if (seen[key(c, r)]) reached++; }
    // Standable ledges nobody can reach (info for Levels: decor tops, or a platform that was meant to be used).
    const unreached = [];
    for (let r = 0; r < H; r++) {
        let run = null;
        for (let c = 0; c <= W; c++) {
            const u = c < W && standable(c, r) && !seen[key(c, r)];
            if (u && !run) run = { x0: c * TS, y: r * TS };
            if (!u && run) { run.x1 = c * TS; unreached.push(run); run = null; }
        }
    }
    unreached.sort((a, b) => a.x0 - b.x0);
    const far = maxReachX(Infinity);
    return { part, map: PARTS[part], ok: fails.length === 0, start: { x: start.x, y: start.y }, nodes, reached, farthestX: far ? far.c * TS + TS / 2 : null, mapWidthPx: W * TS, targets: ok.length + fails.length + warns.length, okTargets: ok, fails, warns, unreached };
}

// ------------------------------------------------------------------------------------------------ main
let code = 0;
const T = await loadTuning();
console.log(`reach-check: run ${T.run} px/s, jump ${T.jump}, gravity ${T.gravity} → apex ${T.apex.toFixed(1)} px, flat jump ${Math.round(T.flatReach)} px; body ${T.w}x${T.h}`);
const results = [];
for (const part of parts) {
    const t0 = performance.now();
    let r;
    try { r = analyse(part, T); }
    catch (e) { r = { part, ok: false, fails: [{ part, target: 'map', blocked: { text: e.message } }], warns: [] }; }
    r.ms = Math.round(performance.now() - t0);
    results.push(r);
    if (!r.ok) code = 1;
    console.log(`\nPART ${part} (${r.map ?? '?'})  ${r.ok ? 'PASS' : 'FAIL'}  ${r.ms} ms  standable ${r.reached ?? '?'}/${r.nodes ?? '?'} reached, farthest x=${r.farthestX ?? '?'} of ${r.mapWidthPx ?? '?'}; ${r.targets ?? 0} targets`);
    if (VERBOSE && r.okTargets) console.log(`  reached: ${r.okTargets.join(', ')}`);
    if (VERBOSE && r.unreached?.length) console.log(`  unreachable ledges (info): ${r.unreached.map(u => `x ${u.x0}-${u.x1} y ${u.y}`).join('; ')}`);
    for (const f of r.fails) console.log(`  FAIL ${f.target} (x=${f.x}): ${f.blocked.text}`);
    for (const w of r.warns) console.log(`  warn ${w.target} (x=${w.x}, y=${w.y}) out of reach: ${w.blocked.text}`);
}
const ART = path.join(root, 'tests/artifacts');
fs.mkdirSync(ART, { recursive: true });
if (!TMJ) for (const r of results) fs.writeFileSync(path.join(ART, `reach-check-${r.part}.json`), JSON.stringify(r, null, 2));
console.log(`\nreach-check: ${results.map(r => `${r.part} ${r.ok ? 'PASS' : 'FAIL'}`).join(', ')} in ${Math.round(performance.now() - T0)} ms`);
process.exit(code);
