#!/usr/bin/env node
/**
 * check-phaser4: static guard against Phaser 3-era / hallucinated API usage in a Phaser 4.2.1 codebase.
 *
 *   node tools/check-phaser4.mjs [--root <dir>] [--dts <phaser.d.ts>] [--json] [--strict] [--list-rules]
 *
 *   --root <dir>   directory scanned recursively for *.ts/*.tsx (default: <game>/src)
 *   --dts <file>   phaser.d.ts used to verify Phaser.X.Y chains (default: <game>/node_modules/phaser/types/phaser.d.ts)
 *   --json         machine-readable output
 *   --strict       treat warnings as failures too
 *   --list-rules   print the rule table and exit
 *
 * Suppress a finding with a trailing comment on the same line:   // phaser4-ok: <reason>
 * Exit codes: 0 clean (warnings allowed), 1 violations, 2 usage/internal error.
 * No dependencies. See docs/teams/rules.md.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GAME_DIR = path.resolve(HERE, '..');

// ---------------------------------------------------------------- CLI
const argv = process.argv.slice(2);
const opts = { root: path.join(GAME_DIR, 'src'), dts: path.join(GAME_DIR, 'node_modules/phaser/types/phaser.d.ts'), json: false, strict: false, list: false };
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--root') opts.root = path.resolve(argv[++i] ?? '');
  else if (a.startsWith('--root=')) opts.root = path.resolve(a.slice(7));
  else if (a === '--dts') opts.dts = path.resolve(argv[++i] ?? '');
  else if (a.startsWith('--dts=')) opts.dts = path.resolve(a.slice(6));
  else if (a === '--json') opts.json = true;
  else if (a === '--strict') opts.strict = true;
  else if (a === '--list-rules') opts.list = true;
  else if (a === '-h' || a === '--help') { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0].replace(/^\/\*\*|^ \* ?/gm, '').trim()); process.exit(0); }
  else { console.error(`check-phaser4: unknown argument ${a}`); process.exit(2); }
}

// ---------------------------------------------------------------- rules
// Each text rule: regex run against comment/string-blanked code. severity 'error' fails the build, 'warn' reports only.
const E = 'error', W = 'warn';
/** @type {{id:string, severity:string, re:RegExp, message:string, fix:string}[]} */
const TEXT_RULES = [
  { id: 'fx-prefx-postfx', severity: E, re: /\.(preFX|postFX)\b/g, message: 'preFX/postFX were removed in Phaser 4', fix: 'obj.enableFilters(); obj.filters.internal|external.addGlow/addBlur/...  (camera: camera.filters.internal|external)' },
  { id: 'fx-removed-add', severity: E, re: /\.(addBloom|addShine|addGradient|addReveal)\s*\(/g, message: 'v3 FX method no longer exists', fix: 'bloom: Phaser.Actions.AddEffectBloom(items, cfg); shine: Phaser.Actions.AddEffectShine; gradient: Gradient game object; circle: Actions.AddMaskShape / addVignette' },
  { id: 'pipeline-api', severity: E, re: /\.(setPipeline|resetPipeline|setPipelineData|getPipelineName|initPipeline|setPostPipeline|resetPostPipeline|initPostPipeline|getPostPipeline|hasPostPipeline|removePostPipeline|setPostPipelineData)\s*\(/g, message: 'WebGL pipelines were replaced by RenderNodes/Filters', fix: 'use Filters (enableFilters + filters.*), setLighting(true) for Light2D; custom shaders via Shader/ShaderQuadConfig' },
  { id: 'pipeline-class', severity: E, re: /\b(PostFXPipeline|PreFXPipeline|WebGLPipeline|MultiPipeline|SinglePipeline|LightPipeline|MobilePipeline|RopePipeline|UtilityPipeline|BitmapMaskPipeline|FXPipeline|PipelineManager)\b|\brenderer\.pipelines\b/g, message: 'pipeline classes/manager do not exist in Phaser 4', fix: 'RenderNodes / Filters' },
  { id: 'mask-removed', severity: E, re: /\b(BitmapMask|GeometryMask)\b|\.(createBitmapMask|createGeometryMask|setBitmapMask|setMask|clearMask)\s*\(/g, message: 'setMask/BitmapMask are gone; GeometryMask is Canvas-only', fix: 'obj.enableFilters(); obj.filters.internal.addMask(maskObjectOrTextureKey)  (or Actions.AddMaskShape)' },
  { id: 'tint-fill', severity: E, re: /\.(setTintFill)\s*\(|\.tintFill\b/g, message: 'setTintFill() is removed in Phaser 4: it only console.errors and sets nothing (compiles fine, no flash)', fix: 'sprite.setTint(c).setTintMode(Phaser.TintModes.FILL); reset with clearTint()/setTintMode(Phaser.TintModes.MULTIPLY)' },
  { id: 'textures-generate', severity: E, re: /\btextures\s*\.\s*generate\s*\(/g, message: 'TextureManager.generate / Create.GenerateTexture were removed', fix: 'draw with a Graphics object + graphics.generateTexture(key, w, h), or ship a PNG' },
  { id: 'canvas-renderer', severity: E, re: /\bPhaser\.CANVAS\b/g, message: 'Canvas renderer is deprecated; none of our filters/lighting work on it', fix: 'type: Phaser.WEBGL' },
  { id: 'create-emitter', severity: E, re: /\.createEmitter\s*\(/g, message: 'particles.createEmitter() is v3.55-: it only logs a warning in v4', fix: 'const em = this.add.particles(x, y, texture, config)  (the returned object IS the emitter)' },
  { id: 'tilemap-v3-layers', severity: E, re: /\.(createStaticLayer|createDynamicLayer|createBlankDynamicLayer)\s*\(/g, message: 'removed in Phaser 3.50', fix: 'map.createLayer(layerIdOrName, tileset, x, y)' },
  { id: 'mesh-plane-factory', severity: E, re: /\.add\s*\.\s*(?:mesh|plane)\s*\(/g, message: 'add.mesh / add.plane were removed in Phaser 4', fix: 'Sprite / TileSprite; add.mesh2d(x, y, texture, vertices, indices) exists if you truly need a mesh' },
  { id: 'spine-plugin', severity: E, re: /\.(?:add|load)\s*\.\s*spine\s*\(/g, message: 'bundled Spine plugin removed', fix: 'we use Aseprite sprites; or the official Esoteric plugin (ask Lead)' },
  { id: 'raw-gl', severity: E, re: /\brenderer\.gl\b|\b(?:this\.)?gl\.(?:bind\w*|use\w*|draw\w*|enable|disable|viewport|uniform\w*|clear\w*|blend\w*|scissor|pixelStorei|tex\w*|buffer\w*|attrib\w*|vertexAttrib\w*|create(?:Program|Shader|Buffer|Texture|Framebuffer))\s*\(/g, message: 'direct gl.* calls corrupt Phaser 4\'s cached WebGL state', fix: 'use an Extern game object if raw GL is truly needed' },
  { id: 'math-tau-half', severity: W, re: /\.TAU\s*(?:\/\s*2\b|\*\s*0?\.5\b)|\.TAU\s*\/\s*4\b/g, message: 'Math.TAU is 2π in v4 (was π/2 in v3)', fix: 'Phaser.Math.PI_OVER_2 for π/2' },
  { id: 'camera-matrix', severity: W, re: /\b(?:cam|camera|cameras\.main|cameras\.\w+)\.matrix\b(?!External|Combined)/g, message: 'Camera#matrix includes scroll in v4; hand-rolled world↔screen math breaks', fix: 'camera.getWorldPoint(x, y), pointer.worldX/worldY' },
  { id: 'shader-ctor', severity: W, re: /\.add\s*\.\s*shader\s*\(/g, message: 'add.shader signature changed in v4 (ShaderQuadConfig object, no auto Shadertoy uniforms)', fix: 'verify against phaser.d.ts: Phaser.Types.GameObjects.Shader.* / ShaderQuadConfig' },
  { id: 'hallucinated-method', severity: E, re: /\.(setDeadZone|setFollow|startFollowing|shakeCamera|cameraShake|setVelocityXY|setMaxSpeedX|setGravityScale|isOnFloor|isOnGround|onGround|setHitStop|addEmitter|loadAseprite|createFromAsepriteTags|addParticles|setOneWay|setCollideUp|setCollisionTiles|setLight2D|setLightEnabled|setPostFX|stopAnimation|setAnimation|tilemapJSON)\s*\(/g, message: 'method does not exist in Phaser 4.2.1 (commonly hallucinated)', fix: 'see "Verified API cheatsheet" in docs/PHASER4-RULES.md (e.g. setDeadzone, startFollow, camera.shake, body.blocked.down/onFloor(), load.aseprite + anims.createFromAseprite, load.tilemapTiledJSON)' },
];

/** Namespace/chain rules for `Phaser.A.B.C` references (prefix match on segment boundary). */
const CHAIN_RULES = [
  { prefix: 'Geom.Point', id: 'geom-point', severity: E, message: 'Phaser.Geom.Point was removed', fix: 'Phaser.Math.Vector2' },
  { prefix: 'Structs.Set', id: 'structs-set', severity: E, message: 'Phaser.Structs.Set was removed', fix: 'native Set' },
  { prefix: 'Structs.Map', id: 'structs-map', severity: W, message: 'Phaser.Structs.Map is legacy (still declared in 4.2.1, but the migration guide says to use native Map)', fix: 'native Map' },
  { prefix: 'Math.PI2', id: 'math-pi2', severity: E, message: 'Math.PI2 was removed', fix: 'Phaser.Math.TAU (now 2π); π/2 is Phaser.Math.PI_OVER_2' },
  { prefix: 'GameObjects.Mesh', id: 'mesh-plane', severity: E, message: 'Mesh was removed in Phaser 4 (only Mesh2D exists)', fix: 'GameObjects.Mesh2D if you really need it; prefer Sprite/Rope' },
  { prefix: 'GameObjects.Plane', id: 'mesh-plane', severity: E, message: 'Plane was removed in Phaser 4', fix: 'TileSprite / Sprite' },
  { prefix: 'Display.Masks.BitmapMask', id: 'mask-removed', severity: E, message: 'BitmapMask was removed', fix: 'filters.internal.addMask(...)' },
  { prefix: 'Display.Masks.GeometryMask', id: 'mask-removed', severity: E, message: 'GeometryMask works in Canvas only', fix: 'filters.internal.addMask(...)' },
  { prefix: 'Create', id: 'create-removed', severity: E, message: 'Phaser.Create (GenerateTexture / palettes) was removed', fix: 'Graphics#generateTexture or PNG assets' },
  { prefix: 'Renderer.WebGL.Pipelines', id: 'pipeline-class', severity: E, message: 'pipelines were removed', fix: 'RenderNodes / Filters' },
  { prefix: 'CANVAS', id: 'canvas-renderer', severity: E, message: 'Canvas renderer is deprecated', fix: 'Phaser.WEBGL', textRuleCovers: true },
];

// ---------------------------------------------------------------- d.ts index
/** Build { name -> node } tree of namespaces/classes/enums/functions/vars declared under `Phaser`. */
function buildIndex(dtsPath) {
  const text = fs.readFileSync(dtsPath, 'utf8');
  const root = { name: 'Phaser', ns: true, term: false, kids: new Map() };
  const declRe = /^(\s*)(?:export\s+)?(?:declare\s+)?(?:abstract\s+)?(namespace|class|interface|enum|function|var|const|let|type)\s+([A-Za-z_$][\w$.]*)/;
  const stack = []; // {indent,node}
  let inPhaser = false;
  for (const line of text.split('\n')) {
    if (line.length < 5) continue;
    const c0 = line.trimStart()[0];
    if (c0 === '*' || c0 === '/' || c0 === '}' || c0 === '@') continue;
    const m = declRe.exec(line);
    if (!m) continue;
    const indent = m[1].length, kind = m[2], names = m[3].split('.');
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop();
    if (indent === 0) {
      inPhaser = kind === 'namespace' && names[0] === 'Phaser';
      if (!inPhaser) continue;
      let node = root;
      for (const n of names.slice(1)) node = child(node, n, true);
      stack.push({ indent, node });
      continue;
    }
    if (!inPhaser || !stack.length) continue;
    let node = stack[stack.length - 1].node;
    const isNs = kind === 'namespace';
    for (let i = 0; i < names.length; i++) node = child(node, names[i], isNs || i < names.length - 1);
    if (!isNs) node.term = true;
    stack.push({ indent, node });
  }
  return root;
}
function child(parent, name, ns) {
  let n = parent.kids.get(name);
  if (!n) { n = { name, ns, term: !ns, kids: new Map() }; parent.kids.set(name, n); }
  else if (ns) n.ns = true;
  return n;
}
function suggest(node, bad) {
  const names = [...node.kids.keys()];
  const low = bad.toLowerCase();
  const scored = names.map((n) => [n, n.toLowerCase() === low ? 0 : lev(n.toLowerCase(), low)]).filter(([, d]) => d <= Math.max(2, Math.floor(bad.length / 4))).sort((a, b) => a[1] - b[1]);
  return scored.slice(0, 3).map(([n]) => n);
}
function lev(a, b) {
  if (Math.abs(a.length - b.length) > 3) return 99;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

// ---------------------------------------------------------------- source blanking
/** Returns `src` with comments, string contents and regex literals replaced by spaces (same offsets/newlines). */
function blank(src) {
  const out = src.split('');
  const n = src.length;
  const tpl = []; // brace depths at which a template `${` was opened
  let depth = 0, i = 0, last = '';
  const wipe = (a, b) => { for (let k = a; k < b; k++) if (out[k] !== '\n' && out[k] !== '\r') out[k] = ' '; };
  const scanTemplate = (start) => {
    let j = start;
    while (j < n) {
      const ch = src[j];
      if (ch === '\\') { j += 2; continue; }
      if (ch === '`') { wipe(start, j); return j + 1; }
      if (ch === '$' && src[j + 1] === '{') { wipe(start, j); tpl.push(depth); return j + 2; }
      j++;
    }
    wipe(start, n); return n;
  };
  while (i < n) {
    const c = src[i], d = src[i + 1];
    if (c === '/' && d === '/') { let j = i; while (j < n && src[j] !== '\n') j++; wipe(i, j); i = j; continue; }
    if (c === '/' && d === '*') { let j = src.indexOf('*/', i + 2); j = j < 0 ? n : j + 2; wipe(i, j); i = j; continue; }
    if (c === "'" || c === '"') { let j = i + 1; while (j < n && src[j] !== c && src[j] !== '\n') { if (src[j] === '\\') j++; j++; } wipe(i + 1, j); i = j + 1; last = c; continue; }
    if (c === '`') { i = scanTemplate(i + 1); last = '`'; continue; }
    if (c === '/' && (last === '' || '(,=:[!&|?{};+-*%<>~^'.includes(last))) { // regex literal
      let j = i + 1, cls = false;
      while (j < n && src[j] !== '\n') { const ch = src[j]; if (ch === '\\') j++; else if (ch === '[') cls = true; else if (ch === ']') cls = false; else if (ch === '/' && !cls) break; j++; }
      if (src[j] === '/') { wipe(i + 1, j); i = j + 1; last = '/'; continue; }
    }
    if (c === '{') depth++;
    else if (c === '}') { if (tpl.length && tpl[tpl.length - 1] === depth) { tpl.pop(); i = scanTemplate(i + 1); last = '`'; continue; } depth--; }
    if (c !== ' ' && c !== '\t' && c !== '\n' && c !== '\r') last = c;
    i++;
  }
  return out.join('');
}

// ---------------------------------------------------------------- scanning
function walk(dir, acc = []) {
  let ents;
  try { ents = fs.readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of ents) {
    if (e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.')) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(ts|tsx|mts)$/.test(e.name) && !e.name.endsWith('.d.ts')) acc.push(p);
  }
  return acc;
}
function lineStarts(s) { const a = [0]; for (let i = 0; i < s.length; i++) if (s[i] === '\n') a.push(i + 1); return a; }
function posOf(starts, off) { let lo = 0, hi = starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= off) lo = mid; else hi = mid - 1; } return { line: lo + 1, col: off - starts[lo] + 1 }; }

function checkFile(file, index) {
  const raw = fs.readFileSync(file, 'utf8');
  const code = blank(raw);
  const starts = lineStarts(raw);
  const rawLines = raw.split('\n');
  const out = [];
  const add = (off, len, rule, severity, message, fix) => {
    const { line, col } = posOf(starts, off);
    const m = /\/\/\s*phaser4-ok\b(?::[ \t]*(\S.*))?/.exec(rawLines[line - 1] ?? '');
    if (m) {
      if (!m[1]) out.push({ line, col, rule: 'suppress-no-reason', severity: E, message: '`// phaser4-ok` needs a reason after the colon', fix: '// phaser4-ok: <why this is safe>' });
      return;
    }
    out.push({ line, col, rule, severity, message, fix });
  };
  const seen = new Set();
  const once = (off, rule, ...rest) => { const k = rule + ':' + posOf(starts, off).line; if (!seen.has(k)) { seen.add(k); add(off, 0, rule, ...rest); } };

  for (const r of TEXT_RULES) {
    r.re.lastIndex = 0;
    let m;
    while ((m = r.re.exec(code))) once(m.index, r.id, r.severity, `${r.message} (\`${m[0].trim()}\`)`, r.fix);
  }

  // Phaser.X.Y.Z chains: explicit rules first, then phantom check against phaser.d.ts
  const chainRe = /(?<![\w$.])Phaser((?:\.[A-Za-z_$][\w$]*)+)/g;
  let cm;
  while ((cm = chainRe.exec(code))) {
    const segs = cm[1].slice(1).split('.');
    const joined = segs.join('.');
    const rule = CHAIN_RULES.find((r) => joined === r.prefix || joined.startsWith(r.prefix + '.'));
    const base = cm.index;
    if (rule) { if (!rule.textRuleCovers) once(base, rule.id, rule.severity, `${rule.message} (\`Phaser.${joined}\`)`, rule.fix); continue; }
    let node = index, off = base + 'Phaser'.length;
    for (const seg of segs) {
      off += 1; // the dot
      const nxt = node.kids.get(seg);
      if (!nxt) {
        if (node.term) break; // static member of a class/enum/var (or class+namespace hybrid): not verified
        const hint = suggest(node, seg);
        once(off, 'phantom-api', E, `Phaser.${joined}: \`${seg}\` is not declared under Phaser${node === index ? '' : '.' + pathTo(index, node)} in phaser.d.ts`, hint.length ? `did you mean ${hint.join(' / ')}?  (grep phaser.d.ts to confirm)` : 'grep phaser.d.ts; if it exists at runtime but not in the types, suppress with // phaser4-ok: <reason>');
        break;
      }
      node = nxt; off += seg.length;
    }
  }

  // Heuristic file-level rules
  const rt = /\b(?:add|make)\.renderTexture\s*\(|\baddDynamicTexture\s*\(|\bnew\s+Phaser\.GameObjects\.RenderTexture\b|\bnew\s+Phaser\.Textures\.DynamicTexture\b/.exec(code);
  if (rt && !/\.render\s*\(\s*\)/.test(code)) once(rt.index, 'rendertexture-render', W, 'RenderTexture/DynamicTexture buffers commands in v4; nothing shows until .render() is called (no `.render()` found in this file)', 'rt.draw(...); rt.render();');
  const fl = /\b(?!(?:cam|camera|cameras\.main|cameras\.\w+)\b)([\w$.!?\]\[]+)\.filters\s*[!?]?\.\s*(?:internal|external)\b/.exec(code);
  if (fl && !/\benableFilters\s*\(/.test(code) && !/camera/i.test(fl[1])) once(fl.index, 'filters-need-enable', W, 'game objects need enableFilters() before `.filters` exists (no enableFilters() call in this file)', 'obj.enableFilters(); obj.filters!.internal.addGlow(...)');

  // anims.exists() is true for the ZERO-FRAME animations that PreloadScene's createFromAseprite makes (Phaser 4.2.1 looks frames
  // up by numeric name, ours are "<key>#N"); play() on one throws. Guard with `.frames.length` instead.
  const existsRe = /\banims\s*\.\s*exists\s*\(/g;
  for (let m; (m = existsRe.exec(code));) {
    const ln = posOf(starts, m.index).line;
    const line = code.slice(starts[ln - 1], starts[ln] ?? code.length);
    if (/\.frames\b|\.remove\s*\(/.test(line)) continue;
    once(m.index, 'anims-exists-zero-frame', W, 'anims.exists() is also true for the zero-frame tags createFromAseprite leaves behind; play() on those throws', 'const a = anims.get(key); if (a && a.frames.length) sprite.play(key);');
  }
  // Arcade world.timeScale is inverted (2 = half speed). Only `1`, `1 / x` and `x` computed by the caller as an inverse are plausible.
  const tsRe = /\bworld\s*\.\s*timeScale\s*=(?!=)(?!\s*1\s*(?:\/|[;,)\n]))/g;
  for (let m; (m = tsRe.exec(code));) once(m.index, 'world-timescale-inverted', W, 'physics.world.timeScale is INVERTED (frame-time multiplier: 2 = half speed)', 'world.timeScale = 1 / slowdown;');
  // Scene event emitters outlive shutdown: listeners added with scene.events.on(...) survive scene.restart() unless removed.
  if (!/\.events\s*\.\s*off\s*\(/.test(code) && !/Events\.SHUTDOWN|'shutdown'|"shutdown"/.test(code)) {
    const evRe = /\b(?:scene|sys)\s*\.\s*events\s*\.\s*on\s*\(|\bthis\s*\.\s*events\s*\.\s*on\s*\(\s*Phaser\s*\.\s*Scenes\s*\.\s*Events\s*\./g;
    for (let m; (m = evRe.exec(code));) once(m.index, 'scene-events-no-off', W, 'scene.events listeners are NOT cleared on shutdown/restart and no .events.off( / SHUTDOWN handler exists in this file', 'scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.events.off(EVENT, handler, ctx));');
  }
  // window/document listeners survive scene.restart(); a part restart re-runs create() and stacks another copy.
  if (!/\.removeEventListener\s*\(/.test(code)) {
    const winRe = /\b(?:window|document)\s*\.\s*addEventListener\s*\(/g;
    for (let m; (m = winRe.exec(code));) once(m.index, 'window-listener-no-remove', W, 'window/document listener with no removeEventListener( in this file: survives scene shutdown / part restart and stacks', "scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => window.removeEventListener('keydown', handler, true));  // or guard a once-per-page install and add // phaser4-ok: once per page");
  }
  // createCanvas() returns null when the key already exists (a part restart re-runs create()): the usual `!` then crashes on the 2nd part.
  if (!/\btextures\s*\.\s*exists\s*\(|\btextures\s*\.\s*remove\s*\(/.test(code)) {
    const cvRe = /\btextures\s*\.\s*(?:createCanvas|addCanvas)\s*\(/g;
    for (let m; (m = cvRe.exec(code));) once(m.index, 'canvas-texture-no-exists-guard', W, 'textures.createCanvas() with no textures.exists()/remove() in this file: the key survives scene restart, createCanvas then returns null (v4 warns "already exists") and a `!` deref crashes on the next part', 'if (!scene.textures.exists(KEY)) { const t = scene.textures.createCanvas(KEY, w, h)!; ... }');
  }
  // Fractional camera zoom shimmers pixel art (nearest-neighbour sampling at 1.07x etc). Only the engine camera controller may zoom (transient punch).
  if (!/[\\/]core[\\/]camera\.ts$/.test(file)) {
    const zRe = /\.(?:setZoom|zoomTo)\s*\(|\b(?:cam|camera|cameras\.main|cameras\.\w+)\.zoom\s*=(?!=)/g;
    for (let m; (m = zRe.exec(code));) once(m.index, 'camera-zoom-outside-controller', W, 'camera zoom outside core/camera.ts: non-integer zoom shimmers/swims pixel art and bypasses the zoom-punch bookkeeping and reduced-motion check', 'ctx.camera.zoomPunch(amount, ms); for a deliberate integer zoom add // phaser4-ok: <reason>');
  }
  // Per-frame hazards inside update-like function bodies (lexical scan, so helper calls are not flagged).
  const updHead = /(?:^|[\s;{}])(?:(?:private|public|protected|static|async)\s+)*(update\w*|tick\w*|preUpdate|postUpdate|step\w*|on\w*Update)\s*\([^()]*\)\s*(?::\s*[^{;=()]+)?\{|\bonUpdate\s*\(\s*(?:\([^()]*\)|\w+)\s*(?::\s*\w+)?=>\s*\{/g;
  const BODY_RULES = [
    { id: 'update-new-phaser-object', re: /\bnew\s+Phaser\s*\.\s*(?:Geom|Math\s*\.\s*Vector[234]?|Display\s*\.\s*Color|Structs)\b[\w$.]*/g, msg: 'allocates a Phaser math/geom object every frame', fix: 'keep a scratch instance on the class/closure and .setTo()/.set() it' },
    { id: 'update-creates-gameobject', re: /\.add\s*\.\s*(?:sprite|image|text|bitmapText|graphics|rectangle|ellipse|circle|container|zone|tileSprite|particles|renderTexture|dynamicTexture|shader)\s*\(/g, msg: 'creates a game object inside a per-frame function', fix: 'create once (constructor/create) or take it from a pool' },
    { id: 'update-adds-collider', re: /\.add\s*\.\s*(?:collider|overlap)\s*\(/g, msg: 'adds an Arcade collider inside a per-frame function (colliders accumulate)', fix: 'create it once and keep the Collider; destroy() it when replaced' },
    { id: 'update-adds-filter', re: /\.filters\s*[!?]?\.\s*(?:internal|external)\s*\.\s*add\w*\s*\(|\bPhaser\s*\.\s*Actions\s*\.\s*AddEffect\w+\s*\(|\bnew\s+Phaser\s*\.\s*Filters\s*\.\s*Controller\b/g, msg: 'creates a filter inside a per-frame function', fix: 'add the filter once and toggle `controller.active` / mutate its properties' },
  ];
  for (let h; (h = updHead.exec(code));) {
    let depth = 0, i = h.index + h[0].length - 1, end = -1;
    for (; i < code.length; i++) { const ch = code[i]; if (ch === '{') depth++; else if (ch === '}' && --depth === 0) { end = i; break; } }
    if (end < 0) continue;
    const body = code.slice(h.index + h[0].length, end), base = h.index + h[0].length;
    for (const r of BODY_RULES) {
      r.re.lastIndex = 0;
      for (let m; (m = r.re.exec(body));) once(base + m.index, r.id, W, `${r.msg} (\`${m[0].trim()}\`)`, r.fix);
    }
  }
  return out;
}
function pathTo(root, target) {
  const walkp = (n, acc) => { if (n === target) return acc; for (const [k, v] of n.kids) { const r = walkp(v, [...acc, k]); if (r) return r; } return null; };
  return (walkp(root, []) ?? []).join('.');
}

// ---------------------------------------------------------------- main
if (opts.list) {
  for (const r of TEXT_RULES) console.log(`${r.severity.padEnd(5)} ${r.id.padEnd(22)} ${r.message}`);
  for (const r of CHAIN_RULES) console.log(`${r.severity.padEnd(5)} ${r.id.padEnd(22)} Phaser.${r.prefix}: ${r.message}`);
  console.log(`error phantom-api            Phaser.X.Y.Z chain not declared in phaser.d.ts`);
  console.log(`warn  rendertexture-render   RenderTexture/DynamicTexture used without .render()`);
  console.log(`warn  filters-need-enable    .filters.* on a game object without enableFilters()`);
  console.log(`warn  anims-exists-zero-frame   anims.exists() true for zero-frame Aseprite tags; play() throws`);
  console.log(`warn  world-timescale-inverted   physics.world.timeScale assigned something other than 1 / x`);
  console.log(`warn  scene-events-no-off        scene.events.on(...) with no .events.off( / SHUTDOWN handler in the file`);
  console.log(`warn  window-listener-no-remove   window/document.addEventListener( in a file with no removeEventListener(`);
  console.log(`warn  canvas-texture-no-exists-guard   textures.createCanvas/addCanvas in a file with no textures.exists()/remove()`);
  console.log(`warn  camera-zoom-outside-controller   setZoom/zoomTo/cam.zoom= outside core/camera.ts`);
  console.log(`warn  update-new-phaser-object   new Phaser.Geom/Math.Vector/... inside update/tick/onUpdate`);
  console.log(`warn  update-creates-gameobject  add.sprite/text/graphics/... inside update/tick/onUpdate`);
  console.log(`warn  update-adds-collider       add.collider/overlap inside update/tick/onUpdate`);
  console.log(`warn  update-adds-filter         filters.*.add*/AddEffect*/new Filters.Controller inside update/tick/onUpdate`);
  console.log(`error suppress-no-reason     // phaser4-ok without a reason`);
  process.exit(0);
}
if (!fs.existsSync(opts.dts)) { console.error(`check-phaser4: cannot find ${opts.dts} (run npm install in game/, or pass --dts)`); process.exit(2); }
if (!fs.existsSync(opts.root)) { console.error(`check-phaser4: root ${opts.root} does not exist`); process.exit(2); }

const t0 = performance.now();
const index = buildIndex(opts.dts);
const files = walk(opts.root).sort();
const all = [];
for (const f of files) {
  for (const v of checkFile(f, index)) all.push({ file: (rel => (rel.startsWith('..') ? f : rel))(path.relative(process.cwd(), f)), ...v });
}
all.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.col - b.col);
const errors = all.filter((v) => v.severity === E).length;
const warnings = all.length - errors;
const ms = Math.round(performance.now() - t0);

if (opts.json) {
  console.log(JSON.stringify({ root: opts.root, files: files.length, errors, warnings, ms, violations: all }, null, 2));
} else {
  for (const v of all) console.log(`${v.file}:${v.line}:${v.col}  ${v.severity === E ? 'error' : 'warn '}  ${v.rule}  ${v.message}  → ${v.fix}`);
  console.log(`check:phaser4  ${files.length} files, ${errors} error(s), ${warnings} warning(s) in ${ms} ms${errors || (opts.strict && warnings) ? '' : '  ✔ clean'}`);
}
process.exit(errors > 0 || (opts.strict && warnings > 0) ? 1 : 0);
