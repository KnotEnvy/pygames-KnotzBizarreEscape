-- Mission 2 Part II "RIVER RUN" tileset: the Regime barge tow and the sternwheeler BAYOU QUEEN, at night.
-- 16x16 tiles, 32 columns, one image, 0 margin/spacing.
-- Build: bash tools/build-art.sh art-src/tiles/m2_boat.lua
-- Writes: art-src/tiles/m2_boat.aseprite (source), public/assets/tiles/m2_boat.png (tileset image),
--         art-src/tiles/m2_boat_tiles.json (manifest: name -> local id, properties, animations; stage1 format).
--
-- Map geometry (16 px rows): barge / QUEEN main deck row 19 (walkable y 304), hull row 20, row 21 = river surface
-- (top of row 21 = y 336; every water tile has its crest line at tile y 2, the 2 px above it are transparent).
-- Containers sit on the deck (1 container = 2 rows, top y 272). QUEEN: promenade deck row 16 (one-way y 256),
-- hurricane roof row 13 (one-way y 208), smokestacks up to row ~3.
-- Back-layer pieces that belong to a deck ROW (qtrim_*, qpost_top, qcab_t*) are drawn for the SAME row as the
-- one-way deck strip: their top 8 px sit behind the deck strip, the visible part hangs in tile y 8-15.
-- Night lighting: moonlight from the top-left; lanterns/windows/furnace are the warm accents.
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local TS, COLS, ROWS = 16, 32, 6
local SHEET = Image(TS * COLS, TS * ROWS, ColorMode.RGB)
local CLEAR = app.pixelColor.rgba(0, 0, 0, 0)

local manifest = { tilewidth = TS, columns = COLS, rows = ROWS, image = "m2_boat.png", tiles = {} }
local byName = {}

---------------------------------------------------------------------------------------------------
-- helpers (same family as stage1.lua / m1_train.lua)
local function H(x, y, s)
  local h = (math.floor(x) * 374761393 + math.floor(y) * 668265263 + math.floor(s or 0) * 1442695041) & 0xffffffff
  h = ((h ~ (h >> 13)) * 1274126177) & 0xffffffff
  h = h ~ (h >> 16)
  return h / 4294967296
end
local function NI(w, h) return Image(w, h, ColorMode.RGB) end
local function T() return NI(TS, TS) end
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
local REV = {}
for n, c in pairs(K.PAL) do REV[app.pixelColor.rgba(c[1], c[2], c[3], 255)] = n end
local function G(t, x, y)
  if not A(t, x, y) then return nil end
  return REV[t:getPixel(x, y)]
end
-- palette ramp shift: G name -> darker/lighter of the same ramp
local function ramp(name) local r, i = name:match("^(%a+)(%d)$"); return r, tonumber(i) end
local function shift(name, d)
  if name == "white" then name = "ink6" end
  if name == "outline" then return (d > 0) and "ink1" or "outline" end
  local r, i = ramp(name); if not r then return name end
  local max = (r == "ink" or r == "fire") and 6 or 5
  i = i + d
  if i < 1 then return "outline" end
  return r .. math.min(max, i)
end

