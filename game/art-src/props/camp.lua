-- Prison camp props: watchtower, prison cell, lamp post, razor wire coil.
-- Build: bash tools/build-art.sh art-src/props/camp.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local P = dofile(ROOT .. "/art-src/props/lib/pk.lua")(K)

-------------------------------------------------------------------------------
-- prop_watchtower 48x112. Deck walk surface = row y=32 (map places a one-way plank row there).
-- Roof y0..15, railing y16..31, deck y32..37, legs below, feet on y=111.
-------------------------------------------------------------------------------
-- a log leg from (xa,ya) to (xb,yb), w px wide, shaded by tone table
local function leg(img, xa, ya, xb, yb, tones)
  local w = #tones
  for y = ya, yb do
    local f = (y - ya) / (yb - ya)
    local x = math.floor(xa + (xb - xa) * f + 0.5)
    for i = 1, w do P.set(img, x + i - 1, y, tones[i]) end
  end
end
-- 2px diagonal plank brace with lit top edge and a dark underside
local function brace(img, x0, y0, x1, y1, back)
  local top, mid, low = back and "dirt2" or "dirt4", back and "dirt2" or "dirt3", back and "dirt1" or "dirt1"
  P.line(img, x0, y0, x1, y1, nil, function(x, y) P.set(img, x, y + 2, low) end)
  P.line(img, x0, y0, x1, y1, nil, function(x, y) P.set(img, x, y, top); P.set(img, x, y + 1, mid) end)
