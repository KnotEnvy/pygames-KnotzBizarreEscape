-- Stage 1 tileset ("Pine Ridge Breakout"). 16x16 tiles, 32 columns, one image, 0 margin/spacing.
-- Build: bash tools/build-art.sh art-src/tiles/stage1.lua
-- Writes: art-src/tiles/stage1.aseprite (source), public/assets/tiles/stage1.png (tileset image),
--         art-src/tiles/stage1_tiles.json (manifest: name -> local id, properties, animations).
-- The map generator (art-src/maps/build_stage1.mjs) reads the manifest, so tile ids never get hand-typed.
--
-- Terrain sets (rows 0-7) are autotile-friendly: column = exposed-side mask (N=1, E=2, S=4, W=8),
-- cols 16-19 inner corners (tl,tr,bl,br), 20-22 fill variants, 23-26 deep fill, 27-29 top variants.
-- Rows 4-7 are the same sets darkened/desaturated for the non-colliding `back` layer.
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local TS, COLS, ROWS = 16, 32, 14
local SHEET = Image(TS * COLS, TS * ROWS, ColorMode.RGB)
local CLEAR = app.pixelColor.rgba(0, 0, 0, 0)

local manifest = { tilewidth = TS, columns = COLS, rows = ROWS, image = "stage1.png", tiles = {} }
local byName = {}

---------------------------------------------------------------------------------------------------
-- helpers
local function H(x, y, s)
  local h = (math.floor(x) * 374761393 + math.floor(y) * 668265263 + math.floor(s or 0) * 1442695041) & 0xffffffff
  h = ((h ~ (h >> 13)) * 1274126177) & 0xffffffff
  h = h ~ (h >> 16)
  return h / 4294967296
end
local function T() return Image(TS, TS, ColorMode.RGB) end
local function P(t, x, y, c)
  if x < 0 or y < 0 or x >= TS or y >= TS then return end
  if c == nil then t:drawPixel(x, y, CLEAR) else t:drawPixel(x, y, K.color(c)) end
end
local function A(t, x, y)
  if x < 0 or y < 0 or x >= TS or y >= TS then return false end
  return app.pixelColor.rgbaA(t:getPixel(x, y)) > 0
end
local function R(t, x, y, w, h, c) for j = y, y + h - 1 do for i = x, x + w - 1 do P(t, i, j, c) end end end
local function L(t, x0, y0, x1, y1, c)
  local dx, dy = math.abs(x1 - x0), -math.abs(y1 - y0)
  local sx, sy = x0 < x1 and 1 or -1, y0 < y1 and 1 or -1
  local err = dx + dy
  while true do
    P(t, x0, y0, c)
    if x0 == x1 and y0 == y1 then break end
    local e2 = 2 * err
    if e2 >= dy then err = err + dy; x0 = x0 + sx end
    if e2 <= dx then err = err + dx; y0 = y0 + sy end
  end
end
local function wrap(v) return v % TS end

