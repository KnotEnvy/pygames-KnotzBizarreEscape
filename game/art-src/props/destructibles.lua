-- Destructible props: crate, supply crate, barrel, explosive barrel, sandbags.
-- Build: bash tools/build-art.sh art-src/props/destructibles.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local P = dofile(ROOT .. "/art-src/props/lib/pk.lua")(K)

-- shared damage marks ---------------------------------------------------------
-- concave dent lit from the top-left: upper-left inner face in shadow, lower-right face catches light
local function dent(img, x, y, ramp, big)
  P.over(img, x, y, ramp .. "1"); P.over(img, x + 1, y, ramp .. "2"); P.over(img, x, y + 1, ramp .. "2")
  P.over(img, x + 1, y + 1, ramp .. "3"); P.over(img, x + 2, y + 1, ramp .. "5"); P.over(img, x + 1, y + 2, ramp .. "4")
  if big then
    P.over(img, x + 2, y, ramp .. "2"); P.over(img, x - 1, y + 1, ramp .. "2"); P.over(img, x + 2, y + 2, ramp .. "5")
    P.over(img, x, y + 2, ramp .. "3")
  end
end
local function hole(img, x, y, rim)
  P.over(img, x, y, "outline"); P.over(img, x + 1, y + 1, rim); P.over(img, x + 1, y, rim)
end

-------------------------------------------------------------------------------
-- prop_crate 16x16
-------------------------------------------------------------------------------
local function crateBody(img)
  -- recessed plank panel
  P.fill(img, 1, 3, 14, 12, "dirt3")
  for i, py in ipairs({ 5, 8, 11 }) do P.plankH(img, 3, py, 10, 2, { seed = i * 5, base = 3, ends = false, knot = false }) end
  P.hline(img, 3, 12, 7, "dirt1"); P.hline(img, 3, 12, 10, "dirt1")
  P.hline(img, 3, 12, 5, "dirt2"); P.vline(img, 3, 5, 12, "dirt2")      -- frame casts shadow into the recess
  P.set(img, 6, 9, "dirt2"); P.set(img, 9, 12, "dirt2"); P.set(img, 10, 6, "dirt2")  -- grain
  -- diagonal brace (bottom-left -> top-right)
  P.line(img, 3, 12, 12, 5, nil, function(x, y) P.set(img, x + 1, y + 1, "dirt1") end)
  P.line(img, 3, 12, 12, 5, nil, function(x, y) P.set(img, x, y, "dirt5"); P.set(img, x + 1, y, "dirt4") end)
  -- frame boards
  P.fill(img, 1, 3, 14, 2, "dirt4"); P.hline(img, 1, 14, 3, "dirt5")                 -- top
  P.fill(img, 1, 13, 14, 2, "dirt4"); P.hline(img, 1, 14, 13, "dirt5"); P.hline(img, 1, 14, 14, "dirt2") -- bottom
  P.vline(img, 1, 5, 12, "dirt5"); P.vline(img, 2, 5, 12, "dirt4")                   -- left
  P.vline(img, 13, 5, 12, "dirt3"); P.vline(img, 14, 3, 14, "dirt2")                 -- right (shadow side)
  P.set(img, 6, 4, "dirt3"); P.set(img, 7, 4, "dirt3"); P.set(img, 2, 9, "dirt3")     -- board grain
  P.set(img, 9, 14, "dirt1"); P.set(img, 10, 14, "dirt1")
  -- nails
  P.nail(img, 2, 4); P.nail(img, 12, 4); P.nail(img, 2, 13); P.nail(img, 12, 13)
end

local function crateIdle(img)
  crateBody(img)
  P.snow(img, 1, 14, 3, 2, { seed = 3 })
  P.selout(img)
end

local function crateDamaged(img)
  crateBody(img)
  -- top-right corner smashed away: jagged notch with fresh splintered wood on the edge
  local notch = { { 10, 3, 14 }, { 11, 4, 14 }, { 12, 5, 14 }, { 13, 6, 14 }, { 14, 7, 14 } }
  for _, n in ipairs(notch) do for x = n[1], n[3] do P.clear(img, x, n[2]) end end
  for _, p in ipairs({ { 9, 3 }, { 10, 4 }, { 11, 5 }, { 12, 6 }, { 13, 7 }, { 14, 8 } }) do P.set(img, p[1], p[2], "sand4") end
  P.set(img, 9, 4, "dirt5"); P.set(img, 12, 7, "dirt5")
  P.set(img, 11, 3, "sand4"); P.set(img, 13, 5, "dirt5")        -- splinters sticking up
  -- brace snapped in the middle, crack across the lower planks
  P.set(img, 7, 8, "dirt1"); P.set(img, 8, 8, "dirt1"); P.set(img, 8, 7, "outline"); P.set(img, 7, 9, "dirt2")
  P.line(img, 4, 9, 6, 11, "dirt1"); P.set(img, 7, 11, "dirt1"); P.set(img, 8, 12, "dirt1")
  hole(img, 10, 10, "dirt5")
  P.set(img, 2, 13, "outline")                                  -- nail popped
  P.snow(img, 1, 7, 3, 1, { seed = 9, drips = false })
  P.selout(img)