end
local function watchtower(img)
  local FRONT = { "dirt2", "dirt4", "dirt3", "dirt2" }
  local BACK = { "dirt1", "dirt2", "dirt1" }
  -- back legs and back bracing (in shadow)
  leg(img, 12, 37, 9, 109, BACK); leg(img, 33, 37, 36, 109, BACK)
  brace(img, 14, 44, 33, 70, true); brace(img, 14, 70, 33, 44, true)
  -- ladder (behind the front frame) from the ground up to a hatch in the deck
  for y = 38, 109 do P.set(img, 26, y, "dirt3"); P.set(img, 27, y, "dirt1"); P.set(img, 32, y, "dirt3"); P.set(img, 33, y, "dirt1") end
  for y = 41, 107, 5 do P.hline(img, 27, 31, y, "dirt4"); P.hline(img, 28, 32, y + 1, "dirt1") end
  -- front legs (splayed) and bracing
  leg(img, 4, 37, 1, 109, FRONT); leg(img, 40, 37, 43, 109, FRONT)
  brace(img, 7, 41, 39, 71, false); brace(img, 7, 71, 39, 41, false)
  brace(img, 5, 77, 41, 105, false); brace(img, 5, 105, 41, 77, false)
  -- cross ties (horizontal planks bolted through the legs)
  P.plankH(img, 3, 72, 42, 3, { seed = 4 }); P.plankH(img, 1, 106, 46, 3, { seed = 8 })
  for _, x in ipairs({ 5, 41 }) do P.nail(img, x, 73); end
  P.nail(img, 3, 107); P.nail(img, 43, 107)
  -- snow on the cross ties
  P.snow(img, 4, 43, 72, 1, { seed = 31, drips = true, lumpy = 0.4 })
  P.snow(img, 2, 45, 106, 1, { seed = 32, lumpy = 0.4 })
  -- deck: walk plank row (y32), beam face with log ends (y33..36), underside (y37)
  P.fill(img, 0, 32, 48, 6, "dirt3")
  P.hline(img, 0, 47, 32, "dirt5"); P.hline(img, 0, 47, 33, "dirt4")
  for x = 0, 47 do if x % 7 == 3 then P.set(img, x, 33, "dirt2") end end
  P.hline(img, 0, 47, 36, "dirt2"); P.hline(img, 0, 47, 37, "dirt1")
  for _, x in ipairs({ 2, 11, 20, 29, 38 }) do       -- joist log ends (end grain rings)
    P.set(img, x, 34, "dirt5"); P.set(img, x + 1, 34, "dirt4"); P.set(img, x + 2, 34, "dirt3")
    P.set(img, x, 35, "dirt4"); P.set(img, x + 1, 35, "dirt2"); P.set(img, x + 2, 35, "dirt2")
    P.set(img, x + 3, 35, "dirt1"); P.set(img, x + 3, 34, "dirt2")
  end
  for x = 0, 47 do if x % 9 == 5 then P.set(img, x, 32, "dirt4") end end     -- plank joints on the walk row
  P.set(img, 0, 32, "white"); P.set(img, 1, 32, "ink6"); P.set(img, 46, 32, "ink6"); P.set(img, 47, 32, "ink5")
  -- corner posts (roof supports) and railing
  leg(img, 3, 13, 3, 31, { "dirt3", "dirt4", "dirt2" }); leg(img, 42, 13, 42, 31, { "dirt3", "dirt3", "dirt1" })
  P.vline(img, 23, 19, 31, "dirt3"); P.vline(img, 24, 19, 31, "dirt2")                      -- middle baluster
  -- kick board planks
  P.plankH(img, 1, 27, 46, 5, { seed = 12 })
  P.vline(img, 16, 27, 31, "dirt2"); P.vline(img, 31, 27, 31, "dirt2")
  P.set(img, 17, 28, "dirt4"); P.set(img, 32, 28, "dirt4")
  -- regime insignia stencil on the kickboard (red paint, chipped)
  P.fill(img, 21, 28, 6, 3, "red2"); P.hline(img, 21, 26, 28, "red3"); P.set(img, 23, 29, "white"); P.set(img, 24, 29, "red4")
  P.set(img, 26, 30, "dirt3")
  -- top rail (log) with snow
  P.fill(img, 1, 19, 46, 3, "dirt3"); P.hline(img, 1, 46, 19, "dirt4"); P.hline(img, 1, 46, 21, "dirt2")
  P.set(img, 1, 19, "dirt5"); P.set(img, 1, 20, "dirt4"); P.set(img, 2, 20, "dirt5"); P.set(img, 46, 20, "dirt2")
  for x = 6, 44, 8 do P.set(img, x, 20, "dirt2"); P.set(img, x + 1, 20, "dirt2") end
  P.snow(img, 1, 46, 19, 1, { seed = 40, lumpy = 0.5 })
  -- roof: board gable + thick fascia slopes, heavy snow
  local peak, eave = 3, 13
  for y = peak, eave do
    local hw = math.floor((y - peak) / (eave - peak) * 23 + 0.5)
    for x = 23 - hw, 24 + hw do
      local c = ((x - 1) % 4 == 0) and "dirt1" or (x < 24 and "dirt3" or "dirt2")
      P.set(img, x, y, c)
    end
  end
  -- fascia boards along both slopes
  for x = 0, 47 do
    local d = (x <= 23) and (23 - x) or (x - 24)
    local y = peak + math.floor(d / 23 * (eave - peak) + 0.5)
    local lit = x <= 23
    P.set(img, x, y, lit and "dirt5" or "dirt4"); P.set(img, x, y + 1, lit and "dirt4" or "dirt3"); P.set(img, x, y + 2, "dirt2")
  end
  -- eave beam / roof shadow on the posts
  P.hline(img, 2, 45, 15, "dirt1"); P.hline(img, 4, 43, 16, "outline")
  P.set(img, 3, 16, "dirt2"); P.set(img, 4, 16, "dirt3"); P.set(img, 42, 16, "dirt1")
  -- snow on the roof slopes (thicker toward the eaves, lit on the left)
  local rnd = P.rng(55)
  for x = -1, 48 do
    local d = (x <= 23) and (23 - x) or (x - 24)
    local y = peak + math.floor(math.min(d, 23) / 23 * (eave - peak) + 0.5)
    local t = 2 + ((d > 6 and d < 21) and 1 or 0) + ((rnd() < 0.3) and 1 or 0)
    if x < 0 or x > 47 then t = 1 end
    for k = 0, t - 1 do
      local c = (k == 0) and ((x <= 23) and "white" or "ink6") or "ink6"
      if k == t - 1 then c = (x <= 23) and "ink6" or "ink5" end
      P.set(img, x, y - t + k + 1, c)
    end
    P.set(img, x, y + 1, (x <= 23) and "ink5" or "sky5")
    if x > 23 and t > 2 then P.set(img, x, y - 1, "ink5") end
  end
  P.set(img, 0, 14, "ink5"); P.set(img, 47, 14, "ink5"); P.set(img, 0, 15, "sky5")
  -- icicles under the eaves
  for _, x in ipairs({ 1, 6, 11, 37, 44 }) do P.set(img, x, 16, "sky5"); P.set(img, x, 17, "ink5") end
  -- feet in snow drifts
  P.mound(img, 3, 111, 6, 3); P.mound(img, 43, 111, 6, 3); P.mound(img, 23, 111, 9, 2)
  P.selout(img)
