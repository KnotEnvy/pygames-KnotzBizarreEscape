-- bg_moosezilla 112x88: MOOSEZILLA's distant silhouette behind the lab compound at dusk. Facing LEFT.
-- Bottom-centre anchor (hooves on row 87). Identity from the boss rig: locomotive-box body with smokestack + cab,
-- arched neck, boxy snout + bar jaw, big palmate antlers with knobbed tines, X-jointed mech legs on tread feet.
-- Near-black (outline / ink1 detail / steel1 far parts), steel2 rim on top-left edges, weird4 eyes + chest core.
-- Tags: bg_moosezilla_walk 4 f @180 ms (trot stomp, 1 px bob), bg_moosezilla_roar 3 f @160 ms (hold last).
-- Build: bash tools/build-art.sh art-src/backgrounds/actors/bg_moosezilla.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local W, HH = 112, 88
local OY = 4

local function H(x, y, s)
  local h = (math.floor(x) * 374761393 + math.floor(y) * 668265263 + math.floor(s or 0) * 1442695041) & 0xffffffff
  h = ((h ~ (h >> 13)) * 1274126177) & 0xffffffff
  h = h ~ (h >> 16)
  return h / 4294967296
end

-- material buffers: 1 near mass, 2 near detail, 3 far mass
local function newBuf() return {} end
local function set(b, x, y, m) x, y = math.floor(x + 0.5), math.floor(y + 0.5); b[y * W + x] = (x >= 0 and x < W and y >= 0 and y < HH) and m or nil end
local function get(b, x, y) if x < 0 or y < 0 or x >= W or y >= HH then return nil end return b[y * W + x] end
local function rect(b, x, y, w, h, m) for j = y, y + h - 1 do for i = x, x + w - 1 do set(b, i, j, m) end end end
local function disc(b, cx, cy, r, m) for j = -math.ceil(r), math.ceil(r) do for i = -math.ceil(r), math.ceil(r) do
  if i * i + j * j <= r * r + 0.3 then set(b, cx + i, cy + j, m) end end end end
local function poly(b, pts, m, dx, dy)
  dx = dx or 0; dy = dy or 0
  local minx, maxx, miny, maxy = 1e9, -1e9, 1e9, -1e9
  for _, p in ipairs(pts) do minx = math.min(minx, p[1]); maxx = math.max(maxx, p[1]); miny = math.min(miny, p[2]); maxy = math.max(maxy, p[2]) end
  for y = math.floor(miny), math.ceil(maxy) do for x = math.floor(minx), math.ceil(maxx) do
    local inside, j = false, #pts
    for i = 1, #pts do
      local xi, yi, xj, yj = pts[i][1], pts[i][2], pts[j][1], pts[j][2]
      if ((yi > y + 0.5) ~= (yj > y + 0.5)) and (x + 0.5 < (xj - xi) * (y + 0.5 - yi) / (yj - yi) + xi) then inside = not inside end
      j = i
    end
    if inside then set(b, x + dx, y + dy, m) end
  end end
end
local function thick(b, x0, y0, x1, y1, r, m)
  local n = math.max(1, math.ceil(math.max(math.abs(x1 - x0), math.abs(y1 - y0))))
  for i = 0, n do local t = i / n; disc(b, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, m) end
end
local function line(b, x0, y0, x1, y1, m) thick(b, x0, y0, x1, y1, 0, m) end

-- 2 px wide tine from base (x,y) by (dx,dy) with a round bolt knob on the tip
local function tine(b, x, y, dx, dy, m)
  thick(b, x, y, x + dx, y + dy, 0, m); thick(b, x + 1, y, x + 1 + dx, y + dy, 0, m)
  disc(b, x + dx + 0.5, y + dy - 0.5, 1.2, m)
end

