-- Mission 2 Part II "RIVER RUN" props: the barge tow and the riverboat BAYOU QUEEN.
-- container_door, branch (LOW BRANCH hazard), sign_branch, paddlewheel, crane_hook, fuel_cell, life_ring,
-- queen_board, bell, buoy, boiler_lamp, rope_coil, drum_rack, wheelhouse_light.
-- Night scene (moonlight, then rain): colours kept a little cool. Light from the top-left.
-- All props anchor bottom-centre except crane_hook (top-centre). Tags are prop_<kind>_<anim>.
-- Manifest entries: art-src/props/manifest_m2b.json.
-- Build: bash tools/build-art.sh art-src/props/boat.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local P = dofile(ROOT .. "/art-src/props/lib/pk.lua")(K)

local function hash(a, b, c)
  local h = (a * 73856093) ~ (b * 19349663) ~ ((c or 0) * 83492791)
  h = (h ~ (h >> 13)) * 1274126177
  h = h ~ (h >> 16)
  return (h & 0xffff) / 65535
end
local function frames(fn, n) local t = {}; for f = 0, n - 1 do t[#t + 1] = { grid = fn(f) } end; return t end
local function one(fn) return { { grid = fn } } end

-------------------------------------------------------------------------------
-- prop_container_door 32x32: shipping-container end doors (rust-red corrugated leaves, 4 lock bars with cam
-- handles, hinges on the corner posts). Opening x3..28, y3..28. open: the two leaves swing out toward the
-- viewer (foreshortened, free edge grows taller), revealing the dark interior; play once, hold the last frame.
-------------------------------------------------------------------------------
local DOOR_W = 13
local function leafPixel(u, v, side)
  -- u 0..12 across the leaf (0 = hinge edge for both leaves), v 0..25 down
  local c
  local k = u % 3
  c = (k == 2) and "red2" or "red3"
  if u == 1 or (k == 0 and v < 3) then c = "red4" end
  if v <= 1 then c = (v == 0) and "red4" or "red3" end
  if v >= 24 then c = (v == 25) and "red1" or "red2" end
  if u == 0 then c = "red2" end
  if u == DOOR_W - 1 then c = (side == "L") and "red1" or "red4" end
  -- rust streaks and chipped paint
  if k ~= 0 and v > 2 and v < 24 and hash(u, math.floor(v / 5), side == "L" and 1 or 2) > 0.86 then c = "dirt3" end
  if v > 19 and v < 24 and hash(u, v, 9) > 0.8 then c = "dirt2" end
  -- lock bars (two per leaf) at u = 3 and 8 (mirrored per leaf so they sit symmetric)
  for _, bu in ipairs({ 3, 8 }) do
    if u == bu then c = "steel3" elseif u == bu + 1 then c = "steel1" end
  end
  -- bar guides
  if (v == 4 or v == 21) and (u >= 2 and u <= 10) then
    if u == 3 or u == 8 then c = "steel5" else c = "steel4" end
  end
  if (v == 5 or v == 22) and (u >= 2 and u <= 10) then c = "steel1" end
  -- cam handles: horizontal at v 13 from the bar toward the centre seam
  if v == 13 and ((u >= 4 and u <= 7) or (u >= 9 and u <= 11)) then c = "steel4" end
  if v == 14 and ((u >= 4 and u <= 7) or (u >= 9 and u <= 11)) then c = "steel1" end
  return c
end
local function containerDoor(stage)
  -- stage 0 closed; 1..4 opening. Apparent leaf width and free-edge overhang per stage.
  local W = ({ [0] = 13, 9, 5, 3, 2 })[stage]
  local O = ({ [0] = 0, 1, 2, 3, 3 })[stage]
  return function(img)
    -- frame (corner posts, header, sill) in darker container red
    P.fill(img, 0, 0, 32, 32, "red2")
    P.hline(img, 0, 31, 0, "red3"); P.vline(img, 0, 0, 31, "red3")
    P.fill(img, 0, 0, 3, 32, "red2"); P.fill(img, 29, 0, 3, 32, "red2")
    P.vline(img, 0, 0, 31, "red3"); P.vline(img, 2, 3, 28, "red1"); P.vline(img, 29, 3, 28, "red3"); P.vline(img, 31, 0, 31, "red1")
    P.hline(img, 0, 31, 2, "red1"); P.hline(img, 3, 28, 29, "red3"); P.hline(img, 0, 31, 31, "red1")
    -- corner castings
    for _, p in ipairs({ { 0, 0 }, { 28, 0 }, { 0, 29 }, { 28, 29 } }) do
      P.box(img, p[1], p[2], 4, 3, "steel", 2); P.set(img, p[1] + 1, p[2] + 1, "outline"); P.set(img, p[1] + 2, p[2] + 1, "outline")
    end
    -- rust drips from the header
    for _, x in ipairs({ 7, 13, 22 }) do P.set(img, x, 1, "dirt3"); P.set(img, x, 2, "dirt2") end
    -- interior: back wall + receding side walls / floor / ceiling (depth)
    for y = 3, 28 do for x = 3, 28 do
      local c = "outline"
      if x >= 9 and x <= 22 and y >= 8 and y <= 24 then c = "ink1" end
      if y > 24 and x >= 3 + (28 - y) and x <= 28 - (28 - y) then c = (y % 2 == 0) and "ink2" or "ink1" end    -- floor wedge
      P.set(img, x, y, c)
    end end
    for x = 10, 21, 2 do P.vline(img, x, 9, 23, "outline") end                          -- back wall corrugation
    P.line(img, 3, 3, 8, 7, "ink1"); P.line(img, 28, 3, 23, 7, "ink1")                -- ceiling corners
    P.line(img, 3, 28, 8, 25, "ink2"); P.line(img, 28, 28, 23, 25, "ink2")            -- floor corners
    P.fill(img, 11, 18, 5, 6, "ink2"); P.hline(img, 11, 15, 18, "ink3"); P.line(img, 12, 19, 14, 22, "ink1")   -- crate
    P.fill(img, 16, 21, 4, 3, "ink2"); P.hline(img, 16, 19, 21, "ink3")
    if stage == 0 then P.fill(img, 3, 3, 26, 26, "red3") end
    -- leaves
    local function drawLeaf(side)
      for i = 0, W - 1 do
        local t = (W == 1) and 1 or i / (W - 1)
        local o = math.floor(O * t + 0.5)
        local x = (side == "L") and (3 + i) or (28 - i)
        local y0, y1 = 3 - o, 28 + o
        local u = math.min(DOOR_W - 1, math.floor(i * DOOR_W / W))
        if i == W - 1 then u = DOOR_W - 1 end
        for y = y0, y1 do
          local v = math.floor((y - y0) * 26 / (y1 - y0 + 1))
          local c = leafPixel(u, v, side)
          if stage > 0 and side == "L" then c = P.shift(c, -1) end                       -- turned away from the light
          if stage > 0 and i == W - 1 then c = (side == "L") and "red1" or "red2" end     -- door thickness edge
          if stage > 0 and y == y0 then c = (side == "L") and "red2" or "red4" end
          P.set(img, x, y, c)
        end
        if stage > 0 and o > 0 then P.set(img, x, y1 + 1, nil) end
      end
    end
    drawLeaf("L"); drawLeaf("R")
    if stage == 0 then
      -- centre seam + seal on the right leaf's handle
      P.vline(img, 15, 3, 28, "red1"); P.vline(img, 16, 3, 28, "outline")
      P.set(img, 18, 13, "sand4"); P.set(img, 18, 14, "red4")
      -- hinges on the posts
      for _, y in ipairs({ 5, 12, 19, 25 }) do
        P.set(img, 2, y, "steel4"); P.set(img, 2, y + 1, "steel2"); P.set(img, 29, y, "steel4"); P.set(img, 29, y + 1, "steel2")
      end
      -- stencilled data plate (left leaf, top)
      P.fill(img, 5, 7, 2, 2, "ink4"); P.set(img, 9, 7, "ink4"); P.set(img, 10, 8, "ink3")
      -- regime spiral stencil, faded, on the right leaf
      P.grid(img, { ".xxx.", "x.x.x", "x.xxx", "x...x", ".xxx." }, { x = "ink3" }, 21, 7)
    else
      for _, y in ipairs({ 5, 12, 19, 25 }) do P.set(img, 2, y, "steel4"); P.set(img, 29, y, "steel4") end
    end
    -- the sill stays in front of the floor; the swung leaves overhang it
  end
end
K.build(P.spec("prop_container_door", 32, 32, {
  { tag = "prop_container_door_closed", ms = 100, frames = { { grid = containerDoor(0) } } },
  { tag = "prop_container_door_open", ms = 70, frames = { { grid = containerDoor(1) }, { grid = containerDoor(2) },
    { grid = containerDoor(3) }, { grid = containerDoor(4) } } },
}))

-------------------------------------------------------------------------------
-- prop_branch 96x136: LOW BRANCH hazard. A huge mossy cypress limb comes down from the top-right (trunk
-- off-screen), droops into a low elbow and hangs a thick Spanish-moss beard down to the canvas bottom: several
-- beard tips in the middle (x ~18..80) reach row 135 in every frame. idle: 4 frames, moss and vines sway.
-------------------------------------------------------------------------------
local LIMBS = {
  { { 82, -12, 15 }, { 71, 24, 14 }, { 59, 58, 13 }, { 47, 84, 12 }, { 33, 98, 10 }, { 19, 105, 8 }, { 8, 110, 6 }, { -2, 117, 4 } },
  { { 48, 86, 9 }, { 62, 96, 8 }, { 76, 103, 6 }, { 88, 110, 4 }, { 97, 117, 2 } },
  { { 63, 40, 6 }, { 47, 28, 5 }, { 31, 22, 4 }, { 17, 22, 3 }, { 5, 26, 2 }, { -4, 31, 1 } },
}
local function limbField()
  local F = {}
  local L = { -0.55, -0.83 }
  for li, pl in ipairs(LIMBS) do
    local acc = 0
    for i = 1, #pl - 1 do
      local a, b = pl[i], pl[i + 1]
      local dx, dy = b[1] - a[1], b[2] - a[2]
      local len = math.sqrt(dx * dx + dy * dy)
      for y = math.max(0, math.floor(math.min(a[2], b[2]) - 16)), math.min(135, math.ceil(math.max(a[2], b[2]) + 16)) do
        for x = math.max(0, math.floor(math.min(a[1], b[1]) - 16)), math.min(95, math.ceil(math.max(a[1], b[1]) + 16)) do
          local u = math.max(0, math.min(1, ((x - a[1]) * dx + (y - a[2]) * dy) / (len * len)))
          local ox, oy = x - (a[1] + dx * u), y - (a[2] + dy * u)
          local d = math.sqrt(ox * ox + oy * oy)
          local r = a[3] + (b[3] - a[3]) * u
          if d <= r then
            local k = d / r
            F[x] = F[x] or {}
            local cur = F[x][y]
            if not cur or k < cur.k then
              F[x][y] = { k = k, b = (ox * L[1] + oy * L[2]) / math.max(r, 1), s = acc + u * len,
                t = ox * (-dy / len) + oy * (dx / len), r = r, li = li }
            end
          end
        end
      end
      acc = acc + len
    end
  end
  return F
end
local BRANCH_F = limbField()
local function inLimb(x, y) return BRANCH_F[x] and BRANCH_F[x][y] end
local function lowest(x) for y = 135, 0, -1 do if inLimb(x, y) then return y end end end
local function highest(x, ymin) for y = ymin or 0, 135 do if inLimb(x, y) then return y end end end

-- Spanish moss: clumps of 2-4 tapered strands; each strand has its own length so tips are ragged and pointed.
local CLUMPS = {}
do
  local rnd = P.rng(4242)
  local function clump(x, y, L, back, upper)
    local c = { x = x, y = y, ph = rnd() * 6.283, back = back, strands = {} }
    local n = rnd(2, 4)
    for i = 1, n do
      local sl = (i == 1) and L or math.max(4, math.floor(L * (0.55 + rnd() * 0.4)))
      c.strands[#c.strands + 1] = { dx = rnd(-3, 3), L = sl, w = rnd(2, 3), seed = rnd(1, 9999) }
    end
    CLUMPS[#CLUMPS + 1] = c
  end
  -- beard under the low limbs (back layer then front layer)
  for pass = 1, 2 do
    local x = (pass == 1) and 3 or 1
    while x <= 94 do
      local ly = lowest(x)
      if ly and ly > 80 then
        local centre = 1 - math.abs(x - 48) / 48
        local tip
        if x >= 18 and x <= 80 and rnd() < 0.55 then tip = 135
        else tip = 135 - math.floor((1 - centre) * rnd(4, 12)) - rnd(0, 5) end
        clump(x, ly - 2, tip - (ly - 2), pass == 1, false)
      end
      x = x + rnd(4, 7)
    end
  end
  -- curtains under the upper twig
  local x = 6
  while x <= 56 do
    local ly = lowest(x)
    local hy = highest(x)
    if hy and hy < 50 then
      local yy = hy
      while inLimb(x, yy + 1) do yy = yy + 1 end
      clump(x, yy - 1, rnd(10, 26), false, true)
    end
    x = x + rnd(5, 8)
  end
end
-- moss draped over the front of the low limbs (starts on the top surface, hangs over the bark)
local DRAPES = {}
do
  local rnd = P.rng(99)
  local x = 2
  while x <= 94 do
    local hy = highest(x, 70)
    if hy then DRAPES[#DRAPES + 1] = { x = x, y = hy - 1, L = rnd(6, 16), w = rnd(2, 3), ph = rnd() * 6.283, seed = rnd(1, 9999) } end
    x = x + rnd(3, 8)
  end
end
local VINES = {
  { x = 7, y = 112, L = 18, ph = 0.4 }, { x = 89, y = 112, L = 16, ph = 2.1 }, { x = 22, y = 25, L = 46, ph = 3.5 },
  { x = 66, y = 102, L = 26, ph = 1.2 }, { x = 44, y = 31, L = 34, ph = 5.0 },
}
local function branch(f)
  return function(img)
    local ang = f * math.pi / 2
    local function strand(x0, y0, L, w0, seed, ph, back, over)
      for d = 0, L do
        local tt = d / math.max(1, L)
        local sway = 2.0 * (tt ^ 1.5) * math.min(1.4, L / 20) * math.sin(ang + ph)
        local wig = math.sin(d * 0.45 + seed) * 0.6
        local cx = x0 + math.floor(sway + wig + 0.5)
        local w = math.max(1, math.floor(w0 * (1 - tt) ^ 0.8 + 0.6))
        local xl = cx - math.floor((w - 1) / 2)
        for i = 0, w - 1 do
          local fib = hash(i + seed % 7, math.floor((d + seed) / 3), seed)       -- fibres follow the strand
          local c
          if back then c = (fib > 0.55) and "olive1" or "leaf2"
          else
            if i == 0 and w > 1 then c = (fib > 0.3) and "ink3" or "olive3"
            elseif i == w - 1 and w > 1 then c = (fib > 0.5) and "olive1" or "leaf2"
            else c = (fib > 0.55) and "ink2" or ((fib > 0.25) and "olive2" or "olive3") end
            if w == 1 then c = (fib > 0.5) and "olive2" or "ink2" end
            if tt < 0.25 and i == 0 and fib > 0.75 then c = "ink4" end
          end
          local y = y0 + d
          if y <= 135 and (over or not inLimb(xl + i, y)) then P.set(img, xl + i, y, c) end
        end
      end
    end
    -- back beard layer
    for _, c in ipairs(CLUMPS) do if c.back then
      for _, s in ipairs(c.strands) do strand(c.x + s.dx, c.y, s.L, s.w, s.seed, c.ph, true) end
    end end
    -- bark: fibrous grey cypress, strips run along the limb
    for x, col in pairs(BRANCH_F) do for y, p in pairs(col) do
      local b = p.b
      local c
      if b > 0.62 then c = "ink3" elseif b > -0.1 then c = "ink2" else c = "ink1" end
      local band = math.floor(p.t / 4.5 + 20)
      local fr = p.t / 4.5 + 0.35 * math.sin(p.s / 17 + band * 1.7)
      local fk = fr - math.floor(fr)
      local gap = hash(band, math.floor(p.s / 9), 6) > 0.8                 -- furrows break now and then
      if fk < 0.22 and p.k < 0.93 and not gap then c = (c == "ink3") and "ink2" or ((c == "ink2") and "ink1" or "outline") end
      if fk > 0.45 and fk < 0.62 and b > 0.25 and c == "ink2" and hash(band, math.floor(p.s / 5), 7) > 0.4 then c = "ink3" end
      if hash(math.floor(p.s / 20), band, 5) > 0.7 then
        c = ({ ink1 = "dirt1", ink2 = "dirt2", })[c] or c
      end
      if b > 0.8 and hash(x, y, 3) > 0.6 then c = "ink4" end
      P.set(img, x, y, c)
    end end
    -- knot hole + broken stub on the big bough
    P.ellipse(img, 61, 46, 1, 2, "outline"); P.set(img, 60, 44, "ink3"); P.set(img, 62, 48, "ink2")
    P.ellipse(img, 38, 96, 2, 1, "outline"); P.set(img, 36, 95, "ink3")
    -- cushion moss on the top surfaces
    for x, col in pairs(BRANCH_F) do for y, p in pairs(col) do
      if not inLimb(x, y - 1) and p.b > -0.25 and hash(math.floor(x / 6), p.li, 8) > 0.2 then
        local h = hash(x, y, 77)
        local th = (h > 0.75) and 3 or ((h > 0.3) and 2 or 1)
        for j = 0, th - 1 do
          local c = (j == th - 1) and ((h > 0.55) and "olive3" or "leaf3") or "leaf2"
          P.set(img, x, y - j + 1, c)
        end
        if h > 0.93 then P.set(img, x, y - th + 1, "olive4") end
      end
    end end
    -- drapes over the bark front, then the front beard + upper curtains
    for _, d in ipairs(DRAPES) do strand(d.x, d.y, d.L, d.w, d.seed, d.ph, false, true) end
    for _, c in ipairs(CLUMPS) do if not c.back then
      for _, s in ipairs(c.strands) do strand(c.x + s.dx, c.y, s.L, s.w, s.seed, c.ph, false) end
    end end
    -- vines with small leaves
    for _, v in ipairs(VINES) do
      for d = 0, v.L do
        local tt = d / v.L
        local x = v.x + math.floor(2.5 * tt ^ 1.3 * math.sin(ang + v.ph) + 0.5)
        local y = v.y + d
        if y <= 135 then
          P.set(img, x, y, (d % 3 == 0) and "leaf3" or "leaf2")
          if d % 5 == 2 and d > 2 then
            local sd = ((d // 5) % 2 == 0) and 1 or -1
            P.set(img, x + sd, y, "leaf4"); P.set(img, x + sd * 2, y - 1, "leaf3")
          end
        end
      end
    end
    P.selout(img)
  end
end
K.build(P.spec("prop_branch", 96, 136, {
  { tag = "prop_branch_idle", ms = 160, frames = frames(branch, 4) },
}))

-------------------------------------------------------------------------------
-- prop_sign_branch 32x144: warning sign on a tall piling in the river: yellow plank "LOW / BRANCHES / !v!",
-- hurricane lantern on top (flame ~ (16,6)). Canvas bottom = waterline.
-------------------------------------------------------------------------------
local BIGF = {
  L = { "xx....", "xx....", "xx....", "xx....", "xx....", "xx....", "xxxxxx" },
  O = { ".xxxx.", "xx..xx", "xx..xx", "xx..xx", "xx..xx", "xx..xx", ".xxxx." },
  W = { "xx...xx", "xx...xx", "xx...xx", "xx.x.xx", "xx.x.xx", "xxxxxxx", ".xx.xx." },
}
local SMF = {
  B = { "xx.", "x.x", "xx.", "x.x", "xx." }, R = { "xx.", "x.x", "xx.", "x.x", "x.x" },
  A = { ".x.", "x.x", "xxx", "x.x", "x.x" }, N = { "x..x", "xx.x", "x.xx", "x..x", "x..x" },
  C = { "xx", "x.", "x.", "x.", "xx" }, H = { "x.x", "x.x", "xxx", "x.x", "x.x" },
  E = { "xx", "x.", "xx", "x.", "xx" }, S = { ".xx", "x..", ".x.", "..x", "xx." },
  ["!"] = { "x", "x", "x", ".", "x" },
}
local function drawText(img, font, s, x, y, c, gap)
  for i = 1, #s do
    local g = font[s:sub(i, i)]
    for j, row in ipairs(g) do for k = 1, #row do
      if row:sub(k, k) == "x" then P.set(img, x + k - 1, y + j - 1, c) end
    end end
    x = x + #g[1] + (gap or 1)
  end
end
local function textW(font, s, gap)
  local w = 0; for i = 1, #s do w = w + #font[s:sub(i, i)][1] + (gap or 1) end; return w - (gap or 1)
end
local function signBranch(img)
  -- piling
  for y = 12, 143 do
    P.set(img, 14, y, "dirt3"); P.set(img, 15, y, "dirt4"); P.set(img, 16, y, "dirt3"); P.set(img, 17, y, "dirt2"); P.set(img, 18, y, "dirt1")
    if hash(0, math.floor(y / 3), 4) > 0.7 then P.set(img, 16, y, "dirt2") end
    if hash(1, y, 4) > 0.85 then P.set(img, 15, y, "dirt3") end
  end
  P.hline(img, 14, 18, 70, "dirt1"); P.hline(img, 14, 18, 104, "dirt1"); P.set(img, 15, 71, "dirt2")
  -- slime and moss near the waterline, rope lashing
  for y = 118, 143 do for x = 14, 18 do
    local h = hash(x, y, 12)
    local wet = (y - 118) / 25
    if h < wet * 0.9 then P.set(img, x, y, (x <= 15) and "olive3" or ((h < 0.3) and "leaf2" or "olive2")) end
  end end
  for y = 136, 143 do P.set(img, 17, y, "leaf1"); P.set(img, 18, y, "leaf1") end
  for _, y in ipairs({ 92, 94 }) do P.hline(img, 13, 19, y, "sand3"); P.set(img, 13, y, "sand4"); P.set(img, 19, y, "sand2") end
  P.line(img, 19, 95, 21, 101, "sand2"); P.set(img, 21, 102, "sand3")
  -- waterline ripples
  P.hline(img, 10, 13, 143, "sky4"); P.hline(img, 19, 23, 143, "steel4"); P.set(img, 8, 143, "steel3"); P.set(img, 25, 143, "steel3")
  P.hline(img, 11, 13, 142, "steel3"); P.set(img, 19, 142, "steel3")
  -- board: two planks, x0..31, y14..42
  local by0, by1 = 14, 42
  P.plankH(img, 0, by0, 32, 15, { ramp = "dirt", base = 3, seed = 3 })
  P.plankH(img, 0, by0 + 15, 32, 14, { ramp = "dirt", base = 3, seed = 9 })
  -- yellow paint (weathered), lit top-left
  for y = by0, by1 do for x = 0, 31 do
    local h = hash(x, y, 21)
    local c = "fire4"
    if y == by0 or x == 0 then c = "fire5" end
    if y == by1 or x == 31 then c = "fire3" end
    if y == by0 + 14 then c = "fire3" end                     -- plank seam
    if y == by0 + 15 then c = "fire5" end
    if h > 0.93 then c = "sand4" end
    -- peeled patches show the wood
    local peel = (x < 4 and y > 36) or (x > 27 and y < 18) or (x > 22 and x < 26 and y == by0 + 13)
    if not peel then P.set(img, x, y, c) end
  end end
  for _, p in ipairs({ { 1, 39 }, { 2, 40 }, { 30, 15 }, { 28, 16 } }) do P.set(img, p[1], p[2], "dirt2") end
  -- text
  local lw = textW(BIGF, "LOW", 2)
  drawText(img, BIGF, "LOW", math.floor((32 - lw) / 2), by0 + 3, "outline", 2)
  local bw = textW(SMF, "BRANCHES", 1)
  drawText(img, SMF, "BRANCHES", math.floor((32 - bw) / 2), by0 + 13, "outline", 1)
  -- !v!
  for k = 0, 4 do for xx = 11 + k, 20 - k do P.set(img, xx, by0 + 20 + k, (k == 0) and "red3" or "red2") end end
  for k = 1, 3 do P.set(img, 11 + k, by0 + 20 + k - 1, "red4") end
  drawText(img, SMF, "!", 7, by0 + 20, "red2"); drawText(img, SMF, "!", 24, by0 + 20, "red2")
  -- nails
  for _, p in ipairs({ { 2, 16 }, { 29, 16 }, { 2, 39 }, { 29, 39 } }) do P.nail(img, p[1], p[2]) end
  -- post top + lantern
  P.fill(img, 13, 11, 7, 3, "dirt3"); P.hline(img, 13, 19, 11, "dirt4"); P.hline(img, 13, 19, 13, "dirt1")
  -- lantern: base y10, globe y3..9, cap y1..2, bail y0
  P.fill(img, 13, 9, 7, 2, "steel2"); P.hline(img, 13, 19, 9, "steel3")
  P.vline(img, 13, 3, 8, "steel2"); P.vline(img, 19, 3, 8, "steel1")
  for y = 3, 8 do for x = 14, 18 do
    local c = "fire3"
    local dx, dy = x - 16, y - 6
    if dx * dx + dy * dy <= 2 then c = "fire5" elseif dx * dx + dy * dy <= 5 then c = "fire4" end
    P.set(img, x, y, c)
  end end
  P.set(img, 16, 5, "fire6"); P.set(img, 16, 6, "fire6"); P.set(img, 15, 4, "fire5")
  P.fill(img, 14, 1, 5, 2, "steel3"); P.hline(img, 14, 18, 1, "steel4"); P.set(img, 16, 0, "steel3")
  P.set(img, 15, 0, "steel2"); P.set(img, 17, 0, "steel2")
  -- warm light falling on the board top and the post top
  for x = 10, 22 do if P.get(img, x, by0) == "fire5" then P.set(img, x, by0, "fire6") end end
  P.set(img, 14, 11, "fire4"); P.set(img, 18, 11, "fire3")
  P.selout(img)
end
K.build(P.spec("prop_sign_branch", 32, 144, { { tag = "prop_sign_branch_idle", ms = 100, frames = one(signBranch) } }))

-------------------------------------------------------------------------------
-- prop_paddlewheel 128x104: the BAYOU QUEEN's red sternwheel, seen side-on with a little oblique depth (the far
-- wheel frame is offset up-right), so the 12 bucket planks read as long boards between the two frames.
-- Near wheel centre (62,54), bucket tips reach r=49 (the bucket at the bottom touches row 103). Iron hub, water
-- cascading off the rising (left/stern) side.
-- spin: 8 frames @70, clockwise (bottom moves left = pushes water aft), 11.25 deg per frame = 3/8 of the bucket
-- spacing: the rotation direction reads clearly and the loop is seamless (90 deg per loop).
-------------------------------------------------------------------------------
local PW_CX, PW_CY, PW_OX, PW_OY = 62, 54, 7, -3
local NB = 12
local function adiff(a, b) return math.abs(((a - b + math.pi) % (2 * math.pi)) - math.pi) end
local function paddle(f)
  return function(img)
    local base = f * (math.pi / 2) / 8 + 0.12
    local L = { -0.62, -0.78 }
    local function ang(k) return base + k * 2 * math.pi / NB end
    -- polar helper around a centre
    local function polar(x, y, cx, cy)
      local dx, dy = x - cx, y - cy
      local d = math.sqrt(dx * dx + dy * dy)
      local a = math.atan(dy, dx)
      local best, bk = 9, 0
      for k = 0, NB - 1 do local da = adiff(a, ang(k)); if da < best then best, bk = da, k end end
      local ak = ang(bk)
      local side = ((a - ak + math.pi) % (2 * math.pi)) - math.pi
      local ux, uy = (d > 0) and dx / d or 0, (d > 0) and dy / d or 0
      return d, a, best * d, ak, side, ux * L[1] + uy * L[2]
    end
    -- wheel frame (rim, ring, arms, braces) around (cx,cy); far = darker, no highlights
    local function frame(cx, cy, far)
      for y = 0, 103 do for x = 0, 127 do
        local d, a, perp, ak, side, litOut = polar(x, y, cx, cy)
        local nx, ny = -math.sin(ak), math.cos(ak)
        local sideLit = ((side > 0) and 1 or -1) * (nx * L[1] + ny * L[2])
        local c
        if d >= 38.5 and d <= 43.3 then                                        -- outer rim
          if d > 42.4 then c = (litOut > 0.25) and "red4" or ((litOut < -0.4) and "red1" or "red2")
          elseif d < 39.4 then c = (litOut < -0.25) and "red3" or "red1"
          else c = (litOut > 0.55) and "red4" or "red3" end
          if math.abs(d - 41) < 0.5 and hash(math.floor(math.deg(a) / 6), 0, 2) > 0.6 then c = "red2" end   -- plank joints
        elseif d >= 21.5 and d <= 25 then                                      -- inner ring
          if d > 24.2 then c = (litOut > 0.25) and "red4" or "red2"
          elseif d < 22.3 then c = (litOut < -0.25) and "red3" or "red1"
          else c = "red3" end
        elseif d >= 7 and d < 39 and perp <= 2.1 then                          -- arms
          if perp > 1.2 then c = (sideLit > 0) and "red4" or "red1" else c = "red3" end
          if d > 30.5 and d < 32 then c = "red2" end
        elseif d > 25 and d < 38.5 and side > 0 then                           -- one diagonal brace per bay
          local frac = (d - 25) / 13.5
          if adiff(a, ak + frac * (2 * math.pi / NB)) * d < 0.75 then c = "red2" end
        end
        if c then
          if far then c = ({ red4 = "red2", red3 = "red1", red2 = "red1", red1 = "outline" })[c] end
          P.set(img, x, y, c)
        end
      end end
    end
    frame(PW_CX + PW_OX, PW_CY + PW_OY, true)
    -- axle between the hubs
    P.line(img, PW_CX, PW_CY, PW_CX + PW_OX, PW_CY + PW_OY, nil, function(x, y)
      P.disc(img, x, y, 3, "steel2"); P.set(img, x - 1, y - 2, "steel3") end)
    -- bucket boards: sweep each bucket's radial rectangle from the far frame to the near one
    for k = 0, NB - 1 do
      local a = ang(k)
      local ca, sa = math.cos(a), math.sin(a)
      -- the visible broad face: the tangential normal that points right/up (cabinet depth goes up-right)
      local nx, ny = -sa, ca
      if nx * 1 + ny * -0.5 < 0 then nx, ny = -nx, -ny end
      local faceLit = nx * L[1] + ny * L[2]
      local faceC = (faceLit > 0.3) and "red3" or ((faceLit > -0.4) and "red2" or "red1")
      for step = PW_OX, 0, -1 do
        local t = step / PW_OX
        local ccx, ccy = PW_CX + PW_OX * t, PW_CY + PW_OY * t
        for r = 36, 49 do for w = -2, 2 do
          local x = math.floor(ccx + ca * r + nx * w + 0.5)
          local y = math.floor(ccy + sa * r + ny * w + 0.5)
          if y >= 0 and y <= 103 then
            local c = faceC
            if step == 0 then                                                  -- near end grain
              c = "red3"
              if w == -2 then c = "red1" elseif w == 2 then c = "red4" end
              if r == 49 then c = (ca * L[1] + sa * L[2] > 0.1) and "red4" or "red2" end
              if r == 43 or r == 44 then c = "steel3" end                      -- iron strap
            else
              if r == 49 then c = "red2" end
              if w == 2 and step < PW_OX then c = (faceLit > 0.3) and "red4" or "red3" end
              if (r == 43 or r == 44) and w == 2 then c = "steel2" end
            end
            P.set(img, x, y, c)
            -- fill rounding gaps along the sweep
            if step > 0 then P.under(img, x + 1, y, c) end
          end
        end end
      end
    end
    frame(PW_CX, PW_CY, false)
    -- hub with flange bolts (turn with the wheel)
    for y = PW_CY - 9, PW_CY + 9 do for x = PW_CX - 9, PW_CX + 9 do
      local dx, dy = x - PW_CX, y - PW_CY
      local d = math.sqrt(dx * dx + dy * dy)
      if d <= 8.4 then
        local lo = (d > 0) and (dx * L[1] + dy * L[2]) / d or 0
        local c
        if d > 7.4 then c = "steel1"
        elseif d > 5.2 then c = (lo > 0.3) and "steel4" or ((lo < -0.3) and "steel2" or "steel3")
        elseif d > 2.6 then c = (lo > 0.2) and "steel3" or "steel2"
        elseif d > 1.4 then c = "steel4" else c = "outline" end
        P.set(img, x, y, c)
      end
    end end
    for k = 0, NB - 1 do
      local a = ang(k)
      local ca, sa = math.cos(a), math.sin(a)
      if k % 2 == 0 then P.set(img, math.floor(PW_CX + ca * 6.3 + 0.5), math.floor(PW_CY + sa * 6.3 + 0.5), "steel5") end
      P.set(img, math.floor(PW_CX + ca * 23.3 + 0.5), math.floor(PW_CY + sa * 23.3 + 0.5), "steel4")
      P.set(img, math.floor(PW_CX + ca * 40.8 + 0.5), math.floor(PW_CY + sa * 40.8 + 0.5), "steel4")
      -- wet glints on the upper-left bucket ends
      if ca * L[1] + sa * L[2] > 0.35 then P.set(img, math.floor(PW_CX + ca * 48 + 0.5), math.floor(PW_CY + sa * 48 + 0.5), "sky5") end
    end
    P.set(img, PW_CX - 1, PW_CY - 1, "steel5")
    -- water pouring off the buckets on the rising (left) side: sheets that drift aft (left) and break into drops
    local phase = f * 3                                       -- pattern moves 3 px/frame, period 24
    for k = 0, NB - 1 do
      local a = ang(k) % (2 * math.pi)
      local deg = math.deg(a)
      local ca, sa = math.cos(a), math.sin(a)
      if deg > 135 and deg < 258 then
        local str = math.sin(math.rad((deg - 135) / 123 * 180))
        local tx = math.floor(PW_CX + ca * 47 + 0.5)
        local ty = math.floor(PW_CY + sa * 47 + 0.5)
        local wsheet = 2 + math.floor(str * 2.5)
        for y = ty + 1, 103 do
          local dd = y - ty - 1
          local xc = tx - math.floor(dd * 0.22) + math.floor(math.sin(dd * 0.4 + k) * 0.6)
          local ww = wsheet + math.floor(dd / 16)
          for i = 0, ww - 1 do
            local xx = xc - math.floor(ww / 2) + i
            local seg = (y - phase + k * 7 + i * 2) % 12
            local solid = dd < 4 + str * 9
            local keep
            if solid then keep = true
            elseif dd < 28 + str * 10 then keep = seg < 5
            else keep = (y - phase + i * 5 + k) % 8 == 0 end
            if keep then
              local c = (i == 0) and "sky5" or ((i == ww - 1) and "steel4" or "sky4")
              if (seg < 2 or (not solid and seg == 4)) and i <= 1 then c = "white" end
              P.set(img, xx, y, c)
            end
          end
        end
      elseif deg >= 258 or deg < 30 then
        -- a few drips falling off the top / descending buckets
        local tx = math.floor(PW_CX + ca * 46 + 0.5)
        local ty = math.floor(PW_CY + sa * 46 + 0.5)
        for j = 0, 1 do
          local yy = ty + 3 + ((phase + j * 12 + k * 5) % 24)
          if yy <= 103 then P.set(img, tx, yy, (j == 0) and "sky5" or "sky4"); P.set(img, tx, yy + 1, "steel4") end
        end
      end
    end
    -- churn where the buckets lift out of the river (lower left) and bite in (lower right)
    local rnd = P.rng(100 + f)
    for _ = 1, 34 do
      local sx, sy = rnd(4, 44), rnd(78, 103)
      if rnd() < (sy - 70) / 34 then
        P.set(img, sx, sy, (rnd() < 0.35) and "white" or ((rnd() < 0.5) and "sky5" or "sky4"))
        if rnd() < 0.5 then P.set(img, sx + 1, sy, "sky4") end
      end
    end
    for _ = 1, 12 do P.set(img, rnd(84, 112), rnd(88, 103), (rnd() < 0.5) and "sky5" or "steel4") end
    P.selout(img)
  end
end
K.build(P.spec("prop_paddlewheel", 128, 104, {
  { tag = "prop_paddlewheel_spin", ms = 70, frames = frames(paddle, 8) },
}))

-------------------------------------------------------------------------------
-- prop_crane_hook 16x56: hook block on a wire cable. ORIGIN TOP-CENTRE (0.5, 0) at the boom tip: the cable
-- leaves the top edge at x 8. idle: 6 frames, slow pendulum swing (block offset -2..+2 px).
-------------------------------------------------------------------------------
local function craneHook(f)
  local off = ({ -2, 0, 2, 2, 0, -2 })[f + 1]
  return function(img)
    local bx = 3 + off            -- block left (10 wide)
    -- twin-fall wire rope from the boom tip down to the sheave
    P.line(img, 7, 0, 6 + off, 31, nil, function(x, y) P.set(img, x, y, (y % 3 == 0) and "steel4" or "steel3") end)
    P.line(img, 8, 0, 9 + off, 31, nil, function(x, y) P.set(img, x, y, (y % 3 == 1) and "steel3" or "steel1") end)
    -- sheave (top, half wheel)
    P.ellipse(img, bx + 5, 33, 4, 2, "steel3"); P.hline(img, bx + 2, bx + 7, 31, "steel4"); P.set(img, bx + 3, 31, "steel5")
    P.hline(img, bx + 1, bx + 9, 34, "steel1")
    -- cheek plates: yellow block with black hazard chevrons
    P.fill(img, bx, 35, 10, 10, "fire4")
    P.hazard(img, bx + 1, 37, 8, 6, { p = 4, a = "fire4", b = "outline", a_hi = "fire5", a_lo = "fire3" })
    P.hline(img, bx, bx + 9, 35, "fire5"); P.hline(img, bx, bx + 9, 36, "fire4")
    P.hline(img, bx, bx + 9, 43, "fire3"); P.hline(img, bx, bx + 9, 44, "fire2")
    P.vline(img, bx, 35, 44, "fire5"); P.vline(img, bx + 9, 35, 44, "fire2")
    P.set(img, bx, 35, "fire6")
    -- axle boss with nut
    P.box(img, bx + 3, 38, 4, 4, "steel", 3); P.set(img, bx + 4, 39, "steel5"); P.set(img, bx + 5, 40, "steel1")
    -- swivel + shank
    P.fill(img, bx + 3, 45, 4, 2, "steel2"); P.hline(img, bx + 3, bx + 6, 45, "steel4")
    P.vline(img, bx + 4, 47, 48, "steel4"); P.vline(img, bx + 5, 47, 48, "steel2")
    -- the hook: a fat J opening to the right, point up
    local hook = {
      "..xy.....",
      "..xy.....",
      ".xxy.....",
      "xxy....z.",
      "xy.....zz",
      "xy.....zz",
      "xyy...zz.",
      ".xyyyzz..",
      "..zzzz...",
    }
    local hx = bx + 2
    for j, row in ipairs(hook) do for i = 1, #row do
      local ch = row:sub(i, i)
      local c = (ch == "x") and "steel4" or ((ch == "y") and "steel3" or ((ch == "z") and "steel2" or nil))
      if c then P.set(img, hx + i - 1, 47 + j - 1, c) end
    end end
    P.set(img, hx, 51, "steel5"); P.set(img, hx + 7, 50, "steel4")
    P.selout(img)
  end
end
K.build(P.spec("prop_crane_hook", 16, 56, {
  { tag = "prop_crane_hook_idle", ms = 140, frames = frames(craneHook, 6) },
}, { anchor = "top-center" }))

-------------------------------------------------------------------------------
-- prop_fuel_cell 16x20: Regime fuel-cell canister in a steel cage frame, glowing weird4/weird5.
-- Flat top plate (rows 0..1) and base (rows 17..19) so they stack. idle: 4 frames glow pulse.
-------------------------------------------------------------------------------
local function fuelCell(f)
  local lvl = ({ 0, 1, 2, 1 })[f + 1]
  return function(img)
    -- canister shell x3..12, y2..17 (steel), domed caps
    for y = 3, 16 do
      P.set(img, 3, y, "steel3"); P.set(img, 4, y, "steel4"); P.set(img, 11, y, "steel2"); P.set(img, 12, y, "steel1")
    end
    P.hline(img, 4, 11, 2, "steel4"); P.hline(img, 3, 12, 3, "steel3"); P.set(img, 5, 2, "steel5")
    P.hline(img, 3, 12, 16, "steel2"); P.hline(img, 4, 11, 17, "steel1")
    -- glass window x5..10, y4..15 with the glowing fluid
    local body = ({ "leaf4", "weird4", "weird4" })[lvl + 1]
    local core = ({ "weird4", "weird5", "weird5" })[lvl + 1]
    for y = 4, 15 do for x = 5, 10 do
      local c = body
      if x >= 7 and x <= 8 then c = core end
      if lvl == 2 and (x == 6 or x == 9) then c = "weird5" end
      if x == 10 then c = (lvl == 0) and "leaf3" or "leaf4" end
      if y == 4 then c = (lvl == 0) and "leaf3" or "weird4" end                 -- meniscus / top shadow
      P.set(img, x, y, c)
    end end
    P.vline(img, 5, 5, 14, (lvl == 0) and "weird4" or "ink6")                    -- glass reflection
    if lvl == 2 then P.vline(img, 7, 7, 11, "white") end
    -- bubbles rise
    P.set(img, 8, 14 - ((f * 3) % 10), (lvl == 0) and "weird5" or "white")
    P.set(img, 6, 14 - ((f * 3 + 5) % 10), "weird5")
    -- clamp bands over the shell
    for _, y in ipairs({ 6, 13 }) do P.hline(img, 3, 12, y, "steel2"); P.set(img, 3, y, "steel4"); P.set(img, 12, y, "steel1") end
    -- cage frame: top plate, base, corner posts
    P.fill(img, 0, 0, 16, 2, "steel3"); P.hline(img, 0, 15, 0, "steel4"); P.hline(img, 0, 15, 1, "steel2"); P.set(img, 0, 0, "steel5")
    P.fill(img, 0, 18, 16, 2, "steel2"); P.hline(img, 0, 15, 18, "steel3"); P.hline(img, 0, 15, 19, "steel1")
    for _, x in ipairs({ 0, 14 }) do P.vline(img, x, 2, 17, "steel3"); P.vline(img, x + 1, 2, 17, "steel1") end
    P.vline(img, 0, 2, 17, "steel4")
    -- diagonal back-braces glimpsed beside the canister
    P.set(img, 2, 4, "steel1"); P.set(img, 2, 15, "steel1"); P.set(img, 13, 4, "steel1"); P.set(img, 13, 15, "steel1")
    -- status light on the top plate pulses with the glow; warning stripe on the base
    P.set(img, 11, 0, (lvl == 0) and "leaf4" or "weird5")
    P.hazard(img, 4, 18, 8, 1, { p = 4, a = "fire3", b = "outline" })
    P.selout(img)
  end
end
K.build(P.spec("prop_fuel_cell", 16, 20, {
  { tag = "prop_fuel_cell_idle", ms = 160, frames = frames(fuelCell, 4) },
}))

-------------------------------------------------------------------------------
-- prop_life_ring 14x14: red-and-white life ring with grab rope, hung on a peg (wall decor).
-------------------------------------------------------------------------------
local function lifeRing(img)
  local cx, cy = 6.5, 7.5
  for y = 0, 13 do for x = 0, 13 do
    local dx, dy = x - cx, y - cy
    local d = math.sqrt(dx * dx + dy * dy)
    if d <= 6.3 and d >= 2.6 then
      local a = math.atan(dy, dx)
      local seg = math.floor(((a + math.pi / 4) % (2 * math.pi)) / (math.pi / 2))
      local red = (seg % 2 == 0)
      local lit = (dx * -0.6 + dy * -0.8) / d
      -- tube shading: outer upper-left lit, inner lower-right lit
      local r = (d - 2.6) / 3.7
      local b = lit * (r - 0.5) * 2
      local c
      if red then c = (b > 0.35) and "red4" or ((b < -0.35) and "red2" or "red3")
      else c = (b > 0.35) and "ink6" or ((b < -0.35) and "ink4" or "ink5") end
      P.set(img, x, y, c)
    end
  end end
  -- grab rope (4 lashings across the tube)
  for _, p in ipairs({ { 6, 1 }, { 7, 1 }, { 12, 7 }, { 12, 8 }, { 6, 13 }, { 7, 13 }, { 1, 7 }, { 1, 8 } }) do P.set(img, p[1], p[2], "sand3") end
  P.set(img, 6, 2, "sand2"); P.set(img, 11, 8, "sand2"); P.set(img, 7, 12, "sand2"); P.set(img, 2, 8, "sand2")
  -- peg it hangs from
  P.set(img, 6, 0, "steel4"); P.set(img, 7, 0, "steel2")
  P.selout(img)
end
K.build(P.spec("prop_life_ring", 14, 14, { { tag = "prop_life_ring_idle", ms = 100, frames = one(lifeRing) } }))

-------------------------------------------------------------------------------
-- prop_queen_board 112x18: the riverboat's name board "BAYOU QUEEN", gold Clarendon letters on red planks,
-- scroll ends, battered (chips, cracks, bullet holes); a Regime spiral stencil sprayed over the right end.
-------------------------------------------------------------------------------
local QF = {
  B = { "xxxxx.", ".xx.xx", ".xx.xx", ".xxxx.", ".xx.xx", ".xx.xx", "xxxxx." },
  A = { "..xx..", ".xxxx.", ".x.xx.", "xx..xx", "xxxxxx", "xx..xx", "xx..xx" },
  Y = { "xx..xx", "xx..xx", ".xxxx.", "..xx..", "..xx..", "..xx..", ".xxxx." },
  O = { ".xxxx.", "xx..xx", "xx..xx", "xx..xx", "xx..xx", "xx..xx", ".xxxx." },
  U = { "xx..xx", "xx..xx", "xx..xx", "xx..xx", "xx..xx", "xx..xx", ".xxxx." },
  Q = { ".xxxx.", "xx..xx", "xx..xx", "xx..xx", "xx.xxx", "xx..xx", ".xxxxx" },
  E = { "xxxxxx", ".xx..x", ".xx...", ".xxxx.", ".xx...", ".xx..x", "xxxxxx" },
  N = { "xx..xx", "xxx.xx", "xxxxxx", "xx.xxx", "xx..xx", "xx..xx", "xx..xx" },
  [" "] = { "....", "....", "....", "....", "....", "....", "...." },
}
local function queenBoard(img)
  local x0, x1, y0, y1 = 9, 102, 2, 15
  -- planks (red painted wood)
  for y = y0, y1 do for x = x0, x1 do
    local c = "red3"
    if y == y0 then c = "red4" elseif y == y1 then c = "red1" elseif y == y1 - 1 then c = "red2" end
    if y == 8 then c = "red2" elseif y == 9 then c = "red4" end                    -- plank seam
    if c == "red3" and hash(math.floor(x / 4), y, 2) > 0.85 then c = "red2" end      -- grain
    P.set(img, x, y, c)
  end end
  -- scroll ends: rolled banner curls (red with gold spiral)
  local function curl(cx, flip, plain)
    for y = 0, 17 do for x = cx - 9, cx + 9 do
      local dx, dy = x - cx, y - 8.5
      local d = math.sqrt(dx * dx + dy * dy)
      if d <= 7.6 then
        local lit = (dx * -0.6 + dy * -0.8) / math.max(d, 0.1)
        local c = (d > 6.6) and ((lit > 0.2) and "red4" or "red1") or "red3"
        if d < 6.6 and lit < -0.4 then c = "red2" end
        P.set(img, x, y, c)
      end
    end end
    -- gold spiral
    for t = 0, plain and -1 or 60 do
      local a = t * 0.24
      local r = 1 + t * 0.085
      local sx = cx + math.floor(math.cos(a) * r * flip + 0.5)
      local sy = math.floor(8.5 + math.sin(a) * r + 0.5)
      P.set(img, sx, sy, (math.sin(a) < 0) and "sand5" or "sand3")
    end
  end
  curl(8, 1); curl(103, -1, true)
  -- gold trim line inset
  P.hline(img, 15, 96, 3, "sand3"); P.hline(img, 15, 96, 14, "dirt4")
  for x = 15, 96 do if x % 2 == 0 then P.set(img, x, 3, "sand4") end end
  -- lettering, centred
  local s = "BAYOU QUEEN"
  local tw = 0; for i = 1, #s do tw = tw + #QF[s:sub(i, i)][1] + 1 end; tw = tw - 1
  local tx = math.floor((112 - tw) / 2)
  local ty = 5
  local function glyphs(fn)
    local x = tx
    for i = 1, #s do
      local g = QF[s:sub(i, i)]
      for j, row in ipairs(g) do for k = 1, #row do if row:sub(k, k) == "x" then fn(x + k - 1, ty + j - 1, j, k) end end end
      x = x + #g[1] + 1
    end
  end
  glyphs(function(x, y)                                                               -- dark keyline + drop shadow
    for _, d in ipairs({ { 1, 0 }, { -1, 0 }, { 0, 1 }, { 0, -1 }, { 1, 1 } }) do P.set(img, x + d[1], y + d[2], "red1") end
  end)
  glyphs(function(x, y, j, k)
    local c = (j <= 2) and "sand5" or ((j <= 5) and "sand4" or "dirt4")
    if j == 3 and k % 2 == 0 then c = "sand4" end
    if hash(x, y, 51) > 0.97 then c = "dirt3" end                                       -- chipped gilding
    P.set(img, x, y, c)
  end)
  -- damage: crack, missing corner chunk, bullet holes, scrapes
  P.line(img, 40, 2, 44, 7, "red1"); P.line(img, 44, 7, 46, 8, "red2")
  for _, p in ipairs({ { 30, 12 }, { 71, 4 }, { 84, 11 } }) do
    P.set(img, p[1], p[2], "outline"); P.set(img, p[1] + 1, p[2], "red1"); P.set(img, p[1], p[2] + 1, "red1"); P.set(img, p[1] - 1, p[2] - 1, "red4")
  end
  for x = 20, 26 do P.set(img, x, 13, (x % 2 == 0) and "dirt3" or "red2") end
  for _, p in ipairs({ { 10, 15 }, { 11, 15 }, { 12, 15 }, { 11, 14 }, { 12, 14 }, { 13, 15 } }) do P.set(img, p[1], p[2], nil) end
  P.set(img, 12, 13, "dirt3"); P.set(img, 13, 14, "dirt2")
  -- hanging brackets
  for _, x in ipairs({ 22, 89 }) do P.fill(img, x, 0, 2, 3, "steel3"); P.set(img, x, 0, "steel4"); P.set(img, x + 1, 2, "steel1") end
  -- Regime spiral stencil sprayed over the right end (single colour + overspray)
  local eye = P.EYE.m
  local ex, ey = 95, 4
  for j, row in ipairs(eye) do for i = 1, #row do
    local ch = row:sub(i, i)
    if ch == "o" or ch == "r" then
      if hash(i, j, 61) < 0.92 then P.set(img, ex + i - 1, ey + j - 1, "ink5") end
    end
  end end
  local rnd = P.rng(616)
  for _ = 1, 26 do
    local x, y = ex - 2 + rnd(0, 18), ey - 2 + rnd(0, 12)
    if P.solid(img, x, y) and P.get(img, x, y) ~= "ink5" then P.set(img, x, y, "ink4") end
  end
  -- a drip from the stencil
  P.vline(img, 101, 13, 15, "ink4")
  P.selout(img)
end
K.build(P.spec("prop_queen_board", 112, 18, { { tag = "prop_queen_board_idle", ms = 100, frames = one(queenBoard) } }))

-------------------------------------------------------------------------------
-- prop_bell 14x16: brass ship's bell hanging from an iron wall bracket (wall on the left), clapper at the bottom.
-------------------------------------------------------------------------------
local function bell(img)
  -- bracket: wall plate x0..1 y0..6, arm along y1..2 to x8, then a curl brace
  P.fill(img, 0, 0, 2, 7, "steel2"); P.vline(img, 0, 0, 6, "steel3"); P.set(img, 0, 1, "steel4"); P.set(img, 0, 5, "steel4")
  P.hline(img, 2, 8, 1, "steel3"); P.hline(img, 2, 8, 2, "steel1"); P.set(img, 8, 1, "steel4")
  P.line(img, 2, 5, 5, 3, "steel2")
  -- bell body: rows -> half widths
  local rows = { [3] = 1, [4] = 2, [5] = 3, [6] = 3, [7] = 3, [8] = 3, [9] = 4, [10] = 4, [11] = 5, [12] = 6 }
  local cx = 7.5
  for y = 3, 12 do
    local hw = rows[y]
    for x = math.floor(cx - hw + 0.5), math.floor(cx + hw - 0.5) do
      local t = (x - (cx - hw)) / (2 * hw)
      local c
      if t < 0.18 then c = "sand3" elseif t < 0.38 then c = "sand5" elseif t < 0.55 then c = "sand4" elseif t < 0.8 then c = "dirt4" else c = "dirt3" end
      if y == 12 then c = (t < 0.5) and "sand4" or "dirt3" end
      if y == 11 then c = (t < 0.3) and "sand4" or c end
      P.set(img, x, y, c)
    end
  end
  P.set(img, 7, 3, "sand4"); P.set(img, 8, 3, "dirt4")
  P.hline(img, 4, 11, 10, "dirt3"); P.set(img, 5, 10, "sand4")                          -- sound bow ring
  -- verdigris + moon glint
  P.set(img, 10, 8, "olive3"); P.set(img, 6, 6, "ink6")
  -- mouth + clapper
  P.hline(img, 3, 12, 13, "dirt1")
  P.fill(img, 7, 13, 2, 2, "steel3"); P.set(img, 7, 13, "steel4"); P.set(img, 8, 14, "steel2")
  P.set(img, 7, 15, "sand3")                                                           -- lanyard knot
  P.selout(img)
end
K.build(P.spec("prop_bell", 14, 16, { { tag = "prop_bell_idle", ms = 100, frames = one(bell) } }))

-------------------------------------------------------------------------------
-- prop_buoy 14x24: red channel buoy (squat float, open lattice tower, lamp). Canvas bottom = waterline.
-- idle: 2 frames @400 (lamp on low / lamp off bobbed up 1 px). Lamp centre ~ (6,3) on frame 0.
-------------------------------------------------------------------------------
local function buoy(f)
  return function(img)
    local b = f - 1    -- frame 0 sits 1 px lower, frame 1 bobs up (lamp off)
    local function S(x, y, c) P.set(img, x, y - b, c) end
    -- squat float y15..22 (x0..13) with a rounded shoulder
    for y = 14, 22 do
      local hw = (y == 14) and 5 or ((y == 15) and 6 or 7)
      for x = 7 - hw, 6 + hw do
        local t = (x - (7 - hw)) / (2 * hw - 1)
        local c = (t < 0.18) and "red4" or ((t < 0.6) and "red3" or ((t < 0.85) and "red2" or "red1"))
        if y == 17 or y == 18 then c = (t < 0.18) and "ink5" or ((t < 0.6) and "ink4" or ((t < 0.85) and "ink3" or "ink2")) end
        if y >= 21 then c = (t < 0.4) and "red2" or "red1" end
        if y == 14 then c = (t < 0.4) and "red4" or "red3" end
        if hash(x, y, 70) > 0.86 and y >= 19 and y <= 20 then c = "dirt3" end
        S(x, y, c)
      end
    end
    -- open lattice tower y4..13: two legs, X-braces, a mid ring
    P.line(img, 2, 13 - b, 4, 4 - b, "steel3"); P.line(img, 11, 13 - b, 9, 4 - b, "steel2")
    P.line(img, 3, 9 - b, 10, 12 - b, "steel1"); P.line(img, 3, 12 - b, 10, 9 - b, "steel2")
    P.hline(img, 3, 10, 8 - b, "steel3"); P.hline(img, 2, 11, 13 - b, "steel2"); P.set(img, 2, 13 - b, "steel4")
    P.line(img, 4, 7 - b, 9, 5 - b, "steel1")
    -- lamp platform + lantern
    P.hline(img, 3, 10, 4 - b, "steel4"); P.set(img, 10, 4 - b, "steel2")
    local on = (f == 0)
    P.fill(img, 5, 1 - b, 4, 3, on and "red4" or "red2")
    if on then P.set(img, 6, 1 - b, "fire6"); P.set(img, 7, 1 - b, "fire5"); P.set(img, 6, 2 - b, "red5"); P.set(img, 5, 1 - b, "red5")
    else P.set(img, 5, 1 - b, "red3") end
    P.vline(img, 5, 1 - b, 3 - b, on and "red5" or "red3")
    P.hline(img, 5, 8, 0 - b, "steel3")
    P.selout(img)
    -- waterline: wet band + ripple ring on the bottom row
    for x = 0, 13 do P.set(img, x, 23, nil) end
    if f == 0 then
      P.hline(img, 1, 12, 23, "steel3"); P.set(img, 0, 23, "sky4"); P.set(img, 13, 23, "sky4"); P.set(img, 3, 23, "sky5"); P.set(img, 9, 23, "sky4")
    else
      P.hline(img, 0, 13, 23, "steel3"); P.set(img, 1, 23, "sky5"); P.set(img, 12, 23, "sky4"); P.set(img, 6, 23, "sky4")
      P.hline(img, 1, 12, 22, "red1")
    end
  end
end
K.build(P.spec("prop_buoy", 14, 24, { { tag = "prop_buoy_idle", ms = 400, frames = frames(buoy, 2) } }))

-------------------------------------------------------------------------------
-- prop_boiler_lamp 10x14: caged bulkhead work lamp (hangs from a mounting plate at the top). Bulb centre (4,8).
-- idle: 4 frames @120 flicker.
-------------------------------------------------------------------------------
local function boilerLamp(f)
  local lv = ({ 2, 1, 2, 0 })[f + 1]
  return function(img)
    P.fill(img, 2, 0, 6, 2, "steel3"); P.hline(img, 2, 7, 0, "steel4"); P.set(img, 7, 1, "steel1")
    P.fill(img, 4, 2, 2, 1, "steel2")
    P.fill(img, 2, 3, 6, 2, "steel2"); P.hline(img, 2, 7, 3, "steel3"); P.set(img, 2, 3, "steel4")
    -- bulb
    local core, mid, edge = ({ "fire4", "fire5", "fire6" })[lv + 1], ({ "fire3", "fire4", "fire5" })[lv + 1], ({ "fire2", "fire3", "fire4" })[lv + 1]
    P.ellipse(img, 4, 8, 2, 3, edge)
    P.fill(img, 3, 6, 3, 4, mid)
    P.fill(img, 4, 7, 1, 2, core); if lv == 2 then P.set(img, 3, 7, "fire6") end
    -- cage wires
    for y = 5, 12 do P.set(img, 1, y, "steel3"); P.set(img, 8, y, "steel1") end
    for _, y in ipairs({ 7, 10 }) do for x = 1, 8 do if x == 1 or x == 8 or (x + y) % 2 == 0 then P.set(img, x, y, (x < 5) and "steel3" or "steel2") end end end
    P.vline(img, 4, 5, 12, nil)
    for y = 5, 12 do if y % 2 == 1 then P.set(img, 4, y, "steel2") end end
    P.fill(img, 3, 12, 4, 2, "steel2"); P.hline(img, 3, 6, 12, "steel3"); P.set(img, 3, 12, "steel4")
    P.selout(img)
  end
end
K.build(P.spec("prop_boiler_lamp", 10, 14, { { tag = "prop_boiler_lamp_idle", ms = 120, frames = frames(boilerLamp, 4) } }))

-------------------------------------------------------------------------------
-- prop_rope_coil 16x8: coil of mooring rope on deck with a loose end trailing right.
-------------------------------------------------------------------------------
local function ropeCoil(img)
  local G = {
    "....aaaaaaa.....",
    "..aaahhhhhaaa...",
    ".aaahhhhhhhaaa..",
    ".bbbaaaaaaabbb..",
    "bbbbbbbbbbbbbb..",
    "cccccccccccccc..",
    "cccccccccccccccc",
    ".ddddddddddddddd",
  }
  for y, row in ipairs(G) do for x = 1, #row do
    local ch = row:sub(x, x)
    local X, Y = x - 1, y - 1
    if ch ~= "." then
      local c
      if ch == "h" then c = (Y == 1) and "dirt1" or "outline"
      else
        local tw = (X + Y * 2) % 4                                         -- diagonal rope twist
        c = (tw < 2) and "sand4" or "sand3"
        if tw == 3 then c = "sand2" end
        if ch == "d" then c = (tw < 2) and "sand2" or "sand1" end
        if X >= 12 and ch ~= "d" then c = (tw < 2) and "sand3" or "sand2" end
        if (ch == "b" and Y == 4) or (ch == "c" and Y == 6) then if tw == 0 then c = "sand2" end end
        if ch == "a" and Y == 0 then c = (tw < 2) and "sand5" or "sand4" end
      end
      P.set(img, X, Y, c)
    end
  end end
  -- loops: dark grooves between turns
  for _, y in ipairs({ 4, 6 }) do for x = 1, 13 do if (x + y) % 5 == 0 then P.set(img, x, y, "sand1") end end end
  P.set(img, 14, 6, "sand3"); P.set(img, 15, 6, "sand4"); P.set(img, 15, 7, "sand2")     -- loose end
  P.selout(img)
end
K.build(P.spec("prop_rope_coil", 16, 8, { { tag = "prop_rope_coil_idle", ms = 100, frames = one(ropeCoil) } }))

-------------------------------------------------------------------------------
-- prop_drum_rack 32x24: three oil drums lashed in a timber-and-angle-iron rack on a skid.
-------------------------------------------------------------------------------
local function drumRack(img)
  local function drum(x0, ramp, b, seed)
    -- 9 wide, y4..20
    local cols = { b + 1, b + 1, b + 2, b + 1, b, b, b - 1, b - 1, b - 2 }
    for i = 0, 8 do
      local c = ramp .. math.max(1, math.min(5, cols[i + 1]))
      P.vline(img, x0 + i, 5, 20, c)
    end
    -- lid
    P.hline(img, x0, x0 + 8, 4, ramp .. math.min(5, b + 1)); P.hline(img, x0 + 1, x0 + 7, 3, ramp .. math.min(5, b + 2))
    P.set(img, x0 + 6, 3, ramp .. b); P.set(img, x0 + 2, 3, "steel5")                -- bung
    -- rolling hoops
    for _, y in ipairs({ 9, 15 }) do
      for i = 0, 8 do
        P.set(img, x0 + i, y, ramp .. math.min(5, cols[i + 1] + 1))
        P.set(img, x0 + i, y + 1, ramp .. math.max(1, cols[i + 1] - 1))
      end
    end
    -- rust streaks
    local rnd = P.rng(seed)
    for _ = 1, 3 do local x = x0 + rnd(1, 7); local y = rnd(6, 13); P.vline(img, x, y, y + rnd(2, 5), "dirt3") end
    P.hline(img, x0, x0 + 8, 20, ramp .. math.max(1, b - 2))
  end
  drum(2, "steel", 3, 11)
  drum(11, "dirt", 3, 12)
  drum(20, "steel", 3, 13)
  -- hazard diamond on the middle drum
  P.grid(img, { "..x..", ".xyx.", "xyyyx", ".xyx.", "..x.." }, { x = "outline", y = "fire4" }, 13, 11)
  P.set(img, 15, 13, "outline")
  -- rack: uprights + top rail (timber) + skid
  P.fill(img, 0, 6, 2, 16, "dirt3"); P.vline(img, 0, 6, 21, "dirt4"); P.vline(img, 1, 6, 21, "dirt2")
  P.fill(img, 29, 6, 3, 16, "dirt3"); P.vline(img, 29, 6, 21, "dirt4"); P.vline(img, 31, 6, 21, "dirt2")
  P.plankH(img, 0, 21, 32, 3, { ramp = "dirt", base = 2, seed = 5 })
  P.hline(img, 0, 31, 21, "dirt4")
  -- angle-iron corner plates
  for _, x in ipairs({ 0, 29 }) do P.fill(img, x, 19, 3, 2, "steel3"); P.set(img, x, 19, "steel4"); P.rivet(img, x + 1, 19) end
  -- lashing rope across the drums
  for x = 0, 31 do
    local y = 12 + ((x >= 2 and x <= 28) and 0 or 0)
    P.set(img, x, y, ((x % 3) == 0) and "sand4" or "sand3"); P.set(img, x, y + 1, ((x % 3) == 1) and "sand2" or "sand1")
  end
  P.set(img, 1, 11, "sand3"); P.set(img, 30, 14, "sand2"); P.set(img, 30, 15, "sand3")      -- knots
  P.selout(img)
end
K.build(P.spec("prop_drum_rack", 32, 24, { { tag = "prop_drum_rack_idle", ms = 100, frames = one(drumRack) } }))

-------------------------------------------------------------------------------
-- prop_wheelhouse_light 16x16: small searchlight on a yoke, facing right; lens lit. idle: 2 frames @600.
-- Lens centre ~ (13,7).
-------------------------------------------------------------------------------
local function wheelLight(f)
  return function(img)
    -- pedestal base + post
    P.fill(img, 3, 14, 9, 2, "steel2"); P.hline(img, 3, 11, 14, "steel3"); P.set(img, 3, 14, "steel4"); P.hline(img, 3, 11, 15, "steel1")
    P.fill(img, 6, 12, 3, 2, "steel2"); P.set(img, 6, 12, "steel3")
    -- yoke (U) holding the drum at its trunnion
    P.hline(img, 3, 10, 11, "steel3"); P.hline(img, 3, 10, 12, "steel1")
    P.vline(img, 3, 6, 11, "steel3"); P.vline(img, 4, 7, 11, "steel1")
    -- drum: tapers to the rear, x1..10, y2..10
    for x = 1, 10 do
      local hh = (x <= 2) and 3 or 4
      for y = 6 - hh, 6 + hh do
        local t = (y - (6 - hh)) / (2 * hh)
        local c = (t < 0.2) and "steel4" or ((t < 0.5) and "steel3" or ((t < 0.8) and "steel2" or "steel1"))
        P.set(img, x, y, c)
      end
    end
    P.hline(img, 4, 9, 2, "steel5")
    for _, x in ipairs({ 5, 7 }) do P.vline(img, x, 3, 9, "steel1"); P.set(img, x, 3, "steel3") end   -- cooling fins
    P.set(img, 3, 6, "steel5"); P.set(img, 3, 7, "steel1")                                           -- trunnion bolt
    P.fill(img, 5, 0, 3, 1, "steel3"); P.set(img, 4, 1, "steel3"); P.set(img, 8, 1, "steel2")        -- handle
    -- bezel ring + lit lens at the front (facing right)
    P.vline(img, 11, 1, 11, "steel4"); P.vline(img, 12, 1, 11, "steel2"); P.set(img, 11, 1, "steel5")
    for y = 2, 10 do
      local c = (y <= 3 or y >= 9) and "fire4" or "fire5"
      P.set(img, 13, y, c); P.set(img, 14, y, (y <= 3 or y >= 9) and "fire3" or "fire4")
    end
    P.vline(img, 13, 4, 8, (f == 0) and "fire6" or "fire5")
    P.set(img, 13, (f == 0) and 4 or 6, "white")
    P.set(img, 15, 5, "fire3"); P.set(img, 15, 6, "fire3"); P.set(img, 15, 7, "fire3")
    P.selout(img)
  end
end
K.build(P.spec("prop_wheelhouse_light", 16, 16, { { tag = "prop_wheelhouse_light_idle", ms = 600, frames = frames(wheelLight, 2) } }))