end

K.build(P.spec("prop_crate", 16, 16, {
  { tag = "prop_crate_idle", ms = 100, frames = { { grid = crateIdle } } },
  { tag = "prop_crate_damaged", ms = 100, frames = { { grid = crateDamaged } } },
}))

-------------------------------------------------------------------------------
-- prop_supply_crate 24x16 (olive military crate, steel straps, stencilled star)
-------------------------------------------------------------------------------
local STAR = {
  "...x...",
  "..xxx..",
  "xxxxxxx",
  ".xxxxx.",
  ".xx.xx.",
  ".x...x.",
}
local function strap(img, x, y0, y1)
  P.vline(img, x, y0, y1, "steel4"); P.vline(img, x + 1, y0, y1, "steel2")
  P.set(img, x, y0, "steel5")
end
local function supplyBody(img, lidTilt)
  -- body
  P.fill(img, 2, 7, 20, 8, "olive3")
  P.vline(img, 2, 7, 14, "olive4"); P.vline(img, 21, 7, 14, "olive2")
  P.hline(img, 2, 21, 14, "olive2"); P.hline(img, 3, 20, 13, "olive2")
  P.hline(img, 2, 21, 7, "olive1")                       -- shadow under lid lip
  P.vline(img, 9, 8, 12, "olive2"); P.vline(img, 15, 8, 12, "olive2") -- board seams
  P.set(img, 10, 8, "olive4"); P.set(img, 16, 8, "olive4")
  -- stencilled star
  P.grid(img, STAR, { x = "sand4" }, 9, 7 + 1)
  P.set(img, 11, 12, "sand3"); P.set(img, 14, 13, "sand3"); P.set(img, 12, 10, "sand5")
  -- steel corner guards on the feet
  P.fill(img, 2, 12, 2, 3, "steel3"); P.set(img, 2, 12, "steel5"); P.set(img, 3, 14, "steel1")
  P.fill(img, 20, 12, 2, 3, "steel2"); P.set(img, 20, 12, "steel4"); P.set(img, 21, 14, "steel1")
  -- lid
  for x = 1, 22 do
    local dy = (lidTilt and x >= 13) and -(x >= 18 and 2 or 1) or 0
    P.set(img, x, 4 + dy, "olive5"); P.set(img, x, 5 + dy, "olive4"); P.set(img, x, 6 + dy, "olive3")
    if dy < 0 then for y = 7 + dy, 6 do P.set(img, x, y, "outline") end end
  end
  if not lidTilt then P.set(img, 1, 6, "olive2"); P.set(img, 22, 6, "olive1"); P.set(img, 22, 5, "olive2") end
  -- straps over lid and body
  strap(img, 5, 4, 14); strap(img, 18, 4, 14)
  P.rivet(img, 5, 9); P.rivet(img, 18, 9)
  -- latch
  P.fill(img, 11, 6, 2, 2, "steel3"); P.set(img, 11, 6, "steel5"); P.set(img, 12, 7, "steel1")
end
local function supplyIdle(img)
  supplyBody(img, false)
  P.snow(img, 1, 22, 4, 2, { seed = 11 })
  P.selout(img)
end
local function supplyDamaged(img)
  supplyBody(img, true)
  P.fill(img, 18, 7, 2, 4, "olive3"); P.set(img, 18, 7, "olive1"); P.set(img, 19, 7, "olive1") -- strap snapped
  P.set(img, 18, 11, "steel5"); P.set(img, 19, 12, "steel2")                 -- strap end
  P.set(img, 20, 3, "steel4"); P.set(img, 21, 2, "steel5")                   -- strap end sprung up over lid
  dent(img, 15, 10, "olive", true)
  P.line(img, 3, 9, 6, 11, nil, function(x, y) P.over(img, x, y, "steel4") end)  -- scrape to bare metal
  P.set(img, 4, 9, "steel5")
  hole(img, 8, 10, "olive5"); hole(img, 13, 12, "olive5")
  P.snow(img, 1, 9, 4, 1, { seed = 4, drips = false })
  P.selout(img)
