-- Background actor: a burning wrecked barge drifting past. 96x40, origin BOTTOM-CENTRE (row 39 = waterline).
-- Low listing hull (stern up, bow down), two rusted containers (one crumpled), a third tipped against them, a bent crane mast,
-- a small fire on the stack with a smoke column start, fire glint on the water.
-- Tag bg_barge_fire_burn 6 f @90 ms: flames lick, embers, smoke puffs rise and drift left, reflection shimmers.
-- Build: bash tools/build-art.sh art-src/backgrounds/actors/bg_barge_fire.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local W, HH = 96, 40

-- deterministic hash in [0,1)
local function H(x, y, s)
  local h = (math.floor(x) * 374761393 + math.floor(y) * 668265263 + math.floor(s or 0) * 1442695041) & 0xffffffff
  h = ((h ~ (h >> 13)) * 1274126177) & 0xffffffff
  h = h ~ (h >> 16)
  return h / 4294967296
end
-- pixel buffer of palette names (key y*W+x)
local function inb(x, y) return x >= 0 and y >= 0 and x < W and y < HH end
local function set(c, x, y, col) x, y = math.floor(x + 0.5), math.floor(y + 0.5); if inb(x, y) then c[y * W + x] = col end end
local function get(c, x, y) if not inb(x, y) then return nil end return c[y * W + x] end
local function del(c, x, y) if inb(x, y) then c[y * W + x] = nil end end
local function rect(c, x, y, w, h, col) for j = y, y + h - 1 do for i = x, x + w - 1 do set(c, i, j, col) end end end
local function ell(c, cx, cy, rx, ry, col)
  for j = math.floor(cy - ry - 1), math.ceil(cy + ry + 1) do for i = math.floor(cx - rx - 1), math.ceil(cx + rx + 1) do
    local dx, dy = (i - cx) / rx, (j - cy) / ry
    if dx * dx + dy * dy <= 1.0 then set(c, i, j, col) end
  end end
end
local function disc(c, cx, cy, r, col) ell(c, cx, cy, r + 0.3, r + 0.3, col) end
local function poly(c, pts, col)
  local minx, maxx, miny, maxy = 1e9, -1e9, 1e9, -1e9
  for _, p in ipairs(pts) do minx = math.min(minx, p[1]); maxx = math.max(maxx, p[1]); miny = math.min(miny, p[2]); maxy = math.max(maxy, p[2]) end
  for y = math.floor(miny), math.ceil(maxy) do for x = math.floor(minx), math.ceil(maxx) do
    local inside, j = false, #pts
    for i = 1, #pts do
      local xi, yi, xj, yj = pts[i][1], pts[i][2], pts[j][1], pts[j][2]
      if ((yi > y + 0.5) ~= (yj > y + 0.5)) and (x + 0.5 < (xj - xi) * (y + 0.5 - yi) / (yj - yi) + xi) then inside = not inside end
      j = i
    end
    if inside then set(c, x, y, col) end
  end end
end
local function line(c, x0, y0, x1, y1, col)
  x0, y0, x1, y1 = math.floor(x0 + 0.5), math.floor(y0 + 0.5), math.floor(x1 + 0.5), math.floor(y1 + 0.5)
  local dx, dy = math.abs(x1 - x0), -math.abs(y1 - y0)
  local sx, sy = x0 < x1 and 1 or -1, y0 < y1 and 1 or -1; local err = dx + dy
  while true do set(c, x0, y0, col); if x0 == x1 and y0 == y1 then break end
    local e2 = 2 * err; if e2 >= dy then err = err + dy; x0 = x0 + sx end; if e2 <= dx then err = err + dx; y0 = y0 + sy end end
end
local function thick(c, x0, y0, x1, y1, r, col)
  local n = math.max(1, math.ceil(math.max(math.abs(x1 - x0), math.abs(y1 - y0))))
  for i = 0, n do local t = i / n; if r <= 0 then set(c, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, col) else disc(c, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, col) end end
