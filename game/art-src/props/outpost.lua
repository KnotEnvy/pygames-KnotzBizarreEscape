-- Bizarre Regime outpost props: boss gate, alarm beacon, searchlight (+ beam), flag, banner, bunker door.
-- Build: bash tools/build-art.sh art-src/props/outpost.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local P = dofile(ROOT .. "/art-src/props/lib/pk.lua")(K)

-- concrete block surface: base ink3, lit ink4, shadow ink2; seams + chips
local function concrete(img, x, y, w, h, seed, opt)
  opt = opt or {}
  local rnd = P.rng(seed)
  P.fill(img, x, y, w, h, "ink3")
  P.vline(img, x, y, y + h - 1, "ink4"); P.vline(img, x + 1, y, y + h - 1, "ink4")
  P.vline(img, x + w - 1, y, y + h - 1, "ink2"); P.vline(img, x + w - 2, y, y + h - 1, "ink2")
  P.hline(img, x, x + w - 1, y, "ink5")
  if opt.seams then
    for sy = y + opt.seams, y + h - 2, opt.seams do
      P.hline(img, x, x + w - 1, sy, "ink2"); P.hline(img, x + 1, x + w - 2, sy + 1, "ink4")
    end
  end
  for _ = 1, math.floor(w * h / 40) do
    local cx, cy = x + rnd(2, w - 3), y + rnd(2, h - 3)
    P.set(img, cx, cy, "ink2"); P.set(img, cx + 1, cy + 1, "ink4")
  end
  -- a crack
  if opt.crack then
    local cx, cy = x + rnd(3, w - 4), y + rnd(4, h - 8)
    for i = 0, 5 do P.set(img, cx + ((i % 3 == 1) and 1 or 0), cy + i, "ink1") end
  end
end

-------------------------------------------------------------------------------
-- prop_gate 96x96: concrete posts (outer 12px each side), steel lintel, steel+timber double door
-------------------------------------------------------------------------------
local function emblem(img, cx, cy)
  -- dark riveted disc plate split by the door seam, with the spiral eye
  P.disc(img, cx, cy, 15, nil, function(x, y, i, j)
    local r2 = i * i + j * j
    local c = (r2 > 14 * 14 - 4) and ((i + j < 0) and "steel4" or "steel1") or "ink1"
    if r2 <= 14 * 14 - 4 and r2 > 12 * 12 + 4 then c = "steel2" end
    P.set(img, x, y, c)
  end)
  for a = 0, 330, 30 do
    local r = math.rad(a)
    P.rivet(img, math.floor(cx + math.cos(r) * 13 + 0.5), math.floor(cy + math.sin(r) * 13 + 0.5))
  end
  P.bigEye(img, cx, cy, 11, 7, 6, { pitch = 3.0 })
end
-- one door leaf (left: side=-1 hinge on the left; right: side=1). x0..x1 inclusive. dy shifts it down,
-- bend pushes the inner edge toward the viewer (drawn as an offset + lit edge)
local function leaf(img, x0, x1, side, dy, bend)
  dy = dy or 0; bend = bend or 0
  local w = x1 - x0 + 1
  for x = x0, x1 do
    local inner = (side < 0) and (x1 - x) or (x - x0)  -- distance from the seam
    local yo = dy + ((inner < 6) and bend or 0)
    for y = 16, 95 do
      local yy = y - yo
      local c
      -- vertical timber planks (6 px), lit left edge, dark right seam
      local pi = (x - x0) % 6
      c = (pi == 0) and "dirt4" or (pi == 5) and "dirt1" or ((pi == 4) and "dirt2" or "dirt3")
      if (x * 7 + math.floor(yy / 9) * 3) % 13 == 0 and pi > 0 and pi < 4 then c = "dirt2" end
      -- steel bands
      for _, by in ipairs({ 20, 52, 80 }) do
        if yy >= by and yy <= by + 4 then
          c = (yy == by) and "steel5" or (yy == by + 4) and "steel1" or (yy == by + 3) and "steel2" or "steel3"
          if (x - x0) % 6 == 2 and yy == by + 2 then c = "steel5" end
          if (x - x0) % 6 == 3 and yy == by + 2 then c = "steel1" end
        end
      end
      -- hazard kick plate
      if yy >= 87 then
        local k = (x + yy) % 8
        c = (k < 4) and ((yy == 87) and "fire5" or "fire4") or "outline"
        if yy == 87 and k >= 4 then c = "ink1" end
      end
      -- steel edge frame
      if x == x0 then c = (yy < 87) and "steel4" or c end
      if x == x1 then c = "steel1" end
      if inner == 0 then c = "steel2" end
      if inner == 1 then c = (side < 0) and "steel3" or "steel4" end
      if y >= 16 + math.max(0, yo) and yy <= 95 then P.set(img, x, y, c) end
    end
  end
  if bend > 0 then
    -- pushed-in leaf edge catches light
    local ex = (side < 0) and x1 or x0
    for y = 16 + dy + bend, 95 do P.set(img, ex, y, "steel5") end
  end
