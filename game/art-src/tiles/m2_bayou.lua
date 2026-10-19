-- Mission 2 tileset "m2_bayou" (BAYOU BLACKOUT: cypress swamp, river bayou, Regime pump station).
-- 16x16 tiles, 32 columns, one image, 0 margin/spacing. Used by all three Mission 2 maps.
-- Build: bash tools/build-art.sh art-src/tiles/m2_bayou.lua
-- Writes: art-src/tiles/m2_bayou.aseprite (source), public/assets/tiles/m2_bayou.png (tileset image),
--         art-src/tiles/m2_bayou_tiles.json (manifest: name -> local id, properties, animations).
--
-- Layout (same autotile conventions as stage1, so mapkit.autotile works unchanged):
--   rows 0-2  bank / mud / pump terrain: col = exposed-side mask (N=1,E=2,S=4,W=8), 16-19 inner corners
--             (tl,tr,bl,br), 20-22 fill_v1..3, 23-26 deep_v0..3, 27-29 top_v1..3. Row 1 col 29-31: spare.
--   rows 3-4  bank_bg / pump_bg (darker, cooler, outline-free remaps for the `back` layer)
--   row 5     water (anim), shallow riverbed, lily pads, sinking logs (+bob/s1/s2), mud bubble (anim)
--   row 6     stable logs, boardwalk, posts, rotten dock + rail, mangrove roots, cypress limb, dry logs
--   row 7     stilt shack: deck, tin roof, wall 9-slice, windows, doorway, stilts, rope bridge deck
--   row 8     rope rails, pump-station catwalk/ladder/railing/fence, mossy sandbags
--   row 9     pump wall decor (baked on pump_bg_m0), cypress trunks + buttress flare, Spanish moss
--   row 10    canopy 4x3, cypress knees, plants, front-layer reeds/moss
--   row 11    bg_far_deco silhouettes (far cypress x2, far stilt shack)
-- Geometry: ground surface = top of map row 21. Water surfaces put their ripple crest at tile y 3 (top 2 px clear),
-- the sinking/stable logs keep that waterline so they swap seamlessly with water_top_f0.
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local TS, COLS, ROWS = 16, 32, 12
local SHEET = Image(TS * COLS, TS * ROWS, ColorMode.RGB)
local CLEAR = app.pixelColor.rgba(0, 0, 0, 0)

local manifest = { tilewidth = TS, columns = COLS, rows = ROWS, image = "m2_bayou.png", tiles = {} }
local byName = {}

---------------------------------------------------------------------------------------------------
-- helpers (stage1 set + a few for multi-tile art)
local function H(x, y, s)
  local h = (math.floor(x) * 374761393 + math.floor(y) * 668265263 + math.floor(s or 0) * 1442695041) & 0xffffffff
  h = ((h ~ (h >> 13)) * 1274126177) & 0xffffffff
  h = h ~ (h >> 16)
  return h / 4294967296
end
local function IMG(w, h) return Image(w, h, ColorMode.RGB) end
local function T() return IMG(TS, TS) end
local function P(t, x, y, c)
  if x < 0 or y < 0 or x >= t.width or y >= t.height then return end
  if c == nil then t:drawPixel(x, y, CLEAR) else t:drawPixel(x, y, K.color(c)) end
end
local function A(t, x, y)
  if x < 0 or y < 0 or x >= t.width or y >= t.height then return false end
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
local function linePts(x0, y0, x1, y1, out)
  local dx, dy = math.abs(x1 - x0), -math.abs(y1 - y0)
  local sx, sy = x0 < x1 and 1 or -1, y0 < y1 and 1 or -1
  local err = dx + dy
  while true do
    out[#out + 1] = { x0, y0 }
    if x0 == x1 and y0 == y1 then break end
    local e2 = 2 * err
    if e2 >= dy then err = err + dy; x0 = x0 + sx end
    if e2 <= dx then err = err + dx; y0 = y0 + sy end
  end
  return out
end
local function wrap(v) return v % TS end
local function clamp(v, a, b) if v < a then return a elseif v > b then return b end return v end

local REV = {}
for n, c in pairs(K.PAL) do REV[app.pixelColor.rgba(c[1], c[2], c[3], 255)] = n end
local function G(t, x, y)
  if x < 0 or y < 0 or x >= t.width or y >= t.height then return nil end
  local p = t:getPixel(x, y)
  if app.pixelColor.rgbaA(p) == 0 then return nil end
  return REV[p]
end
local function copy(t) local o = IMG(t.width, t.height); o:drawImage(t, Point(0, 0)); return o end
-- remap palette names in place inside a rect (defaults to the whole image)
local function remapIn(t, map, x0, y0, x1, y1)
  x0 = x0 or 0; y0 = y0 or 0; x1 = x1 or t.width - 1; y1 = y1 or t.height - 1
  for y = math.max(0, y0), math.min(t.height - 1, y1) do for x = math.max(0, x0), math.min(t.width - 1, x1) do
    local n = G(t, x, y)
    if n and map[n] then P(t, x, y, map[n]) end
  end end
end
local function remap(t, map) local o = copy(t); remapIn(o, map); return o end
local function flipX(t)
  local o = IMG(t.width, t.height)
  for y = 0, t.height - 1 do for x = 0, t.width - 1 do o:drawPixel(t.width - 1 - x, y, t:getPixel(x, y)) end end
  return o
end
-- periodic value noise (period 16 by default) so fills tile seamlessly
local function vnoise(x, y, seed, cell, period)
  cell = cell or 4; period = period or 16
  local n = period // cell
  local gx, gy = x / cell, y / cell
  local x0, y0 = math.floor(gx), math.floor(gy)
  local fx, fy = gx - x0, gy - y0
  local function g(i, j) return H(i % n, j % n, seed) end
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy)
  local a = g(x0, y0) + (g(x0 + 1, y0) - g(x0, y0)) * fx
  local b = g(x0, y0 + 1) + (g(x0 + 1, y0 + 1) - g(x0, y0 + 1)) * fx
  return a + (b - a) * fy