end
K.build(P.spec("prop_supply_crate", 24, 16, {
  { tag = "prop_supply_crate_idle", ms = 100, frames = { { grid = supplyIdle } } },
  { tag = "prop_supply_crate_damaged", ms = 100, frames = { { grid = supplyDamaged } } },
}))

-------------------------------------------------------------------------------
-- drums (shared): body x2..13, y4..18, outline row 19
-------------------------------------------------------------------------------
local SH = { 3, 4, 5, 4, 3, 3, 3, 3, 2, 2, 2, 1 }   -- column tone across the cylinder
local function drumCol(ramp, i, d) return ramp .. math.max(1, math.min(5, SH[i + 1] + (d or 0))) end
local function drum(img, ramp)
  for i = 0, 11 do
    local x = 2 + i
    for y = 4, 18 do P.set(img, x, y, drumCol(ramp, i)) end
    -- top lid ellipse
    P.set(img, x, 4, drumCol(ramp, i, 1))
    if i >= 1 and i <= 10 then P.set(img, x, 5, ramp .. (i < 4 and "2" or "1")) end
    P.set(img, x, 6, drumCol(ramp, i, 1)); P.set(img, x, 7, drumCol(ramp, i, -1))
    -- rolling hoops
    P.set(img, x, 9, drumCol(ramp, i, 1)); P.set(img, x, 10, drumCol(ramp, i, -1))
    P.set(img, x, 13, drumCol(ramp, i, 1)); P.set(img, x, 14, drumCol(ramp, i, -1))
    -- bottom chime
    P.set(img, x, 17, drumCol(ramp, i, 1)); P.set(img, x, 18, drumCol(ramp, i, -2))
  end
  P.clear(img, 2, 4); P.clear(img, 13, 4); P.clear(img, 2, 18); P.clear(img, 13, 18)
  P.set(img, 4, 4, ramp == "red" and "red5" or ramp .. "5")
  -- bung cap on the lid
  P.set(img, 9, 5, "steel4"); P.set(img, 10, 5, "steel2")
end

-------------------------------------------------------------------------------
-- prop_barrel 16x20 (olive oil drum)
-------------------------------------------------------------------------------
local function barrelBody(img)
  drum(img, "olive")
  -- painted sand band between the hoops
  for i = 0, 11 do P.set(img, 2 + i, 11, drumCol("sand", i)); P.set(img, 2 + i, 12, drumCol("sand", i, -1)) end
  P.set(img, 9, 11, "olive3"); P.set(img, 6, 12, "olive2")           -- chipped paint
  -- rust / chips on the shadow side
  P.set(img, 12, 8, "dirt3"); P.set(img, 11, 9, "dirt2"); P.set(img, 12, 15, "dirt2"); P.set(img, 3, 15, "olive2")
end
local function barrelIdle(img)
  barrelBody(img); P.snow(img, 2, 13, 4, 2, { seed = 6 }); P.selout(img)
end
local function barrelDamaged(img)
  barrelBody(img)
  dent(img, 9, 7, "olive", true); dent(img, 4, 14, "olive")
  hole(img, 6, 8, "olive5"); hole(img, 11, 15, "olive4")
  -- buckled rim on the right
  P.clear(img, 13, 5); P.clear(img, 12, 4); P.set(img, 12, 5, "olive1")
  P.snow(img, 2, 8, 4, 1, { seed = 2, drips = false })
  P.selout(img)
  -- oil drip leaking from the hole
  P.set(img, 6, 9, "ink1"); P.set(img, 6, 10, "ink1")
end
K.build(P.spec("prop_barrel", 16, 20, {
  { tag = "prop_barrel_idle", ms = 100, frames = { { grid = barrelIdle } } },
  { tag = "prop_barrel_damaged", ms = 100, frames = { { grid = barrelDamaged } } },
}))

-------------------------------------------------------------------------------
-- prop_explosive_barrel 16x20 (red drum, hazard stripes, flame symbol)
-------------------------------------------------------------------------------
-- hazard placard: yellow diamond, dark keyline, red flame inside
local PLACARD = {
  "....o....",
  "...oyo...",
  "..oyryo..",
  ".oyrryyo.",
  "oyyrcryyo",
  ".oyrcro.",
  "..oyyyo..",
  "...oyo...",
  "....o....",
}
PLACARD[6] = ".oyrccro."
local function hazardRow(img, y, phase)
  for i = 0, 11 do
    local x = 2 + i
    local k = (x + y + phase) % 4
    local t = SH[i + 1]
    local c
    if k < 2 then c = (t >= 5 and "fire5") or (t >= 3 and "fire4") or (t == 2 and "fire3") or "fire2"
    else c = (t >= 4) and "ink1" or "outline" end
    P.set(img, x, y, c)
  end