end
local function gatePosts(img)
  concrete(img, 0, 3, 12, 93, 3, { seams = 15, crack = true })
  concrete(img, 84, 3, 12, 93, 4, { seams = 15, crack = true })
  -- hazard collars on the posts
  for _, px in ipairs({ 0, 84 }) do
    P.hazard(img, px, 76, 12, 6, { p = 6, a = "fire4", b = "outline", a_hi = "fire5", a_lo = "fire3" })
    P.vline(img, px + 11, 76, 81, "ink1")
    P.hline(img, px, px + 11, 82, "ink2")
  end
  -- steel lintel I-beam between the posts
  P.fill(img, 10, 6, 76, 10, "steel3")
  P.hline(img, 10, 85, 6, "steel5"); P.hline(img, 10, 85, 7, "steel4")
  P.hline(img, 10, 85, 14, "steel2"); P.hline(img, 10, 85, 15, "steel1")
  P.hazard(img, 12, 9, 72, 4, { p = 8, dir = -1, a = "fire4", b = "outline", a_hi = "fire5", a_lo = "fire3" })
  for x = 14, 82, 8 do P.rivet(img, x, 7) end
  for x = 14, 82, 8 do P.set(img, x, 14, "steel4") end
  -- post caps
  for _, px in ipairs({ 0, 84 }) do
    P.fill(img, px, 2, 12, 3, "ink4"); P.hline(img, px, px + 11, 2, "ink5"); P.hline(img, px, px + 11, 4, "ink2")
  end
  -- snow
  P.snow(img, 0, 11, 2, 2, { seed = 1 }); P.snow(img, 84, 95, 2, 2, { seed = 2 })
  P.snow(img, 12, 83, 6, 1, { seed = 3, lumpy = 0.4 })
end
local function gateInterior(img)
  for y = 16, 95 do for x = 12, 83 do P.set(img, x, y, (y > 88) and "ink1" or "outline") end end
end
local function gateClosed(img)
  gateInterior(img)
  leaf(img, 12, 47, -1); leaf(img, 48, 83, 1)
  emblem(img, 48, 50)
  P.vline(img, 47, 16, 36, "outline"); P.vline(img, 47, 64, 95, "outline")
  gatePosts(img)
  P.selout(img)
end
local function gateShake(f)
  return function(img)
    gateInterior(img)
    local dy = ({ 1, 0, 1 })[f]
    local bend = ({ 1, 2, 0 })[f]
    local gap = ({ 1, 2, 0 })[f]
    leaf(img, 12, 47 - gap, -1, dy, bend); leaf(img, 48 + gap, 83, 1, dy, bend)
    if f ~= 2 then emblem(img, 48, 50 + dy) else
      -- emblem plate split by the widened seam
      emblem(img, 48, 50)
      for y = 30, 70 do for x = 46, 49 do P.set(img, x, y, "outline") end end
    end
    gatePosts(img)
    -- dust and snow shaken loose
    local rnd = P.rng(40 + f)
    for _ = 1, 10 + f * 3 do
      local x, y = rnd(14, 82), rnd(17, 17 + 6 * f)
      P.set(img, x, y, (rnd() < 0.5) and "ink6" or "ink5")
    end
    for i = -3, 3 do P.set(img, 48 + i * 4, 94 - math.abs(i) % 2, (f == 2) and "ink4" or "ink5") end
    if f == 2 then for i = 0, 4 do P.set(img, 40 + i * 4, 92, "ink5"); P.set(img, 42 + i * 3, 90, "ink4") end end
    P.selout(img)
  end