end
K.build(P.spec("prop_watchtower", 48, 112, {
  { tag = "prop_watchtower_idle", ms = 100, frames = { { grid = watchtower } } },
}))

-------------------------------------------------------------------------------
-- prop_prison_cell 64x48: timber frame, back wall, steel bars and a barred door.
-------------------------------------------------------------------------------
local function bar(img, x, y0, y1, bend)
  -- vertical 2px steel bar; bend(y) returns x offset
  for y = y0, y1 do
    local o = bend and bend(y) or 0
    P.set(img, x + o, y, "steel4"); P.set(img, x + o + 1, y, "steel2")
    if o ~= 0 then P.set(img, x + o, y, "steel5") end
  end
end
local function cellFrame(img)
  -- back wall: dark interior planks
  for i, y in ipairs({ 9, 14, 19, 24, 29, 34, 39 }) do
    P.plankH(img, 6, y, 52, 5, { base = 2, seed = i * 3, knot = false })
    P.hline(img, 6, 57, y + 4, "dirt1")
  end
  P.fill(img, 6, 9, 52, 2, "dirt1")               -- shadow under the lintel
  P.vline(img, 6, 9, 42, "dirt1"); P.vline(img, 7, 9, 42, "dirt1")
  -- straw on the floor
  for _, p in ipairs({ { 9, 42 }, { 10, 41 }, { 12, 42 }, { 15, 42 }, { 44, 42 }, { 47, 41 }, { 48, 42 }, { 52, 42 } }) do
    P.set(img, p[1], p[2], "sand3"); P.set(img, p[1] + 1, p[2], "sand2")
  end
end
local function cellTimber(img)
  -- lintel, posts, sill
  P.plankH(img, 0, 4, 64, 5, { base = 3, seed = 7 })
  P.plankV(img, 1, 9, 5, 34, { base = 3, seed = 3 }); P.plankV(img, 58, 9, 5, 34, { base = 3, seed = 5 })
  P.vline(img, 58, 9, 42, "dirt2")
  P.plankH(img, 0, 43, 64, 4, { base = 3, seed = 9 })
  P.hline(img, 6, 57, 43, "dirt2")
  -- iron corner brackets
  for _, b in ipairs({ { 1, 8 }, { 59, 8 }, { 1, 42 }, { 59, 42 } }) do
    P.fill(img, b[1], b[2], 4, 2, "steel3"); P.set(img, b[1], b[2], "steel5"); P.set(img, b[1] + 3, b[2] + 1, "steel1")
    P.rivet(img, b[1] + 1, b[2])
  end
  P.nail(img, 3, 6); P.nail(img, 31, 6); P.nail(img, 60, 6); P.nail(img, 3, 44); P.nail(img, 60, 44)
end
local BARS_L = { 8, 13, 18 }
local BARS_R = { 42, 47, 52 }
local function crossbar(img, x0, x1, y)
  P.hline(img, x0, x1, y, "steel4"); P.hline(img, x0, x1, y + 1, "steel2"); P.set(img, x0, y, "steel5")
