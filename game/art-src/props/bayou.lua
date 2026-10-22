-- Mission 2 ("BAYOU BLACKOUT") swamp props: stilt-shack door, oil lanterns, fishing net, swamp warning signs,
-- Hazel's skiff, swamp-gas vent + flame column, rusty fuel drum, Regime danger post.
-- Build: bash tools/build-art.sh art-src/props/bayou.lua
-- All props anchor bottom-centre (origin 0.5, 1); tags are prop_<kind>_<anim>. Manifest: art-src/props/manifest_m2a.json.
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local P = dofile(ROOT .. "/art-src/props/lib/pk.lua")(K)

-- extra sign glyphs (local to this script)
P.FONT.W = { "x...x", "x...x", "x.x.x", "x.x.x", ".x.x." }
P.FONT.S = { ".xx", "x..", ".x.", "..x", "xx." }
P.FONT.L = { "x..", "x..", "x..", "x..", "xxx" }
P.FONT.Y = { "x.x", "x.x", ".x.", ".x.", ".x." }
P.FONT.K = { "x.x", "x.x", "xx.", "x.x", "x.x" }
P.FONT.T = { "xxx", ".x.", ".x.", ".x.", ".x." }
P.FONT[":"] = { ".", "x", ".", "x", "." }
P.FONT[" "] = { ".", ".", ".", ".", "." }

local function H(x, y, s)
  local h = (math.floor(x) * 374761393 + math.floor(y) * 668265263 + math.floor(s or 0) * 1442695041) & 0xffffffff
  h = ((h ~ (h >> 13)) * 1274126177) & 0xffffffff
  h = h ~ (h >> 16)
  return h / 4294967296
end
-- 1D value noise in [-1, 1]
local function noise1(t, s)
  local i = math.floor(t); local f = t - i
  local a, b = H(i, 7, s) * 2 - 1, H(i + 1, 7, s) * 2 - 1
  f = f * f * (3 - 2 * f)
  return a + (b - a) * f
end
local function noise2(x, y, s)
  local ix, iy = math.floor(x), math.floor(y); local fx, fy = x - ix, y - iy
  fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy)
  local a, b = H(ix, iy, s), H(ix + 1, iy, s)
  local c, d = H(ix, iy + 1, s), H(ix + 1, iy + 1, s)
  return (a + (b - a) * fx) + ((c + (d - c) * fx) - (a + (b - a) * fx)) * fy
end

-- moss lying on whatever is the top surface of each column in [x0,x1]
local function moss(img, x0, x1, seed, cover)
  cover = cover or 0.7
  for x = x0, x1 do
    local y = 0
    while y < img.height and not P.solid(img, x, y) do y = y + 1 end
    if y < img.height and y > 0 then
      local r = H(x, 0, seed)
      if r < cover then
        P.set(img, x, y, (H(x, 1, seed) < 0.55) and "leaf3" or "olive3")
        if r < cover * 0.45 then P.set(img, x, y - 1, (H(x, 2, seed) < 0.5) and "leaf4" or "olive4") end
        if H(x, 3, seed) < 0.4 then P.over(img, x, y + 1, "leaf2") end
      end
    end
  end
end
-- Spanish-moss strand hanging from (x,y) (only into empty pixels; drawn after the outline pass)
local function strand(img, x, y, len, seed)
  local xx = x
  for k = 0, len - 1 do
    if k > 1 and H(x, k, seed) < 0.25 then xx = xx + ((H(x, k + 9, seed) < 0.5) and -1 or 1) end
    local c = (k == len - 1) and "olive2" or ((k % 3 == 2) and "leaf2" or "olive3")
    P.under(img, xx, y + k, c)
  end
end
-- muddy hummock: bottom row = y, from x0..x1 (lit top-left, wet glints)
local function mud(img, x0, x1, y, hgt, seed, opt)
  opt = opt or {}
  local w = x1 - x0
  for x = x0, x1 do
    local t = (x - x0) / math.max(1, w)
    local h = math.floor(hgt * math.sin(t * math.pi) ^ (opt.pow or 0.6) + 0.5 + ((H(x, 3, seed) < (opt.bumpy or 0.25)) and 1 or 0))
    for k = 0, h - 1 do
      local c = (k == h - 1) and ((t < 0.55) and "dirt3" or "dirt2") or ((k == 0) and "ink1" or "dirt2")
      if k > 0 and k < h - 1 and H(x, k, seed + 1) < 0.25 then c = "dirt1" end
      P.set(img, x, y - k, c)
    end
    if h >= 2 and H(x, 9, seed) < 0.12 then P.set(img, x, y - h + 1, "dirt4") end
  end
  if opt.reeds then
    for _, r in ipairs(opt.reeds) do
      local rx, rh = r[1], r[2]
      for k = 1, rh do
        local lean = (k > rh - 3) and (r[3] or 0) or 0
        P.set(img, rx + lean, y - k, (k > rh - 2) and "sand2" or ((k % 2 == 0) and "dirt3" or "sand1"))
      end
    end
  end
end
local function copyInto(dst, src)
  for y = 0, src.height - 1 do for x = 0, src.width - 1 do
    local p = src:getPixel(x, y); if app.pixelColor.rgbaA(p) > 0 then dst:drawPixel(x, y, p) end
  end end
end

-------------------------------------------------------------------------------
-- prop_shack_door 20x40: plank door in a grey cypress frame, Regime padlock hasp; swings open toward the camera
-------------------------------------------------------------------------------
local DOOR_W, DOOR_H, DOOR_X, DOOR_Y = 14, 36, 3, 4
local function doorFace(lock)
  local d = Image(DOOR_W, DOOR_H, ColorMode.RGB)
  local widths = { 4, 3, 4, 3 }
  local x = 0
  for i, w in ipairs(widths) do
    P.plankV(d, x, 0, w, DOOR_H, { ramp = "dirt", base = (i % 2 == 1) and 3 or 2, seed = 40 + i })
    x = x + w
  end
  for _, gx in ipairs({ 3, 6, 10 }) do for y = 0, DOOR_H - 1 do if H(gx, y, 3) < 0.8 then P.set(d, gx, y, "dirt1") end end end
  -- weathered grey bleaching on the upper planks
  for y = 0, 14 do for xx = 0, DOOR_W - 1 do
    if H(xx, y, 5) < 0.18 and P.get(d, xx, y) == "dirt3" then P.set(d, xx, y, "ink3") end
  end end
  -- Z brace: two battens and a diagonal
  for _, by in ipairs({ 5, 28 }) do
    P.plankH(d, 0, by, DOOR_W, 3, { ramp = "dirt", base = 3, seed = 50 + by, knot = false })
    P.hline(d, 0, DOOR_W - 1, by + 3, "dirt1")
  end
  for k = 0, 19 do
    local xx = 1 + math.floor(k * 11 / 19)
    local yy = 27 - k
    P.set(d, xx, yy, "dirt4"); P.set(d, xx + 1, yy, "dirt3"); P.set(d, xx + 2, yy, "dirt2"); P.set(d, xx + 2, yy + 1, "dirt1")
  end
  for _, p in ipairs({ { 1, 6 }, { 11, 6 }, { 1, 29 }, { 11, 29 }, { 6, 17 } }) do P.nail(d, p[1], p[2]) end
  -- rotten, mossy bottom edge
  for xx = 0, DOOR_W - 1 do
    if H(xx, 1, 8) < 0.5 then P.set(d, xx, DOOR_H - 1, "leaf2") end
    if H(xx, 2, 8) < 0.3 then P.set(d, xx, DOOR_H - 2, "olive2") end
  end
  P.clear(d, 4, DOOR_H - 1); P.clear(d, 9, DOOR_H - 1); P.clear(d, 10, DOOR_H - 1)
  -- Regime hasp + padlock on the free (right) edge
  if lock then
    P.fill(d, 9, 16, 5, 3, "steel3"); P.hline(d, 9, 13, 16, "steel4"); P.hline(d, 9, 13, 18, "steel1")
    P.set(d, 9, 16, "steel5"); P.set(d, 12, 17, "dirt3"); P.set(d, 10, 18, "red2")
  end
  return d
