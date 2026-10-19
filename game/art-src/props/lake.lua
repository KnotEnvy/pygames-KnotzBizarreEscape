-- Mission 1 Part III ("MOOSE LAKE") props: train wreck on the frozen shore, thin-ice warning sign,
-- Project ANTLER lab sign, tesla mast, decorative ice hole.
-- Build: bash tools/build-art.sh art-src/props/lake.lua
-- All props anchor bottom-centre; tags are prop_<kind>_<anim>. Manifest entries: art-src/props/manifest_lake.json.
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local P = dofile(ROOT .. "/art-src/props/lib/pk.lua")(K)
local PC = app.pixelColor

-- extra sign glyphs (local to this script)
P.FONT.T = { "xxx", ".x.", ".x.", ".x.", ".x." }
P.FONT.H = { "x.x", "x.x", "xxx", "x.x", "x.x" }
P.FONT.C = { ".xx", "x..", "x..", "x..", ".xx" }
P.FONT.L = { "x..", "x..", "x..", "x..", "xxx" }
P.FONT[" "] = { ".", ".", ".", ".", "." }

local function H(x, y, s)
  local h = (math.floor(x) * 374761393 + math.floor(y) * 668265263 + math.floor(s or 0) * 1442695041) & 0xffffffff
  h = ((h ~ (h >> 13)) * 1274126177) & 0xffffffff
  h = h ~ (h >> 16)
  return h / 4294967296
end
local function copyInto(dst, src) for y = 0, src.height - 1 do for x = 0, src.width - 1 do
  local p = src:getPixel(x, y); if PC.rgbaA(p) > 0 then dst:drawPixel(x, y, p) end
end end end
-- snow lying on whatever is the top surface of each column in [x0,x1] (only on solid, non-snow pixels)
local function topSnow(img, x0, x1, seed, opt)
  opt = opt or {}
  for x = x0, x1 do
    local y = 0
    while y < img.height and not P.solid(img, x, y) do y = y + 1 end
    if y < img.height and y > 1 then
      local c = P.get(img, x, y)
      if c and not (opt.skip and opt.skip[c]) then
        local d = (H(x, 0, seed) < (opt.lumpy or 0.4)) and 2 or 1
        if opt.max then d = math.min(d, opt.max) end
        for k = 1, d do P.set(img, x, y - k, (k == d) and ((H(x, 1, seed) < 0.7) and "white" or "ink6") or "ink6") end
        if H(x, 2, seed) < 0.5 then P.set(img, x, y, "ink5") end
      end
    end
  end
end
-- a drift/heap of snow from x0..x1 whose bottom row is y (smooth hump, lit left)
local function drift(img, x0, x1, y, hgt, seed)
  local w = x1 - x0
  for x = x0, x1 do
    local t = (x - x0) / math.max(1, w)
    local h = math.floor(hgt * math.sin(t * math.pi) ^ 0.7 + 0.5 + ((H(x, 3, seed) < 0.2) and 1 or 0))
    for k = 0, h - 1 do
      local c = "ink6"
      if k == h - 1 then c = (t < 0.6) and "white" or "ink6" end
      if k == 0 then c = "ink5" end
      if t > 0.7 and k < h - 1 and k > 0 then c = "ink5" end
      if t > 0.55 and t <= 0.7 and k < h - 2 and k > 0 and (x + k) % 2 == 0 then c = "ink5" end
      P.set(img, x, y - k, c)
    end
  end
end

-------------------------------------------------------------------------------
-- prop_sign_thin_ice 32x40: wooden board on a log post, crack icon + THIN ICE!
-------------------------------------------------------------------------------
local function signThinIce(img)
  -- post
  for y = 27, 38 do P.set(img, 14, y, "dirt3"); P.set(img, 15, y, "dirt4"); P.set(img, 16, y, "dirt3"); P.set(img, 17, y, "dirt2") end
  P.set(img, 16, 31, "dirt2"); P.set(img, 16, 32, "dirt1"); P.set(img, 15, 35, "dirt3")
  -- board: three 8 px planks, slightly crooked
  P.plankH(img, 2, 3, 28, 8, { seed = 21, knot = false })
  P.plankH(img, 2, 11, 28, 8, { seed = 22, knot = false })
  P.plankH(img, 2, 19, 28, 8, { seed = 23, knot = false })
  P.hline(img, 2, 29, 10, "dirt1"); P.hline(img, 2, 29, 18, "dirt1")
  P.vline(img, 2, 3, 26, "dirt4"); P.vline(img, 29, 3, 26, "dirt2")
  P.clear(img, 29, 11); P.clear(img, 2, 19); P.clear(img, 29, 3)
  for _, p in ipairs({ { 4, 5 }, { 26, 5 }, { 4, 24 }, { 26, 24 } }) do P.nail(img, p[1], p[2]) end
  -- icon: a painted ice slab with a jagged crack and a splash under it
  P.fill(img, 8, 5, 16, 3, "sky4"); P.hline(img, 8, 23, 5, "ink6"); P.hline(img, 8, 23, 8, "sky3")
  P.set(img, 8, 5, "white"); P.set(img, 9, 5, "white")
  for _, p in ipairs({ { 15, 5 }, { 16, 6 }, { 15, 7 }, { 16, 8 } }) do P.set(img, p[1], p[2], "outline") end
  P.set(img, 14, 6, "outline"); P.set(img, 17, 7, "outline"); P.set(img, 13, 7, "sky2"); P.set(img, 18, 6, "sky2")
  -- splash drops
  P.set(img, 15, 9, "sky4"); P.set(img, 12, 9, "sky5"); P.set(img, 19, 9, "sky5")
  -- text
  local function centered(s, y, c)
    local w = P.textWidth(s)
    P.text(img, s, 16 - math.floor(w / 2 + 0.5), y, c, { shadow = "dirt1" })
  end
  centered("THIN", 12, "ink6")
  centered("ICE!", 20, "fire5")
  -- wear chips
  P.set(img, 12, 14, "dirt3"); P.set(img, 19, 22, "dirt3")
  P.snow(img, 2, 29, 3, 1, { seed = 24, lumpy = 0.6 })
  P.mound(img, 15, 39, 8, 2)
  P.selout(img)
end

