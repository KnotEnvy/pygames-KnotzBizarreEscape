-- PK: "prop kit", shared drawing helpers for the KBE prop sprites (art-src/props/*.lua).
-- Usage in a build script:
--   local K = dofile(app.params.kbe); local ROOT = app.params.root
--   local P = dofile(ROOT .. "/art-src/props/lib/pk.lua")(K)
-- Colors are master palette names (K.PAL) or {r,g,b,a} tables. Light comes from the top-left.
return function(K)
local P = {}
local PC = app.pixelColor

P.NAME = {}
for n, _ in pairs(K.PAL) do P.NAME[K.color(n)] = n end

function P.spec(key, w, h, anims, extra)
  local ROOT = app.params.root
  local s = {
    name = key, w = w, h = h, anims = anims,
    src = ROOT .. "/art-src/props/" .. key .. ".aseprite",
    sheet = ROOT .. "/public/assets/sprites/props/" .. key .. ".png",
    data = ROOT .. "/public/assets/sprites/props/" .. key .. ".json",
    anchor = "bottom-center",
  }
  for k, v in pairs(extra or {}) do s[k] = v end
  return s
end

-- deterministic RNG (so rebuilds are stable)
function P.rng(seed)
  local s = (seed or 1) * 7919 % 2147483647
  if s <= 0 then s = s + 2147483646 end
  return function(a, b)
    s = s * 16807 % 2147483647
    local r = (s - 1) / 2147483646
    if a then return a + math.floor(r * (b - a + 1)) end
    return r
  end
end

-- pixel access -------------------------------------------------------------
local function inb(img, x, y) return x >= 0 and y >= 0 and x < img.width and y < img.height end
function P.set(img, x, y, c)
  if not inb(img, x, y) then return end
  if c == nil or c == false then img:drawPixel(x, y, 0) else img:drawPixel(x, y, K.color(c)) end
end
function P.clear(img, x, y) P.set(img, x, y, nil) end
function P.alpha(img, x, y) if not inb(img, x, y) then return 0 end return PC.rgbaA(img:getPixel(x, y)) end
function P.solid(img, x, y) return P.alpha(img, x, y) == 255 end
function P.get(img, x, y)
  if not inb(img, x, y) then return nil end
  local v = img:getPixel(x, y)
  if PC.rgbaA(v) == 0 then return nil end
  return P.NAME[v] or "?"
end
-- paint only over existing opaque pixels
function P.over(img, x, y, c) if P.solid(img, x, y) then P.set(img, x, y, c) end end
-- paint only into empty pixels
function P.under(img, x, y, c) if P.alpha(img, x, y) == 0 then P.set(img, x, y, c) end end

function P.fill(img, x, y, w, h, c) for j = y, y + h - 1 do for i = x, x + w - 1 do P.set(img, i, j, c) end end end
function P.hline(img, x0, x1, y, c) for i = math.min(x0, x1), math.max(x0, x1) do P.set(img, i, y, c) end end
function P.vline(img, x, y0, y1, c) for j = math.min(y0, y1), math.max(y0, y1) do P.set(img, x, j, c) end end
function P.line(img, x0, y0, x1, y1, c, fn)
  local dx, dy = math.abs(x1 - x0), -math.abs(y1 - y0)
  local sx, sy = x0 < x1 and 1 or -1, y0 < y1 and 1 or -1; local err = dx + dy
  while true do
    if fn then fn(x0, y0) else P.set(img, x0, y0, c) end
    if x0 == x1 and y0 == y1 then break end
    local e2 = 2 * err; if e2 >= dy then err = err + dy; x0 = x0 + sx end; if e2 <= dx then err = err + dx; y0 = y0 + sy end
  end
end
function P.disc(img, cx, cy, r, c, fn)
  for j = -r, r do for i = -r, r do
    if i * i + j * j <= r * r + r * 0.8 then if fn then fn(cx + i, cy + j, i, j) else P.set(img, cx + i, cy + j, c) end end
  end end
end
function P.ellipse(img, cx, cy, rx, ry, c, fn)
  for j = -ry, ry do for i = -rx, rx do
    local d = (i * i) / ((rx + 0.5) ^ 2) + (j * j) / ((ry + 0.5) ^ 2)
    if d <= 1 then if fn then fn(cx + i, cy + j, i, j) else P.set(img, cx + i, cy + j, c) end end
  end end
end
-- iterate a palette-keyed text grid at (ox,oy)
function P.grid(img, rows, keys, ox, oy)
  for y, row in ipairs(rows) do for x = 1, #row do
    local ch = row:sub(x, x)
    if ch ~= "." and ch ~= " " then
      local k = keys[ch]; assert(k ~= nil, "no key for '" .. ch .. "'")
      if k == "_" then P.clear(img, ox + x - 1, oy + y - 1) else P.set(img, ox + x - 1, oy + y - 1, k) end
    end
  end end
end

-- ramp helpers ---------------------------------------------------------------
function P.split(name) local r, i = name:match("^(%a+)(%d)$"); return r, tonumber(i) end
function P.shift(name, d)
  if name == "white" then name = "ink6" end
  local r, i = P.split(name); if not r then return name end
  local max = (r == "ink" or r == "fire") and 6 or 5
  i = math.max(1, math.min(max, i + d)); return r .. i
end
-- color a lit (top) outline edge would use next to `name`
function P.litEdge(name)
  if name == "white" then return "ink3" end
  local r, i = P.split(name)
  if not r then return "outline" end
  if r == "ink" then return i >= 4 and "ink3" or "outline" end
  if r == "fire" then return "fire2" end
  if r == "sky" then return "sky2" end
  return r .. "1"
end

-- Selective outline: transparent pixels 4-adjacent to opaque ones become `outline`,
-- except edges facing up (top / lit) which take the darkest tone of the ramp below.
function P.selout(img, opts)
  opts = opts or {}
  local w, h = img.width, img.height
  local marks = {}
  for y = 0, h - 1 do for x = 0, w - 1 do
    if P.alpha(img, x, y) == 0 then
      local b = P.solid(img, x, y + 1)
      if b or P.solid(img, x - 1, y) or P.solid(img, x + 1, y) or P.solid(img, x, y - 1) then
        local c = opts.color or "outline"
        if b and not opts.flat and not P.solid(img, x, y - 1) then c = P.litEdge(P.get(img, x, y + 1)) end
        marks[#marks + 1] = { x, y, c }
      end
    end
  end end
  for _, m in ipairs(marks) do P.set(img, m[1], m[2], m[3]) end
end

-- materials ------------------------------------------------------------------
-- Horizontal wooden plank. ramp default "dirt", base index b (default 3).
function P.plankH(img, x, y, w, h, opt)
  opt = opt or {}
  local r, b = opt.ramp or "dirt", opt.base or 3
  local rnd = P.rng(opt.seed or (x * 31 + y * 17 + w))
  P.fill(img, x, y, w, h, r .. b)
  P.hline(img, x, x + w - 1, y, r .. math.min(5, b + 1))
  if h >= 3 then P.hline(img, x, x + w - 1, y + h - 1, r .. math.max(1, b - 1)) end
  if opt.ends ~= false then
    P.vline(img, x + w - 1, y, y + h - 1, r .. math.max(1, b - 1))
    P.set(img, x, y, r .. math.min(5, b + 2))
  end
  -- grain: a few short darker dashes, sometimes with a light pixel above
  if h >= 3 and w >= 5 then
    local n = math.max(1, math.floor(w / 6))
    for _ = 1, n do
      local gx, gy, gl = x + rnd(1, w - 4), y + rnd(1, h - 2), rnd(2, 4)
      P.hline(img, gx, math.min(x + w - 2, gx + gl - 1), gy, r .. math.max(1, b - 1))
    end
    if opt.knot ~= false and w >= 8 and rnd() < 0.6 then
      local kx, ky = x + rnd(2, w - 3), y + math.floor(h / 2)
      P.set(img, kx, ky, r .. math.max(1, b - 2)); P.set(img, kx - 1, ky, r .. math.max(1, b - 1))
      P.set(img, kx + 1, ky, r .. math.max(1, b - 1))
    end
  end
end
-- Vertical plank
function P.plankV(img, x, y, w, h, opt)
  opt = opt or {}
  local r, b = opt.ramp or "dirt", opt.base or 3
  local rnd = P.rng(opt.seed or (x * 13 + y * 7 + h))
  P.fill(img, x, y, w, h, r .. b)
  P.vline(img, x, y, y + h - 1, r .. math.min(5, b + 1))
  if w >= 3 then P.vline(img, x + w - 1, y, y + h - 1, r .. math.max(1, b - 1)) end
  if opt.ends ~= false then P.hline(img, x, x + w - 1, y + h - 1, r .. math.max(1, b - 1)) end
  if w >= 3 and h >= 5 then
    local n = math.max(1, math.floor(h / 6))
    for _ = 1, n do
      local gx, gy, gl = x + rnd(1, w - 2), y + rnd(1, h - 4), rnd(2, 4)
      P.vline(img, gx, gy, math.min(y + h - 2, gy + gl - 1), r .. math.max(1, b - 1))
    end
  end
end
-- Round log (vertical), lit from the left.
function P.logV(img, x, y, w, h, opt)
  opt = opt or {}
  local r, b = opt.ramp or "dirt", opt.base or 3
  local rnd = P.rng(opt.seed or (x * 3 + y * 11 + w))
  for i = 0, w - 1 do
    local t = i / math.max(1, w - 1)
    local c
    if w <= 2 then c = (i == 0) and b + 1 or b - 1
    elseif i == 0 then c = b
    elseif t < 0.4 then c = b + 1
    elseif t < 0.75 then c = b
    else c = b - 1 end
    P.vline(img, x + i, y, y + h - 1, r .. math.max(1, math.min(5, c)))
  end
  -- bark: short dark dashes and rings
  if w >= 3 then
    for _ = 1, math.floor(h / 5) do
      local gx, gy = x + rnd(1, w - 1), y + rnd(0, h - 3)
      P.vline(img, gx, gy, gy + rnd(1, 2), r .. math.max(1, b - 1))
    end
  end
end
-- Generic shaded box: fill base, highlight top row + left col, shadow bottom row + right col.
function P.box(img, x, y, w, h, ramp, b, opt)
  opt = opt or {}
  b = b or 3
  P.fill(img, x, y, w, h, ramp .. b)
  P.hline(img, x, x + w - 1, y, ramp .. math.min(ramp == "ink" and 6 or 5, b + 1))
  P.vline(img, x, y, y + h - 1, ramp .. math.min(ramp == "ink" and 6 or 5, b + 1))
  P.hline(img, x, x + w - 1, y + h - 1, ramp .. math.max(1, b - 1))
  P.vline(img, x + w - 1, y, y + h - 1, ramp .. math.max(1, b - 1))
  if opt.spec then P.set(img, x, y, ramp .. math.min(ramp == "ink" and 6 or 5, b + 2)) end
end

-- Rivet: 1px bright with dark shadow below-right (size 1) or a 2x2 dome (size 2).
function P.rivet(img, x, y, size, ramp)
  ramp = ramp or "steel"
  if size == 2 then
    P.set(img, x, y, ramp .. "5"); P.set(img, x + 1, y, ramp .. "4")
    P.set(img, x, y + 1, ramp .. "3"); P.set(img, x + 1, y + 1, ramp .. "2")
    P.over(img, x + 1, y + 2, ramp .. "1"); P.over(img, x + 2, y + 1, ramp .. "1")
  else
    P.set(img, x, y, ramp .. "5"); P.over(img, x + 1, y + 1, ramp .. "1")
  end
end
function P.nail(img, x, y) P.set(img, x, y, "ink5"); P.over(img, x + 1, y + 1, "dirt1") end

-- Diagonal hazard stripes inside a rect. a/b colors; period p (default 6); dir 1 or -1.
function P.hazard(img, x, y, w, h, opt)
  opt = opt or {}
  local p, dir = opt.p or 6, opt.dir or 1
  local ca, cb = opt.a or "fire4", opt.b or "outline"
  for j = 0, h - 1 do for i = 0, w - 1 do
    local k = ((i * dir + j + (opt.phase or 0)) % p + p) % p
    local c = (k < p / 2) and ca or cb
    if c == ca then
      if j == 0 and opt.a_hi then c = opt.a_hi elseif j == h - 1 and opt.a_lo then c = opt.a_lo end
    end
    P.set(img, x + i, y + j, c)
  end end
end

-- Snow cap lying on a surface: columns x0..x1, `ytop` = first row of the surface it rests on.
-- Snow is built from rounded lumps rising `depth` (+1 for big lumps) above the surface and covers the
-- surface's top row. Overhangs by 1px each end and droops. opt: seed, drips, cool, lumpy (0..1), dim, taper
function P.snow(img, x0, x1, ytop, depth, opt)
  opt = opt or {}
  local rnd = P.rng(opt.seed or (x0 * 7 + ytop * 3 + x1))
  local hi, base, sh, sh2 = "white", "ink6", "ink5", opt.cool and "sky5" or "ink5"
  if opt.dim then hi, base, sh, sh2 = "ink6", "ink5", "ink4", "sky4" end
  local lump = opt.lumpy or 0.5
  local cols = {}
  local x = x0 - 1
  while x <= x1 + 1 do
    local lw = rnd(opt.minw or 3, opt.maxw or 6)
    local lh = depth + ((rnd() < lump) and 1 or 0)
    for i = 0, lw - 1 do
      local xx = x + i
      if xx > x1 + 1 then break end
      local t = lh
      if (i == 0 or i == lw - 1) and lw >= 3 then t = lh - 1 end
      cols[xx] = { t = math.max(1, t), i = i, lw = lw }
    end
    x = x + lw
  end
  for xx = x0 - 1, x1 + 1 do
    local c = cols[xx]
    local t = c.t
    if xx == x0 - 1 or xx == x1 + 1 then t = math.max(1, math.min(t, depth - 1)) end
    if opt.taper then
      local edge = math.min(xx - x0 + 1, x1 - xx + 1)
      if edge < opt.taper then t = math.max(1, math.min(t, edge)) end
    end
    c.t = t
    local yb = ytop
    if xx == x0 - 1 or xx == x1 + 1 then yb = ytop + 1 end
    local yt = yb - t + (yb == ytop and 0 or 0)
    yt = yb - t
    if yb ~= ytop then yt = yb - t + 1 end
    c.yt, c.yb = yt, yb
  end
  for xx = x0 - 1, x1 + 1 do
    local c = cols[xx]
    local yt, yb = c.yt, c.yb
    for y = yt, yb do P.set(img, xx, y, base) end
    local left = cols[xx - 1]
    local right = cols[xx + 1]
    -- lit tops on the left half of each lump; shadowed right flank
    if c.i < c.lw / 2 + 0.5 or (left and left.yt > yt) then P.set(img, xx, yt, hi) end
    if right and right.yt > yt and yb - yt >= 2 then
      for y = yt + 1, math.min(yb - 1, right.yt) do P.set(img, xx, y, sh) end
    end
    P.set(img, xx, yb, sh)
  end
  -- cool reflected tint on the underside + small drips / icicles
  for xx = x0, x1 do if rnd() < 0.3 then P.set(img, xx, ytop, sh2) end end
  if opt.drips ~= false then
    local nd = math.max(1, math.floor((x1 - x0) / 9))
    for _ = 1, nd do
      local dx = rnd(x0 + 1, x1 - 1)
      P.set(img, dx, ytop + 1, sh)
      if rnd() < 0.5 then P.set(img, dx, ytop + 2, sh2) end
    end
  end
  return cols
end

-- small snow mound at ground level (bottom row = y), centered at cx with half-width hw
function P.mound(img, cx, y, hw, hgt, opt)
  opt = opt or {}
  for i = -hw, hw do
    local t = math.max(1, math.floor(0.5 + hgt * (1 - (i / (hw + 1)) ^ 2)))
    for j = 0, t - 1 do
      local c = "ink6"
      if j == t - 1 then c = (i <= 0) and "white" or "ink6" end
      if j == 0 then c = "ink5" end
      if i > hw * 0.4 and j < t - 1 then c = "ink5" end
      P.set(img, cx + i, y - j, c)
    end
  end
end

-- Spiral-eye insignia (hand-made grids). size "s" (11x7), "m" (15x9)
P.EYE = {
  s = {
    "...ooooo...",
    "..owrrrwo..",
    ".owrwwrrwo.",
    "owwrwrwrwwo",
    ".owrrwwrwo.",
    "..owrrrwo..",
    "...ooooo...",
  },
  m = {
    ".....ooooo.....",
    "...oowrrrwoo...",
    "..owwrwwwrwwo..",
    ".owwrwrrrwrwwo.",
    "owwwrwrwrwrwwwo",
    ".owwrwrrwwrwwo.",
    "..owwrwrrrwwo..",
    "...oowrrrwoo...",
    ".....ooooo.....",
  },
}
function P.eye(img, size, ox, oy, keys)
  keys = keys or { o = "outline", w = "white", r = "red3" }
  local g = P.EYE[size]
  P.grid(img, g, keys, ox, oy)
  -- shade lower sclera
  local h = #g
  for y = 1, #g do
    local row = g[y]
    for x = 1, #row do
      if row:sub(x, x) == "w" and y >= h - 2 then
        -- lower lid shadow on sclera only (not the spiral): sclera = outside iris
        local ch_l, ch_r = row:sub(x - 1, x - 1), row:sub(x + 1, x + 1)
        if ch_l == "o" or ch_r == "o" or ch_l == "w" and ch_r == "w" and (x < 5 or x > #row - 4) then
          P.set(img, ox + x - 1, oy + y - 1, keys.ws or "ink5")
        end
      end
    end
  end
end

-- procedural spiral eye for big emblems: almond eye (half-width a, half-height b) with
-- Archimedean spiral iris radius ir; centered cx,cy.
function P.bigEye(img, cx, cy, a, b, ir, opt)
  opt = opt or {}
  local red, red_d, wht, wsh = opt.red or "red3", opt.red_d or "red2", opt.white or "white", opt.wsh or "ink5"
  local pitch = opt.pitch or 3.2
  local function inEye(i, j)
    -- almond: |j| <= b * (1 - (i/a)^2)
    local t = 1 - (i / (a + 0.5)) ^ 2
    return t > 0 and math.abs(j) <= b * t + 0.3
  end
  for j = -b - 1, b + 1 do for i = -a - 1, a + 1 do
    if inEye(i, j) then
      local x, y = cx + i, cy + j
      local r = math.sqrt(i * i + j * j)
      if r <= ir + 0.4 then
        local ang = math.atan(j, i)
        local s = (r - ang / (2 * math.pi) * pitch) / pitch
        local f = s - math.floor(s)
        local c = (f < 0.5) and red or wht
        if r > ir - 0.6 then c = red_d end
        if c == wht and (i + j) > ir * 0.6 then c = "ink6" end
        P.set(img, x, y, c)
      else
        P.set(img, x, y, (j > b * 0.35) and wsh or wht)
      end
    end
  end end
  -- lid outline
  local marks = {}
  for j = -b - 2, b + 2 do for i = -a - 2, a + 2 do
    if not inEye(i, j) and (inEye(i + 1, j) or inEye(i - 1, j) or inEye(i, j + 1) or inEye(i, j - 1)) then
      marks[#marks + 1] = { cx + i, cy + j }
    end
  end end
  for _, m in ipairs(marks) do P.set(img, m[1], m[2], opt.lid or "outline") end
end

-- 3x5-ish pixel font for signs (variable width)
P.FONT = {
  A = { ".x.", "x.x", "xxx", "x.x", "x.x" },
  B = { "xx.", "x.x", "xx.", "x.x", "xx." },
  D = { "xx.", "x.x", "x.x", "x.x", "xx." },
  E = { "xxx", "x..", "xx.", "x..", "xxx" },
  F = { "xxx", "x..", "xx.", "x..", "x.." },
  G = { ".xx", "x..", "x.x", "x.x", ".xx" },
  I = { "xxx", ".x.", ".x.", ".x.", "xxx" },
  J = { "..x", "..x", "..x", "x.x", ".x." },
  M = { "x...x", "xx.xx", "x.x.x", "x...x", "x...x" },
  N = { "x..x", "xx.x", "x.xx", "x..x", "x..x" },
  O = { ".x.", "x.x", "x.x", "x.x", ".x." },
  P = { "xx.", "x.x", "xx.", "x..", "x.." },
  R = { "xx.", "x.x", "xx.", "x.x", "x.x" },
  U = { "x.x", "x.x", "x.x", "x.x", "xxx" },
  ["!"] = { "x", "x", "x", ".", "x" },
}
function P.textWidth(s)
  local w = 0
  for i = 1, #s do w = w + #P.FONT[s:sub(i, i)][1] + 1 end
  return w - 1
end
-- draw text; `wear` = optional set of {dx,dy} pixel skips (paint chips)
function P.text(img, s, x, y, c, opt)
  opt = opt or {}
  local passes = opt.shadow and { { opt.shadow, 1, 1 }, { c, 0, 0 } } or { { c, 0, 0 } }
  for _, pass in ipairs(passes) do
    local cx = x
    for i = 1, #s do
      local g = P.FONT[s:sub(i, i)]
      for j, row in ipairs(g) do for k = 1, #row do
        if row:sub(k, k) == "x" then
          local px, py = cx + k - 1 + pass[2], y + j - 1 + pass[3]
          local skip = opt.wear and opt.wear[(px) .. "," .. (py)]
          if not (skip and pass[2] == 0) then P.set(img, px, py, pass[1]) end
        end
      end end
      cx = cx + #g[1] + 1
    end
  end
end

return P
end