end
local function doorFrame(img)
  -- dark interior
  P.fill(img, DOOR_X, DOOR_Y, DOOR_W, DOOR_H, "outline")
  for _, x in ipairs({ 6, 11, 15 }) do P.vline(img, x, DOOR_Y + 2, DOOR_Y + DOOR_H - 4, "ink1") end
  P.hline(img, DOOR_X, DOOR_X + DOOR_W - 1, 37, "ink1"); P.hline(img, DOOR_X, DOOR_X + DOOR_W - 1, 38, "dirt1")
  P.hline(img, DOOR_X + 1, DOOR_X + 6, 39, "dirt1")
  P.set(img, 8, 20, "fire1"); P.set(img, 13, 25, "fire1") -- faint lamp glints deep inside
  -- posts (weathered grey cypress)
  for _, px in ipairs({ 0, 17 }) do
    P.plankV(img, px, 2, 3, 38, { ramp = "ink", base = 2, seed = px + 3 })
    P.set(img, px + 1, 12, "ink1"); P.set(img, px + 1, 26, "dirt2")
  end
  -- lintel
  P.plankH(img, 0, 0, 20, 4, { ramp = "ink", base = 3, seed = 61 })
  P.hline(img, 0, 19, 3, "ink1")
  P.nail(img, 2, 1); P.nail(img, 17, 1)
end
local function shackDoor(open)
  return function(img)
    doorFrame(img)
    local d = doorFace(open == 0)
    if open == 0 then
      copyInto(img, (function()
        local t = Image(20, 40, ColorMode.RGB)
        for y = 0, DOOR_H - 1 do for x = 0, DOOR_W - 1 do
          local p = d:getPixel(x, y); if app.pixelColor.rgbaA(p) > 0 then t:drawPixel(DOOR_X + x, DOOR_Y + y, p) end
        end end
        return t
      end)())
    else
      -- foreshortened door swinging out on its left hinge; free edge grows 1px taller as it nears the camera
      local wd = ({ 11, 7, 4, 3 })[open]
      local grow = ({ 0, 1, 1, 2 })[open]
      for x = 0, wd - 1 do
        local sx = math.floor(x * DOOR_W / wd)
        local g = (x >= wd - 2) and grow or math.floor(grow * x / wd)
        for y = -g, DOOR_H - 1 do
          local sy = math.max(0, math.min(DOOR_H - 1, y))
          local p = d:getPixel(sx, sy)
          if app.pixelColor.rgbaA(p) > 0 then
            local c = P.NAME[p]
            -- the turned face darkens as it swings away from the light
            if open >= 3 and c then c = P.shift(c, -1) end
            P.set(img, DOOR_X - (open == 4 and 2 or 0) + x, DOOR_Y + y, c)
          end
        end
      end
      if open >= 2 then P.vline(img, DOOR_X + wd - 1 - (open == 4 and 2 or 0), DOOR_Y - grow, DOOR_Y + DOOR_H - 1, "dirt4") end
    end
    moss(img, 0, 19, 62, 0.75)
    P.selout(img)
    strand(img, 4, 4, 4, 1); strand(img, 15, 4, 6, 2); strand(img, 18, 4, 3, 3)
    if open == 0 then
      -- padlock hanging from the staple (drawn last so it hangs over the outline)
      P.set(img, 14, 21, "steel4"); P.set(img, 15, 21, "steel4"); P.set(img, 13, 22, "steel4"); P.set(img, 16, 22, "steel2")
      P.fill(img, 13, 23, 4, 4, "red3"); P.hline(img, 13, 16, 23, "red4"); P.vline(img, 16, 23, 26, "red2")
      P.set(img, 13, 23, "red5"); P.set(img, 15, 25, "outline"); P.hline(img, 13, 16, 27, "red1")
    elseif open == 1 then
      -- splinters and the snapped padlock flying off to the right
      for _, p in ipairs({ { 16, 14, "dirt4" }, { 18, 12, "dirt3" }, { 17, 19, "dirt5" }, { 19, 22, "dirt3" }, { 16, 29, "dirt4" } }) do P.set(img, p[1], p[2], p[3]) end
      P.fill(img, 17, 25, 3, 3, "red3"); P.set(img, 17, 25, "red5"); P.set(img, 19, 27, "red1"); P.set(img, 18, 24, "steel4")
    end
  end
end

-------------------------------------------------------------------------------
-- prop_lantern 12x20: oil lantern hanging on an iron hook (hook at the top edge, x5..6)
-------------------------------------------------------------------------------
local FLAMES = {
  -- {tip x, tip y, core rows {y, x0, x1}, glass bright}
  { tip = { 5, 11 }, core = { { 12, 5, 6 }, { 13, 5, 6 }, { 14, 5, 6 } }, bright = true },
  { tip = { 6, 11 }, core = { { 12, 6, 6 }, { 13, 5, 6 }, { 14, 5, 6 } }, bright = true, white = true },
  { tip = { 5, 12 }, core = { { 13, 5, 6 }, { 14, 5, 6 } }, bright = false },
  { tip = { 5, 10 }, core = { { 11, 5, 5 }, { 12, 5, 6 }, { 13, 5, 6 }, { 14, 5, 6 } }, bright = true, white = true },
}
local function lanternAt(img, ox, oy, f, opt)
  opt = opt or {}
  local function s(x, y, c) P.set(img, ox + x, oy + y, c) end
  local fl = FLAMES[f]
  if not opt.noHook then
    s(5, 0, "ink4"); s(6, 0, "ink3"); s(4, 1, "ink3"); s(7, 1, "ink2"); s(7, 2, "ink2"); s(6, 3, "ink2")
  end
  -- ring + wire bail
  s(5, 4, "ink3"); s(6, 4, "ink2")
  s(4, 5, "ink3"); s(7, 5, "ink2"); s(3, 6, "ink3"); s(8, 6, "ink2"); s(2, 7, "ink3"); s(9, 7, "ink1"); s(2, 8, "ink2"); s(9, 8, "ink1")
  -- chimney cap
  s(5, 5, "ink3"); s(6, 5, "ink1")
  s(5, 6, "ink4"); s(6, 6, "ink2")
  s(4, 7, "ink3"); s(5, 7, "ink4"); s(6, 7, "ink2"); s(7, 7, "ink1")
  for x = 3, 8 do s(x, 8, (x <= 4) and "ink4" or (x <= 6) and "ink3" or "ink2") end
  s(5, 8, "dirt3") -- rust
  for x = 2, 9 do s(x, 9, (x <= 3) and "ink3" or (x <= 7) and "ink2" or "ink1") end
  -- glass globe
  local g = fl.bright and "fire5" or "fire4"
  for y = 10, 15 do for x = 4, 7 do s(x, y, g) end end
  for x = 4, 7 do s(x, 10, "fire4"); s(x, 15, "fire3") end
  s(7, 11, "fire4"); s(7, 14, "fire4")
  if not fl.bright then s(4, 11, "fire4"); s(4, 14, "fire4"); s(7, 12, "fire4"); s(7, 13, "fire4") end
  for _, r in ipairs(fl.core) do for x = r[2], r[3] do s(x, r[1], "fire6") end end
  s(fl.tip[1], fl.tip[2], fl.bright and "fire6" or "fire5")
  if fl.white then s(5, 13, "white") end
  s(5, 15, "fire2"); s(6, 15, "fire2") -- wick holder
  s(4, 11, fl.bright and "fire6" or "fire5") -- glass reflection
  -- frame bars
  for y = 10, 15 do s(3, y, "ink2"); s(8, y, "ink1") end
  s(3, 10, "ink3")
  -- base + oil fount
  for x = 2, 9 do s(x, 16, (x <= 3) and "ink3" or (x <= 7) and "ink2" or "ink1") end
  for x = 3, 8 do s(x, 17, (x <= 4) and "dirt4" or (x <= 6) and "dirt3" or "dirt2"); s(x, 18, (x <= 4) and "dirt3" or "dirt2") end
  s(3, 17, "dirt5")
  for x = 4, 7 do s(x, 19, "ink1") end
