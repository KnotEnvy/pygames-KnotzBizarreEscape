-- Mission 1 Part III tileset ("MOOSE LAKE"): lake ice, cracking ice, floes, lake decor, Project ANTLER lab
-- wall decorations and lab deck. 16x16 tiles, 32 columns, one image, 0 margin/spacing.
-- Used together with stage1 (terrain, water, fences, generic decor), so nothing here duplicates stage1.
-- Build: bash tools/build-art.sh art-src/tiles/m1_lake.lua
-- Writes: art-src/tiles/m1_lake.aseprite (source), public/assets/tiles/m1_lake.png (tileset image),
--         art-src/tiles/m1_lake_tiles.json (manifest: name -> local id, properties, animations).
--
-- Geometry: the lake surface (ice sheet top) is map row 21; under-ice water rows 22-23; open water uses
-- stage1 water_top_* at row 21; floes sit on row 20 (slab top at y=7 of the tile = 9 px above the lake line).
-- Cracking ice runtime sequence: crack_m -> crack_f1 -> crack_f2 -> crack_f3 -> stage1 water_top (and back).
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local TS, COLS, ROWS = 16, 32, 3
local SHEET = Image(TS * COLS, TS * ROWS, ColorMode.RGB)
local CLEAR = app.pixelColor.rgba(0, 0, 0, 0)

local manifest = { tilewidth = TS, columns = COLS, rows = ROWS, image = "m1_lake.png", tiles = {} }
local byName = {}

---------------------------------------------------------------------------------------------------
-- helpers (same as stage1.lua)
local function H(x, y, s)
  local h = (math.floor(x) * 374761393 + math.floor(y) * 668265263 + math.floor(s or 0) * 1442695041) & 0xffffffff
  h = ((h ~ (h >> 13)) * 1274126177) & 0xffffffff
  h = h ~ (h >> 16)
  return h / 4294967296
end
local function T() return Image(TS, TS, ColorMode.RGB) end
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
-- like L but calls fn(x, y) per pixel
local function LF(x0, y0, x1, y1, fn)
  local dx, dy = math.abs(x1 - x0), -math.abs(y1 - y0)
  local sx, sy = x0 < x1 and 1 or -1, y0 < y1 and 1 or -1
  local err = dx + dy
  while true do
    fn(x0, y0)
    if x0 == x1 and y0 == y1 then break end
    local e2 = 2 * err
    if e2 >= dy then err = err + dy; x0 = x0 + sx end
    if e2 <= dx then err = err + dx; y0 = y0 + sy end
  end
end
local REV = {}
for n, c in pairs(K.PAL) do REV[app.pixelColor.rgba(c[1], c[2], c[3], 255)] = n end
local function G(t, x, y) -- palette name at x,y (nil if transparent)
  if not A(t, x, y) then return nil end
  return REV[t:getPixel(x, y)]
end
local function mirror(t)
  local o = T()
  for y = 0, TS - 1 do for x = 0, TS - 1 do
    local p = t:getPixel(x, y)
    if app.pixelColor.rgbaA(p) > 0 then o:drawPixel(TS - 1 - x, y, p) end
  end end
  return o