end
local function gateSmashed(img)
  gateInterior(img)
  leaf(img, 12, 47, -1); leaf(img, 48, 83, 1)
  emblem(img, 48, 50)
  -- tear a jagged hole through the middle: doors bent outward and ripped
  local rnd = P.rng(77)
  local edge = {}
  for y = 16, 95 do
    local f = (y - 16) / 79
    local hw = math.floor(9 + 18 * math.sin(f * math.pi * 0.85 + 0.2) + rnd(-2, 2))
    if y < 22 then hw = math.floor(hw * 0.5) end
    local cx = 48 + math.floor(math.sin(y * 0.21) * 3 + 0.5)
    edge[y] = { cx - hw, cx + hw + rnd(-1, 1) }
    for x = edge[y][1], edge[y][2] do P.set(img, x, y, (y > 86) and "ink1" or "outline") end
  end
  -- leaves bent outward around the breach catch the light (2-3px lit band)
  for y = 16, 95 do
    local l, r = edge[y][1], edge[y][2]
    for k = 2, 4 do
      local c = P.get(img, l - k, y)
      if c and c:match("^dirt") then P.set(img, l - k, y, P.shift(c, 1)) end
      if c and c:match("^steel") then P.set(img, l - k, y, P.shift(c, 1)) end
      local c2 = P.get(img, r + k, y)
      if c2 and (c2:match("^dirt") or c2:match("^steel")) and k <= 3 then P.set(img, r + k, y, P.shift(c2, -1)) end
    end
  end
  -- splintered/torn rims: fresh wood on the left leaf edge, bent bright steel on the right
  for y = 16, 95 do
    local l, r = edge[y][1], edge[y][2]
    P.over(img, l - 1, y, (y % 3 == 0) and "sand4" or "dirt5")
    P.over(img, r + 1, y, (y % 4 == 0) and "steel5" or "steel4")
    if y % 5 == 0 then P.set(img, l, y, "sand4"); P.set(img, l + 1, y + 1, "dirt4") end   -- splinters jutting in
  end
  -- steel bands ripped and curled toward the viewer
  for _, by in ipairs({ 20, 52, 80 }) do
    local l, r = edge[by + 2][1], edge[by + 2][2]
    for i = 0, 4 do P.set(img, l + i, by + 1 + i, "steel4"); P.set(img, l + i, by + 2 + i, "steel2") end
    P.set(img, l + 5, by + 6, "steel5")
    for i = 0, 5 do P.set(img, r - i, by + 1 - (i > 2 and 1 or 0) + i, "steel4"); P.set(img, r - i, by + 2 + i, "steel1") end
    P.set(img, r - 6, by + 7, "steel5")
  end
  -- debris heap at the foot of the breach
  for i = -14, 14 do
    local t = math.max(0, 4 - math.floor(math.abs(i) / 3))
    for k = 0, t - 1 do
      local c = ((i + k) % 3 == 0) and "dirt4" or ((i + k) % 3 == 1) and "steel3" or "dirt2"
      if k == t - 1 then c = (i < 0) and "dirt5" or "steel4" end
      P.set(img, 48 + i, 95 - k, c)
    end
  end
  P.line(img, 36, 93, 46, 88, "dirt4"); P.line(img, 37, 94, 47, 89, "dirt2")       -- a broken plank
  P.line(img, 52, 90, 60, 94, "steel4"); P.line(img, 52, 91, 60, 95, "steel1")
  gatePosts(img)
  P.selout(img)
end
K.build(P.spec("prop_gate", 96, 96, {
  { tag = "prop_gate_closed", ms = 100, frames = { { grid = gateClosed } } },
  { tag = "prop_gate_shake", ms = 60, frames = { { grid = gateShake(1) }, { grid = gateShake(2) }, { grid = gateShake(3) } } },
  { tag = "prop_gate_smashed", ms = 100, frames = { { grid = gateSmashed } } },
}))

