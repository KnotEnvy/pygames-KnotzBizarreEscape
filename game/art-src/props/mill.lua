-- Mission 2 Part III ("GATOR'S DEN") props: beached BAYOU QUEEN wreck, rusted cage pen, bone pile, crushed boats,
-- the Drowned Mill's chained gate, the broken waterwheel, claw-mark decal.
-- Build: bash tools/build-art.sh art-src/props/mill.lua
-- All props anchor bottom-centre (origin 0.5, 1); tags are prop_<kind>_<anim>. Manifest: art-src/props/manifest_m2a.json.
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local P = dofile(ROOT .. "/art-src/props/lib/pk.lua")(K)
local PC = app.pixelColor

P.FONT.L = { "x..", "x..", "x..", "x..", "xxx" }

local function H(x, y, s)
  local h = (math.floor(x) * 374761393 + math.floor(y) * 668265263 + math.floor(s or 0) * 1442695041) & 0xffffffff
  h = ((h ~ (h >> 13)) * 1274126177) & 0xffffffff
  h = h ~ (h >> 16)
  return h / 4294967296
end
local function noise1(t, s)
  local i = math.floor(t); local f = t - i
  local a, b = H(i, 7, s) * 2 - 1, H(i + 1, 7, s) * 2 - 1
  f = f * f * (3 - 2 * f)
  return a + (b - a) * f
end
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
local function strand(img, x, y, len, seed)
  local xx = x
  for k = 0, len - 1 do
    if k > 1 and H(x, k, seed) < 0.25 then xx = xx + ((H(x, k + 9, seed) < 0.5) and -1 or 1) end
    P.under(img, xx, y + k, (k == len - 1) and "olive2" or ((k % 3 == 2) and "leaf2" or "olive3"))
  end
end
local function mud(img, x0, x1, y, hgt, seed, opt)
  opt = opt or {}
  local w = x1 - x0
  for x = x0, x1 do
    local t = (x - x0) / math.max(1, w)
    local h = math.floor(hgt * math.sin(t * math.pi) ^ (opt.pow or 0.6) + 0.5 + ((H(x, 3, seed) < 0.25) and 1 or 0))
    for k = 0, h - 1 do
      local c = (k == h - 1) and ((t < 0.55) and "dirt3" or "dirt2") or ((k == 0) and "ink1" or "dirt2")
      if k > 0 and k < h - 1 and H(x, k, seed + 1) < 0.25 then c = "dirt1" end
      P.set(img, x, y - k, c)
    end
  end