end
local function lantern(f)
  return function(img)
    lanternAt(img, 0, 0, f)
    P.selout(img)
    -- keep the hook's top edge at y0 (selout may add nothing above row 0)
  end
end

-------------------------------------------------------------------------------
-- prop_lantern_post 16x44: crooked shepherd's-hook pole in the mud with a hanging lantern
-------------------------------------------------------------------------------
local function lanternPost(f)
  return function(img)
    -- leaning, crooked grey pole: foot centred on the origin (x7..9), top leaning left
    local function px(y) return 3 + math.floor((y - 6) / 9) + ((y >= 18 and y <= 24) and 1 or 0) end
    for y = 6, 41 do
      local x = px(y)
      P.set(img, x, y, "ink4"); P.set(img, x + 1, y, "ink3"); P.set(img, x + 2, y, "ink2")
      if H(y, 1, 9) < 0.12 then P.set(img, x + 1, y, "dirt3") end
      if H(y, 2, 9) < 0.08 then P.set(img, x + 2, y, "ink1") end
    end
    P.set(img, px(17) + 2, 17, "ink1"); P.set(img, px(25), 25, "ink3")
    -- the crook: arches over to the right, lantern hangs from its tip at x11..12
    local crook = { { 3, 5 }, { 4, 4 }, { 4, 3 }, { 5, 2 }, { 6, 1 }, { 7, 1 }, { 8, 1 }, { 9, 1 }, { 10, 2 }, { 11, 3 }, { 11, 4 } }
    for _, c in ipairs(crook) do P.set(img, c[1], c[2], "ink4"); P.set(img, c[1] + 1, c[2] + 1, "ink2") end
    P.set(img, 5, 3, "ink3"); P.set(img, 6, 2, "ink3"); P.set(img, 9, 2, "ink2"); P.set(img, 10, 3, "ink2")
    P.set(img, 4, 5, "ink3"); P.set(img, 5, 5, "ink2")
    -- rope lashing + a tin cup nailed on
    for _, y in ipairs({ 10, 12 }) do local x = px(y); P.set(img, x, y, "sand3"); P.set(img, x + 1, y, "sand2"); P.set(img, x + 2, y, "sand1") end
    -- mud mound at the foot with reeds
    mud(img, 1, 15, 43, 4, 77, { pow = 1.2, reeds = { { 2, 6, -1 }, { 3, 9, 0 }, { 13, 7, 1 }, { 14, 4, 0 } } })
    moss(img, 3, 11, 78, 0.6)
    -- lantern hung from the crook tip
    lanternAt(img, 6, 2, f, { noHook = true })
    P.set(img, 11, 5, "ink2")
    P.selout(img)
    strand(img, 7, 3, 3, 7); strand(img, 9, 3, 2, 5); strand(img, px(24), 26, 3, 8)
  end
end

-------------------------------------------------------------------------------
-- prop_net 48x40: fishing net hung between two poles, cork floats, weed tangles; gentle sway
-------------------------------------------------------------------------------
local NET = { x0 = 4, x1 = 43, y0 = 6, y1 = 9 }
local function netPt(u, v, f)
  local sway = ({ 0, 1, 0, -1 })[f] * 1.6
  local top = NET.y0 + (NET.y1 - NET.y0) * u + 4 * math.sin(math.pi * u)
  local depth = 19 + 7 * math.sin(math.pi * (u * 0.9 + 0.05))
  local x = NET.x0 + (NET.x1 - NET.x0) * u + sway * v * v * math.sin(math.pi * u)
  return x, top + v * depth
end
local function netRagged(u)  -- bottom fringe in v units
  local cell = math.floor(u * 11)
  return 0.86 + 0.14 * H(cell, 4, 13)
end
local function inHole(u, v) return ((u - 0.6) / 0.08) ^ 2 + ((v - 0.52) / 0.18) ^ 2 < 1 end
local function net(f)
  return function(img)
    -- poles
    for y = 2, 39 do
      local lx = (y < 14) and 3 or 2
      P.set(img, lx, y, "ink4"); P.set(img, lx + 1, y, "ink3"); P.set(img, lx + 2, y, "ink2")
    end
    for y = 5, 39 do
      local rx = (y < 20) and 44 or 43
      P.set(img, rx, y, "ink4"); P.set(img, rx + 1, y, "ink3"); P.set(img, rx + 2, y, "ink2")
    end
    P.set(img, 4, 20, "dirt3"); P.set(img, 3, 31, "ink1"); P.set(img, 45, 26, "ink1"); P.set(img, 3, 1, "ink4"); P.set(img, 4, 1, "ink3")
    -- lashings
    for _, p in ipairs({ { 2, 6 }, { 43, 9 } }) do P.hline(img, p[1], p[1] + 2, p[2], "sand3"); P.hline(img, p[1], p[1] + 2, p[2] + 1, "sand1") end
    mud(img, 0, 7, 39, 2, 21); mud(img, 40, 47, 39, 2, 22)
    moss(img, 2, 5, 23, 0.8); moss(img, 43, 46, 24, 0.8)
    P.selout(img)
    -- mesh: two diagonal families of strands (~7px diamonds)
    local k = 0.5
    local function plot(u, v, c)
      if u < 0 or u > 1 or v < 0 or v > netRagged(u) or inHole(u, v) then return end
      local x, y = netPt(u, v, f)
      x, y = math.floor(x + 0.5), math.floor(y + 0.5)
      local cur = P.get(img, x, y)
      if cur == "sand2" or cur == "dirt3" then P.set(img, x, y, "sand3") -- knot
      elseif not cur then P.set(img, x, y, c) end
    end
    for c = -1, 1.6, 1 / 6 do
      for t = 0, 1, 0.004 do plot(c + t * k, t, "sand2"); plot(c + (1 - t) * k, t, "dirt3") end
    end
    -- head rope + floats
    for u = 0, 1, 0.005 do
      local x, y = netPt(u, 0, f)
      P.set(img, math.floor(x + 0.5), math.floor(y + 0.5), "sand4"); P.set(img, math.floor(x + 0.5), math.floor(y + 0.5) + 1, "sand1")
    end
    for i = 1, 5 do
      local x, y = netPt(i / 6, 0, f); x, y = math.floor(x + 0.5), math.floor(y + 0.5)
      local red = (i % 2 == 0)
      P.fill(img, x - 1, y - 1, 3, 3, red and "red3" or "sand3")
      P.set(img, x - 1, y - 1, red and "red4" or "sand4"); P.set(img, x + 1, y + 1, red and "red1" or "sand1")
      P.set(img, x + 1, y - 1, red and "red2" or "sand2"); P.set(img, x - 1, y + 1, red and "red2" or "sand2")
      P.under(img, x, y + 2, "outline"); P.under(img, x + 2, y, "outline"); P.under(img, x + 1, y + 2, "outline"); P.under(img, x - 1, y + 2, "outline")
    end
    -- weed snagged in the mesh: small clots with long dripping strands (they follow the sway)
    local sw = ({ 0, 1, 0, -1 })[f]
    for wi, w in ipairs({ { 0.24, 0.5, 4 }, { 0.8, 0.7, 3 }, { 0.12, 0.8, 2 }, { 0.47, 0.82, 3 }, { 0.66, 0.3, 2 } }) do
      local x, y = netPt(w[1], w[2], f); x, y = math.floor(x + 0.5), math.floor(y + 0.5)
      local n = w[3]
      for i = -n, n do
        local hgt = 1 + ((math.abs(i) < n - 1) and 1 or 0)
        for j = 0, hgt - 1 do P.set(img, x + i, y + j, (j == 0 and i < 0) and "leaf3" or "leaf2") end
        if H(i, wi, 31) < 0.5 then
          local len = 2 + math.floor(H(i, wi, 32) * 6)
          for q = 1, len do P.set(img, x + i + ((q > 3) and sw or 0), y + hgt + q - 1, (q % 3 == 0) and "olive2" or "leaf2") end
        end
      end
      P.set(img, x - n, y, "leaf4"); P.set(img, x - n + 1, y - 1, "olive3")
    end
    -- torn hole: dangling cut ends
    for _, e in ipairs({ { 0.56, 0.45 }, { 0.64, 0.6 }, { 0.59, 0.68 } }) do
      local x, y = netPt(e[1], e[2], f); x, y = math.floor(x + 0.5), math.floor(y + 0.5)
      P.set(img, x, y, "sand2"); P.set(img, x, y + 1, "sand2"); P.set(img, x + ((f % 2 == 0) and 1 or 0), y + 2, "dirt3")
    end
  end