-------------------------------------------------------------------------------
-- prop_alarm_light 16x16: wall-mounted rotating red beacon
-------------------------------------------------------------------------------
local RAY = { 255, 224, 102, 120 }
local function alarm(f)
  return function(img)
    -- bracket + base
    P.fill(img, 3, 12, 10, 3, "steel3"); P.hline(img, 3, 12, 12, "steel5"); P.hline(img, 3, 12, 14, "steel1")
    P.vline(img, 12, 12, 14, "steel2"); P.rivet(img, 4, 13); P.rivet(img, 10, 13)
    P.fill(img, 6, 15, 4, 1, "steel2")
    -- dome
    local dome = { { 6, 9 }, { 5, 10 }, { 4, 11 }, { 4, 11 }, { 4, 11 }, { 4, 11 }, { 4, 11 }, { 4, 11 } }
    for i, r in ipairs(dome) do
      local y = 3 + i
      for x = r[1], r[2] do
        local c = (x <= 5) and "red4" or (x <= 8) and "red3" or "red2"
        if y == 11 then c = "red1" end
        P.set(img, x, y, c)
      end
    end
    P.set(img, 6, 5, "red5"); P.set(img, 5, 6, "red5")
    -- lit reflector band
    if f > 0 then
      local bands = { { 4, 5 }, { 6, 9 }, { 10, 11 }, nil }
      local b = bands[f]
      if b then
        for y = 4, 10 do for x = b[1], b[2] do
          if P.solid(img, x, y) then
            local core = (f == 2) and (x == 7 or x == 8) or (f ~= 2)
            P.set(img, x, y, (core and y > 4 and y < 10) and "fire6" or "fire5")
          end
        end end
        -- flares spilling out in the beam direction
        if f == 1 then P.set(img, 2, 6, RAY); P.set(img, 1, 7, RAY); P.set(img, 2, 8, RAY); P.set(img, 3, 7, "fire5") end
        if f == 3 then P.set(img, 13, 6, RAY); P.set(img, 14, 7, RAY); P.set(img, 13, 8, RAY); P.set(img, 12, 7, "fire5") end
        if f == 2 then
          P.set(img, 7, 1, RAY); P.set(img, 8, 1, RAY); P.set(img, 2, 4, RAY); P.set(img, 13, 4, RAY)
          P.set(img, 2, 10, RAY); P.set(img, 13, 10, RAY)
        end
      else
        -- facing away: whole dome glows dimly
        for y = 4, 10 do for x = 4, 11 do if P.solid(img, x, y) then
          P.set(img, x, y, (x <= 6) and "red5" or "red4")
        end end end
      end
    end
    -- cage
    P.vline(img, 6, 4, 10, "steel2"); P.vline(img, 9, 4, 10, "steel2"); P.hline(img, 4, 11, 8, "steel2")
    P.set(img, 6, 4, "steel4"); P.set(img, 9, 4, "steel4")
    -- cap
    P.set(img, 7, 3, "steel4"); P.set(img, 8, 3, "steel2"); P.set(img, 7, 2, "steel5"); P.set(img, 8, 2, "steel3")
    P.selout(img)
  end
end
K.build(P.spec("prop_alarm_light", 16, 16, {
  { tag = "prop_alarm_light_off", ms = 100, frames = { { grid = alarm(0) } } },
  { tag = "prop_alarm_light_on", ms = 80, frames = { { grid = alarm(1) }, { grid = alarm(2) }, { grid = alarm(3) }, { grid = alarm(4) } } },
}))

