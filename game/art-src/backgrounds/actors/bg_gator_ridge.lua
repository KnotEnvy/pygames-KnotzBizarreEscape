-- Background actor: one Regime mech-gator cruising LEFT with only its back breaking the water. 24x9, origin BOTTOM-CENTRE
-- (row 8 = waterline). Snout bump + nostril at the left, an eye bump with a dim fire2 lamp, then a row of armour scutes.
-- Tag bg_gator_ridge_swim 4 f @120 ms: scutes undulate (travelling wave), bow ripple + trailing ripples crawl back.
-- Build: bash tools/build-art.sh art-src/backgrounds/actors/bg_gator_ridge.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local W, HH = 24, 9

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
local function frame(f)
  return function(img)
    local c = {}
    local WL = 7                                   -- last row of the body above water
    -- snout + head hump: low back line from x1..9
    for x = 1, 9 do
      local top = WL - ((x <= 2) and 1 or ((x <= 4) and 0 or 1))
      if x >= 5 and x <= 7 then top = WL - 3 end    -- eye bump
      if x == 8 then top = WL - 2 end
      for y = top, WL do set(c, x, y, (y == top) and "steel3" or "steel1") end
    end
    set(c, 1, WL - 2, "steel2")                    -- nostril knob
    set(c, 6, WL - 2, "fire2")                     -- dim eye lamp
    set(c, 7, WL - 2, "ink1")                      -- brow plate shadow
    -- neck dip then back: scutes from x 10..21, travelling wave
    for x = 9, 21 do set(c, x, WL, "steel1") end
    for i = 0, 5 do
      local x = 10 + i * 2
      local wave = math.sin((i * 1.3 - f * math.pi / 2)) > 0.2 and 1 or 0
      local h = ((i % 2 == 0) and 2 or 1) + wave
      if i >= 4 then h = h - 1 end
      for y = WL - h, WL - 1 do set(c, x, y, "steel1") end
      set(c, x, WL - h, "steel3")
      if h >= 2 then set(c, x + 1, WL - 1, "ink2") end
    end
    -- water: bow ripple + trailing V (row 8, plus row 7 at the edges)
    local seq = { 0, 1, 2, 3 }
    set(c, 0, 8, "steel3"); set(c, 0, 7, (f % 2 == 1) and "ink3" or nil)
    for x = 1, 23 do
      local on = ((x + f) % 4) ~= 0
      if x > 15 then on = ((x + f) % 3) == 0 end
      if on then set(c, x, 8, (x < 12) and "steel3" or "ink3") end
    end
    for x = 22, 23 do if (x + f) % 2 == 0 then set(c, x, 7, "ink3") end end
    flush(c)(img)
  end
end
local frames = {}; for f = 1, 4 do frames[f] = { grid = frame(f) } end
K.build{
  name = "bg_gator_ridge", w = W, h = HH,
  src = ROOT .. "/art-src/backgrounds/actors/bg_gator_ridge.aseprite",
  sheet = ROOT .. "/public/assets/sprites/bg/bg_gator_ridge.png",
  data = ROOT .. "/public/assets/sprites/bg/bg_gator_ridge.json",
  anims = { { tag = "bg_gator_ridge_swim", ms = 120, frames = frames } },
  anchor = "bottom-center",
}