local function put(col, row, name, t, props, anim)
  assert(col < COLS and row < ROWS, "tile out of sheet: " .. name)
  assert(not byName[name], "duplicate tile name " .. name)
  SHEET:drawImage(t, Point(col * TS, row * TS))
  local id = row * COLS + col
  local rec = { name = name, id = id, props = props or {} }
  if anim then rec.anim = anim end
  manifest.tiles[#manifest.tiles + 1] = rec
  byName[name] = rec
  return id
end

-- palette remap used for the background ("back" layer) variants: darker, cooler, no hard outline
local BG_MAP = {
  white = "ink5", ink6 = "ink4", ink5 = "ink3", ink4 = "ink3", ink3 = "ink2", ink2 = "ink1", ink1 = "outline", outline = "outline",
  sky5 = "ink3", sky4 = "sky2",
  dirt5 = "ink3", dirt4 = "dirt3", dirt3 = "dirt2", dirt2 = "ink1", dirt1 = "outline",
  leaf5 = "leaf3", leaf4 = "leaf2", leaf3 = "leaf2", leaf2 = "leaf1", leaf1 = "outline",
  steel5 = "steel3", steel4 = "steel3", steel3 = "steel2", steel2 = "steel1", steel1 = "outline",
  sand5 = "sand3", sand4 = "sand2", sand3 = "sand2", sand2 = "sand1", sand1 = "outline",
  fire4 = "sand2", fire5 = "sand3", fire3 = "sand2", red3 = "red2", red4 = "red2",
}
local REV = {}
for n, c in pairs(K.PAL) do REV[app.pixelColor.rgba(c[1], c[2], c[3], 255)] = n end
local function remap(t, map)
  local o = T()
  for y = 0, TS - 1 do for x = 0, TS - 1 do
    local p = t:getPixel(x, y)
    if app.pixelColor.rgbaA(p) > 0 then
      local n = REV[p]
      local m = n and map[n] or n
      if m then o:drawPixel(x, y, K.color(m)) else o:drawPixel(x, y, p) end
    end
  end end
  return o
end

---------------------------------------------------------------------------------------------------
-- terrain materials
local N, E, S, W = 1, 2, 4, 8

-- snow cap profiles (period 16; x=0 and x=15 fixed so every variant tiles seamlessly)
-- SNOW_T = top contour (0/1: lumps), SNOW = bottom (thickness), DRIP = extra pixels hanging below
local SNOW_T = {
  [0] = { 0,0,0,1,1,0,0,0,0,0,1,0,0,0,0,0 },
  [1] = { 0,1,1,0,0,0,0,0,1,1,1,0,0,0,1,0 },
  [2] = { 0,0,0,0,0,1,1,0,0,0,0,0,1,1,0,0 },
  [3] = { 0,0,1,1,0,0,0,0,0,1,0,0,0,0,0,0 },
}
local SNOW = {
  [0] = { 6,6,7,7,7,6,6,6,7,7,6,6,6,7,6,6 },
  [1] = { 6,7,7,6,6,6,7,8,7,6,6,6,7,7,6,6 },
  [2] = { 6,6,6,7,8,7,6,6,6,6,7,7,6,6,7,6 },
  [3] = { 6,6,7,6,6,7,7,7,6,6,6,7,8,7,6,6 },
}
local DRIP = {
  [0] = { 0,0,0,1,0,0,0,0,0,0,2,0,0,0,0,0 },
  [1] = { 0,0,0,0,0,0,0,1,2,0,0,0,0,0,0,0 },
  [2] = { 0,1,0,0,0,2,1,0,0,0,0,0,0,1,0,0 },
  [3] = { 0,0,0,0,2,0,0,0,0,0,1,0,0,0,0,0 },
}

local function snowColor(y, s, x, top)
  top = top or 0
  if y <= top then return "white" end
  if y == top + 1 then return (x % 4 == 1) and "ink6" or "white" end
  if y == s - 1 then return "ink5" end
  if y == s - 2 then return (x % 2 == 0) and "sky5" or "ink6" end
  return "ink6"
end

-- draws a snow cap; returns per-x bottom (first non-snow row)
local function snowCap(t, mask, v)
  local prof, drip, tp = SNOW[v % 4], DRIP[v % 4], SNOW_T[v % 4]
  local bottom = {}
  for x = 0, TS - 1 do
    local s, top = prof[x + 1], tp[x + 1]
    for y = top, s - 1 do P(t, x, y, snowColor(y, s, x, top)) end
    local d = drip[x + 1]
    for k = 1, d do P(t, x, s - 1 + k, k == d and "sky5" or "ink5") end
    bottom[x] = s
  end
  -- side lips: snow rolls over exposed sides
  if mask & W ~= 0 then
    for y = 1, prof[1] + 2 do P(t, 0, y, y < prof[1] + 2 and "ink6" or "ink5") end
    for y = 1, prof[2] + 1 do P(t, 1, y, snowColor(math.min(y, prof[2] - 1), prof[2], 1, 0)) end
  end
  if mask & E ~= 0 then
    for y = 1, prof[16] + 1 do P(t, 15, y, y < prof[16] + 1 and "ink5" or "ink4") end
    for y = 1, prof[15] + 1 do P(t, 14, y, y <= prof[15] - 1 and snowColor(y, prof[15] + 1, 14, 0) or "ink5") end
  end
  return bottom
end

-- Material definitions: fill(t, v, deep), top(t, mask, v) -> draws cap, edge shades.
local MAT = {}

-- Ground: dirt clods with snowy grass top
MAT.ground = {
  material = "dirt", dark = "dirt1", light = "dirt4",
  fill = function(t, v, deep)
    v = v or 0
    local base, body, light, shadow = "dirt2", "dirt3", "dirt4", "dirt1"
    if deep then base, body, light, shadow = "dirt1", "dirt2", "dirt3", "outline" end
    R(t, 0, 0, TS, TS, base)
    local seed = v * 13 + (deep and 200 or 0)
    -- chunky rounded clods at random spots, drawn top to bottom so lower ones overlap (stacked earth).
    -- Kept 1 px off the tile edges, so mixing variants never shows a seam.
    local clods = {}
    local n = 4 + math.floor(H(v, 0, seed) * 2)
    for k = 1, n do
      local rx = 2 + math.floor(H(k, 1, seed) * 2.5)
      local ry = 1 + math.floor(H(k, 2, seed) * 2)
      clods[k] = { rx = rx, ry = ry,
        cx = 1 + rx + math.floor(H(k, 3, seed) * (14 - 2 * rx)),
        cy = 1 + ry + math.floor(H(k, 4, seed) * (12 - 2 * ry)),
        pebble = (not deep) and H(k, 5, seed) < 0.15 }
    end
    table.sort(clods, function(a, b) return a.cy < b.cy end)
    for _, c0 in ipairs(clods) do
      local rx, ry, cx, cy = c0.rx, c0.ry, c0.cx, c0.cy
      for dy = -ry, ry do for dx = -rx, rx do
        if dx * dx / (rx * rx + 0.7) + dy * dy / (ry * ry + 0.7) <= 1 then
          local c = body
          if c0.pebble then c = (dy == -ry) and "ink5" or ((dy == ry or dx == rx) and "ink2" or "ink3")
          elseif dy == -ry or (dx == -rx) then c = light
          elseif dx == rx or dy == ry then c = (dx + dy) % 2 == 0 and base or body end
          P(t, cx + dx, cy + dy, c)
        end
      end end
      for dx = -rx + 1, rx - 1 do P(t, cx + dx, cy + ry + 1, shadow) end
    end
    if v == 2 and deep then -- a root in the deep earth
      local x = 3
      for y = 1, 14 do P(t, x, y, "outline"); if H(x, y, 9) < 0.35 and x < 13 then x = x + 1 end end
    end
  end,
  top = function(t, mask, v)
    local bottom = snowCap(t, mask, v)
    for x = 0, TS - 1 do
      local s = bottom[x]
      if not (x == 0 and mask & W ~= 0) and not (x == 15 and mask & E ~= 0) then
        local d = DRIP[v % 4][x + 1]
        if d == 0 then P(t, x, s, "leaf3") end
        P(t, x, s + 1, (H(x, 1, v) < 0.5) and "leaf2" or "leaf3")
        if H(x, 2, v) < 0.4 then P(t, x, s + 2, "leaf2"); P(t, x, s + 3, "dirt1") else P(t, x, s + 2, "dirt1") end
      end
    end
  end,
}

-- Rock: faceted boulders (wrapped voronoi so every variant tiles), snow cap
local ROCK_SEEDS = { {3,3}, {12,4}, {7,10}, {15,12}, {1,14} }
MAT.rock = {
  material = "stone", dark = "ink1", light = "ink4",
  fill = function(t, v, deep)
    for y = 0, TS - 1 do for x = 0, TS - 1 do
      local d1, d2, best = 1e9, 1e9, nil
      for i, s in ipairs(ROCK_SEEDS) do
        for oy = -1, 1 do for ox = -1, 1 do
          local dx, dy = x - (s[1] + ox * TS), y - (s[2] + oy * TS)
          local d = math.sqrt(dx * dx + dy * dy * 1.6)
          if d < d1 then d2 = d1; d1 = d; best = { dx = dx, dy = dy, i = i } elseif d < d2 then d2 = d end
        end end
      end
      local c
      if d2 - d1 < 1.1 then c = deep and "outline" or "ink1"
      else
        local f = best.dx + best.dy * 1.3
        if f < -3.2 then c = deep and "ink3" or "ink5"
        elseif f < -0.5 then c = deep and "ink2" or "ink4"
        elseif f > 3.5 then c = deep and "ink1" or "ink2"
        else c = deep and "ink2" or "ink3" end
        if (best.i % 3 == 0) and c == "ink3" and not deep then c = (x + y) % 2 == 0 and "ink3" or "ink4" end
      end
      P(t, x, y, c)
    end end
    if v == 1 then P(t, 5, 6, "leaf3"); P(t, 6, 6, "leaf2"); P(t, 12, 12, "leaf3") end
    if v == 2 then L(t, 4, 3, 9, 10, "ink1"); L(t, 9, 10, 11, 14, "ink1") end
  end,
  top = function(t, mask, v)
    local bottom = snowCap(t, mask, v)
    for x = 0, TS - 1 do
      if DRIP[v % 4][x + 1] == 0 and not (x == 0 and mask & W ~= 0) and not (x == 15 and mask & E ~= 0) then
        P(t, x, bottom[x], "ink2")
      end
    end
  end,
}

-- Concrete: cast panels, bolt holes, water stains; ledge cap with a dusting of snow
MAT.concrete = {
  material = "stone", dark = "ink2", light = "ink5",
  fill = function(t, v, deep)
    local base = deep and "ink3" or "ink4"
    R(t, 0, 0, TS, TS, base)
    for x = 0, TS - 1 do P(t, x, 0, deep and "ink4" or "ink5"); P(t, x, 15, "ink2") end
    for y = 0, TS - 1 do P(t, 0, y, deep and "ink4" or "ink5"); P(t, 15, y, "ink2") end
    P(t, 0, 15, "ink3"); P(t, 15, 0, "ink3")
    for y = 1, 14 do for x = 1, 14 do
      local h = H(x, y, 31 + (v or 0))
      if h < 0.05 then P(t, x, y, "ink3") elseif h > 0.985 then P(t, x, y, "ink5") end
    end end
    if v == 1 then -- one rust/water streak
      local sx = 6 + math.floor(H(1, 1, 33) * 5)
      for y = 1, 9 do if H(sx, y, 3) < 0.7 then P(t, sx, y, "ink3") end end
      P(t, sx, 1, "dirt3"); P(t, sx, 2, "dirt2")
    end
    if v == 2 then -- bolt holes
      for _, b in ipairs({ {3,3}, {12,3}, {3,12}, {12,12} }) do P(t, b[1], b[2], "ink2"); P(t, b[1] + 1, b[2] + 1, "ink5") end
    end
    if v == 3 then -- chipped corner
      P(t, 12, 11, "ink2"); P(t, 13, 11, "ink3"); P(t, 11, 12, "ink3"); P(t, 12, 12, "ink2"); P(t, 13, 12, "ink5"); P(t, 12, 13, "ink5")
    end
  end,
  top = function(t, mask, v)
    for x = 0, TS - 1 do
      local s = (H(x, 0, 40 + v) < 0.55) and 2 or 1
      for y = 0, s - 1 do P(t, x, y, y == 0 and "white" or "ink6") end
      P(t, x, s, "ink6"); P(t, x, s + 1, "ink5"); P(t, x, s + 2, "ink4"); P(t, x, s + 3, "ink2")
    end
  end,
}

-- Steel: riveted plates, hazard-striped top
MAT.steel = {
  material = "metal", dark = "steel1", light = "steel4",
  fill = function(t, v, deep)
    R(t, 0, 0, TS, TS, deep and "steel2" or "steel3")
    for x = 0, TS - 1 do P(t, x, 0, "steel4"); P(t, x, 15, "steel1") end
    for y = 0, TS - 1 do P(t, 0, y, "steel4"); P(t, 15, y, "steel1") end
    for _, b in ipairs({ {2,2}, {13,2}, {2,13}, {13,13} }) do P(t, b[1], b[2], "steel5"); P(t, b[1] + 1, b[2] + 1, "steel1") end
    for y = 3, 12 do for x = 2, 13 do if H(x, y, 50 + (v or 0)) < 0.06 then P(t, x, y, deep and "steel1" or "steel2") end end end
    if v == 1 then R(t, 5, 6, 6, 4, "steel2"); R(t, 5, 6, 6, 1, "steel1"); R(t, 6, 7, 4, 1, "steel1") end -- vent slot
    if v == 2 then L(t, 3, 11, 9, 11, "steel4"); L(t, 4, 12, 10, 12, "steel2") end
  end,
  top = function(t, mask, v)
    for x = 0, TS - 1 do
      local s = (H(x, 0, 60 + v) < 0.5) and 1 or 0
      if s == 1 then P(t, x, 0, "white") end
      P(t, x, s, "steel5")
      for y = s + 1, s + 4 do P(t, x, y, ((x + y) // 3) % 2 == 0 and "fire4" or "outline") end
      P(t, x, s + 5, "steel1")
    end
  end,
}

local function terrainTile(mat, mask, v, opt)
  opt = opt or {}
  local m = MAT[mat]
  local t = T()
  m.fill(t, (opt.fillv ~= nil) and opt.fillv or ((mask ~= 0) and 0 or v), opt.deep)
  -- side edges
  if mask & W ~= 0 then for y = 0, TS - 1 do P(t, 1, y, m.light); P(t, 0, y, "outline") end end
  if mask & E ~= 0 then for y = 0, TS - 1 do P(t, 14, y, m.dark); P(t, 15, y, "outline") end end
  if mask & S ~= 0 then
    for x = 0, TS - 1 do P(t, x, 14, m.dark); P(t, x, 15, "outline") end
    if mat == "ground" then for x = 1, 14 do if H(x, 15, v) < 0.25 then P(t, x, 15, "dirt2") end end end
  end
  if mask & N ~= 0 then m.top(t, mask, v) end
  -- rounded convex corners
  local function carve(cx, cy, sx, sy)
    P(t, cx, cy, nil); P(t, cx + sx, cy, nil); P(t, cx, cy + sy, nil)
    P(t, cx + sx, cy + sy, "outline")
  end
  if mask & N ~= 0 and mask & W ~= 0 then P(t, 0, 0, nil); P(t, 1, 0, nil); P(t, 0, 1, nil) end
  if mask & N ~= 0 and mask & E ~= 0 then P(t, 15, 0, nil); P(t, 14, 0, nil); P(t, 15, 1, nil) end
  if mask & S ~= 0 and mask & W ~= 0 then carve(0, 15, 1, -1) end
  if mask & S ~= 0 and mask & E ~= 0 then carve(15, 15, -1, -1) end
  -- inner corners
  if opt.ic == "tl" or opt.ic == "tr" then
    local sx = opt.ic == "tl" and 0 or 15
    local dir = opt.ic == "tl" and 1 or -1
    if mat == "ground" or mat == "rock" then
      for k = 0, 3 do for j = 0, 3 - k do P(t, sx + dir * k, j, (j == 0 and "white") or (j == 3 - k and "ink5") or "ink6") end end
      if mat == "ground" then P(t, sx + dir * 0, 4, "leaf3"); P(t, sx + dir * 1, 3, "leaf3"); P(t, sx + dir * 2, 2, "leaf2") end
    else
      P(t, sx, 0, "ink2"); P(t, sx + dir, 0, m.dark); P(t, sx, 1, m.dark)
    end
  elseif opt.ic == "bl" or opt.ic == "br" then
    local sx = opt.ic == "bl" and 0 or 15
    local dir = opt.ic == "bl" and 1 or -1
    P(t, sx, 15, "outline"); P(t, sx + dir, 15, m.dark); P(t, sx, 14, m.dark)
  end
  return t
end

local TERRAIN_ROWS = { ground = 0, rock = 1, concrete = 2, steel = 3 }
for mat, row in pairs(TERRAIN_ROWS) do
  local m = MAT[mat]
  local function both(col, name, t, mask)
    -- snow-capped tops of earth/rock report "snow" so shots kick up snow puffs there
    local material = m.material
    if mask and (mask & N ~= 0) and (mat == "ground" or mat == "rock") then material = "snow" end
    put(col, row, mat .. "_" .. name, t, { collides = true, material = material })
    put(col, row + 4, mat .. "_bg_" .. name, remap(t, BG_MAP), {})
  end
  for mask = 0, 15 do both(mask, "m" .. mask, terrainTile(mat, mask, 0), mask) end
  for i, ic in ipairs({ "tl", "tr", "bl", "br" }) do both(15 + i, "ic_" .. ic, terrainTile(mat, 0, 0, { ic = ic })) end
  for v = 1, 3 do both(19 + v, "fill_v" .. v, terrainTile(mat, 0, v)) end
  for v = 0, 3 do both(23 + v, "deep_v" .. v, terrainTile(mat, 0, v, { deep = true, fillv = v })) end
  for v = 1, 3 do both(26 + v, "top_v" .. v, terrainTile(mat, N, v, { fillv = v }), N) end
end

---------------------------------------------------------------------------------------------------
-- Row 8: one-way platforms and solid sandbags
local ROW = 8
local ONEWAY_WOOD = { collides = true, oneway = true, material = "wood" }
local ONEWAY_METAL = { collides = true, oneway = true, material = "metal" }

local function snowDust(t, x0, x1, y, seed)
  for x = x0, x1 do
    local h = H(x, y, seed)
    if h < 0.55 then P(t, x, y, h < 0.2 and "white" or "ink6") end
  end
end

-- wooden plank platform (top 7 px)
local function plank(kind, v)
  local t = T()
  for x = 0, TS - 1 do
    P(t, x, 1, "sand4"); P(t, x, 2, "sand3"); P(t, x, 3, "sand3"); P(t, x, 4, "sand3"); P(t, x, 5, "sand2"); P(t, x, 6, "outline")
    if H(x, 3, v) < 0.3 then P(t, x, 3, "sand2") end
  end
  -- seam + nails
  local seam = (v == 1) and 9 or 15
  for y = 1, 5 do P(t, seam, y, "sand1") end
  P(t, seam - 2, 2, "ink5"); P(t, seam - 2, 4, "ink5"); P(t, (seam + 2) % 16, 2, "ink5"); P(t, (seam + 2) % 16, 4, "ink5")
  snowDust(t, 0, 15, 0, 70 + v)
  -- support brackets under the plank
  if kind == "l" or kind == "r" then
    local bx = kind == "l" and 3 or 10
    R(t, bx, 7, 3, 3, "dirt3"); R(t, bx, 9, 3, 1, "dirt2"); P(t, bx + 1, 10, "dirt2"); R(t, bx, 7, 3, 1, "dirt4")
    L(t, bx - 1, 7, bx - 1, 9, "outline"); L(t, bx + 3, 7, bx + 3, 9, "outline"); P(t, bx, 10, "outline"); P(t, bx + 2, 10, "outline"); P(t, bx + 1, 11, "outline")
  end
  if kind == "l" then
    for y = 0, 6 do P(t, 0, y, nil) end
    for y = 1, 5 do P(t, 1, y, "outline") end
    P(t, 2, 1, "sand5")
    P(t, 1, 0, nil); P(t, 2, 0, nil)
  elseif kind == "r" then
    for y = 0, 6 do P(t, 15, y, nil) end
    for y = 1, 5 do P(t, 14, y, "outline") end
    P(t, 13, 5, "sand1"); P(t, 14, 0, nil); P(t, 13, 0, nil)
  end
  return t
end
put(0, ROW, "plank_l", plank("l", 0), ONEWAY_WOOD)
put(1, ROW, "plank_m", plank("m", 0), ONEWAY_WOOD)
put(2, ROW, "plank_m2", plank("m", 1), ONEWAY_WOOD)
put(3, ROW, "plank_r", plank("r", 0), ONEWAY_WOOD)

-- log platform (top ~10 px)
local function log(kind, v)
  local t = T()
  for x = 0, TS - 1 do
    P(t, x, 2, "dirt4"); P(t, x, 3, "dirt3"); P(t, x, 4, "dirt3"); P(t, x, 5, "dirt3")
    P(t, x, 6, "dirt2"); P(t, x, 7, "dirt2"); P(t, x, 8, "dirt1"); P(t, x, 9, "outline")
    if H(x, 4, v + 5) < 0.18 then P(t, x, 4, "dirt2"); P(t, x, 5, "dirt2") end
    if H(x, 2, v + 5) < 0.25 then P(t, x, 3, "dirt4") end
  end
  -- snow cap (2 px, lumpy)
  for x = 0, TS - 1 do
    P(t, x, 1, "ink6")
    if H(x, 0, v + 80) < 0.6 then P(t, x, 0, "white") end
    if H(x, 2, v + 81) < 0.15 then P(t, x, 2, "ink5") end
  end
  if v == 1 then -- knot
    P(t, 7, 5, "dirt1"); P(t, 8, 5, "dirt1"); P(t, 7, 4, "dirt2"); P(t, 8, 6, "dirt4")
  end
  local function cap(x0, dir)
    -- end grain rings (ellipse 6x9)
    for y = 1, 9 do for i = 0, 5 do P(t, x0 + dir * i, y, nil) end end
    local rows = { "..oo..", ".oaao.", "oabbao", "abccba", "abcdba", "abccba", "oabbao", ".oaao.", "..oo.." }
    local keys = { o = "outline", a = "sand2", b = "sand3", c = "sand4", d = "sand2" }
    for j, r in ipairs(rows) do for i = 1, 6 do
      local ch = r:sub(i, i)
      if ch ~= "." then P(t, x0 + dir * (i - 1), j, keys[ch]) end
    end end
    P(t, x0 + dir * 1, 0, "white"); P(t, x0 + dir * 2, 0, "white"); P(t, x0 + dir * 3, 0, "ink6")
  end
  if kind == "l" then cap(0, 1) elseif kind == "r" then cap(15, -1) end
  return t
end
put(4, ROW, "log_l", log("l", 0), ONEWAY_WOOD)
put(5, ROW, "log_m", log("m", 0), ONEWAY_WOOD)
put(6, ROW, "log_m2", log("m", 1), ONEWAY_WOOD)
put(7, ROW, "log_r", log("r", 0), ONEWAY_WOOD)

-- pine branch platform: snowy branch with needle clumps hanging below
local function needles(t, x0, x1, ytop, seed)
  for x = x0, x1 do
    local len = 3 + math.floor(H(x, 0, seed) * 4)
    if (x - x0) % 4 == 0 or (x1 - x) % 4 == 0 then len = len - 1 end
    for y = 0, len do
      local c = (y == len) and "leaf1" or ((y < 2) and "leaf3" or "leaf2")
      if y == 0 and x % 3 == 0 then c = "leaf4" end
      P(t, x, ytop + y, c)
    end
  end
end
local function branch(kind, v)
  local t = T()
  needles(t, kind == "r" and 0 or 0, kind == "r" and 11 or 15, 6, 90 + v)
  local y0, th = 2, 3
  for x = 0, TS - 1 do
    local thick = th
    if kind == "r" then thick = (x < 8) and 3 or ((x < 12) and 2 or 1) end
    if kind == "l" then thick = (x < 4) and 4 or 3 end
    P(t, x, y0, "dirt4")
    for y = y0 + 1, y0 + thick - 1 do P(t, x, y, "dirt3") end
    P(t, x, y0 + thick, "dirt2"); P(t, x, y0 + thick + 1, "outline")
    if kind == "r" and x > 13 then for y = 0, 15 do P(t, x, y, nil) end end
  end
  for x = 0, TS - 1 do
    if not (kind == "r" and x > 13) then
      P(t, x, 1, "ink6"); if H(x, 0, v + 91) < 0.65 then P(t, x, 0, "white") end
    end
  end
  if kind == "r" then needles(t, 10, 15, 3, 93); for x = 10, 15 do P(t, x, 2, "ink6"); P(t, x, 3, x % 2 == 0 and "leaf4" or "leaf3") end end
  return t
end
put(8, ROW, "branch_l", branch("l", 0), ONEWAY_WOOD)
put(9, ROW, "branch_m", branch("m", 0), ONEWAY_WOOD)
put(10, ROW, "branch_r", branch("r", 0), ONEWAY_WOOD)

-- rope bridge deck: plank ends lashed with rope
local function bridge(v)
  local t = T()
  for x = 0, TS - 1 do
    local b = (x + v) % 4
    if b == 3 then
      P(t, x, 2, "sand1"); P(t, x, 3, "outline"); P(t, x, 4, "outline")
    else
      P(t, x, 1, b == 0 and "sand5" or "sand4"); P(t, x, 2, "sand3"); P(t, x, 3, "sand3"); P(t, x, 4, b == 2 and "sand2" or "sand3")
      if H(x, 1, v) < 0.25 then P(t, x, 2, "sand2") end
    end
    -- rope under deck
    P(t, x, 5, (x % 3 == 0) and "sand3" or "sand4"); P(t, x, 6, "sand2"); P(t, x, 7, "outline")
  end
  snowDust(t, 0, 15, 0, 120 + v)
  if v == 2 then for y = 1, 4 do P(t, 6, y, "dirt2") end; P(t, 7, 1, "sand2") end -- a darker, worn plank
  return t
end
put(11, ROW, "bridge_a", bridge(0), ONEWAY_WOOD)
put(12, ROW, "bridge_b", bridge(1), ONEWAY_WOOD)
put(13, ROW, "bridge_c", bridge(2), ONEWAY_WOOD)

-- steel catwalk grating
local function catwalk(kind, v)
  local t = T()
  for x = 0, TS - 1 do
    P(t, x, 0, "steel5"); P(t, x, 1, "steel4")
    P(t, x, 2, (x % 3 == 0) and "steel4" or "steel1"); P(t, x, 3, (x % 3 == 0) and "steel3" or "steel1")
    P(t, x, 4, "steel3"); P(t, x, 5, "steel2"); P(t, x, 6, "outline")
  end
  if v == 1 then for x = 4, 11 do P(t, x, 4, ((x // 2) % 2 == 0) and "fire4" or "outline") end end
  if kind == "l" then for y = 0, 6 do P(t, 0, y, "outline") end; R(t, 1, 7, 2, 3, "steel3"); R(t, 1, 10, 2, 1, "outline"); P(t, 3, 7, "outline"); P(t, 3, 8, "outline") end
  if kind == "r" then for y = 0, 6 do P(t, 15, y, "outline") end; R(t, 13, 7, 2, 3, "steel2"); R(t, 13, 10, 2, 1, "outline"); P(t, 12, 7, "outline"); P(t, 12, 8, "outline") end
  return t
end
put(14, ROW, "catwalk_l", catwalk("l", 0), ONEWAY_METAL)
put(15, ROW, "catwalk_m", catwalk("m", 0), ONEWAY_METAL)
put(16, ROW, "catwalk_m2", catwalk("m", 1), ONEWAY_METAL)
put(17, ROW, "catwalk_r", catwalk("r", 0), ONEWAY_METAL)

-- sandbag wall (solid cover). Two staggered rows of bags per tile.
local function bag(t, x0, y0, w, seed)
  -- rounded bag w x 8: highlight top-left, tie crease, shadow bottom
  for x = 0, w - 1 do for y = 0, 7 do
    local edgeX = (x == 0 or x == w - 1)
    local c = "sand3"
    if y == 0 or (edgeX and (y == 1 or y == 7)) then c = nil
    elseif y == 1 or (x == 1 and y < 6) then c = "sand4"
    elseif y >= 6 or x == w - 2 then c = "sand2" end
    if edgeX and c then c = "sand2" end
    if c then P(t, x0 + x, y0 + y, c) end
  end end
  P(t, x0 + 2, y0 + 1, "sand5")
  -- crease
  local cx = x0 + math.floor(w / 2)
  P(t, cx, y0 + 3, "sand2"); P(t, cx, y0 + 4, "sand1")
  for x = 1, w - 2 do P(t, x0 + x, y0 + 7, "sand1") end
end
local function sandbags(kind, top)
  local t = T()
  -- back fill so gaps read as shadow
  R(t, 0, top and 2 or 0, TS, TS - (top and 2 or 0), "outline")
  -- row A (y 0..7) bags at x -4,4,12 ; row B (y 8..15) bags at x 0,8
  for _, bx in ipairs({ -4, 4, 12 }) do bag(t, bx, 0 + (top and 1 or 0), 8, bx) end
  for _, bx in ipairs({ 0, 8 }) do bag(t, bx, 8, 8, bx + 3) end
  if top then
    for x = 0, TS - 1 do
      local y = 1
      while y < 4 and not A(t, x, y) do y = y + 1 end
      if y < 4 then P(t, x, y - 1, (H(x, 0, 7) < 0.5) and "white" or "ink6") end
    end
    R(t, 0, 0, TS, 1, nil); R(t, 0, 1, TS, 0, nil)
  end
  if kind == "l" then
    for y = 0, 15 do if A(t, 0, y) then P(t, 0, y, (A(t, 0, y) and y % 8 ~= 0) and "outline" or nil) end end
  elseif kind == "r" then
    for y = 0, 15 do if A(t, 15, y) then P(t, 15, y, "outline") end end
  end
  return t
end
local SAND = { collides = true, material = "dirt" }
put(18, ROW, "sandbag_tl", sandbags("l", true), SAND)
put(19, ROW, "sandbag_tm", sandbags("m", true), SAND)
put(20, ROW, "sandbag_tr", sandbags("r", true), SAND)
put(21, ROW, "sandbag_ml", sandbags("l", false), SAND)
put(22, ROW, "sandbag_mm", sandbags("m", false), SAND)
put(23, ROW, "sandbag_mr", sandbags("r", false), SAND)

-- spikes (hazard)
local function spikes(wood)
  local t = T()
  for i = 0, 3 do
    local bx = i * 4
    for y = 0, 7 do
      local hw = math.floor(y / 4)
      for dx = -hw, hw + 1 do
        local x = bx + 1 + dx
        local c = wood and "dirt3" or "steel3"
        if dx <= 0 then c = wood and "dirt4" or "steel5" end
        if dx == hw + 1 then c = wood and "dirt2" or "steel2" end
        P(t, x, 7 + y, c)
      end
    end
    P(t, bx + 1, 6, "outline")
  end
  for x = 0, TS - 1 do P(t, x, 15, wood and "dirt1" or "steel1") end
  if wood then for _, x in ipairs({ 1, 9 }) do P(t, x, 8, "red3") end end
  return t
end
put(24, ROW, "spikes", spikes(false), { hazard = "spikes" })
put(25, ROW, "spikes_wood", spikes(true), { hazard = "spikes" })

---------------------------------------------------------------------------------------------------
-- Row 9: water (animated), posts, rope rails, railings, ladders, chains
ROW = 9
local function waterTop(f)
  local t = T()
  for x = 0, TS - 1 do
    local ph = (x + f * 4) / 16 * 2 * math.pi
    local crest = 4 + math.floor(math.sin(ph) * 1.5 + 0.5)
    P(t, x, crest, ((x + f) % 5 == 0) and "white" or "sky5")
    P(t, x, crest + 1, "sky4")
    for y = crest + 2, TS - 1 do P(t, x, y, y < crest + 5 and "sky3" or "sky2") end
    -- foam flecks above the crest
    if H(x + f * 4, 0, 3) < 0.12 then P(t, x, crest - 1, "white") end
    -- shimmer dashes drifting right
    local sx = wrap(x - f * 2)
    if H(sx, 9, 4) < 0.18 then P(t, x, 9, "sky3") end
    if H(sx, 12, 4) < 0.12 then P(t, x, 12, "sky4") end
  end
  return t
end
local function waterBody(f, deep)
  local t = T()
  R(t, 0, 0, TS, TS, deep and "sky1" or "sky2")
  for y = 0, TS - 1 do for x = 0, TS - 1 do
    local sx = wrap(x - f * 2 - (y % 3))
    local h = H(sx, y, deep and 77 or 66)
    if h < 0.07 then P(t, x, y, deep and "sky2" or "sky3") elseif h > 0.95 then P(t, x, y, deep and "outline" or "sky1") end
  end end
  if not deep then for x = 0, TS - 1 do if (x + f * 2) % 8 < 3 then P(t, x, 15, "sky1") end end end
  return t
end
local WATER = { hazard = "water", material = "water" }
local wtop, wbody = {}, {}
for f = 0, 3 do wtop[f] = put(f, ROW, "water_top_f" .. f, waterTop(f), WATER) end
for f = 0, 3 do wbody[f] = put(4 + f, ROW, "water_body_f" .. f, waterBody(f, false), WATER) end
put(8, ROW, "water_deep", waterBody(0, true), WATER)
byName["water_top_f0"].anim = { { id = wtop[0], ms = 140 }, { id = wtop[1], ms = 140 }, { id = wtop[2], ms = 140 }, { id = wtop[3], ms = 140 } }
byName["water_body_f0"].anim = { { id = wbody[0], ms = 180 }, { id = wbody[1], ms = 180 }, { id = wbody[2], ms = 180 }, { id = wbody[3], ms = 180 } }

-- wooden support post (6 px log, centered)
local function post(kind)
  local t = T()
  for y = 0, TS - 1 do
    P(t, 4, y, "outline"); P(t, 5, y, "dirt4"); P(t, 6, y, "dirt3"); P(t, 7, y, "dirt3"); P(t, 8, y, "dirt3"); P(t, 9, y, "dirt2"); P(t, 10, y, "dirt1"); P(t, 11, y, "outline")
    if H(7, y, 5) < 0.2 then P(t, 7, y, "dirt2") end
  end
  if kind == "top" then
    for y = 0, 1 do for x = 4, 11 do P(t, x, y, nil) end end
    for x = 5, 10 do P(t, x, 2, "sand3") end; for x = 4, 11 do P(t, x, 1, "outline") end
    P(t, 6, 0, "ink6"); P(t, 7, 0, "white"); P(t, 8, 0, "ink6")
    -- cross beam lashing
    for x = 4, 11 do P(t, x, 6, "sand4"); P(t, x, 7, "sand2") end
  elseif kind == "base" then
    for x = 2, 13 do for y = 12, 15 do
      if (math.abs(x - 7.5) <= 4 + (y - 12)) then P(t, x, y, (y == 12) and "ink6" or ((y == 13) and "white" or "ink5")) end
    end end
  end
  return t
end
put(9, ROW, "post_top", post("top"), {})
put(10, ROW, "post_mid", post("mid"), {})
put(11, ROW, "post_base", post("base"), {})

-- bridge post with a rope knot
local function bridgePost(kind)
  local t = post(kind == "top" and "mid" or "mid")
  if kind == "top" then
    for y = 0, 2 do for x = 4, 11 do P(t, x, y, nil) end end
    -- carved point
    P(t, 7, 0, "dirt4"); P(t, 8, 0, "dirt3"); for x = 6, 9 do P(t, x, 1, x < 8 and "dirt4" or "dirt2") end
    for x = 5, 10 do P(t, x, 2, x < 7 and "dirt4" or "dirt3") end
    P(t, 6, 0, "outline"); P(t, 9, 0, "outline"); P(t, 5, 1, "outline"); P(t, 10, 1, "outline"); P(t, 4, 2, "outline"); P(t, 11, 2, "outline")
    P(t, 7, 0, "white")
    -- rope knot at y 3..5 wrapping the post, rope leaving both sides
    for x = 4, 11 do P(t, x, 3, "sand4"); P(t, x, 4, "sand3"); P(t, x, 5, "sand2") end
    for x = 0, 3 do P(t, x, 3, "sand4"); P(t, x, 4, "sand2") end
    for x = 12, 15 do P(t, x, 3, "sand4"); P(t, x, 4, "sand2") end
  end
  return t
end
put(12, ROW, "bridge_post_top", bridgePost("top"), {})
put(13, ROW, "bridge_post_mid", bridgePost("mid"), {})

-- rope rails (handrail sag). Name rope_<yL>_<yR>. Hangers drop to the deck below.
local RAILS = { {3,3}, {3,5}, {5,7}, {7,8}, {8,8}, {8,7}, {7,5}, {5,3} }
for i, r in ipairs(RAILS) do
  local t = T()
  for _, hx in ipairs({ 4, 12 }) do
    local ry = math.floor(r[1] + (r[2] - r[1]) * hx / 15 + 0.5)
    for y = ry + 1, TS - 1 do P(t, hx, y, (y % 3 == 0) and "sand3" or "sand2") end
  end
  -- rope: 2 px, highlight on top
  local prev
  for x = 0, TS - 1 do
    local y = math.floor(r[1] + (r[2] - r[1]) * x / 15 + 0.5)
    P(t, x, y, (x % 3 == 1) and "sand5" or "sand4"); P(t, x, y + 1, "sand2")
    if prev and prev ~= y then P(t, x - 1, y, "sand3") end
    prev = y
  end
  put(13 + i, ROW, "rope_" .. r[1] .. "_" .. r[2], t, {})
end

-- catwalk truss (under catwalks), railing, ladder, chain
local truss = T()
for y = 0, TS - 1 do P(truss, 0, y, "steel2"); P(truss, 15, y, "steel2") end
L(truss, 1, 0, 14, 15, "steel3"); L(truss, 1, 15, 14, 0, "steel3"); L(truss, 2, 0, 15, 14, "steel1")
put(22, ROW, "truss", truss, {})
local rail = T()
for x = 0, TS - 1 do P(rail, x, 4, "steel5"); P(rail, x, 5, "steel3"); P(rail, x, 6, "outline"); P(rail, x, 11, "steel4"); P(rail, x, 12, "steel2") end
put(23, ROW, "railing", rail, {})
local railp = T()
for x = 0, TS - 1 do P(railp, x, 4, "steel5"); P(railp, x, 5, "steel3"); P(railp, x, 6, "outline"); P(railp, x, 11, "steel4"); P(railp, x, 12, "steel2") end
for y = 3, 15 do P(railp, 7, y, "steel4"); P(railp, 8, y, "steel2"); P(railp, 6, y, "outline"); P(railp, 9, y, "outline") end
P(railp, 7, 3, "steel5"); P(railp, 8, 3, "steel5")
put(24, ROW, "railing_post", railp, {})
local function ladder(top)
  local t = T()
  for y = top and 2 or 0, TS - 1 do P(t, 3, y, "steel4"); P(t, 4, y, "steel2"); P(t, 11, y, "steel4"); P(t, 12, y, "steel2") end
  for _, ry in ipairs({ 4, 10 }) do for x = 5, 10 do P(t, x, ry, "steel4"); P(t, x, ry + 1, "steel1") end end
  if top then P(t, 3, 1, "steel5"); P(t, 11, 1, "steel5"); P(t, 4, 1, "steel3"); P(t, 12, 1, "steel3") end
  return t
end
put(25, ROW, "ladder_top", ladder(true), {})
put(26, ROW, "ladder_mid", ladder(false), {})
local function chain(hook)
  local t = T()
  for y = 0, (hook and 8 or 15) do
    if y % 4 < 2 then P(t, 7, y, "steel4"); P(t, 8, y, "steel2") else P(t, 6, y, "steel4"); P(t, 9, y, "steel2"); P(t, 7, y, "outline"); P(t, 8, y, "outline") end
  end
  if hook then
    for _, p in ipairs({ {7,9}, {7,10}, {7,11}, {8,12}, {9,12}, {10,11}, {10,10} }) do P(t, p[1], p[2], "steel4") end
    P(t, 6, 10, "steel2"); P(t, 6, 11, "steel2"); P(t, 7, 12, "steel2"); P(t, 10, 9, "steel5")
  end
  return t
end
put(27, ROW, "chain", chain(false), {})
put(28, ROW, "chain_hook", chain(true), {})
local hang = T()
for _, hx in ipairs({ 4, 12 }) do for y = 0, TS - 1 do P(hang, hx, y, (y % 3 == 0) and "sand3" or "sand2") end end
put(29, ROW, "rope_hangers", hang, {})

---------------------------------------------------------------------------------------------------
-- Row 10: fences, palisade, barbed wire, hazard trim, tree trunks, pine foliage 9-slice
ROW = 10
local function mesh(t, y0, y1)
  for y = y0, y1 do for x = 0, TS - 1 do
    local a, b = (x + y) % 6, (x - y) % 6
    if a == 0 then P(t, x, y, "ink3") elseif b == 0 then P(t, x, y, "ink2") end
  end end
end
local function barb(t, y)
  for x = 0, TS - 1 do P(t, x, y, (x % 2 == 0) and "ink4" or "ink3") end
  for _, bx in ipairs({ 2, 8, 13 }) do P(t, bx - 1, y - 1, "ink4"); P(t, bx + 1, y + 1, "ink3"); P(t, bx + 1, y - 1, "ink3"); P(t, bx - 1, y + 1, "ink2") end
end
local function fence(kind)
  local t = T()
  local isPost = kind:sub(1, 4) == "post"
  local part = kind:gsub("post_", "")
  if part == "top" then
    barb(t, 2)
    for x = 0, TS - 1 do P(t, x, 5, "steel4"); P(t, x, 6, "steel2") end
    mesh(t, 7, 15)
  elseif part == "mid" then
    mesh(t, 0, 15)
  else
    mesh(t, 0, 11)
    for x = 0, TS - 1 do P(t, x, 9, "steel4"); P(t, x, 10, "steel2")
      local d = 12 + math.floor(H(x, 0, 12) * 2)
      for y = d, 15 do P(t, x, y, (y == d) and "white" or "ink6") end
    end
  end
  if isPost then
    for y = (part == "top") and 0 or 0, 15 do
      P(t, 6, y, "outline"); P(t, 7, y, "steel4"); P(t, 8, y, "steel3"); P(t, 9, y, "steel2"); P(t, 10, y, "outline")
    end
    if part == "top" then
      for x = 6, 10 do P(t, x, 0, "outline") end; P(t, 7, 1, "steel5")
      -- barbed arm angled outwards (camp side)
      L(t, 10, 3, 14, 0, "steel3"); L(t, 10, 4, 15, 0, "outline")
    elseif part == "base" then
      for x = 4, 12 do P(t, x, 13, "white"); P(t, x, 14, "ink6"); P(t, x, 15, "ink6") end
    end
  end
  return t
end
for i, k in ipairs({ "top", "mid", "base", "post_top", "post_mid", "post_base" }) do put(i - 1, ROW, "fence_" .. k, fence(k), {}) end

local function stakes(top)
  local t = T()
  for i = 0, 3 do
    local bx = i * 4
    for y = 0, TS - 1 do
      P(t, bx, y, "outline"); P(t, bx + 1, y, "dirt4"); P(t, bx + 2, y, "dirt3"); P(t, bx + 3, y, "dirt2")
      if H(bx, y, 13) < 0.2 then P(t, bx + 2, y, "dirt2") end
    end
    if top then
      local tipY = 2 + (i % 2)
      for y = 0, tipY + 1 do for x = bx, bx + 3 do P(t, x, y, nil) end end
      P(t, bx + 1, tipY, "dirt4"); P(t, bx + 2, tipY, "outline"); P(t, bx + 1, tipY - 1, "outline")
      P(t, bx + 1, tipY + 1, "dirt4"); P(t, bx + 2, tipY + 1, "dirt3"); P(t, bx + 3, tipY + 1, "outline")
      P(t, bx + 2, tipY + 2, "white"); P(t, bx + 1, tipY + 2, "ink6")
      -- rope binding
      for x = bx, bx + 3 do P(t, x, 9, "sand4"); P(t, x, 10, "sand2") end
    end
  end
  return t
end
put(6, ROW, "stake_top", stakes(true), {})
put(7, ROW, "stake_mid", stakes(false), {})

local coil = T()
for i = 0, 1 do
  local cx = i * 8 + 4
  for a = 0, 47 do
    local ang = a / 48 * 2 * math.pi
    local x = math.floor(cx + math.cos(ang) * 5.5 + 0.5)
    local y = math.floor(10 + math.sin(ang) * 5 + 0.5)
    P(coil, wrap(x), y, (math.sin(ang) < 0) and "ink4" or "ink2")
  end
end
for _, b in ipairs({ {1,6}, {6,5}, {10,7}, {14,6}, {3,14}, {12,14} }) do P(coil, b[1], b[2], "ink5"); P(coil, b[1] + 1, b[2] - 1, "ink3") end
put(8, ROW, "barbwire_coil", coil, {})
local strand = T(); barb(strand, 6); barb(strand, 11)
put(9, ROW, "barbwire_strand", strand, {})

local hz = T()
for x = 0, TS - 1 do
  P(hz, x, 0, "outline")
  for y = 1, 6 do P(hz, x, y, ((x + y) // 3) % 2 == 0 and "fire4" or "outline") end
  P(hz, x, 1, ((x + 1) // 3) % 2 == 0 and "fire5" or "ink1"); P(hz, x, 7, "outline")
end
put(10, ROW, "hazard_band", hz, {})
local hzp = T()
for y = 0, TS - 1 do
  P(hzp, 4, y, "outline"); P(hzp, 11, y, "outline")
  for x = 5, 10 do P(hzp, x, y, ((x + y) // 3) % 2 == 0 and "fire4" or "outline") end
  P(hzp, 5, y, ((5 + y) // 3) % 2 == 0 and "fire5" or "ink1")
end
put(11, ROW, "hazard_post", hzp, {})

-- big tree trunk (2 tiles wide)
local function trunk(side, base)
  local t = T()
  for y = 0, TS - 1 do for x = 0, TS - 1 do
    local gx = side == "l" and x or x + 16 -- 0..31 across trunk
    local c = "dirt3"
    if gx < 4 then c = "dirt4" elseif gx > 26 then c = "dirt1" elseif gx > 21 then c = "dirt2" end
    -- vertical bark grooves
    local groove = ({ 6, 11, 17, 23, 28 })
    for _, g in ipairs(groove) do
      local gxw = g + math.floor(math.sin((y + g) / 5) * 1.2)
      if gx == gxw then c = (gx < 16) and "dirt2" or "dirt1" end
    end
    if H(gx, y, 14) < 0.05 then c = "dirt4" end
    P(t, x, y, c)
  end end
  if side == "l" then for y = 0, TS - 1 do P(t, 0, y, "outline"); P(t, 1, y, "dirt3") end
  else for y = 0, TS - 1 do P(t, 15, y, "outline") end end
  if base then
    for y = 10, TS - 1 do
      local spread = (y - 10)
      if side == "l" then for x = 0, 2 + spread do P(t, x, y, nil) end; P(t, 3 + spread, y, nil) else for x = 13 - spread, 15 do P(t, x, y, nil) end end
    end
    -- root flare
    if side == "l" then for y = 9, 15 do P(t, 1 + (y - 9), y, "outline"); P(t, 2 + (y - 9), y, "dirt4") end
    else for y = 9, 15 do P(t, 14 - (y - 9), y, "outline"); P(t, 13 - (y - 9), y, "dirt1") end end
    -- snow drift
    for x = 0, TS - 1 do local d = 13 + math.floor(H(x, 1, side == "l" and 1 or 2) * 2); for y = d, 15 do P(t, x, y, y == d and "white" or "ink6") end end
  end
  return t
end
put(12, ROW, "trunk_l", trunk("l", false), {})
put(13, ROW, "trunk_r", trunk("r", false), {})
put(14, ROW, "trunk_base_l", trunk("l", true), {})
put(15, ROW, "trunk_base_r", trunk("r", true), {})

-- pine boughs: drooping needle fans with snow on top. A 32x32 cluster split into 2x2 tiles,
-- plus a 16x16 small clump. Placed in the back layer at branch tips and along trunks.
local function fan(img, cx, cy, w, h, seed)
  local function px(x, y, c) if x >= 0 and x < img.width and y >= 0 and y < img.height then img:drawPixel(x, y, K.color(c)) end end
  for x = cx - w, cx + w do
    local dx = (x - cx) / w
    local top = math.floor(cy - h + dx * dx * h * 0.9 + 0.5)
    local tipLong = ((x - cx) % 3 == 0) and 2 or ((x - cx) % 3 == 1 and 1 or 0)
    local bot = math.floor(cy + 1 + dx * dx * 2 + 0.5) + tipLong
    for y = top, bot do
      local c = "leaf3"
      local fromTop, fromBot = y - top, bot - y
      if fromBot == 0 then c = "leaf1"
      elseif fromBot <= 1 or y > cy + 1 then c = "leaf2"
      elseif fromTop == 0 then c = (math.abs(dx) < 0.75) and "white" or "leaf4"
      elseif fromTop == 1 then c = (math.abs(dx) < 0.6) and ((x % 3 == 0) and "sky5" or "ink6") or "leaf4"
      elseif fromTop == 2 and dx < 0 then c = "leaf4"
      elseif dx > 0.45 then c = "leaf2" end
      if c == "leaf3" and H(x, y, seed) < 0.12 then c = "leaf2" end
      px(x, y, c)
    end
  end
end
local clump = Image(16, 16, ColorMode.RGB)
fan(clump, 8, 13, 7, 4, 5); fan(clump, 7, 8, 5, 4, 6)
local ct = T(); ct:drawImage(clump, Point(0, 0))
put(16, ROW, "bough_s", ct, {})

-- pine tiers: a drooping needle mass that wraps a branch, n tiles long x 3 rows. The branch platform
-- (ground layer) sits on the top of the middle row. Drawn for the right side; left side = flipped.
local function tierImage(n)
  local w, h = n * 16, 48
  local img = Image(w, h, ColorMode.RGB)
  local function px(x, y, c) if x >= 0 and x < w and y >= 0 and y < h then img:drawPixel(x, y, K.color(c)) end end
  for x = 0, w - 1 do
    local t = x / (w - 1)
    local top = math.floor(5 + (t ^ 1.6) * 15 + 0.5)
    if x > w - 4 then top = top + (x - (w - 4)) end
    local jag = (x % 4 == 0) and 3 or ((x % 4 == 2) and 1 or 0)
    local bot = math.floor(31 + t * 8 + 0.5) + jag
    for y = top, math.min(h - 1, bot) do
      local d = y - top
      local c
      local snowT = (t < 0.85) and 3 or 1
      if d < snowT then c = (d == 0) and "white" or ((d == snowT - 1) and ((x % 2 == 0) and "sky5" or "ink5") or "ink6")
      else
        local k = (y - top - snowT + math.floor(t * 3)) % 6
        if k == 0 then c = "leaf4" elseif k == 1 then c = "leaf3" elseif k == 5 then c = ((x + y) % 3 == 0) and "leaf1" or "leaf2"
        else c = (t > 0.7 or y > bot - 3) and "leaf2" or "leaf3" end
        if y == bot then c = "leaf1" end
        if x < 3 then c = (c == "leaf4") and "leaf3" or "leaf2" end
      end
      px(x, y, c)
    end
  end
  return img
end
local function putTier(n, col, row)
  local img = tierImage(n)
  for r = 0, 2 do for c = 0, n - 1 do
    local t = T(); t:drawImage(img, Point(-c * 16, -r * 16))
    local cc, rr = col + c + r * n, row
    while cc >= COLS do cc = cc - COLS; rr = rr + 1 end
    put(cc, rr, "tier" .. n .. "_" .. r .. c, t, {})
  end end
end
putTier(3, 17, 10) -- row 10 cols 17..25
putTier(4, 14, 11) -- row 11 cols 14..25

---------------------------------------------------------------------------------------------------
-- Row 11: nature decoration
ROW = 11
local function tuft(v)
  local t = T()
  local blades = ({ { 3, 5, 6, 8, 10 }, { 2, 4, 7, 9, 12, 13 }, { 5, 6, 8, 11 } })[v]
  for i, bx in ipairs(blades) do
    local hgt = 3 + ((i * 3 + v) % 4)
    for k = 0, hgt do
      local x = bx + ((k > 2) and ((i % 2 == 0) and 1 or -1) or 0)
      P(t, x, 15 - k, k == hgt and "leaf5" or (k > hgt / 2 and "leaf4" or "leaf3"))
    end
  end
  for x = 1, 14 do if A(t, x, 15) or A(t, x - 1, 15) then P(t, x, 15, "white"); P(t, x, 14, A(t, x, 14) and "ink6" or nil) end end
  return t
end
for v = 1, 3 do put(v - 1, ROW, "tuft_" .. v, tuft(v), {}) end
local function pebble(v)
  local t = T()
  local rows = v == 1 and { "....wwww....", "..wwwiiww...", ".wiaabbbio..", "oabbbbbbcco.", "occcccccccoo" } or
                          { "......ww.......", "...wwwwiw......", "..wiabbbio..ww.", ".oabbbbcco.wabo", ".occcccccoocccco" }
  local keys = { w = "white", i = "ink6", a = "ink5", b = "ink4", c = "ink2", o = "outline" }
  for j, r in ipairs(rows) do for i = 1, #r do local ch = r:sub(i, i); if ch ~= "." then P(t, i, 16 - #rows + j - 1, keys[ch]) end end end
  return t
end
put(3, ROW, "rock_small", pebble(1), {})
put(4, ROW, "rock_pair", pebble(2), {})
local function drift(kind)
  local t = T()
  for x = 0, TS - 1 do
    local h
    if kind == "l" then h = math.floor(x / 3) elseif kind == "r" then h = math.floor((15 - x) / 3) else h = 5 + ((x % 7 == 3) and 1 or 0) end
    h = math.min(h, 5)
    for k = 0, h - 1 do P(t, x, 15 - k, (k == h - 1) and "white" or ((k == 0) and "ink5" or "ink6")) end
  end
  return t
end
put(5, ROW, "drift_l", drift("l"), {})
put(6, ROW, "drift_m", drift("m"), {})
put(7, ROW, "drift_r", drift("r"), {})
local function bush(side)
  local t = T()
  for y = 4, 15 do for x = 0, TS - 1 do
    local gx = side == "l" and x or x + 16
    local dx, dy = (gx - 16) / 15, (y - 15) / 11
    if dx * dx + dy * dy <= 1 then
      local c = "leaf2"
      if dy < -0.6 and dx < 0.2 then c = "leaf4" elseif dy < -0.3 then c = "leaf3" elseif dx > 0.5 then c = "leaf1" end
      if H(gx, y, 15) < 0.1 then c = "leaf1" end
      P(t, x, y, c)
    end
  end end
  -- snow on top & outline
  for x = 0, TS - 1 do
    local y = 0
    while y < TS and not A(t, x, y) do y = y + 1 end
    if y < TS then P(t, x, y, "white"); if y + 1 < TS then P(t, x, y + 1, "ink6") end; if y > 0 then P(t, x, y - 1, "outline") end end
  end
  return t
end
put(8, ROW, "bush_l", bush("l"), {})
put(9, ROW, "bush_r", bush("r"), {})
local stump = T()
for x = 3, 12 do for y = 6, 15 do P(stump, x, y, x < 5 and "dirt4" or (x > 10 and "dirt1" or "dirt3")) end end
for x = 3, 12 do P(stump, x, 5, "sand3"); P(stump, x, 4, "white") end
for x = 4, 11 do P(stump, x, 3, "ink6") end
P(stump, 7, 9, "dirt2"); P(stump, 7, 10, "dirt2"); P(stump, 8, 12, "dirt2")
for y = 4, 15 do P(stump, 2, y, "outline"); P(stump, 13, y, "outline") end
P(stump, 1, 15, "outline"); P(stump, 14, 15, "outline"); P(stump, 2, 14, "dirt3"); P(stump, 13, 14, "dirt1")
put(10, ROW, "stump", stump, {})
local function icicles(v)
  local t = T()
  local lens = v == 1 and { 2, 5, 3, 0, 7, 2, 0, 4, 9, 3, 0, 2, 6, 1, 0, 3 } or { 4, 0, 2, 8, 3, 0, 5, 1, 0, 3, 6, 2, 0, 10, 4, 1 }
  for x = 0, TS - 1 do
    P(t, x, 0, "ink6")
    for y = 1, lens[x + 1] do P(t, x, y, (y == lens[x + 1]) and "sky4" or ((x % 2 == 0) and "white" or "sky5")) end
  end
  return t
end
put(11, ROW, "icicles_a", icicles(1), {})
put(12, ROW, "icicles_b", icicles(2), {})
local roots = T()
for _, r in ipairs({ {2, 6}, {5, 10}, {9, 4}, {12, 8} }) do
  local x = r[1]
  for y = 0, r[2] do P(roots, x, y, y < 2 and "dirt2" or "dirt1"); if H(x, y, 16) < 0.3 then x = x + ((r[1] % 2 == 0) and 1 or -1) end end
end
put(13, ROW, "roots", roots, {})

---------------------------------------------------------------------------------------------------
-- Row 12: outpost decoration
ROW = 12
local function pipeH(t, y)
  for x = 0, TS - 1 do
    P(t, x, y, "outline"); P(t, x, y + 1, "steel5"); P(t, x, y + 2, "steel4"); P(t, x, y + 3, "steel3"); P(t, x, y + 4, "steel2"); P(t, x, y + 5, "outline")
  end
end
local function pipeV(t, x)
  for y = 0, TS - 1 do
    P(t, x, y, "outline"); P(t, x + 1, y, "steel5"); P(t, x + 2, y, "steel4"); P(t, x + 3, y, "steel3"); P(t, x + 4, y, "steel2"); P(t, x + 5, y, "outline")
  end
end
local ph = T(); pipeH(ph, 5); for _, x in ipairs({ 0, 15 }) do end; R(ph, 13, 4, 2, 8, "steel3"); P(ph, 13, 4, "steel5"); P(ph, 14, 11, "steel1")
put(0, ROW, "pipe_h", ph, {})
local pv = T(); pipeV(pv, 5); R(pv, 4, 13, 8, 2, "steel3"); P(pv, 4, 13, "steel5"); P(pv, 11, 14, "steel1")
put(1, ROW, "pipe_v", pv, {})
local function elbow(corner)
  local t = T()
  -- quarter ring centered on the corner where the pipe turns
  local cx = (corner == "tl" or corner == "bl") and 15 or 0
  local cy = (corner == "tl" or corner == "tr") and 15 or 0
  for y = 0, TS - 1 do for x = 0, TS - 1 do
    local d = math.sqrt((x - cx) ^ 2 + (y - cy) ^ 2)
    if d >= 4.5 and d <= 10.5 then
      local k = d - 4.5
      local c = ({ "outline", "steel2", "steel3", "steel4", "steel5", "outline" })[math.min(6, math.floor(k) + 1)]
      P(t, x, y, c)
    end
  end end
  return t
end
for i, c in ipairs({ "tl", "tr", "bl", "br" }) do put(1 + i, ROW, "pipe_" .. c, elbow(c), {}) end
local valve = T(); pipeH(valve, 5)
for a = 0, 31 do local ang = a / 32 * 2 * math.pi; P(valve, math.floor(8 + math.cos(ang) * 5 + 0.5), math.floor(7 + math.sin(ang) * 5 + 0.5), "red3") end
L(valve, 3, 7, 13, 7, "red2"); L(valve, 8, 2, 8, 12, "red2"); P(valve, 8, 7, "red5"); P(valve, 5, 3, "red5"); P(valve, 4, 4, "red4")
put(6, ROW, "valve", valve, {})
local vent = T()
R(vent, 1, 2, 14, 12, "steel1"); for x = 1, 14 do P(vent, x, 1, "outline"); P(vent, x, 14, "outline") end
for y = 1, 14 do P(vent, 0, y, "outline"); P(vent, 15, y, "outline") end
for _, y in ipairs({ 3, 6, 9, 12 }) do for x = 2, 13 do P(vent, x, y, "steel4"); P(vent, x, y + 1, "steel2") end end
put(7, ROW, "vent", vent, {})
local function window(lit)
  local t = T()
  R(t, 1, 2, 14, 11, "outline")
  R(t, 2, 3, 12, 9, lit and "fire4" or "steel1")
  if lit then R(t, 2, 3, 12, 3, "fire5"); R(t, 2, 9, 12, 3, "fire3"); P(t, 3, 4, "fire6"); P(t, 4, 4, "fire6") else R(t, 2, 3, 4, 2, "steel2") end
  for _, bx in ipairs({ 5, 8, 11 }) do for y = 3, 11 do P(t, bx, y, "ink1") end end
  for x = 0, 15 do P(t, x, 13, "ink5"); P(t, x, 14, "ink3") end
  for x = 1, 14 do P(t, x, 12, "white") end
  return t
end
put(8, ROW, "window_lit", window(true), {})
put(9, ROW, "window_dark", window(false), {})
local lamp = T()
R(lamp, 5, 2, 6, 2, "steel2"); R(lamp, 4, 4, 8, 5, "fire5"); R(lamp, 5, 5, 6, 3, "fire6")
for _, x in ipairs({ 4, 7, 11 }) do for y = 4, 8 do P(lamp, x, y, "steel1") end end
for x = 4, 11 do P(lamp, x, 9, "steel1") end
P(lamp, 3, 4, "outline"); P(lamp, 12, 4, "outline")
put(10, ROW, "cage_lamp", lamp, {})
local warn = T()
for y = 2, 14 do local hw = math.floor((y - 2) / 2); for x = 8 - hw, 7 + hw do P(warn, x, y, (x == 8 - hw or x == 7 + hw or y == 14) and "outline" or "fire4") end end
for y = 6, 10 do P(warn, 7, y, "outline"); P(warn, 8, y, "outline") end
P(warn, 7, 12, "outline"); P(warn, 8, 12, "outline")
put(11, ROW, "sign_warn", warn, {})
-- regime poster (spiral eye), two tiles tall
local function poster(half)
  local t = T()
  local y0 = half == "top" and 2 or 0
  local y1 = half == "top" and 15 or 12
  R(t, 2, y0, 12, y1 - y0 + 1, "red3")
  for y = y0, y1 do P(t, 2, y, "red2"); P(t, 13, y, "red1") end
  if half == "top" then
    for x = 2, 13 do P(t, x, y0, "red4") end
    -- eye: almond shape centred at (8, 13) spanning both tiles (draw top half here)
    for y = 9, 15 do for x = 3, 12 do
      local dx, dy = (x - 7.5) / 5, (y - 16) / 4.5
      if dx * dx + dy * dy <= 1 then P(t, x, y, "white") end
    end end
    for y = 13, 15 do for x = 6, 9 do P(t, x, y, ((x + y) % 2 == 0) and "red4" or "outline") end end
    P(t, 2, 1, "steel4"); P(t, 13, 1, "steel4")
  else
    for y = 0, 3 do for x = 3, 12 do
      local dx, dy = (x - 7.5) / 5, (y + 16 - 16) / 4.5
      if dx * dx + dy * dy <= 1 then P(t, x, y, "white") end
    end end
    for y = 0, 2 do for x = 6, 9 do P(t, x, y, ((x + y) % 2 == 0) and "outline" or "red4") end end
    P(t, 7, 0, "red5"); P(t, 8, 1, "outline")
    for x = 2, 13 do P(t, x, y1, "red1") end
    -- torn corner
    P(t, 13, 12, nil); P(t, 12, 12, nil); P(t, 13, 11, nil)
  end
  return t
end
put(12, ROW, "poster_top", poster("top"), {})
put(13, ROW, "poster_bot", poster("bot"), {})
local cable = T()
for x = 0, TS - 1 do local y = 3 + math.floor(math.sin(x / 15 * math.pi) * 3 + 0.5); P(cable, x, y, "ink1"); P(cable, x, y + 1, "outline") end
put(14, ROW, "cable", cable, {})
local crack = T()
L(crack, 2, 1, 6, 6, "ink2"); L(crack, 6, 6, 5, 11, "ink2"); L(crack, 6, 6, 12, 9, "ink2"); L(crack, 12, 9, 14, 14, "ink2"); P(crack, 7, 6, "ink5"); P(crack, 6, 11, "ink5")
put(15, ROW, "crack", crack, {})
local rivets = T()
for x = 0, TS - 1 do P(rivets, x, 6, "steel3"); P(rivets, x, 7, "steel4"); P(rivets, x, 8, "steel3"); P(rivets, x, 9, "steel1") end
for _, x in ipairs({ 3, 11 }) do P(rivets, x, 7, "steel5"); P(rivets, x + 1, 8, "steel1") end
put(16, ROW, "rivet_strip", rivets, {})

-- Wall decorations baked onto the background concrete (the back layer holds one tile per cell,
-- so a window on a facade has to be a single opaque tile).
local function onWall(deco, v)
  local base = remap(terrainTile("concrete", 0, v or 0), BG_MAP)
  base:drawImage(deco, Point(0, 0))
  return base
end
local WALL = {
  { "wall_window_lit", window(true) }, { "wall_window_dark", window(false) }, { "wall_vent", vent },
  { "wall_warn", warn }, { "wall_crack", crack }, { "wall_poster_top", poster("top") }, { "wall_poster_bot", poster("bot") },
  { "wall_pipe_h", ph }, { "wall_pipe_v", pv }, { "wall_lamp", lamp }, { "wall_hazard_band", hz }, { "wall_rivets", rivets },
}
for i, w in ipairs(WALL) do put(16 + i, ROW, w[1], onWall(w[2], (i % 3 == 0) and 1 or 0), {}) end

---------------------------------------------------------------------------------------------------
-- Row 13: far silhouettes for bg_far_deco (no outline, cold dark blues)
ROW = 13
-- far pine silhouette, 2 tiles wide: top (tip + first tier), mid (one drooping tier, stacks), base (tier + trunk)
local function farPineImg(part, v)
  local img = Image(32, 16, ColorMode.RGB)
  local body, shade, snow, lit = "sky2", "sky1", "sky4", "sky3"
  if v == 2 then body, shade, snow, lit = "steel2", "steel1", "ink4", "steel3" end
  local function px(x, y, c) if x >= 0 and x < 32 and y >= 0 and y < 16 then img:drawPixel(x, y, K.color(c)) end end
  local function tier(y0, y1, w0, w1, seed)
    for y = y0, y1 do
      local k = (y - y0) / math.max(1, y1 - y0)
      local hw = w0 + (w1 - w0) * k
      for x = 0, 31 do
        local dx = x - 15.5
        local edge = hw
        -- drooping jagged tips on the lower rows of the tier
        if y >= y1 - 2 then edge = hw - ((math.floor(math.abs(dx)) % 4 < 2) and 0 or 2) end
        if math.abs(dx) <= edge then
          local c = (dx > 1.5) and shade or body
          if dx > hw * 0.55 then c = shade end
          if y == y0 or (dx < 0 and math.abs(dx) > edge - 1.5 and y < y1 - 1) then c = snow end
          if c == body and dx < -2 and H(x, y, seed) < 0.12 then c = lit end
          px(x, y, c)
        end
      end
    end
  end
  if part == "top" then
    tier(1, 8, 0.5, 5, 1 + v); tier(7, 15, 2.5, 9, 2 + v)
  elseif part == "mid" then
    tier(0, 15, 5, 13, 3 + v)
  else
    tier(0, 9, 7, 14, 4 + v)
    for y = 10, 15 do for x = 14, 17 do px(x, y, x < 16 and shade or "outline") end end
    for x = 9, 22 do local d = 14 + ((x % 5 == 0) and 0 or 1); for y = d, 15 do px(x, y, snow) end end
  end
  return img
end
local function splitPine(col, prefix, v)
  for i, part in ipairs({ "top", "mid", "base" }) do
    local img = farPineImg(part, v)
    for side = 0, 1 do
      local t = T(); t:drawImage(img, Point(-side * 16, 0))
      put(col + (i - 1) * 2 + side, ROW, prefix .. "_" .. part .. (side == 0 and "_l" or "_r"), t, {})
    end
  end
end
splitPine(0, "far_pine", 1)
splitPine(9, "far_pine2", 2)
local function farGround(top)
  local t = T()
  R(t, 0, 0, TS, TS, "sky1")
  if top then
    for x = 0, TS - 1 do local d = 3 + math.floor(math.sin(x / 16 * 2 * math.pi) + 0.5); for y = 0, d - 1 do P(t, x, y, nil) end; P(t, x, d, "sky3"); P(t, x, d + 1, "sky2") end
  end
  return t
end
put(6, ROW, "far_ground_top", farGround(true), {})
put(7, ROW, "far_ground", farGround(false), {})
local farFence = T()
for y = 4, 15 do for x = 0, TS - 1 do if (x + y) % 6 == 0 or (x - y) % 6 == 0 then P(farFence, x, y, "sky2") end end end
for x = 0, TS - 1 do P(farFence, x, 4, "sky2") end
for y = 1, 15 do P(farFence, 7, y, "sky1"); P(farFence, 8, y, "sky1") end
put(8, ROW, "far_fence", farFence, {})

---------------------------------------------------------------------------------------------------
-- write outputs
local spr = Sprite(SHEET.width, SHEET.height, ColorMode.RGB)
spr.cels[1].image = SHEET
spr.layers[1].name = "tiles"
local names = {}; for n in pairs(K.PAL) do names[#names + 1] = n end; table.sort(names)
local pal = Palette(#names + 1); pal:setColor(0, Color{ r = 0, g = 0, b = 0, a = 0 })
for i, n in ipairs(names) do local c = K.PAL[n]; pal:setColor(i, Color{ r = c[1], g = c[2], b = c[3], a = 255 }) end
spr:setPalette(pal)
spr:saveAs(ROOT .. "/art-src/tiles/stage1.aseprite")
spr:saveCopyAs(ROOT .. "/public/assets/tiles/stage1.png")
spr:close()

table.sort(manifest.tiles, function(a, b) return a.id < b.id end)
local f = io.open(ROOT .. "/art-src/tiles/stage1_tiles.json", "w")
f:write(json.encode(manifest))
f:close()
print("built stage1 tileset (" .. #manifest.tiles .. " tiles, " .. SHEET.width .. "x" .. SHEET.height .. ")")