-------------------------------------------------------------------------------
-- prop_searchlight 32x32: drum lamp on a swivel yoke (lens faces right)
-------------------------------------------------------------------------------
local function searchlight(img)
  -- base plate + post
  P.fill(img, 9, 29, 14, 3, "steel3"); P.hline(img, 9, 22, 29, "steel5"); P.hline(img, 9, 22, 31, "steel1"); P.vline(img, 22, 29, 31, "steel2")
  P.rivet(img, 10, 30); P.rivet(img, 20, 30)
  for y = 21, 28 do P.set(img, 14, y, "steel4"); P.set(img, 15, y, "steel3"); P.set(img, 16, y, "steel2"); P.set(img, 17, y, "steel1") end
  P.fill(img, 12, 20, 8, 2, "steel3"); P.hline(img, 12, 19, 20, "steel4"); P.set(img, 19, 21, "steel1")
  -- yoke arms
  for y = 10, 20 do P.set(img, 9, y, "steel4"); P.set(img, 10, y, "steel2"); P.set(img, 21, y, "steel3"); P.set(img, 22, y, "steel1") end
  -- drum (cylinder, axis horizontal): rows shaded top-lit
  local tones = { "steel5", "steel4", "steel4", "steel3", "steel3", "steel3", "steel3", "steel2", "steel2", "steel1", "steel1" }
  for i, c in ipairs(tones) do
    local y = 5 + i
    for x = 6, 24 do P.set(img, x, y, c) end
  end
  -- cooling fins on the back half
  for x = 7, 13, 2 do for y = 6, 16 do P.set(img, x, y, (y < 9) and "steel3" or "steel1") end end
  -- back cap
  P.vline(img, 5, 7, 15, "steel3"); P.set(img, 5, 7, "steel4"); P.vline(img, 4, 9, 13, "steel2")
  -- pivot bolts
  P.rivet(img, 9, 11, 2); P.rivet(img, 21, 11, 2)
  -- lens rim and glowing lens (ellipse seen from the side)
  for y = 4, 18 do
    local t = math.abs(y - 11) / 7.5
    local w = (t < 0.75) and 3 or (t < 0.95) and 2 or 1
    for k = 0, w - 1 do
      local x = 25 + k
      local c = (k == 0) and "steel4" or ((y < 9) and "fire6" or (y < 14) and "fire5" or "fire4")
      if k == w - 1 and w == 3 then c = (y < 11) and "white" or "fire5" end
      P.set(img, x, y, c)
    end
  end
  P.vline(img, 24, 5, 17, "steel5"); P.set(img, 24, 5, "steel4"); P.set(img, 24, 17, "steel2")
  -- carry handle + snow
  P.hline(img, 13, 19, 3, "steel3"); P.set(img, 13, 4, "steel3"); P.set(img, 19, 4, "steel2"); P.set(img, 13, 3, "steel5")
  P.snow(img, 6, 23, 6, 1, { seed = 6, lumpy = 0.4 })
  P.selout(img)
  -- lens glow spill (partial alpha)
  for y = 6, 16 do if P.alpha(img, 28, y) == 0 then P.set(img, 28, y, { 255, 248, 208, 90 }) end end
  for y = 8, 14 do if P.alpha(img, 29, y) == 0 then P.set(img, 29, y, { 255, 248, 208, 50 }) end end
end
K.build(P.spec("prop_searchlight", 32, 32, {
  { tag = "prop_searchlight_idle", ms = 100, frames = { { grid = searchlight } } },
}))

-------------------------------------------------------------------------------
-- prop_searchlight_beam 128x64: soft cone from the left-middle, brighter core, no outline
-------------------------------------------------------------------------------
local function beam(img)
  local EDGE = { 168, 212, 240, 45 }   -- sky5
  local MID = { 255, 248, 208, 70 }    -- fire6
  local CORE = { 255, 248, 208, 105 }
  local FADE = { 255, 248, 208, 40 }
  for x = 0, 127 do
    local h = 2 + x * 29 / 127
    for y = 0, 63 do
      local d = math.abs(y - 31.5)
      if d <= h then
        local u = d / h
        local c
        if u > 0.82 then c = EDGE
        elseif u < 0.3 then c = CORE
        else c = MID end
        -- hand-dithered transitions between bands
        if u > 0.74 and u <= 0.82 and (x + y) % 2 == 0 then c = EDGE end
        if u >= 0.3 and u < 0.38 and (x + y) % 2 == 0 then c = CORE end
        -- far end fades out
        if x > 100 then
          if (x + y) % 2 == 0 then c = FADE end
          if x > 116 and (x + y) % 4 ~= 1 then c = nil end
        end
        if x < 3 then c = CORE end
        if c then P.set(img, x, y, c) end
      end
    end
  end
end
K.build(P.spec("prop_searchlight_beam", 128, 64, {
  { tag = "prop_searchlight_beam_idle", ms = 100, frames = { { grid = beam } } },
}))

-------------------------------------------------------------------------------
-- cloth helpers: flag + banner
-------------------------------------------------------------------------------
-- flag cloth texture (20x13) in flat space -> palette name
local function flagTex()
  local t = {}
  for v = 0, 12 do t[v] = {} for u = 0, 19 do
    local c = "red3"
    if v == 0 then c = "red4" end
    if v == 12 then c = "red2" end
    t[v][u] = c
  end end
  -- dark field + small spiral eye
  for v = 2, 10 do for u = 4, 16 do
    local du, dv = (u - 10) / 7.2, (v - 6) / 5.2
    if du * du + dv * dv <= 1 then t[v][u] = "outline" end
  end end
  local eye = P.EYE.s
  local keys = { o = "outline", w = "white", r = "red4" }
  for j, row in ipairs(eye) do for i = 1, #row do
    local ch = row:sub(i, i)
    if ch ~= "." then t[2 + j][4 + i] = keys[ch] end
  end end
  -- hem at the hoist
  for v = 0, 12 do t[v][0] = "sand3" end
  return t