end

-------------------------------------------------------------------------------
-- signs 44x34: painted plank board on a stake in the mud, mossy and nailed
-------------------------------------------------------------------------------
local SW, SH_ = 44, 34
local function signBase(img, ramp, base, seed)
  -- stake
  for y = 18, 31 do P.set(img, 20, y, "ink4"); P.set(img, 21, y, "ink3"); P.set(img, 22, y, "ink3"); P.set(img, 23, y, "ink2") end
  P.set(img, 22, 24, "ink1"); P.set(img, 21, 28, "dirt2")
  -- board: two planks, the lower slightly offset (crooked)
  P.plankH(img, 1, 2, 42, 9, { ramp = ramp, base = base, seed = seed, knot = false })
  P.plankH(img, 2, 11, 41, 9, { ramp = ramp, base = base, seed = seed + 1, knot = false })
  P.hline(img, 2, 42, 11, ramp .. "1")
  P.vline(img, 1, 2, 10, ramp .. math.min(5, base + 1)); P.vline(img, 2, 11, 19, ramp .. math.min(5, base + 1))
  -- nails
  for _, p in ipairs({ { 3, 4 }, { 40, 4 }, { 4, 17 }, { 40, 17 }, { 21, 4 }, { 21, 17 } }) do P.nail(img, p[1], p[2]) end
  mud(img, 13, 30, 33, 3, seed + 5, { reeds = { { 15, 6, -1 }, { 16, 4, 0 }, { 27, 7, 1 }, { 28, 5, 0 } } })
end
local function signFinish(img, seed, strands)
  -- paint wear: random chips where the board shows through
  moss(img, 1, 42, seed + 7, 0.6)
  P.selout(img)
  for _, s in ipairs(strands or {}) do strand(img, s[1], 20, s[2], seed + s[1]) end
end
local function chips(img, seed, x0, y0, x1, y1, from, to, rate)
  for y = y0, y1 do for x = x0, x1 do
    if H(x, y, seed) < rate and P.get(img, x, y) == from then P.set(img, x, y, to) end
  end end
end
local function signWade(img)
  signBase(img, "dirt", 2, 90)
  local function centered(s, y, c, sh) P.text(img, s, 22 - math.floor(P.textWidth(s) / 2 + 0.5), y, c, { shadow = sh or "dirt1" }) end
  centered("WADING", 4, "fire4")
  centered("SLOWS YOU", 13, "ink5")
  chips(img, 91, 2, 4, 42, 18, "fire4", "fire3", 0.12)
  chips(img, 92, 2, 4, 42, 18, "ink5", "ink4", 0.12)
  -- little ripple squiggles either side of the top line
  for _, x in ipairs({ 4, 37 }) do P.set(img, x, 7, "steel4"); P.set(img, x + 1, 6, "steel4"); P.set(img, x + 2, 7, "steel4") end
  signFinish(img, 93, { { 8, 3 }, { 33, 5 }, { 36, 2 } })
end
local function signLogs(img)
  signBase(img, "olive", 2, 100)
  P.text(img, "LOGS", 4, 4, "sand5", { shadow = "olive1" })
  P.text(img, "SINK!", 4, 13, "fire4", { shadow = "olive1" })
  chips(img, 101, 2, 4, 23, 18, "sand5", "sand4", 0.12)
  -- icon: a log settling into water lines with a red down arrow
  local lx, ly = 25, 4
  P.fill(img, lx, ly, 12, 4, "dirt3"); P.hline(img, lx, lx + 11, ly, "dirt4"); P.hline(img, lx, lx + 11, ly + 3, "dirt2")
  P.set(img, lx + 4, ly + 1, "dirt2"); P.set(img, lx + 8, ly + 2, "dirt2")
  P.fill(img, lx + 12, ly, 3, 4, "dirt5"); P.set(img, lx + 13, ly + 1, "dirt3"); P.set(img, lx + 13, ly + 2, "dirt3"); P.set(img, lx + 14, ly + 3, "dirt4")
  P.hline(img, 24, 41, 9, "steel4"); P.hline(img, 26, 39, 10, "steel3")
  for x = 24, 41, 3 do P.set(img, x, 9, "olive2") end
  -- arrow
  P.fill(img, 31, 11, 3, 4, "red4"); P.hline(img, 29, 35, 15, "red4"); P.hline(img, 30, 34, 16, "red4"); P.hline(img, 31, 33, 17, "red3"); P.set(img, 32, 18, "red3")
  P.vline(img, 31, 11, 14, "red5")
  signFinish(img, 103, { { 6, 4 }, { 27, 3 }, { 39, 5 } })