end
-- the barred door drawn in door-local coords (0..15 x 0..31) -> color or nil
local function doorPixel(u, v)
  if u < 0 or u > 15 or v < 0 or v > 31 then return nil end
  if u <= 1 then return (u == 0) and "steel4" or "steel3" end              -- hinge stile
  if u >= 14 then return (u == 14) and "steel3" or "steel2" end            -- lock stile
  if v <= 1 then return (v == 0) and "steel5" or "steel3" end
  if v >= 30 then return (v == 30) and "steel3" or "steel1" end
  if v == 13 or v == 14 then return (v == 13) and "steel4" or "steel2" end
  if u == 5 or u == 10 then return "steel4" end
  if u == 6 or u == 11 then return "steel2" end
  return nil
end
local function door(img, ox, oy, ang)
  -- rotate around the top hinge (ox, oy); sample inverse
  local ca, sa = math.cos(ang), math.sin(ang)
  for y = 0, 47 do for x = 0, 63 do
    local dx, dy = x - ox, y - oy
    local u = math.floor(dx * ca + dy * sa + 0.5)
    local v = math.floor(-dx * sa + dy * ca + 0.5)
    local c = doorPixel(u, v)
    if c then P.set(img, x, y, c) end
  end end
end
local function cellIntact(img)
  cellFrame(img)
  for _, x in ipairs(BARS_L) do bar(img, x, 9, 42) end
  for _, x in ipairs(BARS_R) do bar(img, x, 9, 42) end
  crossbar(img, 6, 23, 22); crossbar(img, 40, 57, 22)
  door(img, 24, 10, 0)
  -- hinges and lock
  P.fill(img, 22, 13, 3, 3, "steel3"); P.set(img, 22, 13, "steel5"); P.fill(img, 22, 35, 3, 3, "steel3"); P.set(img, 22, 35, "steel5")
  P.fill(img, 37, 21, 4, 6, "steel3"); P.hline(img, 37, 40, 21, "steel5"); P.vline(img, 40, 21, 26, "steel1")
  P.set(img, 38, 23, "outline"); P.set(img, 38, 24, "outline")
  -- brass padlock hanging off the lock box
  P.set(img, 38, 27, "sand2"); P.set(img, 39, 27, "sand2"); P.fill(img, 37, 28, 4, 3, "sand3")
  P.hline(img, 37, 40, 28, "sand5"); P.set(img, 40, 29, "sand2"); P.set(img, 40, 30, "sand1"); P.set(img, 38, 29, "sand1")
  for _, x in ipairs({ 8, 13, 18, 42, 47, 52 }) do P.rivet(img, x, 22) end
  cellTimber(img)
  P.snow(img, 0, 63, 4, 2, { seed = 14 })
  P.selout(img)
end
local function cellBroken(img)
  cellFrame(img)
  -- left bars: one bent outward, one snapped
  bar(img, 8, 9, 42)
  bar(img, 13, 9, 42, function(y) local t = (y - 9) / 33; return -math.floor(math.sin(t * math.pi) * 3 + 0.5) end)
  bar(img, 18, 9, 19); bar(img, 18, 31, 42)
  P.set(img, 19, 20, "steel4"); P.set(img, 20, 21, "steel5")          -- snapped, curled tips
  P.set(img, 17, 30, "steel4"); P.set(img, 16, 29, "steel5")
  -- right bars: one bowed
  bar(img, 42, 9, 42, function(y) local t = (y - 9) / 33; return math.floor(math.sin(t * math.pi) * 2 + 0.5) end)
  bar(img, 47, 9, 42); bar(img, 52, 9, 42)
  crossbar(img, 6, 11, 22); crossbar(img, 44, 57, 22)
  P.set(img, 12, 22, "steel5"); P.set(img, 12, 23, "steel3")          -- torn crossbar end
  -- door hanging off its top hinge, swung down and outward, dragging on the sill
  door(img, 24, 10, 0.42)
  P.fill(img, 22, 13, 3, 3, "steel3"); P.set(img, 22, 13, "steel5")   -- remaining hinge
  P.set(img, 22, 35, "steel2"); P.set(img, 23, 35, "steel1")          -- broken lower hinge stub
  -- lock box ripped off; padlock lying in the straw
  cellTimber(img)
  P.fill(img, 44, 40, 4, 3, "sand3"); P.hline(img, 44, 47, 40, "sand5"); P.set(img, 47, 41, "sand2")
  P.set(img, 48, 40, "sand2"); P.set(img, 48, 39, "sand3"); P.set(img, 49, 38, "sand3")
  P.set(img, 45, 41, "sand1")
  P.snow(img, 0, 63, 4, 2, { seed = 14 })
  -- snow knocked off where the door tore loose
  for x = 24, 30 do P.set(img, x, 2, nil); P.set(img, x, 1, nil) end
  P.selout(img)