end
local function exBody(img)
  drum(img, "red")
  -- clear the middle hoops, keep a clean red field for the placard
  for i = 0, 11 do for y = 8, 14 do P.set(img, 2 + i, y, drumCol("red", i)) end end
  hazardRow(img, 14, 0); hazardRow(img, 15, 0); hazardRow(img, 16, 0)
  P.grid(img, PLACARD, { o = "red1", y = "fire4", r = "red3", c = "fire5" }, 4, 6)
  P.set(img, 7, 7, "fire5"); P.set(img, 6, 8, "fire5"); P.set(img, 5, 9, "fire5")  -- lit upper-left facets
  P.set(img, 8, 6, "outline"); P.set(img, 4, 10, "red1")
end
local function exSnow(img) P.snow(img, 2, 13, 4, 1, { seed = 21 }) end
local function exIdle(glint)
  return function(img)
    exBody(img); exSnow(img); P.selout(img)
    if glint then
      P.set(img, 3, 6, "white"); P.set(img, 4, 6, "white"); P.set(img, 4, 12, "white"); P.set(img, 4, 13, "red5")
      P.set(img, 3, 12, "red5")
    end
  end
end
local function spark(img, x, y, big)
  P.set(img, x, y, "fire6")
  if big then
    P.set(img, x + 1, y - 1, "fire5"); P.set(img, x + 2, y - 2, "fire4"); P.set(img, x + 1, y + 1, "fire5")
    P.set(img, x - 1, y - 1, "fire5"); P.set(img, x + 2, y + 1, "fire3")
  else
    P.set(img, x + 1, y, "fire5"); P.set(img, x, y - 1, "fire4"); P.set(img, x + 2, y - 2, "fire3")
  end
end
local function exDamaged1(f)
  return function(img)
    exBody(img)
    dent(img, 10, 10, "red", true)
    P.clear(img, 13, 5); P.set(img, 12, 5, "red1")
    exSnow(img)
    P.selout(img)
    hole(img, 11, 8, "red5")
    spark(img, 12, 8, f == 1)
  end
end
local function flame(img, x, y, f)
  -- small leaking flame tongue rising from (x,y); f = 1/2 flicker
  local shapes = {
    { "...a.", "..ab.", ".abb.", ".abba", "abcba", "abccb", ".acc." },
    { ".a...", ".ab..", ".abb.", "aabba", "abcba", ".bccb", ".acc." },
  }
  local g = shapes[f]
  local keys = { a = "fire3", b = "fire4", c = "fire6" }
  local ox, oy = x - 2, y - #g + 1
  for yy, row in ipairs(g) do for xx = 1, #row do
    local ch = row:sub(xx, xx)
    if ch ~= "." then
      -- warm keyline only where it sits on transparent background
      P.set(img, ox + xx - 1, oy + yy - 1, keys[ch])
    end
  end end
  -- tip
  P.set(img, ox + (f == 1 and 2 or 1), oy - 1, "fire2")
end
local function exDamaged2(f)
  return function(img)
    exBody(img)
    dent(img, 10, 10, "red", true); dent(img, 2, 11, "red")
    P.clear(img, 13, 5); P.clear(img, 12, 4); P.clear(img, 13, 6); P.set(img, 12, 5, "red1"); P.set(img, 12, 6, "red1")
    -- scorch around the puncture
    for _, p in ipairs({ { 10, 6 }, { 11, 7 }, { 12, 7 }, { 10, 7 }, { 12, 8 } }) do P.over(img, p[1], p[2], "ink1") end
    P.selout(img)
    hole(img, 11, 7, "fire3")
    flame(img, 11, 7, f)
    -- glowing heat on the rim near the flame
    P.set(img, 12, 9, (f == 1) and "fire3" or "fire2")
  end
end
K.build(P.spec("prop_explosive_barrel", 16, 20, {
  { tag = "prop_explosive_barrel_idle", ms = 300, frames = { { grid = exIdle(false) }, { grid = exIdle(true) } } },
  { tag = "prop_explosive_barrel_damaged1", ms = 120, frames = { { grid = exDamaged1(1) }, { grid = exDamaged1(2) } } },
  { tag = "prop_explosive_barrel_damaged2", ms = 80, frames = { { grid = exDamaged2(1) }, { grid = exDamaged2(2) } } },
}))

