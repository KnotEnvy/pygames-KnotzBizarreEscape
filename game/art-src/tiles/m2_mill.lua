-- Mission 2 Part III "GATOR'S DEN" tileset: the Drowned Mill (a ruined lumber mill on pilings over the water, now
-- GATORGEDDON's den) and the den pier boss-arena floor. 16x16 tiles, 32 columns, one image, 0 margin/spacing.
-- Build: bash tools/build-art.sh art-src/tiles/m2_mill.lua
-- Writes: art-src/tiles/m2_mill.aseprite (source), public/assets/tiles/m2_mill.png (tileset image),
--         art-src/tiles/m2_mill_tiles.json (manifest: name -> local id, properties, animations; stage1 format).
--
-- Geometry: ground row 21 (y 336).
--  * Mill floor / den pier sit on row 21; the walkable top is the tile top edge.
--  * Pier tile: deck boards (seen end-on) y 0-5, stringer beam y 6-10, dark under-deck void, shadowed water crest
--    at tile y 12-13 (water surface ~y 349). Rows 22-23 under the pier: pier_under (piling, under pier_m2),
--    pier_under2 (open water), pier_under_l / pier_under_r (end posts under pier_l / pier_r). All under-pier water
--    tiles tile vertically and horizontally.
--  * Stomp chain (runtime): pier_stomp -> pier_crack_f1 -> pier_crack_f2 -> pier_crack_f3 -> pier_hole (and back).
--  * pile_wl and the bayou water share the crest height: top 2 px transparent, crest at tile y 2-3.
-- Storm night: gameplay tiles (floor, planks, pier, lumber, roof) carry lit wet top edges and selective outlines;
-- background tiles (walls, beams, pilings, den rock, chains, cages, gears) have no outlines and stay darker.
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local TS, COLS, ROWS = 16, 32, 4
local SHEET = Image(TS * COLS, TS * ROWS, ColorMode.RGB)
local CLEAR = app.pixelColor.rgba(0, 0, 0, 0)

local manifest = { tilewidth = TS, columns = COLS, rows = ROWS, image = "m2_mill.png", tiles = {} }
local byName = {}

---------------------------------------------------------------------------------------------------
-- helpers (same as stage1.lua / m1_train.lua)
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
local function L(t, x0, y0, x1, y1, c) LF(x0, y0, x1, y1, function(x, y) P(t, x, y, c) end) end
local REV = {}
for n, c in pairs(K.PAL) do REV[app.pixelColor.rgba(c[1], c[2], c[3], 255)] = n end
local function G(t, x, y)
  if not A(t, x, y) then return nil end
  return REV[t:getPixel(x, y)]
end
local DARK = {
  ink6 = "ink5", ink5 = "ink4", ink4 = "ink3", ink3 = "ink2", ink2 = "ink1", ink1 = "outline",
  dirt5 = "dirt4", dirt4 = "dirt3", dirt3 = "dirt2", dirt2 = "dirt1", dirt1 = "outline",
  sand5 = "sand4", sand4 = "sand3", sand3 = "sand2", sand2 = "sand1", sand1 = "outline",
  steel5 = "steel4", steel4 = "steel3", steel3 = "steel2", steel2 = "steel1", steel1 = "outline",
  leaf5 = "leaf4", leaf4 = "leaf3", leaf3 = "leaf2", leaf2 = "leaf1", leaf1 = "outline",
  olive5 = "olive4", olive4 = "olive3", olive3 = "olive2", olive2 = "olive1", olive1 = "outline",
  red5 = "red4", red4 = "red3", red3 = "red2", red2 = "red1", red1 = "outline",
  fire5 = "fire4", fire4 = "fire3", fire3 = "fire2", fire2 = "fire1", fire1 = "outline",
  sky5 = "sky4", sky4 = "sky3", sky3 = "sky2", sky2 = "sky1", sky1 = "outline",
  outline = "outline",
}
local function darken(t, x, y)
  local c = G(t, x, y); if c then P(t, x, y, DARK[c] or c) end
end
-- horizontal wood grain: short dashes one shade darker (applied once per pixel)
local function grainH(t, x0, y0, x1, y1, seed, p)
  local mark = {}
  for y = y0, y1 do for x = x0, x1 do
    if H(x, y, seed) < p then
      local n = 1 + math.floor(H(x, y, seed + 1) * 3)
      for k = 0, n - 1 do if x + k <= x1 then mark[(x + k) + y * 64] = { x + k, y } end end
    end
  end end
  for _, m in pairs(mark) do darken(t, m[1], m[2]) end
end
local function grainV(t, x0, y0, x1, y1, seed, p)
  local mark = {}
  for y = y0, y1 do for x = x0, x1 do
    if H(x, y, seed) < p then
      local n = 2 + math.floor(H(x, y, seed + 1) * 3)
      for k = 0, n - 1 do if y + k <= y1 then mark[x + (y + k) * 64] = { x, y + k } end end
    end
  end end
  for _, m in pairs(mark) do darken(t, m[1], m[2]) end
end
-- outline transparent pixels 4-adjacent to opaque ones, limited to a rect
local function edgeOutline(t, x0, y0, x1, y1, c)
  local marks = {}
  for y = y0, y1 do for x = x0, x1 do
    if not A(t, x, y) and (A(t, x - 1, y) or A(t, x + 1, y) or A(t, x, y - 1) or A(t, x, y + 1)) then marks[#marks + 1] = { x, y } end
  end end
  for _, m in ipairs(marks) do P(t, m[1], m[2], c or "outline") end
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
local function quarter(img, c, r) local t = T(); t:drawImage(img, Point(-c * TS, -r * TS)); return t end

local WOOD = { collides = true, material = "wood" }
local OWW = { collides = true, oneway = true, material = "wood" }
local OWM = { collides = true, oneway = true, material = "metal" }
local STOMP = { collides = true, material = "wood", crack = "stomp" }
local WATER = { hazard = "water", material = "water" }

---------------------------------------------------------------------------------------------------
-- Row 0: mill floor, mill planks, den pier (+ stomp chain), under-pier water, pilings, roof, beams
local ROW = 0

-- MILL FLOOR (S wood): weathered grey deck top (wet glints), two thick rim boards with nails, dark underside.
local function mfloor(kind, v)
  local t = T()
  local s = 100 + v * 7
  for x = 0, TS - 1 do
    local h0 = H(x, 0, s)
    P(t, x, 0, (h0 < 0.14) and "ink5" or ((h0 > 0.9) and "dirt4" or "ink4"))
    P(t, x, 1, (H(x, 1, s) < 0.3) and "dirt3" or "ink3")
    P(t, x, 2, "outline")
    P(t, x, 3, "dirt4")
    for y = 4, 6 do P(t, x, y, "dirt3") end
    P(t, x, 7, "dirt2")
    P(t, x, 8, "dirt1")
    P(t, x, 9, "dirt3")
    P(t, x, 10, "dirt2"); P(t, x, 11, "dirt2")
    P(t, x, 12, "dirt1")
    P(t, x, 13, "ink1"); P(t, x, 14, (x % 2 == 0) and "outline" or "ink1"); P(t, x, 15, "outline")
  end
  grainH(t, 0, 4, 15, 6, s + 1, 0.11)
  grainH(t, 0, 10, 15, 11, s + 2, 0.13)
  -- grey weathering on the rim boards
  for y = 3, 11 do for x = 0, 15 do
    if H(x, y, s + 3) < 0.07 then
      local c = G(t, x, y)
      if c == "dirt3" or c == "dirt4" then P(t, x, y, "ink3") elseif c == "dirt2" then P(t, x, y, "ink2") end
    end
  end end
  -- butt joints with nail pairs (rust runs under the nails)
  local j1 = ({ [0] = 11, [1] = 4 })[v]
  local j2 = ({ [0] = 5, [1] = 13 })[v]
  for y = 3, 7 do P(t, j1, y, "dirt1") end
  P(t, j1 + 1, 3, "dirt5")
  for y = 9, 11 do P(t, j2, y, "dirt1") end
  P(t, j2 + 1, 9, "dirt4")
  for _, n in ipairs({ { j1 - 2, 5 }, { j1 + 2, 5 }, { j2 - 2, 10 }, { j2 + 2, 10 } }) do
    P(t, n[1], n[2], "ink4"); P(t, n[1], n[2] + 1, "dirt1")
  end
  if v == 1 then
    -- moss creeping over the deck edge, slime drip down the rim
    for _, m in ipairs({ { 8, 0, "leaf3" }, { 9, 0, "olive3" }, { 10, 0, "leaf3" }, { 9, 1, "leaf2" }, { 10, 1, "olive2" },
      { 11, 1, "leaf2" }, { 9, 3, "leaf2" }, { 10, 3, "olive2" }, { 10, 4, "leaf2" }, { 10, 5, "leaf1" }, { 13, 0, "olive3" } }) do
      P(t, m[1], m[2], m[3])
    end
  end
  if kind == "l" then
    P(t, 0, 0, nil)
    for y = 1, 15 do P(t, 0, y, "outline") end
    P(t, 1, 0, "ink5"); P(t, 1, 1, "ink4")
    for y = 3, 7 do P(t, 1, y, (y == 3) and "sand3" or "dirt4") end
    for y = 9, 11 do P(t, 1, y, "dirt3") end
  elseif kind == "r" then
    P(t, 15, 0, nil)
    for y = 1, 15 do P(t, 15, y, "outline") end
    P(t, 14, 0, "ink3"); P(t, 14, 1, "dirt2")
    for y = 3, 7 do P(t, 14, y, "dirt2") end
    for y = 9, 11 do P(t, 14, y, "dirt1") end
  end
  return t
end
put(0, ROW, "mfloor_l", mfloor("l", 0), WOOD)
put(1, ROW, "mfloor_m", mfloor("m", 0), WOOD)
put(2, ROW, "mfloor_m2", mfloor("m", 1), WOOD)
put(3, ROW, "mfloor_r", mfloor("r", 0), WOOD)

-- MILL PLANKS (OW wood): a single thick scaffold plank in the top 7 px; transparent below.
local function mplank(kind)
  local t = T()
  for x = 0, TS - 1 do
    P(t, x, 0, (H(x, 0, 140) < 0.15) and "ink5" or "ink4")
    P(t, x, 1, (H(x, 1, 141) < 0.35) and "dirt3" or "ink3")
    P(t, x, 2, "dirt4")
    P(t, x, 3, "dirt3"); P(t, x, 4, "dirt3")
    P(t, x, 5, "dirt2")
    P(t, x, 6, "outline")
    if x % 2 == 0 then P(t, x, 7, "outline") end
  end
  grainH(t, 0, 3, 15, 4, 142, 0.14)
  if kind == "m" then
    for y = 2, 5 do P(t, 9, y, "dirt1") end; P(t, 10, 2, "dirt5")
    P(t, 7, 3, "ink4"); P(t, 12, 3, "ink4")
  elseif kind == "l" then
    P(t, 0, 0, nil); for y = 1, 6 do P(t, 0, y, "outline") end; P(t, 0, 7, nil)
    P(t, 1, 0, "ink5"); P(t, 1, 2, "sand3"); P(t, 1, 3, "dirt4"); P(t, 1, 4, "dirt4")
    -- rope lashing round the plank end
    for y = 1, 6 do P(t, 3, y, (y % 2 == 0) and "sand2" or "sand3"); P(t, 4, y, "sand2") end
    P(t, 3, 7, "sand2"); P(t, 4, 8, "sand1"); P(t, 4, 7, "outline")
    P(t, 2, 4, "ink4")
  elseif kind == "r" then
    P(t, 15, 0, nil); for y = 1, 6 do P(t, 15, y, "outline") end; P(t, 15, 7, nil)
    P(t, 14, 0, "ink3"); P(t, 14, 2, "dirt2"); P(t, 14, 3, "dirt2"); P(t, 14, 4, "dirt1")
    for y = 1, 6 do P(t, 11, y, (y % 2 == 0) and "sand2" or "sand3"); P(t, 12, y, "sand2") end
    P(t, 12, 7, "sand2"); P(t, 11, 8, "sand1"); P(t, 11, 7, "outline")
    P(t, 13, 4, "ink4")
  end
  return t
end
put(4, ROW, "mplank_l", mplank("l"), OWW)
put(5, ROW, "mplank_m", mplank("m"), OWW)
put(6, ROW, "mplank_r", mplank("r"), OWW)

-- DEN PIER --------------------------------------------------------------------------------------
local function crestY(x) return 12 + (((x + 2) // 4) % 2) end           -- period 8: seamless
local function bump(x) return 1 - math.abs(x - 7.5) / 7.5 end           -- 0 at the tile edges, 1 in the middle
local function rnd(v) return math.floor(v + 0.5) end

-- dark water under the deck (shadowed tea-green)
local function waterPx(t, x, y, seed)
  local c = "leaf1"
  local h = H(x, y, seed or 42)
  if h < 0.07 then c = "steel1" elseif h > 0.95 then c = "outline" elseif h > 0.9 then c = "leaf2" end
  P(t, x, y, c)
end
local function pierBack(t, v)
  for x = 0, TS - 1 do
    local cr = crestY(x)
    for y = 0, TS - 1 do
      if y < cr then
        local c = "outline"
        if y >= 10 and (x + y + v) % 6 == 0 then c = "ink1" end            -- faint back cross-bracing
        P(t, x, y, c)
      elseif y == cr then
        local h = H(x, 0, 41 + v)
        P(t, x, y, (h < 0.22) and "ink3" or ((x % 3 == 0) and "leaf2" or "steel2"))
      else
        waterPx(t, x, y)
      end
    end
  end
end
local function stringer(t, sag, skip, v)
  for x = 0, TS - 1 do
    if not (skip and skip(x)) then
      local d = sag(x)
      P(t, x, d + 6, "dirt3"); P(t, x, d + 7, "dirt2"); P(t, x, d + 8, "dirt2"); P(t, x, d + 9, "dirt1"); P(t, x, d + 10, "outline")
      if H(x, 7, 60 + v) < 0.12 then P(t, x, d + 7, "dirt1") end
      if H(x, 8, 61 + v) < 0.1 then P(t, x, d + 8, "ink2") end
      -- slime / moss hanging off the beam bottom
      if H(x, 9, 62) < 0.22 then P(t, x, d + 9, (H(x, 9, 63) < 0.5) and "olive2" or "leaf2") end
      if H(x, 10, 64) < 0.1 then P(t, x, d + 10, "leaf1") end
      -- carriage bolts
      if x == 2 or x == 10 then P(t, x, d + 7, "steel3"); P(t, x + 1, d + 8, "outline"); P(t, x, d + 8, "dirt1") end
    end
  end
end
local function deck(t, sag, skip, v)
  for x = 0, TS - 1 do
    if not (skip and skip(x)) then
      local d = sag(x)
      local b, i = x // 4, x % 4
      local grey = H(b, v, 51) < 0.55
      if i == 3 then
        P(t, x, d, "dirt2"); P(t, x, d + 1, "dirt1")
        for y = d + 2, d + 4 do P(t, x, y, "outline") end
      else
        local h = H(x, 0, 52 + v)
        P(t, x, d, (h < 0.13) and "ink5" or (grey and "ink4" or "dirt4"))
        P(t, x, d + 1, grey and "ink3" or "dirt3")
        P(t, x, d + 2, (i == 0) and "sand3" or "dirt4")
        P(t, x, d + 3, (i == 2) and "dirt2" or "dirt3")
        P(t, x, d + 4, (i == 2) and "dirt1" or "dirt2")
      end
      P(t, x, d + 5, "outline")
    end
  end
  -- moss on a few board tops
  for b = 0, 3 do
    if H(b, 3, 55 + v) < 0.3 then local x = b * 4 + math.floor(H(b, 4, 55) * 3); P(t, x, sag(x), "olive3") end
  end
end
local function split(t, x, sag) local d = sag(x); for y = d + 2, d + 4 do P(t, x, y, "dirt1") end end
local function splinter(t, x, y, c) if y >= 0 then P(t, x, y, c or "sand3") end end
local Z = function() return 0 end

-- stage: "n" normal, "p" normal + piling, "s" stomp tile, 1..3 crack frames, "hole"
local function pier(stage, v)
  local t = T()
  pierBack(t, v)
  if stage == "n" or stage == "p" then
    if stage == "p" then
      -- piling under the stringer, dimmer below the waterline; ripple ring at the crest
      for y = 11, 15 do
        local under = y > crestY(7)
        P(t, 6, y, under and "dirt2" or "dirt3"); P(t, 7, y, under and "dirt1" or "dirt2")
        P(t, 8, y, under and "dirt1" or "dirt2"); P(t, 9, y, under and "outline" or "dirt1")
      end
      P(t, 7, 12, "leaf2"); P(t, 8, 15, "leaf2")
      P(t, 5, crestY(5), "ink4"); P(t, 4, crestY(4), "ink3"); P(t, 10, crestY(10), "ink3"); P(t, 11, crestY(11), "steel3")
    end
    stringer(t, Z, nil, v); deck(t, Z, nil, v)
  elseif stage == "s" then
    -- looks like pier_m, but: a split board, a lifted splinter, one board sagging 1 px, a hairline in the stringer
    local sag = function(x) return (x >= 8 and x <= 10) and 1 or 0 end
    stringer(t, Z, nil, v); deck(t, sag, nil, v)
    split(t, 5, sag); splinter(t, 5, 0, "sand3"); P(t, 6, 1, "dirt2")
    P(t, 9, 7, "dirt1"); P(t, 10, 8, "outline"); P(t, 9, 8, "dirt1")
  elseif stage == 1 then
    -- splintering: the middle boards drop 1 px, every board end split, fresh pale splinters, stringer cracked
    local sag = function(x) return (x >= 4 and x <= 11) and 1 or 0 end
    stringer(t, Z, nil, v); deck(t, sag, nil, v)
    for _, x in ipairs({ 1, 5, 9, 13 }) do split(t, x, sag) end
    splinter(t, 5, 0, "sand4"); splinter(t, 9, 0, "sand3"); splinter(t, 10, 0, "sand2"); splinter(t, 2, 0, "sand3")
    P(t, 6, 1, "sand2"); P(t, 8, 2, "sand3")
    LF(8, 6, 9, 8, function(x, y) P(t, x, y, "outline"); P(t, x - 1, y, "sand3") end)
    LF(9, 8, 8, 10, function(x, y) P(t, x, y, "outline") end)
  elseif stage == 2 then
    -- bending: deck bows 3 px into a V, centre seam opening, splinters sticking up
    local sag = function(x) return rnd(3 * bump(x)) end
    local sagS = function(x) return rnd(2 * bump(x)) end
    stringer(t, sagS, function(x) return x == 7 end, v)
    deck(t, sag, function(x) return x == 7 end, v)
    for _, x in ipairs({ 1, 5, 9, 13 }) do split(t, x, sag) end
    for y = sagS(6) + 6, sagS(6) + 9 do P(t, 6, y, "sand2") end
    for y = sagS(8) + 6, sagS(8) + 9 do P(t, 8, y, "sand3") end
    splinter(t, 6, sag(6) - 1, "sand4"); splinter(t, 6, sag(6) - 2, "sand3"); splinter(t, 8, sag(8) - 1, "sand3")
    splinter(t, 9, sag(9) - 1, "sand2"); splinter(t, 4, sag(4) - 1, "sand2")
    P(t, 7, crestY(7) - 1, "ink3")                                          -- water glint through the crack
  elseif stage == 3 then
    -- nearly broken: deck bows 5 px, centre boards snapped, stringer snapped, spray below
    local sag = function(x) return rnd(5 * bump(x)) end
    local sagS = function(x) return rnd(4 * bump(x)) end
    stringer(t, sagS, function(x) return x >= 7 and x <= 8 end, v)
    deck(t, sag, function(x) return x >= 6 and x <= 9 end, v)
    for _, x in ipairs({ 1, 13 }) do split(t, x, sag) end
    -- jagged snapped ends hanging down
    for _, e in ipairs({ { 5, 1 }, { 10, -1 } }) do
      local x, dir = e[1], e[2]
      local d = sag(x)
      splinter(t, x, d - 1, "sand3"); P(t, x, d + 5, "sand2"); P(t, x, d + 6, "sand3"); P(t, x + dir, d + 6, "sand2"); P(t, x, d + 7, "dirt3")
    end
    for _, x in ipairs({ 6, 9 }) do local d = sagS(x); for y = d + 6, d + 9 do P(t, x, y, (y % 2 == 0) and "sand3" or "sand2") end end
    -- spray and churn below the break
    for _, s in ipairs({ { 7, 9, "ink5" }, { 8, 7, "ink4" }, { 6, 11, "ink4" }, { 9, 10, "ink5" }, { 7, 12, "ink4" },
      { 8, 12, "ink5" }, { 6, 13, "ink3" }, { 9, 13, "ink4" } }) do P(t, s[1], s[2], s[3]) end
  elseif stage == "hole" then
    -- boards and stringer broken away; stubs at both edges; churning water higher up in the gap
    for x = 0, TS - 1 do
      for y = 0, TS - 1 do
        local churnTop = 9 + ((x + 1) // 3) % 2
        if y < churnTop then P(t, x, y, "outline")
        elseif y == churnTop then
          local h = H(x, 1, 71)
          P(t, x, y, (h < 0.3) and "ink5" or ((h < 0.55) and "ink4" or "steel3"))
        elseif y == churnTop + 1 then P(t, x, y, (H(x, 2, 72) < 0.4) and "ink4" or "steel2")
        else
          waterPx(t, x, y, 73)
          local h = H(x, y, 74)
          if h < 0.1 then P(t, x, y, "steel2") elseif h < 0.16 then P(t, x, y, "leaf2") elseif h < 0.19 then P(t, x, y, "ink3") end
        end
      end
    end
    -- foam lumps and spray flying up
    for _, s in ipairs({ { 4, 8, "ink4" }, { 5, 7, "ink5" }, { 10, 8, "ink5" }, { 11, 6, "ink4" }, { 7, 5, "ink4" }, { 8, 8, "white" } }) do
      P(t, s[1], s[2], s[3])
    end
    -- floating plank fragment
    for x = 5, 9 do P(t, x, 10, (x == 5) and "dirt3" or "dirt2"); P(t, x, 11, "dirt1") end
    P(t, 6, 10, "dirt3"); P(t, 10, 11, "outline"); P(t, 4, 11, "outline")
    -- stubs: left board (x 0-2) and right board (x 12-14 + gap 15), bent down towards the hole
    local sagL = function(x) return (x == 2) and 1 or 0 end
    local sagR = function(x) return (x == 12) and 1 or 0 end
    stringer(t, Z, function(x) return x >= 2 and x <= 13 end, 0)
    deck(t, sagL, function(x) return x > 2 end, 0)
    deck(t, sagR, function(x) return x < 12 end, 0)
    -- splintered stringer ends
    P(t, 2, 6, "sand3"); P(t, 2, 7, "dirt2"); P(t, 3, 7, "sand2"); P(t, 2, 8, "outline")
    P(t, 13, 8, "sand2"); P(t, 13, 9, "dirt1"); P(t, 12, 9, "sand2"); P(t, 13, 7, "outline")
    -- splintered board ends
    P(t, 3, 2, "sand3"); P(t, 3, 3, "sand2"); P(t, 3, 4, "outline"); P(t, 3, 1, "outline")
    P(t, 11, 3, "sand2"); P(t, 11, 4, "sand3"); P(t, 11, 5, "outline"); P(t, 10, 5, "sand2")
  end
  return t
end

-- pier ends: a thick end post (x 1-4 for _l, x 11-14 for _r) driven down into the water
local function pierEnd(side)
  local t = pier("n", 0)
  local p0 = (side == "l") and 1 or 11
  local oc = (side == "l") and 0 or 15
  for x = (side == "l") and 0 or 11, (side == "l") and 4 or 15 do for y = 0, TS - 1 do P(t, x, y, nil) end end
  for y = 0, TS - 1 do
    local under = y > crestY(p0 + 1)
    local cols = under and { "dirt2", "dirt1", "dirt1", "outline" } or { "dirt4", "dirt3", "dirt3", "dirt2" }
    for i = 0, 3 do P(t, p0 + i, y, cols[i + 1]) end
    if not under and H(p0 + 2, y, 81) < 0.2 then P(t, p0 + 2, y, "dirt2") end
    if under then
      if H(p0, y, 82) < 0.3 then P(t, p0 + 1, y, "leaf2") end
      waterPx(t, oc, y)
    else
      P(t, oc, y, "outline")
    end
  end
  -- post top (end grain) and iron strap
  P(t, p0, 0, "ink5"); P(t, p0 + 1, 0, "ink4"); P(t, p0 + 2, 0, "ink4"); P(t, p0 + 3, 0, "ink3")
  P(t, oc, 0, nil)
  for i = 0, 3 do P(t, p0 + i, 7, (i == 0) and "steel4" or "steel3"); P(t, p0 + i, 8, "steel1") end
  P(t, p0 + 1, 7, "steel5"); P(t, p0 + 2, 9, "dirt3"); P(t, p0 + 2, 10, "dirt2")
  -- ripple ring where the post meets the water
  local cr = crestY(p0 + 1)
  P(t, (side == "l") and 5 or 10, crestY((side == "l") and 5 or 10), "ink4")
  P(t, oc, cr, "ink3")
  return t
end
put(7, ROW, "pier_l", pierEnd("l"), WOOD)
put(8, ROW, "pier_m", pier("n", 0), WOOD)
put(9, ROW, "pier_m2", pier("p", 1), WOOD)
put(10, ROW, "pier_r", pierEnd("r"), WOOD)
put(11, ROW, "pier_stomp", pier("s", 0), STOMP)
put(12, ROW, "pier_crack_f1", pier(1, 0), WOOD)
put(13, ROW, "pier_crack_f2", pier(2, 0), WOOD)
put(14, ROW, "pier_crack_f3", pier(3, 0), WOOD)
put(15, ROW, "pier_hole", pier("hole", 0), WATER)

-- under-pier water (rows 22-23), tiles in both directions
local function underWater(post)
  local t = T()
  for y = 0, TS - 1 do for x = 0, TS - 1 do
    waterPx(t, x, y, 42)
    if H(x // 2, y, 90) < 0.035 then P(t, x, y, "leaf2") end
  end end
  if post then
    local p0 = post
    for y = 0, TS - 1 do
      P(t, p0, y, "dirt2"); P(t, p0 + 1, y, "dirt1"); P(t, p0 + 2, y, "dirt1"); P(t, p0 + 3, y, "outline")
      if H(p0, y, 91) < 0.3 then P(t, p0 + (H(p0, y, 92) < 0.5 and 0 or 1), y, (H(y, 1, 93) < 0.5) and "leaf2" or "olive1") end
    end
    -- barnacle clusters
    P(t, p0, 5, "ink2"); P(t, p0 + 1, 6, "ink2"); P(t, p0, 12, "ink2")
  else
    -- a few drifting bubbles
    P(t, 4, 9, "steel2"); P(t, 5, 6, "steel2"); P(t, 11, 13, "steel2"); P(t, 12, 3, "ink2")
  end
  return t
end
put(16, ROW, "pier_under", underWater(6), WATER)
put(17, ROW, "pier_under2", underWater(nil), WATER)
put(18, ROW, "pier_under_l", underWater(1), WATER)
put(19, ROW, "pier_under_r", underWater(11), WATER)

-- PILINGS (back): 8 px round timber at x 4-11, grey-brown, darker and outline-free
local PILE_COLS = { "ink3", "dirt3", "dirt2", "dirt2", "ink2", "dirt2", "dirt1", "ink1" }
local function pileBody(t, y0, y1, seed)
  for y = y0, y1 do for i = 0, 7 do P(t, 4 + i, y, PILE_COLS[i + 1]) end end
  grainV(t, 5, y0, 9, y1, seed, 0.09)
  for y = y0, y1 do if H(6, y, seed + 2) < 0.06 then P(t, 6, y, "ink2") end end
end
local function pile(kind)
  local t = T()
  if kind == "top" then
    -- broken, rotten top with a cut end; rusty iron band
    pileBody(t, 3, 15, 201)
    local tops = { 4, 3, 3, 4, 5, 5, 6, 6 }
    for i = 0, 7 do
      local x = 4 + i
      for y = 0, tops[i + 1] - 1 do P(t, x, y, nil) end
      P(t, x, tops[i + 1], (i < 3) and "dirt4" or "dirt3")
      P(t, x, tops[i + 1] + 1, (i < 4) and "dirt3" or "dirt2")
    end
    P(t, 6, 4, "sand2"); P(t, 10, 6, "dirt2")
    for i = 0, 7 do P(t, 4 + i, 10, (i < 2) and "steel3" or "steel2"); P(t, 4 + i, 11, "steel1") end
    P(t, 7, 12, "dirt3"); P(t, 7, 13, "dirt2"); P(t, 9, 12, "dirt2")
  elseif kind == "mid" or kind == "mid2" then
    pileBody(t, 0, 15, (kind == "mid") and 202 or 203)
    if kind == "mid2" then
      -- moss band and barnacles
      for y = 3, 11 do for i = 0, 7 do
        local h = H(i, y, 204)
        local inBand = (y >= 5 and y <= 9) or h < 0.25
        if inBand and h < 0.6 then P(t, 4 + i, y, (i < 3) and "olive2" or ((h < 0.3) and "leaf1" or "leaf2")) end
      end end
      for _, d in ipairs({ { 5, 12 }, { 6, 4 }, { 9, 6 }, { 5, 7 } }) do P(t, 4, d[2] + 1, "olive1") end
      -- hanging moss strands
      for _, s in ipairs({ { 6, 10, 13 }, { 9, 10, 14 } }) do for y = s[2], s[3] do P(t, s[1], y, (y % 2 == 0) and "leaf2" or "olive2") end end
      for _, b in ipairs({ { 5, 13 }, { 8, 12 }, { 7, 2 }, { 10, 3 }, { 6, 14 } }) do P(t, b[1], b[2], "ink4"); P(t, b[1], b[2] + 1, "ink2") end
    else
      for y = 6, 7 do for i = 0, 7 do P(t, 4 + i, y, (y == 6) and ((i < 2) and "steel3" or "steel2") or "steel1") end end
      P(t, 6, 8, "dirt3"); P(t, 6, 9, "dirt2")
    end
  elseif kind == "wl" then
    -- post at the waterline: top 2 px transparent beside the post, crest at y 2-3, tea-green water below
    for x = 0, TS - 1 do
      local cr = 2 + ((x // 4) % 2)
      for y = cr, TS - 1 do
        local c
        if y == cr then c = (H(x, 0, 210) < 0.3) and "steel3" or "leaf2"
        elseif y <= cr + 3 then c = (H(x, y, 211) < 0.12) and "steel2" or "leaf2"
        else c = "leaf1"; if H(x, y, 212) < 0.08 then c = "steel1" elseif H(x, y, 212) > 0.94 then c = "leaf2" end end
        P(t, x, y, c)
      end
    end
    pileBody(t, 0, 3, 205)
    local under = { "dirt2", "dirt1", "dirt1", "dirt1", "ink1", "dirt1", "outline", "outline" }
    for y = 4, TS - 1 do for i = 0, 7 do P(t, 4 + i, y, under[i + 1]) end end
    for y = 6, 14, 3 do P(t, 5, y, "leaf2") end
    -- ripple ring
    P(t, 3, 2, "ink4"); P(t, 2, 3, "steel3"); P(t, 12, 3, "ink4"); P(t, 13, 3, "steel3"); P(t, 14, 2, "steel3")
    for i = 0, 7 do P(t, 4 + i, 3, (i < 4) and "steel3" or "steel2") end
    P(t, 5, 3, "ink4")
  end
  return t
end
put(20, ROW, "pile_top", pile("top"), {})
put(21, ROW, "pile_mid", pile("mid"), {})
put(22, ROW, "pile_mid2", pile("mid2"), {})
put(23, ROW, "pile_wl", pile("wl"), {})

-- ROOF (OW metal): rusted corrugated tin seen from the side, top 8 px; drip shadow below.
local function roof(kind, v)
  local t = T()
  local s = 300 + v * 5
  for x = 0, TS - 1 do
    local k = x % 4
    P(t, x, 0, (H(x, 0, s) < 0.2) and "ink5" or ((k == 1) and "steel4" or "steel3"))
    P(t, x, 1, (k == 1) and "steel4" or ((k == 0) and "steel2" or "steel3"))
    for y = 2, 4 do P(t, x, y, ({ [0] = "steel1", [1] = "steel3", [2] = "steel2", [3] = "steel2" })[k]) end
    P(t, x, 5, (k == 1) and "steel2" or "steel1")
    P(t, x, 6, (k == 1) and "dirt3" or "dirt2")
    P(t, x, 7, "outline")
    if x % 2 == 0 then P(t, x, 8, "outline") end
    -- rust blooms and streaks
    for y = 1, 6 do
      local h = H(x, y, s + 1)
      if h < 0.2 then P(t, x, y, (y < 3) and "dirt3" or "dirt2") elseif h < 0.23 then P(t, x, y, "dirt1") end
    end
  end
  for x = 0, TS - 1 do
    if H(x, 9, s + 2) < 0.22 then
      local len = 2 + math.floor(H(x, 10, s + 2) * 4)
      for y = 1, math.min(6, len + 1) do P(t, x, y, (y < 3) and "dirt3" or "dirt2") end
    end
  end
  if v == 1 then
    -- patched sheet: an overlapping riveted plate
    for x = 5, 11 do for y = 0, 6 do
      local k = (x + 2) % 4
      P(t, x, y, (y == 0) and "steel4" or (((k == 1) and "steel3" or "steel2")))
      if H(x, y, 333) < 0.12 then P(t, x, y, "dirt2") end
    end end
    for y = 0, 6 do P(t, 4, y, "outline") end
    for _, rv in ipairs({ { 6, 1 }, { 10, 1 }, { 6, 5 }, { 10, 5 } }) do P(t, rv[1], rv[2], "steel5") end
  end
  if kind == "l" then
    P(t, 0, 0, nil); P(t, 0, 8, nil)
    for y = 1, 7 do P(t, 0, y, "outline") end
    P(t, 1, 0, "outline"); P(t, 1, 1, "steel5"); P(t, 1, 2, "steel4"); P(t, 1, 3, "steel3")
  elseif kind == "r" then
    P(t, 15, 0, nil)
    for y = 1, 7 do P(t, 15, y, "outline") end
    P(t, 14, 0, "outline"); P(t, 14, 1, "steel2"); P(t, 14, 2, "steel1"); P(t, 14, 3, "steel1")
    -- bent corner hanging off the eave
    P(t, 14, 8, "steel2"); P(t, 15, 8, "outline"); P(t, 14, 9, "dirt2"); P(t, 13, 8, "outline"); P(t, 14, 10, "outline")
  elseif kind == "hole" then
    -- torn through: ragged gap, top lip bent, flaps curling down under the eave
    local gap = { [4] = { 3, 6 }, [5] = { 2, 7 }, [6] = { 1, 7 }, [7] = { 2, 8 }, [8] = { 1, 7 }, [9] = { 2, 7 }, [10] = { 3, 6 }, [11] = { 4, 5 } }
    for x, g in pairs(gap) do for y = g[1], g[2] do P(t, x, y, nil) end end
    for x = 5, 9 do P(t, x, 8, nil) end
    P(t, 7, 0, nil); P(t, 8, 0, "steel2")
    -- flaps
    L(t, 4, 8, 4, 11, "steel2"); P(t, 4, 8, "steel3"); P(t, 5, 11, "dirt2")
    L(t, 11, 7, 12, 10, "steel3"); P(t, 12, 11, "dirt2")
    edgeOutline(t, 0, 0, 15, 12)
    P(t, 6, 1, "steel5"); P(t, 9, 1, "dirt4")
  end
  return t
end
put(24, ROW, "mroof_l", roof("l", 0), OWM)
put(25, ROW, "mroof_m", roof("m", 0), OWM)
put(26, ROW, "mroof_m2", roof("m", 1), OWM)
put(27, ROW, "mroof_r", roof("r", 0), OWM)
put(28, ROW, "mroof_hole", roof("hole", 0), OWM)

-- BEAMS (back): heavy grey-brown timbers, bolted
local function beam(kind)
  local t = T()
  if kind == "h" then
    for x = 0, TS - 1 do
      P(t, x, 4, "ink3"); for y = 5, 9 do P(t, x, y, "dirt2") end; P(t, x, 10, "dirt1"); P(t, x, 11, "ink1")
    end
    grainH(t, 0, 5, 15, 9, 401, 0.12)
    for x = 5, 10 do P(t, x, 5, "steel2"); P(t, x, 9, "steel1") end
    for y = 5, 9 do P(t, 5, y, "steel2"); P(t, 10, y, "steel1") end
    for x = 6, 9 do for y = 6, 8 do P(t, x, y, "steel1") end end
    P(t, 6, 6, "steel3"); P(t, 9, 6, "steel3"); P(t, 6, 8, "steel2"); P(t, 9, 8, "steel2")
    P(t, 7, 10, "dirt3"); P(t, 8, 10, "dirt2")
  elseif kind == "v" then
    for y = 0, TS - 1 do
      P(t, 4, y, "ink3"); P(t, 5, y, "dirt3"); for x = 6, 9 do P(t, x, y, "dirt2") end; P(t, 10, y, "dirt1"); P(t, 11, y, "ink1")
    end
    grainV(t, 6, 0, 9, 15, 402, 0.1)
    P(t, 6, 4, "steel3"); P(t, 7, 5, "ink1"); P(t, 8, 11, "steel3"); P(t, 9, 12, "ink1")
  else
    -- diagonal brace, bottom-left corner to top-right corner (chains diagonally)
    for y = 0, TS - 1 do for x = 0, TS - 1 do
      local u = x + y - 15
      if u >= -3 and u <= 3 then
        local c = ({ [-3] = "ink3", [-2] = "dirt3", [-1] = "dirt2", [0] = "dirt2", [1] = "dirt2", [2] = "dirt1", [3] = "ink1" })[u]
        if (u == -1 or u == 0) and H(x - y, 0, 403) < 0.18 then c = "dirt1" end
        P(t, x, y, c)
      end
    end end
    P(t, 7, 8, "steel3"); P(t, 8, 8, "ink1")
  end
  return t
end
put(29, ROW, "mbeam_h", beam("h"), {})
put(30, ROW, "mbeam_v", beam("v"), {})
put(31, ROW, "mbeam_x", beam("x"), {})

---------------------------------------------------------------------------------------------------
-- Row 1: mill walls, chains, waterwheel frame, den
ROW = 1

-- MILL WALL boards: vertical boards (seams at x 0, 5, 10), each board grey (ink) or brown (dirt) weathered.
-- Board tones are fixed per column so the wall continues seamlessly in both directions.
local WSEAM = { [0] = true, [5] = true, [10] = true }
local function boardOf(x) if x < 5 then return 0 elseif x < 10 then return 1 else return 2 end end
local BOARD_GREY = { [0] = true, [1] = false, [2] = true }
local function wallBase(t, seed)
  for y = 0, TS - 1 do for x = 0, TS - 1 do
    local c
    if WSEAM[x] then
      c = (H(x, y, seed + 9) < 0.25) and "outline" or "ink1"
    else
      local grey = BOARD_GREY[boardOf(x)]
      if WSEAM[x - 1] then c = grey and "ink3" or "dirt3"
      elseif WSEAM[(x + 1) % 16] then c = grey and "ink1" or "dirt1"
      else c = grey and "ink2" or "dirt2" end
      if not WSEAM[x - 1] and H(x, y // 2, seed + 3) < 0.1 then c = grey and "ink1" or "dirt1" end
      if grey and not WSEAM[x - 1] and H(x // 2, y // 3, seed + 12) < 0.35 then c = (c == "ink1") and "dirt1" or "dirt2" end
      if WSEAM[x - 1] and H(x, y, seed + 4) < 0.15 then c = grey and "ink2" or "dirt2" end
    end
    P(t, x, y, c)
  end end
  -- rain streaks running down the boards
  for x = 0, TS - 1 do
    if not WSEAM[x] and H(x, 0, seed + 5) < 0.18 then
      local y0 = math.floor(H(x, 1, seed + 5) * 12)
      local len = 3 + math.floor(H(x, 2, seed + 5) * 6)
      for y = y0, math.min(15, y0 + len) do darken(t, x, y) end
    end
  end
  -- wet glints and nails (nailers at y 3 and y 12)
  for _, bx in ipairs({ 2, 7, 12 }) do P(t, bx, 3, "ink3"); P(t, bx, 12, "ink3"); P(t, bx, 4, "ink1") end
  for y = 0, TS - 1 do for x = 0, TS - 1 do if H(x, y, seed + 6) < 0.02 and not WSEAM[x] then P(t, x, y, "ink3") end end end
end
local function wall(part, kind, v)
  local t = T()
  wallBase(t, 700 + v * 11 + (part == "t" and 1 or (part == "b" and 2 or 0)))
  if part == "t" then
    -- top plate under the eave
    for x = 0, TS - 1 do
      P(t, x, 0, "ink3"); P(t, x, 1, "dirt3"); P(t, x, 2, "dirt2"); P(t, x, 3, "dirt2"); P(t, x, 4, "dirt1")
      P(t, x, 5, (x % 2 == 0) and "outline" or "ink1")
    end
    grainH(t, 0, 2, 15, 3, 710, 0.12)
    P(t, 7, 2, "ink4"); P(t, 8, 3, "outline")
  elseif part == "b" then
    -- water stain and algae line above the sill
    for y = 6, 10 do for x = 0, TS - 1 do
      local h = H(x, y, 720)
      if y >= 8 then
        if h < 0.55 then P(t, x, y, (h < 0.2) and "olive2" or ((h < 0.4) and "leaf1" or "olive1")) end
      elseif (x + y) % 2 == 0 then darken(t, x, y) end
    end end
    for x = 0, TS - 1 do
      P(t, x, 11, "ink3"); P(t, x, 12, "dirt2"); P(t, x, 13, "dirt2"); P(t, x, 14, "dirt1"); P(t, x, 15, "ink1")
      if H(x, 11, 721) < 0.25 then P(t, x, 11, "olive2") end
    end
    grainH(t, 0, 12, 15, 13, 722, 0.12)
  end
  if kind == "l" then
    for y = (part == "t") and 5 or 0, (part == "b") and 10 or 15 do
      P(t, 0, y, "ink3"); P(t, 1, y, "dirt3"); P(t, 2, y, "dirt2"); P(t, 3, y, "ink1")
      if H(1, y, 730) < 0.15 then P(t, 1, y, "dirt2") end
    end
    P(t, 0, 0, (part == "t") and "dirt3" or "ink3")
  elseif kind == "r" then
    for y = (part == "t") and 5 or 0, (part == "b") and 10 or 15 do
      P(t, 12, y, "ink3"); P(t, 13, y, "dirt2"); P(t, 14, y, "dirt2"); P(t, 15, y, "ink1")
      if H(13, y, 731) < 0.15 then P(t, 13, y, "dirt1") end
    end
  end
  if v == 1 and part == "m" then
    -- a weathered patch board nailed across
    for x = 1, 14 do
      P(t, x, 6, "dirt3"); P(t, x, 7, "dirt2"); P(t, x, 8, "dirt2"); P(t, x, 9, "dirt1")
      P(t, x, 10, (x % 2 == 0) and "outline" or "ink1")
    end
    grainH(t, 1, 7, 14, 8, 740, 0.14)
    P(t, 1, 6, "ink3"); P(t, 14, 7, "dirt1"); P(t, 14, 8, "dirt1")
    P(t, 2, 7, "ink4"); P(t, 13, 7, "ink3"); P(t, 2, 8, "dirt1")
  end
  return t
end
put(0, ROW, "mwall_tl", wall("t", "l", 0), {})
put(1, ROW, "mwall_tm", wall("t", "m", 0), {})
put(2, ROW, "mwall_tr", wall("t", "r", 0), {})
put(3, ROW, "mwall_ml", wall("m", "l", 0), {})
put(4, ROW, "mwall_mm", wall("m", "m", 0), {})
put(5, ROW, "mwall_mr", wall("m", "r", 0), {})
put(6, ROW, "mwall_bl", wall("b", "l", 0), {})
put(7, ROW, "mwall_bm", wall("b", "m", 0), {})
put(8, ROW, "mwall_br", wall("b", "r", 0), {})
put(9, ROW, "mwall_mm2", wall("m", "m", 1), {})

-- broken walls: missing boards, dark interior with a girt beam inside, splintered board ends
local function dark(t, x, y)
  P(t, x, y, "outline")
end
local function brokenWall(v)
  local t = wall("m", "m", 0)
  if v == 0 then
    -- middle board gone from y 2 to y 13 (jagged), right board's lower half gone
    local top = { [6] = 3, [7] = 2, [8] = 4, [9] = 3 }
    local bot = { [6] = 12, [7] = 13, [8] = 11, [9] = 12 }
    for x = 5, 10 do
      local t0, b0 = top[x] or 4, bot[x] or 11
      for y = t0, b0 do dark(t, x, y) end
      if top[x] then P(t, x, t0 - 1, "dirt3"); P(t, x, b0 + 1, "dirt3") end
    end
    for x = 11, 14 do
      local t0 = 8 + ((x * 3) % 3)
      for y = t0, 13 do dark(t, x, y) end
      P(t, x, t0 - 1, (x == 11) and "ink4" or "ink3")
    end
    -- interior girt and a hint of the far side
    for x = 5, 14 do if A(t, x, 7) and G(t, x, 7) == "outline" then P(t, x, 7, "ink1") end end
    for x = 5, 14 do if G(t, x, 8) == "outline" then P(t, x, 8, (x % 2 == 0) and "ink1" or "outline") end end
    P(t, 7, 11, "leaf1"); P(t, 12, 12, "leaf1")
  else
    -- ragged diagonal hole through the left two boards, one board hanging askew
    for y = 1, 14 do for x = 0, 11 do
      local cx, cy = 5.5, 8
      local dx, dy = (x - cx) / 5.2, (y - cy) / 6.4
      local n = H(x, y, 760) * 0.25
      if dx * dx + dy * dy + n < 1 then dark(t, x, y) end
    end end
    edgeOutline(t, 0, 0, 15, 15, "outline")
    -- fresh splinters at the hole rim (lit lower-right side of the hole)
    for y = 1, 14 do for x = 1, 12 do
      if G(t, x, y) ~= "outline" and G(t, x - 1, y) == "outline" and H(x, y, 761) < 0.5 then P(t, x, y, "dirt3") end
    end end
    -- dangling board
    LF(3, 2, 7, 14, function(x, y) P(t, x, y, "ink2"); P(t, x + 1, y, "ink3"); P(t, x + 2, y, "ink1") end)
    P(t, 3, 2, "ink4"); P(t, 4, 2, "ink3"); P(t, 8, 14, "dirt3"); P(t, 7, 14, "sand2")
    P(t, 4, 3, "ink4")                                                       -- the one remaining nail
    for x = 1, 10 do if G(t, x, 10) == "outline" then P(t, x, 10, "ink1") end end
  end
  return t
end
put(10, ROW, "mwall_broken_a", brokenWall(0), {})
put(11, ROW, "mwall_broken_b", brokenWall(1), {})

-- broken window: timber frame, dark interior, glass shards, a snapped muntin
do
  local t = wall("m", "m", 0)
  for y = 2, 13 do for x = 2, 13 do P(t, x, y, "dirt2") end end
  for x = 2, 13 do P(t, x, 2, "ink3"); P(t, x, 3, "dirt2"); P(t, x, 12, "ink3"); P(t, x, 13, "dirt1") end
  P(t, 1, 12, "ink3"); P(t, 14, 12, "dirt3"); P(t, 1, 13, "dirt1"); P(t, 14, 13, "ink1")
  for y = 3, 11 do P(t, 2, y, "dirt3"); P(t, 3, y, "dirt2"); P(t, 12, y, "dirt2"); P(t, 13, y, "dirt1") end
  for y = 4, 11 do for x = 4, 11 do P(t, x, y, "outline") end end
  for x = 4, 11 do if x % 2 == 0 then P(t, x, 11, "ink1") end end
  -- muntin cross, lower half snapped away
  for y = 4, 7 do P(t, 7, y, "dirt2"); P(t, 8, y, "dirt1") end
  P(t, 7, 8, "dirt3"); P(t, 8, 8, "dirt2")
  for x = 4, 6 do P(t, x, 7, "dirt2") end
  -- glass shards left in the corners
  for _, s in ipairs({ { 4, 4 }, { 5, 4 }, { 6, 4 }, { 4, 5 }, { 5, 5 }, { 4, 6 } }) do P(t, s[1], s[2], "steel2") end
  P(t, 4, 4, "steel3"); P(t, 5, 4, "steel3")
  for _, s in ipairs({ { 11, 9 }, { 11, 10 }, { 10, 10 }, { 11, 11 }, { 10, 11 }, { 9, 11 } }) do P(t, s[1], s[2], "steel1") end
  P(t, 11, 9, "steel3"); P(t, 10, 4, "steel2"); P(t, 11, 4, "steel2"); P(t, 11, 5, "steel1")
  P(t, 6, 13, "steel2"); P(t, 9, 12, "ink4")                                 -- shard on the sill
  put(12, ROW, "mwall_win", t, {})
end

-- claw gouges: dark core, shadowed upper-left wall, fresh pale wood on the lit lower-right wall, tapered ends
local function gouge(t, x0, y0, x1, y1)
  local pts = {}
  LF(x0, y0, x1, y1, function(x, y) pts[#pts + 1] = { x, y } end)
  local n = #pts
  for i, p in ipairs(pts) do
    local f = (i - 1) / math.max(1, n - 1)
    local x, y = p[1], p[2]
    if f > 0.14 and f < 0.86 then
      local deep = f > 0.28 and f < 0.72
      P(t, x - 1, y, "ink1"); P(t, x, y, "outline"); P(t, x + 1, y, "outline")
      P(t, x + 2, y, deep and "sand3" or "dirt4"); P(t, x + 3, y, deep and "dirt4" or "dirt3")
    else
      P(t, x, y, "ink1"); P(t, x + 1, y, "outline"); P(t, x + 2, y, "dirt3")
    end
  end
end
do
  local t = wall("m", "m", 0)
  gouge(t, 7, 1, 1, 14); gouge(t, 12, 1, 6, 14)
  gouge(t, 16, 3, 11, 13)
  P(t, 3, 15, "dirt3"); P(t, 10, 0, "sand2")
  put(13, ROW, "mwall_claw_a", t, {})
end
do
  local t = wall("m", "m", 0)
  gouge(t, 0, 4, 3, 13); gouge(t, 5, 1, 8, 14); gouge(t, 10, 2, 12, 12)
  P(t, 9, 13, "dirt3"); P(t, 12, 12, "sand2")
  put(14, ROW, "mwall_claw_b", t, {})
end

-- CHAINS: links period 8 px (vertically seamless); face-on oval link + edge-on link
local function chainCol(t, y0, y1, lit, mid, shade, rust, front)
  for y = y0, y1 do
    local p = y % 8
    -- edge-on link B (rows 4..9 mod 8), drawn first
    if p >= 4 or p <= 1 then P(t, 7, y, mid); P(t, 8, y, shade) end
  end
  for y = y0, y1 do
    local p = y % 8
    if p == 0 then P(t, 7, y, lit); P(t, 8, y, mid)
    elseif p >= 1 and p <= 4 then
      P(t, 6, y, lit); P(t, 9, y, shade)
      if p == 4 then P(t, 7, y, shade); P(t, 8, y, shade) end
    elseif p == 5 then P(t, 7, y, shade); P(t, 8, y, front and "outline" or "steel1") end
  end
  for y = y0, y1 do for x = 6, 9 do
    if A(t, x, y) and H(x, y, 800 + (front and 1 or 0)) < 0.18 then P(t, x, y, rust) end
  end end
end
do
  local t = T(); chainCol(t, 0, 15, "steel3", "steel2", "steel1", "dirt2", false)
  put(15, ROW, "mchain", t, {})
end
do
  local t = T(); chainCol(t, 0, 7, "steel3", "steel2", "steel1", "dirt2", false)
  -- eye ring, shank and a big rusty J hook
  for y = 8, 9 do P(t, 6, y, "steel3"); P(t, 9, y, "steel1") end
  P(t, 7, 10, "steel2"); P(t, 8, 10, "steel1")
  for y = 11, 13 do P(t, 7, y, "steel3"); P(t, 8, y, "steel1") end
  P(t, 6, 14, "steel3"); P(t, 7, 14, "steel2"); P(t, 8, 14, "steel1")
  for x = 3, 6 do P(t, x, 15, (x == 3) and "steel2" or "steel1") end
  P(t, 3, 14, "steel3"); P(t, 2, 14, "steel2")
  P(t, 2, 13, "steel3"); P(t, 3, 13, "steel2"); P(t, 2, 12, "steel4")
  P(t, 5, 14, "dirt3"); P(t, 8, 12, "dirt2"); P(t, 4, 15, "dirt2")
  put(16, ROW, "mchain_hook", t, {})
end
do
  local t = T(); chainCol(t, 0, 15, "steel2", "steel1", "outline", "dirt1", true)
  put(17, ROW, "mchain_front", t, {})
end

-- WATERWHEEL FRAME (back): 10 px timber upright (x 3-12); top cap beam at y 4-11 lines up with mbeam_h
local UP = { "ink3", "dirt3", "dirt2", "dirt2", "dirt2", "ink2", "dirt2", "dirt2", "dirt1", "ink1" }
local function upright(t, y0, y1, seed)
  for y = y0, y1 do for i = 0, 9 do P(t, 3 + i, y, UP[i + 1]) end end
  grainV(t, 5, y0, 10, y1, seed, 0.08)
end
local function strap(t, y)
  for i = 0, 9 do P(t, 3 + i, y, (i < 2) and "steel3" or "steel2"); P(t, 3 + i, y + 1, "steel1") end
  P(t, 5, y, "steel4"); P(t, 10, y, "steel3")
  P(t, 6, y + 2, "dirt3"); P(t, 6, y + 3, "dirt2"); P(t, 10, y + 2, "dirt2")
end
do
  local t = T()
  upright(t, 1, 15, 901)
  for i = 0, 9 do P(t, 3 + i, 0, nil) end
  for i = 1, 8 do P(t, 3 + i, 1, (i < 4) and "dirt4" or "dirt3") end
  for x = 0, TS - 1 do
    P(t, x, 4, "ink3"); for y = 5, 9 do P(t, x, y, "dirt2") end; P(t, x, 10, "dirt1"); P(t, x, 11, "ink1")
  end
  grainH(t, 0, 5, 15, 9, 902, 0.12)
  -- pegged joint
  P(t, 5, 6, "dirt4"); P(t, 6, 7, "dirt1"); P(t, 10, 6, "dirt4"); P(t, 11, 7, "dirt1")
  put(18, ROW, "wwframe_t", t, {})
end
do
  local t = T(); upright(t, 0, 15, 903); strap(t, 6)
  put(19, ROW, "wwframe_m", t, {})
end
do
  local t = T(); upright(t, 0, 15, 904)
  -- soaked, slimy foot: darker, algae and moss
  for y = 6, 15 do for i = 0, 9 do
    local x = 3 + i
    if (x + y) % 2 == 0 or y > 10 then darken(t, x, y) end
    local h = H(x, y, 905)
    if y > 8 and h < 0.3 then P(t, x, y, (h < 0.12) and "olive2" or "leaf1") end
  end end
  for _, s in ipairs({ { 4, 3, 7 }, { 7, 4, 9 }, { 11, 5, 8 } }) do for y = s[2], s[3] do P(t, s[1], y, (y % 2 == 0) and "leaf2" or "olive2") end end
  strap(t, 2)
  put(20, ROW, "wwframe_b", t, {})
end
do
  local t = T(); upright(t, 0, 15, 906)
  -- iron pillow block bearing with the axle hub
  for y = 3, 12 do for x = 1, 14 do P(t, x, y, "steel2") end end
  for x = 1, 14 do P(t, x, 3, "steel3"); P(t, x, 12, "steel1") end
  for y = 3, 12 do P(t, 1, y, "steel3"); P(t, 14, y, "steel1") end
  P(t, 1, 3, "steel4")
  for _, b in ipairs({ { 2, 4 }, { 13, 4 }, { 2, 11 }, { 13, 11 } }) do P(t, b[1], b[2], "steel4"); P(t, b[1], b[2] + 0, "steel4") end
  P(t, 13, 4, "steel3"); P(t, 13, 11, "steel3")
  for y = 0, 15 do for x = 0, 15 do
    local dx, dy = x - 7.5, y - 7.5
    local r = math.sqrt(dx * dx + dy * dy)
    if r <= 4.2 then
      local c = "steel1"
      if r <= 2.6 then c = (dx + dy < -1) and "steel3" or "steel2" end
      if r <= 1.2 then c = "outline" end
      if r > 3.2 and dx + dy < -2 then c = "steel3" end
      P(t, x, y, c)
    end
  end end
  for y = 3, 12 do for x = 1, 14 do if H(x, y, 907) < 0.14 and G(t, x, y) == "steel2" then P(t, x, y, "dirt2") end end end
  P(t, 8, 12, "outline"); P(t, 8, 13, "outline"); P(t, 8, 14, "ink1")                -- grease drip
  P(t, 4, 9, "red2"); P(t, 11, 5, "dirt3")
  put(21, ROW, "wwframe_axle", t, {})
end

-- DEN ROCK (back): wet dark stones, toroidal cells so it tiles in both directions. Each stone is bevelled:
-- lit wet rim on the top-left, shadow on the bottom-right, dark cracks between stones.
local function rockFill(t, seed, yStart)
  local cells = {}
  for i = 1, 5 do cells[i] = { H(i, 1, seed) * 16, H(i, 2, seed) * 16 } end
  local function owner(x, y)
    x, y = x % 16, y % 16
    local d1, d2, o = 99, 99, 0
    for i, c in ipairs(cells) do
      local dx = ((x + 0.5 - c[1] + 8) % 16) - 8
      local dy = ((y + 0.5 - c[2] + 8) % 16) - 8
      local d = math.sqrt(dx * dx + dy * dy)
      if d < d1 then d2 = d1; d1 = d; o = i elseif d < d2 then d2 = d end
    end
    return o, d2 - d1
  end
  for y = yStart or 0, TS - 1 do for x = 0, TS - 1 do
    local o, edge = owner(x, y)
    local c
    if edge < 0.8 then c = "outline"
    else
      local ul1 = owner(x - 1, y - 1) ~= o or owner(x, y - 1) ~= o
      local ul2 = owner(x - 2, y - 2) ~= o
      local dr1 = owner(x + 1, y + 1) ~= o or owner(x + 1, y) ~= o
      local dr2 = owner(x + 2, y + 2) ~= o
      c = "ink1"
      if ul1 then c = (H(x, y, seed + 7) < 0.4) and "ink3" or "ink2"
      elseif ul2 then c = "ink2"
      elseif dr1 then c = "outline"
      elseif dr2 then c = ((x + y) % 2 == 0) and "steel1" or "ink1"
      elseif H(x, y, seed + 9) < 0.08 then c = "ink2" end
      if dr2 and H(x, y, seed + 8) < 0.15 then c = "leaf1" end                -- green bounce light
    end
    P(t, x, y, c)
  end end
end
do local t = T(); rockFill(t, 1001); put(22, ROW, "den_rock_a", t, {}) end
do local t = T(); rockFill(t, 1002); put(23, ROW, "den_rock_b", t, {}) end
do
  local t = T()
  rockFill(t, 1001)
  for x = 0, TS - 1 do
    local top = 3 + rnd(1.4 * math.sin(x / 16 * 2 * math.pi + 1.1) + 0.8 * math.sin(x / 16 * 6 * math.pi))
    for y = 0, top - 1 do P(t, x, y, nil) end
    P(t, x, top, (H(x, 0, 1010) < 0.3) and "ink4" or "ink3")
    P(t, x, top + 1, "ink2")
    -- moss tufts
    if H(x, 1, 1011) < 0.3 then P(t, x, top, "olive2"); if H(x, 2, 1011) < 0.5 then P(t, x, top - 1, "leaf2") end end
  end
  put(24, ROW, "den_rock_top", t, {})
end
-- reactor-glow seams: self-contained cracks (tapered ends) over den_rock_a
local function glowCrack(t, paths)
  local core = {}
  for _, pts in ipairs(paths) do
    for i = 1, #pts - 1 do
      local a, b = pts[i], pts[i + 1]
      local hot = not (i == 1 or i == #pts - 1)
      LF(a[1], a[2], b[1], b[2], function(x, y) core[x + y * 16] = { x, y, hot or core[x + y * 16] and core[x + y * 16][3] } end)
    end
  end
  -- halo
  for _, c in pairs(core) do
    for dy = -2, 2 do for dx = -2, 2 do
      local x, y = c[1] + dx, c[2] + dy
      if not core[x + y * 16] and x >= 0 and y >= 0 and x < 16 and y < 16 then
        local m = math.abs(dx) + math.abs(dy)
        if m == 1 and c[3] then P(t, x, y, "weird4")
        elseif m <= 2 and H(x, y, 1020) < 0.55 and G(t, x, y) ~= "weird4" then
          P(t, x, y, (G(t, x, y) == "outline") and "leaf1" or "leaf2")
        end
      end
    end end
  end
  for _, c in pairs(core) do P(t, c[1], c[2], c[3] and "weird5" or "weird4") end
end
do
  local t = T(); rockFill(t, 1001)
  glowCrack(t, { { { 3, 2 }, { 5, 5 }, { 7, 7 }, { 8, 10 }, { 11, 13 } }, { { 7, 7 }, { 10, 6 }, { 12, 4 } } })
  put(25, ROW, "den_glow_a", t, {})
end
do
  local t = T(); rockFill(t, 1002)
  glowCrack(t, { { { 2, 9 }, { 5, 8 }, { 7, 10 }, { 10, 8 }, { 13, 9 } }, { { 7, 10 }, { 6, 13 } }, { { 10, 8 }, { 11, 5 } } })
  put(26, ROW, "den_glow_b", t, {})
end

-- REGIME PIPES (back): rusty steel, flange with bolts, a glowing sludge leak at the joint
local function pipeH(leak)
  local t = T()
  for x = 0, TS - 1 do
    P(t, x, 4, "steel3"); P(t, x, 5, (x % 5 == 1) and "steel4" or "steel3")
    P(t, x, 6, "steel2"); P(t, x, 7, "steel2"); P(t, x, 8, "steel2"); P(t, x, 9, "steel1"); P(t, x, 10, "steel1"); P(t, x, 11, "ink1")
    for y = 5, 10 do if H(x, y, 1101) < 0.14 then P(t, x, y, (y < 7) and "dirt3" or "dirt2") end end
  end
  for y = 3, 12 do
    P(t, 11, y, (y == 3) and "steel4" or "steel3"); P(t, 12, y, "steel2"); P(t, 13, y, "steel2"); P(t, 14, y, "steel1")
  end
  P(t, 12, 4, "steel4"); P(t, 12, 11, "steel3"); P(t, 13, 12, "ink1"); P(t, 14, 12, "ink1")
  P(t, 3, 11, "dirt2"); P(t, 3, 12, "dirt1"); P(t, 7, 11, "dirt2")
  if leak then
    -- glowing sludge seeping from the flange joint
    P(t, 14, 12, "weird4"); P(t, 14, 13, "weird5"); P(t, 14, 14, "weird4"); P(t, 13, 13, "leaf3"); P(t, 15, 13, "leaf2")
    P(t, 12, 13, "leaf2"); P(t, 15, 12, "leaf3")
  else
    P(t, 13, 13, "dirt2"); P(t, 13, 14, "dirt1")
  end
  return t
end
put(27, ROW, "den_pipe_h", pipeH(false), {})
put(18, 2, "den_pipe_leak", pipeH(true), {})
do
  local t = T()
  for y = 0, TS - 1 do
    P(t, 4, y, "steel3"); P(t, 5, y, (y % 5 == 1) and "steel4" or "steel3")
    P(t, 6, y, "steel2"); P(t, 7, y, "steel2"); P(t, 8, y, "steel2"); P(t, 9, y, "steel1"); P(t, 10, y, "steel1"); P(t, 11, y, "ink1")
    for x = 5, 10 do if H(x, y, 1103) < 0.14 then P(t, x, y, (x < 7) and "dirt3" or "dirt2") end end
  end
  for x = 3, 12 do
    P(t, x, 9, (x == 3) and "steel4" or "steel3"); P(t, x, 10, "steel2"); P(t, x, 11, "steel1"); P(t, x, 12, "ink1")
  end
  P(t, 4, 10, "steel4"); P(t, 11, 10, "steel3")
  -- rust run from the flange
  for y = 13, 15 do P(t, 8, y, "dirt2") end; P(t, 9, 13, "dirt3")
  put(28, ROW, "den_pipe_v", t, {})
end

-- hazard band (back): weathered yellow/black stripes between steel rails, period 8 (seamless)
do
  local t = T()
  for x = 0, TS - 1 do
    P(t, x, 3, "steel3"); P(t, x, 4, "steel1")
    for y = 5, 10 do
      local on = ((x + y) // 4) % 2 == 0
      local c = on and ((y >= 9) and "fire3" or "fire4") or "outline"
      if H(x, y, 1201) < 0.1 then c = on and "dirt2" or "ink1" end
      P(t, x, y, c)
    end
    P(t, x, 11, "steel2"); P(t, x, 12, "steel1")
    if H(x, 13, 1202) < 0.2 then P(t, x, 13, "dirt2"); if H(x, 14, 1202) < 0.5 then P(t, x, 14, "dirt1") end end
  end
  for _, rx in ipairs({ 3, 11 }) do P(t, rx, 3, "steel4"); P(t, rx, 11, "steel3") end
  put(29, ROW, "danger_band", t, {})
end

-- BONES (back): bottom-aligned piles on the ground. Muted one step so the sand bone never competes with enemies.
local function muteBone(t)
  for y = 0, t.height - 1 do for x = 0, t.width - 1 do
    local c = G(t, x, y)
    if c and c:sub(1, 4) == "sand" then P(t, x, y, DARK[c]) end
  end end
end
local function bone(t, x0, y0, x1, y1)
  LF(x0, y0, x1, y1, function(x, y) P(t, x, y, "sand3"); P(t, x, y + 1, "sand2") end)
  for _, e in ipairs({ { x0, y0 }, { x1, y1 } }) do
    P(t, e[1], e[2] - 1, "sand4"); P(t, e[1] - 1, e[2], "sand4"); P(t, e[1] + 1, e[2] + 1, "sand2"); P(t, e[1], e[2] + 2, "dirt2")
  end
end
local function rib(t, x0, y0, h, dir)
  for k = 0, h - 1 do
    local x = x0 + dir * rnd(2.2 * math.sin(k / (h - 1) * math.pi * 0.9))
    P(t, x, y0 - k, (k > h - 3) and "sand4" or "sand3")
    P(t, x + 1, y0 - k, "sand2")
  end
end
do
  local t = T()
  for x = 1, 14 do P(t, x, 15, (x % 3 == 0) and "dirt1" or "dirt2") end
  for x = 3, 12 do if H(x, 14, 1301) < 0.4 then P(t, x, 15, "dirt1") end end
  rib(t, 9, 14, 7, 1); rib(t, 11, 14, 6, 1); rib(t, 13, 14, 5, 1)
  bone(t, 2, 13, 11, 11)
  -- vertebra
  P(t, 4, 14, "sand3"); P(t, 5, 14, "sand2"); P(t, 6, 14, "sand3"); P(t, 7, 14, "sand2"); P(t, 4, 13, "sand4")
  muteBone(t); put(30, ROW, "bones_a", t, {})
end
do
  local t = T()
  for x = 0, 15 do P(t, x, 15, (H(x, 15, 1302) < 0.5) and "dirt1" or "dirt2") end
  rib(t, 2, 14, 8, 1); rib(t, 5, 14, 9, 1); rib(t, 8, 14, 8, 1); rib(t, 11, 14, 6, 1)
  -- spine across the rib cage
  for x = 1, 13 do P(t, x, 14, (x % 2 == 0) and "sand3" or "sand2") end
  P(t, 1, 13, "sand4")
  -- a jaw fragment with teeth
  for x = 9, 15 do P(t, x, 13, "sand3"); P(t, x, 14, "sand2") end
  for x = 10, 14, 2 do P(t, x, 12, "sand4") end
  muteBone(t); put(31, ROW, "bones_b", t, {})
end

---------------------------------------------------------------------------------------------------
-- Rows 2-3: bite mark, lumber, cages, gears, saw, gator skull, drip animation
ROW = 2

-- BITE MARK 2x2: a giant jaw closed on the wall. Upper jaw = an arc of big conical punctures pointing down, lower
-- jaw = an arc of punctures pointing up (interlocking), the boards between them snapped along a jagged split.
-- Each puncture: dark core, shadowed left rim, fresh pale splinters on the lit right rim and along the tooth base.
do
  local img = Image(32, 32, ColorMode.RGB)
  for r = 0, 1 do for c = 0, 1 do img:drawImage(wall("m", "m", 0), Point(c * 16, r * 16)) end end
  local TOOTH = {
    ".sS.Ss.",
    "dOOOOOs",
    "dOOOOOs",
    "dOOOOOS",
    ".dOOOs.",
    ".dOOOs.",
    "..dOs..",
    "..dOS..",
    "...s...",
  }
  local KEY = { s = "sand3", S = "dirt4", d = "ink1", O = "outline" }
  local function stamp(x0, y0, up, seed, short)
    local n = #TOOTH - (short and 2 or 0)
    for j = 1, n do
      local row = TOOTH[up and (n - j + 1) or j]
      if short and not up and j == n then row = TOOTH[#TOOTH] end
      for i = 1, #row do
        local ch = row:sub(i, i)
        if ch ~= "." then
          local c = KEY[ch]
          if ch == "O" and H(x0 + i, y0 + j, seed) < 0.1 then c = "ink1" end
          P(img, x0 + i - 1, y0 + j - 1, c)
        end
      end
    end
    -- short cracks from the base corners
    local by = up and (y0 + n - 1) or y0
    local dir = up and 1 or -1
    P(img, x0 - 1, by - dir, "ink1"); P(img, x0 - 2, by - dir * 2, "ink1")
    P(img, x0 + 7, by - dir, "ink1"); P(img, x0 + 8, by - dir, "ink1")
  end
  -- snapped boards: a jagged split between the jaws, splinters on its lower lip
  for x = 4, 27 do
    local y = 16 + rnd(1.0 * math.sin(x * 1.3) + 0.5 * math.sin(x * 2.9))
    P(img, x, y, "outline"); P(img, x, y - 1, "ink1")
    if H(x, y, 1411) < 0.5 then P(img, x, y + 1, (H(x, y, 1412) < 0.5) and "sand2" or "dirt3") end
  end
  stamp(1, 6, false, 1, true); stamp(9, 3, false, 2); stamp(17, 3, false, 3); stamp(25, 6, false, 4, true)
  stamp(5, 19, true, 5, true); stamp(13, 20, true, 6, true); stamp(21, 19, true, 7, true)
  put(0, 2, "mwall_bite_tl", quarter(img, 0, 0), {})
  put(1, 2, "mwall_bite_tr", quarter(img, 1, 0), {})
  put(0, 3, "mwall_bite_bl", quarter(img, 0, 1), {})
  put(1, 3, "mwall_bite_br", quarter(img, 1, 1), {})
end

-- LUMBER STACK 3x2 (S wood): 8 courses of sawn boards (4 px each), staggered cut ends, a rusty steel band
do
  local img = Image(48, 32, ColorMode.RGB)
  local offL = { 1, 2, 1, 3, 2, 1, 2, 1 }
  local offR = { 2, 1, 3, 1, 2, 2, 1, 1 }
  for k = 0, 7 do
    local y0 = k * 4
    local xl, xr = offL[k + 1], 47 - offR[k + 1]
    for x = xl, xr do
      P(img, x, y0, (H(x, y0, 1501) < 0.12) and "ink5" or ((H(x, y0, 1502) < 0.3) and "sand3" or "dirt4"))
      P(img, x, y0 + 1, "dirt3"); P(img, x, y0 + 2, "dirt3")
      P(img, x, y0 + 3, (k == 7) and "outline" or "dirt1")
    end
    grainH(img, xl, y0 + 1, xr, y0 + 2, 1503 + k, 0.12)
    -- butt joints in each course
    local j = 8 + math.floor(H(k, 0, 1504) * 30)
    P(img, j, y0, "dirt2"); P(img, j, y0 + 1, "dirt1"); P(img, j, y0 + 2, "dirt1"); P(img, j + 1, y0 + 1, "dirt4")
    -- cut ends: end grain squares
    for _, e in ipairs({ { xl, 1 }, { xr, -1 } }) do
      local x = e[1]
      P(img, x, y0, (e[2] == 1) and "sand4" or "sand3"); P(img, x, y0 + 1, "sand3"); P(img, x, y0 + 2, "sand2")
      P(img, x + e[2], y0 + 1, "dirt4")
      if e[2] == -1 then P(img, x, y0, "sand2"); P(img, x, y0 + 1, "sand2"); P(img, x, y0 + 2, "sand1") end
    end
  end
  -- moss and wet sheen on the top course, slime along the bottom
  for _, m in ipairs({ { 30, 0, "olive3" }, { 31, 0, "leaf3" }, { 32, 0, "olive3" }, { 31, 1, "leaf2" }, { 6, 0, "olive3" } }) do P(img, m[1], m[2], m[3]) end
  for x = 3, 44 do if H(x, 30, 1505) < 0.25 then P(img, x, 30, "olive1") end end
  -- steel band round the stack (in the middle column)
  for y = 0, 31 do
    P(img, 22, y, (y % 4 == 0) and "steel4" or "steel3"); P(img, 23, y, "steel2"); P(img, 24, y, "steel1")
    if H(23, y, 1506) < 0.2 then P(img, 23, y, "dirt3") end
  end
  for y = 14, 17 do P(img, 21, y, "steel3"); P(img, 25, y, "steel1") end
  P(img, 21, 14, "steel4"); P(img, 23, 18, "dirt2"); P(img, 23, 19, "dirt2"); P(img, 24, 20, "dirt1")
  edgeOutline(img, 0, 1, 47, 31)
  for x = 0, 47 do if A(img, x, 0) and not A(img, x - 1, 0) then end end
  -- top-row ends: outline the outer corner
  if not A(img, 0, 0) then P(img, 0, 0, nil) end
  local names = { { "lumber_tl", "lumber_tm", "lumber_tr" }, { "lumber_bl", "lumber_bm", "lumber_br" } }
  for r = 0, 1 do for c = 0, 2 do put(2 + c, 2 + r, names[r + 1][c + 1], quarter(img, c, r), WOOD) end end
end

-- CAGES 2x2 (back): rusted pen; burst-open variant with bars torn outward
local function rustify(img, seed)
  for y = 0, img.height - 1 do for x = 0, img.width - 1 do
    local c = G(img, x, y)
    if c and c:sub(1, 5) == "steel" then
      local h = H(x, y, seed)
      if h < 0.14 then P(img, x, y, (c == "steel3") and "dirt3" or "dirt2") end
    end
  end end
end
local function cageImg(burst)
  local img = Image(32, 32, ColorMode.RGB)
  local function vbar(x, y0, y1) for y = y0, y1 do P(img, x, y, "steel3"); P(img, x + 1, y, "steel1") end end
  -- back floor shadow
  for x = 4, 27 do P(img, x, 28, "ink1") end
  if not burst then
    for _, bx in ipairs({ 8, 13, 18, 23 }) do vbar(bx, 4, 28) end
    for x = 4, 27 do P(img, x, 15, "steel2"); P(img, x, 16, "steel1") end
    -- padlock on the door
    P(img, 19, 16, "steel3"); P(img, 21, 16, "steel3"); P(img, 20, 15, "steel3"); P(img, 19, 17, "steel3"); P(img, 21, 17, "steel2")
    for y = 18, 20 do for x = 18, 22 do P(img, x, y, (x == 18) and "steel3" or ((y == 20) and "steel1" or "dirt3")) end end
    P(img, 20, 19, "outline")
    -- a bone left inside
    P(img, 9, 27, "sand2"); P(img, 10, 27, "sand2"); P(img, 11, 27, "sand2"); P(img, 12, 27, "sand3"); P(img, 9, 26, "sand3"); P(img, 12, 26, "sand2")
  else
    vbar(23, 4, 28)
    -- bowed bars, ripped apart in the middle
    for y = 4, 28 do
      local off = rnd(4 * math.sin(math.pi * (y - 4) / 24))
      P(img, 13 - off, y, "steel3"); P(img, 14 - off, y, "steel1")
      P(img, 18 + off, y, "steel3"); P(img, 19 + off, y, "steel1")
    end
    -- snapped bar with bent tips
    vbar(8, 4, 10); P(img, 7, 11, "steel3"); P(img, 6, 12, "steel2")
    vbar(8, 21, 28); P(img, 7, 20, "steel3"); P(img, 6, 19, "steel2")
    -- broken middle rail
    for x = 4, 9 do P(img, x, 15, "steel2"); P(img, x, 16, "steel1") end
    P(img, 10, 14, "steel2"); P(img, 11, 13, "steel2")
    for x = 23, 27 do P(img, x, 15, "steel2"); P(img, x, 16, "steel1") end
    P(img, 22, 17, "steel2"); P(img, 21, 18, "steel1")
    -- the padlock lying on the floor, sheared
    for x = 15, 17 do P(img, x, 27, (x == 15) and "steel3" or "dirt3"); P(img, x, 28, "steel1") end
    P(img, 15, 26, "steel3"); P(img, 18, 27, "steel2")
  end
  -- frame
  for x = 1, 30 do P(img, x, 1, "steel3"); P(img, x, 2, "steel2"); P(img, x, 3, "steel1") end
  for x = 1, 30 do P(img, x, 29, "steel3"); P(img, x, 30, "steel2"); P(img, x, 31, "steel1") end
  for y = 1, 31 do P(img, 1, y, "steel3"); P(img, 2, y, "steel2"); P(img, 3, y, "steel1"); P(img, 28, y, "steel3"); P(img, 29, y, "steel2"); P(img, 30, y, "steel1") end
  P(img, 1, 1, "steel4"); P(img, 28, 1, "steel4")
  if burst then
    -- top rail bent up by the breakout
    for x = 11, 20 do P(img, x, 3, nil); P(img, x, 2, "steel2"); P(img, x, 1, "steel3") end
    for x = 13, 18 do P(img, x, 0, "steel3"); P(img, x, 1, "steel2"); P(img, x, 2, "steel1") end
  end
  -- rivets on the corners
  for _, r in ipairs({ { 2, 2 }, { 29, 2 }, { 2, 30 }, { 29, 30 } }) do P(img, r[1], r[2], "steel4") end
  rustify(img, burst and 1602 or 1601)
  -- rust runs
  for _, x in ipairs({ 9, 24 }) do for y = 17, 20 do if G(img, x, y) then P(img, x, y, "dirt2") end end end
  return img
end
do
  local img = cageImg(false)
  put(5, 2, "cage_tl", quarter(img, 0, 0), {}); put(6, 2, "cage_tr", quarter(img, 1, 0), {})
  put(5, 3, "cage_bl", quarter(img, 0, 1), {}); put(6, 3, "cage_br", quarter(img, 1, 1), {})
  img = cageImg(true)
  put(7, 2, "cagex_tl", quarter(img, 0, 0), {}); put(8, 2, "cagex_tr", quarter(img, 1, 0), {})
  put(7, 3, "cagex_bl", quarter(img, 0, 1), {}); put(8, 3, "cagex_br", quarter(img, 1, 1), {})
end

-- GEAR and SAW 2x2 (back, rusted). Edge-lit from the top-left.
local function shadeDisc(img, base, lit, shade)
  local marks = {}
  for y = 0, 31 do for x = 0, 31 do
    if A(img, x, y) then
      if not A(img, x - 1, y - 1) or not A(img, x - 1, y) and not A(img, x, y - 1) then marks[#marks + 1] = { x, y, lit }
      elseif not A(img, x + 1, y + 1) then marks[#marks + 1] = { x, y, shade } end
    end
  end end
  for _, m in ipairs(marks) do P(img, m[1], m[2], m[3]) end
end
do
  local img = Image(32, 32, ColorMode.RGB)
  local cx, cy = 15.5, 15.5
  for y = 0, 31 do for x = 0, 31 do
    local dx, dy = x + 0.5 - 16, y + 0.5 - 16
    local r = math.sqrt(dx * dx + dy * dy)
    local a = math.atan(dy, dx)
    local f = (a / (2 * math.pi) * 9 + 9.25)
    local ti = math.floor(f) % 9
    local ph = f % 1
    local rout = (ph < 0.5 and ti ~= 6) and 15.4 or 11.8
    if r <= rout then
      local c
      if r > 8.2 then c = "steel2"
      elseif r > 5.2 then
        local sp = (a / (2 * math.pi) * 5 + 5) % 1
        if math.abs(sp - 0.5) < 0.2 then c = "steel2" end
      elseif r > 2.2 then c = "steel2"
      else c = "outline" end
      if c then P(img, x, y, c) end
    end
  end end
  shadeDisc(img, "steel2", "steel3", "steel1")
  -- rim ring inner edge shading (spokes recessed)
  for y = 0, 31 do for x = 0, 31 do
    local dx, dy = x + 0.5 - 16, y + 0.5 - 16
    local r = math.sqrt(dx * dx + dy * dy)
    if A(img, x, y) and r > 8.2 and r < 9.3 and dx + dy > 0 then P(img, x, y, "steel3") end
    if A(img, x, y) and r > 8.2 and r < 9.3 and dx + dy < -2 then P(img, x, y, "steel1") end
  end end
  rustify(img, 1701)
  for y = 0, 31 do for x = 0, 31 do if G(img, x, y) == "steel2" and H(x // 3, y // 3, 1702) < 0.25 then P(img, x, y, "dirt2") end end end
  P(img, 14, 14, "steel4"); P(img, 5, 6, "steel4"); P(img, 9, 1, "steel4")
  put(9, 2, "gear_tl", quarter(img, 0, 0), {}); put(10, 2, "gear_tr", quarter(img, 1, 0), {})
  put(9, 3, "gear_bl", quarter(img, 0, 1), {}); put(10, 3, "gear_br", quarter(img, 1, 1), {})
end
do
  local img = Image(32, 32, ColorMode.RGB)
  local broken = { [3] = true, [4] = true, [15] = true }
  for y = 0, 31 do for x = 0, 31 do
    local dx, dy = x + 0.5 - 16, y + 0.5 - 16
    local r = math.sqrt(dx * dx + dy * dy)
    local a = math.atan(dy, dx)
    local f = a / (2 * math.pi) * 22 + 22
    local ti = math.floor(f) % 22
    local ph = f % 1
    local rout = broken[ti] and 12.6 or (12.6 + 2.8 * ph)
    if r <= rout and r > 2.1 then
      local c = "steel3"
      if r <= 4.4 then c = "steel2" end
      if r > 7.5 and r < 8.5 then c = "steel2" end
      if r > 12.6 then c = (dx + dy < 0) and "steel4" or "steel3" end
      P(img, x, y, c)
    end
  end end
  shadeDisc(img, "steel3", "steel4", "steel1")
  -- rust patches
  for y = 0, 31 do for x = 0, 31 do
    if A(img, x, y) and H(x // 3, y // 3, 1801) < 0.3 then
      local c = G(img, x, y)
      if c == "steel3" then P(img, x, y, (H(x, y, 1802) < 0.5) and "dirt3" or "dirt2") end
    end
  end end
  -- a crack from the rim inward
  LF(22, 25, 19, 20, function(x, y) P(img, x, y, "outline") end)
  -- arbor flange bolts
  P(img, 13, 14, "steel4"); P(img, 18, 17, "steel1"); P(img, 17, 13, "steel4")
  put(11, 2, "saw_tl", quarter(img, 0, 0), {}); put(12, 2, "saw_tr", quarter(img, 1, 0), {})
  put(11, 3, "saw_bl", quarter(img, 0, 1), {}); put(12, 3, "saw_br", quarter(img, 1, 1), {})
end

-- GATOR SKULL 2x1 (back): long bleached snout pointing left, sits on the ground
do
  local img = Image(32, 16, ColorMode.RGB)
  local function topAt(x)
    if x <= 18 then return rnd(9 - (x - 1) * 1.6 / 17) end
    if x <= 25 then return rnd(7 - (x - 18) * 0.45) end
    return rnd(4 + (x - 25) * 0.6)
  end
  -- ground shadow
  for x = 1, 30 do P(img, x, 15, (x % 2 == 0) and "dirt1" or "dirt2") end
  for x = 1, 29 do
    local top = topAt(x)
    local bot = (x <= 18) and 12 or 13
    if x >= 28 then bot = 12 end
    for y = top, bot do
      local c = "sand3"
      if y == top then c = "sand4" elseif y >= bot - 1 then c = "sand2" end
      P(img, x, y, c)
    end
  end
  -- rounded snout tip and skull back
  P(img, 1, 9, nil); P(img, 1, 12, nil); P(img, 29, 12, nil); P(img, 29, 6, nil)
  -- nostril bump, eye socket, temporal hole
  P(img, 3, 8, "sand4"); P(img, 4, 8, "sand4"); P(img, 3, 9, "sand3"); P(img, 4, 10, "dirt2")
  for y = 6, 8 do for x = 21, 24 do P(img, x, y, "outline") end end
  P(img, 21, 6, "sand3"); P(img, 24, 8, "ink1"); P(img, 25, 6, "sand2"); P(img, 20, 7, "sand2"); P(img, 22, 9, "sand4")
  P(img, 26, 9, "outline"); P(img, 27, 9, "outline"); P(img, 26, 10, "ink1")
  -- brow ridge
  for x = 19, 25 do P(img, x, topAt(x), "sand5") end
  -- jaw line and teeth (upper teeth hanging over the lower jaw)
  for x = 2, 26 do P(img, x, 12, "dirt2") end
  for x = 3, 17, 2 do P(img, x, 13, "sand4"); P(img, x + 1, 13, nil) end
  for x = 2, 27 do P(img, x, 14, (x < 6) and "sand2" or "sand3") end
  for x = 4, 27 do if A(img, x, 13) == false and x > 18 then P(img, x, 13, "sand2") end end
  P(img, 2, 13, "sand2")
  -- cracks and moss
  P(img, 12, 10, "dirt2"); P(img, 13, 9, "dirt2"); P(img, 14, 9, "dirt2"); P(img, 27, 7, "dirt2")
  for _, m in ipairs({ { 15, 8 }, { 16, 8 }, { 16, 9 }, { 28, 8 }, { 28, 9 }, { 27, 10 } }) do P(img, m[1], m[2], "olive2") end
  P(img, 16, 7, "olive3")
  muteBone(img)
  put(13, 2, "gskull_l", quarter(img, 0, 0), {})
  put(14, 2, "gskull_r", quarter(img, 1, 0), {})
end

-- STORM RUNOFF (back, anim 120 ms): water streaming off a roof edge, breaking into falling drops
local function drip(f)
  local t = T()
  local streams = { { 2, 6, 0 }, { 6, 4, 5 }, { 7, 9, 2 }, { 11, 5, 8 }, { 14, 7, 3 } }
  for _, s in ipairs(streams) do
    local x, len, ph = s[1], s[2], s[3]
    -- sheet lip at the edge
    P(t, x, 0, "ink4"); P(t, x, 1, "steel3")
    for y = 2, len do P(t, x, y, (y % 3 == (f % 3)) and "ink4" or "steel3") end
    -- drops: cycle 12 px, 4 px per frame
    for k = 0, 1 do
      local y = len + 2 + ((ph + f * 4 + k * 6) % 12)
      if y <= 15 then P(t, x, y, "ink4"); if y - 1 > len then P(t, x, y - 1, "steel2") end end
    end
  end
  -- splash sparks low in the tile
  if f == 1 then P(t, 9, 14, "ink3") elseif f == 2 then P(t, 4, 13, "ink3") end
  return t
end
local dr = {}
for f = 0, 2 do dr[f] = put(15 + f, 2, "drip_f" .. f, drip(f), {}) end
byName["drip_f0"].anim = { { id = dr[0], ms = 120 }, { id = dr[1], ms = 120 }, { id = dr[2], ms = 120 } }

---------------------------------------------------------------------------------------------------
-- write outputs
local spr = Sprite(SHEET.width, SHEET.height, ColorMode.RGB)
spr.cels[1].image = SHEET
spr.layers[1].name = "tiles"
local names = {}; for n in pairs(K.PAL) do names[#names + 1] = n end; table.sort(names)
local pal = Palette(#names + 1); pal:setColor(0, Color{ r = 0, g = 0, b = 0, a = 0 })
for i, n in ipairs(names) do local c = K.PAL[n]; pal:setColor(i, Color{ r = c[1], g = c[2], b = c[3], a = 255 }) end
spr:setPalette(pal)
spr:saveAs(ROOT .. "/art-src/tiles/m2_mill.aseprite")
spr:saveCopyAs(ROOT .. "/public/assets/tiles/m2_mill.png")
spr:close()

table.sort(manifest.tiles, function(a, b) return a.id < b.id end)
local f = io.open(ROOT .. "/art-src/tiles/m2_mill_tiles.json", "w")
f:write(json.encode(manifest))
f:close()
print("built m2_mill tileset (" .. #manifest.tiles .. " tiles, " .. SHEET.width .. "x" .. SHEET.height .. ")")