end
K.build(P.spec("prop_prison_cell", 64, 48, {
  { tag = "prop_prison_cell_broken", ms = 100, frames = { { grid = cellBroken } } },
  { tag = "prop_prison_cell_intact", ms = 100, frames = { { grid = cellIntact } } },
}))

-------------------------------------------------------------------------------
-- prop_lamp_post 16x48: log pole, steel shade, warm bulb (2-frame flicker)
-------------------------------------------------------------------------------
local GLOW = { 255, 224, 102, 70 }
local GLOW2 = { 255, 248, 208, 110 }
local function lamp(bright)
  return function(img)
    -- pole
    for y = 15, 45 do
      P.set(img, 6, y, "dirt3"); P.set(img, 7, y, "dirt4"); P.set(img, 8, y, "dirt3"); P.set(img, 9, y, "dirt2")
    end
    for _, y in ipairs({ 16, 23, 31, 38 }) do P.set(img, 8, y, "dirt2"); P.set(img, 8, y + 1, "dirt1") end
    -- iron band + cable
    P.hline(img, 6, 9, 20, "steel4"); P.set(img, 9, 20, "steel2"); P.set(img, 6, 20, "steel5")
    P.vline(img, 10, 15, 30, "ink1")
    P.set(img, 10, 31, "ink1"); P.set(img, 11, 32, "ink1")
    -- base: stone block half-buried in snow
    P.fill(img, 4, 44, 8, 3, "ink3"); P.hline(img, 4, 11, 44, "ink4"); P.vline(img, 11, 44, 46, "ink2")
    P.mound(img, 8, 47, 7, 2)
    -- lantern box: steel frame around glowing glass
    P.fill(img, 4, 9, 8, 5, bright and "fire5" or "fire4")
    P.fill(img, 6, 10, 4, 3, bright and "fire6" or "fire5")
    if not bright then P.set(img, 7, 11, "fire6") end
    P.vline(img, 4, 9, 13, "steel4"); P.vline(img, 11, 9, 13, "steel2"); P.vline(img, 7, 9, 13, "steel3"); P.vline(img, 8, 9, 13, "steel2")
    P.hline(img, 4, 11, 13, "steel2"); P.hline(img, 5, 10, 14, "steel3"); P.set(img, 10, 14, "steel1")
    P.set(img, 5, 9, bright and "white" or "fire6")
    -- shade (cone) with snow
    local rows = { { 6, 9 }, { 4, 11 }, { 3, 12 }, { 2, 13 } }
    for i, r in ipairs(rows) do
      local y = 4 + i
      for x = r[1], r[2] do
        local c = (x <= 6) and "steel4" or (x <= 10) and "steel3" or "steel2"
        if i == 4 then c = (x <= 7) and "steel3" or "steel1" end
        P.set(img, x, y, c)
      end
    end
    P.set(img, 6, 5, "steel5"); P.set(img, 4, 6, "steel5")
    P.set(img, 7, 3, "steel3"); P.set(img, 8, 3, "steel2"); P.set(img, 7, 4, "steel4"); P.set(img, 8, 4, "steel2")
    P.snow(img, 4, 11, 6, 1, { seed = 3, drips = false, lumpy = 0.6 })
    P.selout(img)
    -- soft warm halo hugging the bulb (partial alpha; engine can add fx_glow on top)
    if bright then
      for _, p in ipairs({ { 2, 10 }, { 2, 11 }, { 2, 12 }, { 13, 10 }, { 13, 11 }, { 13, 12 }, { 4, 15 }, { 11, 15 }, { 3, 14 }, { 12, 14 } }) do
        if P.alpha(img, p[1], p[2]) == 0 then P.set(img, p[1], p[2], GLOW2) end
      end
    end
    -- warm light catching the top of the pole
    P.set(img, 7, 15, bright and "fire4" or "dirt5"); P.set(img, 6, 15, bright and "dirt5" or "dirt4")
  end