end
local function flag(f)
  return function(img)
    local tex = flagTex()
    local ph = f * math.pi / 2
    for u = 0, 19 do
      local amp = 0.3 + u / 19 * 1.4
      local off = math.floor(math.sin(u * 0.42 - ph) * amp + 0.5)
      local slope = math.cos(u * 0.42 - ph)
      for v = 0, 12 do
        local c = tex[v][u]
        if c and not (u == 19 and (v == 4 or v == 9)) and not (u == 18 and v == 9) then
          if c == "red3" or c == "red4" or c == "red2" then
            if slope > 0.55 then c = P.shift(c, -1) elseif slope < -0.55 then c = P.shift(c, 1) end
          end
          P.set(img, 3 + u, 4 + v + off, c)
        end
      end
    end
    -- pole + finial + base
    for y = 2, 37 do P.set(img, 1, y, "steel4"); P.set(img, 2, y, "steel2") end
    P.set(img, 1, 1, "fire4"); P.set(img, 2, 1, "fire3"); P.set(img, 1, 0, "fire5"); P.set(img, 2, 0, "fire4")
    P.set(img, 3, 4, "steel3"); P.set(img, 3, 16, "steel3")            -- rope clips
    P.fill(img, 0, 37, 5, 2, "ink3"); P.hline(img, 0, 4, 37, "ink4"); P.set(img, 4, 38, "ink2")
    P.mound(img, 2, 39, 3, 1)
    P.selout(img)
  end
end
K.build(P.spec("prop_flag", 24, 40, {
  { tag = "prop_flag_wave", ms = 120, frames = { { grid = flag(0) }, { grid = flag(1) }, { grid = flag(2) }, { grid = flag(3) } } },
}))

-- banner: 22 x 43 cloth hanging from a rod; swallowtail bottom
local function banner(f)
  return function(img)
    local W, H = 22, 44
    local tex = {}
    for v = 0, H - 1 do tex[v] = {} for u = 0, W - 1 do
      local c = "red3"
      if u == 1 or u == W - 2 then c = "fire4" end           -- gold trim
      if u == 0 or u == W - 1 then c = "red1" end
      if v == 1 then c = "fire4" end
      if v == 0 then c = "red1" end
      tex[v][u] = c
    end end
    -- swallowtail cut
    for v = H - 7, H - 1 do
      local cut = v - (H - 7)
      for u = 11 - cut, 10 + cut do if u >= 0 and u < W then tex[v][u] = nil end end
      -- trim follows the cut
      local l, r = 11 - cut - 1, 10 + cut + 1
      if tex[v][l] then tex[v][l] = "fire4" end
      if tex[v][r] then tex[v][r] = "fire4" end
    end
    for v = H - 2, H - 1 do for u = 0, W - 1 do if tex[v][u] then tex[v][u] = (v == H - 1) and "red1" or "fire4" end end end
    -- dark diamond field with the spiral eye
    for v = 6, 26 do for u = 2, W - 3 do
      if math.abs(u - 10.5) / 9.5 + math.abs(v - 16) / 10.5 <= 1 then tex[v][u] = "outline" end
    end end
    local eye = P.EYE.m
    local keys = { o = "outline", w = "white", r = "red4" }
    for j, row in ipairs(eye) do for i = 1, #row do
      local ch = row:sub(i, i)
      if ch ~= "." then tex[11 + j][3 + i] = keys[ch] end
    end end
    -- a gold chevron below the emblem
    for i = 0, 4 do
      local v0 = 29
      tex[v0 + i][6 + i] = "fire5"; tex[v0 + i][15 - i] = "fire4"
      tex[v0 + i + 1][6 + i] = "fire4"; tex[v0 + i + 1][15 - i] = "fire3"
      tex[v0 + i + 2][6 + i] = "fire3"; tex[v0 + i + 2][15 - i] = "fire2"
    end
    local ph = f * math.pi / 2
    for v = 0, H - 1 do
      local amp = (v / (H - 1)) * 1.2
      local off = math.floor(math.sin(v * 0.22 - ph) * amp + 0.5)
      for u = 0, W - 1 do
        local c = tex[v][u]
        if c then
          if c == "red3" then
            local fold = math.sin(u * 0.5 + v * 0.08 - ph)
            if fold > 0.6 then c = "red4" elseif fold < -0.6 then c = "red2" end
          end
          P.set(img, 5 + u + off, 3 + v, c)
        end
      end
    end
    -- rod with finials, rings
    P.hline(img, 2, 29, 1, "steel4"); P.hline(img, 2, 29, 2, "steel2")
    P.set(img, 1, 1, "fire4"); P.set(img, 0, 1, "fire5"); P.set(img, 1, 2, "fire3"); P.set(img, 30, 1, "fire4"); P.set(img, 31, 1, "fire3"); P.set(img, 30, 2, "fire2")
    for _, x in ipairs({ 7, 15, 24 }) do P.set(img, x, 3, "steel3") end
    P.snow(img, 3, 28, 1, 1, { seed = 9, drips = false, lumpy = 0.2, minw = 2, maxw = 4 })
    P.selout(img)
  end