-------------------------------------------------------------------------------
-- prop_lab_sign 64x32: riveted steel plate on two short posts, antler emblem, PROJECT ANTLER
-------------------------------------------------------------------------------
local MINI_ANTLER = {
  "a.a.......a.a",
  "a.a.a...a.a.a",
  "aaaaa...aaaaa",
  ".aaab...baaa.",
  "..bab...bab..",
  "...bab.bab...",
  "....bbbbb....",
  "...wwwwwww...",
  "..wwrrrrrww..",
  "...wwrrrww...",
  ".....www.....",
}
local function labSign(on)
  return function(img)
    -- posts
    for _, px in ipairs({ 10, 51 }) do
      for y = 22, 30 do P.set(img, px, y, "steel4"); P.set(img, px + 1, y, "steel3"); P.set(img, px + 2, y, "steel2") end
      P.hline(img, px - 1, px + 3, 27, "steel3"); P.set(img, px - 1, 27, "steel5"); P.set(img, px + 3, 27, "steel1")
    end
    -- plate
    P.box(img, 2, 4, 60, 18, "steel", 3, { spec = true })
    P.hline(img, 3, 60, 5, "steel4")
    P.fill(img, 3, 19, 58, 2, "weird2"); P.hline(img, 3, 60, 19, "weird3")
    for x = 3, 60 do if x % 6 == 0 then P.set(img, x, 20, "weird4") end end
    for _, p in ipairs({ { 4, 6 }, { 58, 6 }, { 4, 16 }, { 58, 16 }, { 31, 6 } }) do P.rivet(img, p[1], p[2]) end
    -- emblem field
    P.fill(img, 6, 7, 15, 12, "steel1")
    P.hline(img, 6, 20, 7, "outline"); P.vline(img, 6, 7, 18, "outline"); P.hline(img, 7, 20, 18, "steel4"); P.vline(img, 20, 8, 18, "steel4")
    P.grid(img, MINI_ANTLER, { a = "weird3", b = "weird2", w = "weird4", r = "weird1" }, 7, 7)
    P.set(img, 13, 16, "weird5")
    -- text (stencil white with dark keyline)
    P.text(img, "PROJECT", 27, 7, "ink6", { shadow = "steel1" })
    P.text(img, "ANTLER", 28, 13, "weird4", { shadow = "steel1" })
    -- scratches and a frost streak
    P.set(img, 50, 9, "steel5"); P.set(img, 51, 10, "steel5"); P.set(img, 22, 15, "steel2"); P.set(img, 56, 12, "dirt3"); P.set(img, 56, 13, "dirt2")
    -- blinking lamp on top of the plate
    P.fill(img, 44, 1, 4, 3, on and "weird5" or "weird2")
    P.hline(img, 43, 48, 3, "steel2"); P.hline(img, 44, 47, 0, on and "weird4" or "weird1")
    if on then P.set(img, 44, 1, "white"); P.set(img, 45, 1, "white") end
    P.snow(img, 3, 41, 4, 1, { seed = 31, lumpy = 0.5, drips = false })
    P.snow(img, 50, 60, 4, 1, { seed = 32, lumpy = 0.5, drips = false })
    P.mound(img, 11, 31, 5, 2); P.mound(img, 52, 31, 5, 2)
    P.selout(img)
    if on then -- glow halo (no outline)
      for _, p in ipairs({ { 42, 1 }, { 49, 1 }, { 45, -1 }, { 42, 2 }, { 49, 2 } }) do P.under(img, p[1], p[2], "weird4") end
    end
  end
end