end
-- red gator-jaws mark (13x9): open jaws facing right with teeth
local JAWS = {
  ".rrrrrrrr....",
  "rRRRRRRRRrr..",
  "rRwRRRRwRRRr.",
  ".r.w.w.w.wRr.",
  "..........rr.",
  ".r.w.w.w.wRr.",
  "rRwRRRRwRRRr.",
  "rRRRRRRRRrr..",
  ".rrrrrrrr....",
}
local function signGator(img)
  signBase(img, "sand", 3, 110)
  -- whitewash wear: let the grey wood show through
  chips(img, 111, 1, 2, 42, 19, "sand3", "ink3", 0.04)
  P.grid(img, JAWS, { r = "red2", R = "red3", w = "ink6" }, 4, 6)
  P.set(img, 6, 7, "red4"); P.set(img, 7, 7, "red4"); P.set(img, 6, 13, "red4")
  P.text(img, "DANGER:", 17, 4, "red3", { shadow = "sand1" })
  P.text(img, "GATOR", 19, 13, "red2", { shadow = "sand1" })
  P.set(img, 18, 4, "red4"); P.set(img, 20, 13, "red3")
  -- chewed: a bite out of the lower-right corner, a nibble on the top-left
  local function bite(cx, cy, r)
    for j = -r, r do for i = -r, r do if i * i + j * j <= r * r then P.clear(img, cx + i, cy + j) end end end
    for a = 0, 7 do
      local ang = a / 8 * math.pi * 2
      local tx, ty = cx + math.floor(math.cos(ang) * (r + 1) + 0.5), cy + math.floor(math.sin(ang) * (r + 1) + 0.5)
      P.clear(img, tx, ty)
    end
  end
  bite(43, 21, 4); bite(1, 2, 2)
  -- splintered bite rim
  for _, p in ipairs({ { 38, 19 }, { 39, 17 }, { 41, 16 } }) do P.over(img, p[1], p[2], "sand5") end
  -- tooth punctures
  for _, p in ipairs({ { 40, 13 }, { 42, 14 }, { 37, 18 } }) do P.over(img, p[1], p[2], "outline") end
  signFinish(img, 113, { { 9, 4 }, { 25, 2 }, { 31, 4 } })
end

-------------------------------------------------------------------------------
-- prop_skiff 64x22: Hazel's flat-bottom skiff, outboard at the stern (left). Waterline = canvas bottom.
-------------------------------------------------------------------------------
local function sheer(x)  -- gunwale top y for hull column x (stern x8 .. bow x61)
  if x < 44 then return 11 - math.floor((x - 8) / 36) end
  return 10 - math.floor((x - 44) * 0.25)
end
local function stem(y) return 52 + math.floor((21 - y) * 0.6) end   -- raked bow stem x at row y
local MOTOR = {
  "..eeeeee..",
  ".eSSssssd.",
  "eSsssssssd",
  "essssssssd",
  "errrrrrrrd",
  "essssssssd",
  ".dddddddd.",
  "..dkkkkd..",
}
local function skiff(f)
  local dy = ({ 0, 0, 1, 1 })[f]
  return function(img)
    -- hull
    for x = 8, 63 do
      local top = sheer(x) + dy
      for y = top, 21 do
        if x <= stem(y) then
          local d = y - top
          local c
          if d == 0 then c = "dirt4"
          elseif d == 1 then c = "dirt2"
          elseif d == 2 then c = "olive4"
          elseif y >= 20 then c = (y == 21) and "leaf1" or "olive1"       -- wet, weedy waterline
          elseif d <= 5 then c = "olive3"
          else c = "olive2" end
          if c == "olive3" and H(x, y, 4) < 0.07 then c = "dirt3" end    -- paint chips
          if c == "olive2" and H(x, y, 5) < 0.06 then c = "dirt2" end
          if c == "olive2" and H(x, y, 6) < 0.04 then c = "olive4" end
          if y == 19 and H(x, y, 7) < 0.3 then c = "leaf2" end           -- algae scum
          P.set(img, x, y, c)
        end
      end
    end
    -- bow face: darker raked stem
    for y = sheer(61) + dy, 21 do local sx = stem(y); P.set(img, sx, y, (y <= sheer(61) + dy + 1) and "dirt2" or "olive1"); P.set(img, sx - 1, y, P.get(img, sx - 1, y) == "olive3" and "olive2" or P.get(img, sx - 1, y)) end
    -- strake seams
    for x = 9, 58 do
      local s = sheer(x) + dy
      if x <= stem(s + 6) then P.set(img, x, s + 6, (H(x, 1, 2) < 0.85) and "olive1" or "olive2") end
    end
    -- transom (stern face, darker)
    P.vline(img, 8, 11 + dy, 21, "olive1"); P.vline(img, 9, 12 + dy, 20, "olive2")
    -- painted registration patch + rivets
    P.fill(img, 38, 14 + dy, 10, 3, "sand3"); P.hline(img, 38, 47, 14 + dy, "sand4"); P.hline(img, 38, 47, 16 + dy, "sand2")
    for _, x in ipairs({ 39, 41, 44, 46 }) do P.set(img, x, 15 + dy, "olive1") end
    for x = 13, 53, 8 do P.set(img, x, 13 + dy, "olive5"); P.set(img, x + 1, 14 + dy, "olive1") end
    -- cargo poking above the gunwale: oar, rope coil, jerry can
    for k = 0, 9 do P.set(img, 18 + math.floor(k * 0.6), 10 + dy - k, "dirt4"); P.set(img, 19 + math.floor(k * 0.6), 10 + dy - k, "dirt2") end
    P.fill(img, 23, 0 + dy, 3, 3, "dirt3"); P.set(img, 23, 0 + dy, "dirt5"); P.vline(img, 25, 0 + dy, 2 + dy, "dirt2")
    for r = 0, 2 do
      local yy = 10 + dy - r
      P.hline(img, 28 + r, 37 - r, yy, (r % 2 == 0) and "sand3" or "sand2")
      P.set(img, 28 + r, yy, "sand4"); P.set(img, 37 - r, yy, "sand1")
    end
    P.hline(img, 31, 34, 7 + dy, "sand4"); P.set(img, 32, 7 + dy, "sand2"); P.set(img, 35, 8 + dy, "sand1"); P.set(img, 36, 9 + dy, "sand4")
    local jx, jy = 42, 2 + dy
    P.box(img, jx, jy + 1, 7, 7, "red", 3, { spec = true })
    for _, p in ipairs({ { 2, 3 }, { 4, 3 }, { 3, 4 }, { 2, 5 }, { 4, 5 } }) do P.set(img, jx + p[1], jy + p[2], "red2") end
    P.hline(img, jx + 1, jx + 3, jy, "ink3"); P.set(img, jx + 1, jy + 1, "ink2"); P.set(img, jx + 3, jy + 1, "ink2")
    P.set(img, jx + 5, jy, "steel4"); P.set(img, jx + 5, jy - 1, "steel3")
    -- outboard motor on the transom: cowling, tiller, clamp, leg into the water
    local my = 3 + dy
    P.grid(img, MOTOR, { e = "steel4", S = "steel5", s = "steel3", d = "steel2", r = "red2", k = "ink2" }, 0, my)
    P.set(img, 6, my + 2, "dirt3"); P.set(img, 7, my + 5, "dirt3"); P.set(img, 2, my + 5, "dirt2"); P.set(img, 1, my + 4, "red3")
    P.set(img, 4, my - 1, "ink2"); P.set(img, 5, my - 1, "ink1")   -- pull-start
    for y = my + 8, 21 do P.set(img, 3, y, "steel3"); P.set(img, 4, y, "steel3"); P.set(img, 5, y, "steel2") end
    P.hline(img, 2, 6, my + 12, "steel2"); P.set(img, 2, my + 12, "steel4")   -- cavitation plate
    P.fill(img, 6, my + 7, 4, 3, "ink2"); P.set(img, 6, my + 7, "ink3"); P.set(img, 9, my + 9, "ink1")   -- clamp
    -- tiller arm reaching into the boat
    P.hline(img, 10, 15, my + 4, "ink2"); P.hline(img, 13, 16, my + 3, "ink3"); P.set(img, 16, my + 4, "ink1")
    P.selout(img)
    for x = 0, 63 do if P.get(img, x, 21) == "outline" then P.clear(img, x, 21) end end
    -- water lapping at both ends
    local rp = ({ { 0, 62 }, { 1, 61 }, { 0, 62 }, { 1, 63 } })[f]
    P.set(img, rp[1], 21, "ink4"); P.set(img, rp[1] + 1, 21, "steel4")
    P.set(img, rp[2], 21, "ink4"); P.set(img, rp[2] - 1, 21, "steel3")
    P.set(img, 7, 21, "steel3"); P.set(img, 6, 21, (f % 2 == 0) and "ink4" or "steel4")
  end
