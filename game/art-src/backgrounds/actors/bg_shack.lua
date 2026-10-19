-- Background actor: far-bank stilt shack over the water (2-2 riverbank moment). 40x48, origin BOTTOM-CENTRE (row 47 = waterline).
-- Weathered board walls, rusty corrugated tin roof with a stovepipe, porch on cross-braced stilts, ladder to the water,
-- one lit window (fire3/fire4) with its reflection. Tag bg_shack_idle 2 f @700 ms: the window flickers dimmer.
-- Build: bash tools/build-art.sh art-src/backgrounds/actors/bg_shack.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local W, HH = 40, 48

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
local S = {}
-- stilts + cross braces
for _, sx in ipairs({ 7, 15, 24, 32 }) do for y = 33, 46 do set(S, sx, y, (y < 36) and "dirt2" or "ink1") end end
line(S, 7, 35, 15, 43, "dirt1"); line(S, 15, 35, 7, 43, "dirt1"); line(S, 24, 35, 32, 43, "dirt1")
-- porch deck
for x = 3, 37 do set(S, x, 32, (x % 4 == 0) and "dirt2" or "dirt3"); set(S, x, 33, "dirt1") end
-- walls: vertical weathered boards
for x = 6, 33 do for y = 18, 31 do
  local col = (x % 3 == 0) and "ink1" or ((x % 3 == 1) and "dirt2" or "ink2")
  if x > 29 then col = (x % 3 == 0) and "outline" or "ink1" end
  if H(x, y, 1) < 0.08 then col = "dirt1" end
  set(S, x, y, col)
end end
-- door (dark) + window frame
for x = 22, 26 do for y = 22, 31 do set(S, x, y, (x == 22 or y == 22) and "dirt1" or "outline") end end
set(S, 25, 27, "dirt3")
for x = 10, 17 do for y = 21, 26 do set(S, x, y, "dirt1") end end
-- tin roof: trapezoid band, corrugated, rust, overhang
for y = 9, 17 do
  local inset = math.floor((17 - y) * 0.5)
  for x = 3 + inset, 36 - inset do
    local col = (x % 2 == 0) and "steel2" or "steel1"
    if y == 9 + 0 then col = "steel3" end
    if y == 17 then col = "ink1" end
    if H(x, y, 2) < 0.18 and y < 17 then col = (H(x, y, 3) < 0.5) and "dirt3" or "dirt2" end
    set(S, x, y, col)
  end
end
-- stovepipe
for y = 3, 9 do set(S, 28, y, "ink1"); set(S, 29, y, "ink2") end
for x = 27, 30 do set(S, x, 3, "ink2") end
-- ladder down to the water
for y = 33, 46 do set(S, 35, y, "dirt2"); set(S, 37, y, "dirt1") end
for y = 35, 45, 3 do set(S, 36, y, "dirt2") end
-- hanging net / junk on the porch rail
for x = 4, 8 do set(S, x, 31, "ink2") end; set(S, 5, 30, "ink2"); set(S, 6, 30, "ink3")

local function frame(f)
  return function(img)
    local c = copy(S)
    local hi, mid, lo = "fire4", "fire3", "fire2"
    if f == 2 then hi, mid, lo = "fire3", "fire2", "fire1" end
    for x = 11, 16 do for y = 22, 25 do set(c, x, y, ((x == 13 or x == 14) and y < 25) and hi or mid) end end
    for y = 22, 25 do set(c, 13, y, "dirt1") end                              -- mullion
    for x = 11, 16 do set(c, x, 24, "dirt1") end
    set(c, 12, 23, hi); set(c, 15, 23, (f == 1) and hi or mid)
    set(c, 11, 25, lo); set(c, 16, 25, lo)
    -- spill of light on the porch boards
    set(c, 12, 32, "dirt4"); set(c, 14, 32, (f == 1) and "dirt4" or "dirt3")
    -- water ripples around stilts + window reflection
    for x = 0, W - 1 do if (x % 5 == 1) or (x % 8 == 3) then set(c, x, 47, "ink2") end end
    for _, sx in ipairs({ 7, 15, 24, 32, 35, 37 }) do set(c, sx - 1, 47, "steel2"); set(c, sx + 1, 47, "steel2") end
    for x = 11, 16 do if (x + f) % 2 == 0 then set(c, x, 47, lo) end end
    set(c, 13, 46, (f == 1) and mid or lo)
    flush(c)(img)
  end
end
K.build{
  name = "bg_shack", w = W, h = HH,
  src = ROOT .. "/art-src/backgrounds/actors/bg_shack.aseprite",
  sheet = ROOT .. "/public/assets/sprites/bg/bg_shack.png",
  data = ROOT .. "/public/assets/sprites/bg/bg_shack.json",
  anims = { { tag = "bg_shack_idle", ms = 700, frames = { { grid = frame(1) }, { grid = frame(2) } } } },
  anchor = "bottom-center",
}