-------------------------------------------------------------------------------
-- prop_sandbag 32x16
-------------------------------------------------------------------------------
-- one pillow-shaped bag; ring in outline (doubles as the dark seam between bags)
local function bag(img, x, y, w, h, seed, opt)
  opt = opt or {}
  local rnd = P.rng(seed)
  for j = 0, h - 1 do for i = 0, w - 1 do
    local corner = (i == 0 or i == w - 1) and (j == 0 or j == h - 1)
    if not corner then
      local edge = (i == 0 or i == w - 1 or j == 0 or j == h - 1)
      local c
      if edge then c = "outline"
      elseif j == 1 then c = (i <= w / 3) and "sand5" or "sand4"
      elseif j == h - 2 then c = "sand2"
      elseif i == w - 2 then c = "sand2"
      elseif i == 1 then c = "sand4"
      else c = "sand3" end
      P.set(img, x + i, y + j, c)
    end
  end end
  -- cinched/tied ends: pinch at mid-height
  local my = y + math.floor(h / 2)
  P.set(img, x + 1, my, "sand1"); P.set(img, x + w - 2, my, "sand1")
  P.set(img, x + w - 2, my - 1, "sand2")
  -- seam stitching / wrinkles
  local sx = x + rnd(3, w - 5)
  P.set(img, sx, y + 2, "sand2"); P.set(img, sx + 1, y + 3, "sand2")
  if w > 9 then P.set(img, x + rnd(2, w - 4), y + h - 3, "sand2") end
  P.set(img, x + 2, y + 1, opt.lit or "sand5")
end
local function sandbagBase(img, damaged)
  -- bottom row (draw lower rows first; upper bags overlap them)
  bag(img, 0, 10, 12, 6, 1); bag(img, 11, 10, 11, 6, 2); bag(img, 21, 10, 11, 6, 3)
  -- middle row, staggered
  bag(img, 1, 6, 7, 6, 4); bag(img, 7, 6, 11, 6, 5); bag(img, 17, 6, 11, 6, 6); bag(img, 27, 6, 5, 6, 7)
  -- top row
  bag(img, 3, 2, 11, 6, 8)
  if not damaged then bag(img, 13, 2, 11, 6, 9); bag(img, 23, 3, 8, 5, 10) end
end
local function sandbagIdle(img)
  sandbagBase(img, false)
  P.snow(img, 4, 12, 2, 1, { seed = 5, drips = false, taper = 2 })
  P.snow(img, 14, 22, 2, 1, { seed = 7, drips = false, taper = 2 })
  P.snow(img, 24, 29, 3, 1, { seed = 8, drips = false, taper = 2 })
  P.selout(img)
end
local function sandbagDamaged(img)
  sandbagBase(img, true)
  -- slumped, torn bag on the right of the top row
  bag(img, 14, 4, 12, 4, 12)
  P.line(img, 16, 4, 19, 6, "outline"); P.set(img, 17, 5, "sand1"); P.set(img, 20, 5, "outline")
  -- spilled sand pouring over the middle row
  -- stream of sand trickling from the tear down to a heap at the base
  for y = 8, 12 do P.set(img, 19, y, (y % 2 == 0) and "sand5" or "sand4") end
  P.set(img, 20, 9, "sand3"); P.set(img, 20, 11, "sand3")
  for i = -5, 5 do
    local t = math.max(1, 4 - math.floor(math.abs(i) * 0.7 + 0.5))
    for j = 0, t - 1 do
      local c = (j == t - 1) and ((i <= 0) and "sand5" or "sand4") or ((i > 1) and "sand2" or "sand3")
      P.set(img, 19 + i, 15 - j, c)
    end
  end
  P.set(img, 17, 14, "sand2"); P.set(img, 21, 13, "sand2")
  -- bullet holes and a torn bottom bag
  hole(img, 8, 12, "sand5"); hole(img, 26, 13, "sand5"); hole(img, 4, 8, "sand5")
  P.clear(img, 30, 7); P.clear(img, 31, 7); P.clear(img, 31, 8)
  P.snow(img, 4, 11, 2, 1, { seed = 5, drips = false, taper = 2 })
  P.selout(img)
end
K.build(P.spec("prop_sandbag", 32, 16, {
  { tag = "prop_sandbag_idle", ms = 100, frames = { { grid = sandbagIdle } } },
  { tag = "prop_sandbag_damaged", ms = 100, frames = { { grid = sandbagDamaged } } },
}))