end
-- even-odd polygon fill; fn(x, y) or colour
local function poly(img, pts, c)
  local ymin, ymax = math.huge, -math.huge
  for _, p in ipairs(pts) do ymin = math.min(ymin, p[2]); ymax = math.max(ymax, p[2]) end
  for y = math.floor(ymin), math.ceil(ymax) do
    local yc = y + 0.5
    local xs = {}
    for i = 1, #pts do
      local a, b = pts[i], pts[i % #pts + 1]
      if (a[2] <= yc and b[2] > yc) or (b[2] <= yc and a[2] > yc) then
        xs[#xs + 1] = a[1] + (yc - a[2]) / (b[2] - a[2]) * (b[1] - a[1])
      end
    end
    table.sort(xs)
    for i = 1, #xs - 1, 2 do
      for x = math.floor(xs[i] + 0.5), math.floor(xs[i + 1] - 0.5) do
        if type(c) == "function" then c(x, y) else P.set(img, x, y, c) end
      end
    end
  end
end
-- small flame tongue rising from (x, by) with height h; f = frame seed
local function tongue(img, x, by, h, f, seed)
  for k = 0, h - 1 do
    local t = k / math.max(1, h - 1)
    local hw = math.floor((1 - t) * (h / 4 + 0.6) + 0.5)
    local off = math.floor(noise1(k * 0.5 + f * 1.3, seed) * 1.4 * t + 0.5)
    for i = -hw, hw do
      local c = (math.abs(i) < hw * 0.5 and t < 0.6) and "fire5" or ((math.abs(i) < hw) and "fire4" or "fire3")
      if t > 0.75 then c = "fire3" end
      if k == 0 and math.abs(i) <= hw - 1 then c = "fire6" end
      P.set(img, x + i + off, by - k, c)
    end
  end
end
-- smoke puff (dark storm smoke, lit top-left)
local function puff(img, cx, cy, r, seed)
  for j = -r, r do for i = -r, r do
    local d = (i * i + j * j) / ((r + 0.4) ^ 2)
    if d <= 1 and H(cx + i, cy + j, seed) < 0.92 then
      local c = "ink2"
      if i + j < -r * 0.5 then c = "ink3" end
      if i + j > r * 0.7 then c = "ink1" end
      P.set(img, cx + i, cy + j, c)
    end
  end end
end

-------------------------------------------------------------------------------
-- prop_queen_wreck 208x120: beached BAYOU QUEEN sternwheeler, back broken, nose-down in the mud, burning
-------------------------------------------------------------------------------
local QW, QH = 208, 120
local BREAK = 100
local function shear(x) if x < BREAK then return -math.floor((BREAK - x) * 0.06) end return math.floor((x - BREAK) * 0.2) end
-- windows of the main deck and the promenade (level coordinates); fire = burning
local WIN_MAIN, WIN_PROM = {}, {}
for i = 0, 12 do WIN_MAIN[#WIN_MAIN + 1] = { x = 50 + i * 10, y = 62, fire = (i == 5 or i == 6 or i == 9 or i == 11) } end
for i = 0, 9 do WIN_PROM[#WIN_PROM + 1] = { x = 66 + i * 10, y = 44, fire = (i == 3 or i == 6 or i == 7) } end
local function queenLevel(f)
  local L = Image(QW, QH, ColorMode.RGB)
  -- paddlewheel (stern, left): red wheel, torn
  local wcx, wcy, wr = 24, 76, 21
  for y = wcy - wr - 2, wcy + wr + 2 do for x = wcx - wr - 2, wcx + wr + 2 do
    local dx, dy = x + 0.5 - wcx, y + 0.5 - wcy
    local r = math.sqrt(dx * dx + dy * dy)
    local a = math.atan(dy, dx)
    local deg = (math.deg(a) + 360) % 360
    local torn = deg > 280 and deg < 350            -- upper-right segment ripped away
    local lit = (dx + dy) < 0
    if r <= 3 then P.set(L, x, y, lit and "ink3" or "ink2")
    elseif r >= wr - 2 and r <= wr and not torn then P.set(L, x, y, lit and "red3" or "red2")
    elseif r < wr - 2 then
      -- spokes every 30 deg
      local s = (deg % 30); if s > 15 then s = 30 - s end
      if r * math.sin(math.rad(s)) < 1 and not (torn and r > 8) then P.set(L, x, y, lit and "red3" or "red1") end
    end
    -- buckets (radial boards outside the rim), many missing
    if r > wr and r <= wr + 3 then
      local s = (deg % 22.5); if s > 11.25 then s = 22.5 - s end
      local idx = math.floor((deg + 11.25) / 22.5) % 16
      if r * math.sin(math.rad(s)) < 1.2 and not torn and idx ~= 3 and idx ~= 8 and idx ~= 9 then P.set(L, x, y, lit and "red2" or "red1") end
    end
  end end
  -- dangling broken rim pieces in the torn gap
  P.line(L, 40, 61, 44, 70, "red2"); P.line(L, 41, 61, 45, 70, "red1"); P.line(L, 33, 57, 36, 65, "red2")
  -- wheel support beams to the hull
  P.line(L, 24, 76, 50, 70, "ink2"); P.line(L, 24, 77, 50, 71, "ink1")
  P.fill(L, 40, 66, 12, 3, "ink2"); P.hline(L, 40, 51, 66, "ink3")
  -- hull: x34..206, deck line y78, sheer rising to the bow
  local function deckY(x) if x < 170 then return 78 end return 78 - math.floor((x - 170) * 0.14) end
  local function bowX(y) return 206 - math.floor(math.max(0, y - 80) * 0.9) end
  for x = 34, 206 do
    for y = deckY(x), QH - 1 do
      if x <= bowX(y) then
        local d = y - deckY(x)
        local c
        if d <= 1 then c = (d == 0) and "ink4" or "ink3"
        elseif d <= 3 then c = (d == 2) and "red3" or "red2"        -- red rub-rail
        elseif d <= 12 then c = (d == 4) and "ink4" or "ink3"
        elseif d <= 14 then c = "red2"
        else c = "ink1" end
        if c == "ink3" and H(x, y, 3) < 0.05 then c = "ink2" end
        if c == "ink3" and y > 86 and H(x, y, 4) < 0.25 then c = "dirt2" end   -- mud splatter
        P.set(L, x, y, c)
      end
    end
  end
  -- Regime armour plates bolted on the hull (riveted steel), one with the spiral eye
  for _, pl in ipairs({ { 52, 82, 24 }, { 132, 82, 20 }, { 178, 80, 18 } }) do
    P.box(L, pl[1], pl[2], pl[3], 8, "steel", 2)
    for x = pl[1] + 2, pl[1] + pl[3] - 3, 5 do P.set(L, x, pl[2] + 1, "steel4"); P.set(L, x, pl[2] + 6, "steel4") end
    for x = pl[1], pl[1] + pl[3] - 1 do if H(x, 1, 5) < 0.2 then P.set(L, x, pl[2] + 7, "dirt2") end end
  end
  P.eye(L, "s", 59, 82, { o = "outline", w = "ink4", r = "red2", ws = "ink3" })
  -- blasted hole in the hull side with fire inside
  local hx, hy = 112, 86
  for j = -6, 6 do for i = -9, 9 do
    if (i * i) / 81 + (j * j) / 36 + (H(i, j, 7) - 0.5) * 0.5 <= 1 then P.set(L, hx + i, hy + j, "outline") end
  end end
  -- main-deck cabin y56..77
  for x = 44, 176 do for y = 56, 77 do
    local c = (y <= 57) and ((y == 56) and "red3" or "red2") or ((y >= 76) and "ink2" or "ink3")
    if y == 58 then c = "ink4" end
    P.set(L, x, y, c)
  end end
  for x = 44, 176, 10 do P.vline(L, x, 58, 76, "ink4"); P.vline(L, x + 1, 58, 76, "ink2") end   -- pillars
  for _, w in ipairs(WIN_MAIN) do
    P.fill(L, w.x + 3, w.y, 5, 10, "outline"); P.hline(L, w.x + 4, w.x + 6, w.y - 1, "outline")   -- arched
    P.hline(L, w.x + 3, w.x + 7, w.y + 10, "ink4")
  end
  -- promenade deck: railing + cabin y40..55
  for x = 58, 166 do for y = 40, 55 do
    local c = (y <= 41) and ((y == 40) and "red3" or "red2") or "ink3"
    if y == 42 then c = "ink4" end
    P.set(L, x, y, c)
  end end
  for x = 58, 166, 10 do P.vline(L, x, 42, 55, "ink4"); P.vline(L, x + 1, 42, 55, "ink2") end
  for _, w in ipairs(WIN_PROM) do P.fill(L, w.x + 3, w.y, 5, 8, "outline"); P.hline(L, w.x + 4, w.x + 6, w.y - 1, "outline") end
  -- deck overhangs (eaves) with railings above
  P.fill(L, 40, 54, 140, 2, "ink2"); P.hline(L, 40, 179, 54, "ink4")
  P.fill(L, 54, 38, 116, 2, "ink2"); P.hline(L, 54, 169, 38, "ink4")
  for x = 42, 178, 3 do P.vline(L, x, 50, 53, "ink4") end; P.hline(L, 42, 178, 50, "ink5")
  for x = 56, 168, 3 do P.vline(L, x, 34, 37, "ink4") end; P.hline(L, 56, 168, 34, "ink5")
  -- broken railing gaps
  P.fill(L, 92, 49, 9, 5, nil); P.fill(L, 140, 33, 7, 5, nil)
  -- pilothouse
  P.fill(L, 118, 22, 28, 16, "ink3"); P.hline(L, 118, 145, 22, "ink4"); P.vline(L, 145, 22, 37, "ink2")
  for x = 121, 141, 7 do P.fill(L, x, 25, 5, 6, "outline") end
  P.fill(L, 115, 18, 34, 4, "red2"); P.hline(L, 115, 148, 18, "red3"); P.hline(L, 115, 148, 21, "red1")
  P.fill(L, 128, 13, 8, 5, "ink3"); P.hline(L, 128, 135, 13, "ink4")   -- roof bell cupola
  -- smokestack A (standing, bent crown), stack B snapped with its top fallen over the bow
  for y = 6, 37 do P.set(L, 150, y, "ink3"); P.set(L, 151, y, "ink2"); P.set(L, 152, y, "ink2"); P.set(L, 153, y, "ink1"); P.set(L, 154, y, "ink1") end
  for x = 148, 156 do P.set(L, x, 5, (x % 2 == 0) and "ink3" or "ink2"); P.set(L, x, 6, "ink2") end
  for x = 147, 157, 2 do P.set(L, x, 4, "ink2") end
  P.hline(L, 150, 154, 24, "red2"); P.hline(L, 150, 154, 25, "red1")
  for y = 22, 37 do P.set(L, 160, y, "ink3"); P.set(L, 161, y, "ink2"); P.set(L, 162, y, "ink2"); P.set(L, 163, y, "ink1"); P.set(L, 164, y, "ink1") end
  P.set(L, 160, 21, "ink3"); P.set(L, 162, 20, "ink2"); P.set(L, 164, 21, "ink1")
  for k = 0, 30 do
    local x, y = 165 + k, 26 + math.floor(k * 1.0)
    for w = 0, 5 do P.set(L, x, y + w, (w == 0) and "ink3" or ((w >= 4) and "ink1" or "ink2")) end
    if k % 9 == 4 then for w = 0, 5 do P.set(L, x, y + w, (w < 2) and "ink3" or "ink1") end end
  end
  P.hline(L, 176, 181, 38 + 3, "red2"); P.hline(L, 177, 182, 39 + 3, "red1")
  -- the crown, crumpled, resting on the bow deck
  for j = 0, 8 do for i = 0, 4 do
    local c = (i == 0) and "ink3" or ((i == 4) and "ink1" or "ink2")
    if j % 2 == 0 and i == 4 then c = "ink2" end
    P.set(L, 195 + i + math.floor(j / 3), 52 + j, c)
  end end
  -- bow deck: capstan + Regime gun shield (torn)
  P.fill(L, 186, 70, 6, 5, "ink2"); P.hline(L, 186, 191, 70, "ink3")
  P.fill(L, 194, 64, 7, 8, "steel2"); P.hline(L, 194, 200, 64, "steel4"); P.vline(L, 200, 64, 71, "steel1")
  P.line(L, 197, 66, 205, 62, "ink1")
  -- cabin damage: wall chunks blown out at the break, crack through the decks
  for y = 35, QH - 1 do
    local w = 1 + math.floor(H(0, y, 9) * 2)
    for i = 0, w do P.set(L, BREAK - 1 + i + math.floor(noise1(y * 0.3, 2) * 2), y, (i == 0) and "ink1" or "outline") end
  end
  for j = -5, 5 do for i = -7, 7 do
    if (i * i) / 49 + (j * j) / 25 + (H(i, j, 8) - 0.5) * 0.6 <= 1 then P.set(L, 96 + i, 66 + j, "outline") end
  end end
  -- weathering: rust streaks under every armour bolt row and some soot over the burning windows
  for _, w in ipairs(WIN_MAIN) do if w.fire then for k = 1, 4 do P.over(L, w.x + 4 + (k % 2), w.y - 1 - k, "ink1") end end end
  for _, w in ipairs(WIN_PROM) do if w.fire then for k = 1, 3 do P.over(L, w.x + 5, w.y - 1 - k, "ink1") end end end
  return L
end
local function queenFire(img, f)
  -- fire glow in burning windows (level coords -> sheared)
  local function sh(x, y) return x, y + shear(x) end
  local function win(w, hgt)
    for j = 0, hgt - 1 do for i = 3, 7 do
      local x, y = sh(w.x + i, w.y + j)
      local c = (j >= hgt - 3) and "fire5" or ((j >= 2) and "fire4" or "fire3")
      if (i + j + f) % 5 == 0 then c = "fire3" end
      P.set(img, x, y, c)
    end end
    local tx, ty = sh(w.x + 5, w.y)
    tongue(img, tx, ty + 1, 5 + ((f + w.x) % 3), f, w.x)
  end
  for _, w in ipairs(WIN_MAIN) do if w.fire then win(w, 10) end end
  for _, w in ipairs(WIN_PROM) do if w.fire then win(w, 8) end end
  -- big fire in the hull breach and at the break
  local hx, hy = sh(112, 86)
  for j = -5, 5 do for i = -8, 8 do
    local d = (i * i) / 64 + (j * j) / 25 + (H(i, j, 7) - 0.5) * 0.5
    if d <= 0.95 then
      local c = (d < 0.3) and "fire5" or ((d < 0.6) and "fire4" or ((d < 0.8) and "fire3" or "fire2"))
      if (i + j * 3 + f * 5) % 11 == 0 then c = "fire2" end
      if j > 2 and d > 0.5 then c = "outline" end
      P.set(img, hx + i, hy + j, c)
    end
  end end
  for k = -3, 3 do tongue(img, hx + k * 3 + ((k % 2 == 0) and 0 or 1), hy - 2 - (3 - math.abs(k)), 5 + ((k + f) % 4) * 2 + (3 - math.abs(k)) * 2, f, 50 + k) end
  -- glow licking the hull plating around the breach
  for i = -12, 12 do for j = -9, 9 do
    local x, y = hx + i, hy + j
    if (i * i) / 144 + (j * j) / 81 <= 1 and H(x, y, 12) < 0.35 then
      local c = P.get(img, x, y); if c == "ink3" or c == "ink4" then P.set(img, x, y, "dirt4") elseif c == "red2" then P.set(img, x, y, "red4") end
    end
  end end
  local bx, by = sh(96, 66)
  for j = -3, 3 do for i = -5, 5 do if (i * i) / 25 + (j * j) / 9 <= 1 then P.set(img, bx + i, by + j, (j > 0) and "fire4" or "fire3") end end end
  for k = -1, 1 do tongue(img, bx + k * 4, by - 2, 9 + ((k + f) % 2) * 3, f, 60 + k) end
  -- smoke from stack A and the fires, drifting up-left in a loop
  local sx, sy = sh(152, 4)
  local function plume(x0, y0, dx, dy, n, r0, r1, seed)
    for i = n - 1, 0, -1 do
      local ph = (i + f / 4) / n
      local px = math.floor(x0 + dx * ph + math.sin(ph * 5 + seed) * 2 + 0.5)
      local py = math.floor(y0 + dy * ph + 0.5)
      local r = math.floor(r0 + (r1 - r0) * ph + 0.5)
      if py - r >= 0 then
        puff(img, px, py, r, seed + i)
        puff(img, px + r - 1, py + 1, math.max(1, r - 1), seed + i + 50)
      end
    end
  end
  plume(sx, sy - 2, -46, -12, 8, 2, 5, 1)
  plume(hx - 4, hy - 14, -30, -30, 6, 2, 4, 20)
  plume(bx - 2, by - 14, -22, -28, 5, 2, 4, 40)
  -- embers
  for i = 1, 10 do
    local ex = math.floor(90 + H(i, f, 3) * 90)
    local ey = math.floor(30 + H(i, f, 4) * 40)
    if P.alpha(img, ex, ey) == 0 then P.set(img, ex, ey, (i % 2 == 0) and "fire4" or "fire3") end
  end
end
local function queenMud(img)
  -- the lower 24 px: dark hull and mud blending into the ground; mud heaped against the buried bow
  for x = 0, QW - 1 do
    local top = 98 + math.floor(noise1(x * 0.12, 4) * 2.5)
    if x > 150 then top = top - math.floor((x - 150) * 0.16) end
    if x < 12 then top = top + (12 - x) // 3 end
    for y = top, QH - 1 do
      local c = (y == top) and ((H(x, 1, 6) < 0.5) and "dirt3" or "dirt2") or ((y < top + 3) and "dirt2" or ((y < top + 8) and "dirt1" or "outline"))
      if y > top and y < top + 6 and H(x, y, 7) < 0.15 then c = "ink1" end
      P.set(img, x, y, c)
    end
    if H(x, 2, 6) < 0.05 then P.set(img, x, top - 1, "dirt2") end
  end
  -- puddle glints
  for _, p in ipairs({ { 20, 106, 8 }, { 70, 110, 10 }, { 140, 108, 7 }, { 186, 112, 9 } }) do
    P.hline(img, p[1], p[1] + p[3], p[2], "steel1"); P.hline(img, p[1] + 2, p[1] + 4, p[2], "steel2")
  end
  -- dark hull bottom fading into the mud just above it
  for x = 34, 206 do
    for y = 92, 100 do
      local c = P.get(img, x, y)
      if c and c ~= "outline" and (y + x) % 2 == 0 and y > 94 then P.set(img, x, y, "ink1") end
    end
  end
  -- reeds on the bank
  for _, rx in ipairs({ 4, 7, 9, 196, 199, 203 }) do
    local hgt = 5 + math.floor(H(rx, 0, 5) * 6)
    local top = 98 + math.floor(noise1(rx * 0.12, 4) * 2.5)
    for k = 1, hgt do P.set(img, rx + ((k > hgt - 2) and 1 or 0), top - k, (k > hgt - 2) and "sand2" or "dirt3") end
  end
end
local function queen(f)
  return function(img)
    local L = queenLevel(f)
    for x = 0, QW - 1 do
      local s = shear(x)
      for y = 0, QH - 1 do
        local p = L:getPixel(x, y)
        if PC.rgbaA(p) > 0 and y + s >= 0 and y + s < QH then img:drawPixel(x, y + s, p) end
      end
    end
    P.selout(img, { color = "ink1" })
    queenFire(img, f)
    queenMud(img)
  end
end

-------------------------------------------------------------------------------
-- prop_cage 32x34: rusted cage pen with a bent door
-------------------------------------------------------------------------------
local BARS = { 3, 8, 13, 18, 23, 28 }
local function cageFrame(img, broken)
  -- base: a rotten plank pallet sunk in mud
  P.plankH(img, 1, 29, 30, 3, { ramp = "dirt", base = 2, seed = 71 })
  mud(img, 0, 31, 33, 3, 72, { pow = 0.3 })
  -- top frame + corner posts (rusty angle iron)
  P.fill(img, 1, 2, 30, 3, "steel3"); P.hline(img, 1, 30, 2, "steel4"); P.hline(img, 1, 30, 4, "steel1")
  for _, x in ipairs({ 1, 29 }) do P.fill(img, x, 2, 2, 28, "steel3"); P.vline(img, x, 2, 29, "steel4"); P.vline(img, x + 1, 5, 29, "steel2") end
  -- mid rail
  if not broken then P.hline(img, 3, 28, 16, "steel3"); P.hline(img, 3, 28, 17, "steel1") else
    P.hline(img, 3, 9, 16, "steel3"); P.hline(img, 3, 9, 17, "steel1"); P.hline(img, 23, 28, 16, "steel3"); P.hline(img, 23, 28, 17, "steel1")
  end
  for x = 1, 30 do
    if H(x, 1, 73) < 0.35 then P.set(img, x, 3, "dirt3") end
    if H(x, 2, 73) < 0.2 then P.set(img, x, 4, "red2") end
  end
  for y = 5, 28 do if H(1, y, 74) < 0.25 then P.set(img, 2, y, "dirt3") end; if H(29, y, 74) < 0.25 then P.set(img, 30, y, "dirt2") end end
  -- chain + hook at the top (hung from a crane)
  for y = 0, 1 do P.set(img, 15, y, "steel4"); P.set(img, 16, y, "steel2") end
  moss(img, 1, 30, 75, 0.35)
end
local function bar(img, x, y0, y1, bend)
  for y = y0, y1 do
    local bx = x + (bend and bend(y) or 0)
    P.set(img, bx, y, "steel4"); P.set(img, bx + 1, y, "steel2"); P.under(img, bx + 2, y, "outline")
    if H(x, y, 76) < 0.18 then P.set(img, bx + 1, y, "dirt3") end
  end
end
local function cageIntact(img)
  cageFrame(img, false)
  P.selout(img)
  for _, x in ipairs(BARS) do
    if x ~= 13 and x ~= 18 then bar(img, x, 5, 28) end
  end
  -- door (x11..21) slightly bent: hinge left, frame of flat bar, padlock right
  P.fill(img, 11, 6, 11, 2, "steel3"); P.hline(img, 11, 21, 6, "steel4"); P.hline(img, 11, 21, 8, "outline")
  P.fill(img, 11, 25, 11, 2, "steel3"); P.hline(img, 11, 21, 25, "steel4"); P.hline(img, 11, 21, 27, "outline")
  bar(img, 13, 9, 24, function(y) return (y > 13 and y < 20) and 1 or 0 end)
  bar(img, 18, 9, 24, function(y) return (y > 12 and y < 21) and -1 or 0 end)
  P.vline(img, 11, 6, 26, "steel4"); P.vline(img, 21, 6, 26, "steel2")
  P.set(img, 10, 9, "ink2"); P.set(img, 10, 22, "ink2")   -- hinges
  P.fill(img, 21, 15, 3, 4, "red3"); P.set(img, 21, 15, "red4"); P.set(img, 23, 18, "red1"); P.set(img, 22, 14, "steel4"); P.set(img, 22, 17, "outline")
  strand(img, 6, 5, 3, 1); strand(img, 25, 5, 5, 2)
end
local function cageBroken(img)
  cageFrame(img, true)
  -- top frame buckled in the middle
  P.set(img, 14, 4, "outline"); P.set(img, 15, 4, "outline"); P.set(img, 16, 5, "steel1")
  P.selout(img)
  for _, x in ipairs(BARS) do
    if x == 3 or x == 28 then bar(img, x, 5, 28) end
  end
  -- bars torn outward: bowed away from a ragged hole
  bar(img, 8, 5, 28, function(y) local t = (y - 5) / 23; return -math.floor(math.sin(t * math.pi) * 3 + 0.5) end)
  bar(img, 23, 5, 28, function(y) local t = (y - 5) / 23; return math.floor(math.sin(t * math.pi) * 3 + 0.5) end)
  -- snapped stubs with curled ends
  bar(img, 13, 5, 10, function(y) return -math.floor(math.max(0, y - 7) * 1.2) end)
  bar(img, 18, 5, 9, function(y) return math.floor(math.max(0, y - 6) * 1.2) end)
  bar(img, 13, 22, 28, function(y) return -math.floor(math.max(0, 25 - y) * 1.1) end)
  bar(img, 18, 24, 28, function(y) return math.floor(math.max(0, 26 - y) * 1.2) end)
  -- the door torn off, lying in the mud in front
  for k = 0, 11 do P.set(img, 9 + k, 31 - math.floor(k / 4), "steel4"); P.set(img, 9 + k, 32 - math.floor(k / 4), "steel1") end
  P.vline(img, 11, 27, 31, "steel3"); P.vline(img, 15, 27, 30, "steel3"); P.vline(img, 19, 26, 29, "steel3")
  -- claw scratches on the pallet
  P.line(img, 24, 29, 27, 31, "outline"); P.line(img, 26, 29, 29, 31, "outline")
  strand(img, 6, 5, 3, 1); strand(img, 26, 5, 6, 2)
end

-------------------------------------------------------------------------------
-- prop_bones 32x10: bone pile with a big gator skull, mossy
-------------------------------------------------------------------------------
local function boneCol(lit) return lit and "sand4" or "sand3" end
local function bones(img)
  -- mud bed
  for x = 1, 30 do P.set(img, x, 9, (H(x, 0, 81) < 0.5) and "dirt2" or "dirt1") end
  -- ribs: arcs sticking up on the left
  for i, rx in ipairs({ 3, 7, 11 }) do
    local hgt = 5 + (i % 2)
    for k = 0, hgt do
      local x = rx + math.floor(math.sin(k / hgt * math.pi * 0.9) * 2)
      P.set(img, x, 8 - k, (k > hgt - 2) and "sand5" or "sand4"); P.set(img, x + 1, 8 - k, "sand2")
    end
  end
  -- femur lying across
  P.line(img, 2, 8, 15, 6, "sand4"); P.line(img, 2, 9, 15, 7, "sand2")
  P.fill(img, 1, 7, 2, 2, "sand4"); P.set(img, 1, 7, "sand5"); P.fill(img, 15, 5, 2, 3, "sand4"); P.set(img, 16, 7, "sand2")
  -- vertebrae
  for _, v in ipairs({ { 9, 8 }, { 12, 8 } }) do P.fill(img, v[1], v[2], 2, 1, "sand3"); P.set(img, v[1], v[2], "sand4") end
  -- gator skull (snout right)
  P.ellipse(img, 19, 5, 4, 3, nil, function(x, y, i, j) P.set(img, x, y, (i + j < -1) and "sand5" or ((i + j < 2) and "sand4" or "sand3")) end)
  for x = 22, 30 do
    local t = (x - 22) / 8
    local top = 4 + math.floor(t * 1.5)
    for y = top, 6 do P.set(img, x, y, (y == top) and "sand5" or ((y == 6) and "sand2" or "sand4")) end
  end
  P.set(img, 30, 4, nil); P.set(img, 29, 5, "outline") -- nostril
  P.fill(img, 18, 4, 2, 1, "outline"); P.set(img, 18, 3, "sand2")  -- eye socket
  P.set(img, 21, 3, "sand2"); P.set(img, 16, 6, "sand2")
  -- lower jaw, slightly agape, and teeth
  for x = 17, 29 do P.set(img, x, 8, (x < 22) and "sand3" or "sand4") end
  P.hline(img, 17, 29, 9, "sand2")
  for x = 21, 29, 2 do P.set(img, x, 7, "ink6") end
  P.set(img, 18, 7, "outline"); P.set(img, 19, 7, "outline"); P.set(img, 20, 7, "outline"); P.set(img, 22, 7, "outline"); P.set(img, 24, 7, "outline")
  moss(img, 0, 31, 82, 0.35)
  P.selout(img)
  P.set(img, 26, 9, "leaf2"); P.set(img, 27, 9, "leaf3"); P.set(img, 5, 9, "leaf2")
end

-------------------------------------------------------------------------------
-- prop_boat_wreck 64x26: idle = bitten-off skiff bow stuck nose-up in the mud; b = capsized hull broken in two
-------------------------------------------------------------------------------
-- signed distance from point to the line a->b (positive below/right of the direction)
local function dline(x, y, a, b)
  local dx, dy = b[1] - a[1], b[2] - a[2]
  local l = math.sqrt(dx * dx + dy * dy)
  return ((x - a[1]) * dy - (y - a[2]) * dx) / l
end
local function wreckA(img)
  local g0, g1 = { 12, 15 }, { 55, 2 }      -- gunwale line (bitten end -> bow)
  local pts = { { 12, 15 }, { 55, 2 }, { 60, 4 }, { 59, 9 }, { 26, 26 }, { 22, 22 }, { 25, 20 }, { 20, 18 }, { 22, 16 }, { 16, 16 } }
  poly(img, pts, function(x, y)
    local d = -dline(x + 0.5, y + 0.5, g0, g1)
    local c
    if d < 1.2 then c = "dirt4" elseif d < 2.2 then c = "dirt2" elseif d < 3.2 then c = "steel4"
    elseif d < 6 then c = "steel3" elseif d < 9 then c = "steel2" else c = "steel1" end
    if (c == "steel3" or c == "steel2") and H(x, y, 91) < 0.1 then c = "dirt3" end
    if math.abs(d - 6.2) < 0.5 then c = "steel1" end
    P.set(img, x, y, c)
  end)
  -- bitten end: dark interior and splintered plank ends
  for _, p in ipairs({ { 16, 16 }, { 17, 16 }, { 21, 17 }, { 20, 18 }, { 21, 18 }, { 24, 20 }, { 23, 21 }, { 22, 22 }, { 23, 23 }, { 24, 24 } }) do P.set(img, p[1], p[2], "outline") end
  for _, s in ipairs({ { 13, 14, 10, 13 }, { 18, 17, 15, 18 }, { 21, 19, 18, 21 }, { 24, 22, 20, 23 } }) do P.line(img, s[1], s[2], s[3], s[4], "sand4") end
  P.set(img, 10, 13, "sand5"); P.set(img, 15, 19, "dirt4")
  -- bow eye + rope dangling
  P.set(img, 56, 5, "outline"); P.set(img, 57, 5, "ink3")
  for k = 1, 7 do P.set(img, 58 + ((k > 4) and 1 or 0), 5 + k, (k % 2 == 0) and "sand2" or "sand3") end
  -- tooth punctures along the hull
  for _, p in ipairs({ { 28, 12 }, { 33, 13 }, { 30, 18 } }) do P.set(img, p[1], p[2], "outline"); P.set(img, p[1] + 1, p[2] + 1, "steel4") end
  mud(img, 6, 44, 25, 4, 93, { pow = 0.8 })
  moss(img, 6, 44, 94, 0.5)
  P.selout(img)
  strand(img, 40, 9, 4, 3); strand(img, 47, 7, 3, 4)
end
local function wreckB(img)
  -- capsized hull (keel up), broken and sagging in the middle
  local function topY(x) -- hull bottom (now the top): a dome, sagging where it broke, bow (right) tapering lower
    local u = (x - 31) / 29
    local y = 9 + u * u * 9 + ((x > 34) and 1 or 0)
    if x > 50 then y = y + (x - 50) * 0.35 end
    return math.floor(y + 0.5)
  end
  for x = 3, 61 do
    local t0 = topY(x)
    local bot = 24

    if not (x >= 30 and x <= 34) then
      for y = t0, bot do
        local d = y - t0
        local c
        if d == 0 then c = "dirt4" elseif d <= 2 then c = "dirt3" elseif d == 3 then c = "dirt2"   -- tarred bottom
        elseif d <= 7 then c = "ink4" elseif d <= 10 then c = "ink3" else c = "ink2" end
        if c == "ink4" and H(x, y, 95) < 0.12 then c = "ink3" end
        if c == "dirt3" and H(x, y, 96) < 0.15 then c = "olive3" end   -- weed growth
        P.set(img, x, y, c)
      end
    end
  end
  -- keel strip
  for x = 12, 52 do if not (x >= 29 and x <= 35) then P.set(img, x, topY(x) - 1, "dirt3") end end
  -- broken middle: splintered plank ends sticking out
  for _, s in ipairs({ { 29, 13, 31, 9 }, { 29, 17, 32, 15 }, { 35, 14, 33, 10 }, { 35, 19, 32, 18 }, { 29, 21, 31, 22 } }) do P.line(img, s[1], s[2], s[3], s[4], "sand4") end
  P.vline(img, 29, 13, 24, "outline"); P.vline(img, 35, 14, 24, "outline")
  -- a jagged bite hole in the right half
  for j = -3, 3 do for i = -4, 4 do if (i * i) / 16 + (j * j) / 9 + (H(i, j, 97) - 0.5) * 0.5 <= 1 then P.set(img, 46 + i, 17 + j, "outline") end end end
  P.set(img, 42, 15, "ink5"); P.set(img, 50, 19, "ink5")
  -- gunwale line just above the mud + red-brown stripe
  for x = 6, 59 do if P.solid(img, x, 20) and not (x >= 29 and x <= 35) then P.set(img, x, 20, "dirt2") end end
  -- broken oar sticking out
  P.line(img, 38, 22, 44, 6, "dirt4"); P.line(img, 39, 22, 45, 6, "dirt2"); P.fill(img, 44, 2, 3, 5, "dirt3"); P.set(img, 44, 2, "dirt5")
  mud(img, 2, 62, 25, 4, 98, { pow = 0.4 })
  moss(img, 4, 61, 99, 0.45)
  P.selout(img)
  strand(img, 12, 21, 2, 5); strand(img, 54, 21, 3, 6)
end

-------------------------------------------------------------------------------
-- prop_mill_gate 64x80: the Drowned Mill's double doors, chained with a Regime padlock
-------------------------------------------------------------------------------
local LEAF_W, LEAF_H, LEAF_Y = 24, 72, 8
local function leafImg(side)
  local d = Image(LEAF_W, LEAF_H, ColorMode.RGB)
  local x = 0
  for i, w in ipairs({ 5, 5, 4, 5, 5 }) do
    P.plankV(d, x, 0, w, LEAF_H, { ramp = "dirt", base = (i % 2 == 0) and 2 or 3, seed = side * 10 + i, ends = false })
    x = x + w
  end
  for _, gx in ipairs({ 4, 9, 13, 18 }) do for y = 0, LEAF_H - 1 do if H(gx, y, side) < 0.85 then P.set(d, gx, y, "dirt1") end end end
  -- grey bleaching high up, slimy algae low down
  for y = 0, LEAF_H - 1 do for xx = 0, LEAF_W - 1 do
    local c = P.get(d, xx, y)
    if y < 20 and c == "dirt3" and H(xx, y, 5 + side) < 0.2 then P.set(d, xx, y, "ink3") end
    if y > 58 and H(xx, y, 6 + side) < (y - 58) / 16 then P.set(d, xx, y, (c == "dirt3") and "olive2" or "leaf1") end
  end end
  -- iron straps with rivets
  for _, sy in ipairs({ 8, 34, 60 }) do
    P.fill(d, 0, sy, LEAF_W, 3, "steel2"); P.hline(d, 0, LEAF_W - 1, sy, "steel3"); P.hline(d, 0, LEAF_W - 1, sy + 2, "steel1")
    for xx = 2, LEAF_W - 2, 5 do P.set(d, xx, sy + 1, "steel4") end
    for xx = 0, LEAF_W - 1 do if H(xx, sy, 9) < 0.25 then P.set(d, xx, sy + 2, "dirt3") end end
  end
  -- diagonal brace
  for k = 0, 22 do
    local xx = (side == 1) and (1 + math.floor(k * 21 / 22)) or (22 - math.floor(k * 21 / 22))
    local yy = 57 - k
    P.set(d, xx, yy, "dirt4"); P.set(d, xx, yy + 1, "dirt3"); P.set(d, xx, yy + 2, "dirt1")
  end
  -- claw gouges on the left leaf, a bite dent on the right
  if side == 1 then
    for c = 0, 2 do for k = 0, 9 do P.set(d, 6 + c * 4 + math.floor(k * 0.5), 40 + k, "outline"); P.set(d, 7 + c * 4 + math.floor(k * 0.5), 40 + k, "sand3") end end
  else
    for _, p in ipairs({ { 6, 22 }, { 9, 24 }, { 12, 25 }, { 15, 24 }, { 18, 22 } }) do P.set(d, p[1], p[2], "outline"); P.set(d, p[1], p[2] + 1, "dirt4") end
  end
  return d
end
local LEAVES = { leafImg(1), leafImg(2) }
local function gateFrame(img)
  -- heavy timber posts and lintel
  for _, px in ipairs({ 0, 56 }) do
    P.plankV(img, px, 4, 8, 76, { ramp = "ink", base = 2, seed = px + 1 })
    P.vline(img, px + 1, 4, 79, "ink3")
    for _, by in ipairs({ 14, 40, 66 }) do P.fill(img, px + 1, by, 6, 3, "steel2"); P.hline(img, px + 1, px + 6, by, "steel3"); P.rivet(img, px + 3, by + 1) end
  end
  P.plankH(img, 0, 0, 64, 8, { ramp = "ink", base = 3, seed = 3 })
  P.hline(img, 0, 63, 7, "ink1")
  -- faded painted MILL board on the lintel
  P.fill(img, 22, 1, 20, 6, "dirt2"); P.hline(img, 22, 41, 1, "dirt3"); P.hline(img, 22, 41, 6, "dirt1")
  P.text(img, "MILL", 25, 1, "sand4", { shadow = "dirt1" })
  P.set(img, 30, 3, "dirt2"); P.set(img, 36, 2, "dirt2")
end
local function gateInterior(img)
  P.fill(img, 8, 8, 48, 72, "outline")
  for x = 12, 52, 8 do P.vline(img, x, 10, 70, "ink1") end
  P.hline(img, 8, 55, 76, "ink1"); P.hline(img, 8, 55, 78, "dirt1")
  -- the den's green gas glow deep inside + a red work lamp
  for _, p in ipairs({ { 30, 60 }, { 34, 62 }, { 26, 64 }, { 38, 66 }, { 32, 66 } }) do P.set(img, p[1], p[2], "weird1") end
  P.set(img, 31, 64, "weird4"); P.set(img, 44, 30, "red2"); P.set(img, 45, 30, "red1")
end
local function chain(img, x0, y0, x1, y1, sag, from, to)
  local n = 26
  for i = from or 0, to or n do
    local t = i / n
    local x = math.floor(x0 + (x1 - x0) * t + 0.5)
    local y = math.floor(y0 + (y1 - y0) * t + sag * math.sin(t * math.pi) + 0.5)
    if i % 2 == 0 then P.set(img, x, y, "steel4"); P.set(img, x + 1, y, "steel3"); P.set(img, x, y + 1, "steel2"); P.set(img, x + 1, y + 1, "steel1")
    else P.set(img, x, y, "steel3"); P.set(img, x, y + 1, "steel1") end
  end
end
local function padlock(img, x, y)
  P.set(img, x + 1, y, "steel4"); P.set(img, x + 2, y - 1, "steel4"); P.set(img, x + 3, y - 1, "steel4"); P.set(img, x + 4, y, "steel2")
  P.set(img, x + 1, y + 1, "steel4"); P.set(img, x + 4, y + 1, "steel2")
  P.box(img, x, y + 2, 6, 6, "red", 3, { spec = true })
  P.set(img, x + 2, y + 4, "outline"); P.set(img, x + 3, y + 4, "outline"); P.set(img, x + 3, y + 5, "outline")
  P.hline(img, x, x + 5, y + 8, "outline")
end
local function placeLeaf(img, side, wd, dxo, grow, darken)
  local leaf = LEAVES[side]
  for x = 0, wd - 1 do
    local sx = (side == 1) and math.floor(x * LEAF_W / wd) or (LEAF_W - 1 - math.floor((wd - 1 - x) * LEAF_W / wd))
    local fx = (side == 1) and x or (wd - 1 - x)     -- distance from the hinge
    local g = math.floor(grow * fx / math.max(1, wd - 1) + 0.5)
    for y = -g, LEAF_H - 1 + math.min(g, 0) do
      local sy = math.max(0, math.min(LEAF_H - 1, y))
      local p = leaf:getPixel(sx, sy)
      if PC.rgbaA(p) > 0 then
        local c = P.NAME[p]
        if darken and c then c = P.shift(c, -darken) end
        local X = (side == 1) and (8 + x + dxo) or (56 - wd + x + dxo)
        P.set(img, X, LEAF_Y + y, c)
      end
    end
  end
end
local function splinters(img, list) for _, s in ipairs(list) do P.set(img, s[1], s[2], s[3] or "dirt4"); if s[4] then P.set(img, s[1] + s[4], s[2] + 1, "dirt2") end end end
local function gateClosed(shake)
  return function(img)
    gateFrame(img)
    gateInterior(img)
    local o = ({ [0] = 0, 1, 0, -1, 0 })[shake]
    placeLeaf(img, 1, 24, (shake > 0) and ((shake % 2 == 1) and -1 or 0) or 0, 0)
    placeLeaf(img, 2, 24, (shake > 0) and ((shake % 2 == 1) and 1 or 0) or 0, 0)
    P.vline(img, 31, 8, 79, "dirt1")
    moss(img, 0, 63, 140, 0.7)
    P.selout(img)
    -- chain (jiggles while shaking) + padlock
    local cy = 36 + ((shake == 1 or shake == 3) and -1 or 0)
    chain(img, 10, cy, 53, cy, 8 + o)
    P.set(img, 9, cy, "steel2"); P.set(img, 54, cy, "steel2")
    padlock(img, 29, cy + 8 + o)
    for _, s in ipairs({ { 4, 7 }, { 14, 5 }, { 47, 6 }, { 60, 4 } }) do strand(img, s[1], 8, s[2], s[1]) end
    if shake > 0 then
      -- dust and splinters shaken loose from the lintel / seam
      local d = {
        { { 20, 10, "ink3" }, { 41, 12, "ink3" }, { 31, 30, "dirt4" }, { 33, 52, "dirt4" } },
        { { 22, 14, "ink3" }, { 39, 16, "ink2" }, { 30, 24, "dirt4", 1 }, { 34, 60, "dirt5" } },
        { { 18, 18, "ink3" }, { 43, 20, "ink3" }, { 32, 18, "dirt5" }, { 30, 44, "dirt4", 1 } },
        { { 24, 22, "ink2" }, { 37, 24, "ink3" }, { 33, 28, "dirt4" }, { 31, 66, "dirt4" } },
      }
      splinters(img, d[shake])
    end
  end
end
-- smashed: blown outward toward the camera on their outer hinges
local SMASH = {
  { wd = 24, grow = 0, flash = 3, chainBroken = true },
  { wd = 15, grow = 3, flash = 2, darken = 0 },
  { wd = 10, grow = 4, flash = 1, darken = 1 },
  { wd = 7, grow = 4, flash = 0, darken = 1 },
  { wd = 6, grow = 4, flash = 0, darken = 1 },
  { wd = 6, grow = 3, flash = 0, darken = 1, final = true },
}
local DEBRIS = { -- {x0, y0, vx, vy} flying splinters, integrated per frame
  { 30, 30, -3, -2 }, { 33, 34, 3, -2 }, { 31, 44, -4, 0 }, { 32, 40, 4, -1 }, { 30, 56, -3, 1 }, { 34, 50, 3, 1 },
  { 31, 24, -1, -3 }, { 33, 26, 2, -3 }, { 32, 62, -2, 2 }, { 31, 36, 1, -1 },
}
local function gateSmashed(i)
  local s = SMASH[i]
  return function(img)
    gateFrame(img)
    gateInterior(img)
    if s.final then
      -- left leaf hangs off its top hinge, skewed; right leaf half torn away
      placeLeaf(img, 1, 6, 0, 3, 1)
      for y = 50, 79 do for x = 8, 13 do if (y - 50) / 3 > (x - 8) then P.set(img, x, y, nil) end end end
      placeLeaf(img, 2, 6, 0, 3, 1)
      for y = 30, 79 do for x = 50, 55 do if H(x, y, 3) < 0.15 + (y - 30) / 40 then P.set(img, x, y, nil) end end end
    else
      placeLeaf(img, 1, s.wd, 0, s.grow, s.darken)
      placeLeaf(img, 2, s.wd, 0, s.grow, s.darken)
      if i == 1 then
        -- doors bulge: the seam splits with a blast
        for y = 20, 70 do P.set(img, 31 + math.floor(math.sin(y * 0.4) + 0.5), y, "outline") end
      end
    end
    moss(img, 0, 63, 140, 0.7)
    P.selout(img)
    for _, st in ipairs({ { 4, 7 }, { 14, 5 }, { 47, 6 }, { 60, 4 } }) do strand(img, st[1], 8, st[2], st[1]) end
    -- broken chain ends hanging from the brackets
    chain(img, 10, 36, 18, 48, 0, 0, 10); chain(img, 53, 36, 46, 46, 0, 0, 9)
    P.set(img, 9, 36, "steel2"); P.set(img, 54, 36, "steel2")
    -- blast flash in the seam
    if s.flash > 0 then
      local r = ({ 4, 7, 9 })[s.flash]
      for j = -r * 2, r * 2 do for k = -r, r do
        local d = (k * k) / (r * r) + (j * j) / ((r * 2) ^ 2)
        if d <= 1 and H(k, j, i) < 0.9 then
          P.set(img, 32 + k, 44 + j, (d < 0.3) and "white" or ((d < 0.6) and "fire6" or ((d < 0.85) and "fire5" or "fire4")))
        end
      end end
    end
    if i >= 2 and i <= 4 then -- smoke billowing out of the opening
      for q = 0, 3 do puff(img, 26 + q * 4, 40 + ((q % 2 == 0) and -4 or 4) - i * 2, 3 + i - 1, q + i * 5) end
    end
    -- flying splinters / falling debris
    if i <= 5 then
      local t = i
      for di, d in ipairs(DEBRIS) do
        local x = math.floor(d[1] + d[3] * t * 1.6 + 0.5)
        local y = math.floor(d[2] + d[4] * t * 1.6 + 0.6 * t * t + 0.5)
        if y < 79 then
          P.set(img, x, y, (di % 3 == 0) and "dirt5" or "dirt4"); P.set(img, x + ((d[3] > 0) and 1 or -1), y, "dirt3")
          if di % 2 == 0 then P.set(img, x, y + 1, "dirt2") end
        end
      end
      -- chain links flung away
      if i <= 3 then P.set(img, 22 - i * 3, 40 - i, "steel4"); P.set(img, 42 + i * 3, 41 - i, "steel4"); P.set(img, 32, 52 + i * 4, "red3") end
    end
    -- splinter pile at the threshold (grows as debris lands)
    if i >= 3 then
      local n = math.min(14, (i - 2) * 5)
      for q = 1, n do
        local x = 12 + math.floor(H(q, 0, 77) * 40)
        P.set(img, x, 79, (q % 2 == 0) and "dirt4" or "dirt3"); if q % 3 == 0 then P.set(img, x + 1, 78, "dirt5") end
      end
      if i >= 5 then P.fill(img, 29, 76, 6, 4, "red2"); P.set(img, 29, 76, "red3"); P.hline(img, 29, 34, 79, "outline") end
    end
  end
end

-------------------------------------------------------------------------------
-- prop_waterwheel 112x112: huge broken wooden mill wheel, turning clockwise; water sheets off the rising paddles
-- 12 paddles (30 deg) + 8 spokes; damage repeats every 90 deg so the 8-frame, 11.25 deg/frame loop is seamless
-------------------------------------------------------------------------------
local WC = 56
local function wheel(f)
  return function(img)
    local rot = math.rad(f * 11.25)
    local paddleTips = {}
    for y = 0, 111 do for x = 0, 111 do
      local dx, dy = x + 0.5 - WC, y + 0.5 - WC
      local r = math.sqrt(dx * dx + dy * dy)
      local a = math.atan(dy, dx) - rot
      local c
      local nx, ny = dx / math.max(r, 0.01), dy / math.max(r, 0.01)
      local litN = -(nx + ny) * 0.7071      -- facing the top-left light
      -- paddles: radial boards, r 40..55
      if r >= 39 and r <= 55.5 then
        local k = math.floor(a / math.rad(30) + 0.5)
        local diff = a - k * math.rad(30)
        local perp = r * math.sin(diff)
        local kind = k % 3              -- 0,1 = whole, 2 = missing (bracket stub only)
        local rmax = (kind == 2) and 43 or 55.5
        if kind == 1 then rmax = 55.5 - ((perp > 1) and 2 or 0) end   -- splintered corner
        if math.abs(perp) <= 3.1 and r <= rmax then
          local pa = math.rad(30) * k + rot
          local lx, ly = -math.sin(pa), math.cos(pa)
          local side = perp * (lx * -1 + ly * -1)   -- >0: this half faces the light
          c = (math.abs(perp) > 2.1) and ((side > 0) and "dirt4" or "dirt1") or ((math.abs(perp) > 1.1) and ((side > 0) and "dirt3" or "dirt2") or "dirt3")
          if math.abs(perp) < 0.5 and r > 47 and r < rmax - 2 then c = "dirt2" end   -- plank seam
          if r > rmax - 1.2 then c = (side > 0) and "dirt5" or "dirt3" end
          if r < 43 and kind == 2 then c = "steel2" end
        end
      end
      if not c and r >= 52.5 and r <= 54.6 then
        local seg = math.floor(a / math.rad(30)) % 3
        if seg == 0 then c = (r > 53.6) and ((litN > 0.1) and "dirt4" or "dirt2") or "dirt3" end
      end
      -- outer shroud rim r 40.5..46, plank joints every 30 deg (offset 15)
      if not c and r >= 38.5 and r <= 47.5 then
        c = (r > 46.4) and ((litN > 0.1) and "dirt4" or "dirt2") or ((r < 39.6) and "dirt1" or ((r > 43 and r < 44) and "dirt2" or "dirt3"))
        local j = (a - math.rad(15)) / math.rad(30); j = j - math.floor(j)
        if j < 0.035 or j > 0.965 then c = "dirt1" end
        if c == "dirt3" and H(math.floor((a % (math.pi / 2)) * 40), math.floor(r), 31) < 0.12 then c = "dirt2" end
      end
      -- inner ring r 29..31.5
      if not c and r >= 28 and r <= 31.5 then c = (r > 30.6) and ((litN > 0) and "dirt4" or "dirt2") or "dirt3" end
      -- spokes: 8 at 45 deg (offset 22.5); every second one snapped
      if not c and r >= 7 and r <= 41 then
        local k = math.floor((a - math.rad(22.5)) / math.rad(45) + 0.5)
        local diff = a - math.rad(22.5) - k * math.rad(45)
        local perp = r * math.sin(diff)
        local snapped = (k % 2 == 1) and (r > 11 + (perp > 0 and 2 or 0) and r < 26 - (perp > 0 and 2 or 0))
        if math.abs(perp) <= 2.2 and not snapped then
          c = (perp < -1.1) and "dirt4" or ((perp > 1.1) and "dirt2" or "dirt3")
        end
      end
      -- hub: iron cap with bolts over a wooden block
      if r < 10 then
        c = (r < 4.5) and ((litN > 0.2) and "steel4" or ((litN < -0.3) and "steel2" or "steel3")) or ((litN > 0) and "dirt3" or "dirt2")
        if r < 1.5 then c = "steel1" end
      end
      if c then P.set(img, x, y, c) end
    end end
    -- hub bolts (rotate with the wheel)
    for q = 0, 3 do
      local ang = rot + q * math.pi / 2 + math.pi / 4
      P.set(img, math.floor(WC + math.cos(ang) * 6.5), math.floor(WC + math.sin(ang) * 6.5), "steel4")
    end
    -- iron brackets where paddles meet the rim
    for k = 0, 11 do
      local ang = rot + k * math.rad(30)
      P.set(img, math.floor(WC + math.cos(ang) * 44), math.floor(WC + math.sin(ang) * 44), "steel3")
      paddleTips[#paddleTips + 1] = { k = k, ang = ang, x = WC + math.cos(ang) * 53, y = WC + math.sin(ang) * 53 }
    end
    P.selout(img, { color = "dirt1", flat = true })
    -- weed hanging from paddle tips (gravity, so straight down)
    for _, t in ipairs(paddleTips) do
      if t.k % 3 == 0 then
        local len = 3 + math.floor(H(t.k % 3, 0, 5) * 4)
        for q = 1, len do P.under(img, math.floor(t.x), math.floor(t.y) + q, (q % 2 == 0) and "leaf2" or "leaf3") end
      end
    end
    -- water sheeting off the paddles climbing out on the left (angles 95..200 deg screen)
    for _, t in ipairs(paddleTips) do
      local deg = (math.deg(t.ang) % 360)
      if deg > 95 and deg < 205 and t.k % 3 ~= 2 then
        local x0 = math.floor(t.x)
        for s = 0, 4 do
          local sx = x0 + s - 2
          local top = math.floor(t.y) + 1 + math.abs(s - 2)
          local len = math.min(111 - top, 16 + math.floor(H(t.k % 3, s, 9) * 22))
          for q = 0, len - 1 do
            local ph = (q - f * 3 + s * 2) % 7
            local c = (ph == 0) and "ink4" or ((ph <= 2 and s == 2) and "steel4" or ((s == 0 or s == 4) and "steel3" or "sky3"))
            if not (q > len - 4 and (q + s + f) % 2 == 0) then P.under(img, sx + ((q > 8 and (q + f) % 5 == 0) and 1 or 0), top + q, c) end
          end
        end
      end
    end
    -- drips falling from every paddle tip in the lower half
    for _, t in ipairs(paddleTips) do
      local deg = (math.deg(t.ang) % 360)
      if deg > 20 and deg < 95 and t.k % 3 ~= 2 then
        for q = 0, 2 do P.under(img, math.floor(t.x) + q - 1, math.floor(t.y) + 3 + ((q + f) % 3) * 3, (q == 1) and "ink4" or "sky3") end
      end
    end
    -- foam where the wheel churns the water (bottom)
    for q = 0, 27 do
      local fx = 30 + math.floor(H(q, f, 61) * 52)
      local fy = 102 + math.floor(H(q, f, 62) * 9)
      P.under(img, fx, fy, (q % 3 == 0) and "ink5" or "ink4")
      if q % 2 == 0 then P.under(img, fx + 1, fy, "steel4") end
    end
  end
end

-------------------------------------------------------------------------------
-- prop_claw_marks 32x24: three deep claw gouges (decal, mostly transparent)
-------------------------------------------------------------------------------
local function claws(img)
  for c = 0, 2 do
    local x0, y0 = 18 + c * 6, 1 + c
    local x1, y1 = 4 + c * 6, 21 + c % 2
    local n = 30
    for i = 0, n do
      local t = i / n
      local x, y = x0 + (x1 - x0) * t, y0 + (y1 - y0) * t
      local w = math.sin(t * math.pi) ^ 0.6 * (c == 1 and 1.6 or 1.3)
      local cx, cy = math.floor(x + 0.5), math.floor(y + 0.5)
      for k = -math.floor(w + 0.5), math.floor(w + 0.5) do
        local px = cx + k
        local col = "outline"
        if k == -math.floor(w + 0.5) then col = "dirt1" end            -- upper-left wall in shadow
        if k == math.floor(w + 0.5) and w > 0.6 then col = "sand2" end  -- far wall catching the light
        if w < 0.7 then col = "ink1" end
        P.set(img, px, cy, col)
      end
      if w > 0.8 then P.set(img, cx + math.floor(w + 0.5) + 1, cy, "sand4") end  -- pale lip of fresh splinter
    end
    -- splinters flicked out at the end of each gouge
    P.set(img, x1 - 1, y1 + 1, "sand3"); P.set(img, x1 - 2, y1, "sand4")
  end
end

-------------------------------------------------------------------------------
-- builds
-------------------------------------------------------------------------------
local function frames(fns) local t = {}; for i, fn in ipairs(fns) do t[i] = { grid = fn } end; return t end
K.build(P.spec("prop_queen_wreck", QW, QH, {
  { tag = "prop_queen_wreck_idle", ms = 120, frames = frames({ queen(0), queen(1), queen(2), queen(3) }) },
}))
K.build(P.spec("prop_cage", 32, 34, {
  { tag = "prop_cage_intact", ms = 100, frames = frames({ cageIntact }) },
  { tag = "prop_cage_broken", ms = 100, frames = frames({ cageBroken }) },
}))
K.build(P.spec("prop_bones", 32, 10, { { tag = "prop_bones_idle", ms = 100, frames = frames({ bones }) } }))
K.build(P.spec("prop_boat_wreck", 64, 26, {
  { tag = "prop_boat_wreck_idle", ms = 100, frames = frames({ wreckA }) },
  { tag = "prop_boat_wreck_b", ms = 100, frames = frames({ wreckB }) },
}))
K.build(P.spec("prop_mill_gate", 64, 80, {
  { tag = "prop_mill_gate_closed", ms = 100, frames = frames({ gateClosed(0) }) },
  { tag = "prop_mill_gate_shake", ms = 60, frames = frames({ gateClosed(1), gateClosed(2), gateClosed(3), gateClosed(4) }) },
  { tag = "prop_mill_gate_smashed", ms = 60, frames = frames({ gateSmashed(1), gateSmashed(2), gateSmashed(3), gateSmashed(4), gateSmashed(5), gateSmashed(6) }) },
}))
local wf = {}; for i = 0, 7 do wf[#wf + 1] = wheel(i) end
K.build(P.spec("prop_waterwheel", 112, 112, { { tag = "prop_waterwheel_spin", ms = 120, frames = frames(wf) } }))
K.build(P.spec("prop_claw_marks", 32, 24, { { tag = "prop_claw_marks_idle", ms = 100, frames = frames({ claws }) } }))