end

-------------------------------------------------------------------------------
-- prop_gas_vent 16x12: rusty Regime well-head pipe with a cracked collar, ringed by dead reeds
-- nozzle = pixels x6..9, y2 (centre x8); gas_flame sits on it at vent bottom - 10 px
-------------------------------------------------------------------------------
local function ventBase(img, mode, f)
  -- low rounded mud mound with a couple of dead reeds
  mud(img, 0, 15, 11, 4, 120, { pow = 2.2, bumpy = 0.05, reeds = { { 1, 5, -1 }, { 2, 3, 0 }, { 14, 6, 1 } } })
  -- pipe body x6..9 (lit left), y3..9
  local cols = { "steel4", "steel3", "steel2", "steel1" }
  for i = 0, 3 do for y = 3, 9 do P.set(img, 6 + i, y, cols[i + 1]) end end
  for _, p in ipairs({ { 7, 4 }, { 7, 8 }, { 8, 7 }, { 8, 8 }, { 6, 8 } }) do P.set(img, p[1], p[2], "dirt3") end
  P.set(img, 8, 4, "red2"); P.set(img, 9, 8, "dirt2")
  -- flange collar y5..6, cracked, two bolts
  for x = 4, 11 do P.set(img, x, 5, (x <= 5) and "steel5" or (x <= 8) and "steel4" or "steel3"); P.set(img, x, 6, (x <= 5) and "steel3" or (x <= 9) and "steel2" or "steel1") end
  P.set(img, 4, 6, "steel2")
  P.set(img, 5, 5, "steel5"); P.set(img, 10, 5, "steel5"); P.set(img, 10, 6, "outline")
  P.set(img, 8, 5, "outline"); P.set(img, 8, 6, "outline"); P.set(img, 9, 6, "dirt3")   -- crack
  -- nozzle lip, seen from slightly above: x5..10
  P.hline(img, 6, 9, 1, "steel4"); P.set(img, 5, 2, "steel4"); P.set(img, 10, 2, "steel2")
  P.hline(img, 6, 9, 2, "outline")
  P.hline(img, 5, 10, 3, "steel3"); P.set(img, 5, 3, "steel5"); P.set(img, 6, 3, "steel4"); P.set(img, 10, 3, "steel1")
  P.set(img, 9, 3, "dirt3")
  -- mud caked on the foot
  P.hline(img, 6, 9, 9, "dirt2"); P.set(img, 6, 8, "dirt2"); P.set(img, 9, 9, "dirt1")
  -- puddles beside it
  P.hline(img, 1, 3, 10, "leaf1"); P.set(img, 2, 10, "steel2"); P.hline(img, 12, 14, 10, "leaf1")
  if mode == "idle" and f == 2 then P.set(img, 2, 10, "steel3"); P.set(img, 13, 10, "steel2") end
  P.selout(img)
  if mode == "idle" and f == 2 then P.set(img, 8, 0, "weird4") end
  if mode == "bubble" then
    local g = ({ "weird4", "weird4", "weird5", "weird5" })[f]
    P.hline(img, 6, 9, 2, (f >= 3) and "weird4" or "weird1")
    P.set(img, 7, 2, g); P.set(img, 8, 2, g)
    P.set(img, 8, 5, (f % 2 == 0) and "weird5" or "weird4"); P.set(img, 8, 6, "weird4")
    local wy = ({ 1, 0, 1, 0 })[f]
    P.set(img, 7 + (f % 2), wy, "weird4"); if f >= 2 then P.set(img, 8 - (f % 2), 0, "weird5") end
    if f >= 3 then P.set(img, 6, 1, "weird4"); P.set(img, 9, 1, "weird4") end
    local bub = {
      { { 3, 8, 0 }, { 12, 8, 1 } },
      { { 3, 8, 1 }, { 12, 8, 0 }, { 14, 9, 0 } },
      { { 3, 8, 2 }, { 12, 7, 1 }, { 1, 9, 0 } },
      { { 12, 7, 2 }, { 1, 9, 1 }, { 4, 9, 0 } },
    }
    for _, b in ipairs(bub[f]) do
      local bx, by, r = b[1], b[2], b[3]
      if r == 0 then P.set(img, bx, by, "dirt4"); P.set(img, bx, by - 1, "weird4")
      elseif r == 1 then P.set(img, bx, by - 1, "dirt4"); P.set(img, bx - 1, by, "dirt3"); P.set(img, bx + 1, by, "dirt2"); P.set(img, bx, by, "weird4")
      else P.set(img, bx - 1, by - 1, "weird5"); P.set(img, bx + 1, by - 2, "weird4"); P.set(img, bx, by - 3, "weird5"); P.set(img, bx, by, "dirt1") end
    end
  elseif mode == "burn" then
    P.hline(img, 6, 9, 2, "fire6"); P.hline(img, 6, 9, 1, (f == 1) and "fire5" or "fire4")
    P.set(img, 5, 2, "fire4"); P.set(img, 10, 2, "fire3")
    P.hline(img, 5, 10, 3, (f == 1) and "fire3" or "fire2"); P.set(img, 5, 3, "fire4")
    P.set(img, 6, 4, "red4"); P.set(img, 7, 4, "red3"); P.set(img, 8, 4, "red3"); P.set(img, 9, 4, "red2")
    P.set(img, 8, 5, "fire4"); P.set(img, 8, 6, "fire3")
    P.set(img, 1, 6, "fire3"); P.set(img, 14, 5, "fire3"); P.set(img, 4, 8, "dirt4"); P.set(img, 11, 8, "dirt4")
  end
end
local function gasVent(mode, f) return function(img) ventBase(img, mode, f) end end