end
local BAYER = { { 0, 8, 2, 10 }, { 12, 4, 14, 6 }, { 3, 11, 1, 9 }, { 15, 7, 13, 5 } }
local function bayer(x, y) return (BAYER[y % 4 + 1][x % 4 + 1] + 0.5) / 16 end
-- pick from a list of colour names by n in [0,1]; narrow ordered-dither bands between levels
local function shade(levels, n, x, y, band)
  band = band or 3
  local s = clamp(n, 0, 0.9999) * (#levels - 1)
  local i = math.floor(s); local f = s - i
  f = clamp((f - 0.5) * band + 0.5, 0, 1)
  if f > bayer(x, y) then i = i + 1 end
  return levels[clamp(i + 1, 1, #levels)]
end

local function put(col, row, name, t, props, anim)
  assert(col < COLS and row < ROWS, "tile out of sheet: " .. name)
  assert(not byName[name], "duplicate tile name " .. name)
  local id = row * COLS + col
  for _, r in ipairs(manifest.tiles) do assert(r.id ~= id, "cell reused by " .. name .. " (" .. r.name .. ")") end
  SHEET:drawImage(t, Point(col * TS, row * TS))
  local rec = { name = name, id = id, props = props or {} }
  if anim then rec.anim = anim end
  manifest.tiles[#manifest.tiles + 1] = rec
  byName[name] = rec
  return id
end
-- cut a big image into tiles; names[r][c] (nil = skip); placed left-to-right from (col,row), wrapping rows
local function putGrid(img, col, row, nameFn, nr, nc)
  for r = 0, nr - 1 do for c = 0, nc - 1 do
    local t = T(); t:drawImage(img, Point(-c * TS, -r * TS))
    put(col + r * nc + c, row, nameFn(r, c), t, {})
  end end
end

local N, E, S, W = 1, 2, 4, 8
local WL = 3 -- waterline (ripple crest) y inside a water-surface tile

-- seen-through-water tints (just under the surface / deeper)
local UNDER1 = {
  dirt5 = "olive4", dirt4 = "olive3", dirt3 = "olive2", dirt2 = "olive1", dirt1 = "leaf1",
  ink6 = "steel4", ink5 = "steel4", ink4 = "steel3", ink3 = "steel2", ink2 = "steel1", ink1 = "leaf1", outline = "leaf1",
  leaf5 = "leaf4", leaf4 = "leaf3", leaf3 = "leaf2", leaf2 = "leaf1",
  olive5 = "olive4", olive4 = "olive3", olive3 = "olive2", olive2 = "olive1", olive1 = "leaf1",
  sand5 = "olive4", sand4 = "olive3", sand3 = "olive2", sand2 = "olive1", sand1 = "leaf1",
  steel5 = "steel4", steel4 = "steel3", steel3 = "steel2", steel2 = "steel1", steel1 = "leaf1",
  red2 = "olive1", red3 = "olive2", fire4 = "olive3",
}
local UNDER2 = {}
for k, v in pairs(UNDER1) do UNDER2[k] = UNDER1[v] or v end

---------------------------------------------------------------------------------------------------
-- terrain materials
local MAT = {}

-- edge profiles shared by every variant (periodic, so mixing variants never shows a seam)
local BANK_IND = { 0, 0, 1, 1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0 }      -- side indent per y
local BANK_BOT = { 14, 14, 13, 13, 14, 15, 14, 13, 13, 14, 14, 15, 14, 13, 14, 14 } -- underside per x
local BANK_GT = { -- first turf row per x (edges fixed at 0, so row-20 decor sits flush on the turf)
  [0] = { 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0 },
  [1] = { 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 1, 0, 0 },
  [2] = { 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0 },
  [3] = { 0, 1, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0 },
}
local BANK_GB = { -- first peat row under the turf per x (edges fixed at 4)
  [0] = { 4, 5, 5, 4, 5, 5, 6, 5, 4, 4, 5, 5, 4, 5, 5, 4 },
  [1] = { 4, 4, 5, 6, 5, 4, 4, 5, 5, 4, 5, 6, 5, 4, 4, 4 },
  [2] = { 4, 5, 4, 4, 5, 6, 5, 5, 6, 5, 4, 4, 5, 6, 4, 4 },
  [3] = { 4, 5, 5, 4, 4, 4, 5, 6, 5, 4, 4, 5, 5, 4, 5, 4 },
}
-- grass blades / reed stubs poking above the moss: {x, height, kind}
local BANK_BLADES = {
  [0] = { { 3, 1, "g" }, { 4, 2, "g" }, { 9, 1, "g" }, { 12, 2, "r" } },
  [1] = { { 2, 1, "g" }, { 6, 2, "g" }, { 7, 1, "g" }, { 13, 2, "r" } },
  [2] = { { 4, 2, "r" }, { 10, 2, "g" }, { 11, 1, "g" } },
  [3] = { { 2, 2, "g" }, { 8, 1, "g" }, { 9, 2, "r" }, { 14, 1, "g" } },
}

-- draws a root along a polyline with a top highlight and a shadow underneath
local function root(t, pts, body, hi, sh, seed)
  local path, set = {}, {}
  for i = 1, #pts - 1 do linePts(pts[i][1], pts[i][2], pts[i + 1][1], pts[i + 1][2], path) end
  for _, p in ipairs(path) do set[p[1] .. "," .. p[2]] = true end
  for _, p in ipairs(path) do if not set[p[1] .. "," .. (p[2] + 1)] then P(t, p[1], p[2] + 1, sh) end end
  for _, p in ipairs(path) do P(t, p[1], p[2], body) end
  for i, p in ipairs(path) do
    if hi and not set[p[1] .. "," .. (p[2] - 1)] and H(p[1], p[2], seed or 1) < 0.25 then P(t, p[1], p[2] - 1, hi) end
    if i % 4 == 2 and H(p[1], p[2], (seed or 1) + 5) < 0.5 then P(t, p[1], p[2], "dirt2") end -- broken, fibrous look
  end
end
local function pebble(t, x, y, w, lite)
  for i = 0, w - 1 do P(t, x + i, y, (i == 0 and lite) and "ink4" or "ink3"); P(t, x + i, y + 1, (i == w - 1) and "ink1" or "ink2") end
  P(t, x, y, lite and "ink4" or "ink3"); P(t, x + w, y + 1, "ink1")
end

MAT.bank = {
  material = "dirt",
  fill = function(t, v, deep)
    v = v or 0
    local lv = deep and { "outline", "ink1", "dirt1", "dirt1", "dirt2" } or { "ink1", "dirt1", "dirt2", "dirt2", "dirt2" }
    for y = 0, TS - 1 do for x = 0, TS - 1 do
      local n = vnoise(x, y, 101, 4) * 0.65 + vnoise(x, y, 102, 2) * 0.35
      P(t, x, y, shade(lv, n, x, y))
    end end
    -- wet glints and fibres (shared positions, interior only)
    for y = 1, 14 do for x = 1, 14 do
      local h = H(x, y, 103)
      if h < 0.025 then P(t, x, y, deep and "dirt2" or "dirt3") elseif h > 0.988 then P(t, x, y, deep and "ink2" or "ink3") end
    end end
    local rb, rh, rs = "dirt3", "dirt3", "ink1"
    if deep then rb, rh, rs = "dirt2", "dirt2", "outline" end
    local s = v + (deep and 10 or 0)
    if v == 0 then
      root(t, { { 1, 9 }, { 4, 7 }, { 8, 8 }, { 14, 6 } }, rb, rh, rs, s)
      root(t, { { 8, 8 }, { 9, 11 }, { 11, 13 } }, deep and "dirt1" or "dirt2", nil, rs, s)
    elseif v == 1 then
      root(t, { { 2, 4 }, { 6, 6 }, { 8, 10 }, { 13, 13 } }, rb, rh, rs, s)
      root(t, { { 6, 6 }, { 10, 4 }, { 13, 4 } }, deep and "dirt1" or "dirt2", nil, rs, s)
      if not deep then pebble(t, 3, 12, 3, true) end
    elseif v == 2 then
      root(t, { { 2, 12 }, { 6, 10 }, { 9, 11 }, { 13, 9 } }, rb, rh, rs, s)
      if not deep then pebble(t, 9, 4, 3, true); pebble(t, 4, 6, 2, false) else pebble(t, 9, 4, 2, false) end
    else
      root(t, { { 1, 5 }, { 6, 8 }, { 14, 7 } }, rb, rh, rs, s)
      root(t, { { 3, 13 }, { 6, 8 }, { 9, 3 } }, rb, rh, rs, s + 3)
      if deep then -- old buried branch
        root(t, { { 9, 12 }, { 13, 11 } }, "dirt1", nil, "outline", s)
      end
    end
  end,
  top = function(t, mask, v)
    local gt, gb = BANK_GT[v % 4], BANK_GB[v % 4]
    for x = 0, TS - 1 do
      local g, b = gt[x + 1], gb[x + 1]
      for y = 0, g - 1 do P(t, x, y, nil) end
      local n = b - g
      for y = g, b - 1 do
        local d = y - g
        local c
        if d == 0 then c = (H(x, 0, v + 31) < 0.3) and "olive4" or "leaf4"
        elseif d == 1 then c = ((x + v) % 3 == 0) and "leaf3" or "leaf4"
        elseif d == n - 1 then c = "leaf2"
        else c = (H(x, y, v + 32) < 0.22) and "leaf2" or "leaf3" end
        if d >= 1 and d < n - 1 and (x * 3 + v) % 5 == 0 then c = "leaf4" end -- grass strokes in front
        P(t, x, y, c)
      end
      -- moss drips and a dark shadow line in the peat under the turf
      local drip = (x > 0 and x < 15) and H(x, 5, v + 7) or 1
      if drip < 0.28 then P(t, x, b, "leaf2"); P(t, x, b + 1, drip < 0.12 and "leaf1" or "ink1"); P(t, x, b + 2, "dirt1")
      else P(t, x, b, "ink1"); P(t, x, b + 1, (H(x, 6, v) < 0.5) and "dirt1" or G(t, x, b + 1)) end
    end
    -- grass blades and reed stubs standing in front of the turf
    for _, bl in ipairs(BANK_BLADES[v % 4]) do
      local x, h, kind = bl[1], bl[2], bl[3]
      local g = gt[x + 1]
      if kind == "r" then
        P(t, x, g, "sand3"); P(t, x, g + 1, "olive3"); P(t, x, g + 2, "olive2"); P(t, x + 1, g + 1, "leaf2")
      else
        P(t, x, g, (h == 2) and "olive5" or "olive4"); P(t, x, g + 1, "olive4"); if h == 2 then P(t, x - 1, g + 2, "leaf4") end
      end
    end
    -- side lips: turf rolls over exposed sides and spills down a little
    if mask & W ~= 0 then
      for y = gt[1], gb[1] + 3 do P(t, 0, y, (y <= gb[1]) and "leaf3" or "leaf2") end
      for y = gt[1] + 1, gb[1] + 1 do P(t, 1, y, (y <= gb[1] - 1) and "leaf4" or "leaf2") end
      P(t, 0, gb[1] + 4, "leaf1")
      P(t, 0, gt[1], nil); P(t, 1, gt[1], "leaf4")
    end
    if mask & E ~= 0 then
      for y = gt[16], gb[16] + 3 do P(t, 15, y, (y <= gb[16]) and "leaf2" or "leaf1") end
      for y = gt[16] + 1, gb[16] + 1 do P(t, 14, y, (y <= gb[16] - 1) and "leaf3" or "leaf2") end
      P(t, 15, gt[16], nil); P(t, 14, gt[16], "leaf3")
    end
  end,
  west = function(t)
    for y = 0, TS - 1 do
      local ind = BANK_IND[y + 1]
      for x = 0, ind - 1 do P(t, x, y, nil) end
      P(t, ind, y, "outline"); P(t, ind + 1, y, (y % 3 == 0) and "dirt2" or "dirt3")
    end
    -- root ends poking out of the bank side
    for _, y in ipairs({ 7, 11 }) do P(t, 0, y, "dirt4"); P(t, 1, y, "dirt3"); P(t, 2, y, "dirt3"); P(t, 0, y + 1, "outline"); P(t, 1, y + 1, "ink1") end
  end,
  east = function(t)
    for y = 0, TS - 1 do
      local ind = BANK_IND[(y + 5) % 16 + 1]
      for x = 16 - ind, 15 do P(t, x, y, nil) end
      P(t, 15 - ind, y, "outline"); P(t, 14 - ind, y, (y % 4 == 1) and "dirt1" or "ink1")
    end
    for _, y in ipairs({ 4, 12 }) do P(t, 15, y, "dirt3"); P(t, 14, y, "dirt2"); P(t, 13, y, "dirt2"); P(t, 15, y + 1, "outline") end
  end,
  south = function(t)
    for x = 0, TS - 1 do
      local b = BANK_BOT[x + 1]
      for y = b + 1, TS - 1 do P(t, x, y, nil) end
      P(t, x, b, "outline"); P(t, x, b - 1, "ink1")
    end
    -- root hairs dangling from the underside
    for _, x in ipairs({ 3, 9, 12 }) do
      local b = BANK_BOT[x + 1]
      for y = b, 15 do P(t, x, y, (y == b) and "dirt2" or "dirt1") end
    end
  end,
  ic = function(t, ic)
    if ic == "tl" or ic == "tr" then
      local sx = ic == "tl" and 0 or 15
      local dir = ic == "tl" and 1 or -1
      P(t, sx, 0, "outline"); P(t, sx + dir, 0, ic == "tl" and "dirt3" or "ink1")
      for k = 0, 3 do for y = 1 + k, 4 do P(t, sx + dir * k, y, (y == 4) and "leaf2" or ((y == 1 + k) and "leaf4" or "leaf3")) end end
      P(t, sx, 5, "leaf1"); P(t, sx + dir, 5, "ink1")
    else
      local sx = ic == "bl" and 0 or 15
      local dir = ic == "bl" and 1 or -1
      P(t, sx, 15, "outline"); P(t, sx + dir, 15, "ink1"); P(t, sx, 14, "ink1")
    end
  end,
}

-- Mud: glossy bog mud flats. Surface at y 1-2 (feet sink in a little), wet sheen, puddles, footprints.
local MUD_T = { -- surface y per x (edges fixed at 0): lumpy, sagging goop
  [0] = { 0, 0, 1, 1, 2, 2, 1, 0, 0, 1, 1, 2, 2, 1, 1, 0 },
  [1] = { 0, 1, 2, 2, 1, 0, 0, 0, 1, 2, 2, 1, 0, 0, 1, 0 },
  [2] = { 0, 0, 1, 2, 2, 2, 1, 1, 0, 0, 1, 1, 2, 1, 0, 0 },
  [3] = { 0, 1, 1, 0, 0, 1, 2, 2, 2, 1, 0, 0, 1, 2, 1, 0 },
}
local MUD_PUDDLE = { [0] = { 4, 3 }, [1] = { 2, 3 }, [2] = { 3, 4 }, [3] = { 6, 3 } }   -- {x, width}: sits in a dip
local MUD_PRINT = { [0] = nil, [1] = { 9 }, [2] = nil, [3] = nil }                   -- footprint dimples x
local MUD_BOT = { 14, 15, 15, 14, 14, 13, 14, 15, 14, 14, 13, 14, 15, 15, 14, 14 }
-- glossy lumps per fill variant (kept 1 px off the edges): {cx, cy, rx, ry}
local MUD_LUMPS = {
  [0] = { { 11, 11, 3, 1 } },
  [1] = { { 9, 5, 4, 2 }, { 4, 12, 2, 1 } },
  [2] = { { 5, 9, 3, 2 }, { 12, 4, 2, 1 }, { 11, 12, 2, 1 } },
  [3] = { { 8, 8, 4, 2 } },
}
local function mudLump(t, cx, cy, rx, ry, deep)
  -- a slumped fold in the goop: soft wet highlight arc on top, a dark sag under it
  for x = cx - rx, cx + rx do
    local k = (x - cx) / (rx + 0.5)
    local y = cy - math.floor(ry * math.sqrt(math.max(0, 1 - k * k)) + 0.5)
    P(t, x, y, (x < cx) and (deep and "dirt1" or "dirt2") or (deep and "ink1" or "dirt1"))
    if x == cx - rx + 1 then P(t, x, y, deep and "dirt2" or "ink2") end
    P(t, x, cy + 1, deep and "outline" or "ink1")
  end
  if not deep then P(t, cx - rx + 2, cy - ry, "ink3") end
end
MAT.mud = {
  material = "mud",
  fill = function(t, v, deep)
    v = v or 0
    for y = 0, TS - 1 do for x = 0, TS - 1 do
      local n = vnoise(x, y, 111, 8) * 0.65 + vnoise(x, y, 113, 4) * 0.35
      P(t, x, y, shade(deep and { "outline", "dirt1", "dirt1", "dirt1", "ink1" } or { "ink1", "dirt1", "dirt1", "dirt1", "dirt2" }, n, x, y, 7))
    end end
    for _, lp in ipairs(MUD_LUMPS[v % 4]) do mudLump(t, lp[1], lp[2], lp[3], lp[4], deep) end
    -- oily glints (shared, interior)
    for y = 1, 14 do for x = 1, 14 do if H(x, y, 112 + v) < 0.012 then P(t, x, y, deep and "ink1" or "ink2") end end end
    if v == 1 then -- sunken twig
      L(t, 2, 9, 7, 7, deep and "dirt2" or "dirt3"); L(t, 2, 10, 7, 8, "ink1"); P(t, 5, 7, deep and "dirt2" or "dirt4")
    elseif v == 3 then -- an old bone in the goop
      if deep then L(t, 3, 12, 7, 11, "ink2") else
        L(t, 3, 12, 7, 11, "ink4"); L(t, 3, 13, 7, 12, "ink2"); P(t, 2, 12, "ink5"); P(t, 8, 11, "ink5"); P(t, 2, 13, "ink3"); P(t, 8, 12, "ink3")
      end
    elseif v == 2 and not deep then pebble(t, 9, 10, 2, false) end
  end,
  top = function(t, mask, v)
    v = v % 4
    local mt = MUD_T[v]
    for x = 0, TS - 1 do
      local y0 = mt[x + 1]
      for y = 0, y0 - 1 do P(t, x, y, nil) end
      -- glossy wet crust: bright sheen dashes, then the dark goop shows through
      local sh = H(x // 2, 0, v + 41)
      P(t, x, y0, (sh < 0.55) and "ink3" or ((sh < 0.8) and "steel3" or "dirt2"))
      P(t, x, y0 + 1, (H(x // 3, 1, v + 42) < 0.45) and "steel2" or "dirt2")
      P(t, x, y0 + 2, (H(x // 4, 2, v + 43) < 0.4) and "ink2" or "dirt1")
      P(t, x, y0 + 3, (H(x // 2, 3, v + 44) < 0.3) and "steel1" or "dirt1")
      P(t, x, y0 + 4, "ink1")
      -- slumping lip: where the surface rises, a darker sag right under it
      if x > 0 and mt[x] > y0 then P(t, x, y0 + 1, "ink3") end
    end
    for x = 1, 14 do if H(x // 2, 0, v + 41) < 0.2 and x % 2 == 0 then P(t, x, mt[x + 1], "ink4") end end
    local pd = MUD_PUDDLE[v]
    if pd then
      local px, pw = pd[1], pd[2]
      local py = 2
      for i = 0, pw - 1 do
        for y = 0, py - 1 do P(t, px + i, y, nil) end
        P(t, px + i, py, (i == 0) and "steel3" or "steel2"); P(t, px + i, py + 1, "steel1"); P(t, px + i, py + 2, "ink1")
      end
      P(t, px - 1, py, "ink3"); P(t, px - 1, py - 1, "dirt2"); P(t, px + pw, py, "sand2"); P(t, px + pw, py - 1, "dirt2")
      P(t, px + 1, py, "sky3"); if pw > 2 then P(t, px + 2, py, "weird2") end
    end
    for _, fx in ipairs(MUD_PRINT[v] or {}) do
      local y0 = mt[fx + 1]
      P(t, fx, y0, "dirt1"); P(t, fx + 1, y0, "dirt1"); P(t, fx + 2, y0, "dirt2"); P(t, fx, y0 + 1, "dirt1"); P(t, fx + 1, y0 + 1, "dirt2")
      P(t, fx + 3, y0, "sand2"); P(t, fx + 2, y0 + 1, "sand2"); P(t, fx + 3, y0 + 1, "dirt3")
    end
    if mask & W ~= 0 then for y = mt[1] + 1, mt[1] + 4 do P(t, 0, y, "dirt1") end; P(t, 0, mt[1], nil); P(t, 1, mt[1], "ink3") end
    if mask & E ~= 0 then for y = mt[16] + 1, mt[16] + 4 do P(t, 15, y, "ink1") end; P(t, 15, mt[16], nil); P(t, 14, mt[16], "steel3") end
  end,
  west = function(t)
    for y = 0, TS - 1 do
      local bulge = (y >= 6 and y <= 11) and 0 or ((y < 3 or y > 13) and 1 or 0)
      for x = 0, bulge - 1 do P(t, x, y, nil) end
      P(t, bulge, y, "outline"); P(t, bulge + 1, y, (y % 5 == 2) and "ink3" or "dirt2")
    end
  end,
  east = function(t)
    for y = 0, TS - 1 do
      local bulge = (y >= 5 and y <= 10) and 0 or ((y < 2 or y > 12) and 1 or 0)
      for x = 16 - bulge, 15 do P(t, x, y, nil) end
      P(t, 15 - bulge, y, "outline"); P(t, 14 - bulge, y, "dirt1")
    end
  end,
  south = function(t)
    for x = 0, TS - 1 do
      local b = MUD_BOT[x + 1]
      for y = b + 1, 15 do P(t, x, y, nil) end
      P(t, x, b, "outline"); P(t, x, b - 1, "dirt1")
    end
    -- slow drips
    for _, d in ipairs({ { 4, 15 }, { 11, 15 } }) do
      local x = d[1]; local b = MUD_BOT[x + 1]
      for y = b - 1, 15 do P(t, x, y, "dirt2") end; P(t, x - 1, b, "dirt2"); P(t, x + 1, b, "dirt1")
      P(t, x - 1, 15, "outline"); P(t, x + 1, 15, "outline"); P(t, x, 14, "sand2")
    end
  end,
  ic = function(t, ic)
    if ic == "tl" or ic == "tr" then
      local sx = ic == "tl" and 0 or 15
      local dir = ic == "tl" and 1 or -1
      P(t, sx, 0, "outline"); P(t, sx + dir, 0, "outline"); P(t, sx, 1, ic == "tl" and "sand2" or "dirt3"); P(t, sx + dir, 1, "dirt3")
      P(t, sx + 2 * dir, 1, "dirt3"); P(t, sx, 2, "sand1")
    else
      local sx = ic == "bl" and 0 or 15
      local dir = ic == "bl" and 1 or -1
      P(t, sx, 15, "outline"); P(t, sx + dir, 15, "dirt1"); P(t, sx, 14, "dirt1")
    end
  end,
}

-- Pump-station concrete: cast panels, rust streaks, moss creeping up and on the ledge, bolt holes
local function rustStreak(t, x, y0, y1, seed)
  P(t, x, y0, "ink1"); P(t, x + 1, y0, "ink2")
  for y = y0 + 1, y1 do
    local h = H(x, y, seed)
    local k = (y - y0) / (y1 - y0)
    if h > k * 0.8 then P(t, x, y, (k < 0.35) and "red2" or "dirt2") end
    if k < 0.5 and h < 0.4 then P(t, x + 1, y, "dirt2") end
  end
end
local function mossCreep(t, ytop, seed, deep)
  for x = 1, 14 do
    local hgt = math.floor(vnoise(x, 0, seed, 4) * 6 + H(x, 1, seed) * 2)
    local top = 15 - hgt
    if top < ytop then top = ytop end
    for y = top, 14 do
      local c = (y == top) and (deep and "leaf3" or "olive3") or ((y - top) % 3 == 1 and "leaf2" or "olive2")
      if H(x, y, seed + 1) < 0.2 then c = "leaf2" end
      P(t, x, y, c)
    end
    if hgt > 3 and H(x, 2, seed) < 0.5 then P(t, x, top - 1, "olive2") end
  end
end
MAT.pump = {
  material = "stone",
  fill = function(t, v, deep)
    v = v or 0
    local base, hi, lo = "ink2", "ink3", "ink1"
    for y = 0, TS - 1 do for x = 0, TS - 1 do
      local n = vnoise(x, y, 121, 4)
      local c = base
      if n > 0.7 then c = ((x + y) % 2 == 0) and "olive1" or base end -- algae / water stains
      if deep and n > 0.55 then c = ((x + y) % 2 == 0) and "olive1" or base end
      if n < 0.2 then c = ((x + y) % 2 == 0) and "ink1" or base end
      if n > 0.45 and n < 0.5 and (x + y) % 3 == 0 then c = "ink3" end
      P(t, x, y, c)
    end end
    for x = 0, TS - 1 do P(t, x, 0, hi); P(t, x, 15, "ink1") end
    for y = 0, TS - 1 do P(t, 0, y, hi); P(t, 15, y, "ink1") end
    P(t, 0, 15, lo); P(t, 15, 0, lo); P(t, 14, 14, lo)
    for y = 1, 14 do for x = 1, 14 do
      local h = H(x, y, 123 + v)
      if h < 0.04 then P(t, x, y, "ink1") elseif h > 0.985 then P(t, x, y, hi) end
    end end
    if v == 1 then rustStreak(t, 7 + math.floor(H(1, 1, 133) * 3), 3, 13, 134)
    elseif v == 2 then
      for _, b in ipairs({ { 3, 3 }, { 12, 3 }, { 3, 12 }, { 12, 12 } }) do P(t, b[1], b[2], "ink1"); P(t, b[1] + 1, b[2], lo); P(t, b[1], b[2] + 1, hi) end
      rustStreak(t, 12, 3, 9, 135); P(t, 3, 4, "dirt2"); P(t, 3, 5, "red2")
    elseif v == 3 then
      L(t, 2, 1, 5, 5, "ink1"); L(t, 5, 5, 4, 9, "ink1"); L(t, 5, 5, 10, 7, "ink1"); P(t, 6, 5, hi); P(t, 5, 9, hi)
      for _, p in ipairs({ { 10, 10 }, { 11, 10 }, { 12, 11 }, { 11, 11 }, { 10, 11 }, { 12, 12 }, { 13, 12 } }) do P(t, p[1], p[2], (p[2] == 10) and "leaf3" or "leaf2") end
    end
    if deep then mossCreep(t, 7, 140 + v, true) end
  end,
  top = function(t, mask, v)
    -- cast ledge cap with an overhang shadow, moss clumps sitting on it
    for x = 0, TS - 1 do
      P(t, x, 0, "ink4"); P(t, x, 1, "ink3"); P(t, x, 2, "ink3"); P(t, x, 3, "ink2"); P(t, x, 4, "outline"); P(t, x, 5, "ink1")
      if H(x, 1, 150 + v) < 0.12 then P(t, x, 1, "ink2") end
      if H(x, 0, 151 + v) < 0.08 then P(t, x, 0, "ink5") end
    end
    P(t, 15, 0, "ink3"); P(t, 15, 1, "ink2"); P(t, 15, 2, "ink2")
    local clumps = ({ [0] = { { 3, 4 }, { 10, 3 } }, [1] = { { 1, 6 } }, [2] = { { 6, 5 }, { 12, 2 } }, [3] = { { 8, 3 } } })[v % 4]
    for _, cl in ipairs(clumps) do
      local cx, w = cl[1], cl[2]
      for i = 0, w - 1 do
        local x = cx + i
        if x > 0 and x < 15 then
          local edge = (i == 0 or i == w - 1)
          P(t, x, 0, edge and "olive3" or "leaf4"); P(t, x, 1, edge and "leaf2" or "leaf3")
          P(t, x, 2, "leaf2")
          if H(x, 3, v) < 0.5 then P(t, x, 3, "leaf2"); P(t, x, 4, "leaf1") end
          if H(x, 4, v) < 0.25 then P(t, x, 5, "leaf2"); P(t, x, 6, "leaf1") end
        end
      end
    end
  end,
  west = function(t) for y = 0, TS - 1 do P(t, 0, y, "outline"); P(t, 1, y, "ink3") end end,
  east = function(t) for y = 0, TS - 1 do P(t, 15, y, "outline"); P(t, 14, y, "ink1") end end,
  south = function(t)
    mossCreep(t, 9, 160, false)
    for x = 0, TS - 1 do P(t, x, 15, "outline"); P(t, x, 14, G(t, x, 14) == "ink2" and "ink1" or G(t, x, 14)) end
  end,
  ic = function(t, ic)
    if ic == "tl" or ic == "tr" then
      local sx = ic == "tl" and 0 or 15
      local dir = ic == "tl" and 1 or -1
      P(t, sx, 0, "ink3"); P(t, sx, 1, "ink3"); P(t, sx + dir, 1, "ink2"); P(t, sx, 2, "ink2"); P(t, sx, 3, "ink2"); P(t, sx, 4, "outline"); P(t, sx + dir, 4, "ink1")
    else
      local sx = ic == "bl" and 0 or 15
      local dir = ic == "bl" and 1 or -1
      P(t, sx, 15, "outline"); P(t, sx + dir, 15, "ink1"); P(t, sx, 14, "ink1")
    end
  end,
}

local function terrainTile(mat, mask, v, opt)
  opt = opt or {}
  local m = MAT[mat]
  local t = T()
  local fv = (opt.fillv ~= nil) and opt.fillv or ((mask ~= 0) and ((mat == "mud") and 0 or ((mask * 7) % 4)) or v)
  m.fill(t, fv, opt.deep)
  if mask & W ~= 0 then m.west(t) end
  if mask & E ~= 0 then m.east(t) end
  if mask & S ~= 0 then m.south(t) end
  if mask & N ~= 0 then m.top(t, mask, v) end
  -- rounded convex corners
  if mask & N ~= 0 and mask & W ~= 0 then P(t, 0, 0, nil); P(t, 1, 0, nil); P(t, 0, 1, nil) end
  if mask & N ~= 0 and mask & E ~= 0 then P(t, 15, 0, nil); P(t, 14, 0, nil); P(t, 15, 1, nil) end
  if mask & S ~= 0 and mask & W ~= 0 then
    P(t, 0, 15, nil); P(t, 1, 15, nil); P(t, 0, 14, nil); P(t, 1, 14, "outline"); P(t, 0, 13, "outline"); P(t, 2, 15, "outline")
  end
  if mask & S ~= 0 and mask & E ~= 0 then
    P(t, 15, 15, nil); P(t, 14, 15, nil); P(t, 15, 14, nil); P(t, 14, 14, "outline"); P(t, 15, 13, "outline"); P(t, 13, 15, "outline")
  end
  if opt.ic then m.ic(t, opt.ic) end
  return t
end

-- background remaps: darker, cooler, lower contrast and outline-free
local BG_BANK = {
  leaf5 = "leaf3", leaf4 = "leaf2", leaf3 = "leaf2", leaf2 = "leaf1", leaf1 = "leaf1",
  olive5 = "olive3", olive4 = "olive2", olive3 = "olive2", olive2 = "olive1", olive1 = "olive1",
  dirt5 = "dirt3", dirt4 = "dirt2", dirt3 = "ink2", dirt2 = "dirt1", dirt1 = "ink1",
  ink5 = "ink3", ink4 = "ink2", ink3 = "ink2", ink2 = "ink1", ink1 = "ink1", outline = "ink1",
  sand2 = "dirt2", sand1 = "dirt1", sky3 = "sky1", weird2 = "weird1", steel2 = "steel1",
}
local BG_PUMP = {
  ink6 = "ink3", ink5 = "ink3", ink4 = "ink2", ink3 = "ink2", ink2 = "ink1", ink1 = "steel1", outline = "steel1", olive1 = "steel1",
  leaf5 = "leaf3", leaf4 = "leaf2", leaf3 = "leaf2", leaf2 = "leaf1", olive3 = "olive2", olive2 = "olive1",
  dirt3 = "dirt2", dirt2 = "dirt1", red2 = "dirt2", red3 = "red2",
  steel5 = "steel3", steel4 = "steel3", steel3 = "steel2", steel2 = "steel1",
}

local TERRAIN_ROWS = { bank = 0, mud = 1, pump = 2 }
local BG_ROWS = { bank = { 3, BG_BANK }, pump = { 4, BG_PUMP } }
for _, mat in ipairs({ "bank", "mud", "pump" }) do
  local row = TERRAIN_ROWS[mat]
  local m = MAT[mat]
  local function both(col, name, t)
    put(col, row, mat .. "_" .. name, t, { collides = true, material = m.material })
    if BG_ROWS[mat] then put(col, BG_ROWS[mat][1], mat .. "_bg_" .. name, remap(t, BG_ROWS[mat][2]), {}) end
  end
  for mask = 0, 15 do both(mask, "m" .. mask, terrainTile(mat, mask, 0)) end
  for i, ic in ipairs({ "tl", "tr", "bl", "br" }) do both(15 + i, "ic_" .. ic, terrainTile(mat, 0, 0, { ic = ic })) end
  for v = 1, 3 do both(19 + v, "fill_v" .. v, terrainTile(mat, 0, v)) end
  for v = 0, 3 do both(23 + v, "deep_v" .. v, terrainTile(mat, 0, v, { deep = true, fillv = v })) end
  for v = 1, 3 do both(26 + v, "top_v" .. v, terrainTile(mat, N, v, { fillv = v })) end
end

---------------------------------------------------------------------------------------------------
-- Row 5: water, shallows, lilies, sinking logs, mud bubbles
local ROW = 5
local WATER = { hazard = "water", material = "water" }
local function crestY(x, f) return WL + math.floor(math.sin((x + f * 4) / 16 * 2 * math.pi) * 1.2 + 0.5) end
local function waterTop(f)
  local t = T()
  for x = 0, TS - 1 do
    local s = math.sin((x + f * 4) / 16 * 2 * math.pi)
    local c = crestY(x, f)
    P(t, x, c, (s < -0.7 or (x + f) % 7 == 0) and "ink4" or "steel3")
    P(t, x, c + 1, (s < -0.3) and "steel3" or "steel2")
    P(t, x, c + 2, "leaf2")
    P(t, x, c + 3, ((x + f) % 2 == 0) and "leaf2" or "steel2")
    for y = c + 4, TS - 1 do
      local col = "leaf1"
      if y <= c + 5 and (x + y) % 2 == 0 then col = "leaf2" end
      P(t, x, y, col)
    end
    -- reflection dashes drifting right
    local sx = wrap(x - f * 4)
    if H(sx // 2, 8, 204) < 0.3 then P(t, x, 9, "steel2") end
    if H(sx // 3, 12, 205) < 0.25 then P(t, x, 12, (H(sx, 1, 206) < 0.3) and "steel3" or "leaf2") end
    if H(wrap(x + f * 4) // 2, 14, 207) < 0.2 then P(t, x, 14, "olive1") end
    -- foam flecks riding just above the crest
    if c >= WL and H(wrap(x + f * 4), 0, 208) < 0.14 then P(t, x, c - 1, "steel3") end
  end
  return t
end
local function waterBody(f, deep)
  local t = T()
  for y = 0, TS - 1 do for x = 0, TS - 1 do
    local c = "leaf1"
    if deep then
      local n = vnoise(x, y, 221, 8)
      if n > 0.62 and (x + y) % 2 == 0 then c = "steel1" elseif n < 0.3 and (x + y) % 2 == 0 then c = "outline" end
    else
      local a = vnoise(wrap(x - f * 4), y, 211, 8)
      local b = vnoise(wrap(x + f * 4), y, 212, 4)
      local n = a * 0.6 + b * 0.4
      if n > 0.66 then c = ((x + y) % 2 == 0) and "olive1" or "leaf1" end
      if n > 0.74 then c = "olive1" end
      if n < 0.22 and (x + y) % 2 == 0 then c = "steel1" end
      local sx = wrap(x - f * 4)
      local h = H(sx, y, 213)
      if h < 0.012 then c = "steel2" elseif h > 0.993 then c = "ink2" end
    end
    P(t, x, y, c)
  end end
  return t
end
local wtop, wbody = {}, {}
for f = 0, 3 do wtop[f] = put(f, ROW, "water_top_f" .. f, waterTop(f), WATER) end
for f = 0, 3 do wbody[f] = put(4 + f, ROW, "water_body_f" .. f, waterBody(f, false), WATER) end
put(8, ROW, "water_deep", waterBody(0, true), WATER)
byName["water_top_f0"].anim = { { id = wtop[0], ms = 150 }, { id = wtop[1], ms = 150 }, { id = wtop[2], ms = 150 }, { id = wtop[3], ms = 150 } }
byName["water_body_f0"].anim = { { id = wbody[0], ms = 200 }, { id = wbody[1], ms = 200 }, { id = wbody[2], ms = 200 }, { id = wbody[3], ms = 200 } }

-- shallow riverbed: silt seen through murky water, top line = the floor
local SHALLOW = { collides = true, material = "shallow" }
local function siltFill(t, v)
  for y = 0, TS - 1 do for x = 0, TS - 1 do
    local n = vnoise(x, y, 231, 4) * 0.7 + vnoise(x, y, 232, 2) * 0.3
    local c = shade({ "steel1", "leaf1", "leaf1", "olive1" }, n, x, y)
    if y >= 12 then c = shade({ "ink1", "dirt1", "leaf1" }, n * 0.8 + (15 - y) * 0.06, x, y) end
    P(t, x, y, c)
  end end
  for x = 0, TS - 1 do
    P(t, x, 0, (H(x // 2, 0, 233 + v) < 0.3) and "olive3" or "olive2")
    P(t, x, 1, ((x + v) % 3 == 0) and "olive1" or "leaf2")
    if H(x, 2, 234) < 0.35 then P(t, x, 2, "leaf2") end
  end
  if v == 0 then -- sunken twig + pebble
    L(t, 2, 7, 9, 5, "olive1"); L(t, 2, 8, 9, 6, "leaf1"); P(t, 6, 4, "olive1"); P(t, 5, 3, "olive2")
    P(t, 11, 9, "steel3"); P(t, 12, 9, "steel2"); P(t, 13, 9, "steel2"); P(t, 11, 10, "steel2"); P(t, 12, 10, "steel1"); P(t, 13, 10, "steel1")
  elseif v == 1 then
    P(t, 4, 8, "steel3"); P(t, 5, 8, "steel2"); P(t, 4, 9, "steel2"); P(t, 5, 9, "steel1")
    L(t, 8, 10, 13, 9, "olive1"); P(t, 10, 8, "olive2"); P(t, 11, 9, "olive2")
    P(t, 2, 4, "steel2"); P(t, 13, 5, "steel2")
  end
  -- a glint where light catches the silt
  P(t, 6 + v * 3, 0, "steel3")
end
local function shallowEdge(side)
  local t = T()
  siltFill(t, 1)
  -- the bank's lip (like bank_m3) on the left, curling down under the silt
  local lip = T()
  for y = 0, TS - 1 do for x = 0, 8 do
    local n = vnoise(x, y, 101, 4) * 0.65 + vnoise(x, y, 102, 2) * 0.35
    P(lip, x, y, shade({ "ink1", "dirt1", "dirt2", "dirt2", "dirt2" }, n, x, y))
  end end
  local gt, gb = BANK_GT[0], BANK_GB[0]
  local edgeX = { [0] = 8, 8, 8, 8, 8, 7, 7, 6, 5, 4, 3, 3, 2, 2, 1, 1 } -- lip profile (x of the edge per y)
  for y = 0, TS - 1 do
    local ex = edgeX[y]
    for x = ex + 1, 8 do P(lip, x, y, nil) end
    P(lip, ex, y, "outline"); P(lip, ex - 1, y, "ink1")
  end
  for x = 0, 8 do
    local g, b = gt[x + 1], gb[x + 1]
    for y = 0, g - 1 do P(lip, x, y, nil) end
    for y = g, b - 1 do P(lip, x, y, (y == g) and "leaf4" or ((y == b - 1) and "leaf2" or "leaf3")) end
    P(lip, x, b, "ink1")
  end
  -- turf rolling over the lip edge and drooping into the pool
  for _, p in ipairs({ { 8, 2, "leaf3" }, { 8, 3, "leaf3" }, { 8, 4, "leaf2" }, { 9, 3, "leaf2" }, { 9, 4, "leaf2" }, { 9, 5, "leaf1" },
    { 8, 5, "leaf2" }, { 8, 6, "leaf1" }, { 7, 6, "leaf2" }, { 7, 7, "leaf1" } }) do P(lip, p[1], p[2], p[3]) end
  P(lip, 3, 1, "olive4"); P(lip, 4, 0, "olive5"); P(lip, 4, 1, "leaf4")
  -- the submerged part of the lip is seen through the water: tint below the first rows
  remapIn(lip, UNDER1, 7, 3, 9, 15); remapIn(lip, UNDER1, 0, 9, 9, 15)
  t:drawImage(lip, Point(0, 0))
  -- silt drifting up against the lip
  for _, p in ipairs({ { 9, 6 }, { 10, 6 }, { 9, 7 }, { 8, 8 }, { 7, 9 }, { 6, 10 }, { 5, 11 } }) do P(t, p[1], p[2], "olive2") end
  if side == "r" then t = flipX(t) end
  return t
end
put(9, ROW, "shallow_l", shallowEdge("l"), SHALLOW)
local sm = T(); siltFill(sm, 0); put(10, ROW, "shallow_m", sm, SHALLOW)
local sm2 = T(); siltFill(sm2, 1); put(11, ROW, "shallow_m2", sm2, SHALLOW)
put(12, ROW, "shallow_r", shallowEdge("r"), SHALLOW)

-- lily pads (front layer): flat pads + a small flower in the top 3 px
local function lily(v)
  local t = T()
  local function pad(x0, w, notch)
    for i = 0, w - 1 do
      local edge = (i == 0 or i == w - 1)
      if not edge then P(t, x0 + i, 1, (i < w / 2) and "leaf4" or "leaf3") end
      P(t, x0 + i, 2, edge and "leaf2" or ((i % 3 == 0) and "leaf3" or "leaf2"))
    end
    P(t, x0 + notch, 1, nil); P(t, x0 + notch, 2, "leaf1")
    P(t, x0 + 1, 1, "leaf5")
  end
  if v == 1 then
    pad(1, 7, 4); pad(10, 5, 2)
    P(t, 4, 0, "white"); P(t, 5, 0, "skin5"); P(t, 3, 1, "white"); P(t, 5, 1, "red5"); P(t, 4, 1, "fire5"); P(t, 6, 1, "skin4")
  else
    pad(0, 5, 1); pad(6, 8, 5)
    P(t, 9, 0, "skin5"); P(t, 10, 0, "white"); P(t, 8, 1, "white"); P(t, 9, 1, "fire5"); P(t, 10, 1, "red5"); P(t, 11, 1, "skin4")
    P(t, 15, 2, "leaf3")
  end
  return t
end
put(13, ROW, "lily_a", lily(1), {})
put(14, ROW, "lily_b", lily(2), {})

-- Floating cypress logs. The tile holds the log AND the water around it (built on water_top_f0), so swapping a
-- log tile for water is seamless. The water surface band runs y 3..7 (far crest at y 3), so a floating log meets
-- the water lower down, at its own waterline `wl`; everything below is seen through the water (tinted).
local function logImg(kind, spec)
  local t = T()
  local top, th, rot = spec.top, spec.th, spec.rot
  local x0, x1 = 0, 15
  if kind == "l" then x0 = 1 elseif kind == "r" then x1 = 14 end
  -- rot (sinking): warm brown bark, lit top, dark underside. stable: grey weathered bark
  local ramp = rot and { "dirt5", "dirt4", "dirt4", "dirt3", "dirt3", "dirt3", "dirt2", "dirt2", "dirt1" } or { "ink4", "ink3", "ink3", "ink2", "dirt2", "dirt2", "dirt1" }
  for x = x0, x1 do
    for y = top, top + th - 1 do
      local k = (y - top) / (th - 1)
      local c = ramp[1 + math.floor(k * (#ramp - 1) + 0.5)]
      if rot then
        -- bark grain along the log, soft rot spots
        local gr = (y - top) % 3
        if y > top + 1 and gr == 1 and H(x // 3, y, spec.seed) < 0.6 then c = (k < 0.5) and "dirt3" or "dirt2" end
        if y > top + 1 and H(x // 2, y, spec.seed + 1) < 0.08 then c = "ink2" end
        if y == top + 1 and H(x, 1, spec.seed + 4) < 0.3 then c = "sand3" end
      else
        local gr = (y - top) % 3
        if gr == 2 and H(x // 4, y, spec.seed) < 0.7 then c = (k < 0.45) and "ink2" or "dirt1" end
        if gr == 0 and k > 0.1 and k < 0.6 and H(x, y, spec.seed + 2) < 0.12 then c = "ink4" end
      end
      P(t, x, y, c)
    end
    P(t, x, top + th, "outline")
  end
  if rot then
    -- moss blanket, rot holes, bracket fungus: this log is rotten and SINKS
    for x = x0, x1 do
      local m = vnoise(x, 0, spec.seed + 5, 8)
      if m > 0.6 then -- moss patches (not a full coat)
        P(t, x, top, (m > 0.7) and "leaf4" or "olive4"); P(t, x, top + 1, (m > 0.66) and "leaf3" or "olive3")
        if m > 0.68 then P(t, x, top + 2, "leaf2") end
        if m > 0.76 and x % 2 == 0 then P(t, x, top + 3, "leaf2"); P(t, x, top + 4, "leaf1") end
      else
        P(t, x, top, (H(x, 0, spec.seed + 6) < 0.3) and "sand3" or "dirt5")
      end
    end
    for _, hx in ipairs(spec.holes or {}) do
      P(t, hx, top + 3, "dirt2"); P(t, hx + 1, top + 3, "dirt2")
      P(t, hx - 1, top + 4, "dirt2"); P(t, hx, top + 4, "dirt1"); P(t, hx + 1, top + 4, "ink1"); P(t, hx + 2, top + 4, "dirt3")
      P(t, hx, top + 5, "dirt1"); P(t, hx + 1, top + 5, "dirt2")
    end
    for _, fx in ipairs(spec.fungus or {}) do
      P(t, fx, top + 2, "sand3"); P(t, fx + 1, top + 2, "sand3"); P(t, fx + 2, top + 2, "sand2"); P(t, fx - 1, top + 3, "sand2")
      P(t, fx, top + 3, "sand1"); P(t, fx + 1, top + 3, "sand1"); P(t, fx + 2, top + 3, "dirt1")
    end
  else
    for x = x0, x1 do
      P(t, x, top, (H(x, 0, spec.seed) < 0.2) and "ink4" or "ink5")
      if H(x // 5, 0, spec.seed + 3) < 0.22 then P(t, x, top, "olive3"); P(t, x, top + 1, "olive2") end
    end
    for _, kx in ipairs(spec.knots or {}) do
      local ky = top + 4
      P(t, kx - 1, ky, "ink3"); P(t, kx, ky, "dirt1"); P(t, kx + 1, ky, "dirt1"); P(t, kx + 2, ky, "dirt2")
      P(t, kx, ky - 1, "ink4"); P(t, kx + 1, ky + 1, "ink2"); P(t, kx, ky + 1, "dirt2")
    end
  end
  -- cut end with growth rings (ellipse 5 x th), outline beyond it
  local function cap(xa, side)
    local cy = top + (th - 1) / 2
    local ry = th / 2
    for y = top, top + th do for i = 0, 4 do P(t, xa + i, y, nil) end end
    for y = top, top + th - 1 do
      for i = 0, 4 do
        local dx, dy = (i - 2) / 2.5, (y - cy) / ry
        local d = math.sqrt(dx * dx + dy * dy)
        if d <= 1.02 then
          local c
          if rot then
            if d > 0.78 then c = (dy < -0.2 or dx < -0.5) and "dirt3" or "dirt1"
            elseif d > 0.5 then c = (dy < 0) and "dirt4" or "dirt3"
            else c = (dy < -0.3) and "dirt1" or "outline" end
          else
            if d > 0.8 then c = (dy < -0.2 or dx < -0.5) and "ink3" or "dirt1"
            elseif d > 0.62 then c = (dy < 0) and "dirt5" or "dirt4"
            elseif d > 0.42 then c = "dirt3"
            elseif d > 0.22 then c = "dirt4"
            else c = "dirt2" end
          end
          P(t, xa + i, y, c)
        end
      end
    end
    local ox = (side == "l") and xa - 1 or xa + 5
    for y = top + 1, top + th - 2 do P(t, ox, y, "outline") end
    P(t, xa + 2, top + th, "outline")
    if rot then P(t, xa + 1, top, "leaf3"); P(t, xa + 2, top, "leaf4"); P(t, xa + 3, top + 1, "leaf2") end
  end
  if kind == "l" then cap(x0, "l") elseif kind == "r" then cap(x1 - 4, "r") end
  return t, x0, x1
end
local function bubble(t, bx, by, big)
  if big then P(t, bx, by, "steel3"); P(t, bx + 1, by - 1, "ink4"); P(t, bx + 2, by, "steel3"); P(t, bx + 1, by + 1, "steel2")
  else P(t, bx, by, (by < WL) and "ink4" or "steel3") end
end
local function floatLog(kind, spec)
  local t = waterTop(0)
  local lg, x0, x1 = logImg(kind, spec)
  local wl = spec.wl
  remapIn(lg, UNDER1, 0, wl + 1, 15, wl + 3)
  remapIn(lg, UNDER2, 0, wl + 4, 15, 15)
  if spec.hide then remapIn(lg, UNDER2, 0, spec.hide, 15, 15); remapIn(lg, UNDER2, 0, spec.hide + 2, 15, 15) end
  t:drawImage(lg, Point(0, 0))
  -- foam line where the log meets the water
  for x = x0, x1 do
    local h = H(x, wl, spec.seed + 9)
    if h < (spec.ring and 0.75 or 0.5) then P(t, x, wl, (h < 0.22) and "ink4" or "steel3") end
    if h > 0.4 then P(t, x, wl + 1, "steel2") end
  end
  -- ripples wrapping the log ends
  local function endRipple(xe, dir)
    P(t, xe, wl, "ink4"); P(t, xe + dir, wl, "steel3"); P(t, xe, wl - 1, "steel3"); P(t, xe, wl + 1, "steel2")
    if spec.ring then
      for _, p in ipairs({ { 1, WL - 1 }, { 2, WL }, { 3, WL + 1 }, { 2, WL + 3 }, { 1, WL + 4 } }) do P(t, xe + dir * p[1], p[2], (p[1] == 2) and "ink4" or "steel3") end
    end
  end
  if kind == "l" then endRipple(x0 - 1, -1) elseif kind == "r" then endRipple(x1 + 1, 1) end
  if spec.ring then
    -- the bobbing log pushes a ring of ripples along its sides
    for x = x0, x1 do if (x + 1) % 3 ~= 0 then P(t, x, wl + 2, (x % 4 == 0) and "ink4" or "steel3") end end
  end
  for _, b in ipairs(spec.bubbles or {}) do bubble(t, b[1], b[2], b[3]) end
  return t
end
local SINK = { collides = true, oneway = true, material = "wood", sink = true }
local SPEC = {
  l = { holes = { 10 }, fungus = {}, seed = 301 },
  m = { holes = { 11 }, fungus = { 4 }, seed = 302 },
  r = { holes = {}, fungus = { 6 }, seed = 303 },
}
local col = 15
for _, stage in ipairs({ "", "_bob", "_s1", "_s2" }) do
  for _, kind in ipairs({ "l", "m", "r" }) do
    local base = SPEC[kind]
    local spec = { rot = true, th = 11, top = 0, wl = 9, seed = base.seed, holes = base.holes, fungus = base.fungus }
    local props = SINK
    local t
    if stage == "_bob" then spec.top = 2; spec.ring = true
    elseif stage == "_s1" then spec.top = 6; spec.ring = true; spec.bubbles = { { 3, 4 }, { 10, 4, true }, { 7, 12 }, { 12, 13 } }; props = WATER
    elseif stage == "_s2" then props = WATER end
    if stage == "_s2" then
      -- just a dark shape under the surface + bubbles breaking it
      t = waterTop(0)
      spec.top = 10
      local lg = logImg(kind, spec)
      for y = 0, 15 do for x = 0, 15 do
        if A(lg, x, y) then P(t, x, y, (y < spec.top + 2) and "olive1" or (((x + y) % 2 == 0) and "steel1" or "leaf1")) end
      end end
      for _, b in ipairs({ { 3, 5, true }, { 9, 4 }, { 12, 6 }, { 6, 8 }, { 11, 9, true }, { 7, 13 } }) do bubble(t, b[1], b[2], b[3]) end
      for x = 1, 14 do if (x * 7) % 5 ~= 1 then P(t, x, 9, (x % 3 == 0) and "ink4" or "steel3") end end -- churned surface over it
    else
      t = floatLog(kind, spec)
    end
    put(col, ROW, "sinklog_" .. kind .. stage, t, props)
    col = col + 1
  end
end

-- mud bubble rising and popping on an m1-style mud top (a little basin at x 6..11 gives the dome headroom)
local MUDP = { collides = true, material = "mud" }
local mb = {}
for f = 0, 3 do
  local t = terrainTile("mud", N, 0)
  local cx = 8
  -- basin: surface pushed down to y 2 around the vent so the dome has headroom
  for x = 4, 12 do
    for y = 0, 1 do P(t, x, y, nil) end
    P(t, x, 2, (x < 7) and "ink3" or "dirt2"); P(t, x, 3, (x % 3 == 0) and "steel2" or "dirt1"); P(t, x, 4, "dirt1"); P(t, x, 5, "ink1")
  end
  P(t, 3, 1, "ink3"); P(t, 13, 1, "dirt2")
  local y0 = 2
  -- concentric wet rings around the vent
  if f >= 1 then P(t, cx - 3, y0, "steel3"); P(t, cx + 4, y0, "steel2") end
  if f == 0 then -- the surface swells
    P(t, cx - 1, y0 - 1, "ink3"); P(t, cx, y0 - 1, "dirt2"); P(t, cx + 1, y0 - 1, "dirt1"); P(t, cx, y0, "ink4"); P(t, cx - 1, y0, "steel2")
  elseif f == 1 then -- a small glossy dome
    for i = -2, 2 do P(t, cx + i, y0 - 1, (i == -2) and "ink3" or ((i == 2) and "dirt1" or "dirt2")) end
    for i = -1, 1 do P(t, cx + i, y0 - 2, (i == -1) and "ink3" or "dirt2") end
    P(t, cx - 1, y0 - 2, "ink4"); P(t, cx + 2, y0, "dirt1"); P(t, cx - 2, y0, "ink3")
  elseif f == 2 then -- big stretched dome, bright spec, about to burst
    for i = -3, 3 do P(t, cx + i, y0 - 1, (i <= -2) and "ink3" or ((i == 3) and "ink1" or "dirt2")) end
    for i = -2, 2 do P(t, cx + i, y0 - 2, (i == -2) and "ink4" or ((i == 2) and "dirt1" or "dirt2")) end
    P(t, cx - 1, y0 - 2, "ink5"); P(t, cx, y0 - 2, "ink4"); P(t, cx - 3, y0, "steel3"); P(t, cx + 3, y0, "ink1"); P(t, cx + 1, y0 - 1, "ink2")
  else -- pop: dark crater, flung droplets, wet ring
    P(t, cx - 1, y0, "outline"); P(t, cx, y0, "outline"); P(t, cx + 1, y0, "outline"); P(t, cx, y0 + 1, "ink1")
    P(t, cx - 2, y0, "ink4"); P(t, cx + 2, y0, "steel3"); P(t, cx - 3, y0, "steel3"); P(t, cx + 3, y0, "ink3")
    P(t, cx - 4, 0, "ink4"); P(t, cx + 4, 0, "ink4"); P(t, cx - 2, 0, "ink3"); P(t, cx + 2, 1, "ink3"); P(t, cx, 0, "ink5"); P(t, cx + 1, 0, "dirt2")
  end
  mb[f] = put(27 + f, ROW, "mud_bubble_f" .. f, t, MUDP)
end
byName["mud_bubble_f0"].anim = { { id = mb[0], ms = 180 }, { id = mb[1], ms = 180 }, { id = mb[2], ms = 180 }, { id = mb[3], ms = 180 } }

---------------------------------------------------------------------------------------------------
-- Row 6: stable logs, boardwalk, posts, rotten dock + rail, mangrove roots, cypress limb, dry logs
ROW = 6
local ONEWAY_WOOD = { collides = true, oneway = true, material = "wood" }
local ONEWAY_METAL = { collides = true, oneway = true, material = "metal" }
local LOGSPEC = { l = { knots = { 10 }, seed = 311 }, m = { knots = { 5 }, seed = 312 }, m2 = { knots = {}, seed = 313 }, r = { knots = { 4 }, seed = 314 } }
-- big stable fallen cypress (bark, not rotten): thicker and riding higher, waterline at y 9
for i, kind in ipairs({ "l", "m", "m2", "r" }) do
  local s = LOGSPEC[kind]
  local spec = { rot = false, th = 14, top = 0, wl = 11, seed = s.seed, knots = s.knots }
  put(i - 1, ROW, "log_" .. kind, floatLog((kind == "m2") and "m" or kind, spec), ONEWAY_WOOD)
end

-- boardwalk: plank ends on a stringer beam, joists below
local function boardwalk(kind, v, dock)
  local t = T()
  local sag = function(x) return 0 end
  if dock then sag = function(x) return math.floor(math.sin(x / 15 * math.pi) * (v == 1 and 1.6 or 1.0) + 0.5) end end
  for x = 0, TS - 1 do
    local s = sag(x)
    local plank = (x + v) // 4
    local gap = ((x + v) % 4 == 3)
    local tone = H(plank, 0, 401 + (dock and 7 or 0))
    local lite, mid, dark = "ink4", "ink3", "ink2"
    if tone < 0.4 then lite, mid, dark = "dirt4", "dirt3", "dirt2" end
    if dock then lite, mid, dark = (tone < 0.5) and "dirt3" or "ink3", (tone < 0.5) and "dirt2" or "ink2", "ink1" end
    if gap then
      P(t, x, s + 0, dark); P(t, x, s + 1, "outline"); P(t, x, s + 2, "outline"); P(t, x, s + 3, "outline")
    else
      P(t, x, s + 0, lite); P(t, x, s + 1, mid); P(t, x, s + 2, mid); P(t, x, s + 3, dark)
      if H(x, 2, 402) < 0.18 then P(t, x, s + 2, dark) end
    end
    -- stringer beam
    P(t, x, s + 4, dock and "dirt2" or "dirt3"); P(t, x, s + 5, dock and "dirt1" or "dirt2"); P(t, x, s + 6, "dirt1"); P(t, x, s + 7, "outline")
    if H(x // 3, 5, 403 + v) < 0.3 then P(t, x, s + 5, dock and "ink1" or "dirt1") end
  end
  -- nails
  for _, nx in ipairs({ 1, 9 }) do P(t, nx, sag(nx) + 4, dock and "ink2" or "ink4") end
  -- joists under the deck
  for _, jx in ipairs({ 3, 11 }) do
    local s = sag(jx)
    R(t, jx, s + 8, 3, 2, dock and "dirt1" or "dirt2"); P(t, jx, s + 8, dock and "dirt2" or "dirt3"); R(t, jx, s + 10, 3, 1, "outline")
  end
  if dock then
    -- moss tufts on the deck and hanging off the stringer
    for x = 0, TS - 1 do
      local m = vnoise(x, v, 404, 4)
      if m > 0.6 then P(t, x, sag(x), "olive3"); if m > 0.7 then P(t, x, sag(x) + 1, "leaf3") end end
      if m > 0.55 and x % 2 == 0 then
        local len = 1 + math.floor(H(x, 9, 405 + v) * 4)
        for y = 1, len do P(t, x, sag(x) + 7 + y, (y == len) and "leaf1" or "leaf2") end
      end
    end
  end
  if kind == "l" then
    for y = 0, 10 do P(t, 0, y, nil) end
    for y = 0, 7 do P(t, 1, y, "outline") end
    P(t, 2, 0, dock and "dirt3" or "ink5"); P(t, 1, 0, nil)
  elseif kind == "r" then
    for y = 0, 10 do P(t, 15, y, nil) end
    for y = 0, 7 do P(t, 14, y, "outline") end
    P(t, 14, 0, nil)
  elseif kind == "broken" then
    -- a missing plank: dark hole into the stringer, splintered ends
    for x = 5, 9 do for y = 0, 3 do P(t, x, y, nil) end; P(t, x, 4, "dirt1"); P(t, x, 3, "outline") end
    P(t, 4, 0, "ink3"); P(t, 4, 1, "ink2"); P(t, 10, 0, "ink4"); P(t, 10, 1, "dirt3"); P(t, 5, 1, "ink2"); P(t, 9, 0, "dirt4"); P(t, 9, 2, "dirt3")
    P(t, 6, 2, "outline"); P(t, 8, 2, "outline")
  end
  return t
end
put(4, ROW, "walk_l", boardwalk("l", 0), ONEWAY_WOOD)
put(5, ROW, "walk_m", boardwalk("m", 0), ONEWAY_WOOD)
put(6, ROW, "walk_m2", boardwalk("m", 2), ONEWAY_WOOD)
put(7, ROW, "walk_r", boardwalk("r", 0), ONEWAY_WOOD)
put(8, ROW, "walk_broken", boardwalk("broken", 1), ONEWAY_WOOD)

-- grey cypress post (back layer: no outline, dark edges)
local function postImg(kind)
  local t = T()
  local cols = { "ink2", "ink4", "ink3", "dirt3", "dirt3", "dirt2", "dirt1", "ink1" }
  for y = 0, TS - 1 do
    for i, c in ipairs(cols) do P(t, 3 + i, y, c) end
    if H(6, y, 411) < 0.25 then P(t, 6, y, "dirt3") end
    if H(8, y, 412) < 0.2 then P(t, 8, y, "dirt2") end
  end
  -- moss streak on the lit side
  for y = 5, 11 do if H(5, y, 413) < 0.6 then P(t, 5, y, "olive2") end end
  P(t, 6, 7, "olive3")
  if kind == "top" then
    -- bolted bracket plate under the deck
    for y = 0, 3 do for x = 3, 12 do P(t, x, y, (y == 0) and "steel3" or ((x == 3) and "steel3" or "steel2")) end end
    for x = 3, 12 do P(t, x, 4, "steel1") end
    P(t, 5, 1, "steel4"); P(t, 10, 1, "steel4"); P(t, 5, 2, "dirt2"); P(t, 10, 2, "red2"); P(t, 10, 3, "dirt2")
  elseif kind == "wl" then
    remapIn(t, UNDER1, 0, WL + 1, 15, WL + 4); remapIn(t, UNDER2, 0, WL + 5, 15, 15)
    for y = WL + 5, 15 do for x = 0, 15 do if A(t, x, y) and H(x, y, 414) < 0.15 then P(t, x, y, nil) end end end
    for x = 1, 14 do
      if x < 4 or x > 11 then if x % 3 ~= 0 then P(t, x, WL, "steel3") end; if x % 4 == 1 then P(t, x, WL + 1, "steel2") end
      else P(t, x, WL, (x % 2 == 0) and "ink4" or "steel3") end
    end
    P(t, 0, WL + 1, "steel2"); P(t, 15, WL + 1, "steel2")
  elseif kind == "base" then
    for x = 1, 14 do
      local h = math.max(0, 4 - math.floor(math.abs(x - 7.5) / 2))
      for y = 15 - h, 15 do P(t, x, y, (y == 15 - h) and ((x < 8) and "sand2" or "dirt3") or ((y == 16 - h) and "dirt2" or "dirt1")) end
    end
    P(t, 6, 12, "ink3"); P(t, 4, 13, "sand1")
  end
  return t
end
put(9, ROW, "post_top", postImg("top"), {})
put(10, ROW, "post_mid", postImg("mid"), {})
put(11, ROW, "post_wl", postImg("wl"), {})
put(12, ROW, "post_base", postImg("base"), {})

put(13, ROW, "dock_l", boardwalk("l", 0, true), ONEWAY_WOOD)
put(14, ROW, "dock_m", boardwalk("m", 0, true), ONEWAY_WOOD)
put(15, ROW, "dock_m2", boardwalk("m", 1, true), ONEWAY_WOOD)
put(16, ROW, "dock_r", boardwalk("r", 2, true), ONEWAY_WOOD)
-- dock handrail (back layer): top rail at y 4, mid rail at y 10, balusters
local function dockRail(post)
  local t = T()
  for x = 0, TS - 1 do
    P(t, x, 4, (H(x, 4, 421) < 0.2) and "ink2" or "ink3"); P(t, x, 5, "dirt2"); P(t, x, 6, "ink1")
    P(t, x, 10, "dirt2"); P(t, x, 11, "ink1")
  end
  -- a broken baluster and moss on the rail
  for _, bx in ipairs({ 3, 12 }) do for y = 7, 15 do P(t, bx, y, "dirt2"); P(t, bx + 1, y, "ink1") end end
  for x = 6, 9 do P(t, x, 3, (x == 7) and "olive3" or "leaf2") end
  P(t, 7, 7, "leaf2"); P(t, 7, 8, "leaf1"); P(t, 8, 7, "leaf1")
  if post then
    for y = 1, 15 do P(t, 6, y, "ink3"); P(t, 7, y, "dirt3"); P(t, 8, y, "dirt2"); P(t, 9, y, "ink1") end
    P(t, 6, 1, "ink4"); P(t, 7, 1, "ink4"); P(t, 8, 1, "ink3"); P(t, 9, 1, "ink2")
    P(t, 6, 0, "ink3"); P(t, 7, 0, "ink3"); P(t, 8, 0, "ink2")
    P(t, 7, 9, "steel3"); P(t, 7, 5, "steel3")
  end
  return t
end
put(17, ROW, "rail_m", dockRail(false), {})
put(18, ROW, "rail_post", dockRail(true), {})

-- mangrove roots: a gnarled root walkway on top, arching prop roots curving down into the lower half
local function rootStroke(t, pts, w0, w1, outline)
  -- pts: list of {x,y} along the root (top to bottom); width tapers w0 -> w1; lit left, dark right
  for i, p in ipairs(pts) do
    local k = (i - 1) / math.max(1, #pts - 1)
    local w = math.floor(w0 + (w1 - w0) * k + 0.5)
    local x, y = p[1], p[2]
    for j = 0, w - 1 do
      local c = (j == 0) and "ink3" or ((j == w - 1) and "dirt1" or "dirt2")
      if w == 1 then c = "dirt2" end
      if j == 1 and w >= 3 and H(x, y, 433) < 0.25 then c = "dirt3" end
      P(t, x + j, y, c)
    end
    if outline then P(t, x - 1, y, "outline"); P(t, x + w, y, "outline") end
  end
end
local function curve(xa, ya, xb, yb, bend)
  -- quadratic curve from (xa,ya) to (xb,yb); bend pushes the middle sideways
  local pts, last = {}, nil
  for y = ya, yb do
    local k = (y - ya) / math.max(1, yb - ya)
    local x = xa + (xb - xa) * k * k + bend * math.sin(k * math.pi)
    x = math.floor(x + 0.5)
    pts[#pts + 1] = { x, y }
  end
  return pts
end
local function rootPlat(kind, v)
  local t = T()
  local x0, x1 = 0, 15
  if kind == "l" then x0 = 2 elseif kind == "r" then x1 = 13 end
  local legs = ({
    l = { { 3, 0, -1 }, { 10, 13, 1 } },
    m = { { 3, 0, 0 }, { 10, 14, 1 } },
    m2 = { { 6, 4, -1 } },
    r = { { 4, 1, -1 }, { 10, 13, 0 } },
  })[kind]
  for _, lg in ipairs(legs) do rootStroke(t, curve(lg[1], 5, lg[2], 15, lg[3]), 4, 2, true) end
  for x = x0, x1 do
    local top = (math.sin((x + v * 5) / 16 * 2 * math.pi) > 0.55) and 1 or 0
    for y = top, 5 do
      local d = y - top
      local c = (d == 0) and "ink4" or ((d == 1) and "ink3" or ((d == 2) and "dirt3" or ((d == 3) and "dirt2" or "dirt1")))
      if d >= 1 and H(x, y, 431 + v) < 0.15 then c = "dirt2" end
      P(t, x, y, c)
    end
    if not A(t, x, 6) or G(t, x, 6) == "outline" then P(t, x, 6, "outline") end
    if H(x // 3, 0, 432 + v) < 0.35 then P(t, x, top, "olive4"); P(t, x, top + 1, "leaf3") end
  end
  -- twisting grain
  L(t, x0 + 1, 3, x0 + 5, 2, "dirt2"); L(t, x1 - 6, 4, x1 - 2, 3, "dirt2")
  if kind == "l" then
    for y = 0, 6 do P(t, x0 - 1, y, (y > 0 and y < 6) and "outline" or nil) end
    P(t, x0, 0, nil)
  elseif kind == "r" then
    for y = 0, 6 do P(t, x1 + 1, y, (y > 0 and y < 6) and "outline" or nil) end
    P(t, x1, 0, nil)
  end
  return t
end
put(19, ROW, "root_l", rootPlat("l", 0), ONEWAY_WOOD)
put(20, ROW, "root_m", rootPlat("m", 0), ONEWAY_WOOD)
put(21, ROW, "root_m2", rootPlat("m2", 1), ONEWAY_WOOD)
put(22, ROW, "root_r", rootPlat("r", 2), ONEWAY_WOOD)
-- back-layer root tangles (no outline): smooth hanging roots that cross and loop
local function rootTangle(kind)
  local t = T()
  local function strand(fx, w0, w1, y1)
    local pts = {}
    for y = 0, y1 or 15 do pts[#pts + 1] = { math.floor(fx(y) + 0.5), y } end
    rootStroke(t, pts, w0, w1, false)
  end
  if kind == "a" then
    strand(function(y) return 2 + 2.2 * math.sin(y / 15 * math.pi) end, 3, 2)
    strand(function(y) return 10 - 3.5 * math.sin(y / 15 * math.pi * 0.9) end, 2, 2)
    strand(function(y) return 12 + 1.5 * math.sin(y / 5) end, 2, 1, 11)
  elseif kind == "b" then
    strand(function(y) return 5 - 2.5 * math.sin(y / 15 * math.pi) end, 3, 2)
    strand(function(y) return 9 + 3 * math.sin(y / 15 * math.pi) end, 3, 2)
    strand(function(y) return 13 - 1.0 * math.sin(y / 4) end, 1, 1, 9)
  else
    for y = 0, 15 do for x = 4, 11 do
      local c = (x == 4) and "ink2" or ((x <= 6) and "ink3" or ((x <= 8) and "dirt2" or ((x == 11) and "ink1" or "dirt1")))
      if H(x, y // 2, 441) < 0.12 then c = "dirt1" end
      P(t, x, y, c)
    end end
    remapIn(t, UNDER1, 0, WL + 1, 15, WL + 4); remapIn(t, UNDER2, 0, WL + 5, 15, 15)
    for x = 1, 14 do if x < 4 or x > 11 then if x % 3 ~= 0 then P(t, x, WL, "steel3") end else P(t, x, WL, (x % 2 == 0) and "ink4" or "steel3") end end
  end
  if kind ~= "leg" then for y = 0, 15 do for x = 0, 15 do if A(t, x, y) and H(x, y, 442) < 0.07 then P(t, x, y, "olive2") end end end end
  -- back layer: drop one shade
  return remap(t, { ink3 = "ink2", ink2 = "ink1", dirt3 = "dirt2", dirt2 = "dirt1", dirt1 = "ink1", olive2 = "olive1" })
end
put(23, ROW, "roots_hang_a", rootTangle("a"), {})
put(24, ROW, "roots_hang_b", rootTangle("b"), {})
put(25, ROW, "roots_leg", rootTangle("leg"), {})

-- cypress limb (one-way) with moss on top and drapes underneath
local function limb(kind)
  local t = T()
  for x = 0, TS - 1 do
    local th = 6
    if kind == "l" then th = 7 + ((x < 5) and 2 or ((x < 10) and 1 or 0))
    elseif kind == "r" then th = (x < 6) and 6 or ((x < 10) and 5 or ((x < 13) and 4 or 3)) end
    if not (kind == "r" and x > 14) then
      for y = 0, th - 1 do
        local k = y / (th - 1)
        local c = (k < 0.2) and "ink4" or ((k < 0.45) and "ink3" or ((k < 0.75) and "dirt3" or "dirt2"))
        if y > 0 and H(x // 3, y, 451) < 0.18 then c = "dirt2" end
        P(t, x, y, c)
      end
      P(t, x, th, "outline")
      -- moss blanket
      local m = vnoise(x, 0, 452, 4)
      if m > 0.3 then P(t, x, 0, (m > 0.55) and "leaf4" or "olive3"); P(t, x, 1, "leaf3"); if m > 0.6 then P(t, x, 2, "leaf2") end end
      -- moss drapes
      if x % 3 == 1 and H(x, 7, 453) < 0.7 then
        local len = 2 + math.floor(H(x, 8, 454) * 5)
        for y = th + 1, math.min(15, th + len) do P(t, x, y, (y == th + len) and "olive2" or ((y % 2 == 0) and "ink3" or "olive3")) end
      end
    end
  end
  if kind == "l" then
    -- the limb grows out of the trunk: a collar of bark on the left
    for y = 0, 12 do P(t, 0, y, "dirt2"); P(t, 1, y, (y < 2) and "ink3" or "dirt3") end
    P(t, 2, 10, "dirt2"); P(t, 2, 11, "ink1"); P(t, 0, 13, "ink1"); P(t, 1, 13, "ink1")
  elseif kind == "r" then
    for y = 0, 15 do P(t, 15, y, nil) end
    P(t, 14, 0, nil); P(t, 14, 1, "olive3"); P(t, 15, 1, "leaf3"); P(t, 15, 0, "leaf4")
  end
  return t
end
put(26, ROW, "limb_l", limb("l"), ONEWAY_WOOD)
put(27, ROW, "limb_m", limb("m"), ONEWAY_WOOD)
put(28, ROW, "limb_r", limb("r"), ONEWAY_WOOD)
-- extra: dry bark logs (no water) for logs bridging gaps above the waterline
for i, kind in ipairs({ "l", "m", "r" }) do
  local s = LOGSPEC[kind]
  local t = logImg(kind, { rot = false, th = 12, top = 0, seed = s.seed, knots = s.knots })
  put(28 + i, ROW, "log_dry_" .. kind, t, ONEWAY_WOOD)
end

---------------------------------------------------------------------------------------------------
-- Row 7: stilt shack (deck, roof, walls, windows, doorway, stilts), rope bridge deck
ROW = 7
local function sdeck(kind, v)
  local t = T()
  for x = 0, TS - 1 do
    local seam = ((x + v * 5) % 8 == 7)
    P(t, x, 0, seam and "dirt2" or "dirt4"); P(t, x, 1, seam and "dirt1" or "dirt3"); P(t, x, 2, "dirt3"); P(t, x, 3, seam and "dirt1" or "dirt2")
    if H(x, 2, 461 + v) < 0.2 then P(t, x, 2, "dirt2") end
    -- fascia board
    P(t, x, 4, "ink3"); P(t, x, 5, "ink2"); P(t, x, 6, "ink2"); P(t, x, 7, "ink1"); P(t, x, 8, "outline")
    if H(x // 2, 5, 462) < 0.2 then P(t, x, 5, "olive2") end
  end
  for _, nx in ipairs({ 2, 10 }) do P(t, (nx + v * 5) % 16, 1, "ink4") end
  P(t, 4, 5, "ink4"); P(t, 12, 5, "ink4")
  -- under-deck shadow and joist ends
  for x = 0, TS - 1 do if x % 8 < 3 then P(t, x, 9, "dirt1"); P(t, x, 10, "outline") end end
  if kind == "l" then for y = 0, 10 do P(t, 0, y, (y < 9) and "outline" or nil) end; P(t, 0, 0, nil)
  elseif kind == "r" then for y = 0, 10 do P(t, 15, y, (y < 9) and "outline" or nil) end; P(t, 15, 0, nil) end
  return t
end
put(0, ROW, "sdeck_l", sdeck("l", 0), ONEWAY_WOOD)
put(1, ROW, "sdeck_m", sdeck("m", 0), ONEWAY_WOOD)
put(2, ROW, "sdeck_m2", sdeck("m", 1), ONEWAY_WOOD)
put(3, ROW, "sdeck_r", sdeck("r", 0), ONEWAY_WOOD)

-- corrugated rusty tin roof
local function roof(kind, v)
  local t = T()
  for x = 0, TS - 1 do
    local r = x % 3
    local c1 = (r == 0) and "steel4" or ((r == 1) and "steel3" or "steel2")
    P(t, x, 0, (r == 2) and "steel3" or "steel4")
    for y = 1, 8 do
      local c = c1
      local rust = vnoise(x, y, 471 + v, 4)
      if rust > 0.62 then c = (r == 0) and "dirt3" or ((r == 1) and "dirt2" or "red2") end
      if rust > 0.78 then c = (r == 0) and "dirt4" or "dirt2" end
      if y >= 6 and r ~= 0 then c = (c == "steel3") and "steel2" or ((c == "steel2") and "steel1" or c) end
      P(t, x, y, c)
    end
    -- scalloped eave edge
    P(t, x, 9, (r == 2) and "outline" or "steel1"); if r ~= 2 then P(t, x, 10, "outline") end
  end
  -- rust tears running down from the nails
  for _, nx in ipairs({ 3, 9, 15 }) do
    local x = (nx + v * 2) % 16
    P(t, x, 1, "ink1")
    for y = 2, 5 + (x % 3) do if H(x, y, 472) < 0.7 then P(t, x, y, "red2") end end
  end
  if kind == "l" then
    -- eave end: rolled edge + a sagging corner
    for y = 0, 10 do P(t, 0, y, (y <= 9) and "outline" or nil) end
    P(t, 1, 0, "steel5"); P(t, 0, 0, nil); P(t, 0, 10, nil); P(t, 1, 10, "outline")
  elseif kind == "r" then
    for y = 0, 10 do P(t, 15, y, (y <= 9) and "outline" or nil) end
    P(t, 15, 0, nil); P(t, 14, 10, "outline")
  end
  return t
end
put(4, ROW, "roof_l", roof("l", 0), ONEWAY_METAL)
put(5, ROW, "roof_m", roof("m", 0), ONEWAY_METAL)
put(6, ROW, "roof_m2", roof("m", 1), ONEWAY_METAL)
put(7, ROW, "roof_r", roof("r", 0), ONEWAY_METAL)

-- shack walls: weathered vertical planks (grey-green-brown), 9-slice
local PLANK_TONES = { { "ink3", "ink2", "ink1" }, { "olive2", "olive1", "ink1" }, { "dirt3", "dirt2", "dirt1" }, { "ink2", "dirt2", "ink1" } }
local function shackWall(px, py, v)
  local t = T()
  for x = 0, TS - 1 do
    local p = (x + 1) // 4
    local tone = PLANK_TONES[1 + math.floor(H(p, 0, 481 + v) * 4)]
    local xi = (x + 1) % 4
    for y = 0, TS - 1 do
      local c = tone[2]
      if xi == 0 then c = tone[1] elseif xi == 3 then c = "outline" end
      if xi == 2 and H(x, y // 3, 482 + v) < 0.3 then c = tone[3] end
      if xi == 1 and H(x, y, 483 + v) < 0.08 then c = tone[1] end
      P(t, x, y, c)
    end
  end
  -- nails at the cross battens
  for _, ny in ipairs({ 3, 12 }) do for x = 1, 15, 8 do P(t, (x + ny) % 16, ny, "ink3"); P(t, (x + ny) % 16, ny + 1, "dirt2") end end
  if px == "l" then for y = 0, 15 do P(t, 0, y, "dirt1"); P(t, 1, y, "dirt3"); P(t, 2, y, "dirt2"); P(t, 3, y, "ink1") end end
  if px == "r" then for y = 0, 15 do P(t, 12, y, "dirt3"); P(t, 13, y, "dirt2"); P(t, 14, y, "dirt1"); P(t, 15, y, "outline") end end
  if py == "t" then
    -- deep shadow under the eave
    for x = 0, 15 do P(t, x, 0, "outline"); P(t, x, 1, "outline"); P(t, x, 2, "ink1"); if x % 2 == 0 then P(t, x, 3, "ink1") end end
  elseif py == "b" then
    for x = 0, 15 do
      P(t, x, 11, "dirt3"); P(t, x, 12, "dirt2"); P(t, x, 13, "ink1")
      local m = H(x, 14, 484 + v)
      P(t, x, 14, (m < 0.5) and "olive2" or "leaf1"); P(t, x, 15, (m < 0.3) and "olive3" or "leaf2")
      if m < 0.25 then P(t, x, 13, "olive2") end
    end
  end
  if v == 1 and py == "m" and px == "m" then
    -- nailed rusty tin patch
    for y = 5, 10 do for x = 4, 10 do P(t, x, y, ((x % 2 == 0) and "steel3" or "steel2")) end end
    for x = 4, 10 do P(t, x, 5, "steel4"); P(t, x, 11, "outline") end
    for y = 5, 10 do P(t, 11, y, "outline") end
    P(t, 6, 8, "red2"); P(t, 7, 8, "dirt2"); P(t, 7, 9, "red2"); P(t, 4, 5, "ink4"); P(t, 10, 5, "ink4"); P(t, 4, 10, "ink4"); P(t, 10, 10, "ink4")
  end
  return t
end
local SH = { { "tl", "l", "t" }, { "tm", "m", "t" }, { "tr", "r", "t" }, { "ml", "l", "m" }, { "mm", "m", "m" }, { "mm2", "m", "m", 1 },
  { "mr", "r", "m" }, { "bl", "l", "b" }, { "bm", "m", "b" }, { "br", "r", "b" } }
for i, s in ipairs(SH) do put(7 + i, ROW, "shack_" .. s[1], shackWall(s[2], s[3], s[4] or 0), {}) end
local function shackWindow(kind)
  local t = shackWall("m", "m", 2)
  R(t, 2, 2, 12, 11, "dirt2") -- frame
  for x = 2, 13 do P(t, x, 2, "dirt3"); P(t, x, 12, "dirt1") end
  for y = 2, 12 do P(t, 2, y, "dirt3"); P(t, 13, y, "dirt1") end
  R(t, 3, 3, 10, 9, "outline")
  if kind == "lit" then
    for y = 4, 10 do for x = 4, 11 do
      local d = math.abs(x - 7.5) + math.abs(y - 7.5) * 1.2
      P(t, x, y, (d < 2.5) and "fire5" or ((d < 4.5) and "fire4" or "fire3"))
    end end
    P(t, 7, 6, "fire6"); P(t, 8, 6, "fire6")
    -- lantern silhouette hanging inside + torn curtain
    P(t, 7, 4, "dirt1"); P(t, 7, 5, "fire6"); P(t, 6, 5, "dirt1"); P(t, 8, 5, "dirt1")
    for y = 4, 10 do P(t, 4, y, (y < 8) and "red2" or "red1") end; P(t, 5, 4, "red2"); P(t, 5, 5, "red2")
    -- mullion cross
    for y = 4, 10 do P(t, 8, y, "dirt1") end
    for x = 4, 11 do P(t, x, 7, "dirt1") end
    -- light spilling on the sill
    for x = 3, 12 do P(t, x, 12, (x % 2 == 0) and "fire3" or "dirt3") end
    P(t, 6, 13, "dirt3"); P(t, 9, 13, "dirt3")
  elseif kind == "dark" then
    R(t, 4, 4, 8, 7, "steel1")
    for y = 4, 10 do P(t, 8, y, "dirt1") end
    for x = 4, 11 do P(t, x, 7, "dirt1") end
    P(t, 5, 5, "sky1"); P(t, 6, 5, "steel2"); P(t, 5, 6, "sky1"); P(t, 10, 9, "sky1")
    P(t, 11, 4, "ink2"); P(t, 10, 4, "ink1") -- cracked pane
  else -- boarded
    R(t, 4, 4, 8, 7, "ink1")
    for _, b in ipairs({ { 3, 5 }, { 3, 9 } }) do
      for x = 2, 13 do P(t, x, b[2], "dirt3"); P(t, x, b[2] + 1, "dirt2"); P(t, x, b[2] + 2, "outline") end
      P(t, 3, b[2], "ink4"); P(t, 12, b[2] + 1, "ink4")
    end
    L(t, 3, 11, 12, 3, "dirt4"); L(t, 4, 11, 13, 3, "dirt2"); L(t, 4, 12, 13, 4, "outline")
  end
  return t
end
put(18, ROW, "shack_win_lit", shackWindow("lit"), {})
put(19, ROW, "shack_win_dark", shackWindow("dark"), {})
put(20, ROW, "shack_win_boarded", shackWindow("boarded"), {})
local function doorway(half)
  local t = shackWall("m", half == "b" and "b" or "m", 3)
  local y0 = (half == "t") and 2 or 0
  local y1 = (half == "t") and 15 or 13
  for y = y0, y1 do
    P(t, 2, y, "dirt3"); P(t, 3, y, "dirt2"); P(t, 12, y, "dirt2"); P(t, 13, y, "dirt1")
    for x = 4, 11 do P(t, x, y, (x == 4 or y == y0) and "ink1" or "outline") end
  end
  if half == "t" then for x = 2, 13 do P(t, x, 1, "dirt1"); P(t, x, 2, "dirt3") end; P(t, 2, 2, "dirt4") end
  if half == "b" then for x = 2, 13 do P(t, x, 14, "dirt2"); P(t, x, 15, "dirt1") end; P(t, 5, 13, "ink1"); P(t, 9, 12, "ink1") end
  return t
end
put(21, ROW, "shack_doorway_t", doorway("t"), {})
put(22, ROW, "shack_doorway_b", doorway("b"), {})

-- stilts (back layer)
local function stilt(kind)
  local t = T()
  local function postAt(y0, y1)
    for y = y0, y1 do
      P(t, 6, y, "ink3"); P(t, 7, y, "dirt3"); P(t, 8, y, "dirt2"); P(t, 9, y, "ink1")
      if H(7, y, 491) < 0.2 then P(t, 7, y, "dirt2") end
    end
  end
  if kind == "x" then
    L(t, 0, 0, 15, 15, "dirt2"); L(t, 0, 1, 14, 15, "ink1"); L(t, 0, 15, 15, 0, "dirt3"); L(t, 1, 15, 15, 1, "ink1")
  end
  postAt(0, 15)
  if kind == "top" then
    -- knee braces up to the deck
    L(t, 1, 0, 5, 4, "dirt2"); L(t, 1, 1, 5, 5, "ink1"); L(t, 14, 0, 10, 4, "dirt2"); L(t, 14, 1, 10, 5, "ink1")
    P(t, 7, 1, "steel3"); P(t, 7, 5, "steel3")
  elseif kind == "x" then
    P(t, 7, 7, "steel3"); P(t, 8, 8, "steel2")
  elseif kind == "wl" then
    remapIn(t, UNDER1, 0, WL + 1, 15, WL + 4); remapIn(t, UNDER2, 0, WL + 5, 15, 15)
    for x = 1, 14 do if x < 6 or x > 9 then if x % 3 ~= 0 then P(t, x, WL, "steel3") end else P(t, x, WL, (x % 2 == 0) and "ink4" or "steel3") end end
    P(t, 6, WL - 1, "olive2"); P(t, 7, WL - 1, "olive3"); P(t, 8, WL - 1, "olive2")
  else
    for y = 6, 10 do if H(6, y, 492) < 0.6 then P(t, 6, y, "olive2") end end
  end
  return t
end
put(23, ROW, "stilt_top", stilt("top"), {})
put(24, ROW, "stilt_mid", stilt("mid"), {})
put(25, ROW, "stilt_x", stilt("x"), {})
put(26, ROW, "stilt_wl", stilt("wl"), {})

-- rope bridge deck: weathered slats lashed with rope
local function rbridge(v)
  local t = T()
  for x = 0, TS - 1 do
    local b = (x + v) % 4
    if b == 3 then
      P(t, x, 2, "dirt1"); P(t, x, 3, "outline")
    else
      local tone = H((x + v) // 4, 0, 501 + v)
      local lite, mid, dark = "ink4", "ink3", "ink2"
      if tone < 0.45 then lite, mid, dark = "dirt4", "dirt3", "dirt2" end
      P(t, x, 0, lite); P(t, x, 1, mid); P(t, x, 2, mid); P(t, x, 3, (b == 2) and dark or mid)
      if H(x, 1, v + 502) < 0.2 then P(t, x, 2, dark) end
    end
    P(t, x, 4, (x % 3 == 0) and "sand3" or "sand2"); P(t, x, 5, "sand1"); P(t, x, 6, "outline")
  end
  if v == 2 then for y = 0, 3 do P(t, 6, y, (y == 0) and "olive3" or "dirt1") end; P(t, 5, 0, "olive2") end
  return t
end
put(27, ROW, "rbridge_a", rbridge(0), ONEWAY_WOOD)
put(28, ROW, "rbridge_b", rbridge(1), ONEWAY_WOOD)
put(29, ROW, "rbridge_c", rbridge(2), ONEWAY_WOOD)

---------------------------------------------------------------------------------------------------
-- Row 8: rope rails, pump-station metal, fence, sandbags
ROW = 8
local RAILS = { { 3, 5 }, { 5, 7 }, { 7, 8 }, { 8, 8 }, { 8, 7 }, { 7, 5 }, { 5, 3 }, { 3, 3 } }
for i, r in ipairs(RAILS) do
  local t = T()
  for _, hx in ipairs({ 4, 12 }) do
    local ry = math.floor(r[1] + (r[2] - r[1]) * hx / 15 + 0.5)
    for y = ry + 2, TS - 1 do P(t, hx, y, (y % 3 == 0) and "sand2" or "sand1") end
  end
  local prev
  for x = 0, TS - 1 do
    local y = math.floor(r[1] + (r[2] - r[1]) * x / 15 + 0.5)
    P(t, x, y, (x % 3 == 1) and "sand3" or "sand2"); P(t, x, y + 1, "sand1")
    if prev and prev ~= y then P(t, x - 1, y, "sand2") end
    prev = y
  end
  put(i - 1, ROW, "rope_" .. r[1] .. "_" .. r[2], t, {})
end
local hang = T()
for _, hx in ipairs({ 4, 12 }) do for y = 0, TS - 1 do P(hang, hx, y, (y % 3 == 0) and "sand2" or "sand1") end end
put(8, ROW, "rope_hangers", hang, {})

-- rusty grating catwalk (one-way metal)
local function catwalk(kind, v)
  local t = T()
  for x = 0, TS - 1 do
    P(t, x, 0, "steel4"); P(t, x, 1, "steel3")
    P(t, x, 2, (x % 3 == 0) and "steel3" or "outline"); P(t, x, 3, (x % 3 == 0) and "steel2" or "outline")
    P(t, x, 4, "steel3"); P(t, x, 5, "steel2"); P(t, x, 6, "outline")
    local r = vnoise(x, v, 511, 4)
    if r > 0.6 then P(t, x, 1, "dirt3") end
    if r > 0.7 then P(t, x, 4, "dirt3"); P(t, x, 5, "red2") end
    if r > 0.66 and x % 4 == 0 then P(t, x, 7, "red2"); P(t, x, 8, "dirt2") end -- rust drips
  end
  if v == 1 then for x = 4, 11 do P(t, x, 4, ((x // 2) % 2 == 0) and "fire3" or "outline") end end
  if kind == "l" then for y = 0, 6 do P(t, 0, y, "outline") end; R(t, 1, 7, 2, 3, "steel2"); R(t, 1, 10, 2, 1, "outline"); P(t, 3, 7, "outline"); P(t, 3, 8, "outline") end
  if kind == "r" then for y = 0, 6 do P(t, 15, y, "outline") end; R(t, 13, 7, 2, 3, "steel2"); R(t, 13, 10, 2, 1, "outline"); P(t, 12, 7, "outline"); P(t, 12, 8, "outline") end
  return t
end
put(9, ROW, "catwalk_l", catwalk("l", 0), ONEWAY_METAL)
put(10, ROW, "catwalk_m", catwalk("m", 0), ONEWAY_METAL)
put(11, ROW, "catwalk_m2", catwalk("m", 1), ONEWAY_METAL)
put(12, ROW, "catwalk_r", catwalk("r", 0), ONEWAY_METAL)
local function ladder(top)
  local t = T()
  for y = top and 2 or 0, TS - 1 do
    P(t, 3, y, "steel3"); P(t, 4, y, "steel2"); P(t, 11, y, "steel3"); P(t, 12, y, "steel1")
    if H(3, y, 521) < 0.15 then P(t, 3, y, "dirt3") end
  end
  for _, ry in ipairs({ 4, 10 }) do for x = 5, 10 do P(t, x, ry, (H(x, ry, 522) < 0.25) and "dirt3" or "steel3"); P(t, x, ry + 1, "steel1") end end
  if top then P(t, 3, 1, "steel4"); P(t, 11, 1, "steel4"); P(t, 4, 1, "steel2"); P(t, 12, 1, "steel2"); P(t, 3, 0, "steel3"); P(t, 11, 0, "steel3") end
  P(t, 4, 12, "red2"); P(t, 11, 6, "red2")
  return t
end
put(13, ROW, "ladder_top", ladder(true), {})
put(14, ROW, "ladder_mid", ladder(false), {})
local function railing(post)
  local t = T()
  for x = 0, TS - 1 do
    P(t, x, 4, (H(x, 4, 531) < 0.2) and "dirt3" or "steel3"); P(t, x, 5, "steel2"); P(t, x, 6, "steel1")
    P(t, x, 11, "steel3"); P(t, x, 12, (H(x, 12, 532) < 0.25) and "red2" or "steel1")
  end
  if post then
    for y = 3, 15 do P(t, 6, y, "steel1"); P(t, 7, y, "steel3"); P(t, 8, y, "steel2"); P(t, 9, y, "steel1") end
    P(t, 7, 3, "steel4"); P(t, 8, 3, "steel3"); P(t, 7, 8, "dirt3"); P(t, 7, 9, "red2"); P(t, 8, 10, "red2")
  end
  return t
end
put(15, ROW, "railing", railing(false), {})
put(16, ROW, "railing_post", railing(true), {})

-- rusty chain-link fence (back layer)
local function mesh(t, y0, y1)
  for y = y0, y1 do for x = 0, TS - 1 do
    local a, b = (x + y) % 6, (x - y) % 6
    local rust = vnoise(x, y, 541, 4) > 0.62
    if a == 0 then P(t, x, y, rust and "dirt3" or "steel3") elseif b == 0 then P(t, x, y, rust and "red2" or "steel2") end
  end end
end
local function barb(t, y)
  for x = 0, TS - 1 do P(t, x, y, (x % 2 == 0) and "steel3" or "steel2") end
  for _, bx in ipairs({ 2, 8, 13 }) do P(t, bx - 1, y - 1, "steel3"); P(t, bx + 1, y + 1, "steel2"); P(t, bx + 1, y - 1, "steel2"); P(t, bx - 1, y + 1, "steel1") end
end
local function fence(kind)
  local t = T()
  local isPost = kind:sub(1, 4) == "post"
  local part = kind:gsub("post_", "")
  if part == "top" then
    barb(t, 2)
    for x = 0, TS - 1 do P(t, x, 5, "steel3"); P(t, x, 6, "steel1") end
    mesh(t, 7, 15)
  elseif part == "mid" then
    mesh(t, 0, 15)
    -- a torn flap
    for _, p in ipairs({ { 9, 8 }, { 10, 9 }, { 11, 10 }, { 10, 11 } }) do P(t, p[1], p[2], nil) end
  else
    mesh(t, 0, 11)
    for x = 0, TS - 1 do
      P(t, x, 9, "steel3"); P(t, x, 10, "steel1")
      local d = 12 + math.floor(H(x, 0, 542) * 2)
      for y = d, 15 do P(t, x, y, (y == d) and "sand1" or ((y == d + 1) and "dirt2" or "dirt1")) end
      if H(x, 1, 543) < 0.35 then P(t, x, d - 1, "olive2"); if H(x, 2, 543) < 0.5 then P(t, x, d - 2, "olive3") end end
    end
  end
  if isPost then
    for y = 0, 15 do P(t, 6, y, "steel1"); P(t, 7, y, "steel3"); P(t, 8, y, "steel2"); P(t, 9, y, "steel2"); P(t, 10, y, "steel1") end
    for y = 0, 15 do if vnoise(7, y, 544, 4) > 0.6 then P(t, 7, y, "dirt3"); P(t, 8, y, "red2") end end
    if part == "top" then
      for x = 6, 10 do P(t, x, 0, "steel1") end; P(t, 7, 1, "steel4")
      L(t, 10, 3, 14, 0, "steel3"); L(t, 10, 4, 15, 0, "steel1")
    elseif part == "base" then
      for x = 4, 12 do P(t, x, 13, "sand1"); P(t, x, 14, "dirt2"); P(t, x, 15, "dirt1") end
      P(t, 5, 12, "olive3"); P(t, 11, 12, "olive2")
    end
  end
  return t
end
for i, k in ipairs({ "top", "mid", "base", "post_top", "post_mid", "post_base" }) do put(16 + i, ROW, "fence_" .. k, fence(k), {}) end

-- mossy sandbag wall (solid): two staggered courses of rounded, dirty burlap bags; moss on the top course
local function bag(t, x0, y0, w)
  for x = 0, w - 1 do for y = 0, 7 do
    local edgeX = (x == 0 or x == w - 1)
    local c = "sand2"
    if y == 0 and (x < 1 or x > w - 2) then c = nil
    elseif edgeX and (y == 0 or y == 7) then c = nil
    elseif y == 0 or (y == 1 and x < w - 2) or (x == 1 and y < 5) then c = "sand3"
    elseif y >= 6 or x == w - 2 then c = "sand1"
    elseif edgeX then c = "sand1" end
    if c then P(t, x0 + x, y0 + y, c) end
  end end
  P(t, x0 + 2, y0 + 1, "sand4")
  for x = 1, w - 2 do P(t, x0 + x, y0 + 7, "dirt1") end
  -- mud grime on the lower half
  for x = 1, w - 2 do if H(x0 + x, y0, 554) < 0.35 then P(t, x0 + x, y0 + 6, "dirt2") end end
end
local function sandbags(kind, top)
  local t = T()
  R(t, 0, top and 2 or 0, TS, TS - (top and 2 or 0), "outline")
  for _, bx in ipairs({ -4, 4, 12 }) do bag(t, bx, top and 1 or 0, 8) end
  for _, bx in ipairs({ 0, 8 }) do bag(t, bx, 8, 8) end
  -- moss in the seams
  for _, p in ipairs({ { 3, 8 }, { 4, 8 }, { 11, 8 }, { 7, 15 }, { 8, 15 } }) do if A(t, p[1], p[2]) then P(t, p[1], p[2], "leaf2") end end
  if top then
    -- moss draped over the top course
    for x = 0, TS - 1 do
      local y = 1
      while y < 4 and not A(t, x, y) do y = y + 1 end
      local m = vnoise(x, 0, 553, 8)
      if y < 4 and m > 0.45 then
        P(t, x, y, (m > 0.6) and "leaf4" or "olive3"); P(t, x, y + 1, "leaf3")
        if m > 0.6 and x % 2 == 1 then P(t, x, y + 2, "leaf2"); P(t, x, y + 3, "leaf1") end
      end
    end
    R(t, 0, 0, TS, 1, nil)
  end
  if kind == "l" then for y = 0, 15 do if A(t, 0, y) then P(t, 0, y, (y % 8 ~= 0) and "outline" or nil) end end
  elseif kind == "r" then for y = 0, 15 do if A(t, 15, y) then P(t, 15, y, "outline") end end end
  return t
end
local SAND = { collides = true, material = "dirt" }
put(23, ROW, "sandbag_tl", sandbags("l", true), SAND)
put(24, ROW, "sandbag_tm", sandbags("m", true), SAND)
put(25, ROW, "sandbag_tr", sandbags("r", true), SAND)
put(26, ROW, "sandbag_ml", sandbags("l", false), SAND)
put(27, ROW, "sandbag_mm", sandbags("m", false), SAND)
put(28, ROW, "sandbag_mr", sandbags("r", false), SAND)

---------------------------------------------------------------------------------------------------
-- Row 9: pump wall decor (baked onto pump_bg_m0), cypress trunks + flare, Spanish moss
ROW = 9
local function pumpWall(v) return remap(terrainTile("pump", 0, v or 0), BG_PUMP) end
local function onWall(deco, v) local b = pumpWall(v); b:drawImage(deco, Point(0, 0)); return b end
local function pipeH(t, y)
  for x = 0, TS - 1 do
    P(t, x, y, "steel1"); P(t, x, y + 1, "steel3"); P(t, x, y + 2, "steel3"); P(t, x, y + 3, "steel2"); P(t, x, y + 4, "steel2"); P(t, x, y + 5, "steel1")
    if vnoise(x, 0, 561, 4) > 0.6 then P(t, x, y + 3, "dirt2"); P(t, x, y + 4, "red2") end
  end
  for x = 0, TS - 1 do if x % 5 == 0 then P(t, x, y + 6, "dirt1") end end
end
local function pipeV(t, x)
  for y = 0, TS - 1 do
    P(t, x, y, "steel1"); P(t, x + 1, y, "steel3"); P(t, x + 2, y, "steel3"); P(t, x + 3, y, "steel2"); P(t, x + 4, y, "steel2"); P(t, x + 5, y, "steel1")
    if vnoise(0, y, 562, 4) > 0.6 then P(t, x + 3, y, "dirt2"); P(t, x + 4, y, "red2") end
  end
end
local ph = T(); pipeH(ph, 5); R(ph, 12, 4, 2, 8, "steel3"); P(ph, 12, 4, "steel4"); P(ph, 13, 11, "steel1"); P(ph, 13, 4, "steel2")
put(0, ROW, "pipe_h_w", onWall(ph, 0), {})
local pv = T(); pipeV(pv, 5); R(pv, 4, 12, 8, 2, "steel3"); P(pv, 4, 12, "steel4"); P(pv, 11, 13, "steel1")
put(1, ROW, "pipe_v_w", onWall(pv, 0), {})
local function elbow(corner)
  local t = T()
  local cx = (corner == "tl") and 15 or 0
  local cy = 15
  for y = 0, TS - 1 do for x = 0, TS - 1 do
    local d = math.sqrt((x - cx) ^ 2 + (y - cy) ^ 2)
    if d >= 4.5 and d <= 10.5 then
      local k = d - 4.5
      local c = ({ "steel1", "steel2", "steel2", "steel3", "steel3", "steel1" })[math.min(6, math.floor(k) + 1)]
      if vnoise(x, y, 563, 4) > 0.65 and c ~= "steel1" then c = (c == "steel3") and "dirt3" or "red2" end
      P(t, x, y, c)
    end
  end end
  return t
end
put(2, ROW, "pipe_elbow_tl_w", onWall(elbow("tl"), 0), {})
put(3, ROW, "pipe_elbow_tr_w", onWall(elbow("tr"), 0), {})
local valve = T(); pipeH(valve, 5)
for a = 0, 31 do local ang = a / 32 * 2 * math.pi; P(valve, math.floor(8 + math.cos(ang) * 5 + 0.5), math.floor(7 + math.sin(ang) * 5 + 0.5), (math.sin(ang) < 0) and "red3" or "red2") end
L(valve, 3, 7, 13, 7, "red2"); L(valve, 8, 2, 8, 12, "red2"); P(valve, 8, 7, "red3"); P(valve, 5, 3, "red3"); P(valve, 4, 4, "red3")
put(4, ROW, "valve_w", onWall(valve, 0), {})
local grate = T()
R(grate, 2, 2, 12, 12, "steel1")
for y = 2, 13 do P(grate, 2, y, "steel3"); P(grate, 13, y, "steel1") end
for x = 2, 13 do P(grate, x, 2, "steel3"); P(grate, x, 13, "steel1") end
for y = 4, 11 do for x = 4, 11 do if (x % 2 == 0) ~= (y % 2 == 0) then P(grate, x, y, "steel2") else P(grate, x, y, "outline") end end end
P(grate, 3, 3, "steel4"); P(grate, 12, 3, "steel3"); P(grate, 3, 12, "steel3"); P(grate, 12, 12, "steel2")
for y = 12, 15 do if y % 2 == 0 then P(grate, 7, y, "dirt2") end end
put(5, ROW, "grate_w", onWall(grate, 1), {})
local vent = T()
R(vent, 1, 2, 14, 12, "steel1")
for x = 1, 14 do P(vent, x, 1, "steel2"); P(vent, x, 14, "steel1") end
for _, y in ipairs({ 3, 6, 9, 12 }) do for x = 2, 13 do P(vent, x, y, (H(x, y, 571) < 0.2) and "dirt3" or "steel3"); P(vent, x, y + 1, "steel2") end end
P(vent, 2, 2, "steel3"); P(vent, 13, 2, "steel3")
put(6, ROW, "vent_w", onWall(vent, 0), {})
local hz = T()
for x = 0, TS - 1 do
  for y = 5, 10 do
    local stripe = ((x + y) // 3) % 2 == 0
    local worn = H(x, y, 581) < 0.18
    P(hz, x, y, (stripe and not worn) and "fire3" or "ink1")
  end
  P(hz, x, 4, "ink2"); P(hz, x, 11, "ink2")
end
put(7, ROW, "hazard_w", onWall(hz, 0), {})
-- Regime spiral-eye stencil (faded paint on concrete; same eye grid as props/lib/pk.lua "m")
local EYE = {
  ".....ooooo.....",
  "...oowrrrwoo...",
  "..owwrwwwrwwo..",
  ".owwrwrrrwrwwo.",
  "owwwrwrwrwrwwwo",
  ".owwrwrrwwrwwo.",
  "..owwrwrrrwwo..",
  "...oowrrrwoo...",
  ".....ooooo.....",
}
local reg = T()
for j, row in ipairs(EYE) do for i = 1, #row do
  local ch = row:sub(i, i)
  if ch ~= "." then
    local c = (ch == "o") and "red1" or ((ch == "w") and "ink3" or "red2")
    if H(i, j, 591) < 0.14 then c = nil end -- stencil wear
    if c then P(reg, i - 1 + 0, j + 2, c) end
  end
end end
for _, x in ipairs({ 3, 7, 11 }) do P(reg, x, 13, "red1"); P(reg, x, 14, "dirt2") end -- paint runs
put(8, ROW, "regime_w", onWall(reg, 2), {})
local function pwin(lit)
  local t = T()
  R(t, 2, 2, 12, 10, "steel1")
  for x = 2, 13 do P(t, x, 2, "steel2"); P(t, x, 12, "ink3") end
  R(t, 3, 3, 10, 8, lit and "fire4" or "steel1")
  if lit then
    R(t, 3, 3, 10, 2, "fire5"); R(t, 3, 9, 10, 2, "fire3"); P(t, 4, 4, "fire6"); P(t, 5, 4, "fire6")
  else
    P(t, 4, 4, "steel2"); P(t, 5, 4, "steel2"); P(t, 4, 5, "steel2"); P(t, 11, 9, "sky1")
  end
  for _, bx in ipairs({ 5, 8, 11 }) do for y = 3, 10 do P(t, bx, y, "steel1") end end
  for x = 2, 13 do P(t, x, 13, "ink1") end
  if lit then for x = 3, 12 do if x % 2 == 1 then P(t, x, 12, "fire3") end end end
  return t
end
put(9, ROW, "window_lit_w", onWall(pwin(true), 0), {})
put(10, ROW, "window_dark_w", onWall(pwin(false), 0), {})
-- 2x2 rusty tank (32x32 on 2x2 wall cells)
local tankImg = IMG(32, 32)
do
  local t = tankImg
  for y = 2, 29 do for x = 1, 30 do
    local dx = (x - 15.5) / 14.5
    local c
    if dx < -0.75 then c = "steel3" elseif dx < -0.35 then c = "steel3" elseif dx < 0.35 then c = "steel2" elseif dx < 0.8 then c = "steel2" else c = "steel1" end
    if dx < -0.6 and dx > -0.75 then c = "steel4" end
    local r = vnoise(x % 16, y % 16, 601, 4)
    if r > 0.74 and (x + y) % 2 == 0 then c = (dx < 0) and "dirt3" or "dirt2" end
    if r > 0.84 then c = "dirt2" end
    P(t, x, y, c)
  end end
  -- domed top & base, weld seams, rivets, gauge, hazard band, rust streaks
  for x = 1, 30 do P(t, x, 2, "steel1"); P(t, x, 3, (x < 12) and "steel4" or "steel3"); P(t, x, 29, "steel1"); P(t, x, 30, "ink1"); P(t, x, 31, "ink1") end
  for x = 3, 28 do P(t, x, 1, (x < 12) and "steel3" or "steel2"); P(t, x, 0, "steel1") end
  P(t, 1, 2, nil); P(t, 30, 2, nil)
  for _, sy in ipairs({ 11, 21 }) do for x = 1, 30 do P(t, x, sy, "steel1"); if x % 4 == 2 then P(t, x, sy + 1, "steel4") end end end
  for y = 13, 19 do for x = 1, 30 do if ((x + y) // 3) % 2 == 0 then P(t, x, y, (x > 24) and "dirt2" or "fire3") end end end
  -- gauge
  for a = 0, 23 do local ang = a / 24 * 2 * math.pi; P(t, math.floor(22 + math.cos(ang) * 3 + 0.5), math.floor(6 + math.sin(ang) * 3 + 0.5), "steel1") end
  R(t, 20, 5, 4, 3, "ink4"); P(t, 22, 6, "red3"); P(t, 23, 5, "red3")
  for _, sx in ipairs({ 6, 14, 26 }) do for y = 22, 28 do if H(sx, y, 602) < 0.75 then P(t, sx, y, "red2") end end end
  -- stencil number
  for _, p in ipairs({ { 6, 6 }, { 7, 6 }, { 8, 6 }, { 8, 7 }, { 7, 8 }, { 6, 9 }, { 6, 8 }, { 7, 9 }, { 8, 9 } }) do P(t, p[1], p[2], "ink4") end
end
do
  local names = { "tank_tl_w", "tank_tr_w", "tank_bl_w", "tank_br_w" }
  for i = 0, 3 do
    local c, r = i % 2, i // 2
    local d = T(); d:drawImage(tankImg, Point(-c * 16, -r * 16))
    put(11 + i, ROW, names[i + 1], onWall(d, 0), {})
  end
end

-- giant cypress trunk, 32 px wide, vertically tileable. Furrow x at y=0 is the same for every variant.
local FURROWS = { 3, 8, 12, 17, 21, 26, 29 }
-- tone ladder across the trunk (light from the left); index 1 = lightest
local BARK_LADDER = { "ink4", "ink3", "ink2", "dirt2", "dirt1", "ink1" }
local function barkZone(gx)
  if gx < 1 then return 3 elseif gx < 4 then return 2 elseif gx < 9 then return 2 elseif gx < 15 then return 3 elseif gx < 22 then return 4 elseif gx < 28 then return 5 else return 6 end
end
local function barkColor(gx, y, v)
  local z = barkZone(gx)
  -- stringy vertical fibres inside the bark plates (period 16 in y)
  local fib = H(gx, (y // 4) % 4, 611 + v)
  if fib < 0.22 then z = z + 1 elseif fib > 0.9 and z > 1 then z = z - 1 end
  if gx >= 4 and gx < 9 and (y + gx * 3) % 7 == 0 then z = 1 end -- lit fibre glints
  for i, f in ipairs(FURROWS) do
    local amp = (v == 0) and ((i % 2 == 0) and 1.2 or -1.0) or ((i % 2 == 0) and -1.3 or 1.1)
    local fx = f + math.floor(amp * math.sin(2 * math.pi * y / 16) + 0.5)
    if gx == fx then z = math.max(z + 2, 5) end          -- deep furrow
    if gx == fx + 1 and z > 1 then z = z - 1 end           -- lit plate edge right of the furrow
  end
  return BARK_LADDER[clamp(z, 1, 6)]
end
local function trunkImg(v)
  local img = IMG(32, 16)
  for y = 0, 15 do for gx = 0, 31 do P(img, gx, y, barkColor(gx, y, v)) end end
  -- moss streaks running down two furrows on the lit/top side
  -- moss streaks running down a furrow on the lit side and a damp one in the shade
  for y = 0, 15 do
    local fx = FURROWS[2] + math.floor(((v == 0) and 1.2 or -1.3) * math.sin(2 * math.pi * y / 16) + 0.5)
    local m = vnoise(0, y, 621 + v, 4)
    if m > 0.4 then P(img, fx, y, "olive2"); if m > 0.62 then P(img, fx + 1, y, "olive3") end end
    local fx2 = FURROWS[5] + math.floor(((v == 0) and -1.0 or 1.1) * math.sin(2 * math.pi * y / 16) + 0.5)
    if vnoise(1, y, 622 + v, 4) > 0.5 then P(img, fx2, y, "leaf1"); P(img, fx2 + 1, y, "olive1") end
  end
  if v == 1 then
    -- knot hole with a rolled bark lip (lit top-left)
    local cx, cy = 11, 8
    for j = -4, 4 do for i = -3, 3 do
      local d = (i * i) / 9 + (j * j) / 16
      if d <= 1 then
        local c = "outline"
        if d > 0.5 then c = (i + j < 0) and "ink3" or "dirt1" end
        if d > 0.5 and i < 0 and j < -1 then c = "ink4" end
        P(img, cx + i, cy + j, c)
      end
    end end
    P(img, cx + 1, cy + 2, "ink1"); P(img, cx, cy + 3, "dirt1")
  end
  return img
end
for v = 0, 1 do
  local img = trunkImg(v)
  local pre = (v == 0) and "cyp_" or "cyp2_"
  local l, r = T(), T()
  l:drawImage(img, Point(0, 0)); r:drawImage(img, Point(-16, 0))
  put(15 + v * 2, ROW, pre .. "l", l, {})
  put(16 + v * 2, ROW, pre .. "r", r, {})
end
-- buttress flare: 64x32, trunk on columns 1-2 (x 16..47) at the top, spreading roots at the bottom
do
  local img = IMG(64, 32)
  -- silhouette: trunk (x 16..47) at the top, widening into buttresses; the bark is remapped across the
  -- widened span so furrows fan out into root ribs and stay continuous with cyp_l/cyp_r at y 0
  local function span(y)
    local k = y / 31
    local spread = (k ^ 2.4) * 13 + ((y > 18) and (y - 18) * 1.25 or 0)
    -- uneven buttress lobes at the very bottom
    local lw = math.floor(spread + ((y > 24) and math.sin(y * 0.9) * 1.2 or 0) + 0.5)
    local rw = math.floor(spread * 0.92 + ((y > 24) and math.cos(y * 0.8) * 1.2 or 0) + 0.5)
    return 16 - lw, 47 + rw
  end
  for y = 0, 31 do
    local xl, xr = span(y)
    for x = math.max(0, xl), math.min(63, xr) do
      local gx = math.floor((x - xl) / (xr - xl) * 31 + 0.5)
      P(img, x, y, barkColor(gx, y % 16, 0))
    end
  end
  -- gaps between the lowest buttress lobes (dark hollows) so the roots read as separate fins
  for _, hx in ipairs({ { 9, 25 }, { 54, 26 } }) do
    for y = hx[2], 31 do
      local w = math.floor((y - hx[2]) * 0.45)
      for x = hx[1] - w, hx[1] + w do if A(img, x, y) then P(img, x, y, (x == hx[1] - w) and "dirt1" or "ink1") end end
    end
  end
  -- moss streak continuing from the trunk + damp moss creeping up the base
  for y = 0, 31 do
    local xl, xr = span(y)
    local fx = xl + math.floor((FURROWS[2] + math.floor(1.2 * math.sin(2 * math.pi * (y % 16) / 16) + 0.5)) / 31 * (xr - xl) + 0.5)
    if vnoise(0, y % 16, 621, 4) > 0.4 then P(img, fx, y, "olive2") end
  end
  for x = 0, 63 do
    if A(img, x, 31) then
      local h = 2 + math.floor(vnoise(x, 0, 633, 8) * 5 + H(x, 0, 631) * 2)
      for y = 32 - h, 31 do
        if A(img, x, y) then P(img, x, y, (y == 32 - h) and ((H(x, y, 634) < 0.4) and "olive3" or "leaf2") or ((y > 29) and "leaf1" or "leaf2")) end
      end
    end
  end
  -- grass and mud where the roots meet the bank
  for x = 0, 63 do
    if A(img, x, 31) and H(x, 2, 635) < 0.55 then P(img, x, 31, (x % 3 == 0) and "leaf3" or "leaf2") end
    if A(img, x, 30) and H(x, 3, 636) < 0.25 then P(img, x, 29, "olive3") end
  end
  local names = {}
  for r = 0, 1 do for c = 0, 3 do
    local t = T(); t:drawImage(img, Point(-c * 16, -r * 16))
    put(19 + r * 4 + c, ROW, "cflare_" .. r .. c, t, {})
  end end
end
-- Spanish moss curtains: clumped grey-green beards with gaps. Strand x at y 0/16 is shared by every piece
-- (sine wobble with period 16), so top/mid/mid2/tip stack in any order.
local MOSS_CLUMPS = { { 3, 3 }, { 8, 2 }, { 12, 3 } } -- {x of the clump's left strand, strand count}
local function mossTile(kind)
  local t = T()
  for ci, cl in ipairs(MOSS_CLUMPS) do
    for s = 0, cl[2] - 1 do
      local sx = cl[1] + s
      local len = 16
      if kind == "tip" then len = ({ 11, 14, 8, 6, 12, 9, 13, 7 })[(ci * 3 + s) % 8 + 1] end
      if kind == "top" and s == cl[2] - 1 and ci == 2 then len = 0 end
      local sgn = (kind == "mid2") and -1 or 1
      for y = 0, len - 1 do
        local x = sx + math.floor(sgn * math.sin(2 * math.pi * (y + ci * 5) / 16) * 0.9 + 0.5) - math.floor(sgn * math.sin(2 * math.pi * ci * 5 / 16) * 0.9 + 0.5)
        local c = (s == 0) and "ink3" or ((s == cl[2] - 1) and "olive2" or "ink3")
        if s == 0 and (y + ci) % 4 == 0 then c = "ink4" end
        if (y + s * 3 + ci) % 5 == 0 then c = "ink2" end
        if kind == "tip" and y >= len - 2 then c = (y == len - 1) and "olive1" or "olive2" end
        P(t, x, y, c)
        -- wispy side hairs
        if (y + s + ci) % 6 == 2 then P(t, x - 1, y, "olive2") end
        if (y + ci * 2 + s) % 7 == 4 then P(t, x + 1, y, "ink2") end
      end
    end
  end
  if kind == "top" then
    -- the clump where the moss grips the branch: dense, tapering into the strands
    for x = 1, 14 do
      local th = 1 + math.floor(vnoise(x, 0, 641, 4) * 4)
      for y = 0, th do P(t, x, y, (y == 0) and ((x % 4 == 1) and "ink4" or "ink3") or ((y == th) and "olive2" or ((x + y) % 3 == 0 and "olive2" or "ink3"))) end
    end
  end
  return t
end
put(27, ROW, "moss_top", mossTile("top"), {})
put(28, ROW, "moss_mid", mossTile("mid"), {})
put(29, ROW, "moss_mid2", mossTile("mid2"), {})
put(30, ROW, "moss_tip", mossTile("tip"), {})

---------------------------------------------------------------------------------------------------
-- Row 10: canopy 4x3, cypress knees, plants, front-layer pieces
ROW = 10
do
  local img = IMG(64, 48)
  -- trunk rising from the bottom (columns 1-2) and forking into limbs
  for y = 30, 47 do for gx = 0, 31 do
    local narrow = math.floor(math.max(0, (40 - y)) * 0.9)
    if gx >= narrow and gx <= 31 - narrow then P(img, 16 + gx, y, barkColor(gx, y % 16, 0)) end
  end end
  local function limbLine(x0, y0, x1, y1, th)
    local pts = linePts(x0, y0, x1, y1, {})
    for _, p in ipairs(pts) do for k = 0, th - 1 do P(img, p[1], p[2] + k, (k == 0) and "ink4" or ((k == th - 1) and "dirt1" or "dirt2")) end end
  end
  limbLine(20, 34, 6, 24, 4); limbLine(42, 33, 58, 23, 4); limbLine(28, 32, 24, 18, 3); limbLine(36, 32, 40, 16, 3)
  -- foliage: layered flat-topped feathery masses (cypress), highlight on top, dark undersides
  local blobs = {
    { 10, 22, 11, 6 }, { 24, 15, 13, 7 }, { 40, 14, 13, 7 }, { 54, 21, 10, 6 }, { 32, 8, 14, 7 }, { 16, 9, 9, 5 }, { 49, 9, 9, 5 },
    { 4, 28, 6, 4 }, { 60, 28, 5, 4 }, { 32, 22, 10, 5 },
  }
  for bi, b in ipairs(blobs) do
    local cx, cy, rx, ry = b[1], b[2], b[3], b[4]
    for y = cy - ry - 1, cy + ry + 2 do for x = cx - rx - 1, cx + rx + 1 do
      local dx, dy = (x - cx) / rx, (y - cy) / ry
      local edge = vnoise(x, y, 650 + bi, 4) * 0.45
      local d = dx * dx + dy * dy
      if d <= 1 + edge - 0.2 then
        local c
        if dy < -0.55 then c = (H(x, y, 651) < 0.78) and "leaf3" or "leaf4"
        elseif dy < -0.1 then c = (H(x, y, 653) < 0.3) and "leaf3" or "leaf2"
        elseif dy < 0.45 then c = ((x + y) % 2 == 0) and "leaf2" or "leaf1"
        else c = "leaf1" end
        -- feathery needle sprays: short vertical strokes
        if (x * 3 + y) % 7 == 0 and dy < 0.3 then c = (dy < -0.3) and "leaf4" or "leaf3" end
        if (x + y * 2) % 9 == 0 and dy > 0 then c = "leaf1" end
        if dy < -0.75 and H(x, y, 652) < 0.25 then c = "olive4" end
        P(img, x, y, c)
      end
    end end
  end
  -- feathery jagged undersides: needle tips hanging
  for x = 0, 63 do
    local lowest = -1
    for y = 47, 0, -1 do if A(img, x, y) and G(img, x, y):sub(1, 4) == "leaf" then lowest = y; break end end
    if lowest > 0 and lowest < 40 and x % 2 == 0 then P(img, x, lowest + 1, "leaf1") end
  end
  -- Spanish moss drapes hanging under the masses
  local drapes = { { 3, 31, 12 }, { 7, 27, 16 }, { 13, 27, 10 }, { 46, 26, 9 }, { 51, 26, 15 }, { 57, 30, 12 }, { 61, 31, 9 }, { 26, 24, 7 }, { 38, 23, 8 }, { 18, 30, 8 } }
  for di, d in ipairs(drapes) do
    local x0, y0, len = d[1], d[2], d[3]
    for s = 0, 2 do
      local sx = x0 + s - 1
      local l = len - s * 2 - ((di + s) % 3)
      for y = y0, math.min(47, y0 + l) do
        local x = sx + math.floor(math.sin((y + di * 2 + s * 5) / 6) * 0.8 + 0.5)
        local c = ((y + s) % 3 == 0) and "ink4" or "ink3"
        if (y + di) % 4 == 2 then c = "olive3" end
        if y >= y0 + l - 1 then c = "olive2" end
        P(img, x, y, c)
      end
    end
  end
  putGrid(img, 0, ROW, function(r, c) return "canopy_" .. r .. c end, 3, 4)
end

-- cypress knees (bottom-anchored, row 20)
local function knee(t, cx, h, w, seed)
  for y = 15 - h, 15 do
    local k = (y - (15 - h)) / h
    local hw = math.max(0, math.floor(w * (0.25 + k * 0.75) + 0.5))
    for x = cx - hw, cx + hw do
      local dx = (x - cx) / math.max(1, hw)
      local c = (dx < -0.4) and "ink4" or ((dx < 0.2) and "ink3" or ((dx < 0.7) and "dirt2" or "ink1"))
      if y == 15 - h then c = (x <= cx) and "ink4" or "ink3" end
      if H(x, y, seed) < 0.12 then c = "dirt2" end
      P(t, x, y, c)
    end
  end
  -- moss at the base
  for x = cx - w - 1, cx + w + 1 do if H(x, 15, seed + 1) < 0.7 then P(t, x, 15, "leaf2"); if H(x, 14, seed) < 0.4 then P(t, x, 14, "olive3") end end end
end
local ka = T(); knee(ka, 7, 11, 3, 661); put(12, ROW, "knee_a", ka, {})
local kb = T(); knee(kb, 4, 8, 2, 662); knee(kb, 11, 6, 2, 663); put(13, ROW, "knee_b", kb, {})
local kc = T(); knee(kc, 3, 4, 1, 664); knee(kc, 8, 7, 2, 665); knee(kc, 13, 3, 1, 666); put(14, ROW, "knee_c", kc, {})

-- plants (bottom-anchored, row 20)
local function stalk(t, x, h, lean, cols, seed)
  for k = 0, h - 1 do
    local xx = x + math.floor(lean * (k / h) ^ 2 + 0.5)
    local c = cols[1]
    if k > h * 0.45 then c = cols[2] end
    if k == h - 1 then c = cols[3] end
    P(t, xx, 15 - k, c)
  end
end
local function reeds(v)
  local t = T()
  local sets = {
    { { 2, 11, -1 }, { 4, 14, 0 }, { 6, 9, 1 }, { 9, 13, 1 }, { 11, 10, 2 }, { 13, 7, 1 } },
    { { 1, 8, -1 }, { 3, 12, -2 }, { 7, 15, 0 }, { 8, 11, 1 }, { 12, 13, 2 } },
    { { 3, 6, -1 }, { 5, 9, 0 }, { 8, 7, 1 }, { 10, 10, 1 }, { 14, 6, 1 } },
  }
  for i, s in ipairs(sets[v]) do stalk(t, s[1], s[2], s[3], (i % 2 == 0) and { "olive2", "olive3", "olive4" } or { "leaf2", "olive3", "sand2" }, 671) end
  -- broad leaves
  if v == 1 then L(t, 4, 15, 1, 9, "olive3"); L(t, 5, 15, 2, 9, "olive2") end
  if v == 2 then L(t, 8, 15, 12, 8, "olive3"); L(t, 9, 15, 13, 8, "olive2") end
  return t
end
for v = 1, 3 do put(14 + v, ROW, "reeds_" .. string.char(96 + v), reeds(v), {}) end
local function cattail(v)
  local t = reeds(v == 1 and 3 or 2)
  local heads = (v == 1) and { { 4, 13 }, { 10, 11 } } or { { 7, 14 }, { 3, 10 }, { 12, 12 } }
  for _, hd in ipairs(heads) do
    local x, h = hd[1], hd[2]
    for k = 0, h - 1 do P(t, x, 15 - k, (k > h - 3) and "olive3" or "olive2") end
    for k = h - 6, h - 3 do P(t, x, 15 - k, "dirt3"); P(t, x + 1, 15 - k, "dirt2") end
    P(t, x, 15 - (h - 6), "dirt2"); P(t, x, 15 - (h - 3), "dirt4")
  end
  return t
end
put(18, ROW, "cattail_a", cattail(1), {})
put(19, ROW, "cattail_b", cattail(2), {})
local function fern(v)
  local t = T()
  local fronds = (v == 1) and { { 7, 15, 1, 9 }, { 7, 15, 13, 7 }, { 7, 15, 4, 4 }, { 8, 15, 11, 3 } } or { { 8, 15, 2, 8 }, { 8, 15, 15, 9 }, { 8, 15, 7, 5 } }
  for _, f in ipairs(fronds) do
    local pts = linePts(f[1], f[2], f[3], f[4], {})
    for i, p in ipairs(pts) do
      P(t, p[1], p[2], "leaf3")
      if i % 2 == 0 then P(t, p[1], p[2] - 1, "leaf4"); P(t, p[1], p[2] + 1, "leaf2") end
    end
    P(t, f[3], f[4], "leaf4")
  end
  return t
end
put(20, ROW, "fern_a", fern(1), {})
put(21, ROW, "fern_b", fern(2), {})
local function btuft(v)
  local t = T()
  local blades = ({ { 3, 5, 6, 8, 10 }, { 2, 4, 7, 9, 12, 13 }, { 5, 6, 8, 11 } })[v]
  for i, bx in ipairs(blades) do
    local hgt = 2 + ((i * 3 + v) % 4)
    for k = 0, hgt do
      local x = bx + ((k > 1) and ((i % 2 == 0) and 1 or -1) or 0)
      P(t, x, 15 - k, (k == hgt) and "olive4" or ((k > hgt / 2) and "leaf3" or "leaf2"))
    end
  end
  for x = 1, 14 do if A(t, x, 15) or A(t, x - 1, 15) then P(t, x, 15, "leaf2") end end
  return t
end
for v = 1, 3 do put(21 + v, ROW, "btuft_" .. v, btuft(v), {}) end
local mush = T()
for _, m in ipairs({ { 5, 6, 3 }, { 10, 4, 2 }, { 8, 3, 1 } }) do
  local x, h, r = m[1], m[2], m[3]
  for y = 15 - h, 15 do P(mush, x, y, "ink4") end
  for i = -r, r do P(mush, x + i, 15 - h, (i < 0) and "sand3" or "sand2"); if math.abs(i) < r then P(mush, x + i, 14 - h, (i <= 0) and "sand4" or "sand3") end end
  P(mush, x - r, 16 - h, "dirt2"); P(mush, x + r, 16 - h, "dirt2")
  if r > 1 then P(mush, x - 1, 14 - h, "ink5") end
end
for x = 3, 12 do P(mush, x, 15, "leaf2") end
put(25, ROW, "mushroom", mush, {})
local stump = T()
for x = 2, 13 do for y = 5, 15 do
  local c = (x < 4) and "ink4" or ((x < 7) and "ink3" or ((x < 11) and "dirt2" or "ink1"))
  if H(x, y // 2, 681) < 0.15 then c = "dirt1" end
  P(stump, x, y, c)
end end
for x = 2, 13 do P(stump, x, 4, (x < 8) and "dirt4" or "dirt3"); P(stump, x, 5, "dirt2") end
for x = 4, 10 do P(stump, x, 3, (x % 3 == 0) and "olive3" or "leaf3") end
P(stump, 6, 4, "dirt1"); P(stump, 7, 4, "outline"); P(stump, 8, 4, "dirt1") -- rotten heart
for x = 0, 15 do if x < 2 or x > 13 then if H(x, 1, 682) < 0.7 then P(stump, x, 15, "dirt2"); P(stump, x, 14, (x == 1 or x == 14) and "ink3" or nil) end end end
for y = 8, 12 do P(stump, 3, y, "olive2") end; P(stump, 4, 9, "olive3")
P(stump, 10, 9, "sand3"); P(stump, 11, 9, "sand3"); P(stump, 12, 9, "sand2"); P(stump, 10, 10, "sand1"); P(stump, 11, 10, "sand1")
put(26, ROW, "stump", stump, {})
local rock = T()
for y = 8, 15 do for x = 1, 14 do
  local dx, dy = (x - 7.5) / 6.8, (y - 15) / 7.2
  if dx * dx + dy * dy <= 1 then
    local c = (dx + dy < -0.9) and "ink4" or ((dx + dy < -0.2) and "ink3" or ((dx + dy < 0.4) and "ink2" or "ink1"))
    P(rock, x, y, c)
  end
end end
for x = 2, 13 do
  local y = 0
  while y < 16 and not A(rock, x, y) do y = y + 1 end
  if y < 16 and x < 10 then P(rock, x, y, "leaf3"); P(rock, x, y + 1, (x % 2 == 0) and "leaf2" or "olive3"); if x % 3 == 0 then P(rock, x, y + 2, "leaf2") end end
end
P(rock, 4, 10, "leaf4"); P(rock, 11, 13, "olive2")
put(27, ROW, "rock_moss", rock, {})
local bones = T()
L(bones, 2, 14, 8, 13, "ink4"); P(bones, 1, 13, "ink5"); P(bones, 1, 15, "ink4"); P(bones, 9, 12, "ink5"); P(bones, 9, 14, "ink4"); L(bones, 3, 15, 8, 14, "ink3")
-- small skull
R(bones, 10, 11, 4, 3, "ink4"); P(bones, 10, 11, "ink5"); P(bones, 11, 11, "ink5"); P(bones, 11, 12, "outline"); P(bones, 13, 12, "ink1"); P(bones, 10, 14, "ink3"); P(bones, 12, 14, "ink3"); P(bones, 13, 11, "ink3")
for x = 0, 15 do if H(x, 0, 691) < 0.5 then P(bones, x, 15, "leaf2") end end
put(28, ROW, "bones_s", bones, {})
-- front-layer pieces: sparse and dark
local function reedsFront(v)
  local t = T()
  local blades = (v == 1) and { { 1, 5, 1 }, { 3, 6, -1 }, { 6, 4, 1 }, { 10, 6, 1 }, { 13, 5, -1 } } or { { 2, 4, 1 }, { 5, 6, 1 }, { 8, 5, -1 }, { 12, 6, 1 }, { 14, 3, 0 } }
  for _, b in ipairs(blades) do
    for k = 0, b[2] - 1 do
      local x = b[1] + ((k >= b[2] - 2) and b[3] or 0)
      P(t, x, 15 - k, (k >= b[2] - 1) and "olive2" or "leaf1")
    end
  end
  return t
end
put(29, ROW, "reeds_front_a", reedsFront(1), {})
put(30, ROW, "reeds_front_b", reedsFront(2), {})
local mf = T()
for _, s in ipairs({ { 6, 13 }, { 8, 9 }, { 10, 11 } }) do
  for y = 0, s[2] - 1 do
    local x = s[1] + math.floor(math.sin(y / 5 + s[1]) * 0.8 + 0.5)
    P(mf, x, y, (y % 3 == 0) and "ink2" or "olive1")
  end
end
for x = 4, 12 do P(mf, x, 0, "olive1") end
put(31, ROW, "moss_front", mf, {})

---------------------------------------------------------------------------------------------------
-- Row 11: bg_far_deco silhouettes (no outline, no detail, very dark violet/blue)
ROW = 11
local function farCypress(v)
  local img = IMG(32, 48)
  local body, shade2 = (v == 1) and "sky1" or "weird1", (v == 1) and "steel1" or "ink1"
  local function px(x, y, c) P(img, x, y, c) end
  -- crown: flat-topped wide layered masses
  local blobs = (v == 1) and { { 16, 6, 13, 4 }, { 9, 11, 8, 3 }, { 23, 12, 8, 3 }, { 16, 15, 6, 3 } } or { { 15, 5, 11, 3 }, { 20, 10, 11, 4 }, { 8, 13, 7, 3 }, { 17, 17, 7, 3 } }
  for bi, b in ipairs(blobs) do
    for y = 0, 47 do for x = 0, 31 do
      local dx, dy = (x - b[1]) / b[3], (y - b[2]) / b[4]
      if dx * dx + dy * dy * 1.2 <= 1 + vnoise(x, y, 700 + bi, 4) * 0.35 - 0.15 then px(x, y, (dy > 0.5) and shade2 or body) end
    end end
  end
  -- drooping moss fringes
  for x = 2, 29, 2 do
    local y = 47
    while y > 0 and not A(img, x, y) do y = y - 1 end
    if y > 0 and y < 24 then for k = 1, 1 + (x * 7 + v) % 4 do px(x, y + k, shade2) end end
  end
  -- trunk: slight taper, flare at base
  for y = 14, 47 do
    local k = (y - 14) / 33
    local hw = 2 + math.floor(k * 1.5 + 0.5)
    if y > 40 then hw = hw + (y - 40) end
    for x = 16 - hw, 15 + hw do px(x, y, (x > 16) and shade2 or body) end
  end
  -- a couple of limbs
  L(img, 16, 24, 8, 20, body); L(img, 16, 25, 8, 21, body); L(img, 16, 30, 25, 26, shade2); L(img, 16, 31, 25, 27, shade2)
  return img
end
for v = 1, 2 do
  local img = farCypress(v)
  local pre = (v == 1) and "far_cyp_" or "far_cyp2_"
  for i, part in ipairs({ "top", "mid", "base" }) do
    for side = 0, 1 do
      local t = T(); t:drawImage(img, Point(-side * 16, -(i - 1) * 16))
      put((v - 1) * 6 + (i - 1) * 2 + side, ROW, pre .. part .. (side == 0 and "_l" or "_r"), t, {})
    end
  end
end
do
  local img = IMG(32, 32)
  local body, shade2 = "sky1", "steel1"
  -- sloped tin roof
  for y = 4, 10 do for x = 3 + (10 - y) // 2, 29 - (10 - y) // 3 do P(img, x, y, (y < 6) and body or shade2) end end
  for x = 1, 30 do P(img, x, 10, body) end
  -- walls
  R(img, 5, 11, 22, 10, body)
  R(img, 20, 11, 7, 10, shade2)
  -- stovepipe
  R(img, 22, 1, 2, 4, body)
  -- deck + stilts
  for x = 2, 29 do P(img, x, 21, shade2); P(img, x, 22, shade2) end
  for _, sx in ipairs({ 4, 11, 19, 27 }) do for y = 23, 31 do P(img, sx, y, (y % 3 == 0) and shade2 or body) end end
  L(img, 4, 23, 11, 30, shade2); L(img, 19, 23, 27, 30, shade2)
  -- one tiny lit window pixel pair
  P(img, 10, 14, "fire4"); P(img, 11, 14, "fire3")
  local names = { "far_shack_tl", "far_shack_tr", "far_shack_bl", "far_shack_br" }
  for i = 0, 3 do
    local c, r = i % 2, i // 2
    local t = T(); t:drawImage(img, Point(-c * 16, -r * 16))
    put(12 + i, ROW, names[i + 1], t, {})
  end
end

---------------------------------------------------------------------------------------------------
-- write outputs
local spr = Sprite(SHEET.width, SHEET.height, ColorMode.RGB)
spr.cels[1].image = SHEET
spr.layers[1].name = "tiles"
local names = {}; for n in pairs(K.PAL) do names[#names + 1] = n end; table.sort(names)
local pal = Palette(#names + 1); pal:setColor(0, Color{ r = 0, g = 0, b = 0, a = 0 })
for i, n in ipairs(names) do local c = K.PAL[n]; pal:setColor(i, Color{ r = c[1], g = c[2], b = c[3], a = 255 }) end
spr:setPalette(pal)
spr:saveAs(ROOT .. "/art-src/tiles/m2_bayou.aseprite")
spr:saveCopyAs(ROOT .. "/public/assets/tiles/m2_bayou.png")
spr:close()

table.sort(manifest.tiles, function(a, b) return a.id < b.id end)
local f = io.open(ROOT .. "/art-src/tiles/m2_bayou_tiles.json", "w")
f:write(json.encode(manifest))
f:close()
print("built m2_bayou tileset (" .. #manifest.tiles .. " tiles, " .. SHEET.width .. "x" .. SHEET.height .. ")")
