-- Background actor: burning BAYOU QUEEN debris (a smokestack on a chunk of cabin) toppling RIGHT into the water (2-3 wreck shore).
-- 72x56, origin BOTTOM-CENTRE (rows 54-55 = water surface). Pivot at (22,53); black stack with a feathered crown, burnt
-- ink3 cabin with fire-lit windows, small flames; smoke trail; big splash on impact.
-- Tag bg_debris_fall 10 f @90 ms, PLAY ONCE: lean (1-3), accelerating fall (4-7), impact splash (8), spray (9), settle (10).
-- Build: bash tools/build-art.sh art-src/backgrounds/actors/bg_debris.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local W, HH = 72, 56

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
-- local object: key (lx, ly) with ly UP from the pivot
local O = {}
local function o(lx, ly, col) O[(ly + 64) * 256 + (lx + 128)] = col end
local function og(lx, ly) return O[(math.floor(ly + 0.5) + 64) * 256 + (math.floor(lx + 0.5) + 128)] end
-- cabin chunk (broken left edge)
for lx = -12, 12 do
  local h0 = (lx < -8) and (lx + 21) or 13
  for ly = 0, math.min(h0, 13) do
    local col = (ly >= 10) and "ink3" or "ink2"
    if lx > 8 then col = "ink1" end
    if lx < -9 and ly >= 10 then col = "ink4" end
    if H(lx, ly, 1) < 0.18 then col = "ink1" end
    if ly == 0 then col = "ink1" end
    o(lx, ly, col)
  end
end
for lx = -14, 14 do o(lx, 14, (lx < 0) and "ink2" or "ink1"); o(lx, 15, "dirt2") end    -- roof slab + trim
-- windows (W markers, lit at draw time)
for _, wx in ipairs({ -9, -4, 1, 6 }) do for ly = 5, 8 do o(wx, ly, "W"); o(wx + 1, ly, "W") end end
-- smokestack
for ly = 16, 45 do
  for lx = -2, 3 do o(lx, ly, (lx == -2) and "ink2" or ((lx == 3) and "outline" or "ink1")) end
end
for lx = -3, 4 do o(lx, 30, "ink2"); o(lx, 17, "ink2") end                                -- bands
for ly = 46, 49 do local w = ly - 44; for lx = -2 - w, 3 + w do o(lx, ly, (lx < -1) and "ink2" or "ink1") end end
for lx = -7, 8, 2 do o(lx, 50, "ink1"); o(lx, 51, "ink1") end                              -- feathered crown

local ANG = { 4, 8, 15, 25, 39, 56, 74, 88, 92, 92 }
local SINK = { 0, 0, 0, 0, 1, 2, 3, 5, 9, 14 }
local PX, PY = 22, 53
local function crownAt(f)
  local t = math.rad(ANG[f]); local py = PY + SINK[f]
  return PX + 50 * math.sin(t), py - 50 * math.cos(t)
end
local function frame(f)
  return function(img)
    local c = {}
    local t = math.rad(ANG[f]); local cs, sn = math.cos(t), math.sin(t)
    local py = PY + SINK[f]
    -- smoke trail left behind by the crown on earlier frames (drawn first)
    for g = math.max(1, f - 4), f do
      local cx, cy = crownAt(g)
      local age = f - g
      if cy < 52 then ell(c, cx - 2 - age * 1.5, cy - 3 - age * 2, 2 + age * 0.7, 1.5 + age * 0.5, (age < 2) and "ink2" or "ink1") end
    end
    -- the rotated object (inverse-mapped, nearest)
    for Y = 0, 53 do for X = 0, W - 1 do
      local dx, du = X - PX, py - Y
      local lx, ly = dx * cs - du * sn, dx * sn + du * cs
      local v = og(lx, ly)
      if v then
        if v == "W" then v = (H(math.floor(lx + 0.5), f, 2) < 0.5) and "fire4" or "fire3" end
        set(c, X, Y, v)
      end
    end end
    -- flames on the roof (local space, flicker), only while above the water
    if f <= 8 then
      for i = 0, 7 do
        local lx = 5 + i
        local hh = 1 + math.floor(H(i, f, 3) * 4)
        for k = 0, hh do
          local ly = 16 + k
          local X, Y = PX + lx * cs + ly * sn, py - (-lx * sn + ly * cs)
          if Y <= 53 then set(c, X, Y, (k == hh) and "fire2" or ((k == 0) and "fire5" or "fire3")) end
        end
      end
    end
    -- water surface
    for x = 0, W - 1 do if (x + f) % 5 < 3 then set(c, x, 55, "steel2") end end
    for x = 0, W - 1 do if get(c, x, 53) and x % 2 == 0 then set(c, x, 54, "steel3") end end
    -- splash
    if f == 8 then
      for x = 28, 71 do
        local e = math.sin(math.pi * (x - 28) / 43)
        local h = math.floor(e * 14 * (0.5 + H(x, 8, 4) * 0.7))
        for k = 0, h do if H(x, k, 5) < 0.6 then set(c, x, 54 - k, (k > h - 2) and "ink5" or ((k % 2 == 0) and "steel4" or "steel3")) end end
      end
    elseif f == 9 then
      for x = 24, 71 do
        local e = math.sin(math.pi * (x - 24) / 47)
        local h = math.floor(e * 22 * (0.4 + H(x, 9, 6) * 0.8))
        for k = 0, h do if H(x, k, 7) < 0.3 + (1 - k / math.max(h, 1)) * 0.4 then set(c, x, 54 - k, (k > h - 3) and "ink5" or ((k % 3 == 0) and "steel3" or "steel4")) end end
      end
    elseif f == 10 then
      for i = 1, 30 do set(c, 24 + H(i, 10, 8) * 47, 26 + H(i, 10, 9) * 26, (H(i, 10, 10) < 0.3) and "ink5" or "steel3") end
      for x = 22, 71 do if H(x, 10, 11) < 0.7 then set(c, x, 54, "steel4") end; if H(x, 10, 12) < 0.4 then set(c, x, 53, "steel3") end end
      for i = 0, 5 do ell(c, 34 + i * 6, 46 - (i % 2) * 3, 2, 1.4, "ink3") end                    -- steam
    end
    -- embers while burning
    if f <= 7 then for i = 1, 3 do local cx, cy = crownAt(f); set(c, cx - 4 - H(i, f, 13) * 8, cy + 6 + H(i, f, 14) * 10, "fire4") end end
    flush(c)(img)
  end
end
local frames = {}; for f = 1, 10 do frames[f] = { grid = frame(f) } end
K.build{
  name = "bg_debris", w = W, h = HH,
  src = ROOT .. "/art-src/backgrounds/actors/bg_debris.aseprite",
  sheet = ROOT .. "/public/assets/sprites/bg/bg_debris.png",
  data = ROOT .. "/public/assets/sprites/bg/bg_debris.json",
  anims = { { tag = "bg_debris_fall", ms = 90, frames = frames } },
  anchor = "bottom-center",
}