local function put(col, row, name, t, props, anim)
  assert(col < COLS and row < ROWS, "tile out of sheet: " .. name)
  assert(not byName[name], "duplicate tile name " .. name)
  local id = row * COLS + col
  for _, r in ipairs(manifest.tiles) do assert(r.id ~= id, "tile slot reused: " .. name) end
  SHEET:drawImage(t, Point(col * TS, row * TS))
  local rec = { name = name, id = id, props = props or {} }
  if anim then rec.anim = anim end
  manifest.tiles[#manifest.tiles + 1] = rec
  byName[name] = rec
  return id
end
-- 16x16 tile (cx, cy) out of a bigger image
local function sub(src, cx, cy)
  local t = T()
  for y = 0, TS - 1 do for x = 0, TS - 1 do
    local sx, sy = cx * TS + x, cy * TS + y
    if sx < src.width and sy < src.height then t:drawPixel(x, y, src:getPixel(sx, sy)) end
  end end
  return t
end
local function copy(src) local t = NI(src.width, src.height); for y = 0, src.height - 1 do for x = 0, src.width - 1 do t:drawPixel(x, y, src:getPixel(x, y)) end end; return t end
local function mirror(src)
  local t = NI(src.width, src.height)
  for y = 0, src.height - 1 do for x = 0, src.width - 1 do t:drawPixel(src.width - 1 - x, y, src:getPixel(x, y)) end end
  return t
end
-- outline transparent pixels 4-adjacent to opaque ones, limited to a rect
local function edgeOutline(t, x0, y0, x1, y1, c)
  local marks = {}
  for y = y0, y1 do for x = x0, x1 do
    if not A(t, x, y) and (A(t, x - 1, y) or A(t, x + 1, y) or A(t, x, y - 1) or A(t, x, y + 1)) then marks[#marks + 1] = { x, y } end
  end end
  for _, m in ipairs(marks) do P(t, m[1], m[2], c or "outline") end
end

-- tiny stencil font (3x5, M/N wider)
local FONT = {
  ["0"] = { "xxx", "x.x", "x.x", "x.x", "xxx" }, ["1"] = { ".x.", "xx.", ".x.", ".x.", "xxx" },
  ["2"] = { "xx.", "..x", ".x.", "x..", "xxx" }, ["3"] = { "xx.", "..x", ".x.", "..x", "xx." },
  ["4"] = { "x.x", "x.x", "xxx", "..x", "..x" }, ["5"] = { "xxx", "x..", "xx.", "..x", "xx." },
  ["6"] = { ".xx", "x..", "xxx", "x.x", "xxx" }, ["7"] = { "xxx", "..x", ".x.", ".x.", ".x." },
  ["8"] = { "xxx", "x.x", "xxx", "x.x", "xxx" }, ["9"] = { "xxx", "x.x", "xxx", "..x", "xx." },
  A = { ".x.", "x.x", "xxx", "x.x", "x.x" }, B = { "xx.", "x.x", "xx.", "x.x", "xx." },
  E = { "xxx", "x..", "xx.", "x..", "xxx" }, F = { "xxx", "x..", "xx.", "x..", "x.." },
  L = { "x..", "x..", "x..", "x..", "xxx" }, M = { "x...x", "xx.xx", "x.x.x", "x...x", "x...x" },
  ["-"] = { "...", "...", "xxx", "...", "..." },
}
local function text(t, s, x, y, c, opt)
  opt = opt or {}
  local cx = x
  for i = 1, #s do
    local g = FONT[s:sub(i, i)]
    if g then
      for j, row in ipairs(g) do for k = 1, #row do
        if row:sub(k, k) == "x" then
          local px, py = cx + k - 1, y + j - 1
          if not (opt.chip and H(px, py, opt.chip) < (opt.p or 0.14)) then
            if opt.sh then P(t, px + 1, py + 1, opt.sh) end
            P(t, px, py, c)
          end
        end
      end end
      cx = cx + #g[1] + 1
    else
      cx = cx + 3
    end
  end
end
local function textWidth(s) local w = 0; for i = 1, #s do local g = FONT[s:sub(i, i)]; w = w + (g and #g[1] or 2) + 1 end; return w - 1 end

-- a set of horizontal dashes on a 16-periodic row (for drifting ripples)
local function dashes(seed, n, minl, maxl)
  local s = {}
  for i = 1, n do
    local st = math.floor(H(i, 0, seed) * 16)
    local len = minl + math.floor(H(i, 1, seed) * (maxl - minl + 1))
    for k = 0, len - 1 do s[(st + k) % 16] = true end
  end
  return s
end

local MW = { collides = true, material = "metal" }         -- S metal
local WD = { collides = true, material = "wood" }          -- S wood
local OWW = { collides = true, oneway = true, material = "wood" }
local WATER = { hazard = "water", material = "water" }

---------------------------------------------------------------------------------------------------
-- RIVER (moonlit night): crest line at tile y 2, sky1/steel1 body, sky2 ripples drifting, sky4/ink5 moon glints.
-- All four frames loop seamlessly (patterns scroll 4 px per frame on a 16 px period).
local RD = { [5] = dashes(11, 1, 2, 3), [7] = dashes(12, 2, 2, 4), [10] = dashes(13, 2, 2, 3), [13] = dashes(14, 2, 1, 3) }
local GL = dashes(15, 2, 1, 2)
local function riverStatic(x, y)
  if H(x, y, 21) < 0.2 then return "steel1" end
  return "sky1"
end
local function riverTopPx(x, y, f)
  if y <= 0 then return nil end
  local sx = (x - f * 4) % 16
  local wv = math.sin((sx + 0.5) / 16 * 2 * math.pi)
  if y == 1 then if wv > 0.8 then return "sky3" end; return nil end
  if y == 2 then
    local h = H(sx, 2, 41)
    if wv > 0.8 then return (h < 0.6) and "ink5" or "sky4" end
    if h < 0.14 then return "ink5" elseif h < 0.4 then return "sky4" end
    return "sky3"
  end
  if y == 3 then return (wv < -0.5) and "sky3" or "sky2" end
  if y == 4 then return (x % 2 == 0) and "sky2" or "sky1" end
  local dir = (y % 2 == 0) and 1 or -1
  local dx = (x - f * 4 * dir) % 16
  if y == 6 and GL[dx] then return "sky4" end
  if RD[y] and RD[y][dx] then return "sky2" end
  if y >= 9 then return riverStatic(x, y) end
  return "sky1"
end
local BD = { [1] = dashes(31, 2, 2, 3), [4] = dashes(32, 1, 2, 4), [8] = dashes(33, 2, 1, 3), [12] = dashes(34, 1, 2, 3) }
local function riverBodyPx(x, y, f)
  local dir = (y % 2 == 0) and 1 or -1
  local dx = (x - f * 4 * dir) % 16
  if BD[y] and BD[y][dx] then return "sky2" end
  return riverStatic(x, y + 16)
end
local function riverTop(f) local t = T(); for y = 0, 15 do for x = 0, 15 do P(t, x, y, riverTopPx(x, y, f)) end end; return t end
local function riverBody(f) local t = T(); for y = 0, 15 do for x = 0, 15 do P(t, x, y, riverBodyPx(x, y, f)) end end; return t end
local function riverDeep()
  local t = T()
  for y = 0, 15 do for x = 0, 15 do
    local h = H(x, y, 37)
    P(t, x, y, (h < 0.25) and "outline" or ((h > 0.95) and "sky1" or "steel1"))
  end end
  return t
end

-- Hull below the waterline: tone-map the hull colour (seen through dark water).
local function underwater(c)
  if c == nil then return nil end
  local r, i = ramp(c)
  if not r then return (c == "white") and "steel3" or "outline" end
  if r == "red" then return (i >= 3) and "red2" or "red1" end
  if i >= 4 then return "steel3" elseif i == 3 then return "steel2" elseif i == 2 then return "steel1" end
  return "outline"
end
-- Apply the waterline to a 32 px tall hull side (rows 20-21). inHull(x, y) says whether a pixel belongs to the hull.
-- y 16-17: above water (hull or transparent), y 18 crest, y 19.. under water; below `keel` only river.
local function sinkHull(t, inHull, keel, y0)
  y0 = y0 or 16
  for y = y0, y0 + 15 do for x = 0, t.width - 1 do
    local ly = y - y0
    local hull = inHull(x, y) and y <= keel
    if not hull then
      P(t, x, y, riverTopPx(x % 16, ly, 0))
    elseif ly == 2 then
      P(t, x, y, (H(x, y, 44) < 0.3) and "ink5" or "sky3")               -- water lapping on the hull
    elseif ly >= 3 then
      local c = underwater(G(t, x, y))
      if ly == 3 then c = (x % 2 == 0) and "sky2" or c end              -- surface film
      local dx = x % 16
      if RD[ly] and RD[ly][dx] then c = "sky1" end                      -- ripple streaks over the hull
      if ly >= 11 and (x + y) % 2 == 0 then c = shift(c, -1) end        -- deeper = darker
      if y == keel then c = "outline" end
      P(t, x, y, c)
    end
  end end
end

---------------------------------------------------------------------------------------------------
-- BARGES: rusty Regime steel. Deck lip steel (lit), heavy steel rub rail, olive-drab hull plating, rust, swamp slime.
local function bdeck(kind, v)
  local t = T()
  for x = 0, 15 do
    P(t, x, 0, (H(x, 0, 100 + v) < 0.3) and "steel4" or "steel5")
    P(t, x, 1, "steel4")
    P(t, x, 2, (x % 4 == 1) and "steel4" or "steel3")
    P(t, x, 3, (x % 4 == 3) and "steel2" or "steel3")
    P(t, x, 4, "steel2"); P(t, x, 5, "outline")
    if H(x, 1, 101 + v) < 0.12 then P(t, x, 1, "dirt3") end
    if H(x, 4, 102 + v) < 0.25 then P(t, x, 4, "dirt2") end
    -- rub rail
    P(t, x, 6, "steel4"); P(t, x, 7, "steel3"); P(t, x, 8, "steel2"); P(t, x, 9, "outline")
    if H(x, 7, 103 + v) < 0.2 then P(t, x, 7, "dirt3") end
    if H(x, 8, 104 + v) < 0.3 then P(t, x, 8, "dirt2") end
    -- hull plating
    for y = 10, 15 do P(t, x, y, "olive2") end
    P(t, x, 10, "olive1")
    if x % 8 == 3 then P(t, x, 13, "olive3") end
    if x % 8 == 4 then P(t, x, 14, "olive1") end
  end
  -- rail brackets
  for _, bx in ipairs({ 3, 11 }) do P(t, bx, 6, "steel5"); P(t, bx, 7, "steel4"); P(t, bx + 1, 8, "steel1") end
  if v == 1 then
    -- faded stencil + chipped paint
    text(t, "07", 5, 10, "sand2", { chip = 120, p = 0.05 })
    P(t, 11, 11, "steel3"); P(t, 12, 11, "steel3"); P(t, 12, 12, "steel2")
  elseif v == 2 then
    -- drain scupper with a rust run
    R(t, 6, 11, 3, 2, "outline"); P(t, 6, 11, "olive1")
    P(t, 7, 13, "dirt3"); P(t, 7, 14, "dirt3"); P(t, 8, 14, "dirt2"); P(t, 7, 15, "dirt2")
  end
  for y = 11, 15 do if H(2 + v * 5, y, 105) < 0.5 then P(t, (2 + v * 5) % 16, y, "dirt2") end end
  if kind == "l" then
    P(t, 0, 0, nil); P(t, 1, 0, "outline")
    for y = 1, 15 do P(t, 0, y, "outline") end
    for y = 1, 4 do P(t, 1, y, "steel5") end
    P(t, 1, 6, "steel5"); P(t, 1, 7, "steel4"); P(t, 1, 8, "steel3")
    for y = 10, 15 do P(t, 1, y, "olive3") end
    P(t, 2, 1, "white")
  elseif kind == "r" then
    P(t, 15, 0, nil); P(t, 14, 0, "outline")
    for y = 1, 15 do P(t, 15, y, "outline") end
    for y = 1, 4 do P(t, 14, y, "steel2") end
    P(t, 14, 6, "steel3"); P(t, 14, 7, "steel2"); P(t, 14, 8, "steel1")
    for y = 10, 15 do P(t, 14, y, "olive1") end
  end
  return t
end

-- Barge side, rows 20-21 as one 16x32 image. kind "l"/"r" = raked bow/stern, "m" = straight.
local BKEEL = 28
local function bargeEdge(y) if y < 4 then return 0 end; return math.floor((y - 4) * 0.5) end
local function bargeSide(kind, v)
  local t = NI(16, 32)
  local function inHull(x, y)
    if kind == "l" then return x >= bargeEdge(y) end
    if kind == "r" then return x <= 15 - bargeEdge(y) end
    return true
  end
  for y = 0, BKEEL do for x = 0, 15 do
    local c = "olive2"
    if y == 6 then c = "olive1" elseif y == 7 then c = "olive3" end
    if (y == 2 or y == 10) and x % 8 == 3 then c = "olive3" end
    if (y == 3 or y == 11) and x % 8 == 4 then c = "olive1" end
    if y >= 13 and y <= 17 then
      c = (y == 13) and ((H(x, y, 51 + v) < 0.5) and "dirt2" or "olive2") or ((y <= 15) and "dirt2" or "leaf1")
      if H(x, y, 52 + v) < 0.3 then c = (y >= 15) and "leaf2" or "dirt3" end
    end
    if y >= 18 then
      c = (y >= 25) and "olive1" or "olive2"
      if y == 22 and x % 8 == 3 then c = "olive3" end
    end
    if kind == "m" and x == 15 and y < 13 and y ~= 7 then c = "olive1" end       -- plate butt seam
    if kind == "m" and x == 0 and y < 13 and y ~= 6 then c = "olive3" end
    P(t, x, y, c)
  end end
  -- rust streaks running down from the rivet rows
  for k = 1, 3 do
    local x = math.floor(H(k, v, 60) * 14) + 1
    if x % 4 ~= 1 then
      local y0 = (H(k, v, 61) < 0.5) and 3 or 11
      local len = 2 + math.floor(H(k, v, 62) * 6)
      for y = y0, math.min(12, y0 + len) do P(t, x, y, (y < y0 + len // 2 + 1) and "dirt3" or "dirt2") end
    end
  end
  -- swamp slime strands hanging at the waterline
  for x = 0, 15 do
    if H(x, 0, 70 + v) < 0.28 then
      local len = 1 + math.floor(H(x, 1, 70 + v) * 3)
      P(t, x, 14, "leaf2"); P(t, x, 15, "leaf3")
      for y = 16, 15 + len do P(t, x, y, "leaf2") end
    end
  end
  if v == 1 then
    -- welded patch plate (newer olive), rivet frame, weld bead
    for y = 1, 9 do for x = 3, 11 do P(t, x, y, ((x + y) % 7 == 0) and "steel2" or "olive2") end end
    for x = 3, 11 do P(t, x, 1, "olive3"); P(t, x, 9, "olive1"); P(t, x, 10, "outline") end
    for y = 1, 9 do P(t, 3, y, "olive3"); P(t, 11, y, "olive1"); P(t, 12, y, "outline") end
    for x = 2, 12 do if x % 2 == 0 then P(t, x, 0, "dirt3") end end                -- weld bead
    for _, p in ipairs({ { 5, 3 }, { 9, 3 }, { 5, 7 }, { 9, 7 } }) do P(t, p[1], p[2], "olive4"); P(t, p[1] + 1, p[2] + 1, "olive1") end
    P(t, 6, 5, "dirt3"); P(t, 7, 5, "dirt3"); P(t, 7, 6, "dirt2"); P(t, 8, 4, "dirt3")
  elseif v == 2 then
    -- tyre fender hanging on a rope looped through it
    local cx, cy = 7.5, 8.5
    for y = 1, 15 do for x = 0, 15 do
      local dx, dy = (x - cx) / 6.6, (y - cy) / 5.8
      local r = math.sqrt(dx * dx + dy * dy)
      if r <= 1 and r >= 0.48 then
        local c = "ink1"
        local lit = (x - cx) * 0.7 + (y - cy)
        if lit < -3 then c = "ink2" end
        if lit < -5.2 and r > 0.7 then c = "ink3" end
        if lit > 3.5 then c = "outline" end
        if r < 0.62 and lit > 0 then c = "ink2" end                       -- inner rim catches light
        if r > 0.62 and r < 0.8 and (math.floor(math.atan(y - cy, x - cx) * 5) % 2 == 0) and c == "ink1" then c = "outline" end  -- tread
        P(t, x, y, c)
      elseif r > 1 and r <= 1.17 then
        P(t, x, y, "outline")
      elseif r < 0.48 then
        P(t, x, y, "olive1")                                              -- hull in shadow through the hole
      end
    end end
    -- rope: from the rail down over the tyre top into the hole
    for y = 0, 7 do
      local c1 = (y % 2 == 0) and "sand3" or "sand2"
      P(t, 7, y, c1); P(t, 8, y, (y % 2 == 0) and "dirt3" or "sand3")
    end
    P(t, 6, 0, "outline"); P(t, 9, 0, "outline"); P(t, 6, 3, "outline"); P(t, 9, 4, "outline")
  end
  -- rake ends
  if kind ~= "m" then
    for y = 0, 31 do
      local e = bargeEdge(y)
      for x = 0, 15 do
        local xi = (kind == "l") and x or (15 - x)                     -- distance from the outer end
        if xi < e then P(t, x, y, nil)
        elseif xi == e and y <= BKEEL then P(t, x, y, "outline")
        elseif xi == e + 1 and y <= 17 then P(t, x, y, (kind == "l") and "olive3" or "olive1") end
      end
    end
  end
  sinkHull(t, inHull, BKEEL)
  return t
end

-- railing (row 18, back): steel pipe rails, stanchion on _post
local function brail(post)
  local t = T()
  for x = 0, 15 do
    P(t, x, 4, "steel4"); P(t, x, 5, "steel2")
    P(t, x, 10, "steel3"); P(t, x, 11, "steel1")
  end
  for _, sx in ipairs(post and { 7 } or {}) do
    for y = 3, 15 do P(t, sx, y, "steel4"); P(t, sx + 1, y, "steel2") end
    P(t, sx, 2, "steel5"); P(t, sx + 1, 2, "steel3")
    R(t, sx - 1, 14, 4, 2, "steel2"); P(t, sx - 1, 14, "steel3"); P(t, sx + 2, 15, "steel1")
  end
  if not post then
    for x = 0, 15 do if H(x, 4, 130) < 0.15 then P(t, x, 4, "dirt3") end end
  end
  return t
end

-- bollard (row 18, back): twin mooring bitts with a hawser figure-eight
local function bollard()
  local t = T()
  R(t, 1, 14, 14, 2, "steel2"); for x = 1, 14 do P(t, x, 14, "steel3") end; P(t, 1, 14, "steel4")
  for _, bx in ipairs({ 2, 10 }) do
    R(t, bx, 7, 4, 7, "ink2")
    for y = 7, 13 do P(t, bx, y, "ink3"); P(t, bx + 3, y, "ink1") end
    R(t, bx - 1, 5, 6, 2, "ink2"); for x = bx - 1, bx + 4 do P(t, x, 5, "ink3") end; P(t, bx - 1, 5, "ink4"); P(t, bx + 4, 6, "ink1")
  end
  -- rope wraps
  for x = 3, 12 do
    local y = 9 + math.floor(((x - 3) / 9) * 2 + 0.5)
    P(t, x, y, (x % 2 == 0) and "sand3" or "sand2"); P(t, x, y + 1, "dirt2")
    local y2 = 11 - math.floor(((x - 3) / 9) * 2 + 0.5)
    P(t, x, y2, (x % 2 == 1) and "sand3" or "sand2")
  end
  for y = 8, 12 do P(t, 2, y, (y % 2 == 0) and "sand2" or "dirt3"); P(t, 13, y, (y % 2 == 1) and "sand2" or "dirt3") end
  return t
end

-- tow hawser spanning a gap between barges (rows 19/20, back): twisted, wet, sagging slightly mid-tile
local function towRope()
  local t = T()
  for x = 0, 15 do
    local sag = (x >= 4 and x <= 11) and 1 or 0
    for k = 0, 3 do
      local y = 6 + sag + k
      local s = (x + k) % 4
      local c = ({ [0] = "sand3", [1] = "dirt4", [2] = "dirt3", [3] = "dirt2" })[s]
      if k == 3 then c = (s == 0) and "dirt3" or "dirt1" end
      if k == 0 and s == 0 then c = "sand4" end
      P(t, x, y, c)
    end
    P(t, x, 10 + sag, "outline")
    if H(x, 12, 140) < 0.15 then P(t, x, 11 + sag, "sky2") end                -- drip
  end
  return t
end

-- gangplank (OW wood): board top at y 0, strap irons, hook lugs on the ends
local function gplank(kind)
  local t = T()
  for x = 0, 15 do
    P(t, x, 0, (H(x, 0, 150) < 0.3) and "dirt4" or "dirt5")
    P(t, x, 1, "dirt4"); P(t, x, 2, "dirt3"); P(t, x, 3, "dirt3"); P(t, x, 4, "dirt2"); P(t, x, 5, "outline")
    if H(x, 2, 151) < 0.18 then P(t, x, 2, "dirt2") end
    if H(x, 3, 152) < 0.12 then P(t, x, 3, "dirt4") end
    -- cross cleats on the underside
    if x % 8 == 2 or x % 8 == 3 then P(t, x, 5, "dirt2"); P(t, x, 6, (x % 8 == 2) and "dirt3" or "dirt1"); P(t, x, 7, "outline") end
  end
  for _, bx in ipairs({ 6, 14 }) do
    P(t, bx, 0, "steel4"); P(t, bx, 1, "steel3"); P(t, bx, 2, "steel3"); P(t, bx, 3, "steel2"); P(t, bx, 4, "steel1")
  end
  if kind == "l" then
    P(t, 0, 0, nil); for y = 1, 4 do P(t, 0, y, "outline") end; P(t, 1, 0, "outline"); P(t, 0, 5, nil)
    P(t, 1, 1, "dirt5"); P(t, 1, 2, "dirt4")
    -- hook lug gripping the deck edge
    for y = 5, 9 do P(t, 2, y, "steel3"); P(t, 3, y, "steel2") end
    P(t, 2, 10, "steel3"); P(t, 3, 10, "steel3"); P(t, 4, 10, "steel2"); P(t, 4, 9, "steel1")
    edgeOutline(t, 0, 5, 6, 11)
  elseif kind == "r" then
    P(t, 15, 0, nil); for y = 1, 4 do P(t, 15, y, "outline") end; P(t, 14, 0, "outline"); P(t, 15, 5, nil)
    P(t, 14, 2, "dirt2"); P(t, 14, 3, "dirt1")
    for y = 5, 9 do P(t, 12, y, "steel3"); P(t, 13, y, "steel2") end
    P(t, 13, 10, "steel2"); P(t, 12, 10, "steel3"); P(t, 11, 10, "steel3"); P(t, 11, 9, "steel4")
    edgeOutline(t, 9, 5, 15, 11)
  end
  return t
end

-- cargo net (back): sacks and crates under a rope net; _top = rounded top with the lifting ring
local function cargoBase(t, seed, ytop)
  ytop = ytop or function() return 0 end
  for y = 0, 15 do for x = 0, 15 do if y >= ytop(x) then P(t, x, y, "dirt1") end end end
  local lumps = { { 3, 4, 4, 3 }, { 11, 5, 5, 4 }, { 6, 11, 5, 3 }, { 14, 12, 3, 3 }, { 0, 12, 3, 3 } }
  for i, l in ipairs(lumps) do
    local cx = (l[1] + math.floor(H(i, 0, seed) * 3)) % 16
    local cy, rx, ry = l[2], l[3], l[4]
    for j = -ry, ry do for i2 = -rx - 1, rx + 1 do
      local x, y = (cx + i2) % 16, cy + j
      local d = (i2 * i2) / ((rx + 0.5) ^ 2) + (j * j) / ((ry + 0.5) ^ 2)
      if d <= 1 and y >= ytop(x) and y < 16 then
        local c = "dirt2"
        if i2 + j < -rx * 0.6 then c = "dirt3" end
        if i2 + j > rx * 0.5 then c = "dirt1" end
        if d > 0.75 and j > 0 then c = "outline" end
        if i % 2 == 0 and c == "dirt2" then c = "sand1" end                   -- burlap vs crate-brown
        P(t, x, y, c)
      end
    end end
  end
end
local function netOver(t, ytop)
  ytop = ytop or function() return 0 end
  for y = 0, 15 do for x = 0, 15 do
    if y >= ytop(x) then
      local a, b = (x + y) % 8 == 0, (x - y) % 8 == 0
      if a and b then P(t, x, y, "sand4")
      elseif a or b then P(t, x, y, "sand3")
      elseif ((x + y - 1) % 8 == 0 or (x - y + 1) % 8 == 0) and y > ytop(x) then
        local c = G(t, x, y); if c and c ~= "sand3" and c ~= "sand4" then P(t, x, y, "outline") end
      end
    end
  end end
end
local function cnet(kind)
  local t = T()
  if kind == "top" then
    local function top(x) return 3 + math.floor(2.5 * (1 - math.cos(2 * math.pi * (x - 7.5) / 16)) + 0.5) end
    cargoBase(t, 160, top)
    netOver(t, top)
    -- gathered ropes to the lifting ring
    for _, ex in ipairs({ 1, 4, 11, 14 }) do L(t, 7 + ((ex > 7) and 1 or 0), 2, ex, top(ex), "sand3") end
    P(t, 6, 0, "steel3"); P(t, 7, 0, "steel4"); P(t, 8, 0, "steel3"); P(t, 9, 0, "steel2")
    P(t, 6, 1, "steel3"); P(t, 9, 1, "steel1"); P(t, 7, 2, "steel2"); P(t, 8, 2, "steel1")
    for x = 0, 15 do local y = top(x); if A(t, x, y) and G(t, x, y) ~= "sand3" and G(t, x, y) ~= "sand4" then P(t, x, y, "dirt3") end end
  else
    cargoBase(t, (kind == "a") and 170 or 180)
    netOver(t)
  end
  return t
end

-- fuel tank (back, 4x2): horizontal cylinder on saddles, dished ends, hazard belt, FLAMMABLE stencil
local function fuelTank()
  local W, Hh = 64, 32
  local t = NI(W, Hh)
  local cy, ry = 14.5, 12.5
  local function capW(y) local d = (y - cy) / (ry + 0.3); if math.abs(d) > 1 then return nil end; return math.floor(5 * math.sqrt(1 - d * d) + 0.5) end
  for y = 2, 27 do
    local cw = capW(y)
    if cw then
      local x0, x1 = 6 - cw, 57 + cw
      for x = x0, x1 do
        local c
        if y <= 3 then c = "steel4"
        elseif y <= 7 then c = ((x + y) % 2 == 0) and "steel4" or "steel3"
        elseif y <= 17 then c = "steel3"
        elseif y <= 22 then c = ((x + y) % 2 == 0 and y <= 19) and "steel3" or "steel2"
        elseif y <= 25 then c = "steel2"
        else c = "steel1" end
        if x <= 6 then c = shift(c, (x <= 6 - cw + 1) and 0 or 0) end
        if x > 57 then c = shift(c, -1) end
        P(t, x, y, c)
      end
      -- end seams (weld rings)
      P(t, 6, y, "steel2"); P(t, 7, y, (y < 10) and "steel4" or "steel3"); P(t, 57, y, "steel1")
      P(t, x0, y, (y < 16) and "steel4" or "steel2"); P(t, x1, y, "steel1")
    end
  end
  -- top highlight streak
  for x = 8, 55 do if H(x, 3, 190) < 0.7 then P(t, x, 3, "steel5") end end
  -- weld seams
  for _, sx in ipairs({ 24, 40 }) do for y = 2, 27 do if A(t, sx, y) then P(t, sx, y, (y < 8) and "steel3" or "steel2") end end end
  -- hazard belt
  for y = 19, 21 do for x = 8, 56 do
    local k = (x + y) % 6
    P(t, x, y, (k < 3) and ((y == 19) and "sand4" or "sand3") or "ink1")
  end end
  for x = 8, 56 do P(t, x, 22, "steel1") end
  -- straps over the saddles
  for _, sx in ipairs({ 13, 50 }) do for y = 2, 27 do if A(t, sx, y) then P(t, sx, y, (y < 8) and "steel3" or "steel1"); P(t, sx + 1, y, "ink1") end end end
  -- saddles
  for _, s0 in ipairs({ 10, 47 }) do
    for y = 25, 31 do for x = s0, s0 + 7 do
      local c = "ink2"
      if x == s0 or y == 25 then c = "ink3" end
      if x == s0 + 7 or y == 31 then c = "outline" end
      P(t, x, y, c)
    end end
    P(t, s0 + 1, 30, "steel3"); P(t, s0 + 6, 30, "steel2")
    for x = s0 + 1, s0 + 6 do P(t, x, 26, "ink1") end
  end
  -- manway hatch + valve wheel
  R(t, 28, 0, 7, 2, "steel3"); for x = 28, 34 do P(t, x, 0, "steel4") end; P(t, 34, 1, "steel1")
  P(t, 39, 0, "red3"); P(t, 40, 0, "red2"); P(t, 41, 0, "red3"); P(t, 40, 1, "steel2")
  -- rust streaks from the hatch
  for y = 2, 8 do P(t, 30, y, (y < 6) and "dirt3" or "dirt2") end
  for y = 2, 6 do P(t, 33, y, "dirt2") end
  for k = 1, 6 do local x = 8 + math.floor(H(k, 0, 192) * 48); for y = 23, 26 do if A(t, x, y) then P(t, x, y, "dirt2") end end end
  -- stencil last (on a cleaned band so the straps/seams don't cut the letters)
  local s = "FLAMMABLE"
  local tx = 32 - textWidth(s) // 2
  for y = 8, 14 do for x = tx - 2, tx + textWidth(s) + 1 do P(t, x, y, (y == 8) and "steel4" or "steel3") end end
  text(t, s, tx, 9, "red3", { chip = 191, p = 0.03 })
  for x = tx - 2, tx + textWidth(s) + 1 do P(t, x, 14, "steel2") end
  return t
end

-- containers: corrugated steel boxes, 2 rows (16x32 columns). Ramps per colour.
local CR = {
  cr = { lip = "red4", hi = "red3", base = "red2", sh = "red1", deep = "outline" },
  cs = { lip = "steel4", hi = "steel3", base = "steel2", sh = "steel1", deep = "outline" },
  co = { lip = "olive4", hi = "olive3", base = "olive2", sh = "olive1", deep = "outline" },
}
local function container(cn, kind, v)
  local c = CR[cn]
  local seed = ({ cr = 200, cs = 230, co = 260 })[cn] + v * 7 + ((kind == "l") and 1 or (kind == "r") and 2 or 0)
  local t = NI(16, 32)
  for y = 0, 31 do for x = 0, 15 do
    local k = x % 4
    local col = (k == 0) and c.hi or ((k == 3) and c.sh or c.base)
    if y == 4 then col = c.deep elseif y == 5 then col = (k == 0) and c.base or c.sh end
    if y >= 24 and y <= 26 and H(x, y, seed) < 0.3 then col = c.sh end
    if y == 0 then col = (H(x, 0, seed) < 0.25) and c.hi or c.lip
    elseif y == 1 then col = c.hi elseif y == 2 then col = c.base elseif y == 3 then col = c.sh end
    if y == 27 then col = c.hi elseif y == 28 or y == 29 then col = c.base elseif y == 30 then col = c.sh elseif y == 31 then col = "outline" end
    P(t, x, y, col)
  end end
  -- rust streaks from the top rail, grime at the bottom
  for k = 1, 3 do
    local x = math.floor(H(k, 0, seed + 1) * 16)
    if x % 4 ~= 0 then
      local len = 3 + math.floor(H(k, 1, seed + 1) * 9)
      for y = 4, 4 + len do P(t, x, y, (y < 6 + len // 2) and "dirt3" or "dirt2") end
    end
  end
  for x = 0, 15 do if H(x, 26, seed + 2) < 0.35 then P(t, x, 26, "dirt2") end end
  for x = 0, 15 do if H(x, 30, seed + 3) < 0.2 then P(t, x, 30, "dirt2") end end
  if v == 1 then
    -- stencil code + data plate + a dent
    text(t, "4170", 1, 8, "sand2", { chip = seed + 4, p = 0.05 })
    R(t, 3, 17, 6, 4, "ink3"); for x = 3, 8 do P(t, x, 17, "ink4"); P(t, x, 20, "ink2") end
    P(t, 4, 18, "ink2"); P(t, 5, 18, "ink2"); P(t, 6, 18, "ink2"); P(t, 4, 19, "ink2"); P(t, 6, 19, "ink2"); P(t, 7, 19, "ink2")
    P(t, 12, 22, c.sh); P(t, 13, 22, c.deep); P(t, 12, 23, c.hi); P(t, 13, 21, c.base)
  end
  -- corner posts + castings
  local function casting(x0, y0, h)
    for y = y0, y0 + h - 1 do for x = x0, x0 + 3 do P(t, x, y, c.base) end end
    for x = x0, x0 + 3 do P(t, x, y0, c.lip) end
    for y = y0, y0 + h - 1 do P(t, x0, y, c.hi) end
    P(t, x0 + 1, y0 + 1, "outline"); P(t, x0 + 2, y0 + 1, "outline"); P(t, x0 + 1, y0 + 2, c.deep); P(t, x0 + 2, y0 + 2, c.sh)
    for x = x0, x0 + 3 do P(t, x, y0 + h - 1, c.sh) end
  end
  if kind == "l" then
    for y = 0, 31 do P(t, 0, y, "outline"); P(t, 1, y, c.hi); P(t, 2, y, c.base); P(t, 3, y, c.sh); P(t, 4, y, c.deep) end
    casting(1, 0, 4); casting(1, 27, 4)
    for y = 0, 31 do P(t, 0, y, "outline") end
    P(t, 0, 0, nil); P(t, 1, 0, "outline")
  elseif kind == "r" then
    for y = 0, 31 do P(t, 11, y, c.deep); P(t, 12, y, c.hi); P(t, 13, y, c.base); P(t, 14, y, c.sh); P(t, 15, y, "outline") end
    casting(11, 0, 4); casting(11, 27, 4)
    for y = 0, 31 do P(t, 15, y, "outline") end
    P(t, 15, 0, nil); P(t, 14, 0, "outline")
  end
  P(t, 0, 31, "outline"); P(t, 15, 31, "outline")
  return t
end
-- Regime spiral-eye stencil (faded paint) on a container middle column
local function eyeStencil(t, cx, cy, ring, a, b, ir, paint, seed)
  for y = 0, t.height - 1 do for x = 0, t.width - 1 do
    local dx, dy = x - cx, y - cy
    local r = math.sqrt(dx * dx + dy * dy)
    local function pnt(dark)
      if H(x, y, seed) < 0.12 then return end
      local under = G(t, x, y)
      local _, i = (under and ramp(under)) or nil, nil
      local pr, pi = ramp(paint)
      local c = paint
      if under then local ur, ui = ramp(under); if ui and ui <= 1 then c = pr .. math.max(1, pi - 1) elseif under == "outline" then c = pr .. math.max(1, pi - 1) end end
      if dark then c = "outline" end
      P(t, x, y, c)
    end
    if ring and r >= ring - 1 and r <= ring and math.abs(dx) > 1.2 and math.abs(dy) > 1.2 then pnt(false) end
    local ex = dx / (a + 0.5)
    local lid = 1 - ex * ex
    if lid > 0 and math.abs(dy) <= b * lid + 0.3 then
      local edge = math.abs(dy) > b * lid - 0.8
      if edge then pnt(false)
      elseif r <= ir + 0.4 then
        local ang = math.atan(dy, dx)
        local s = (r - ang / (2 * math.pi) * 2.4) / 2.4
        local f = s - math.floor(s)
        if f < 0.5 or r < 1 then pnt(false) end
      end
    end
  end end
end

-- crane (back layer lattice, rusty yellow-olive)
local CRN = { hi = "sand2", base = "olive2", sh = "olive1", deep = "outline" }
local function rustSpecks(t, seed, p)
  for y = 0, t.height - 1 do for x = 0, t.width - 1 do
    local c = G(t, x, y)
    if c and (c:match("^olive") or c == "sand2") and H(x, y, seed) < (p or 0.06) then P(t, x, y, (H(x, y, seed + 1) < 0.5) and "dirt3" or "dirt2") end
  end end
end
local function craneMast(top)
  local t = T()
  if not top then
    for y = 0, 15 do P(t, 2, y, CRN.hi); P(t, 3, y, CRN.base); P(t, 12, y, CRN.base); P(t, 13, y, CRN.sh) end
    L(t, 4, 0, 11, 7, CRN.base); L(t, 11, 8, 4, 15, CRN.base)
    L(t, 4, 1, 10, 7, CRN.deep); L(t, 10, 8, 4, 14, nil)
    for y = 9, 15 do for x = 4, 11 do if G(t, x, y) == nil and A(t, x, y - 1) and G(t, x, y - 1) == CRN.base then P(t, x, y, CRN.deep) end end end
    for x = 4, 11 do P(t, x, 0, CRN.base) end
    for x = 4, 11 do if not A(t, x, 1) then P(t, x, 1, CRN.deep) end end
    for _, p in ipairs({ { 2, 0 }, { 13, 0 }, { 12, 7 }, { 3, 15 } }) do P(t, p[1], p[2], "olive3") end
  else
    for y = 6, 15 do
      local f = (15 - y) / 9
      local xl, xr = math.floor(2 + f * 3 + 0.5), math.floor(13 - f * 3 + 0.5)
      P(t, xl, y, CRN.hi); P(t, xl + 1, y, CRN.base); P(t, xr - 1, y, CRN.base); P(t, xr, y, CRN.sh)
    end
    L(t, 5, 8, 10, 13, CRN.base); L(t, 10, 8, 5, 13, CRN.sh)
    R(t, 4, 5, 8, 2, CRN.base); for x = 4, 11 do P(t, x, 5, CRN.hi) end; P(t, 11, 6, CRN.deep)
    -- sheave
    P(t, 6, 2, "ink2"); P(t, 7, 1, "ink3"); P(t, 8, 1, "ink2"); P(t, 9, 2, "ink1"); P(t, 6, 3, "ink2"); P(t, 9, 3, "ink1"); P(t, 7, 4, "ink1"); P(t, 8, 4, "ink1")
    P(t, 7, 2, "steel3"); P(t, 8, 3, "steel2"); P(t, 7, 3, "outline"); P(t, 8, 2, "outline")
    -- warning lamp
    P(t, 11, 3, "red4"); P(t, 11, 2, "red5"); P(t, 12, 3, "red2"); P(t, 11, 4, CRN.deep)
    for _, p in ipairs({ { 2, 15 }, { 13, 15 } }) do P(t, p[1], p[2], "olive3") end
  end
  rustSpecks(t, top and 301 or 300)
  return t
end
local function craneBoom(kind)
  local t = T()
  local function chordY(x)
    if kind ~= "r" then return 2, 11 end
    local f = math.min(1, x / 11)
    return math.floor(2 + f * 4 + 0.5), math.floor(11 - f * 3 + 0.5)
  end
  local xmax = (kind == "r") and 11 or 15
  for x = 0, xmax do
    local yt, yb = chordY(x)
    P(t, x, yt, CRN.hi); P(t, x, yt + 1, CRN.base); P(t, x, yb, CRN.base); P(t, x, yb + 1, CRN.sh)
  end
  -- warren diagonals
  for x = 0, xmax do
    local yt, yb = chordY(x)
    local k = x % 16
    local fy = (k < 8) and (k / 7) or ((15 - k) / 7)
    local y = math.floor(yt + 2 + fy * (yb - yt - 3) + 0.5)
    if y > yt + 1 and y < yb then P(t, x, y, CRN.base); if y + 1 < yb then P(t, x, y + 1, CRN.deep) end end
  end
  if kind == "l" then
    R(t, 0, 1, 3, 13, CRN.base); for y = 1, 13 do P(t, 0, y, CRN.hi); P(t, 2, y, CRN.sh) end
    P(t, 1, 4, "outline"); P(t, 1, 10, "outline"); P(t, 1, 3, "olive3"); P(t, 1, 9, "olive3")
  elseif kind == "r" then
    -- tip with sheave, falling cable and hook
    R(t, 10, 4, 4, 6, CRN.base); for y = 4, 9 do P(t, 10, y, CRN.hi); P(t, 13, y, CRN.sh) end
    P(t, 11, 6, "ink2"); P(t, 12, 6, "ink1"); P(t, 11, 7, "ink1"); P(t, 12, 7, "outline"); P(t, 11, 5, "steel3")
    for y = 10, 12 do P(t, 13, y, "steel2") end
    P(t, 12, 12, "steel3"); P(t, 13, 12, "steel2"); P(t, 14, 12, "steel1")
    P(t, 13, 13, "steel3"); P(t, 13, 14, "steel3"); P(t, 12, 15, "steel3"); P(t, 11, 14, "steel2"); P(t, 14, 13, "steel1")
  end
  rustSpecks(t, 310 + ((kind == "l") and 1 or (kind == "r") and 2 or 0))
  return t
end
local function craneCab()
  local t = NI(32, 32)
  -- body
  for y = 6, 31 do for x = 2, 29 do P(t, x, y, CRN.base) end end
  for y = 6, 31 do P(t, 2, y, CRN.hi); P(t, 29, y, CRN.deep); P(t, 28, y, CRN.sh) end
  -- roof
  for x = 1, 30 do P(t, x, 3, CRN.hi); P(t, x, 4, CRN.base); P(t, x, 5, CRN.deep) end
  P(t, 1, 3, nil); P(t, 30, 3, nil)
  for x = 8, 12 do P(t, x, 2, "ink2") end; P(t, 9, 1, "ink3"); P(t, 10, 1, "ink2")   -- exhaust stub
  -- window: three lit panes, operator silhouette
  for y = 8, 17 do for x = 4, 27 do P(t, x, y, CRN.deep) end end
  for y = 9, 16 do for x = 5, 26 do
    local c = "fire3"
    if x >= 23 or y >= 15 then c = "fire2" end
    if x <= 9 and y <= 11 then c = "fire4" end
    P(t, x, y, c)
  end end
  P(t, 6, 9, "fire5"); P(t, 7, 9, "fire4"); P(t, 6, 10, "fire5")
  for y = 9, 16 do P(t, 12, y, CRN.deep); P(t, 20, y, CRN.deep) end
  -- operator (head, cap, shoulders) and levers
  for y = 11, 13 do for x = 15, 17 do P(t, x, y, "dirt1") end end
  P(t, 15, 11, "fire3"); P(t, 17, 11, "fire2"); P(t, 14, 12, "dirt1"); P(t, 18, 12, "dirt1")       -- head + cap brim
  for y = 14, 16 do for x = 14 - (y - 14), 18 + (y - 14) do if x > 12 and x < 20 then P(t, x, y, "dirt1") end end end
  L(t, 23, 16, 24, 13, "dirt1"); P(t, 24, 12, "red3"); L(t, 9, 16, 9, 14, "dirt1"); P(t, 9, 13, "fire5")
  -- sill + light spill
  for x = 4, 27 do P(t, x, 18, CRN.hi); P(t, x, 19, CRN.deep) end
  for x = 6, 24 do if x % 3 == 0 then P(t, x, 20, "dirt3") end end
  -- door
  for y = 21, 31 do for x = 20, 26 do P(t, x, y, CRN.sh) end end
  for y = 21, 31 do P(t, 20, y, CRN.deep); P(t, 26, y, CRN.deep) end
  for x = 20, 26 do P(t, x, 21, CRN.deep) end
  P(t, 22, 23, "ink2"); P(t, 23, 23, "ink2"); P(t, 22, 24, "ink2"); P(t, 23, 24, "ink1")      -- small port
  P(t, 25, 27, "olive3"); P(t, 25, 28, CRN.deep)
  -- vent grille
  for y = 22, 26 do for x = 5, 13 do P(t, x, y, ((y % 2) == 0) and CRN.deep or CRN.sh) end end
  for x = 5, 13 do P(t, x, 21, CRN.hi) end
  -- hazard stripe kick band
  for y = 28, 30 do for x = 3, 18 do P(t, x, y, ((x + y) % 6 < 3) and "sand3" or "ink1") end end
  for x = 2, 29 do P(t, x, 31, CRN.deep) end
  -- rivets
  for _, p in ipairs({ { 4, 7 }, { 27, 7 }, { 4, 25 }, { 16, 20 }, { 16, 26 } }) do P(t, p[1], p[2], "olive3"); P(t, p[1] + 1, p[2] + 1, CRN.deep) end
  rustSpecks(t, 320, 0.05)
  return t
end
local function craneBase()
  local t = NI(32, 16)
  for y = 3, 13 do
    local d = math.floor((y - 3) / 3)
    for x = 6 - d, 25 + d do P(t, x, y, CRN.base) end
    P(t, 6 - d, y, CRN.hi); P(t, 25 + d, y, CRN.sh); P(t, 24 + d, y, CRN.sh)
  end
  -- turntable ring
  for x = 3, 28 do P(t, x, 0, "steel4"); P(t, x, 1, "steel3"); P(t, x, 2, "steel1") end
  for x = 3, 28 do if x % 3 == 0 then P(t, x, 1, "steel5") end end
  -- counterweight hazard band
  for y = 5, 7 do for x = 7, 24 do P(t, x, y, ((x - y) % 6 < 3) and "sand3" or "ink1") end end
  for x = 7, 24 do P(t, x, 8, CRN.deep) end
  -- access hatch + bolts
  R(t, 12, 9, 8, 4, CRN.sh); for x = 12, 19 do P(t, x, 9, CRN.deep) end; P(t, 18, 11, "olive3")
  for x = 5, 26, 3 do P(t, x, 13, "olive3") end
  -- foot plate
  for x = 1, 30 do P(t, x, 14, "steel3"); P(t, x, 15, "steel1") end
  P(t, 1, 14, "steel4")
  rustSpecks(t, 330, 0.06)
  return t
end

---------------------------------------------------------------------------------------------------
-- BAYOU QUEEN: varnished decks, red trim, moonlit white hull and cabins (ink ramps), Regime steel plates bolted on.
-- hull strake colour at composite y (rows 19-21 share one strake rhythm)
local function strake(y)
  local k = y % 4
  if k == 0 then return "ink4" elseif k == 3 then return "ink2" end
  return "ink3"
end
-- deck (row 19): planks y 0-4, shadow, red trim y 6-10, hull strakes from y 12
local function qdeckPx(x, y, v)
  if y == 0 then return (H(x, 0, 400 + v) < 0.25) and "dirt4" or "dirt5" end
  if y == 1 then return "dirt4" end
  if y == 2 then return (H(x, 2, 401 + v) < 0.2) and "dirt4" or "dirt3" end
  if y == 3 then return "dirt3" end
  if y == 4 then return "dirt2" end
  if y == 5 then return "outline" end
  if y == 6 then return "red4" end
  if y == 7 or y == 8 then return "red3" end
  if y == 9 then return "sand3" end
  if y == 10 then return "red2" end
  if y == 11 then return "red1" end
  return strake(y)
end
-- hull side rows 20-21 (composite y 0-31): strakes, red boot stripe at the waterline, red bottom under water
local QKEEL = 28
local function qhullPx(x, y, v)
  if y <= 11 then return strake(y) end
  if y == 12 then return "red3" end
  if y <= 15 then return (y == 15) and "red2" or "red3" end
  if y <= 17 then return (H(x, y, 410 + v) < 0.35) and "leaf2" or "red2" end
  return (y >= 25) and "red2" or "red3"
end
local function qdeck(kind, v)
  local t = T()
  for y = 0, 15 do for x = 0, 15 do P(t, x, y, qdeckPx(x, y, v)) end end
  local seam = ({ [0] = 13, [1] = 5 })[v] or 9
  for y = 1, 4 do P(t, seam, y, "dirt1") end
  P(t, (seam + 1) % 16, 1, "dirt5"); P(t, (seam + 2) % 16, 2, "ink4")
  -- grime runs on the hull strakes
  for x = 0, 15 do if H(x, 12, 420 + v) < 0.2 then P(t, x, 13, "ink2"); P(t, x, 14, "ink2") end end
  if v == 1 then
    -- trim bolts + a chipped spot
    for _, bx in ipairs({ 3, 11 }) do P(t, bx, 7, "red5"); P(t, bx + 1, 8, "red1") end
    P(t, 7, 7, "dirt3"); P(t, 8, 7, "dirt3"); P(t, 8, 8, "dirt2")
  end
  if kind == "l" then
    P(t, 0, 0, nil); P(t, 1, 0, "outline"); for y = 1, 15 do P(t, 0, y, "outline") end
    for y = 1, 4 do P(t, 1, y, "dirt5") end; for y = 6, 10 do P(t, 1, y, "red4") end
  elseif kind == "r" then
    P(t, 15, 0, nil); P(t, 14, 0, "outline"); for y = 1, 15 do P(t, 15, y, "outline") end
    for y = 1, 4 do P(t, 14, y, "dirt2") end; for y = 6, 10 do P(t, 14, y, "red2") end
  end
  return t
end
local function qEdge(y) if y < 6 then return 0 end; return math.floor((y - 6) * (y - 6) / 40) end
local function qhullSide(kind, v)
  local t = NI(16, 32)
  local function inHull(x, y)
    if kind == "l" then return x >= qEdge(y) end
    if kind == "r" then return x <= 15 - qEdge(y) end
    return true
  end
  for y = 0, QKEEL do for x = 0, 15 do P(t, x, y, qhullPx(x, y, v)) end end
  -- grime streaks + slime
  for x = 0, 15 do
    if H(x, 0, 430 + v) < 0.18 then for y = 1, 5 + math.floor(H(x, 1, 430 + v) * 6) do if y <= 11 and y % 4 ~= 0 then P(t, x, y, "ink2") end end end
    if H(x, 2, 431 + v) < 0.3 then P(t, x, 15, "leaf2"); P(t, x, 16, "leaf3"); P(t, x, 17, "leaf2") end
  end
  if v == 1 then
    -- mooring ring
    P(t, 4, 3, "steel3"); P(t, 5, 3, "steel2"); P(t, 3, 4, "steel3"); P(t, 6, 4, "steel1"); P(t, 3, 5, "steel2"); P(t, 6, 5, "steel1"); P(t, 4, 6, "steel1"); P(t, 5, 6, "steel1")
    P(t, 4, 4, "outline")
  elseif v == 2 then
    -- lit porthole: brass ring, warm glass
    local cx, cy = 7.5, 6
    for y = 0, 12 do for x = 2, 13 do
      local dx, dy = x - cx, y - cy
      local r = math.sqrt(dx * dx + dy * dy)
      if r <= 2.6 then
        local c = "fire3"
        if dx + dy < -1.2 then c = "fire4" end
        if dx + dy > 1.6 then c = "fire2" end
        P(t, x, y, c)
      elseif r <= 4.1 then
        P(t, x, y, (dx + dy < -1) and "sand4" or ((dx + dy > 1.5) and "dirt3" or "sand3"))
      elseif r <= 4.9 then
        P(t, x, y, "outline")
      end
    end end
    P(t, 6, 5, "fire5"); P(t, 6, 4, "fire4")
    for _, p in ipairs({ { 7, 2 }, { 11, 6 }, { 4, 6 }, { 7, 10 } }) do P(t, p[1], p[2], "dirt4") end
    -- warm light spill on the strakes below
    for x = 5, 10 do if A(t, x, 12) then P(t, x, 11, (x % 2 == 0) and "dirt3" or "ink3") end end
  elseif v == 3 then
    -- Regime armour plate bolted over the planking
    for y = 0, 11 do for x = 1, 14 do P(t, x, y, "steel3") end end
    for x = 1, 14 do P(t, x, 0, "steel4"); P(t, x, 11, "steel1"); P(t, x, 12, "outline") end
    for y = 0, 11 do P(t, 1, y, "steel4"); P(t, 14, y, "steel1"); P(t, 15, y, "outline"); P(t, 0, y, "outline") end
    for _, p in ipairs({ { 3, 2 }, { 12, 2 }, { 3, 9 }, { 12, 9 }, { 7, 2 }, { 7, 9 } }) do P(t, p[1], p[2], "steel5"); P(t, p[1] + 1, p[2] + 1, "steel1") end
    for y = 4, 8 do for x = 3, 12 do if H(x, y, 440) < 0.07 then P(t, x, y, "steel2") end end end
    for y = 10, 15 do P(t, 4, y, (y < 13) and "dirt3" or "dirt2") end
    for y = 10, 13 do P(t, 12, y, "dirt2") end
    L(t, 6, 5, 10, 6, "steel4")                                       -- scratch
  end
  if kind ~= "m" then
    for y = 0, 31 do
      local e = qEdge(y)
      for x = 0, 15 do
        local xi = (kind == "l") and x or (15 - x)
        if xi < e then P(t, x, y, nil)
        elseif xi == e and y <= QKEEL then P(t, x, y, "outline")
        elseif xi == e + 1 and y <= 17 then P(t, x, y, (kind == "l") and shift(G(t, x, y) or "ink3", 1) or shift(G(t, x, y) or "ink3", -1)) end
      end
    end
  end
  sinkHull(t, inHull, QKEEL)
  return t
end

-- bow, 2 wide x 3 tall (rows 19-21), pointing right
local function qbow()
  local W, Hh = 32, 48
  local t = NI(W, Hh)
  local function bx(y)
    if y <= 0 then return 29 end
    if y <= 5 then return 31 end
    return 31 - math.floor((y - 6) * 0.5)
  end
  local KEEL = 16 + QKEEL
  for y = 0, KEEL do
    local e = bx(y)
    for x = 0, math.min(31, e) do
      local c
      if y <= 15 then c = qdeckPx(x, y, 0) elseif y <= 47 then c = qhullPx(x, y - 16, 0) end
      P(t, x, y, c)
    end
  end
  -- plank seams
  for y = 1, 4 do P(t, 9, y, "dirt1") end; P(t, 10, 1, "dirt5")
  -- armour plate on the bow flare (rows 19-20)
  for y = 18, 27 do for x = 2, 12 do P(t, x, y, "steel3") end end
  for x = 2, 12 do P(t, x, 18, "steel4"); P(t, x, 27, "steel1"); P(t, x, 28, "outline") end
  for y = 18, 27 do P(t, 2, y, "steel4"); P(t, 12, y, "steel1"); P(t, 13, y, "outline"); P(t, 1, y, "outline") end
  for _, p in ipairs({ { 4, 20 }, { 10, 20 }, { 4, 25 }, { 10, 25 } }) do P(t, p[1], p[2], "steel5"); P(t, p[1] + 1, p[2] + 1, "steel1") end
  -- Regime chevrons on the plate
  for i = 0, 1 do L(t, 5 + i * 3, 21, 7 + i * 3, 23, "red3"); L(t, 7 + i * 3, 23, 5 + i * 3, 25, "red3"); P(t, 8 + i * 3, 23, "red1") end
  for y = 26, 30 do P(t, 6, y, (y < 29) and "dirt3" or "dirt2") end
  -- hawse pipe + anchor (moonlit iron)
  for _, p in ipairs({ { 17, 17, "steel4" }, { 18, 17, "steel3" }, { 19, 17, "steel3" }, { 16, 18, "steel3" }, { 20, 18, "steel1" },
                       { 17, 18, "outline" }, { 18, 18, "outline" }, { 19, 18, "outline" }, { 17, 19, "steel2" }, { 18, 19, "outline" }, { 19, 19, "steel1" } }) do P(t, p[1], p[2], p[3]) end
  for y = 19, 27 do P(t, 17, y, "steel3"); P(t, 18, y, "steel2"); P(t, 19, y, "outline") end
  P(t, 17, 19, "steel4")
  for x = 15, 20 do P(t, x, 21, (x < 17) and "steel3" or "steel2") end; P(t, 21, 21, "outline"); P(t, 15, 22, "outline")
  -- flukes
  for _, p in ipairs({ { 13, 25 }, { 14, 26 }, { 15, 27 }, { 16, 28 }, { 17, 28 }, { 18, 28 }, { 19, 28 }, { 20, 27 }, { 21, 26 }, { 22, 25 } }) do P(t, p[1], p[2], "steel3"); P(t, p[1], p[2] + 1, "outline") end
  P(t, 13, 24, "steel4"); P(t, 22, 24, "steel2"); P(t, 12, 25, "outline"); P(t, 23, 25, "outline")
  for y = 22, 27 do if H(17, y, 450) < 0.4 then P(t, 18, y, "dirt3") end end            -- rust on the shank
  -- grime/slime
  for x = 0, 31 do if A(t, x, 31) and H(x, 3, 451) < 0.3 then P(t, x, 31, "leaf2"); P(t, x, 32, "leaf3"); P(t, x, 33, "leaf2") end end
  -- stem: outline on the bow edge, shaded face just inside
  for y = 0, KEEL do
    local e = math.min(31, bx(y))
    P(t, e, y, "outline")
    if y >= 1 and y <= 33 and e - 1 >= 0 then P(t, e - 1, y, shift(G(t, e - 1, y) or "ink3", -1)) end
  end
  P(t, 29, 0, "outline"); P(t, 30, 0, nil); P(t, 31, 0, nil); P(t, 30, 1, "outline"); P(t, 31, 1, "outline")
  P(t, 28, 0, "outline")
  for x = 1, 27 do if G(t, x, 0) == nil then P(t, x, 0, "dirt5") end end
  -- water: row 21 (composite y 32..47)
  local function inHull(x, y) return x <= math.min(31, bx(y)) end
  sinkHull(t, inHull, KEEL, 32)
  -- bow wave foam at the stem
  local e = bx(34)
  P(t, e + 1, 34, "ink5"); P(t, e + 2, 34, "sky4"); P(t, e + 1, 33, "sky4"); P(t, e + 3, 35, "sky3"); P(t, e + 2, 35, "ink5")
  return t
end

-- one-way deck strips (top 8 px): promenade = varnished planks over a red fascia, hurricane roof = white edge
local function qstrip(kind, roof)
  local t = T()
  for x = 0, 15 do
    if roof then
      P(t, x, 0, (H(x, 0, 460) < 0.2) and "ink3" or "ink4"); P(t, x, 1, "ink3"); P(t, x, 2, "ink3"); P(t, x, 3, "ink2")
      P(t, x, 4, "red3"); P(t, x, 5, "red3"); P(t, x, 6, "red1"); P(t, x, 7, "outline")
      if H(x, 1, 461) < 0.12 then P(t, x, 1, "leaf2") end
      if x % 8 == 3 then P(t, x, 5, "red4") end
    else
      P(t, x, 0, (H(x, 0, 470) < 0.25) and "dirt4" or "dirt5"); P(t, x, 1, "dirt4"); P(t, x, 2, "dirt3"); P(t, x, 3, "dirt2")
      P(t, x, 4, "red4"); P(t, x, 5, "red3"); P(t, x, 6, "red2"); P(t, x, 7, "outline")
      if H(x, 2, 471) < 0.2 then P(t, x, 2, "dirt2") end
    end
  end
  if not roof then for y = 0, 3 do P(t, 10, y, "dirt1") end; P(t, 11, 0, "dirt5") end
  if kind == "l" then
    P(t, 0, 0, nil); P(t, 1, 0, "outline"); for y = 1, 7 do P(t, 0, y, "outline") end
    P(t, 1, 1, roof and "ink5" or "dirt5"); P(t, 1, 4, "red5")
  elseif kind == "r" then
    P(t, 15, 0, nil); P(t, 14, 0, "outline"); for y = 1, 7 do P(t, 15, y, "outline") end
    P(t, 14, 2, roof and "ink2" or "dirt2"); P(t, 14, 5, "red2")
  end
  return t
end

-- Regime steel deck plating (S metal) for gun mounts
local function qsteel(kind)
  local t = T()
  for x = 0, 15 do
    P(t, x, 0, (H(x, 0, 480) < 0.3) and "steel4" or "steel5"); P(t, x, 1, "steel4")
    P(t, x, 2, (x % 4 == 1) and "steel4" or "steel3"); P(t, x, 3, (x % 4 == 3) and "steel2" or "steel3")
    P(t, x, 4, "outline")
    P(t, x, 5, "steel4")
    for y = 6, 13 do P(t, x, y, "steel3") end
    for y = 7, 9 do P(t, x, y, ((x + y) % 6 < 3) and "fire3" or "outline") end
    P(t, x, 10, "steel2")
    P(t, x, 14, "steel1"); P(t, x, 15, "outline")
  end
  for _, rx in ipairs({ 2, 7, 12 }) do P(t, rx, 12, "steel5"); P(t, rx + 1, 13, "steel1") end
  for y = 11, 14 do if H(5, y, 481) < 0.6 then P(t, 5, y, "dirt3") end end
  if kind == "l" then
    P(t, 0, 0, nil); P(t, 1, 0, "outline"); for y = 1, 15 do P(t, 0, y, "outline"); P(t, 1, y, (y == 4) and "outline" or "steel4") end
    for y = 7, 9 do P(t, 1, y, "steel4") end
  elseif kind == "r" then
    P(t, 15, 0, nil); P(t, 14, 0, "outline"); for y = 1, 15 do P(t, 15, y, "outline"); P(t, 14, y, (y == 4) and "outline" or "steel1") end
  end
  return t
end

-- gingerbread fretwork (back): band at y 8-9 + scallops hanging to y 14, drilled holes, pendant drops
local function trimPx(x)
  local k = x % 8
  local yb = 10 + math.floor(3.6 * math.sin(math.pi * (k + 0.5) / 8))
  return k, yb
end
local function qtrim(kind)
  local t = T()
  for x = 0, 15 do
    P(t, x, 8, "ink5"); P(t, x, 9, "ink3")
    local k, yb = trimPx(x)
    for y = 10, yb do
      local c = (y == yb) and "ink3" or "ink4"
      if y == 10 and (k == 2 or k == 5) then c = "ink5" end
      P(t, x, y, c)
    end
    if (k == 3 or k == 4) and yb >= 12 then P(t, x, 11, nil) end            -- drilled hole
    if k == 0 then P(t, x, 10, "ink4"); P(t, x, 11, "ink5"); P(t, x, 12, "ink4"); P(t, x, 13, "ink3") end   -- pendant drop
  end
  if kind == "l" then
    for y = 8, 15 do P(t, 0, y, nil); P(t, 1, y, nil) end
    P(t, 2, 8, "ink4"); P(t, 2, 9, "ink3"); for y = 10, 14 do P(t, 2, y, (y == 14) and "ink2" or "ink3") end; P(t, 2, 15, "ink2")
  elseif kind == "r" then
    for y = 8, 15 do P(t, 15, y, nil); P(t, 14, y, nil) end
    P(t, 13, 8, "ink3"); P(t, 13, 9, "ink2"); for y = 10, 14 do P(t, 13, y, "ink2") end; P(t, 13, 15, "ink1")
  end
  return t
end

-- turned columns between decks (back)
local function qshaft(t, y0, y1)
  for y = y0, y1 do P(t, 6, y, "ink4"); P(t, 7, y, "ink3"); P(t, 8, y, "ink3"); P(t, 9, y, "ink2") end
end
local function qpost(part)
  local t = T()
  if part == "top" then
    -- band continues the fretwork band; capital + curved brackets
    for x = 0, 15 do P(t, x, 8, "ink5"); P(t, x, 9, "ink3") end
    qshaft(t, 10, 15)
    for x = 4, 11 do P(t, x, 10, (x < 6) and "ink4" or "ink3"); P(t, x, 11, "ink2") end
    -- brackets (quarter curves) both sides
    for i = 0, 3 do
      P(t, 5 - i, 12 - math.floor(i * i / 3), "ink3"); P(t, 10 + i, 12 - math.floor(i * i / 3), "ink2")
    end
    P(t, 1, 10, "ink3"); P(t, 14, 10, "ink2"); P(t, 4, 12, "ink3"); P(t, 11, 12, "ink2"); P(t, 5, 13, "ink3"); P(t, 10, 13, "ink2")
    P(t, 3, 11, "ink4"); P(t, 12, 11, "ink3")
  elseif part == "mid" then
    qshaft(t, 0, 15)
    for x = 5, 10 do P(t, x, 7, (x < 7) and "ink4" or "ink3"); P(t, x, 8, "ink2") end
    P(t, 6, 6, "ink3"); P(t, 9, 6, "ink2"); P(t, 6, 9, "ink3"); P(t, 9, 9, "ink2")
  else
    qshaft(t, 0, 9)
    for y = 10, 15 do for x = 4, 11 do P(t, x, y, "ink3") end; P(t, 4, y, "ink4"); P(t, 11, y, "ink2") end
    for x = 4, 11 do P(t, x, 10, "ink4"); P(t, x, 15, "ink2") end
    for x = 5, 10 do P(t, x, 13, "red2") end
    P(t, 5, 9, "ink3"); P(t, 10, 9, "ink2")
  end
  return t
end

-- balustrade (back, the row above a deck): handrail, turned balusters, bottom rail
local function qrail(post)
  local t = T()
  for x = 0, 15 do
    P(t, x, 3, "dirt4"); P(t, x, 4, "dirt2")
    P(t, x, 14, "ink3"); P(t, x, 15, "ink2")
    if x % 4 == 1 then
      for y = 5, 13 do P(t, x, y, "ink3") end
      P(t, x, 7, "ink4"); P(t, x, 11, "ink4")
      P(t, x + 1, 8, "ink2"); P(t, x - 1, 10, "ink3")
    end
  end
  if post then
    for y = 1, 15 do P(t, 6, y, "ink4"); P(t, 7, y, "ink3"); P(t, 8, y, "ink3"); P(t, 9, y, "ink2") end
    for x = 5, 10 do P(t, x, 0, (x < 7) and "ink4" or "ink3"); P(t, x, 1, "ink2") end
    P(t, 6, 0, "ink5")
    for x = 6, 9 do P(t, x, 9, "red2") end
  end
  return t
end

-- cabin walls (back): moonlit white tongue-and-groove boards, red trim. part t/m/b, kind l/m/r
local function boards(t, x, y)
  local k = x % 4
  local c = (k == 0) and "ink2" or ((k == 1) and "ink4" or "ink3")
  if k == 1 and (x * 3 + y) % 11 == 0 then c = "ink3" end
  if k ~= 0 and H(x, y, 500) < 0.05 then c = "ink2" end
  P(t, x, y, c)
end
local function qcab(part, kind)
  local t = T()
  for y = 0, 15 do for x = 0, 15 do boards(t, x, y) end end
  if part == "t" then
    for y = 0, 7 do for x = 0, 15 do P(t, x, y, ((x + y) % 2 == 0) and "ink1" or "outline") end end
    for x = 0, 15 do
      P(t, x, 8, "red3"); P(t, x, 9, "red2"); P(t, x, 10, "red1")
      P(t, x, 11, (x % 2 == 0) and "ink1" or G(t, x, 11))
      if x % 4 == 2 then P(t, x, 9, "red4") end                              -- dentils
    end
  elseif part == "b" then
    for x = 0, 15 do
      P(t, x, 4, "red3"); P(t, x, 5, "red1")
      for y = 6, 12 do P(t, x, y, "ink3") end
      P(t, x, 13, "red3"); P(t, x, 14, "red2"); P(t, x, 15, "red1")
    end
    -- raised panel
    for y = 7, 11 do for x = 2, 13 do P(t, x, y, "ink3") end end
    for x = 2, 13 do P(t, x, 7, "ink4"); P(t, x, 11, "ink2") end
    for y = 7, 11 do P(t, 2, y, "ink4"); P(t, 13, y, "ink2") end
    for x = 0, 15 do if H(x, 12, 501) < 0.3 then P(t, x, 12, "ink2") end end
  end
  if kind == "l" then
    local y0 = (part == "t") and 8 or 0
    for y = y0, 15 do P(t, 0, y, "red2"); P(t, 1, y, "red3"); P(t, 2, y, "red3"); P(t, 3, y, "red1") end
    if part == "t" then P(t, 1, 8, "red4") end
  elseif kind == "r" then
    local y0 = (part == "t") and 8 or 0
    for y = y0, 15 do P(t, 12, y, "ink2"); P(t, 13, y, "red3"); P(t, 14, y, "red2"); P(t, 15, y, "red1") end
  end
  return t
end
local function qwindow(lit)
  local t = qcab("m", "m")
  -- arched frame x 3..12, y 2..13
  for y = 2, 13 do for x = 3, 12 do
    local ok = true
    if y == 2 and (x < 5 or x > 10) then ok = false end
    if y == 3 and (x < 4 or x > 11) then ok = false end
    if ok then P(t, x, y, "red2") end
  end end
  for x = 5, 10 do P(t, x, 2, "red3") end; P(t, 4, 3, "red3"); P(t, 3, 4, "red3"); for y = 4, 12 do P(t, 3, y, "red3") end
  for y = 4, 12 do P(t, 12, y, "red1") end
  -- glass x 5..10, y 4..11 (arched)
  for y = 4, 11 do for x = 5, 10 do
    if not (y == 4 and (x == 5 or x == 10)) then
      local c
      if lit then
        c = "fire3"
        if x <= 6 and y <= 6 then c = "fire4" end
        if x >= 9 or y >= 10 then c = "fire2" end
      else
        c = ((x + y) % 5 == 0) and "sky1" or "steel1"
        if x + y == 11 or x + y == 12 then c = "sky3" end
      end
      P(t, x, y, c)
    end
  end end
  for y = 4, 11 do P(t, 8, y, lit and "dirt2" or "outline") end                  -- mullion
  for x = 5, 10 do P(t, x, 7, lit and "dirt2" or "outline") end                  -- transom bar
  if lit then
    P(t, 6, 5, "fire5")
    P(t, 5, 8, "dirt3"); P(t, 5, 9, "dirt3"); P(t, 5, 10, "dirt2"); P(t, 10, 8, "dirt2"); P(t, 10, 9, "dirt1")  -- curtains
  else
    P(t, 9, 9, "outline"); P(t, 10, 10, "outline"); P(t, 9, 10, "steel2")          -- cracked pane
  end
  -- sill + spill
  for x = 2, 13 do P(t, x, 12, "ink4"); P(t, x, 13, "ink2") end
  if lit then for x = 4, 11 do if x % 2 == 0 then P(t, x, 14, "dirt3") end end end
  return t
end
local function qdoor(top)
  local t = qcab(top and "m" or "b", "m")
  local y0, y1 = top and 1 or 0, top and 15 or 13
  for y = y0, y1 do
    P(t, 3, y, "red3"); P(t, 4, y, "red2"); P(t, 11, y, "red2"); P(t, 12, y, "red1")
    for x = 5, 10 do P(t, x, y, "dirt2") end
    P(t, 5, y, "dirt3")
  end
  if top then
    for x = 3, 12 do P(t, x, 1, "red3"); P(t, x, 0, "red1") end
    -- transom light
    for y = 2, 4 do for x = 5, 10 do P(t, x, y, (x <= 6) and "fire3" or "fire2") end end
    for x = 5, 10 do P(t, x, 5, "dirt1") end
    P(t, 7, 2, "dirt1"); P(t, 8, 2, "dirt1")
    -- upper panel
    for y = 7, 14 do P(t, 6, y, "dirt3"); P(t, 9, y, "dirt1") end
    for x = 6, 9 do P(t, x, 7, "dirt3"); P(t, x, 14, "dirt1") end
    -- Regime stencil arrow on the door
    P(t, 7, 9, "red2"); P(t, 8, 9, "red2"); P(t, 7, 10, "red2"); P(t, 8, 11, "red1")
  else
    for y = 2, 11 do P(t, 6, y, "dirt3"); P(t, 9, y, "dirt1") end
    for x = 6, 9 do P(t, x, 2, "dirt3"); P(t, x, 11, "dirt1") end
    P(t, 10, 0, "sand4"); P(t, 10, 1, "sand2")                                 -- knob
    for x = 3, 12 do P(t, x, 14, "dirt2"); P(t, x, 15, "dirt1") end           -- threshold
    P(t, 3, 14, "dirt3")
  end
  return t
end
local function qcabArmor()
  local t = qcab("m", "m")
  for y = 1, 14 do for x = 1, 14 do P(t, x, y, "steel3") end end
  for x = 1, 14 do P(t, x, 1, "steel4"); P(t, x, 14, "steel1"); P(t, x, 15, "ink1") end
  for y = 1, 14 do P(t, 1, y, "steel4"); P(t, 14, y, "steel1") end
  for _, p in ipairs({ { 3, 3 }, { 12, 3 }, { 3, 12 }, { 12, 12 }, { 8, 3 }, { 8, 12 } }) do P(t, p[1], p[2], "steel5"); P(t, p[1] + 1, p[2] + 1, "steel1") end
  for y = 5, 10 do for x = 3, 12 do if H(x, y, 510) < 0.08 then P(t, x, y, "steel2") end end end
  for y = 13, 15 do P(t, 4, y, "dirt3") end; for y = 13, 14 do P(t, 12, y, "dirt2") end
  L(t, 5, 7, 9, 9, "steel4")
  return t
end
local function qemblem()
  local img = NI(32, 32)
  -- top quarters on plain boards, bottom quarters on the wainscot (place the emblem in a cabin's m + b rows)
  img:drawImage(qcab("m", "m"), Point(0, 0)); img:drawImage(qcab("m", "m"), Point(16, 0))
  img:drawImage(qcab("b", "m"), Point(0, 16)); img:drawImage(qcab("b", "m"), Point(16, 16))
  local cx, cy = 15.5, 14
  for y = 0, 31 do for x = 0, 31 do
    local dx, dy = x - cx, y - cy
    local r = math.sqrt(dx * dx + dy * dy)
    local chip = H(x, y, 520) < 0.1
    local function paint(c)
      if chip then return end
      local u = G(img, x, y)
      if u == "ink2" or u == "red1" or u == "ink1" then c = shift(c, -1) end
      P(img, x, y, c)
    end
    if r >= 11.2 and r <= 13 and math.abs(dx) > 1.2 and math.abs(dy) > 1.2 then paint("red3") end
    local ex = dx / 10
    local lid = 1 - ex * ex
    if lid > 0 then
      local inside = math.abs(dy) <= 6 * lid
      local edge = math.abs(dy) > 6 * lid - 1.2
      if inside then
        if edge then paint("red2")
        elseif r <= 4.8 then
          local ang = math.atan(dy, dx)
          local s = (r - ang / (2 * math.pi) * 2.6) / 2.6
          local f = s - math.floor(s)
          if f < 0.5 or r < 1.2 then paint("red3") else paint("ink5") end
        else paint((dy > 2.5) and "ink4" or "ink5") end
      end
    end
  end end
  return img
end

-- smokestacks (back, 2 wide): black iron, moonlit left rim
local function stackShade(x)
  local f = (x - 5) / 21
  if f < 0.06 then return "ink3" elseif f < 0.2 then return "ink2" elseif f < 0.62 then return "ink1" elseif f < 0.85 then return "outline" end
  return "outline"
end
local function stackBody(t, y0, y1, band)
  for y = y0, y1 do for x = 5, 26 do
    local c = stackShade(x)
    local f = (x - 5) / 21
    if f >= 0.2 and f < 0.3 and (x + y) % 2 == 0 then c = "ink2" end
    if f >= 0.62 and f < 0.75 and (x + y) % 2 == 0 then c = "ink1" end
    if band then
      c = (f < 0.08) and "red4" or (f < 0.3 and "red3" or (f < 0.66 and "red2" or "red1"))
      if f >= 0.3 and f < 0.38 and (x + y) % 2 == 0 then c = "red3" end
    end
    P(t, x, y, c)
  end end
end
local function stack(part)
  local t = NI(32, 16)
  if part == "body" then
    stackBody(t, 0, 15)
    for x = 5, 26 do if x % 3 == 1 then P(t, x, 7, (x < 10) and "ink4" or "ink2") end end   -- riveted seam ring
    for x = 5, 26 do P(t, x, 8, shift(G(t, x, 8) or "ink1", -1)) end
    for k = 1, 3 do local x = 8 + math.floor(H(k, 0, 530) * 16); for y = 9, 15 do if H(x, y, 531) < 0.7 then P(t, x, y, "dirt1") end end end
  elseif part == "band" then
    stackBody(t, 0, 15)
    stackBody(t, 4, 11, true)
    for x = 5, 26 do P(t, x, 3, (x < 9) and "ink3" or "outline"); P(t, x, 12, "outline") end
    for x = 5, 26 do if x % 3 == 2 then P(t, x, 5, (x < 12) and "red5" or "red3"); P(t, x, 10, "red1") end end
  elseif part == "base" then
    stackBody(t, 0, 15)
    for y = 9, 15 do
      local d = math.min(3, y - 9)
      for x = 5 - d, 26 + d do
        local c = stackShade(math.max(5, math.min(26, x)))
        if y == 9 + d then c = (x < 12) and "ink4" or "ink2" end
        P(t, x, y, c)
      end
    end
    for x = 2, 29 do P(t, x, 15, "outline") end
    P(t, 3, 12, "steel3"); P(t, 3, 13, "steel1"); P(t, 28, 12, "steel2"); P(t, 28, 13, "outline")   -- guy eyes
  elseif part == "crown" then
    stackBody(t, 11, 15)
    -- flare
    for y = 6, 10 do
      local d = math.floor((10 - y) * 0.8 + 0.5)
      for x = 5 - d, 26 + d do P(t, x, y, stackShade(math.max(5, math.min(26, x)))) end
      P(t, 5 - d, y, "ink3")
    end
    for x = 1, 30 do P(t, x, 6, (x < 8) and "ink4" or "ink2") end
    for x = 2, 29 do P(t, x, 7, (x < 6) and "ink3" or "ink1") end
    -- feathered points: five leaf-shaped plumes, pierced, gilt tips
    local pts = { 4, 10, 16, 22, 28 }
    for _, px in ipairs(pts) do
      for y = 0, 5 do
        local hw = ({ [0] = 0, [1] = 1, [2] = 2, [3] = 2, [4] = 2, [5] = 1 })[y]
        for x = px - hw, px + hw do
          local c = stackShade(math.max(5, math.min(26, x)))
          if x == px - hw then c = (px < 14) and "ink4" or "ink3" end
          if x == px + hw and hw > 0 then c = "outline" end
          P(t, x, y, c)
        end
      end
      P(t, px, 0, (px < 14) and "sand4" or "sand3")
      P(t, px, 3, "outline")
    end
  end
  return t
end

-- paddlewheel housing (back): arched red wooden box, sunburst rays, gilt line; open dark middle for the wheel prop
local PHW = 48
local function phouseImg()
  local t = NI(PHW, 32)
  local cx, cy = 23.5, 16
  local function outer(x, y) local dx, dy = (x - cx) / 24.5, (y - cy) / 15.5; return (y >= 16) or (dx * dx + dy * dy <= 1) end
  local function inner(x, y)
    if x < 6 or x > 41 then return false end
    if y >= 16 then return true end
    local dx, dy = (x - cx) / 18.5, (y - cy) / 10; return dx * dx + dy * dy <= 1
  end
  for y = 0, 31 do for x = 0, PHW - 1 do
    if outer(x, y) and not inner(x, y) then
      local c
      if y < 16 or (x >= 6 and x <= 41) then
        -- sunburst rays radiating from the hub
        local ang = math.atan(y - 22, x - cx)
        local k = math.floor((ang + math.pi) / (math.pi / 14))
        c = (k % 2 == 0) and "red3" or "red2"
      else
        -- straight side posts: vertical boards
        local lx = (x < 6) and x or (x - 42)
        c = (lx % 3 == 0) and "red1" or ((x < 6) and "red3" or "red2")
        if lx == 1 and x < 6 then c = "red4" end
      end
      P(t, x, y, c)
    elseif inner(x, y) then
      P(t, x, y, nil)                                                         -- filled with phouse_dark below
    end
  end end
  -- outer rim: lighter lit edge top-left, darker right; gilt line just inside the rim
  for y = 0, 31 do for x = 0, PHW - 1 do
    if A(t, x, y) then
      local up = not A(t, x, y - 1) and (y > 0) and not inner(x, y - 1)
      local lf = (x == 0) or (not A(t, x - 1, y) and not inner(x - 1, y))
      local rt = (x == PHW - 1) or (not A(t, x + 1, y) and not inner(x + 1, y))
      if up then P(t, x, y, (x < cx) and "red4" or "red3") end
      if lf then P(t, x, y, "red4") end
      if rt then P(t, x, y, "red1") end
    end
  end end
  for y = 1, 31 do for x = 1, PHW - 2 do
    if outer(x, y) and not inner(x, y) then
      local dx, dy = (x - cx) / 23, (y - cy) / 14
      local d = dx * dx + dy * dy
      if y < 16 and d > 0.86 and d <= 1.0 and A(t, x, y) and (G(t, x, y) == "red2" or G(t, x, y) == "red3") then P(t, x, y, "sand3") end
      if y >= 14 and (x == 2 or x == 45) then P(t, x, y, "sand3") end
    end
  end end
  -- inner edge (dark keyline into the wheel well) + bolts
  for y = 0, 31 do for x = 0, PHW - 1 do
    if A(t, x, y) and (inner(x + 1, y) or inner(x - 1, y) or inner(x, y + 1)) then P(t, x, y, "red1") end
  end end
  for _, p in ipairs({ { 3, 20 }, { 3, 27 }, { 44, 20 }, { 44, 27 } }) do P(t, p[1], p[2], "sand4"); P(t, p[1] + 1, p[2] + 1, "red1") end
  -- hub boss of the sunburst (top-centre medallion)
  for y = 1, 6 do for x = 20, 27 do
    local dx, dy = x - 23.5, (y - 4) * 1.2
    if dx * dx + dy * dy <= 10 and A(t, x, y) then P(t, x, y, (dx + dy < -1) and "sand4" or ((dx + dy > 1.5) and "dirt3" or "sand3")) end
  end end
  P(t, 23, 4, "red2"); P(t, 24, 4, "red1")
  return t, inner
end
local function phouseDark(t, ox, oy, mask)
  for y = 0, 15 do for x = 0, 15 do
    if mask == nil or mask(x, y) then
      local c = "outline"
      if (x + ox) % 6 == 0 then c = "ink1" end
      if (x + ox) % 6 == 1 and (y + oy) % 2 == 0 then c = "ink1" end
      if H(x + ox, y + oy, 540) < 0.05 then c = "steel1" end
      if (x + ox) % 9 == 4 and H(x, y + oy, 541) < 0.5 then c = "steel1" end      -- wet drips
      P(t, x, y, c)
    end
  end end
end

-- boiler-room passage interior (back): dark riveted iron, warm furnace glow reflected on rivets and pipes
local function boilerWall(v)
  local t = T()
  for y = 0, 15 do for x = 0, 15 do
    local c = "ink1"
    if (x + y * 3) % 7 == 0 and H(x, y, 550) < 0.5 then c = "outline" end
    if H(x, y, 551 + v) < 0.012 then c = "fire1" end
    P(t, x, y, c)
  end end
  for x = 0, 15 do P(t, x, 7, "outline"); P(t, x, 8, "steel1") end
  for y = 0, 15 do P(t, 15, y, "outline"); P(t, 0, y, "steel1") end
  for _, p in ipairs({ { 3, 6 }, { 7, 6 }, { 11, 6 }, { 3, 9 }, { 7, 9 }, { 11, 9 }, { 13, 2 }, { 13, 13 }, { 2, 2 }, { 2, 13 } }) do
    P(t, p[1], p[2], "ink2"); P(t, p[1], p[2] + 1, "fire1")
  end
  if v == 1 then
    -- glowing vent louvre
    for y = 2, 12 do for x = 3, 12 do
      local c = (y % 2 == 0) and "outline" or "fire2"
      if y % 2 == 1 and x >= 5 and x <= 10 and y >= 5 and y <= 9 then c = "fire3" end
      if y % 2 == 1 and (x == 3 or x == 12) then c = "fire1" end
      P(t, x, y, c)
    end end
    for x = 2, 13 do P(t, x, 1, "steel2"); P(t, x, 13, "fire1") end
    for y = 1, 13 do P(t, 2, y, "steel2"); P(t, 13, y, "steel1") end
    P(t, 2, 1, "steel3")
  end
  return t
end
local function boilerPipe()
  local t = boilerWall(0)
  for x = 0, 15 do
    P(t, x, 4, "outline"); P(t, x, 5, "steel3"); P(t, x, 6, "steel3"); P(t, x, 7, "steel2"); P(t, x, 8, "steel2"); P(t, x, 9, "steel1"); P(t, x, 10, "fire2"); P(t, x, 11, "outline")
    if x % 5 == 0 then P(t, x, 5, "steel4") end
  end
  for y = 3, 12 do P(t, 7, y, "steel4"); P(t, 8, y, "steel2"); P(t, 9, y, "steel1") end
  P(t, 7, 3, "steel5"); P(t, 8, 12, "fire2"); P(t, 9, 12, "fire1"); P(t, 8, 4, "steel3"); P(t, 8, 11, "steel3")
  for y = 12, 15 do P(t, 12, y, "steel1") end; P(t, 11, 15, "steel2"); P(t, 13, 15, "outline")   -- hanger
  return t
end
local function boilerGauge()
  local t = boilerWall(0)
  for y = 0, 3 do P(t, 7, y, "steel3"); P(t, 8, y, "steel1") end
  local cx, cy = 7.5, 8.5
  for y = 3, 14 do for x = 2, 13 do
    local dx, dy = x - cx, y - cy
    local r = math.sqrt(dx * dx + dy * dy)
    if r <= 3.4 then P(t, x, y, "ink4")
    elseif r <= 4.6 then P(t, x, y, (dx + dy < -1) and "sand4" or ((dx + dy > 1.5) and "dirt3" or "sand3"))
    elseif r <= 5.3 then P(t, x, y, "outline") end
  end end
  -- danger arc, ticks, needle in the red
  P(t, 10, 7, "red3"); P(t, 10, 8, "red3"); P(t, 9, 6, "red3")
  P(t, 5, 8, "ink2"); P(t, 6, 6, "ink2"); P(t, 8, 6, "ink2"); P(t, 5, 10, "ink2")
  P(t, 7, 9, "outline"); P(t, 8, 8, "red4"); P(t, 9, 7, "red4")
  P(t, 6, 7, "ink5")
  P(t, 7, 13, "fire2"); P(t, 8, 13, "fire2")
  return t
end
local function furnaceCasing(t, y0, y1, roundTop)
  for y = y0, y1 do for x = 1, 14 do P(t, x, y, "steel1") end; P(t, 1, y, "ink2"); P(t, 14, y, "outline"); P(t, 13, y, "ink1") end
  if roundTop then
    for x = 1, 14 do P(t, x, y0, "ink2") end
    P(t, 1, y0, nil); P(t, 14, y0, nil); P(t, 2, y0, "ink2"); P(t, 13, y0, "outline")
    for x = 3, 12 do P(t, x, y0 + 1, (x < 6) and "ink3" or "ink2") end
  end
end
local function furnaceTop()
  local t = boilerWall(0)
  furnaceCasing(t, 2, 15, true)
  for _, p in ipairs({ { 3, 4 }, { 12, 4 }, { 3, 14 }, { 12, 14 } }) do P(t, p[1], p[2], "ink3"); P(t, p[1] + 1, p[2] + 1, "fire1") end
  -- closed fire door with glowing air slots
  for y = 5, 14 do for x = 4, 11 do P(t, x, y, "steel2") end end
  for x = 4, 11 do P(t, x, 5, "steel3"); P(t, x, 14, "outline") end
  for y = 5, 14 do P(t, 4, y, "steel3"); P(t, 11, y, "steel1") end
  for _, y in ipairs({ 7, 9, 11 }) do for x = 6, 9 do P(t, x, y, (x == 6 or x == 9) and "fire2" or "fire4") end; for x = 6, 9 do P(t, x, y + 1, "steel1") end end
  P(t, 3, 6, "steel3"); P(t, 3, 12, "steel3")                                -- hinges
  P(t, 10, 10, "steel4"); P(t, 10, 11, "steel1")                             -- latch
  return t
end
local function furnaceBottom()
  local t = boilerWall(0)
  furnaceCasing(t, 0, 13, false)
  -- ash-pit door with a glowing slot
  for y = 3, 10 do for x = 4, 11 do P(t, x, y, "steel2") end end
  for x = 4, 11 do P(t, x, 3, "steel3"); P(t, x, 10, "outline") end
  for y = 3, 10 do P(t, 4, y, "steel3"); P(t, 11, y, "steel1") end
  for x = 5, 10 do P(t, x, 6, "fire2"); P(t, x, 7, "fire1") end; P(t, 7, 6, "fire3"); P(t, 8, 6, "fire3")
  P(t, 9, 4, "steel4")
  -- floor plate and ember glow on the floor
  for x = 0, 15 do P(t, x, 14, "steel2"); P(t, x, 15, "outline") end
  for x = 4, 11 do P(t, x, 14, (x % 2 == 0) and "fire1" or "steel2") end
  for _, p in ipairs({ { 3, 1 }, { 12, 1 }, { 3, 12 }, { 12, 12 } }) do P(t, p[1], p[2], "ink3"); P(t, p[1] + 1, p[2] + 1, "fire1") end
  return t
end
-- open furnace mouth, flickering (drop-in replacement for boiler_furnace_t)
local function furnaceGlow(f)
  local t = boilerWall(0)
  furnaceCasing(t, 2, 15, true)
  for _, p in ipairs({ { 3, 4 }, { 12, 4 }, { 3, 14 }, { 12, 14 } }) do P(t, p[1], p[2], "ink3"); P(t, p[1] + 1, p[2] + 1, (f == 1) and "fire2" or "fire1") end
  -- mouth
  for y = 5, 14 do for x = 4, 11 do P(t, x, y, (y < 8) and "fire1" or "fire2") end end
  for x = 4, 11 do P(t, x, 5, "outline") end
  -- coal bed
  for x = 4, 11 do
    local h = H(x, 13, 560 + f)
    P(t, x, 13, (h < 0.3) and "fire5" or ((h < 0.7) and "fire4" or "fire3"))
    P(t, x, 14, (H(x, 14, 561 + f) < 0.5) and "dirt1" or "fire2")
  end
  -- flame tongues
  for x = 4, 11 do
    local hgt = 2 + math.floor(H(x, f, 562) * 5)
    for k = 0, hgt - 1 do
      local y = 12 - k
      local c = (k == 0) and "fire5" or ((k < hgt * 0.5) and "fire4" or ((k < hgt - 1) and "fire3" or "fire2"))
      P(t, x, y, c)
    end
  end
  if f == 2 then P(t, 7, 6, "fire3"); P(t, 8, 7, "fire2") end
  -- door swung open on its hinges (edge-on slab at the left)
  for y = 5, 14 do P(t, 2, y, "steel2"); P(t, 3, y, "steel3") end
  -- glow on the casing lip around the mouth
  for x = 4, 11 do P(t, x, 15, (f == 1) and "fire3" or "fire2") end
  for y = 6, 14 do P(t, 12, y, (f == 0) and "fire1" or "fire2") end
  return t
end

---------------------------------------------------------------------------------------------------
-- LAYOUT
-- Row 0: river, barge deck/hull/sub, railing, bollard, tow rope, gangplank, cargo net
local rt, rb = {}, {}
for f = 0, 3 do rt[f] = put(f, 0, "river_top_f" .. f, riverTop(f), WATER) end
for f = 0, 3 do rb[f] = put(4 + f, 0, "river_body_f" .. f, riverBody(f), WATER) end
put(8, 0, "river_deep", riverDeep(), WATER)
byName["river_top_f0"].anim = { { id = rt[0], ms = 150 }, { id = rt[1], ms = 150 }, { id = rt[2], ms = 150 }, { id = rt[3], ms = 150 } }
byName["river_body_f0"].anim = { { id = rb[0], ms = 200 }, { id = rb[1], ms = 200 }, { id = rb[2], ms = 200 }, { id = rb[3], ms = 200 } }

put(9, 0, "bdeck_l", bdeck("l", 0), MW)
put(10, 0, "bdeck_m", bdeck("m", 0), MW)
put(11, 0, "bdeck_m2", bdeck("m", 1), MW)
put(12, 0, "bdeck_m3", bdeck("m", 2), MW)
put(13, 0, "bdeck_r", bdeck("r", 0), MW)
do
  local sl, sm, sm2, st, sr = bargeSide("l", 0), bargeSide("m", 0), bargeSide("m", 1), bargeSide("m", 2), bargeSide("r", 0)
  put(14, 0, "bhull_l", sub(sl, 0, 0), MW)
  put(15, 0, "bhull_m", sub(sm, 0, 0), MW)
  put(16, 0, "bhull_m2", sub(sm2, 0, 0), MW)
  put(17, 0, "bhull_tire", sub(st, 0, 0), MW)
  put(18, 0, "bhull_r", sub(sr, 0, 0), MW)
  put(19, 0, "bhull_sub_l", sub(sl, 0, 1), WATER)
  put(20, 0, "bhull_sub_m", sub(sm, 0, 1), WATER)
  put(21, 0, "bhull_sub_r", sub(sr, 0, 1), WATER)
end
put(22, 0, "brail_m", brail(false), {})
put(23, 0, "brail_post", brail(true), {})
put(24, 0, "bollard", bollard(), {})
put(25, 0, "tow_rope", towRope(), {})
put(26, 0, "gplank_l", gplank("l"), OWW)
put(27, 0, "gplank_m", gplank("m"), OWW)
put(28, 0, "gplank_r", gplank("r"), OWW)
put(29, 0, "cnet_top", cnet("top"), {})
put(30, 0, "cnet_a", cnet("a"), {})
put(31, 0, "cnet_b", cnet("b"), {})

-- Rows 1-2: fuel tank, containers, crane
do
  local ft = fuelTank()
  local nm = { "tl", "tm", "tm2", "tr" }
  local nb = { "bl", "bm", "bm2", "br" }
  for i = 0, 3 do put(i, 1, "ftank_" .. nm[i + 1], sub(ft, i, 0), {}); put(i, 2, "ftank_" .. nb[i + 1], sub(ft, i, 1), {}) end
end
do
  local c0 = { cr = 4, cs = 9, co = 14 }
  for _, cn in ipairs({ "cr", "cs", "co" }) do
    local col = c0[cn]
    local parts = { { "l", 0, "l" }, { "m", 0, "m" }, { "m", 1, "m2" }, { "r", 0, "r" } }
    for i, p in ipairs(parts) do
      local img = container(cn, p[1], p[2])
      put(col + i - 1, 1, cn .. "_t" .. p[3], sub(img, 0, 0), MW)
      put(col + i - 1, 2, cn .. "_b" .. p[3], sub(img, 0, 1), MW)
    end
    local st = container(cn, "m", 0)
    eyeStencil(st, 7.5, 15.5, 7.4, 5.6, 3.6, 2.3, "sand2", 270 + col)
    put(col + 4, 1, cn .. "_stencil_t", sub(st, 0, 0), MW)
    put(col + 4, 2, cn .. "_stencil_b", sub(st, 0, 1), MW)
  end
end
put(19, 1, "crane_mast", craneMast(false), {})
put(20, 1, "crane_mast_top", craneMast(true), {})
put(21, 1, "crane_boom_l", craneBoom("l"), {})
put(22, 1, "crane_boom_m", craneBoom("m"), {})
put(23, 1, "crane_boom_r", craneBoom("r"), {})
do
  local cab = craneCab()
  put(24, 1, "crane_cab_tl", sub(cab, 0, 0), {}); put(25, 1, "crane_cab_tr", sub(cab, 1, 0), {})
  put(24, 2, "crane_cab_bl", sub(cab, 0, 1), {}); put(25, 2, "crane_cab_br", sub(cab, 1, 1), {})
  local base = craneBase()
  put(19, 2, "crane_base_l", sub(base, 0, 0), {}); put(20, 2, "crane_base_r", sub(base, 1, 0), {})
end

-- Row 3: QUEEN decks, hull, bow (cols 13-14, rows 3-5), strips, steel, posts, rails
put(0, 3, "qdeck_l", qdeck("l", 0), WD)
put(1, 3, "qdeck_m", qdeck("m", 0), WD)
put(2, 3, "qdeck_m2", qdeck("m", 1), WD)
put(3, 3, "qdeck_r", qdeck("r", 0), WD)
do
  local hl, hm, hm2, hp, hr, ha = qhullSide("l", 0), qhullSide("m", 0), qhullSide("m", 1), qhullSide("m", 2), qhullSide("r", 0), qhullSide("m", 3)
  put(4, 3, "qhull_l", sub(hl, 0, 0), WD)
  put(5, 3, "qhull_m", sub(hm, 0, 0), WD)
  put(6, 3, "qhull_m2", sub(hm2, 0, 0), WD)
  put(7, 3, "qhull_port", sub(hp, 0, 0), WD)
  put(8, 3, "qhull_r", sub(hr, 0, 0), WD)
  put(9, 3, "qhull_armor", sub(ha, 0, 0), WD)
  put(10, 3, "qhull_sub_l", sub(hl, 0, 1), WATER)
  put(11, 3, "qhull_sub_m", sub(hm, 0, 1), WATER)
  put(12, 3, "qhull_sub_r", sub(hr, 0, 1), WATER)
end
do
  local b = qbow()
  local props = { [0] = WD, [1] = WD, [2] = WATER }
  for r = 0, 2 do for c = 0, 1 do put(13 + c, 3 + r, "qbow_" .. r .. c, sub(b, c, r), props[r]) end end
end
put(15, 3, "qprom_l", qstrip("l", false), OWW)
put(16, 3, "qprom_m", qstrip("m", false), OWW)
put(17, 3, "qprom_r", qstrip("r", false), OWW)
put(18, 3, "qtrim_l", qtrim("l"), {})
put(19, 3, "qtrim_m", qtrim("m"), {})
put(20, 3, "qtrim_r", qtrim("r"), {})
put(21, 3, "qroof_l", qstrip("l", true), OWW)
put(22, 3, "qroof_m", qstrip("m", true), OWW)
put(23, 3, "qroof_r", qstrip("r", true), OWW)
put(24, 3, "qsteel_l", qsteel("l"), MW)
put(25, 3, "qsteel_m", qsteel("m"), MW)
put(26, 3, "qsteel_r", qsteel("r"), MW)
put(27, 3, "qpost_top", qpost("top"), {})
put(28, 3, "qpost_mid", qpost("mid"), {})
put(29, 3, "qpost_base", qpost("base"), {})
put(30, 3, "qrail_m", qrail(false), {})
put(31, 3, "qrail_post", qrail(true), {})

-- Rows 4-5: cabins, windows, doors, emblem, stacks, paddle housing, boiler room
do
  local parts = { "t", "m", "b" }
  local kinds = { "l", "m", "r" }
  local c = 0
  for _, p in ipairs(parts) do for _, k in ipairs(kinds) do
    put(c, 4, "qcab_" .. p .. k, qcab(p, k), {}); c = c + 1
  end end
end
put(9, 4, "qcab_win_lit", qwindow(true), {})
put(10, 4, "qcab_win_dark", qwindow(false), {})
put(11, 4, "qcab_door_t", qdoor(true), {})
put(11, 5, "qcab_door_b", qdoor(false), {})
put(12, 4, "qcab_armor", qcabArmor(), {})
do
  local e = qemblem()
  put(15, 4, "qcab_emblem_tl", sub(e, 0, 0), {}); put(16, 4, "qcab_emblem_tr", sub(e, 1, 0), {})
  put(15, 5, "qcab_emblem_bl", sub(e, 0, 1), {}); put(16, 5, "qcab_emblem_br", sub(e, 1, 1), {})
end
do
  local cr, bd, bn, bs = stack("crown"), stack("body"), stack("band"), stack("base")
  put(17, 4, "stack_crown_l", sub(cr, 0, 0), {}); put(18, 4, "stack_crown_r", sub(cr, 1, 0), {})
  put(19, 4, "stack_l", sub(bd, 0, 0), {}); put(20, 4, "stack_r", sub(bd, 1, 0), {})
  put(17, 5, "stack_band_l", sub(bn, 0, 0), {}); put(18, 5, "stack_band_r", sub(bn, 1, 0), {})
  put(19, 5, "stack_base_l", sub(bs, 0, 0), {}); put(20, 5, "stack_base_r", sub(bs, 1, 0), {})
end
do
  local ph, inner = phouseImg()
  -- fill the open middle of the frame tiles with the same dark interior as phouse_dark
  local full = copy(ph)
  for y = 0, 31 do for x = 0, PHW - 1 do
    if inner(x, y) then
      local c = "outline"
      if (x % 16) % 6 == 0 then c = "ink1" end
      if (x % 16) % 6 == 1 and (y % 16) % 2 == 0 then c = "ink1" end
      if H(x % 16, y % 16, 540) < 0.05 then c = "steel1" end
      if (x % 16) % 9 == 4 and H(x % 16, y % 16, 541) < 0.5 then c = "steel1" end
      P(full, x, y, c)
    end
  end end
  put(21, 4, "phouse_tl", sub(full, 0, 0), {}); put(22, 4, "phouse_tm", sub(full, 1, 0), {}); put(23, 4, "phouse_tr", sub(full, 2, 0), {})
  put(21, 5, "phouse_ml", sub(full, 0, 1), {}); put(23, 5, "phouse_mr", sub(full, 2, 1), {})
  local d = T(); phouseDark(d, 0, 0); put(22, 5, "phouse_dark", d, {})
end
put(24, 4, "boiler_m", boilerWall(0), {})
put(25, 4, "boiler_m2", boilerWall(1), {})
put(26, 4, "boiler_pipe_h", boilerPipe(), {})
put(27, 4, "boiler_gauge", boilerGauge(), {})
put(28, 4, "boiler_furnace_t", furnaceTop(), {})
put(28, 5, "boiler_furnace_b", furnaceBottom(), {})
do
  local g = {}
  for f = 0, 2 do g[f] = put(24 + f, 5, "boiler_glow_f" .. f, furnaceGlow(f), {}) end
  byName["boiler_glow_f0"].anim = { { id = g[0], ms = 140 }, { id = g[1], ms = 140 }, { id = g[2], ms = 140 } }
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
spr:saveAs(ROOT .. "/art-src/tiles/m2_boat.aseprite")
spr:saveCopyAs(ROOT .. "/public/assets/tiles/m2_boat.png")
spr:close()

table.sort(manifest.tiles, function(a, b) return a.id < b.id end)
local f = io.open(ROOT .. "/art-src/tiles/m2_boat_tiles.json", "w")
f:write(json.encode(manifest))
f:close()
print("built m2_boat tileset (" .. #manifest.tiles .. " tiles, " .. SHEET.width .. "x" .. SHEET.height .. ")")