end
K.build(P.spec("prop_lamp_post", 16, 48, {
  { tag = "prop_lamp_post_idle", ms = 500, frames = { { grid = lamp(true) }, { grid = lamp(false), ms = 120 } } },
}))

-------------------------------------------------------------------------------
-- prop_wire_coil 32x16: concertina razor wire on a snow drift, staked down
-------------------------------------------------------------------------------
local function wire(img)
  -- low drift underneath
  for x = 1, 30 do
    local t = (x < 4 or x > 27) and 1 or 2
    for k = 0, t - 1 do P.set(img, x, 15 - k, (k == t - 1) and ((x < 16) and "white" or "ink6") or "ink5") end
  end
  -- stakes
  for _, sx in ipairs({ 3, 28 }) do
    P.line(img, sx - 2, 14, sx + 1, 4, nil, function(x, y) P.set(img, x, y, "dirt3"); P.set(img, x + 1, y, "dirt1") end)
  end
  local loops = {}
  for i = 0, 5 do loops[#loops + 1] = 6 + i * 4 end
  local cy, rx, ry = 8, 4, 6
  local function arc(cx, front)
    for a = 0, 359, 3 do
      local r = math.rad(a)
      local x, y = math.floor(cx + math.cos(r) * rx - math.sin(r) * 2 + 0.5), math.floor(cy + math.sin(r) * ry + 0.5)
      local isFront = math.cos(r) >= 0
      if isFront == front then
        local c
        if front then c = (math.sin(r) < -0.3) and "steel5" or "steel4" else c = "steel2" end
        P.set(img, x, y, c)
      end
    end
  end
  for _, cx in ipairs(loops) do arc(cx, false) end
  -- dark drop-shadow under the front wire so it reads on snow
  local tmp = {}
  for _, cx in ipairs(loops) do
    for a = 0, 359, 3 do
      local r = math.rad(a)
      if math.cos(r) >= 0 then
        tmp[#tmp + 1] = { math.floor(cx + math.cos(r) * rx - math.sin(r) * 2 + 0.5), math.floor(cy + math.sin(r) * ry + 0.5) }
      end
    end
  end
  for _, p in ipairs(tmp) do P.under(img, p[1] + 1, p[2] + 1, "steel1") end
  for _, cx in ipairs(loops) do arc(cx, true) end
  -- razor barbs
  for i, cx in ipairs(loops) do
    local bx, by = cx + rx, cy - 1 + (i % 2) * 3
    P.set(img, bx + 1, by - 1, "steel5"); P.set(img, bx - 1, by + 1, "steel3")
    P.set(img, cx - 2, cy - ry + 1, "steel3")
    P.set(img, cx + 2, cy + ry - 1, "white")
  end
  P.set(img, 6, 2, "white"); P.set(img, 14, 2, "white")    -- glints
end
K.build(P.spec("prop_wire_coil", 32, 16, {
  { tag = "prop_wire_coil_idle", ms = 100, frames = { { grid = wire } } },
}))