-------------------------------------------------------------------------------
-- prop_gas_flame 24x72: roaring swamp-gas flame column, hot core, green-tinged edges. Origin = nozzle.
-------------------------------------------------------------------------------
local function flameCol(img, f, opt)
  local cx = 12
  local bot = 71
  local top = 72 - opt.h
  local wm = opt.w or 1
  local green = opt.green or 0
  local span = bot - top
  for y = top, bot do
    local t = (bot - y) / math.max(1, span)
    local hw = (1.8 + 7.8 * math.min(1, t / 0.28) ^ 0.7) * (1 - math.max(0, (t - 0.3) / 0.7) ^ 1.5) * wm
    hw = hw + noise1(y * 0.22 + f * 1.9, 3) * 1.6 * t
    local cxo = cx + math.sin(y * 0.16 + f * 1.7) * 1.4 * t + noise1(y * 0.1 - f, 5) * 0.8 * t
    for x = 0, 23 do
      local d = math.abs(x + 0.5 - cxo) / math.max(0.6, hw)
      local edgeN = noise2(x * 0.45, (y + f * 9) * 0.32, 11)
      local lim = 1 + (edgeN - 0.5) * 0.8 * t
      -- upper licks break apart
      local solid = d <= lim
      if t > 0.55 and solid and (d > 0.45 or t > 0.85) then solid = noise2(x * 0.3, (y + f * 11) * 0.22, 17) > (t - 0.55) * 1.1 end
      if solid then
        local dd = d / lim
        local hot = 1 - t * 0.55
        local c
        if dd < 0.26 * hot then c = (t < 0.12) and "white" or "fire6"
        elseif dd < 0.5 * hot + 0.05 then c = "fire5"
        elseif dd < 0.68 then c = "fire4"
        elseif dd < 0.8 - green * 0.15 then c = (t > 0.7) and "fire2" or "fire3"
        elseif dd < 0.9 - green * 0.1 then c = "weird5"
        else c = "weird4" end
        if t > 0.8 and (c == "fire5" or c == "fire6") then c = "fire4" end
        P.set(img, x, y, c)
      end
    end
  end
  -- embers and green sparks above / around the column
  local n = opt.sparks or 6
  for i = 1, n do
    local sx = math.floor(4 + H(i, f, 21) * 16)
    local sy = math.floor(top + H(i, f, 22) * span * 0.6) - 3
    if sy >= 0 and sy < 72 and P.alpha(img, sx, sy) == 0 then
      P.set(img, sx, sy, (i % 3 == 0) and "weird5" or ((i % 3 == 1) and "fire5" or "weird4"))
      if i % 2 == 0 and sy + 1 < 72 then P.under(img, sx, sy + 1, "fire3") end
    end
  end
  -- hot nozzle base: always a bright white-yellow root
  if opt.h >= 8 then
    for x = 10, 13 do P.set(img, x, 71, (x == 10 or x == 13) and "fire5" or "white") end
    P.set(img, 9, 71, "weird5"); P.set(img, 14, 71, "weird5")
  end
end
local function gasFlame(f, opt) return function(img) flameCol(img, f, opt) end end
local function sputter(f) -- end of flame: a low flicker plus drifting remnants
  return function(img)
    flameCol(img, f, { h = 12, w = 0.45, green = 1, sparks = 0 })
    for i = 1, 9 do
      local sx = math.floor(5 + H(i, 3, 41) * 14)
      local sy = math.floor(18 + H(i, 3, 42) * 34)
      P.set(img, sx, sy, (i % 3 == 0) and "fire4" or ((i % 3 == 1) and "weird4" or "weird5"))
      if i % 2 == 0 then P.set(img, sx, sy - 1, "weird4") end
    end
  end
end

-------------------------------------------------------------------------------
-- prop_fuel_drum 16x20: rusty red Regime fuel drum, stencilled flammable mark (swamp mud, no snow)
-------------------------------------------------------------------------------
local SHC = { 3, 4, 5, 4, 3, 3, 3, 3, 2, 2, 2, 1 }
local function drumCol(ramp, i, d) return ramp .. math.max(1, math.min(5, SHC[i + 1] + (d or 0))) end
local function drum(img, ramp)
  for i = 0, 11 do
    local x = 2 + i
    for y = 4, 18 do P.set(img, x, y, drumCol(ramp, i)) end
    P.set(img, x, 4, drumCol(ramp, i, 1))
    if i >= 1 and i <= 10 then P.set(img, x, 5, ramp .. (i < 4 and "2" or "1")) end
    P.set(img, x, 6, drumCol(ramp, i, 1)); P.set(img, x, 7, drumCol(ramp, i, -1))
    P.set(img, x, 9, drumCol(ramp, i, 1)); P.set(img, x, 10, drumCol(ramp, i, -1))
    P.set(img, x, 13, drumCol(ramp, i, 1)); P.set(img, x, 14, drumCol(ramp, i, -1))
    P.set(img, x, 17, drumCol(ramp, i, 1)); P.set(img, x, 18, drumCol(ramp, i, -2))
  end
  P.clear(img, 2, 4); P.clear(img, 13, 4); P.clear(img, 2, 18); P.clear(img, 13, 18)
  P.set(img, 4, 4, "red5")
  P.set(img, 9, 5, "steel4"); P.set(img, 10, 5, "steel2")
end
-- flammable placard: dark diamond, orange flame
local FLAMMABLE = {
  "...o...",
  "..oyo..",
  ".oyfyo.",
  "oyfcfyo",
  ".oyfyo.",
  "..oyo..",
  "...o...",
}
local function fuelBody(img)
  drum(img, "red")
  -- dark stencil band between the hoops
  for i = 0, 11 do P.set(img, 2 + i, 11, drumCol("red", i, -1)); P.set(img, 2 + i, 12, drumCol("red", i, -2)) end
  P.grid(img, FLAMMABLE, { o = "outline", y = "fire4", f = "fire2", c = "fire5" }, 5, 8)
  P.set(img, 7, 9, "fire5")
  -- rust: streaks running down from the hoops, scabs on the shadow side
  for _, p in ipairs({ { 11, 7 }, { 11, 8 }, { 12, 10 }, { 12, 11 }, { 3, 14 }, { 3, 15 }, { 10, 15 }, { 10, 16 }, { 12, 16 }, { 4, 7 } }) do
    P.set(img, p[1], p[2], (p[2] % 2 == 0) and "dirt3" or "dirt2")
  end
  P.set(img, 13, 12, "dirt2"); P.set(img, 13, 13, "dirt1"); P.set(img, 6, 16, "dirt3")
  -- mud splashed up the bottom chime
  for x = 2, 13 do if H(x, 0, 51) < 0.6 then P.set(img, x, 18, "dirt2") end; if H(x, 1, 51) < 0.3 then P.set(img, x, 17, "dirt2") end end
end
local function dent(img, x, y, big)
  P.set(img, x, y, "red2"); P.set(img, x + 1, y, "red1"); P.set(img, x, y + 1, "red4")
  if big then P.set(img, x + 1, y + 1, "red2"); P.set(img, x - 1, y, "red2"); P.set(img, x + 1, y + 2, "red4") end
end
local function hole(img, x, y, rim) P.set(img, x, y, "outline"); P.set(img, x - 1, y - 1, rim); P.set(img, x + 1, y + 1, "red1") end
local function fuelIdle(img) fuelBody(img); P.selout(img); P.set(img, 3, 6, "red5") end
local function fuelD1(img)
  fuelBody(img); dent(img, 10, 9, true); dent(img, 4, 15)
  P.clear(img, 13, 5); P.set(img, 12, 5, "red1")
  P.selout(img)
  hole(img, 11, 7, "red5"); hole(img, 5, 13, "red4")
  -- fuel dribbling from the holes
  P.set(img, 11, 8, "ink1"); P.set(img, 11, 9, "ink1"); P.set(img, 5, 14, "ink1"); P.set(img, 5, 15, "ink1")
  P.set(img, 11, 10, "weird1")
end
local function fuelD2(img)
  fuelBody(img); dent(img, 10, 9, true); dent(img, 3, 11, true); dent(img, 7, 15)
  P.clear(img, 13, 5); P.clear(img, 12, 4); P.clear(img, 13, 6); P.set(img, 12, 5, "red1"); P.set(img, 12, 6, "red1")
  for _, p in ipairs({ { 10, 6 }, { 11, 7 }, { 12, 7 }, { 10, 7 }, { 12, 8 }, { 9, 6 } }) do P.over(img, p[1], p[2], "ink1") end
  P.selout(img)
  hole(img, 11, 7, "fire3"); hole(img, 5, 13, "red4")
  P.set(img, 5, 14, "ink1"); P.set(img, 5, 15, "ink1"); P.set(img, 5, 16, "ink1")
  -- leaking flame tongue from the puncture
  local g = { "..a..", ".ab..", ".abb.", "abcba", "abcca", ".acc." }
  local keys = { a = "fire3", b = "fire4", c = "fire6" }
  for yy, row in ipairs(g) do for xx = 1, #row do
    local ch = row:sub(xx, xx); if ch ~= "." then P.set(img, 9 + xx - 1, 1 + yy - 1, keys[ch]) end
  end end
  P.set(img, 11, 0, "fire2"); P.set(img, 12, 9, "fire3")