end
-- selective outline in a given color (transparent pixels 4-adjacent to opaque ones)
local function outline(t, c, skipBottom)
  local marks = {}
  for y = 0, TS - 1 do for x = 0, TS - 1 do
    if not A(t, x, y) and (A(t, x - 1, y) or A(t, x + 1, y) or A(t, x, y + 1) or A(t, x, y - 1)) then
      if not (skipBottom and y == TS - 1) then marks[#marks + 1] = { x, y } end
    end
  end end
  for _, m in ipairs(marks) do P(t, m[1], m[2], c) end
end

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

-- stage1 tiles (for the background concrete the lab decorations are baked onto)
local S1 = json.decode(io.open(ROOT .. "/art-src/tiles/stage1_tiles.json"):read("a"))
local S1ID = {}
for _, t in ipairs(S1.tiles) do S1ID[t.name] = t.id end
local S1IMG = Image{ fromFile = ROOT .. "/public/assets/tiles/stage1.png" }
local function s1tile(name)
  local id = assert(S1ID[name], "no stage1 tile " .. name)
  local t = T()
  for y = 0, TS - 1 do for x = 0, TS - 1 do
    local p = S1IMG:getPixel((id % S1.columns) * TS + x, (id // S1.columns) * TS + y)
    if app.pixelColor.rgbaA(p) > 0 then
      t:drawPixel(x, y, app.pixelColor.rgba(app.pixelColor.rgbaR(p), app.pixelColor.rgbaG(p), app.pixelColor.rgbaB(p), 255))
    end
  end end
  return t
end

---------------------------------------------------------------------------------------------------
-- ICE SHEET. Side view of thick lake ice: glossy white/sky5 top, translucent blue body with diagonal glints
-- and pale strata, darkening to sky1 at the underside where the water is.
local ICE = { collides = true, material = "ice" }

local GLINTS = {
  [0] = { { 3, 9, 5 }, { 11, 7, 3 } },
  [1] = { { 7, 10, 6 }, { 1, 6, 3 }, { 13, 11, 3 } },
  [2] = { { 2, 8, 3 }, { 9, 9, 5 } },
  [3] = { { 5, 10, 4 }, { 12, 8, 4 } },
}
local DUST = { [0] = { 9, 5 }, [1] = nil, [2] = { 2, 6 }, [3] = { 6, 4 } } -- snow dusting patch {x0, width}

local function glint(t, gx, gy, len)
  for k = 0, len - 1 do P(t, gx + k, gy - k, (k == len - 1) and "white" or "sky5") end
  for k = 0, len - 3 do P(t, gx + k + 2, gy - k, "sky4") end -- fainter parallel streak
end

local function iceBody(t, v)
  for y = 0, TS - 1 do for x = 0, TS - 1 do
    local c
    if y <= 4 then c = "sky4"
    elseif y == 5 then c = ((x + v) % 2 == 0) and "sky4" or "sky3"
    elseif y <= 10 then c = "sky3"
    elseif y == 11 then c = ((x + v) % 2 == 0) and "sky3" or "sky2"
    elseif y <= 13 then c = "sky2"
    elseif y == 14 then c = ((x + v) % 3 == 0) and "sky2" or "sky1"
    else c = "sky1" end
    P(t, x, y, c)
  end end
  -- one pale stratum (frozen layer) on some variants
  if v == 1 or v == 3 then
    local sy, sx = 8 + v % 2, 2 + v * 2
    for x = sx, sx + 3 do P(t, x, sy, "sky4") end
  end
  -- air bubbles in the lower body
  for k = 0, 1 do
    local bx, by = 2 + math.floor(H(k, 5, v + 30) * 12), 11 + math.floor(H(k, 6, v + 30) * 2)
    P(t, bx, by, "sky4"); P(t, bx, by + 1, "sky1")
  end
  for _, g in ipairs(GLINTS[v]) do glint(t, g[1], g[2], g[3]) end
  -- glossy top surface
  for x = 0, TS - 1 do
    P(t, x, 0, (H(x, 0, v + 300) < 0.18) and "sky5" or "white")
    P(t, x, 1, ((x + v) % 4 == 0) and "white" or "sky5")
    if (x + v * 3) % 7 == 0 then P(t, x, 2, "sky5") end
  end
  -- thin snow dusting
  local d = DUST[v]
  if d then
    for i = 0, d[2] - 1 do
      local x = d[1] + i
      P(t, x, 0, "white"); P(t, x, 1, (i == 0 or i == d[2] - 1) and "ink6" or "white")
      if i > 0 and i < d[2] - 1 then P(t, x, 2, (i % 2 == 0) and "ink5" or "ink6") end
    end
  end
end
local function iceTile(v) local t = T(); iceBody(t, v); return t end

-- Broken chunky edge facing open water. Drawn for the left side ("l": lit face), mirrored for "r" (shadowed).
-- FACE[y] = first ice column on row y. Above the waterline (y<4) the outside is transparent with an outline;
-- below it the gap is filled with water matching stage1 water_top under its crest.
local FACE = { 5, 5, 5, 2, 2, 2, 2, 2, 2, 3, 3, 3, 1, 1, 1, 1 }
local WL = 4
local function iceEdge(side)
  local lit = side == "l"
  local body = T(); iceBody(body, lit and 2 or 3)
  local t = T()
  local function inIce(x, y) return y >= 0 and y < TS and x >= FACE[y + 1] end
  for y = 0, TS - 1 do for x = 0, TS - 1 do
    if inIce(x, y) then
      local c = G(body, x, y)
      local top = not inIce(x, y - 1) and y > 0
      if top then c = "white" elseif y > 0 and not inIce(x, y - 2) and inIce(x, y - 1) and x < 5 then c = "sky5" end
      if x == FACE[y + 1] then
        if lit then c = (y < WL + 1) and "white" or "sky5" else c = (y < WL + 1) and "sky3" or "sky2" end
      elseif x == FACE[y + 1] + 1 and y > 0 then
        if lit then c = (y < WL + 1) and "sky5" or "sky4" else c = "sky3" end
      end
      P(t, x, y, c)
    elseif y < WL then
      if inIce(x + 1, y) or inIce(x, y + 1) or inIce(x - 1, y) then P(t, x, y, "outline") end
    else
      local c
      if y == WL then c = inIce(x + 1, y) and "white" or "sky5"
      elseif y == WL + 1 then c = "sky4"
      elseif y <= WL + 4 then c = "sky3"
      else c = "sky2" end
      if inIce(x + 1, y) and y > WL then c = "sky1" end
      P(t, x, y, c)
    end
  end end
  -- fracture facets running into the slab from the broken face
  if lit then L(t, 4, 5, 6, 8, "sky5"); L(t, 5, 5, 7, 8, "sky3"); L(t, 4, 11, 6, 13, "sky4")
  else L(t, 4, 5, 6, 8, "sky2"); L(t, 4, 11, 6, 13, "sky2") end
  if not lit then t = mirror(t) end
  return t
end

---------------------------------------------------------------------------------------------------
-- UNDER-ICE WATER (rows 22-23): dark blue-green water under the sheet; calm caustics + a few bubbles
local UNDER = { hazard = "water" }
local function underWater(deep)
  local t = T()
  for y = 0, TS - 1 do for x = 0, TS - 1 do
    local c = "sky1"
    if not deep then
      if y == 0 then c = ((x % 2) == 0) and "sky2" or "sky1" end
      if y == 1 and x % 4 == 1 then c = "sky2" end
      if y >= 12 and (x * 3 + y * 5) % 13 == 0 then c = "leaf1" end
    else
      if y >= 10 and (x + y) % 2 == 0 then c = "outline" end
      if y >= 14 then c = "outline" end
      if y < 8 and (x * 3 + y * 5) % 13 == 0 then c = "leaf1" end
    end
    P(t, x, y, c)
  end end
  if not deep then
    -- a lazy caustic wave of light and a few rising bubbles
    for x = 0, TS - 1 do local y = 4 + math.floor(math.sin(x / 16 * 2 * math.pi) * 1.5 + 0.5); if x % 3 ~= 2 then P(t, x, y, "steel2") end end
    P(t, 4, 9, "sky3"); P(t, 3, 10, "sky3"); P(t, 5, 10, "sky2"); P(t, 4, 11, "sky2"); P(t, 3, 9, "sky4")
    P(t, 6, 7, "sky3"); P(t, 12, 12, "sky3"); P(t, 13, 13, "sky2")
  else
    P(t, 9, 3, "sky2"); P(t, 10, 4, "outline")
  end
  return t
end

---------------------------------------------------------------------------------------------------
-- CRACKING ICE: a thin, darker slab (8 px) over dark water. f0 = crack_m (hairline web),
-- f1 fissures open, f2 the slab splits into plates (middle sinks, chips lift), f3 plates tip into open water.
local SLAB = 8
local function slabColor(d, x)
  if d == 0 then return (x % 5 == 1) and "sky5" or "sky4" end
  if d == 1 then return "sky3" end
  if d <= 3 then return "sky3" end
  if d == 4 then return ((x + d) % 2 == 0) and "sky3" or "sky2" end
  if d <= 6 then return "sky2" end
  return "sky1"
end
local function darkWater(t, x, y)
  local c = "sky1"
  if y > SLAB and ((x + y * 3) % 11 == 0 or (x + 1 + y * 3) % 11 == 0) and y % 3 == 0 then c = "sky2" end
  P(t, x, y, c)
end
-- crazed hairline network; the long crack enters/leaves at y=3 so a run of crack_m tiles links up
local CRACKS = {
  { { 0, 3 }, { 3, 2 }, { 6, 4 }, { 9, 3 }, { 12, 5 }, { 15, 3 } },
  { { 3, 2 }, { 2, 0 } }, { { 9, 3 }, { 10, 0 } },
  { { 3, 2 }, { 4, 7 } }, { { 9, 3 }, { 8, 7 } },
  { { 12, 5 }, { 13, 7 } }, { { 6, 4 }, { 6, 7 } },
}
local CRACKS2 = { { { 6, 4 }, { 6, 1 }, { 7, 0 } }, { { 12, 5 }, { 13, 1 }, { 14, 0 } }, { { 1, 3 }, { 0, 6 } } }
local function polyline(pts, fn)
  for i = 1, #pts - 1 do LF(pts[i][1], pts[i][2], pts[i + 1][1], pts[i + 1][2], fn) end
end

local function slab(t, x, d, wl)
  for k = 0, SLAB - 1 do
    local y = d + k
    local c = slabColor(k, x)
    if wl and y > wl then c = (k == 0) and "sky4" or ((k < 4) and "sky3" or "sky2") end
    P(t, x, y, c)
  end
end

local function crackTile(f)
  local t = T()
  if f <= 1 then
    for x = 0, TS - 1 do
      slab(t, x, 0)
      for y = SLAB, TS - 1 do darkWater(t, x, y) end
    end
    if f == 0 then
      for _, c in ipairs(CRACKS) do
        polyline(c, function(x, y)
          P(t, x, y, (y <= 3) and "white" or "sky5")
          if y + 1 < SLAB - 1 and G(t, x, y + 1) ~= "white" and G(t, x, y + 1) ~= "sky5" then P(t, x, y + 1, "sky1") end
        end)
      end
      -- thin spots where the dark water shows through the slab
      for _, d in ipairs({ { 1, 5 }, { 2, 5 }, { 10, 5 }, { 11, 5 }, { 10, 6 }, { 14, 6 }, { 7, 2 } }) do
        local c = G(t, d[1], d[2])
        if c == "sky2" or c == "sky3" then P(t, d[1], d[2], "sky1") end
      end
      -- the surface itself is cracked where hairlines reach the top
      P(t, 2, 0, "sky1"); P(t, 10, 0, "sky1"); P(t, 1, 0, "white"); P(t, 9, 0, "white")
    else
      local function fiss(pts, core)
        polyline(pts, function(x, y)
          P(t, x, y, core)
          local l = G(t, x - 1, y)
          if l and l ~= "outline" and l ~= "sky1" then P(t, x - 1, y, (y == 0) and "white" or "sky5") end
        end)
      end
      for _, c in ipairs(CRACKS) do fiss(c, "outline") end
      for _, c in ipairs(CRACKS2) do fiss(c, "sky1") end
      P(t, 7, 0, nil); P(t, 8, 0, nil); P(t, 6, 0, "white"); P(t, 9, 0, "sky5")
      P(t, 4, 0, "white"); P(t, 11, 0, "white")
      -- water starts seeping up under the fissures
      P(t, 2, SLAB, "sky2"); P(t, 7, SLAB, "sky2"); P(t, 14, SLAB, "sky2")
    end
    return t
  end
  if f == 2 then
    -- three plates (gaps at x=5 and x=10); outer plates tip toward the middle, middle plate sank 2 px
    local drop = { 0, 0, 1, 1, 1, -1, 2, 2, 2, 2, -1, 1, 1, 1, 0, 0 }
    for x = 0, TS - 1 do
      local d = drop[x + 1]
      if d < 0 then
        for y = 0, TS - 1 do
          if y < 2 then P(t, x, y, nil) elseif y < SLAB then P(t, x, y, (y < 4) and "outline" or "sky2") else darkWater(t, x, y) end
        end
      else
        slab(t, x, d)
        for y = d + SLAB, TS - 1 do darkWater(t, x, y) end
      end
    end
    -- lit / shadowed plate edges at the gaps
    for y = 2, 8 do P(t, 6, y, (y == 2) and "white" or "sky5") end
    for y = 1, 7 do P(t, 4, y, "sky2") end
    for y = 2, 8 do P(t, 9, y, "sky2") end
    for y = 1, 7 do P(t, 11, y, (y == 1) and "white" or "sky5") end
    -- leftover hairlines on the plates
    L(t, 2, 2, 1, 5, "sky5"); L(t, 13, 2, 14, 5, "sky5"); P(t, 8, 4, "sky5"); P(t, 7, 5, "sky5")
    -- chips lifted out of the cracks
    P(t, 5, 0, "white"); P(t, 7, 0, "sky5"); P(t, 8, 1, "white"); P(t, 10, 0, "white")
    return t
  end
  -- f3: water has flooded the hole (crest at y=4 like stage1 water_top); plates tip and sink
  local wl = 4
  local drop = { 1, 2, 3, 4, 5, nil, nil, nil, nil, nil, nil, 5, 4, 3, 2, 1 }
  for x = 0, TS - 1 do
    for y = 0, TS - 1 do
      if y < wl then P(t, x, y, nil)
      elseif y == wl then P(t, x, y, "sky5")
      elseif y == wl + 1 then P(t, x, y, "sky4")
      elseif y <= wl + 4 then P(t, x, y, "sky3")
      else P(t, x, y, "sky2") end
    end
    local d = drop[x + 1]
    if d then slab(t, x, d, wl) end
  end
  -- sunk middle plate glimmering under the surface
  for x = 6, 10 do P(t, x, 10, "sky3"); P(t, x, 11, "sky2") end
  P(t, 6, 10, "sky4"); P(t, 7, 10, "sky4")
  -- foam where the plates break the surface + splash
  for _, x in ipairs({ 5, 6, 10 }) do P(t, x, wl, "white") end
  P(t, 4, wl - 1, "sky5"); P(t, 11, wl - 1, "sky5")
  P(t, 7, 2, "white"); P(t, 9, 1, "sky5"); P(t, 8, 3, "sky5")
  -- lit tops of the tipped plates
  for x = 0, 4 do P(t, x, drop[x + 1], "white") end
  for x = 11, 15 do P(t, x, drop[x + 1], "sky5") end
  return t
end

local function stompTile()
  local t = iceTile(1)
  -- a few subtle hairlines; reads as "stressed" ice next to plain ice_m
  local lines = { { { 4, 1 }, { 5, 4 }, { 4, 7 }, { 6, 10 } }, { { 5, 4 }, { 8, 6 } }, { { 11, 2 }, { 12, 5 }, { 11, 8 } } }
  for _, l in ipairs(lines) do polyline(l, function(x, y) P(t, x, y, "sky5"); if G(t, x + 1, y) == "sky3" then P(t, x + 1, y, "sky2") end end) end
  P(t, 4, 0, "sky4"); P(t, 11, 0, "sky4"); P(t, 11, 1, "sky4")
  return t
end

---------------------------------------------------------------------------------------------------
-- FLOES: row-21 tiles that replace water_top. Walkable slab top at y=0, slab 9 px thick floating in water;
-- the open-water side(s) and the water under the slab match stage1 water_top (crest at y=4), so floes sit flush
-- between animated water_top tiles.
local FLOE_H = 9
-- open water below stage1 water_top's crest (transparent above y=4)
local function waterPx(t, x, y)
  if y < 4 then P(t, x, y, nil)
  elseif y == 4 then P(t, x, y, "sky5")
  elseif y == 5 then P(t, x, y, "sky4")
  elseif y <= 8 then P(t, x, y, "sky3")
  else P(t, x, y, "sky2") end
end
-- per-row inset of a broken floe end (rows 0..8): sharp top corner, angular facet, tapered underside
local FLOE_END = { 1, 0, 0, 0, 1, 1, 2, 3, 5 }
local function floe(kind)
  local t = T()
  local seed = ({ l = 1, m = 2, r = 3, single = 4 })[kind]
  local function inset(side, y)
    if y >= FLOE_H then return 99 end
    if kind == side or kind == "single" then return FLOE_END[y + 1] end
    return 0
  end
  for y = 0, TS - 1 do for x = 0, TS - 1 do
    local inSlab = y < FLOE_H and x >= inset("l", y) and x <= 15 - inset("r", y)
    if inSlab then
      local c
      if y == 0 then c = "white"
      elseif y == 1 then c = ((x + seed) % 4 == 1) and "white" or "sky5"
      elseif y <= 3 then c = "sky4"
      elseif y == 4 then c = "sky5"                                 -- waterline lip
      elseif y <= 6 then c = ((x + y) % 2 == 0) and "sky4" or "sky3" -- submerged, seen through water
      elseif y == 7 then c = "sky3"
      else c = "sky2" end
      P(t, x, y, c)
    elseif y >= FLOE_H then
      -- water under the slab: shadow just below it, then water_top body colours
      local under = x >= inset("l", FLOE_H - 1) and x <= 15 - inset("r", FLOE_H - 1)
      local c = (y == FLOE_H and under) and "sky1" or "sky2"
      if y == FLOE_H + 2 and H(x, y, 60 + seed) < 0.15 then c = "sky3" end
      P(t, x, y, c)
    else
      waterPx(t, x, y)
      if y == 4 then P(t, x, y, "white") end -- foam where the floe meets the water
    end
  end end
  -- fracture facet on the slab face
  local fx = 3 + seed * 3 % 9
  L(t, fx, 3, fx + 2, 1, "white"); P(t, fx + 1, 3, "sky5"); P(t, fx + 3, 2, "sky3")
  -- snow lump on top (sits on the y=0 surface row)
  for x = 5 + seed % 3, 9 + seed % 3 do P(t, x, 1, "white") end
  -- broken ends: lit facet on the left end, shadowed on the right; keyline above the waterline
  if kind == "l" or kind == "single" then
    for y = 0, FLOE_H - 1 do
      local e = FLOE_END[y + 1]
      P(t, e, y, (y < 4) and "white" or "sky5")
      if e > 0 and y < 4 then P(t, e - 1, y, "outline") end
    end
    P(t, 0, 0, nil)
  end
  if kind == "r" or kind == "single" then
    for y = 0, FLOE_H - 1 do
      local e = 15 - FLOE_END[y + 1]
      P(t, e, y, (y < 4) and "sky3" or "sky2")
      if e < 15 and y < 4 then P(t, e + 1, y, "outline") end
    end
    P(t, 15, 0, nil)
  end
  return t
end

---------------------------------------------------------------------------------------------------
-- LAB DECK: riveted steel with a weird-green glowing seam on top
local METAL = { collides = true, material = "metal" }
local function labFloor(kind, v)
  local t = T()
  R(t, 0, 0, TS, TS, "steel3")
  for x = 0, TS - 1 do
    P(t, x, 0, "steel5"); P(t, x, 1, "steel4")
    P(t, x, 2, ((x + v * 3) % 6 == 0) and "weird5" or "weird4")
    P(t, x, 3, "weird2"); P(t, x, 4, "steel1")
    P(t, x, 5, "steel4"); P(t, x, 15, "steel1")
    if H(x, 0, 90 + v) < 0.3 then P(t, x, 0, "white") end
  end
  for y = 5, 15 do P(t, 15, y, "steel1"); P(t, 0, y, "steel4") end
  P(t, 0, 15, "steel2")
  for _, b in ipairs({ { 2, 7 }, { 13, 7 }, { 2, 13 }, { 13, 13 } }) do P(t, b[1], b[2], "steel5"); P(t, b[1] + 1, b[2] + 1, "steel1") end
  for y = 7, 13 do for x = 2, 13 do if H(x, y, 95 + v) < 0.05 then P(t, x, y, "steel2") end end end
  if v == 1 then -- floor grate with a faint glow underneath
    R(t, 5, 8, 6, 5, "steel1")
    for _, x in ipairs({ 6, 8, 10 }) do for y = 9, 11 do P(t, x, y, (y == 10) and "weird3" or "weird2") end end
    for x = 5, 10 do P(t, x, 12, "steel4") end
  else
    L(t, 4, 11, 10, 11, "steel4"); L(t, 5, 12, 11, 12, "steel2")
  end
  if kind == "l" then
    for y = 0, TS - 1 do P(t, 0, y, "outline"); P(t, 1, y, (y <= 4) and G(t, 1, y) or "steel4") end
    P(t, 1, 2, "weird3"); P(t, 0, 0, nil); P(t, 1, 0, nil); P(t, 0, 1, nil); P(t, 1, 1, "steel5")
    P(t, 0, 15, nil); P(t, 1, 15, "outline")
  elseif kind == "r" then
    for y = 0, TS - 1 do P(t, 15, y, "outline"); P(t, 14, y, (y <= 4) and G(t, 14, y) or "steel2") end
    P(t, 14, 2, "weird3"); P(t, 15, 0, nil); P(t, 14, 0, nil); P(t, 15, 1, nil); P(t, 14, 1, "steel4")
    P(t, 15, 15, nil); P(t, 14, 15, "outline")
  end
  return t
end

---------------------------------------------------------------------------------------------------
-- DECOR
local function reeds(v)
  local t = T()
  local sets = {
    { { 2, 9, 0, false }, { 4, 13, -1, true }, { 6, 7, 1, false }, { 8, 11, 0, true }, { 11, 8, 1, false }, { 13, 12, 1, true } },
    { { 3, 12, -1, true }, { 5, 6, 0, false }, { 7, 10, 1, false }, { 10, 13, 0, true }, { 12, 7, -1, false } },
    { { 2, 6, -1, false }, { 5, 11, 0, true }, { 9, 8, 1, false }, { 12, 10, 0, false }, { 14, 7, 1, false } },
  }
  for i, s in ipairs(sets[v]) do
    local bx, h, lean, cat = s[1], s[2], s[3], s[4]
    local topx, topy = bx, 15 - h
    for k = 0, h do
      local x = bx + ((k > h * 0.6) and lean or 0)
      local c = ((k + i) % 4 == 0) and "dirt2" or "sand2"
      if k > h - 2 then c = "sand3" end
      P(t, x, 15 - k, c)
      topx, topy = x, 15 - k
    end
    if cat then
      -- cattail head: 2x4, snow capped
      for y = topy + 2, topy + 5 do P(t, topx, y, (y == topy + 2) and "dirt3" or "dirt2"); P(t, topx + 1, y, "dirt1") end
      P(t, topx, topy + 1, "white"); P(t, topx + 1, topy + 1, "ink6"); P(t, topx, topy, "sand3")
    else
      P(t, topx, topy, "white")
      -- a curled leaf blade
      P(t, topx + lean, topy + 2, "sand3"); P(t, topx + 2 * lean, topy + 3, "sand2")
    end
  end
  -- frosted base mound
  for x = 1, 14 do
    local hh = (x >= 3 and x <= 12) and 2 or 1
    if H(x, 1, v + 70) < 0.3 then hh = hh + 1 end
    for k = 0, hh - 1 do P(t, x, 15 - k, (k == hh - 1) and "white" or ((k == 0) and "sky5" or "ink6")) end
  end
  return t
end

local function iceDrift(kind)
  local t = T()
  for x = 0, TS - 1 do
    local h
    if kind == "l" then h = math.floor(x / 2.5) elseif kind == "r" then h = math.floor((15 - x) / 2.5) else h = 5 + ((x % 6 == 2) and 1 or 0) + ((x % 9 == 5) and -1 or 0) end
    h = math.min(h, 6)
    for k = 0, h - 1 do
      local c = (k == h - 1) and "white" or ((k == 0) and "sky5" or "ink6")
      if k == h - 2 and x % 5 == 3 then c = "white" end
      if k == h - 1 and ((kind == "m" and x > 10) or kind == "r") then c = "ink6" end   -- shaded right flank
      P(t, x, 15 - k, c)
    end
  end
  -- blown spindrift on the crest
  if kind == "m" then P(t, 12, 9, "white"); P(t, 14, 10, "ink6") end
  return t
end

local function inTri(px, py, ax, ay, bx, by, cx, cy)
  local function s(x1, y1, x2, y2, x3, y3) return (x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3) end
  local d1, d2, d3 = s(px, py, ax, ay, bx, by), s(px, py, bx, by, cx, cy), s(px, py, cx, cy, ax, ay)
  local neg = d1 < 0 or d2 < 0 or d3 < 0
  local pos = d1 > 0 or d2 > 0 or d3 > 0
  return not (neg and pos)
end
-- a tilted ice shard: base from x0..x1 on the bottom row, tip at (tx, ty)
local function shard(t, x0, x1, tx, ty)
  for y = ty, TS - 1 do for x = 0, TS - 1 do
    if inTri(x + 0.5, y + 0.5, x0, 16, x1 + 1, 16, tx + 0.5, ty) then
      -- facet split along the ridge from tip to base middle
      local midx = tx + (((x0 + x1) / 2) - tx) * (y - ty) / math.max(1, 16 - ty)
      local c
      if x < midx then c = (y - ty < 3) and "white" or "sky5" else c = (y - ty < 3) and "sky4" or "sky3" end
      if math.abs(x - midx) < 0.6 and y > ty + 1 then c = "white" end
      P(t, x, y, c)
    end
  end end
end
local function shards(v)
  local t = T()
  if v == 1 then shard(t, 1, 8, 3, 2); shard(t, 8, 13, 12, 8); shard(t, 6, 9, 9, 11)
  else shard(t, 2, 6, 5, 6); shard(t, 5, 12, 10, 1); shard(t, 11, 14, 14, 9) end
  -- inner fracture shading
  for y = 0, TS - 1 do for x = 0, TS - 1 do
    if G(t, x, y) == "sky3" and (H(x, y, v + 80) < 0.15) then P(t, x, y, "sky2") end
  end end
  outline(t, "sky1", true)
  -- snow packed at the foot
  for x = 0, TS - 1 do if A(t, x, 15) then P(t, x, 15, (x % 3 == 0) and "ink6" or "white") end end
  return t
end

---------------------------------------------------------------------------------------------------
-- LAB WALL DECORATIONS baked onto stage1's background concrete
local function wallBase(v) return s1tile((v == 1) and "concrete_bg_fill_v1" or "concrete_bg_m0") end

local function labWindow(lit)
  local t = T()
  R(t, 1, 1, 14, 12, "outline")
  R(t, 2, 2, 12, 10, "steel2"); for x = 2, 13 do P(t, x, 2, "steel4") end; for y = 2, 11 do P(t, 2, y, "steel3") end
  if lit then
    R(t, 3, 3, 10, 8, "weird4")
    for x = 3, 12 do P(t, x, 3, "weird5"); P(t, x, 4, (x % 2 == 0) and "weird5" or "weird4") end
    for x = 3, 12 do P(t, x, 10, "leaf4") end
    -- lab tank silhouette: domed cylinder with a pipe on top
    for y = 5, 10 do for x = 6, 10 do P(t, x, y, "weird1") end end
    P(t, 6, 5, "weird4"); P(t, 10, 5, "weird4"); for x = 7, 9 do P(t, x, 4, "weird1") end
    P(t, 8, 3, "weird1")
    for x = 6, 10 do P(t, x, 8, "weird2") end
    P(t, 7, 6, "weird2"); P(t, 7, 7, "weird2") -- glass sheen on the tank
    -- a little hunched specimen shape inside? just a glowing eye
    P(t, 9, 6, "weird5")
    P(t, 4, 4, "white"); P(t, 5, 3, "white")
  else
    R(t, 3, 3, 10, 8, "steel1")
    L(t, 4, 9, 9, 4, "weird1"); L(t, 6, 10, 11, 5, "weird1")
    P(t, 4, 4, "steel3"); P(t, 5, 4, "steel2")
  end
  -- frame bar + sill with snow
  for y = 3, 10 do P(t, 3, y, lit and "steel3" or "steel2") end
  for x = 0, 15 do P(t, x, 13, "ink5"); P(t, x, 14, "ink2") end
  for x = 1, 14 do P(t, x, 12, (x % 4 == 2) and "ink6" or "white") end
  P(t, 0, 13, "ink4"); P(t, 15, 13, "ink3")
  return t
end

local function labVent()
  local t = T()
  -- purple glow spill on the wall around the vent
  for _, p in ipairs({ { 1, 1 }, { 14, 1 }, { 1, 14 }, { 14, 14 }, { 0, 7 }, { 15, 8 } }) do P(t, p[1], p[2], "weird1") end
  R(t, 2, 2, 12, 12, "outline")
  R(t, 3, 3, 10, 10, "weird2")
  for y = 3, 12 do for x = 3, 12 do if (y == 7 or y == 8) and x > 4 and x < 11 then P(t, x, y, "weird3") end end end
  P(t, 7, 7, "weird5"); P(t, 8, 8, "weird3")
  -- slats
  for _, y in ipairs({ 4, 6, 9, 11 }) do for x = 3, 12 do P(t, x, y, "steel4"); P(t, x, y + 1 > 12 and 12 or y + 1, (y == 6) and "weird3" or "steel1") end end
  for x = 2, 13 do P(t, x, 2, "steel3") end
  for y = 2, 13 do P(t, 2, y, "steel3"); P(t, 13, y, "steel1") end
  for x = 2, 13 do P(t, x, 13, "steel1") end
  P(t, 2, 2, "steel5")
  return t
end

local function labPipe()
  local t = T()
  for x = 0, TS - 1 do
    P(t, x, 5, "outline"); P(t, x, 6, "steel4"); P(t, x, 7, "weird4"); P(t, x, 8, "weird5"); P(t, x, 9, "weird4")
    P(t, x, 10, "steel2"); P(t, x, 11, "outline")
    if (x % 8) == 3 then P(t, x, 8, "white") end
  end
  -- collar + wall bracket (period 16, seamless)
  for y = 4, 12 do P(t, 11, y, "steel5"); P(t, 12, y, "steel3"); P(t, 13, y, "steel2") end
  P(t, 10, 4, "outline"); P(t, 14, 4, "outline"); P(t, 10, 12, "outline"); P(t, 14, 12, "outline")
  for x = 11, 13 do P(t, x, 3, "outline"); P(t, x, 13, "steel1"); P(t, x, 14, "outline") end
  P(t, 12, 15, "ink1")
  -- glow spill on the wall below
  for x = 0, TS - 1 do if x % 3 == 0 and (x < 10 or x > 14) then P(t, x, 12, "weird2") end end
  return t
end

local function labHazard()
  local t = T()
  for x = 0, TS - 1 do
    P(t, x, 4, "outline")
    for y = 5, 10 do P(t, x, y, ((x + y) // 3) % 2 == 0 and "weird3" or "outline") end
    P(t, x, 5, ((x + 5) // 3) % 2 == 0 and "weird5" or "weird1")
    P(t, x, 11, "outline")
  end
  return t
end

-- 32x32 Regime antler emblem: palmate moose antlers rising from a spiral eye, painted weird3/weird2
local ANTLER = {
  "................",
  ".a..a...........",
  ".a..a..a........",
  ".aa.a..a..a.....",
  ".aaaaa.aa.a.....",
  "..aaaaaaa.aa....",
  "a.aaaaaaaaaa....",
  "aaaaaaaaaaaa....",
  ".aaaaaaaaaab....",
  "..baaaaaaaab....",
  "....bbaaaaab....",
  ".......baaab....",
  "........baab....",
  ".........baab...",
  "..........baa...",
  "...........baa..",
  "............bab.",
}
local function emblemImage()
  local img = Image(32, 32, ColorMode.RGB)
  local function set(x, y, c) if x >= 0 and y >= 0 and x < 32 and y < 32 then img:drawPixel(x, y, K.color(c)) end end
  -- antlers: left half from the grid, right half mirrored
  for j, row in ipairs(ANTLER) do for i = 1, #row do
    local ch = row:sub(i, i)
    if ch ~= "." then
      local c = (ch == "a") and "weird3" or "weird2"
      set(i - 1 + 1, j + 1, c)
      set(30 - (i - 1), j + 1, c)
    end
  end end
  -- almond eye: center (15.5, 23), half-width 11, half-height 5; spiral iris r=4
  local cx, cy, a, b, ir = 15.5, 23, 11, 5, 4.2
  local function inEye(x, y)
    local i, j = x - cx, y - cy
    local tt = 1 - (i / (a + 0.5)) ^ 2
    return tt > 0 and math.abs(j) <= b * tt + 0.3
  end
  for y = 16, 31 do for x = 0, 31 do
    if inEye(x, y) then
      local i, j = x - cx, y - cy
      local r = math.sqrt(i * i + j * j)
      local c = "weird3"
      if r <= ir + 0.4 then
        local ang = math.atan(j, i)
        local s = (r - ang / (2 * math.pi) * 3.0) / 3.0
        c = ((s - math.floor(s)) < 0.5) and "weird1" or "weird3"
        if r > ir - 0.6 then c = "weird2" end
      elseif j > b * 0.4 then c = "weird2" end
      set(x, y, c)
    elseif inEye(x + 1, y) or inEye(x - 1, y) or inEye(x, y + 1) or inEye(x, y - 1) then
      set(x, y, "weird1")
    end
  end end
  set(15, 22, "weird5"); set(16, 23, "weird1")
  return img
end
-- worn paint on concrete: skip a few pixels so the wall shows through, add drips
local function paintOn(base, img, ox, oy, seed)
  for y = 0, TS - 1 do for x = 0, TS - 1 do
    local sx, sy = x + ox, y + oy
    if app.pixelColor.rgbaA(img:getPixel(sx, sy)) > 0 then
      if H(sx, sy, seed) > 0.06 then base:drawPixel(x, y, img:getPixel(sx, sy)) end
    end
  end end
  return base
end

---------------------------------------------------------------------------------------------------
-- LAYOUT
-- Row 0: ice sheet, under-ice water, cracking ice, floes, lab deck
put(0, 0, "ice_l", iceEdge("l"), ICE)
put(1, 0, "ice_m", iceTile(0), ICE)
put(2, 0, "ice_m2", iceTile(1), ICE)
put(3, 0, "ice_m3", iceTile(3), ICE)
put(4, 0, "ice_r", iceEdge("r"), ICE)
put(5, 0, "ice_under", underWater(false), UNDER)
put(6, 0, "ice_under_deep", underWater(true), UNDER)
put(7, 0, "crack_m", crackTile(0), { collides = true, material = "ice", crack = "true" })
put(8, 0, "crack_f1", crackTile(1), ICE)
put(9, 0, "crack_f2", crackTile(2), ICE)
put(10, 0, "crack_f3", crackTile(3), ICE)
put(11, 0, "crack_stomp", stompTile(), { collides = true, material = "ice", crack = "stomp" })
put(12, 0, "floe_l", floe("l"), ICE)
put(13, 0, "floe_m", floe("m"), ICE)
put(14, 0, "floe_r", floe("r"), ICE)
put(15, 0, "floe_single", floe("single"), ICE)
put(16, 0, "labfloor_l", labFloor("l", 0), METAL)
put(17, 0, "labfloor_m", labFloor("m", 0), METAL)
put(18, 0, "labfloor_m2", labFloor("m", 1), METAL)
put(19, 0, "labfloor_r", labFloor("r", 0), METAL)

-- Row 1: lake decor + lab wall decorations (rows 1-2 cols 13-14 hold the 2x2 emblem)
for v = 1, 3 do put(v - 1, 1, "reeds_" .. ({ "a", "b", "c" })[v], reeds(v), {}) end
put(3, 1, "ice_drift_l", iceDrift("l"), {})
put(4, 1, "ice_drift_m", iceDrift("m"), {})
put(5, 1, "ice_drift_r", iceDrift("r"), {})
put(6, 1, "ice_shard_a", shards(1), {})
put(7, 1, "ice_shard_b", shards(2), {})
local function onWall(deco, v) local b = wallBase(v); b:drawImage(deco, Point(0, 0)); return b end
put(8, 1, "wall_lab_window", onWall(labWindow(true), 0), {})
put(9, 1, "wall_lab_window_dark", onWall(labWindow(false), 0), {})
put(10, 1, "wall_lab_vent", onWall(labVent(), 1), {})
put(11, 1, "wall_lab_pipe", onWall(labPipe(), 0), {})
put(12, 1, "wall_lab_hazard", onWall(labHazard(), 0), {})
local EMB = emblemImage()
put(13, 1, "wall_antler_tl", paintOn(wallBase(0), EMB, 0, 0, 101), {})
put(14, 1, "wall_antler_tr", paintOn(wallBase(0), EMB, 16, 0, 102), {})
put(13, 2, "wall_antler_bl", paintOn(wallBase(0), EMB, 0, 16, 103), {})
put(14, 2, "wall_antler_br", paintOn(wallBase(0), EMB, 16, 16, 104), {})

---------------------------------------------------------------------------------------------------
-- write outputs
local spr = Sprite(SHEET.width, SHEET.height, ColorMode.RGB)
spr.cels[1].image = SHEET
spr.layers[1].name = "tiles"
local names = {}; for n in pairs(K.PAL) do names[#names + 1] = n end; table.sort(names)
local pal = Palette(#names + 1); pal:setColor(0, Color{ r = 0, g = 0, b = 0, a = 0 })
for i, n in ipairs(names) do local c = K.PAL[n]; pal:setColor(i, Color{ r = c[1], g = c[2], b = c[3], a = 255 }) end
spr:setPalette(pal)
spr:saveAs(ROOT .. "/art-src/tiles/m1_lake.aseprite")
spr:saveCopyAs(ROOT .. "/public/assets/tiles/m1_lake.png")
spr:close()

table.sort(manifest.tiles, function(a, b) return a.id < b.id end)
local f = io.open(ROOT .. "/art-src/tiles/m1_lake_tiles.json", "w")
f:write(json.encode(manifest))
f:close()
print("built m1_lake tileset (" .. #manifest.tiles .. " tiles, " .. SHEET.width .. "x" .. SHEET.height .. ")")
