-- Mission 1 Part II "TIMBER EXPRESS" train tileset. 16x16 tiles, 32 columns, one image, 0 margin/spacing.
-- Build: bash tools/build-art.sh art-src/tiles/m1_train.lua
-- Writes: art-src/tiles/m1_train.aseprite (source), public/assets/tiles/m1_train.png (tileset image),
--         art-src/tiles/m1_train_tiles.json (manifest: name -> local id, properties).
-- Same structure and manifest format as stage1.lua; the m1p2 map generator reads the manifest by tile name.
--
-- Rows in the map (16 px tiles): roof 16 (one-way, top y 256), boxcar wall 16-18 (back layer), logs/coal 17-18
-- (solid, top y 272), armor 18 (solid, top y 288), car deck 19 (solid, top y 304), underframe 20 (back).
-- Regime rolling stock is red/rust; metal parts steel; logs dirt/sand; coal ink. Snow on every top edge.
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local TS, COLS, ROWS = 16, 32, 2
local SHEET = Image(TS * COLS, TS * ROWS, ColorMode.RGB)
local CLEAR = app.pixelColor.rgba(0, 0, 0, 0)

local manifest = { tilewidth = TS, columns = COLS, rows = ROWS, image = "m1_train.png", tiles = {} }
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
local REV = {}
for n, c in pairs(K.PAL) do REV[app.pixelColor.rgba(c[1], c[2], c[3], 255)] = n end
local function G(t, x, y)
  if not A(t, x, y) then return nil end
  return REV[t:getPixel(x, y)]
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
-- split a 16x32 image into its top and bottom tiles
local function half(img, r) local t = T(); t:drawImage(img, Point(0, -r * TS)); return t end
local function quarter(img, c, r) local t = T(); t:drawImage(img, Point(-c * TS, -r * TS)); return t end

local function snowDust(t, x0, x1, y, seed, p)
  for x = x0, x1 do
    local h = H(x, y, seed)
    if h < (p or 0.55) then P(t, x, y, h < 0.25 and "white" or "ink6") end
  end