-------------------------------------------------------------------------------
-- prop_tesla_coil 24x64: antler-pronged lab mast with crackling arcs
-------------------------------------------------------------------------------
-- prong tips (shared by the structure and the arcs): left antler, mirrored on the right
local LTIPS = { { 1, 4 }, { 4, 1 }, { 8, 5 } }
local TIPS = {}
for _, t in ipairs(LTIPS) do TIPS[#TIPS + 1] = t end
for _, t in ipairs(LTIPS) do TIPS[#TIPS + 1] = { 23 - t[1], t[2] } end
local ORB = { 11.5, 13 }
local function teslaBase(img)
  -- pedestal: concrete block with a purple warning band
  P.box(img, 3, 52, 18, 11, "ink", 3)
  P.hline(img, 3, 20, 52, "ink5"); P.fill(img, 4, 56, 16, 3, "weird2"); P.hline(img, 4, 19, 56, "weird3")
  for x = 4, 19 do if (x // 2) % 2 == 0 then P.set(img, x, 57, "outline") end end
  P.set(img, 6, 54, "weird4"); P.set(img, 17, 54, "weird4")
  P.set(img, 5, 61, "ink2"); P.set(img, 14, 60, "ink2")
  -- mast
  for y = 18, 51 do P.set(img, 10, y, "steel4"); P.set(img, 11, y, "steel3"); P.set(img, 12, y, "steel3"); P.set(img, 13, y, "steel2") end
  -- insulator discs
  for _, y in ipairs({ 22, 28, 34, 40, 46 }) do
    P.hline(img, 7, 16, y, "weird3"); P.hline(img, 7, 16, y + 1, "weird2"); P.set(img, 7, y, "weird5"); P.set(img, 8, y, "weird4")
    P.hline(img, 8, 15, y + 2, "weird1")
  end
  -- collar
  P.fill(img, 8, 17, 8, 3, "steel3"); P.hline(img, 8, 15, 17, "steel5"); P.hline(img, 8, 15, 19, "steel1"); P.set(img, 15, 18, "steel2")
  -- antler prongs (2 px beams, lit on top)
  local function beam(pts)
    for i = 1, #pts - 1 do
      P.line(img, pts[i][1], pts[i][2] + 1, pts[i + 1][1], pts[i + 1][2] + 1, "steel2")
    end
    for i = 1, #pts - 1 do P.line(img, pts[i][1], pts[i][2], pts[i + 1][1], pts[i + 1][2], "steel4") end
  end
  local function side(m)
    local function X(x) return m and (23 - x) or x end
    beam({ { X(9), 17 }, { X(6), 15 }, { X(3), 12 }, { X(1), 8 }, { X(1), 4 } })
    beam({ { X(4), 13 }, { X(4), 6 }, { X(4), 1 } })
    beam({ { X(7), 15 }, { X(8), 10 }, { X(8), 5 } })
    P.set(img, X(2), 11, "steel3"); P.set(img, X(5), 14, "steel3")
  end
  side(false); side(true)
  P.snow(img, 4, 19, 52, 1, { seed = 41, drips = false, lumpy = 0.4 })
  P.mound(img, 11, 63, 11, 2)
  P.selout(img)
end
local function arc(img, x0, y0, x1, y1, rnd)
  -- jagged bolt: midpoint displacement, white core, weird5/weird4 fringe
  local pts = { { x0, y0 }, { x1, y1 } }
  for _ = 1, 3 do
    local np = { pts[1] }
    for i = 1, #pts - 1 do
      local a, b = pts[i], pts[i + 1]
      local mx, my = (a[1] + b[1]) / 2, (a[2] + b[2]) / 2
      local len = math.abs(b[1] - a[1]) + math.abs(b[2] - a[2])
      np[#np + 1] = { math.floor(mx + (rnd() - 0.5) * len * 0.35 + 0.5), math.floor(my + (rnd() - 0.5) * len * 0.5 + 0.5) }
      np[#np + 1] = b
    end
    pts = np
  end
  for i = 1, #pts - 1 do
    P.line(img, pts[i][1], pts[i][2], pts[i + 1][1], pts[i + 1][2], nil, function(x, y)
      P.set(img, x, y - 1, "weird5"); P.set(img, x, y + 1, "weird4")
    end)
  end
  for i = 1, #pts - 1 do P.line(img, pts[i][1], pts[i][2], pts[i + 1][1], pts[i + 1][2], "white") end
end
local function tesla(f)
  return function(img)
    teslaBase(img)
    local rnd = P.rng(100 + f * 17)
    -- arcs: tip <-> orb and tip <-> tip, a different set every frame
    local sets = {
      { { 2, 0 }, { 6, 0 }, { 3, 4 } },
      { { 1, 0 }, { 5, 0 }, { 2, 6 } },
      { { 3, 0 }, { 4, 0 }, { 1, 5 } },
      { { 2, 0 }, { 6, 0 }, { 1, 4 }, { 3, 5 } },
    }
    for _, pr in ipairs(sets[f + 1]) do
      local a = TIPS[pr[1]]
      local b = (pr[2] == 0) and { math.floor(ORB[1] + ((a[1] < 12) and -1 or 1) * 1), ORB[2] } or TIPS[pr[2]]
      arc(img, a[1], a[2], b[1], b[2], rnd)
    end
    -- orb at the mast top, pulsing
    local big = (f % 2 == 0)
    P.disc(img, 11, 13, big and 3 or 2, "weird4"); P.disc(img, 12, 13, big and 3 or 2, "weird4")
    P.fill(img, 10, 12, 4, 3, "weird5"); P.fill(img, 11, 12, 2, 2, "white")
    P.set(img, 10, 11, "white")
    -- glowing prong tips
    for i, t in ipairs(TIPS) do P.set(img, t[1], t[2], ((i + f) % 2 == 0) and "white" or "weird5") end
    -- a stray spark leaping off a tip
    local t = TIPS[(f % 6) + 1]
    local dir = (t[1] < 12) and -1 or 1
    P.set(img, t[1] + dir * 2, t[2] - 1, "weird5"); P.set(img, t[1] + dir * 3, t[2] - 2, "white")
  end
end

-------------------------------------------------------------------------------
-- prop_ice_hole 32x16: open hole in thick ice (dark water, jagged white rim)
-------------------------------------------------------------------------------
local function iceHole(f)
  return function(img)
    local cx, cy = 15.5, 10.5
    local function inE(x, y, rx, ry) local dx, dy = (x - cx) / rx, (y - cy) / ry; return dx * dx + dy * dy <= 1 end
    for y = 2, 15 do for x = 0, 31 do
      local jag = (H(x, 1, 7) < 0.3) and 0.8 or 0
      if inE(x, y, 15, 5 + jag) then
        local c
        if inE(x, y, 11, 2.6) then
          -- looking down into the hole: far ice wall, then dark water
          if not inE(x, y - 1, 11, 2.6) then c = "sky4"
          elseif not inE(x, y - 2, 11, 2.6) then c = "sky3"
          elseif y <= cy then c = "sky2"
          else c = "sky1" end
          if y > cy + 1 then c = "outline" end
        else
          -- thick snowy rim: lit far side, shaded near side
          if y < cy then c = (x < cx + 6) and "white" or "ink6"
          else c = (y >= cy + 3) and "ink5" or ((x < cx) and "ink6" or "ink5") end
          if y == 15 then c = "ink5" end
          if y >= cy and y <= cy + 1 and inE(x, y - 1, 11, 2.6) then c = "sky5" end  -- near lip catching light
        end
        P.set(img, x, y, c)
      end
    end end
    -- broken ice chunks heaped on the rim
    for _, p in ipairs({ { 3, 7 }, { 8, 5 }, { 22, 5 }, { 27, 7 } }) do
      P.set(img, p[1], p[2] - 1, "white"); P.set(img, p[1] + 1, p[2] - 1, "sky5"); P.set(img, p[1] + 1, p[2], "sky4")
    end
    -- moving glint on the water
    local gx = (f == 0) and 10 or 18
    P.set(img, gx, 10, "sky5"); P.set(img, gx + 1, 10, "white"); P.set(img, gx + 2, 10, "sky4")
    P.set(img, (f == 0) and 19 or 12, 11, "sky2")
    P.selout(img, { color = "sky2" })
    for x = 0, 31 do if P.get(img, x, 15) == "sky2" then P.set(img, x, 15, nil) end end
  end
end

-------------------------------------------------------------------------------
-- prop_log_spill 64x24: spilled logs scattered in the snow
-------------------------------------------------------------------------------
local function logEnd(img, x, cy, r)
  -- end grain: concentric rings (sand), bark rim
  P.ellipse(img, x, cy, 2, r, nil, function(px, py, i, j)
    local d = math.sqrt((i / 2.5) ^ 2 + (j / (r + 0.3)) ^ 2)
    local c = "sand4"
    if d > 0.85 then c = "dirt2" elseif d > 0.6 then c = "sand3" elseif d > 0.35 then c = "sand4" else c = "sand2" end
    if i < 0 and j < 0 and d < 0.85 and d > 0.6 then c = "sand5" end
    P.set(img, px, py, c)
  end)
end
local function logH(img, x0, x1, cy, r, ends, seed)
  local rnd = P.rng(seed)
  for x = x0, x1 do
    for j = -r, r do
      local t = (j + r) / (2 * r)
      local c = (t < 0.2) and "dirt4" or ((t < 0.55) and "dirt3" or ((t < 0.85) and "dirt2" or "dirt1"))
      P.set(img, x, cy + j, c)
    end
  end
  for _ = 1, math.floor((x1 - x0) / 4) do
    local gx, gy = rnd(x0 + 1, x1 - 3), cy + rnd(-r + 1, r - 1)
    P.hline(img, gx, gx + rnd(1, 3), gy, (gy < cy) and "dirt2" or "dirt1")
  end
  if ends == "l" or ends == "both" then logEnd(img, x0, cy, r) end
  if ends == "r" or ends == "both" then logEnd(img, x1, cy, r) end
end
local function logSlope(img, x0, y0, x1, y1, r, seed)
  -- a log lying at a shallow slope, centre line from (x0,y0) to (x1,y1); end cap at the low end
  for x = x0, x1 do
    local cy = math.floor(y0 + (y1 - y0) * (x - x0) / (x1 - x0) + 0.5)
    for j = -r, r do
      local t = (j + r) / (2 * r)
      local c = (t < 0.2) and "dirt4" or ((t < 0.55) and "dirt3" or ((t < 0.85) and "dirt2" or "dirt1"))
      if H(x, j, seed) < 0.07 then c = "dirt2" end
      P.set(img, x, cy + j, c)
    end
  end
  logEnd(img, x1, y1, r)
  logEnd(img, x0, y0, r)
end
local function logSpill(img)
  logH(img, 3, 30, 19, 3, "l", 1)                -- back left
  logSlope(img, 22, 10, 44, 17, 3, 2)            -- leaning log
  logH(img, 36, 60, 19, 3, "r", 3)               -- back right
  P.selout(img, { flat = true })
  logH(img, 12, 40, 20, 3, "both", 4)            -- front
  logH(img, 46, 58, 13, 2, "both", 5)            -- small one on top
  topSnow(img, 2, 61, 51, { lumpy = 0.55, skip = { sand4 = true, sand3 = true, sand2 = true, sand5 = true } })
  drift(img, 0, 22, 23, 4, 52); drift(img, 30, 63, 23, 3, 53)
  P.selout(img)
end

-------------------------------------------------------------------------------
-- prop_wreck_bogie 48x24: overturned wheel truck, wheels up
-------------------------------------------------------------------------------
local function wheel(img, cx, cy, r, opt)
  opt = opt or {}
  P.disc(img, cx, cy, r, nil, function(x, y, i, j)
    local d = math.sqrt(i * i + j * j)
    local c
    if d > r - 0.6 then c = (i + j < 0) and "steel4" or "steel2"           -- tyre
    elseif d > r - 1.6 then c = (i + j < 0) and "steel5" or "steel3"       -- flange
    elseif d < 1.6 then c = "steel5"                                       -- hub
    elseif d < 2.6 then c = "steel2"
    else
      -- spokes on a red wheel centre
      local a = math.atan(j, i)
      local s = (a / (2 * math.pi) * (opt.spokes or 8)) % 1
      c = (s < 0.3) and (opt.spoke or "red4") or "outline"
    end
    P.set(img, x, y, c)
  end)
end
local function wreckBogie(img)
  wheel(img, 12, 9, 7); wheel(img, 35, 9, 7)
  -- side frame lying under the wheels (upside down): cast steel with red trim, axle boxes, spring pack
  P.box(img, 2, 14, 44, 5, "steel", 3)
  P.hline(img, 2, 45, 18, "red3"); P.hline(img, 2, 45, 19, "red2")
  for _, x in ipairs({ 10, 33 }) do P.box(img, x, 12, 5, 6, "steel", 2); P.rivet(img, x + 1, 13) end
  P.fill(img, 20, 13, 8, 5, "steel2"); for y = 13, 17, 2 do P.hline(img, 20, 27, y, "steel4") end
  P.set(img, 19, 15, "outline"); P.set(img, 28, 15, "outline")
  -- bent brake beam sticking out
  P.line(img, 44, 15, 47, 11, "steel3"); P.line(img, 45, 15, 47, 12, "steel1")
  -- rust streaks
  P.set(img, 6, 16, "dirt3"); P.set(img, 6, 17, "dirt2"); P.set(img, 40, 16, "dirt3")
  topSnow(img, 4, 44, 61, { lumpy = 0.3, max = 2 })
  drift(img, 0, 20, 23, 5, 62); drift(img, 24, 47, 23, 4, 63)
  P.selout(img)
end

-------------------------------------------------------------------------------
-- prop_wreck_boxcar 160x64: derailed red boxcar on its side, buckled in the middle, fire in the breach
-------------------------------------------------------------------------------
local BW, BH = 152, 34          -- flat side panel (u along the car, v down: 0-3 sill, 4-31 planks, 32-33 roof edge)
local function boxTop(u)        -- shear: top of the panel in canvas y; the car's back is broken in the middle
  if u <= 75 then return 20 + math.floor(u * 8 / 75 + 0.5) end
  return 28 - math.floor((u - 76) * 9 / 75 + 0.5)
end
local BREACH = { cx = 77, cy = 15, rx = 8, ry = 10 }
local function inBreach(u, v)
  local dx, dy = (u - BREACH.cx) / BREACH.rx, (v - BREACH.cy) / BREACH.ry
  return dx * dx + dy * dy + (H(u, v, 9) - 0.5) * 0.5 < 1
end
local function boxPanel()
  local pan = Image(BW, BH, ColorMode.RGB)
  local rnd = P.rng(77)
  for u = 0, BW - 1 do for v = 0, BH - 1 do
    local c
    if v <= 3 then c = (v == 0) and "steel4" or ((v == 3) and "steel1" or "steel2")
    elseif v >= 32 then c = (v == 32) and "red1" or "outline"
    else
      local k = u % 4
      c = (k == 0) and "red4" or ((k == 3) and "red2" or "red3")
      if v == 4 then c = "red4" end
      if v >= 27 then c = (c == "red4") and "red3" or ((c == "red3") and "red2" or "red1") end
    end
    P.set(pan, u, v, c)
  end end
  -- sill brackets (where the trucks used to hang)
  for _, u in ipairs({ 14, 18, 128, 132 }) do P.set(pan, u, 1, "steel5"); P.set(pan, u, 2, "steel4") end
  -- steel posts (ribs) with rivets
  for _, u in ipairs({ 6, 62, 98, 114, 132, 146 }) do
    for v = 4, 31 do P.set(pan, u, v, "steel4"); P.set(pan, u + 1, v, (v >= 27) and "steel1" or "steel2") end
    for v = 7, 29, 6 do P.set(pan, u, v, "steel5") end
  end
  -- sliding door, hanging askew (dropped off its right hanger)
  P.hline(pan, 16, 58, 5, "steel4"); P.hline(pan, 16, 58, 6, "steel1")
  for u = 20, 54 do
    local off = math.floor((u - 20) / 14)
    for v = 7, 30 do
      local vv = v + off
      if vv <= 31 then
        local k = (u - 20) % 5
        local c = (k == 0) and "red3" or ((k == 4) and "red1" or "red2")
        if u == 20 or u == 54 then c = "steel2" end
        if v == 7 then c = "steel4" end
        if v == 30 then c = "steel1" end
        P.set(pan, u, vv, c)
      end
    end
  end
  -- door Z-brace and handle
  P.line(pan, 21, 10, 53, 10 + 2, "steel3"); P.line(pan, 21, 27, 53, 29, "steel3"); P.line(pan, 22, 26, 52, 12, "steel3")
  P.line(pan, 22, 27, 52, 13, "steel1")
  P.fill(pan, 49, 17, 2, 4, "steel4"); P.set(pan, 50, 20, "steel1")
  -- regime spiral eye stencil on the right half
  P.eye(pan, "s", 116, 12, { o = "outline", w = "ink6", r = "red2", ws = "ink5" })
  -- scratches, rust, bullet dings
  for _ = 1, 26 do
    local u, v = rnd(2, BW - 3), rnd(6, 28)
    local c = P.get(pan, u, v)
    if c and c:sub(1, 3) == "red" then
      if rnd() < 0.5 then P.set(pan, u, v, "red5"); P.set(pan, u + 1, v, "red4") else P.set(pan, u, v, "dirt3"); P.set(pan, u, v + 1, "dirt2") end
    end
  end
  -- breach in the buckled middle: dark interior with splintered plank ends
  for u = 0, BW - 1 do for v = 4, 31 do
    if inBreach(u, v) then P.set(pan, u, v, (v > 22) and "red1" or "outline") end
  end end
  for u = BREACH.cx - BREACH.rx - 1, BREACH.cx + BREACH.rx + 1 do
    for v = 4, 31 do
      if not inBreach(u, v) and (inBreach(u - 1, v) or inBreach(u + 1, v) or inBreach(u, v - 1) or inBreach(u, v + 1)) then
        -- splintered edge: light raw wood, some splinters poking into the hole
        P.set(pan, u, v, (H(u, v, 3) < 0.5) and "sand4" or "dirt4")
        if H(u, v, 4) < 0.3 then
          local dir = (u < BREACH.cx) and 1 or -1
          P.set(pan, u + dir, v, "sand3"); if H(u, v, 5) < 0.5 then P.set(pan, u + 2 * dir, v + 1, "dirt3") end
        end
      end
    end
  end
  -- crumple creases radiating from the breach
  for _, cr in ipairs({ { 66, 6, 69, 30 }, { 88, 5, 86, 30 }, { 70, 30, 74, 25 } }) do P.line(pan, cr[1], cr[2], cr[3], cr[4], "red1") end
  P.line(pan, 65, 7, 68, 30, "red4"); P.line(pan, 89, 6, 87, 29, "red4")
  -- crumpled right end: jagged edge
  for v = 0, BH - 1 do
    local cut = math.floor(H(v // 3, 1, 8) * 4)
    for k = 0, cut - 1 do P.set(pan, BW - 1 - k, v, nil) end
    P.set(pan, BW - 1 - cut, v, (v % 3 == 0) and "sand4" or "red2")
  end
  return pan
end
local BOXPAN = nil
local function boxcarBase()
  local img = Image(160, 64, ColorMode.RGB)
  BOXPAN = BOXPAN or boxPanel()
  for u = 0, BW - 1 do
    local y0 = boxTop(u)
    for v = 0, BH - 1 do
      local p = BOXPAN:getPixel(u, v)
      if PC.rgbaA(p) > 0 then img:drawPixel(u + 4, y0 + v, p) end
    end
  end
  -- left end frame + coupler knuckle
  for y = boxTop(0), boxTop(0) + 33 do P.set(img, 3, y, "steel2"); P.set(img, 4, y, "steel3") end
  P.fill(img, 0, 23, 4, 4, "steel3"); P.hline(img, 0, 3, 23, "steel4"); P.hline(img, 0, 3, 26, "steel1"); P.set(img, 0, 27, "steel2")
  -- the car lies overturned: truck bolsters stick up from the sill, a torn air hose dangles
  for _, u in ipairs({ 12, 126 }) do
    local y = boxTop(u)
    P.fill(img, u + 4, y - 4, 8, 4, "steel2"); P.hline(img, u + 4, u + 11, y - 4, "steel4"); P.vline(img, u + 11, y - 4, y - 1, "steel1")
    P.fill(img, u + 6, y - 6, 4, 2, "steel3"); P.hline(img, u + 6, u + 9, y - 6, "steel5")
  end
  P.line(img, 30, boxTop(26) - 1, 33, boxTop(26) - 5, "outline"); P.line(img, 33, boxTop(26) - 5, 36, boxTop(26) - 6, "outline")
  -- snow on the sill and drifts burying the lower edge
  topSnow(img, 4, 66, 71, { lumpy = 0.55 }); topSnow(img, 90, 152, 72, { lumpy = 0.55 })
  drift(img, 0, 46, 63, 12, 73); drift(img, 34, 70, 63, 7, 74); drift(img, 92, 132, 63, 13, 75); drift(img, 120, 159, 63, 10, 76)
  drift(img, 66, 96, 63, 6, 77)
  P.selout(img)
  return img
end
local BOXBASE = nil
local function boxcar(f)
  return function(img)
    BOXBASE = BOXBASE or boxcarBase()
    copyInto(img, BOXBASE)
    local rnd = P.rng(500 + f * 31)
    -- glow on the breach interior + licking flames rising out of its top
    local function topAt(u) return boxTop(u) end
    for u = BREACH.cx - 6, BREACH.cx + 6 do
      for v = 12, 26 do
        if inBreach(u, v) then
          local x, y = u + 4, topAt(u) + v
          local g = (v > 19) and "fire2" or ((H(u, v + f, 11) < 0.35) and "fire3" or "fire2")
          if v > 21 and math.abs(u - BREACH.cx) < 4 then g = (H(u, f, 12) < 0.5) and "fire4" or "fire3" end
          if H(u, v, 13 + f) < 0.55 then P.set(img, x, y, g) end
        end
      end
    end
    -- flame tongues from the upper breach edge
    local base = topAt(BREACH.cx) + BREACH.cy - 2
    for i = -6, 6 do
      local x = BREACH.cx + 4 + i
      local hgt = math.floor((7 - math.abs(i)) * 1.6 + 2 + math.sin(i * 1.7 + f * 1.9) * 2.5 + rnd(0, 2))
      if hgt > 1 then
        for k = 0, hgt - 1 do
          local tt = k / hgt
          local c = (tt < 0.3) and "fire5" or ((tt < 0.6) and "fire4" or ((tt < 0.85) and "fire3" or "fire2"))
          if math.abs(i) >= 5 then c = (tt < 0.5) and "fire3" or "fire2" end
          if math.abs(i) <= 1 and tt < 0.2 then c = "fire6" end
          P.set(img, x, base - k, c)
        end
      end
    end
    -- embers and a thin smoke wisp
    for k = 0, 3 do
      local ey = base - 14 - ((f * 3 + k * 5) % 14)
      P.set(img, BREACH.cx + 4 + ((k * 5 + f * 2) % 11) - 5, ey, (k % 2 == 0) and "fire5" or "fire4")
    end
    for k = 0, 2 do
      local sy = base - 18 - ((f * 2 + k * 6) % 16)
      local sx = BREACH.cx + 2 - ((f + k * 3) % 6)
      P.set(img, sx, sy, "ink3"); P.set(img, sx + 1, sy, "ink2"); P.set(img, sx, sy - 1, "ink4")
    end
    -- warm light spilling on the panel next to the breach
    for _, d in ipairs({ { -10, 6 }, { 11, 4 }, { -9, 12 }, { 12, 10 } }) do
      local u = BREACH.cx + d[1]
      local x, y = u + 4, topAt(u) + d[2]
      if P.get(img, x, y) and P.get(img, x, y):sub(1, 3) == "red" then P.set(img, x, y, (f % 2 == 0) and "red5" or "fire3") end
    end
  end
end

-------------------------------------------------------------------------------
-- prop_wreck_engine 128x96: armored locomotive IRONHORN, nose-down in the lake ice
-- Drawn level (facing right) at 1x, then rotated with a RotSprite-style scale2x x3 + nearest sample.
-------------------------------------------------------------------------------
local LW, LH = 118, 60
local function loco()
  local img = Image(LW, LH, ColorMode.RGB)
  -- frame / running board
  P.fill(img, 4, 38, 106, 4, "steel1"); P.hline(img, 4, 109, 38, "steel3"); P.hline(img, 4, 109, 40, "red3"); P.hline(img, 4, 109, 41, "red2")
  -- wheels
  for _, w in ipairs({ { 42, 49, 8 }, { 60, 49, 8 }, { 78, 49, 8 } }) do wheel(img, w[1], w[2], w[3], { spoke = "red3", spokes = 10 }) end
  wheel(img, 97, 52, 5, { spoke = "red3", spokes = 6 }); wheel(img, 16, 52, 5, { spoke = "red3", spokes = 6 })
  -- side rod
  P.hline(img, 42, 78, 50, "steel5"); P.hline(img, 42, 78, 51, "steel2")
  -- boiler (armored cylinder)
  for x = 32, 100 do
    for y = 14, 37 do
      local c
      if y == 14 then c = "steel5" elseif y <= 17 then c = "steel4" elseif y <= 28 then c = "steel3" elseif y <= 34 then c = "steel2" else c = "steel1" end
      P.set(img, x, y, c)
    end
  end
  for _, sx in ipairs({ 46, 60, 74, 88 }) do
    P.vline(img, sx, 14, 37, "steel1"); P.vline(img, sx + 1, 15, 36, "steel4")
    for y = 17, 34, 4 do P.rivet(img, sx + 2, y) end
  end
  P.hline(img, 32, 100, 25, "red3"); P.hline(img, 32, 100, 26, "red2"); P.hline(img, 32, 100, 24, "red4")
  -- smokebox front ring + armored prow
  for y = 14, 37 do P.set(img, 101, y, "steel2"); P.set(img, 102, y, "steel3"); P.set(img, 103, y, "steel1") end
  P.fill(img, 104, 18, 3, 16, "red3"); P.vline(img, 104, 18, 33, "red4"); P.vline(img, 106, 18, 33, "red1")
  -- the iron horns (ivory, sweeping forward)
  local horn2 = { { 100, 15, 3 }, { 101, 13, 3 }, { 102, 11, 2 }, { 103, 9, 2 }, { 104, 7, 2 }, { 105, 5, 1 } }
  for _, h in ipairs(horn2) do for k = 0, h[3] - 1 do P.set(img, h[1], h[2] + k, (k == 0) and "sand3" or "sand2"); P.set(img, h[1] + 1, h[2] + k, "sand2") end end
  local horn = { { 103, 15, 4 }, { 105, 13, 4 }, { 107, 11, 3 }, { 109, 9, 3 }, { 111, 7, 2 }, { 112, 5, 2 }, { 113, 3, 1 } }
  for _, h in ipairs(horn) do for k = 0, h[3] - 1 do P.set(img, h[1], h[2] + k, (k == 0) and "sand5" or "sand3"); P.set(img, h[1] + 1, h[2] + k, (k == 0) and "sand4" or "sand2") end end
  P.set(img, 114, 3, "ink6")
  -- cow-catcher plow
  for y = 38, 57 do
    local x1 = 101 + math.floor((y - 38) * 0.75)
    for x = 100, x1 do P.set(img, x, y, ((x + y) % 4 == 0) and "steel2" or "steel4") end
    P.set(img, x1, y, "red3"); P.set(img, x1 + 1, y, "red2")
  end
  P.hline(img, 100, 116, 58, "steel1")
  -- smokestack + domes
  P.fill(img, 86, 4, 8, 10, "steel2"); P.vline(img, 86, 4, 13, "steel4"); P.vline(img, 87, 4, 13, "steel3"); P.vline(img, 93, 4, 13, "steel1")
  P.fill(img, 84, 1, 12, 3, "steel3"); P.hline(img, 84, 95, 1, "steel5"); P.hline(img, 84, 95, 3, "steel1")
  P.hline(img, 85, 94, 0, "outline")
  P.ellipse(img, 66, 13, 5, 3, nil, function(x, y, i, j) P.set(img, x, y, (j < 0 and i < 1) and "steel4" or "steel3") end)
  P.fill(img, 61, 13, 11, 2, "steel3")
  P.set(img, 64, 10, "steel5"); P.hline(img, 62, 70, 11, "steel4")
  -- cracked boiler: glowing seam (fire3 core, fire2 rim) - recoloured per frame after rotation
  local crack = { { 71, 14 }, { 70, 18 }, { 72, 21 }, { 70, 25 }, { 73, 29 }, { 71, 33 } }
  for i = 1, #crack - 1 do
    P.line(img, crack[i][1], crack[i][2], crack[i + 1][1], crack[i + 1][2], nil, function(x, y)
      P.set(img, x - 1, y, "fire2"); P.set(img, x + 1, y, "fire2"); P.set(img, x, y, "fire3")
    end)
  end
  P.line(img, 72, 21, 77, 19, "fire2"); P.line(img, 70, 25, 66, 28, "fire2")
  -- armored cab
  P.fill(img, 6, 6, 26, 32, "steel3")
  P.hline(img, 6, 31, 6, "steel4"); P.vline(img, 6, 6, 37, "steel4"); P.vline(img, 31, 6, 37, "steel1")
  P.fill(img, 3, 2, 32, 4, "steel2"); P.hline(img, 3, 34, 2, "steel4"); P.hline(img, 3, 34, 5, "steel1")
  P.fill(img, 11, 10, 16, 5, "outline"); P.hline(img, 12, 25, 11, "steel1"); P.set(img, 12, 11, "fire2"); P.set(img, 24, 13, "fire2")
  P.hline(img, 6, 31, 33, "red3"); P.hline(img, 6, 31, 34, "red2"); P.hline(img, 6, 31, 32, "red4")
  P.eye(img, "m", 11, 19)
  for _, p in ipairs({ { 8, 8 }, { 29, 8 }, { 8, 30 }, { 29, 30 } }) do P.rivet(img, p[1], p[2]) end
  -- broken headlamp
  P.fill(img, 96, 10, 4, 4, "steel1"); P.set(img, 96, 10, "steel4"); P.set(img, 98, 12, "ink3")
  return img
end
-- scale2x (EPX) on a flat array of pixel values
local function scale2x(src, w, h)
  local dst = {}
  local W2 = w * 2
  local function at(x, y) if x < 0 or y < 0 or x >= w or y >= h then return 0 end return src[y * w + x + 1] end
  for y = 0, h - 1 do for x = 0, w - 1 do
    local p = at(x, y)
    local a, b, c, d = at(x, y - 1), at(x + 1, y), at(x - 1, y), at(x, y + 1)
    local e0, e1, e2, e3 = p, p, p, p
    if c == a and c ~= d and a ~= b then e0 = a end
    if a == b and a ~= c and b ~= d then e1 = b end
    if d == c and d ~= b and c ~= a then e2 = c end
    if b == d and b ~= a and d ~= c then e3 = d end
    dst[(2 * y) * W2 + 2 * x + 1] = e0; dst[(2 * y) * W2 + 2 * x + 2] = e1
    dst[(2 * y + 1) * W2 + 2 * x + 1] = e2; dst[(2 * y + 1) * W2 + 2 * x + 2] = e3
  end end
  return dst, w * 2, h * 2
end
local ANG = math.rad(21)
local TX, TY = 18, 20            -- where the level image's origin lands on the canvas
local function rotPt(x, y)       -- level image coords -> canvas coords
  return TX + x * math.cos(ANG) - y * math.sin(ANG), TY + x * math.sin(ANG) + y * math.cos(ANG)
end
local function rotated(src)
  local arr = {}
  for y = 0, LH - 1 do for x = 0, LW - 1 do
    local p = src:getPixel(x, y); arr[y * LW + x + 1] = (PC.rgbaA(p) > 0) and p or 0
  end end
  local a, w, h = arr, LW, LH
  for _ = 1, 3 do a, w, h = scale2x(a, w, h) end
  local out = Image(128, 96, ColorMode.RGB)
  local c, s = math.cos(ANG), math.sin(ANG)
  for Y = 0, 95 do for X = 0, 127 do
    local dx, dy = X + 0.5 - TX, Y + 0.5 - TY
    local sx, sy = dx * c + dy * s, -dx * s + dy * c
    local ix, iy = math.floor(sx * 8), math.floor(sy * 8)
    if ix >= 0 and iy >= 0 and ix < w and iy < h then
      local p = a[iy * w + ix + 1]
      if p ~= 0 then out:drawPixel(X, Y, p) end
    end
  end end
  return out
end
-- angular ice slab (quad) with lit top edge, shaded right/bottom, keyline against what's behind it
local function inQuad(px, py, q)
  local function s(a, b) return (b[1] - a[1]) * (py - a[2]) - (b[2] - a[2]) * (px - a[1]) end
  local d1, d2, d3, d4 = s(q[1], q[2]), s(q[2], q[3]), s(q[3], q[4]), s(q[4], q[1])
  return (d1 >= 0 and d2 >= 0 and d3 >= 0 and d4 >= 0) or (d1 <= 0 and d2 <= 0 and d3 <= 0 and d4 <= 0)
end
local function iceChunk(img, q)
  local minx, maxx, miny, maxy = 999, -999, 999, -999
  for _, v in ipairs(q) do minx = math.min(minx, v[1]); maxx = math.max(maxx, v[1]); miny = math.min(miny, v[2]); maxy = math.max(maxy, v[2]) end
  local m = {}
  local function inside(x, y) return m[y * 1000 + x] end
  for y = math.floor(miny), math.ceil(maxy) do for x = math.floor(minx), math.ceil(maxx) do
    if inQuad(x + 0.5, y + 0.5, q) then m[y * 1000 + x] = true end
  end end
  local marks = {}
  for y = math.floor(miny) - 1, math.ceil(maxy) + 1 do for x = math.floor(minx) - 1, math.ceil(maxx) + 1 do
    if inside(x, y) then
      local c = "sky4"
      if not inside(x, y - 1) then c = "white"
      elseif not inside(x, y - 2) then c = "sky5"
      elseif not inside(x + 1, y) or not inside(x + 1, y - 1) then c = "sky2"
      elseif not inside(x, y + 1) then c = "sky3"
      elseif not inside(x - 1, y) then c = "sky5"
      elseif (x + y) % 7 == 0 then c = "sky3" end
      P.set(img, x, y, c)
    elseif inside(x + 1, y) or inside(x - 1, y) or inside(x, y + 1) or inside(x, y - 1) then
      if P.solid(img, x, y) then marks[#marks + 1] = { x, y } end
    end
  end end
  for _, mk in ipairs(marks) do P.set(img, mk[1], mk[2], "sky1") end
end
local ENG = nil
local function engineBase()
  local img = rotated(loco())
  -- snow dusting on the upward-facing surfaces
  topSnow(img, 0, 127, 81, { lumpy = 0.45, skip = { fire2 = true, fire3 = true } })
  -- snow bank + broken sleepers propping up the cab end
  for _, s in ipairs({ { 4, 82, 30, 80 }, { 10, 88, 36, 89 } }) do P.line(img, s[1], s[2], s[3], s[4], "dirt2"); P.line(img, s[1], s[2] + 1, s[3], s[4] + 1, "dirt1") end
  drift(img, 0, 50, 95, 18, 82)
  -- ice heaped around the plunged nose
  local chunks = {
    { { 70, 96 }, { 78, 84 }, { 90, 86 }, { 86, 96 } },
    { { 112, 96 }, { 116, 80 }, { 126, 82 }, { 127, 96 } },
    { { 84, 96 }, { 92, 80 }, { 104, 77 }, { 102, 96 } },
    { { 98, 96 }, { 104, 86 }, { 116, 88 }, { 114, 96 } },
    { { 58, 96 }, { 62, 90 }, { 72, 89 }, { 72, 96 } },
    { { 118, 84 }, { 121, 74 }, { 127, 76 }, { 127, 88 } },
  }
  for _, q in ipairs(chunks) do iceChunk(img, q) end
  P.selout(img)
  return img
end
local function engine(f)
  return function(img)
    ENG = ENG or engineBase()
    copyInto(img, ENG)
    -- boiler crack embers pulse
    local glow = ({ { "fire3", "fire2" }, { "fire4", "fire3" }, { "fire5", "fire3" }, { "fire4", "fire2" } })[f + 1]
    for y = 0, 95 do for x = 0, 127 do
      local c = P.get(img, x, y)
      if c == "fire3" then P.set(img, x, y, (H(x, y, f) < 0.8) and glow[1] or "fire5")
      elseif c == "fire2" then P.set(img, x, y, glow[2]) end
    end end
    -- sparks drifting up from the crack
    local cx, cy = rotPt(71, 14)
    for k = 0, 2 do
      local h = (f * 4 + k * 6) % 14
      P.set(img, math.floor(cx) + ((k * 3 + f) % 5) - 2, math.floor(cy) - 3 - h, (k == f % 3) and "fire5" or "fire4")
    end
    -- smoke puffs from the stack, rising and drifting left with the wind
    local sx, sy = rotPt(90, 0)
    sx, sy = math.floor(sx), math.floor(sy)
    for k = 0, 3 do
      local t = ((f + k * 4) % 16) / 16          -- 0..1 along the plume
      local px = sx - math.floor(t * 18 + 0.5)
      local py = sy - 2 - math.floor(t * 34 + 0.5)
      local r = 2 + math.floor(t * 4)
      if py - r >= 0 then
        P.disc(img, px, py, r, nil, function(x, y, i, j)
          local c = (i + j < -r * 0.6) and "ink4" or ((i + j > r * 0.6) and "ink2" or "ink3")
          if t > 0.7 and (x + y) % 2 == 0 then return end
          P.set(img, x, y, c)
        end)
      end
    end
    -- glowing ember inside the stack mouth
    P.set(img, sx, sy, (f % 2 == 0) and "fire4" or "fire3"); P.set(img, sx - 1, sy, "fire2")
  end
end

-------------------------------------------------------------------------------
-- builds
-------------------------------------------------------------------------------
local function one(key, w, h, fn) K.build(P.spec(key, w, h, { { tag = key .. "_idle", ms = 100, frames = { { grid = fn } } } })) end
local function anim(key, w, h, ms, fns)
  local frames = {}
  for i, fn in ipairs(fns) do frames[i] = { grid = fn } end
  K.build(P.spec(key, w, h, { { tag = key .. "_idle", ms = ms, frames = frames } }))
end

anim("prop_wreck_boxcar", 160, 64, 120, { boxcar(0), boxcar(1), boxcar(2), boxcar(3) })
anim("prop_wreck_engine", 128, 96, 140, { engine(0), engine(1), engine(2), engine(3) })
one("prop_wreck_bogie", 48, 24, wreckBogie)
one("prop_log_spill", 64, 24, logSpill)
one("prop_sign_thin_ice", 32, 40, signThinIce)
anim("prop_lab_sign", 64, 32, 400, { labSign(true), labSign(false) })
anim("prop_tesla_coil", 24, 64, 90, { tesla(0), tesla(1), tesla(2), tesla(3) })
anim("prop_ice_hole", 32, 16, 300, { iceHole(0), iceHole(1) })