end
K.build(P.spec("prop_banner", 32, 48, {
  { tag = "prop_banner_wave", ms = 140, frames = { { grid = banner(0) }, { grid = banner(1) }, { grid = banner(2) }, { grid = banner(3) } } },
}))

-------------------------------------------------------------------------------
-- prop_bunker_door 32x48: concrete frame, steel blast door sliding up
-------------------------------------------------------------------------------
local function bunker(s)
  return function(img)
    -- dark interior with a hint of a corridor
    for y = 10, 47 do for x = 5, 26 do P.set(img, x, y, (y > 42) and "ink1" or "outline") end end
    P.hline(img, 5, 26, 43, "ink2"); P.set(img, 8, 12, "red3"); P.set(img, 23, 12, "red3")
    P.hline(img, 9, 22, 39, "ink1"); P.hline(img, 7, 24, 41, "ink1")
    -- blast door (y range 10..47 when closed), shifted up by s; clipped to the opening
    for y = 10, 47 do
      local v = y + s - 10            -- door-local row
      if v <= 37 and y >= 10 then
        for x = 5, 26 do
          local u = x - 5
          local c = "steel3"
          if u == 0 then c = "steel4" elseif u == 21 then c = "steel1" elseif u == 20 then c = "steel2" end
          -- vertical ribs
          if u % 5 == 2 then c = "steel4" elseif u % 5 == 3 and u < 20 then c = "steel2" end
          if v == 0 then c = "steel5" end
          if v == 36 then c = "steel2" end
          if v == 37 then c = "steel1" end
          -- horizontal handle bar
          if v == 18 then c = (u > 0 and u < 21) and "steel5" or c end
          if v == 19 then c = (u > 0 and u < 21) and "steel1" or c end
          -- hazard strip along the bottom edge of the door
          if v >= 31 and v <= 34 then c = (((u + v) % 6) < 3) and "fire4" or "outline" end
          P.set(img, x, y, c)
        end
        -- rivets
        if v == 3 or v == 27 then for _, x in ipairs({ 6, 12, 17, 23 }) do P.rivet(img, x, y) end end
      end
    end
    -- concrete frame
    concrete(img, 0, 2, 5, 46, 21, {}); concrete(img, 27, 2, 5, 46, 22, {})
    concrete(img, 0, 2, 32, 8, 23, {})
    P.vline(img, 4, 10, 47, "ink2"); P.vline(img, 27, 10, 47, "ink4")
    P.hline(img, 5, 26, 9, "ink1")
    -- hazard stripes on the frame
    P.hazard(img, 1, 12, 3, 34, { p = 6, a = "fire4", b = "outline" })
    P.hazard(img, 28, 12, 3, 34, { p = 6, a = "fire4", b = "outline", dir = -1 })
    P.hazard(img, 3, 4, 26, 3, { p = 6, a = "fire4", b = "outline", a_hi = "fire5" })
    P.set(img, 1, 12, "fire5"); P.set(img, 28, 12, "fire5")
    -- warning lamp above the door
    P.fill(img, 14, 0, 4, 2, "red3"); P.set(img, 14, 0, "red5"); P.set(img, 17, 1, "red1")
    P.snow(img, 0, 13, 2, 1, { seed = 31, drips = true }); P.snow(img, 18, 31, 2, 1, { seed = 32 })
    P.selout(img)
  end
end
K.build(P.spec("prop_bunker_door", 32, 48, {
  { tag = "prop_bunker_door_closed", ms = 100, frames = { { grid = bunker(0) } } },
  { tag = "prop_bunker_door_open", ms = 80, frames = { { grid = bunker(10) }, { grid = bunker(20) }, { grid = bunker(30) }, { grid = bunker(38) } } },
}))