end
-- outline transparent pixels 4-adjacent to opaque ones, limited to a rect
local function edgeOutline(t, x0, y0, x1, y1, c)
  local marks = {}
  for y = y0, y1 do for x = x0, x1 do
    if not A(t, x, y) and (A(t, x - 1, y) or A(t, x + 1, y) or A(t, x, y - 1) or A(t, x, y + 1)) then marks[#marks + 1] = { x, y } end
  end end
  for _, m in ipairs(marks) do P(t, m[1], m[2], c or "outline") end
end

local DECK = { collides = true, material = "wood" }
local ROOF = { collides = true, oneway = true, material = "metal" }
local WOOD = { collides = true, material = "wood" }
local METAL = { collides = true, material = "metal" }

---------------------------------------------------------------------------------------------------
-- Row 0: deck, underframe, roof, armor, stakes
local ROW = 0

-- Flatcar deck: snowy deck boards (rows 0-4) over a red side sill (rows 6-15) with rivets and stake pockets.
-- kind "l"/"r" = car end facing open air: end beam, coupler pocket (rows 8-12, matches prop_coupling), stirrup step.
local function deck(kind, v)
  local t = T()
  for x = 0, TS - 1 do
    P(t, x, 0, "dirt4"); P(t, x, 1, "dirt4"); P(t, x, 2, "dirt3"); P(t, x, 3, "dirt3"); P(t, x, 4, "dirt2"); P(t, x, 5, "outline")
    if H(x, 2, 300 + v) < 0.22 then P(t, x, 3, "dirt2") end
    if H(x, 1, 310 + v) < 0.2 then P(t, x, 2, "dirt4") end
    if H(x, 4, 315 + v) < 0.15 then P(t, x, 4, "dirt1") end
    -- side sill: shadow under the deck lip, lit flange, body, shade, bottom edge
    P(t, x, 6, "red1"); P(t, x, 7, "red4")
    for y = 8, 12 do P(t, x, y, "red3") end
    P(t, x, 13, "red2"); P(t, x, 14, "red1"); P(t, x, 15, "outline")
    if H(x, 12, 320 + v) < 0.35 then P(t, x, 12, "red2") end
    if H(x, 13, 321 + v) < 0.2 then P(t, x, 13, "dirt2") end
  end
  -- deck board butt joint + nails
  local seam = ({ [0] = 15, [1] = 9, [2] = 4 })[v]
  for y = 1, 4 do P(t, seam, y, "dirt1") end
  P(t, (seam + 1) % 16, 1, "dirt5")
  P(t, (seam + 2) % 16, 2, "ink4"); P(t, (seam + 14) % 16, 2, "ink4")
  -- sill rivets
  for _, rx in ipairs({ 3, 11 }) do
    P(t, rx, 9, "red5"); P(t, rx + 1, 10, "red1")
  end
  if v == 0 then
    -- stake pocket
    R(t, 6, 7, 4, 1, "steel4"); P(t, 9, 7, "steel3")
    P(t, 6, 8, "steel3"); P(t, 7, 8, "outline"); P(t, 8, 8, "outline"); P(t, 9, 8, "steel2")
    R(t, 6, 9, 4, 2, "steel2"); P(t, 6, 9, "steel3"); P(t, 9, 10, "steel1")
    R(t, 7, 11, 2, 1, "red1")
    P(t, 7, 12, "dirt3"); P(t, 7, 13, "dirt2") -- rust run
  elseif v == 1 then
    -- chipped paint showing steel + rust streak
    P(t, 6, 9, "steel3"); P(t, 7, 9, "steel3"); P(t, 6, 10, "steel2"); P(t, 7, 10, "steel4"); P(t, 8, 10, "steel3"); P(t, 7, 11, "steel2")
    for y = 10, 14 do if y ~= 11 then P(t, 3, y, (y < 13) and "dirt3" or "dirt2") end end
    P(t, 12, 11, "dirt3"); P(t, 12, 12, "dirt2")
  else
    -- faded stencil marks (car number)
    for _, x in ipairs({ 6, 7, 9, 10, 12 }) do P(t, x, 9, "sand2") end
    for _, x in ipairs({ 6, 9, 10, 12 }) do P(t, x, 10, "sand2") end
    for _, x in ipairs({ 6, 7, 10, 12 }) do P(t, x, 11, "sand2") end
    for x = 6, 12 do P(t, x, 12, "red2") end
  end
  snowDust(t, 0, 15, 0, 330 + v, 0.7)
  for x = 0, 15 do if H(x, 1, 333 + v) < 0.12 then P(t, x, 1, "ink5") end end

  if kind == "l" then
    -- plank end
    P(t, 0, 0, nil); P(t, 1, 0, "white")
    for y = 1, 4 do P(t, 0, y, "outline") end
    for y = 1, 4 do P(t, 1, y, (y < 3) and "dirt5" or "dirt4") end
    -- end beam
    for y = 5, 15 do P(t, 0, y, "outline"); P(t, 1, y, "red4"); P(t, 2, y, "red3"); P(t, 3, y, "red2") end
    P(t, 1, 6, "red5"); P(t, 2, 6, "red4")
    -- coupler pocket (bar enters at rows 9-11)
    R(t, 0, 8, 5, 1, "steel4"); P(t, 0, 8, "outline")
    for y = 9, 11 do P(t, 0, y, "steel1"); P(t, 1, y, "outline"); P(t, 2, y, "outline"); P(t, 3, y, "steel1"); P(t, 4, y, "steel2") end
    R(t, 0, 12, 5, 1, "steel1"); P(t, 4, 12, "outline")
    P(t, 4, 8, "steel5")
    -- sill steps up at the car end; stirrup step hangs below
    for x = 0, 9 do for y = 14, 15 do P(t, x, y, nil) end end
    for x = 0, 9 do P(t, x, 13, "outline") end
    P(t, 10, 14, "outline"); P(t, 10, 15, "outline")
    P(t, 4, 13, "steel3"); P(t, 8, 13, "steel3")
    P(t, 4, 14, "steel4"); P(t, 8, 14, "steel2")
    for x = 4, 8 do P(t, x, 15, (x == 4) and "steel5" or "steel4") end
    P(t, 3, 14, "outline"); P(t, 3, 15, "outline"); P(t, 9, 14, "outline"); P(t, 9, 15, "outline")
    for x = 5, 7 do P(t, x, 14, nil) end
  elseif kind == "r" then
    P(t, 15, 0, nil); P(t, 14, 0, "ink6")
    for y = 1, 4 do P(t, 15, y, "outline") end
    for y = 1, 4 do P(t, 14, y, (y < 3) and "dirt2" or "dirt1") end
    for y = 5, 15 do P(t, 12, y, "red4"); P(t, 13, y, "red3"); P(t, 14, y, "red2"); P(t, 15, y, "outline") end
    P(t, 12, 6, "red5"); P(t, 13, 6, "red3")
    R(t, 11, 8, 5, 1, "steel4"); P(t, 15, 8, "outline")
    for y = 9, 11 do P(t, 11, y, "steel3"); P(t, 12, y, "steel1"); P(t, 13, y, "outline"); P(t, 14, y, "outline"); P(t, 15, y, "steel1") end
    R(t, 11, 12, 5, 1, "steel1")
    P(t, 11, 8, "steel5")
    for x = 6, 15 do for y = 14, 15 do P(t, x, y, nil) end end
    for x = 6, 15 do P(t, x, 13, "outline") end
    P(t, 5, 14, "outline"); P(t, 5, 15, "outline")
    P(t, 7, 13, "steel3"); P(t, 11, 13, "steel3")
    P(t, 7, 14, "steel4"); P(t, 11, 14, "steel2")
    for x = 7, 11 do P(t, x, 15, (x == 7) and "steel5" or "steel3") end
    P(t, 6, 14, "outline"); P(t, 6, 15, "outline"); P(t, 12, 14, "outline"); P(t, 12, 15, "outline")
    for x = 8, 10 do P(t, x, 14, nil) end
  end
  return t
end
put(0, ROW, "deck_l", deck("l", 0), DECK)
put(1, ROW, "deck_m", deck("m", 0), DECK)
put(2, ROW, "deck_m2", deck("m", 1), DECK)
put(3, ROW, "deck_m3", deck("m", 2), DECK)
put(4, ROW, "deck_r", deck("r", 0), DECK)

-- Underframe (back layer, in shadow): fish-belly centre sill, brake rod on hangers, air reservoir on _m.
local function under(kind)
  local t = T()
  local function sillBottom(x)
    if kind == "l" then return math.min(7, 2 + math.floor(x / 2)) end
    if kind == "r" then return math.min(7, 2 + math.floor((15 - x) / 2)) end
    return 7
  end
  for x = 0, TS - 1 do
    local b = sillBottom(x)
    P(t, x, 0, "outline")
    for y = 1, b - 1 do P(t, x, y, "steel1") end
    P(t, x, 2, (b > 2) and "steel2" or "steel1")
    P(t, x, b, "outline")
    if b == 7 then P(t, x, 6, "steel2") end
  end
  -- vertical stiffeners on the sill web
  for _, sx in ipairs({ 4, 12 }) do
    if sillBottom(sx) == 7 then for y = 3, 5 do P(t, sx, y, "steel2") end; P(t, sx + 1, 4, "outline") end
  end
  -- brake rod on two hangers
  local r0, r1 = 0, 15
  if kind == "l" then r0 = 7 end
  if kind == "r" then r1 = 8 end
  for x = r0, r1 do P(t, x, 10, "steel2"); P(t, x, 11, "outline") end
  for _, hx in ipairs({ 2, 13 }) do
    if hx >= r0 and hx <= r1 then for y = 8, 10 do P(t, hx, y, "steel1") end; P(t, hx, 10, "steel3") end
  end
  if kind == "m" then
    -- air reservoir (cylinder) hung under the sill
    for x = 3, 12 do
      local endcap = (x == 3 or x == 12)
      P(t, x, 8, endcap and "outline" or "steel3")
      for y = 9, 11 do P(t, x, y, endcap and "steel1" or "steel2") end
      P(t, x, 12, endcap and "outline" or "steel1"); P(t, x, 13, "outline")
    end
    P(t, 3, 8, nil); P(t, 12, 8, nil); P(t, 3, 13, nil); P(t, 12, 13, nil)
    P(t, 4, 9, "steel4"); P(t, 5, 9, "steel3")
    for _, sx in ipairs({ 5, 10 }) do P(t, sx, 8, "steel1"); P(t, sx, 7, "steel1") end -- straps
    P(t, 8, 10, "steel1"); P(t, 8, 11, "steel1")
  elseif kind == "l" then
    -- angle-cock + hose stub under the end
    P(t, 1, 3, "steel2"); P(t, 1, 4, "steel1"); P(t, 0, 4, "outline")
  elseif kind == "r" then
    P(t, 14, 3, "steel2"); P(t, 14, 4, "steel1"); P(t, 15, 4, "outline")
  end
  return t
end
put(5, ROW, "under_l", under("l"), {})
put(6, ROW, "under_m", under("m"), {})
put(7, ROW, "under_r", under("r"), {})

-- Boxcar roof seen from the side (one-way). Rows 0-1 snow on the plank running board, 3-5 rusty corrugated
-- steel, 6 eave lip, 7 outline, 8 dithered eave shadow; transparent below so the back-layer wall shows.
local function roof(kind, v)
  local t = T()
  for x = 0, TS - 1 do
    P(t, x, 2, "dirt3"); P(t, x, 3, "dirt1")                                     -- running board edge + shadow
    P(t, x, 4, (x % 4 == 1) and "steel5" or "steel4")                           -- upper slope (lit)
    P(t, x, 5, (x % 4 == 1) and "steel4" or ((x % 4 == 2) and "steel2" or "steel3"))
    P(t, x, 6, (x % 4 == 2) and "steel1" or "steel2")
    if H(x, 5, 500 + v) < 0.25 then P(t, x, 5, "dirt3") end                      -- rust
    if H(x, 6, 501 + v) < 0.3 then P(t, x, 6, "dirt2") end
    P(t, x, 7, "outline")
    if x % 2 == 0 then P(t, x, 8, "red1") end
    -- snow on top
    P(t, x, 1, (H(x, 1, 502 + v) < 0.3) and "ink5" or "ink6")
    if H(x, 0, 503 + v) < 0.8 then P(t, x, 0, (H(x, 0, 504 + v) < 0.5) and "white" or "ink6") end
    if H(x, 2, 505 + v) < 0.25 then P(t, x, 2, "ink5") end
  end
  if v == 1 then
    -- roof hatch: raised steel lid replaces the running board
    for x = 4, 11 do
      P(t, x, 1, "steel4"); P(t, x, 2, "steel3"); P(t, x, 3, "steel2"); P(t, x, 4, "steel1")
      P(t, x, 0, (H(x, 0, 506) < 0.6) and "white" or "ink6")
    end
    P(t, 4, 1, "steel5"); P(t, 4, 2, "steel4"); P(t, 4, 3, "steel3")
    P(t, 3, 1, "outline"); P(t, 3, 2, "outline"); P(t, 3, 3, "outline"); P(t, 12, 1, "outline"); P(t, 12, 2, "outline"); P(t, 12, 3, "outline")
    P(t, 7, 2, "steel5"); P(t, 8, 3, "outline")                                  -- hinge/handle
    P(t, 6, 0, "ink6"); P(t, 9, 0, "white")
  end
  if kind == "l" then
    -- eave overhang end cap + grab iron hanging off the corner
    for y = 0, 2 do P(t, 0, y, nil) end; P(t, 1, 0, nil)
    P(t, 0, 3, "outline"); P(t, 0, 4, "outline"); P(t, 0, 5, "outline"); P(t, 0, 6, "outline")
    P(t, 1, 1, "outline"); P(t, 1, 2, "outline"); P(t, 2, 0, "ink6")
    P(t, 1, 3, "steel5"); P(t, 1, 4, "steel5")
    for y = 8, 13 do P(t, 0, y, (y == 8) and "outline" or "steel4"); P(t, 1, y, nil) end
    P(t, 1, 8, "outline"); P(t, 1, 13, "steel2"); P(t, 0, 14, "outline"); P(t, 1, 14, "outline")
    P(t, 1, 9, "steel2"); P(t, 1, 12, "steel1")
  elseif kind == "r" then
    for y = 0, 2 do P(t, 15, y, nil) end; P(t, 14, 0, nil)
    P(t, 15, 3, "outline"); P(t, 15, 4, "outline"); P(t, 15, 5, "outline"); P(t, 15, 6, "outline")
    P(t, 14, 1, "outline"); P(t, 14, 2, "outline"); P(t, 13, 0, "ink6")
    P(t, 14, 4, "steel3"); P(t, 14, 5, "steel2")
    for y = 8, 13 do P(t, 15, y, (y == 8) and "outline" or "steel3"); P(t, 14, y, nil) end
    P(t, 14, 8, "outline"); P(t, 14, 9, "steel1"); P(t, 14, 13, "steel1"); P(t, 15, 14, "outline"); P(t, 14, 14, "outline")
  end
  return t
end
put(8, ROW, "roof_l", roof("l", 0), ROOF)
put(9, ROW, "roof_m", roof("m", 0), ROOF)
put(10, ROW, "roof_m2", roof("m", 1), ROOF)
put(11, ROW, "roof_r", roof("r", 0), ROOF)

-- Armored gun car wall (row 18 only): hazard-striped top band (like stage1 steel tops), riveted plate below.
local function armor(kind, v)
  local t = T()
  R(t, 0, 0, TS, TS, "steel3")
  for x = 0, TS - 1 do
    local s = (H(x, 0, 600 + v) < 0.5) and 1 or 0
    if s == 1 then P(t, x, 0, "white") end
    P(t, x, s, "steel5")
    for y = s + 1, s + 4 do P(t, x, y, ((x + y) // 3) % 2 == 0 and "fire4" or "outline") end
    P(t, x, s + 5, "steel1")
    if s == 0 then P(t, x, 6, "steel2") end
    P(t, x, 7, "steel4"); P(t, x, 14, "steel2"); P(t, x, 15, "outline")
  end
  for y = 7, 14 do P(t, 0, y, "steel4"); P(t, 15, y, "steel1") end
  for _, b in ipairs({ { 2, 9 }, { 13, 9 }, { 2, 12 }, { 13, 12 } }) do P(t, b[1], b[2], "steel5"); P(t, b[1] + 1, b[2] + 1, "steel1") end
  for y = 8, 13 do for x = 2, 13 do if H(x, y, 610 + v) < 0.06 then P(t, x, y, "steel2") end end end
  if v == 1 then
    -- vision / firing slit
    R(t, 4, 9, 8, 1, "steel5"); R(t, 4, 10, 8, 2, "outline"); P(t, 4, 10, "steel1"); R(t, 5, 12, 7, 1, "steel4")
    P(t, 11, 10, "ink1")
  end
  if kind == "l" then
    for y = 0, 15 do P(t, 0, y, "outline"); P(t, 1, y, (y >= 6) and "steel4" or G(t, 1, y)) end
    P(t, 0, 0, nil); P(t, 1, 0, nil); P(t, 0, 1, nil); P(t, 1, 1, "outline"); P(t, 2, 0, "outline")
    P(t, 1, 15, "outline")
  elseif kind == "r" then
    for y = 0, 15 do P(t, 15, y, "outline"); if y >= 6 then P(t, 14, y, "steel1") end end
    P(t, 15, 0, nil); P(t, 14, 0, nil); P(t, 15, 1, nil); P(t, 14, 1, "outline"); P(t, 13, 0, "outline")
  end
  return t
end
put(12, ROW, "armor_l", armor("l", 0), METAL)
put(13, ROW, "armor_m", armor("m", 0), METAL)
put(14, ROW, "armor_m2", armor("m", 1), METAL)
put(15, ROW, "armor_r", armor("r", 0), METAL)

-- Log stake (back layer): squared timber post centred at x 5..10 with a binder chain wrapped round it.
local function stake(top)
  local t = T()
  for y = 0, TS - 1 do
    P(t, 5, y, "outline"); P(t, 6, y, "dirt4"); P(t, 7, y, "dirt3"); P(t, 8, y, "dirt3"); P(t, 9, y, "dirt2"); P(t, 10, y, "outline")
    if H(7, y, 700 + (top and 1 or 0)) < 0.2 then P(t, 8, y, "dirt2") end
  end
  local function link(x, y, open)
    if open then P(t, x, y, "steel4"); P(t, x + 1, y, "steel2"); P(t, x, y + 1, "steel3"); P(t, x + 1, y + 1, "steel1")
    else P(t, x, y, "steel3"); P(t, x + 1, y, "steel2") end
  end
  if top then
    for y = 0, 2 do for x = 5, 10 do P(t, x, y, nil) end end
    -- chamfered top with snow cap
    for x = 6, 9 do P(t, x, 3, (x < 8) and "dirt4" or "dirt2") end
    P(t, 5, 3, "outline"); P(t, 10, 3, "outline")
    P(t, 6, 1, "white"); P(t, 7, 1, "white"); P(t, 8, 1, "ink6")
    P(t, 5, 2, "ink6"); P(t, 6, 2, "white"); P(t, 7, 2, "ink6"); P(t, 8, 2, "ink6"); P(t, 9, 2, "ink5"); P(t, 10, 2, "ink5")
    P(t, 5, 1, "outline"); P(t, 9, 1, "outline"); P(t, 6, 0, "outline"); P(t, 7, 0, "outline"); P(t, 8, 0, "outline")
    P(t, 4, 2, "outline"); P(t, 11, 2, "outline")
    -- chain wrap (two turns) with a tensioner hook
    for i = 0, 3 do link(4 + i * 2, 6 + (i % 2), i % 2 == 0) end
    for i = 0, 3 do link(4 + i * 2, 10 + (i % 2), i % 2 == 1) end
    P(t, 3, 7, "steel2"); P(t, 12, 11, "steel2")
    P(t, 11, 8, "outline")
  else
    -- iron band + a hanging chain end
    for x = 5, 10 do P(t, x, 4, "steel3"); P(t, x, 5, "steel1") end
    P(t, 6, 4, "steel5"); P(t, 9, 4, "steel4")
    for i = 0, 3 do link(11, 6 + i * 2, i % 2 == 0) end
    P(t, 12, 14, "steel4"); P(t, 13, 14, "steel2"); P(t, 13, 13, "steel3")
  end
  return t
end
put(16, ROW, "stake_top", stake(true), {})
put(17, ROW, "stake_mid", stake(false), {})

---------------------------------------------------------------------------------------------------
-- Row 1: boxcar wall (back layer), emblem decal, log stacks, coal gondola
ROW = 1

-- Boxcar side wall: vertical planks (red2 body, red3 lit edge, red1 seams), kept darker than actors.
-- part "t" (row 16, under the eave: hidden band + steel top angle), "m" (row 17), "b" (row 18: steel side sill +
-- sill shadow). kind "l"/"r" = corner irons, inset 2 px so the roof eave overhangs. v=1: steel rib/brace.
local function wall(part, kind, v)
  local t = T()
  for y = 0, TS - 1 do for x = 0, TS - 1 do
    local k = x % 4
    local c = (k == 0) and "red1" or ((k == 1) and "red3" or "red2")
    if k == 1 and (y + x) % 7 == 3 then c = "red2" end
    if k ~= 0 and H(x, y, 800 + (part == "b" and 1 or 0) + v * 3) < 0.05 then c = "red1" end
    if k >= 2 and H(x, y, 820 + v) < 0.04 then c = "dirt2" end
    P(t, x, y, c)
  end end
  if part == "t" then
    for y = 0, 7 do for x = 0, TS - 1 do P(t, x, y, "outline") end end
    for x = 0, TS - 1 do
      P(t, x, 8, "red1"); P(t, x, 9, (x % 2 == 0) and "red1" or "outline")
      P(t, x, 10, "steel3"); P(t, x, 11, "steel2"); P(t, x, 12, "red1")
    end
    P(t, 3, 11, "steel4"); P(t, 11, 11, "steel4")
  elseif part == "b" then
    for x = 0, TS - 1 do
      if H(x, 9, 830) < 0.4 then P(t, x, 10, "dirt2") end                  -- road grime
      P(t, x, 11, "red1"); P(t, x, 12, "steel3"); P(t, x, 13, "steel2"); P(t, x, 14, "steel1"); P(t, x, 15, "outline")
    end
    P(t, 3, 13, "steel4"); P(t, 11, 13, "steel4")
  end
  if v == 1 then
    -- steel side post (rib) with rivets
    for y = 0, TS - 1 do P(t, 6, y, "steel3"); P(t, 7, y, "steel2"); P(t, 8, y, "steel1"); P(t, 9, y, "red1") end
    for _, y in ipairs({ 3, 11 }) do P(t, 7, y, "steel4"); P(t, 8, y + 1, "outline") end
  end
  if kind == "l" then
    for y = 0, TS - 1 do
      P(t, 0, y, nil); P(t, 1, y, nil)
      P(t, 2, y, "outline"); P(t, 3, y, "steel3"); P(t, 4, y, "steel2"); P(t, 5, y, "steel1")
      if (y % 5) == 2 then P(t, 4, y, "steel4") end
    end
    if part == "t" then for y = 0, 9 do P(t, 3, y, "outline"); P(t, 4, y, "outline"); P(t, 5, y, "outline") end end
    if part == "b" then P(t, 2, 15, nil); P(t, 3, 15, "outline") end
  elseif kind == "r" then
    for y = 0, TS - 1 do
      P(t, 15, y, nil); P(t, 14, y, nil)
      P(t, 10, y, "red1"); P(t, 11, y, "steel3"); P(t, 12, y, "steel2"); P(t, 13, y, "outline")
      if (y % 5) == 2 then P(t, 11, y, "steel4") end
    end
    if part == "t" then for y = 0, 9 do P(t, 10, y, "outline"); P(t, 11, y, "outline"); P(t, 12, y, "outline") end end
    if part == "b" then P(t, 13, 15, nil); P(t, 12, 15, "outline") end
  end
  return t
end
put(0, ROW, "box_tl", wall("t", "l", 0), {})
put(1, ROW, "box_tm", wall("t", "m", 0), {})
put(2, ROW, "box_tr", wall("t", "r", 0), {})
put(3, ROW, "box_ml", wall("m", "l", 0), {})
put(4, ROW, "box_mm", wall("m", "m", 0), {})
put(5, ROW, "box_mm2", wall("m", "m", 1), {})
put(6, ROW, "box_mr", wall("m", "r", 0), {})
put(7, ROW, "box_bl", wall("b", "l", 0), {})
put(8, ROW, "box_bm", wall("b", "m", 0), {})
put(9, ROW, "box_br", wall("b", "r", 0), {})

-- Regime spiral-eye emblem, faded stencil paint on the planks (2x2 on rows 17-18, over box_mm / box_bm).
do
  local img = Image(32, 32, ColorMode.RGB)
  img:drawImage(wall("m", "m", 0), Point(0, 0)); img:drawImage(wall("m", "m", 0), Point(16, 0))
  img:drawImage(wall("b", "m", 0), Point(0, 16)); img:drawImage(wall("b", "m", 0), Point(16, 16))
  local cx, cy = 15.5, 13.5
  local function paint(x, y, c, cDark)
    if H(x, y, 850) < 0.13 then return end                                   -- chipped: plank shows through
    local under = G(img, x, y)
    if under == "red1" then P(img, x, y, cDark) else P(img, x, y, c) end
  end
  for y = 0, 31 do for x = 0, 31 do
    local dx, dy = x - cx, y - cy
    local r = math.sqrt(dx * dx + dy * dy)
    -- outer ring with stencil bridges at the four compass points
    if r >= 10.2 and r <= 12 and math.abs(dx) > 1.2 and math.abs(dy) > 1.2 then paint(x, y, "sand3", "sand2") end
    -- almond eye
    local ex = dx / 9.5
    local lid = 1 - ex * ex
    if lid > 0 then
      local inside = math.abs(dy) <= 5.6 * lid
      local edge = math.abs(dy) > 5.6 * lid - 1.1
      if inside then
        if edge then paint(x, y, "ink2", "ink1")
        elseif r <= 4.6 then
          -- spiral iris
          local ang = math.atan(dy, dx)
          local s = (r - ang / (2 * math.pi) * 2.6) / 2.6
          local f = s - math.floor(s)
          if f < 0.5 or r < 1.2 then paint(x, y, "ink2", "ink1") else paint(x, y, "sand3", "sand2") end
        else paint(x, y, (dy > 2.5) and "sand2" or "sand3", "sand2") end
      end
    end
  end end
  put(10, ROW, "box_emblem_tl", quarter(img, 0, 0), {})
  put(11, ROW, "box_emblem_tr", quarter(img, 1, 0), {})
  put(12, ROW, "box_emblem_bl", quarter(img, 0, 1), {})
  put(13, ROW, "box_emblem_br", quarter(img, 1, 1), {})
end

-- Log stacks (rows 17-18 drawn as one 16x32 column, then split). Three courses of bark cylinders, top-lit,
-- snow on top; _l/_r show staggered cut ends with growth rings.
local LOGS = { { y0 = 2, h = 9 }, { y0 = 11, h = 10 }, { y0 = 21, h = 11 } }
local function logStack(kind, v)
  local img = Image(16, 32, ColorMode.RGB)
  local seed = 900 + v * 10
  for li, lg in ipairs(LOGS) do
    for i = 0, lg.h - 1 do
      local y = lg.y0 + i
      for x = 0, 15 do
        local c
        if i == lg.h - 1 then c = "outline"
        elseif i == lg.h - 2 then c = "dirt1"
        elseif i == 0 then c = "dirt3"
        elseif i <= lg.h * 0.3 then c = (H(x, y, seed) < 0.25) and "dirt5" or "dirt4"
        elseif i <= lg.h * 0.6 then c = "dirt3"
        else c = "dirt2" end
        P(img, x, y, c)
      end
      -- bark furrows: short horizontal dashes one shade darker
      if i >= 1 and i <= lg.h - 3 then
        for x = 0, 15 do
          if H(x, y, seed + li) < 0.1 then
            local c = G(img, x, y)
            local d = ({ dirt5 = "dirt3", dirt4 = "dirt3", dirt3 = "dirt2", dirt2 = "dirt1" })[c] or c
            for k = 0, 1 + math.floor(H(x, y, seed + 5) * 2) do if x + k < 16 then P(img, x + k, y, d) end end
          end
        end
      end
    end
  end
  if v == 1 then
    -- knot + lighter stripped-bark slab
    P(img, 9, 15, "dirt1"); P(img, 10, 15, "dirt1"); P(img, 9, 14, "dirt2"); P(img, 10, 16, "dirt4"); P(img, 11, 15, "dirt4")
    for x = 3, 7 do P(img, x, 25, "sand3"); P(img, x, 26, "sand2") end; P(img, 3, 25, "sand4")
  end
  -- snow on top
  for x = 0, 15 do
    local d = 2 + ((H(x, 0, seed + 20) < 0.4) and 1 or 0)
    for y = 0, d - 1 do P(img, x, y, (y == 0) and ((H(x, 0, seed + 21) < 0.6) and "white" or "ink6") or ((y == d - 1) and ((x % 2 == 0) and "sky5" or "ink5") or "ink6")) end
    if H(x, 1, seed + 22) < 0.15 then P(img, x, 0, nil) end
  end
  -- cut ends
  if kind == "l" or kind == "r" then
    local offs = (kind == "l") and { 1, 0, 2 } or { 2, 0, 1 }
    for li, lg in ipairs(LOGS) do
      local fh = lg.h - 1                                -- face height (gap row excluded)
      local ew = math.floor(lg.h * 0.7) + 1
      local ry = (fh - 1) / 2
      local rx = (ew - 1) / 2
      local ecy = lg.y0 + ry
      for i = 0, ew + offs[li] do
        local x = (kind == "l") and i or (15 - i)
        local ex = i - offs[li] - rx                     -- x relative to ellipse centre (outward negative)
        for y = lg.y0, lg.y0 + lg.h - 1 do
          local ey = y - ecy
          local rr = math.sqrt((ex / (rx + 0.5)) ^ 2 + (ey / (ry + 0.5)) ^ 2)
          if rr <= 1 and y < lg.y0 + fh then
            local lx = (kind == "l") and ex or -ex
            local c
            if rr > 0.8 then c = (ey < 0 and lx < 0.5) and "dirt3" or "dirt2"
            elseif rr > 0.58 then c = (ey + lx < -1) and "sand5" or "sand4"
            elseif rr > 0.4 then c = (ey + lx < 0) and "sand4" or "sand3"
            else c = (ey + lx < 0) and "sand5" or "sand4" end
            if rr > 0.62 and rr <= 0.8 and ey + lx > 1.5 then c = "dirt3" end   -- outer growth ring, shaded side
            if math.abs(ex) < 0.6 and math.abs(ey) < 0.6 then c = "dirt3" end    -- pith
            P(img, x, y, c)
          elseif ex < 0 then
            P(img, x, y, nil)
          end
        end
      end
      -- radial check crack on the middle log
      if li == 2 then
        local x = (kind == "l") and (offs[2] + 1) or (14 - offs[2])
        P(img, x, math.floor(ecy), "dirt3")
      end
    end
    -- outline the exposed ends, then re-seat snow on the end caps
    local x0, x1 = 0, 11
    if kind == "r" then x0, x1 = 4, 15 end
    edgeOutline(img, x0, 3, x1, 31)
    for x = x0, x1 do
      local top
      for y = 2, 12 do if A(img, x, y) then top = y; break end end
      for y = 0, (top or 13) - 1 do P(img, x, y, nil) end
      if top then
        if top - 1 >= 0 then P(img, x, top - 1, (H(x, 3, seed) < 0.6) and "white" or "ink6") end
        P(img, x, top, "ink6")
        if top - 2 >= 0 and top > 2 then P(img, x, top - 2, "outline") end
      end
    end
  end
  return img
end
local function putLogs(col, kind, v, suffix)
  local img = logStack(kind, v)
  put(col, ROW, "logs_top_" .. suffix, half(img, 0), WOOD)
  put(col + 4, ROW, "logs_low_" .. suffix, half(img, 1), WOOD)
end
putLogs(14, "l", 0, "l")
putLogs(15, "m", 0, "m")
putLogs(16, "m", 1, "m2")
putLogs(17, "r", 0, "r")

-- Coal gondola (rows 17-18 as one 16x32 column). Coal heaped from the tile top (rows 0-6) above a steel rim
-- (rows 7-9); ribbed steel side panels below with rust streaks; dark bottom edge.
local function gondola(kind, v)
  local img = Image(16, 32, ColorMode.RGB)
  local seed = 1000 + v * 10
  -- side panel
  for y = 10, 31 do for x = 0, 15 do
    local c = "steel3"
    if H(x, y, seed) < 0.05 then c = "steel2" elseif H(x, y, seed + 1) < 0.02 then c = "steel4" end
    P(img, x, y, c)
  end end
  for x = 0, 15 do
    P(img, x, 10, "steel2")
    P(img, x, 28, "steel4"); P(img, x, 29, "steel2"); P(img, x, 30, "steel1"); P(img, x, 31, "outline")
  end
  -- ribs (pressed hat sections)
  for _, r in ipairs({ 3, 11 }) do
    for y = 11, 28 do P(img, r, y, "steel4"); P(img, r + 1, y, "steel2") end
    P(img, r, 11, "steel5")
  end
  -- rust streaks running down from the rim
  local nr = (v == 1) and 3 or 1
  for k = 1, nr do
    local x = math.floor(H(k, 0, seed + 2) * 16)
    if x ~= 3 and x ~= 11 and x ~= 4 and x ~= 12 then
      local len = 3 + math.floor(H(k, 1, seed + 2) * ((v == 1) and 10 or 6))
      for y = 11, 11 + len do P(img, x, y, (y < 13 + len // 2) and "dirt3" or "dirt2") end
    end
  end
  if v == 1 then
    -- dent
    P(img, 7, 19, "steel2"); P(img, 8, 19, "steel2"); P(img, 7, 20, "steel1"); P(img, 8, 20, "steel4"); P(img, 9, 20, "steel3"); P(img, 8, 21, "steel4")
  end
  -- rim
  for x = 0, 15 do P(img, x, 7, "steel4"); P(img, x, 8, "steel3"); P(img, x, 9, "steel1") end
  for _, rx in ipairs({ 1, 6, 9, 14 }) do P(img, rx, 8, "steel5"); P(img, rx + 1, 9, "outline") end
  for _, rx in ipairs({ 1, 6, 9, 14 }) do P(img, rx, 29, "steel4") end
  -- coal heap
  for y = 0, 6 do for x = 0, 15 do P(img, x, y, (y >= 5) and "outline" or "ink1") end end
  local function lump(cx, cy, r)
    for j = -r, r do for i = -r, r do
      if i * i + j * j <= r * r + r * 0.6 then
        local x, y = (cx + i) % 16, cy + j
        if y >= 0 and y <= 6 then
          local c = "ink1"
          if i + j <= -r then c = "ink2" end
          if i + j > r - 1 then c = "outline" end
          P(img, x, y, c)
        end
      end
    end end
    if cy - r + 1 >= 0 then P(img, (cx - r + 1) % 16, cy - r + 1, "ink4") end
  end
  for k = 1, 9 do
    local r = 1 + math.floor(H(k, 0, seed + 3) * 2)
    lump(math.floor(H(k, 1, seed + 3) * 16), 1 + math.floor(H(k, 2, seed + 3) * 5), r)
  end
  for x = 0, 15 do
    if H(x, 0, seed + 4) < 0.22 then P(img, x, 0, nil)
    elseif H(x, 0, seed + 5) < 0.3 then P(img, x, 0, (H(x, 0, seed + 6) < 0.5) and "white" or "ink5") end
    if H(x, 1, seed + 7) < 0.08 then P(img, x, 1, "ink6") end
    if H(x, 4, seed + 8) < 0.06 then P(img, x, 4, "ink4") end
  end
  -- snow dusting on the rim
  for x = 0, 15 do if H(x, 7, seed + 9) < 0.3 then P(img, x, 7, "ink6") end end
  if kind == "l" then
    for y = 0, 3 do P(img, 0, y, nil); P(img, 1, y, nil); P(img, 2, y, nil) end
    P(img, 3, 0, nil)
    for y = 4, 31 do P(img, 0, y, "outline"); P(img, 1, y, "steel4"); P(img, 2, y, "steel3"); P(img, 3, y, "steel2") end
    P(img, 0, 4, nil); P(img, 1, 3, "outline"); P(img, 2, 3, "outline"); P(img, 0, 5, "outline")
    P(img, 1, 4, "white"); P(img, 2, 4, "ink6"); P(img, 1, 5, "steel5")
    for _, y in ipairs({ 13, 19, 25 }) do P(img, 2, y, "steel5"); P(img, 3, y + 1, "steel1") end
    P(img, 3, 1, "outline"); P(img, 3, 2, "ink2")
  elseif kind == "r" then
    for y = 0, 3 do P(img, 15, y, nil); P(img, 14, y, nil); P(img, 13, y, nil) end
    P(img, 12, 0, nil)
    for y = 4, 31 do P(img, 12, y, "steel3"); P(img, 13, y, "steel2"); P(img, 14, y, "steel1"); P(img, 15, y, "outline") end
    P(img, 15, 4, nil); P(img, 14, 3, "outline"); P(img, 13, 3, "outline"); P(img, 15, 5, "outline")
    P(img, 13, 4, "ink6"); P(img, 14, 4, "ink5"); P(img, 12, 4, "white")
    for _, y in ipairs({ 13, 19, 25 }) do P(img, 13, y, "steel4"); P(img, 14, y + 1, "outline") end
    P(img, 12, 1, "outline"); P(img, 12, 2, "outline")
  end
  return img
end
local function putGon(col, kind, v, suffix)
  local img = gondola(kind, v)
  put(col, ROW, "gon_top_" .. suffix, half(img, 0), METAL)
  put(col + 4, ROW, "gon_low_" .. suffix, half(img, 1), METAL)
end
putGon(22, "l", 0, "l")
putGon(23, "m", 0, "m")
putGon(24, "m", 1, "m2")
putGon(25, "r", 0, "r")

---------------------------------------------------------------------------------------------------
-- write outputs
local spr = Sprite(SHEET.width, SHEET.height, ColorMode.RGB)
spr.cels[1].image = SHEET
spr.layers[1].name = "tiles"
local names = {}; for n in pairs(K.PAL) do names[#names + 1] = n end; table.sort(names)
local pal = Palette(#names + 1); pal:setColor(0, Color{ r = 0, g = 0, b = 0, a = 0 })
for i, n in ipairs(names) do local c = K.PAL[n]; pal:setColor(i, Color{ r = c[1], g = c[2], b = c[3], a = 255 }) end
spr:setPalette(pal)
spr:saveAs(ROOT .. "/art-src/tiles/m1_train.aseprite")
spr:saveCopyAs(ROOT .. "/public/assets/tiles/m1_train.png")
spr:close()

table.sort(manifest.tiles, function(a, b) return a.id < b.id end)
local f = io.open(ROOT .. "/art-src/tiles/m1_train_tiles.json", "w")
f:write(json.encode(manifest))
f:close()
print("built m1_train tileset (" .. #manifest.tiles .. " tiles, " .. SHEET.width .. "x" .. SHEET.height .. ")")