end

-------------------------------------------------------------------------------
-- prop_danger_post 16x40: Regime warning post, striped pole, warning plate, blinking red lamp (lamp centre x8,y4)
-------------------------------------------------------------------------------
local function dangerPost(on)
  return function(img)
    -- concrete footing in the mud
    P.box(img, 4, 34, 8, 4, "ink", 3)
    P.set(img, 6, 36, "ink2"); P.set(img, 10, 35, "dirt3")
    mud(img, 1, 14, 39, 3, 140, { reeds = { { 2, 5, -1 }, { 13, 6, 1 } } })
    -- pole x7..8 with red/pale bands
    for y = 8, 33 do
      local band = (math.floor((y - 8) / 4) % 2 == 0)
      P.set(img, 7, y, band and "red4" or "ink5"); P.set(img, 8, y, band and "red2" or "ink3")
      if H(y, 2, 141) < 0.2 then P.set(img, 8, y, "dirt3") end
    end
    -- warning plate: triangle, orange with dark keyline and "!"
    local tx, ty = 2, 13
    for j = 0, 9 do
      local half = math.floor(j * 0.6 + 0.5)
      for i = -half, half do
        local c = (j == 9 or i == -half or i == half) and "red1" or "fire4"
        if c == "fire4" and i < 0 and j < 5 then c = "fire5" end
        if c == "fire4" and i > half - 2 then c = "fire3" end
        P.set(img, 8 + i - 1 + (i >= 0 and 1 or 0) - 0, ty + j, c)
      end
    end
    -- "!" mark
    P.vline(img, 8, ty + 3, ty + 6, "outline"); P.set(img, 8, ty + 8, "outline")
    P.set(img, 6, ty + 7, "dirt3"); P.set(img, 11, ty + 8, "dirt2")
    P.rivet(img, 8, ty + 1)
    -- lamp housing on top
    P.fill(img, 5, 6, 6, 2, "ink2"); P.hline(img, 5, 10, 6, "ink3"); P.set(img, 10, 7, "ink1")
    local dome = on and { "fire5", "red5", "red4", "red3" } or { "red3", "red2", "red2", "red1" }
    for j = 0, 4 do
      local half = ({ 1, 2, 2, 2, 2 })[j + 1]
      for i = -half, half - 1 do
        local x = 8 + i
        local c = (i < -1) and dome[2] or (i < 0) and dome[2] or (i < 1) and dome[3] or dome[4]
        if j == 0 then c = dome[2] end
        P.set(img, x, 1 + j, c)
      end
    end
    if on then P.set(img, 7, 2, "white"); P.set(img, 6, 3, "fire6"); P.set(img, 7, 3, "fire5") else P.set(img, 7, 2, "red4") end
    -- cage bars over the dome
    P.vline(img, 8, 1, 5, "ink1"); P.set(img, 6, 3, on and "fire6" or "red3")
    P.hline(img, 6, 9, 0, "ink2")
    moss(img, 4, 11, 142, 0.4)
    P.selout(img)
    if on then -- hard glow pixels hugging the lamp (binary alpha)
      for _, p in ipairs({ { 4, 2 }, { 11, 2 }, { 4, 4 }, { 11, 4 }, { 5, 0 }, { 10, 0 } }) do P.under(img, p[1], p[2], "red4") end
    end
    strand(img, 6, 23, 4, 143)
  end
end

-------------------------------------------------------------------------------
-- builds
-------------------------------------------------------------------------------
local function frames(fns) local t = {}; for i, fn in ipairs(fns) do t[i] = { grid = fn } end; return t end

K.build(P.spec("prop_shack_door", 20, 40, {
  { tag = "prop_shack_door_closed", ms = 100, frames = frames({ shackDoor(0) }) },
  { tag = "prop_shack_door_open", ms = 70, frames = frames({ shackDoor(1), shackDoor(2), shackDoor(3), shackDoor(4) }) },
}))
K.build(P.spec("prop_lantern", 12, 20, {
  { tag = "prop_lantern_idle", ms = 140, frames = frames({ lantern(1), lantern(2), lantern(3), lantern(4) }) },
}))
K.build(P.spec("prop_lantern_post", 16, 44, {
  { tag = "prop_lantern_post_idle", ms = 140, frames = frames({ lanternPost(1), lanternPost(2), lanternPost(3), lanternPost(4) }) },
}))
K.build(P.spec("prop_net", 48, 40, {
  { tag = "prop_net_idle", ms = 180, frames = frames({ net(1), net(2), net(3), net(4) }) },
}))
K.build(P.spec("prop_sign_wade", SW, SH_, { { tag = "prop_sign_wade_idle", ms = 100, frames = frames({ signWade }) } }))
K.build(P.spec("prop_sign_logs", SW, SH_, { { tag = "prop_sign_logs_idle", ms = 100, frames = frames({ signLogs }) } }))
K.build(P.spec("prop_sign_gator", SW, SH_, { { tag = "prop_sign_gator_idle", ms = 100, frames = frames({ signGator }) } }))
K.build(P.spec("prop_skiff", 64, 22, {
  { tag = "prop_skiff_idle", ms = 160, frames = frames({ skiff(1), skiff(2), skiff(3), skiff(4) }) },
}))
K.build(P.spec("prop_gas_vent", 16, 12, {
  { tag = "prop_gas_vent_idle", ms = 400, frames = frames({ gasVent("idle", 1), gasVent("idle", 2) }) },
  { tag = "prop_gas_vent_bubble", ms = 90, frames = frames({ gasVent("bubble", 1), gasVent("bubble", 2), gasVent("bubble", 3), gasVent("bubble", 4) }) },
  { tag = "prop_gas_vent_burn", ms = 80, frames = frames({ gasVent("burn", 1), gasVent("burn", 2) }) },
}))
K.build(P.spec("prop_gas_flame", 24, 72, {
  { tag = "prop_gas_flame_start", ms = 60, frames = frames({
    gasFlame(1, { h = 24, w = 0.85, sparks = 2 }), gasFlame(2, { h = 48, w = 0.95, sparks = 4 }), gasFlame(3, { h = 72, w = 1.05 }) }) },
  { tag = "prop_gas_flame_loop", ms = 60, frames = frames({
    gasFlame(4, { h = 72 }), gasFlame(5, { h = 70 }), gasFlame(6, { h = 72 }), gasFlame(7, { h = 69 }) }) },
  { tag = "prop_gas_flame_end", ms = 60, frames = frames({
    gasFlame(8, { h = 52, w = 0.8, green = 0.5 }), gasFlame(9, { h = 28, w = 0.6, green = 1, sparks = 8 }), sputter(10) }) },
}))
K.build(P.spec("prop_fuel_drum", 16, 20, {
  { tag = "prop_fuel_drum_idle", ms = 100, frames = frames({ fuelIdle }) },
  { tag = "prop_fuel_drum_damaged1", ms = 100, frames = frames({ fuelD1 }) },
  { tag = "prop_fuel_drum_damaged2", ms = 100, frames = frames({ fuelD2 }) },
}))
K.build(P.spec("prop_danger_post", 16, 40, {
  { tag = "prop_danger_post_idle", ms = 300, frames = frames({ dangerPost(true), dangerPost(false) }) },
}))