-------------------------------------------------------------------------------
-- parts
-------------------------------------------------------------------------------
local function leg(b, hx, hy, fx, lift, m, seed)
  local fy = 87 - lift
  local kx, ky = (hx + fx) / 2 + 4, (hy + fy) / 2 - 1
  thick(b, hx, hy, kx, ky, 2, m)          -- thigh
  thick(b, kx, ky, fx, fy - 3, 1.5, m)    -- shin
  disc(b, kx, ky, 2.2, m)                 -- knee
  rect(b, math.floor(fx) - 3, fy - 4, 7, 2, m)   -- ankle pad
  rect(b, math.floor(fx) - 5, fy - 2, 11, 3, m)  -- tread foot
  if m == 1 then
    set(b, kx, ky, 2)
    for i = -4, 4, 3 do set(b, math.floor(fx) + i, fy - 1, 2) end
  end
end

local function body(b, by)
  local y0 = 44 + OY + by
  rect(b, 46, y0, 54, 16, 1)                         -- boiler box
  for i = 0, 3 do rect(b, 46 + i, y0 - 1 + (3 - i) // 3, 1, 1, 1) end
  poly(b, { { 80, y0 }, { 82, y0 - 4 }, { 86, y0 - 6 }, { 94, y0 - 6 }, { 98, y0 - 4 }, { 99, y0 } }, 1)  -- cab roof
  rect(b, 58, y0 - 10, 5, 10, 1); rect(b, 57, y0 - 11, 7, 2, 1)       -- smokestack
  disc(b, 70, y0 - 1, 2.5, 1)                                          -- steam dome
  rect(b, 92, y0 - 9, 2, 3, 1)                                         -- cab pipe
  rect(b, 42, y0 + 15, 62, 4, 1)                                       -- chassis rail
  rect(b, 40, y0 + 16, 3, 2, 1)                                        -- front buffer
  -- detail (ink1): panel seam, vents, medallion ring, rivets
  for x = 47, 98 do set(b, x, y0 + 13, 2) end
  for x = 76, 88, 3 do for y = y0 + 3, y0 + 10 do set(b, x, y, 2) end end
  for a = 0, 35 do local t = a / 36 * math.pi * 2; set(b, 62 + math.cos(t) * 4.5, y0 + 7 + math.sin(t) * 4.5, 2) end
  set(b, 62, y0 + 7, 2)
  for x = 45, 101, 4 do set(b, x, y0 + 17, 2) end
  for y = y0 - 9, y0 - 1 do set(b, 61, y, 2) end
end

-- head group (moves with rear-up); drawn in head-local coords, (hx,hy) applied by the compositor
local function headGroup(b, f)
  local y = OY
  -- far antler: palm sweeping forward over the snout (far colour, no rim)
  thick(b, 29, 25 + y, 22, 19 + y, 1.6, 3)
  poly(b, { { 25, 22 + y }, { 22, 15 + y }, { 15, 11 + y }, { 7, 10 + y }, { 2, 12 + y }, { 5, 16 + y }, { 12, 19 + y }, { 20, 23 + y } }, 3)
  for _, t in ipairs({ { 21, 14, 0, -5 }, { 16, 12, -1, -5 }, { 11, 11, -1, -5 }, { 6, 11, -2, -4 }, { 3, 12, -3, -2 } }) do
    tine(b, t[1], t[2] + y, t[3], t[4], 3)
  end
  -- neck top / head block
  poly(b, { { 20, 27 + y }, { 30, 23 + y }, { 38, 27 + y }, { 39, 35 + y }, { 33, 41 + y }, { 22, 41 + y }, { 18, 35 + y } }, 1)
  -- ear
  poly(b, { { 34, 26 + y }, { 43, 20 + y }, { 41, 28 + y } }, 1)
  -- boxy snout
  rect(b, 6, 35 + y, 18, 9, 1)
  set(b, 6, 35 + y, nil); set(b, 7, 35 + y, nil); set(b, 6, 36 + y, nil)
  -- near antler: beam + broad palm sweeping back over the body, knobbed tines
  thick(b, 31, 26 + y, 43, 19 + y, 1.8, 1)
  poly(b, { { 40, 23 + y }, { 43, 16 + y }, { 50, 12 + y }, { 60, 10 + y }, { 70, 9 + y }, { 79, 10 + y }, { 84, 13 + y },
            { 81, 17 + y }, { 71, 19 + y }, { 60, 21 + y }, { 50, 24 + y }, { 44, 26 + y } }, 1)
  local tines = { { 45, 15, -2, -5 }, { 51, 12, -1, -6 }, { 57, 11, 0, -7 }, { 63, 10, 0, -7 }, { 69, 9, 1, -6 }, { 75, 9, 2, -6 }, { 80, 11, 3, -5 }, { 84, 13, 4, -2 } }
  for _, t in ipairs(tines) do tine(b, t[1], t[2] + y, t[3], t[4], 1) end
  -- detail: palm ridge, brow plate seam, snout seam, nostril
  for x = 46, 78 do set(b, x, 21 + y - math.floor((x - 46) / 6), 2) end
  line(b, 21, 31 + y, 37, 29 + y, 2)
  for x = 9, 22 do set(b, x, 40 + y, 2) end
  set(b, 8, 37 + y, 2); set(b, 9, 37 + y, 2)
  return tines
end

local function jawGroup(b)
  local y = OY
  rect(b, 8, 45 + y, 17, 3, 1)     -- bar jaw
  rect(b, 22, 42 + y, 4, 5, 1)     -- hinge
  set(b, 23, 44 + y, 2)
end

-------------------------------------------------------------------------------
-- frame assembly
-------------------------------------------------------------------------------
local PAL = { [1] = "outline", [2] = "ink1", [3] = "ink1" }
local FOOT = { [0] = { -4, 0 }, [1] = { 0, 0 }, [2] = { 4, 0 }, [3] = { 0, 3 } }

local function make(o)
  return function(img, K)
    local b = newBuf()
    local by = o.bob or 0
    local FH, BH = 52, 92
    local hipY = 64 + by
    -- far legs
    local fA, fB = o.legs[2], o.legs[1]
    leg(b, FH, hipY, FH + fA[1], fA[2], 3); leg(b, BH, hipY, BH + fB[1], fB[2], 3)
    -- body + neck
    body(b, by)
    local hx, hy = o.hx or 0, (o.hy or 0) + by
    poly(b, { { 51, 47 + OY + by }, { 47, 39 + OY + (by + hy) / 2 }, { 41 + hx * 0.7, 30 + OY + hy * 0.8 }, { 33 + hx, 26 + OY + hy },
              { 24 + hx, 34 + OY + hy }, { 28 + hx * 0.8, 45 + OY + hy * 0.6 }, { 33, 54 + OY + by }, { 40, 62 + OY + by }, { 47, 62 + OY + by } }, 1)
    for i = 0, 4 do set(b, 41 + i, 37 + OY + i * 3 + by, 2) end   -- neck plate seam
    -- near legs
    local nA, nB = o.legs[1], o.legs[2]
    leg(b, FH, hipY, FH + nA[1], nA[2], 1); leg(b, BH, hipY, BH + nB[1], nB[2], 1)
    -- head group with tilt (front end rises) and jaw
    local hb = newBuf()
    local tines = headGroup(hb)
    local tilt = o.tilt or 0
    local function place(src, extraY, tl)
      for k, m in pairs(src) do
        local sx, sy = k % W, k // W
        local dy = (sx < 30) and -math.floor(tl * (30 - sx) / 14 + 0.5) or 0
        local tx, ty = sx + hx, sy + hy + extraY + dy
        if m == 3 then if not get(b, tx, ty) then set(b, tx, ty, 3) end else set(b, tx, ty, m) end
      end
    end
    place(hb, 0, tilt)
    local jb = newBuf(); jawGroup(jb)
    place(jb, o.jaw or 0, math.max(0, tilt - 1))
    -- paint mass + top-left rim
    for k, m in pairs(b) do
      local x, y = k % W, k // W
      local c = PAL[m]
      if m ~= 3 then
        local up, lf = get(b, x, y - 1), get(b, x - 1, y)
        local function solid(v) return v ~= nil and v ~= 3 end
        local thickH = solid(get(b, x + 1, y)) and solid(get(b, x - 1, y))
        local thickV = solid(get(b, x, y + 1)) and solid(get(b, x, y + 2))
        if (not solid(up) and thickH and thickV) or (not solid(lf) and thickV and solid(get(b, x + 1, y)) and solid(get(b, x + 2, y))) then c = "steel2" end
      end
      K.px(img, x, y, c)
    end
    -- eyes (2 px) + flare
    local ex, ey = 26 + hx, 32 + OY + hy - math.floor(tilt * 4 / 14 + 0.5)
    local lvl = o.eye or 0
    K.px(img, ex, ey, lvl >= 2 and "weird5" or "weird4"); K.px(img, ex + 1, ey, lvl >= 1 and "weird5" or "weird4")
    if lvl >= 3 then K.px(img, ex - 1, ey, "weird4"); K.px(img, ex + 2, ey, "weird4"); K.px(img, ex, ey - 1, "weird4") end
    -- chest core (front of the boiler)
    local cx, cy = 50, 53 + OY + by
    local cl = o.core or 0
    K.px(img, cx, cy, cl >= 1 and "weird5" or "weird4"); K.px(img, cx + 1, cy, "weird4")
    K.px(img, cx, cy + 1, "weird4"); K.px(img, cx + 1, cy + 1, cl >= 1 and "weird4" or "leaf3")
    if cl >= 2 then K.px(img, cx - 1, cy, "leaf3"); K.px(img, cx + 2, cy + 1, "leaf3") end
    -- mouth glow when open
    if (o.jaw or 0) >= 3 then
      local my = 44 + OY + hy + (o.jaw or 0) // 2 - math.floor(math.max(0, tilt - 1) * 12 / 14 + 0.5)
      K.px(img, 18 + hx, my, "weird4"); K.px(img, 20 + hx, my, "weird4")
    end
    -- sparks off the antler tines
    for i = 1, (o.sparks or 1) do
      local t = tines[1 + math.floor(H(i, 1, o.seed) * #tines)]
      local sx = t[1] + t[3] + hx + math.floor(H(i, 2, o.seed) * 5) - 2
      local sy = t[2] + t[4] + OY + hy - 1 - math.floor(H(i, 3, o.seed) * 3)
      if sx >= 0 and sy >= 0 and sx < W then K.px(img, sx, sy, "weird5") end
    end
  end
end

-- trot: near-front + far-back share phase A, the other two share phase B = A + 2
local walk = {}
for f = 0, 3 do
  local a, bph = FOOT[f], FOOT[(f + 2) % 4]
  walk[#walk + 1] = { grid = make{ legs = { a, bph }, bob = (f % 2 == 0) and 1 or 0, seed = 10 + f, sparks = (f == 1) and 2 or 1 } }
end
local brace = { { -3, 0 }, { 2, 0 } }
local roar = {
  { grid = make{ legs = brace, hx = 1, hy = -2, tilt = 1, jaw = 1, eye = 1, core = 1, seed = 20, sparks = 1 } },
  { grid = make{ legs = brace, hx = 2, hy = -3, tilt = 2, jaw = 3, eye = 2, core = 2, seed = 21, sparks = 2 } },
  { grid = make{ legs = brace, hx = 2, hy = -4, tilt = 3, jaw = 4, eye = 3, core = 2, seed = 22, sparks = 3 } },
}

K.build{
  name = "bg_moosezilla", w = W, h = HH,
  src   = ROOT .. "/art-src/backgrounds/actors/bg_moosezilla.aseprite",
  sheet = ROOT .. "/public/assets/sprites/bg/bg_moosezilla.png",
  data  = ROOT .. "/public/assets/sprites/bg/bg_moosezilla.json",
  anims = {
    { tag = "bg_moosezilla_walk", ms = 180, frames = walk },
    { tag = "bg_moosezilla_roar", ms = 160, frames = roar },
  },
  anchor = "bottom-center",
}