end
local function copy(c) local o = {}; for k, v in pairs(c) do o[k] = v end; return o end
local function flush(c) return function(img) for k, col in pairs(c) do img:drawPixel(k % W, k // W, K.color(col)) end end end
local LIST = 0.075                                   -- shear: y offset per px from x=48 (right end lower)
local function sh(x) return math.floor((x - 48) * LIST + 0.5) end
local S = {}                                          -- static wreck (built once)
local function s(x, y, col) if y + sh(x) <= 38 then set(S, x, y + sh(x), col) end end
-- hull (low freeboard)
for x = 5, 91 do
  local top, bot = 31, 40
  if x > 84 then top = 31 + math.floor((x - 84) * 0.4) end
  if x < 8 then top = 31 + (8 - x) end
  for y = top, bot do
    local col = (y == top) and "dirt3" or ((y == top + 1) and "steel2" or ((y > 36) and "ink1" or "steel1"))
    if y > top + 1 and H(x, y, 1) < 0.03 then col = "dirt2" end
    if (x % 9 == 4) and (y == top + 2 or y == top + 3) then col = "dirt2" end      -- rust streaks under the rail
    s(x, y, col)
  end
end
for x = 6, 90, 6 do s(x, 33, "ink1") end                            -- rub-rail bolts
-- container A (intact, dark rust red)
for x = 13, 33 do for y = 20, 30 do
  local col = (y == 20) and "red2" or ((x % 3 == 0) and "dirt1" or "red1")
  if x > 30 then col = (x % 3 == 0) and "outline" or "dirt1" end
  if H(x, y, 2) < 0.06 then col = "dirt2" end
  s(x, y, col)
end end
for y = 21, 30 do s(23, y, "outline") end
-- container B (crumpled roof, steel)
for x = 35, 55 do
  local dent = math.floor(math.max(0, 3 - math.abs(x - 46) * 0.5))
  for y = 22 + dent, 30 do
    local col = (y == 22 + dent) and "steel3" or ((x % 3 == 0) and "steel1" or "steel2")
    if x > 52 then col = "steel1" end
    if H(x, y, 3) < 0.06 then col = "dirt2" end
    s(x, y, col)
  end
end
-- container C tipped against B (polygon, then ribbed)
poly(S, { { 52, 30 + sh(52) }, { 58, 14 + sh(58) }, { 75, 18 + sh(75) }, { 70, 31 + sh(70) } }, "steel1")
for k, v in pairs(copy(S)) do
  local x, y = k % W, k // W
  if v == "steel1" and x > 52 and x < 77 and y < 32 then
    local u = (x - 52) * 0.95 + (y - 30) * 0.32
    if math.floor(u) % 3 == 0 then S[k] = "steel2" end
    if get(S, x, y - 1) == nil then S[k] = "steel3" end
  end
end
-- bent crane mast at the bow
line(S, 80, 31 + sh(80), 84, 16 + sh(84), "ink2"); line(S, 81, 31 + sh(81), 85, 16 + sh(85), "ink1")
line(S, 84, 16 + sh(84), 90, 20 + sh(90), "ink2"); line(S, 90, 20 + sh(90), 90, 24 + sh(90), "ink1")
-- charred top edges near the fire
for x = 40, 64 do for y = 0, 39 do local v = get(S, x, y); if v and (v == "steel3" or v == "steel2") and H(x, y, 5) < 0.45 then set(S, x, y, "ink1") end end end

local FX, FY = 59, 15 + sh(59)                         -- fire seat on top of container C / B
local function frame(f)
  return function(img)
    local c = copy(S)
    -- smoke column start (behind flames): puffs rising, drifting left, looped over 6 frames
    for i = 0, 4 do
      local age = ((f - 1) + i * 6 / 5) % 6
      local px = FX - 1 - age * 1.6 - i * 0.3
      local py = FY - 5 - age * 1.7
      local r = 1.5 + age * 0.4
      ell(c, px, py, r + 0.6, r, (age < 2) and "ink2" or "ink1")
      if age < 3 then set(c, px - 1, py - 1, "ink3") end
    end
    -- flames: columns of varying height, colour bands by height
    for x = FX - 6, FX + 6 do
      local dx = math.abs(x - FX)
      local hgt = math.floor((7 - dx) * 0.9 + H(x, f, 11) * 4 - 1)
      if hgt > 0 then
        for k = 0, hgt do
          local y = FY - k + math.floor(dx * 0.3)
          local t = k / hgt
          local col = (t > 0.75) and "fire2" or ((t > 0.45) and "fire3" or ((dx <= 2 and t < 0.35) and "fire5" or "fire4"))
          if k == hgt and H(x, f, 12) < 0.5 then col = "fire2" end
          set(c, x, y, col)
        end
      end
    end
    set(c, FX, FY + 1, "fire6")
    -- embers
    for i = 1, 3 do set(c, FX + (H(i, f, 13) - 0.5) * 12, FY - 8 - H(i, f, 14) * 8, (i == 1) and "fire4" or "fire3") end
    -- small fire licking out of container A's door
    for k = 0, 2 + (f % 2) do set(c, 24 + (k % 2), 26 - k + sh(24), (k == 0) and "fire4" or "fire3") end
    -- fire glow on nearby edges
    for _, p in ipairs({ { 52, 22 }, { 53, 23 }, { 64, 17 }, { 66, 18 } }) do if get(c, p[1], p[2] + sh(p[1])) then set(c, p[1], p[2] + sh(p[1]), "fire1") end end
    -- waterline foam + fire reflection shimmer
    for x = 0, W - 1 do
      if (x + f * 2) % 6 < 3 then set(c, x, 39, (x < 8 or x > 88) and "steel3" or "steel2") end
    end
    for x = FX - 5, FX + 5 do if H(x, f, 15) < 0.55 then set(c, x, 39, (math.abs(x - FX) < 2) and "fire3" or "fire2") end end
    flush(c)(img)
  end
end
local frames = {}; for f = 1, 6 do frames[f] = { grid = frame(f) } end
K.build{
  name = "bg_barge_fire", w = W, h = HH,
  src = ROOT .. "/art-src/backgrounds/actors/bg_barge_fire.aseprite",
  sheet = ROOT .. "/public/assets/sprites/bg/bg_barge_fire.png",
  data = ROOT .. "/public/assets/sprites/bg/bg_barge_fire.json",
  anims = { { tag = "bg_barge_fire_burn", ms = 90, frames = frames } },
  anchor = "bottom-center",
}
