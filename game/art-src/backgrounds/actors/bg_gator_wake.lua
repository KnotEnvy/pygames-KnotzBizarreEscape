-- Background actor: GATORGEDDON swimming LEFT through the far water after the mill arena, under the surface.
-- 128x28, origin BOTTOM-CENTRE (row 27 = waterline). A long line of armour scutes + spikes and two exhaust stacks (venting
-- bubbles) breaking the surface, bow wave at the head (left), V wake arm trailing behind. Dark steel, no eye lamps.
-- Tags: bg_gator_wake_swim 6 f @110 ms (travelling undulation, foam crawls back),
--       bg_gator_wake_tail 6 f @90 ms (the bladed tail tip rises at the right, arcs over and slaps down: big splash).
-- Build: bash tools/build-art.sh art-src/backgrounds/actors/bg_gator_wake.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local W, HH = 128, 28

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
local WL = 26                                  -- last row of body above water; row 27 = surface foam
local function body(c, f)
  local ph = (f - 1) * math.pi * 2 / 6
  -- far wake arm (behind the body), rising toward the horizon
  for x = 6, 127 do
    local t = (x - 6) / 121
    local y = 24 - t * 7
    if ((x - f * 2) % 12) < 7 - t * 3 and H(x, 3, 0) < 1 - t * 0.5 then set(c, x, y, (t < 0.3) and "steel3" or ((t < 0.65) and "ink3" or "ink2")) end
  end
  -- back line + scutes
  for x = 10, 104 do
    local e = math.sin(math.pi * (x - 10) / 94)
    local wave = math.sin(x * 0.11 - ph) * 0.9
    local top = math.floor(WL - 1 - e * 3.2 - wave * e + 0.5)
    for y = top, WL do set(c, x, y, (y == top) and "steel2" or ((y == WL) and "ink1" or "steel1")) end
    if (x % 6) == 0 then
      local hgt = ((x % 12 == 0) and 4 or 3) + ((e > 0.6) and 1 or 0)
      for k = 1, hgt do
        set(c, x, top - k, (k == hgt) and "steel3" or "steel2")
        if k < hgt then set(c, x + 1, top - k, "steel1") end
        if k < hgt - 1 then set(c, x - 1, top - k, "steel2"); set(c, x + 2, top - k, "ink1") end
      end
    end
    if (x % 6) == 3 and top + 2 < WL then set(c, x, top + 2, "ink1") end              -- scute seams
  end
  -- exhaust stacks + venting bubbles / steam
  for _, st in ipairs({ { 33, 9 }, { 39, 7 } }) do
    local x, hgt = st[1], st[2]
    local base = WL - 4
    for y = base - hgt, base do set(c, x, y, "steel1"); set(c, x + 1, y, "ink1"); set(c, x + 2, y, "ink1") end
    set(c, x - 1, base - hgt, "steel2"); set(c, x, base - hgt, "steel2"); set(c, x + 1, base - hgt, "steel2"); set(c, x + 2, base - hgt, "steel1"); set(c, x + 3, base - hgt, "steel1")
    for i = 0, 2 do
      local age = ((f - 1) + i * 2) % 6
      set(c, x + 1 - age * 0.3 + i * 0.5, base - hgt - 2 - age * 1.3, (age < 3) and "ink3" or "ink2")
    end
  end
  -- bow wave at the head
  for x = 0, 11 do
    local h = math.floor((1 - math.abs(x - 6) / 6) * 3 + 0.5)
    for k = 0, h do if H(x, k, f) < 0.75 then set(c, x, 26 - k, (k == h) and "ink4" or "steel3") end end
  end
  -- surface foam along the near side, crawling back
  for x = 0, 127 do
    local t = x / 127
    if ((x - f * 2) % 12) < 8 - t * 4 then set(c, x, 27, (x < 20) and "steel3" or ((t < 0.6) and "ink3" or "steel2")) end
  end
end
local function tailFrame(f)
  return function(img)
    local c = {}
    body(c, f)
    local P = {
      nil,
      { { 104, 27, 2.8 }, { 111, 22, 2.2 }, { 117, 17, 1.6 } },
      { { 104, 27, 2.8 }, { 110, 18, 2.3 }, { 114, 10, 1.8 }, { 112, 5, 1.3 } },
      { { 104, 27, 2.8 }, { 112, 16, 2.3 }, { 120, 9, 1.8 }, { 125, 12, 1.3 } },
      { { 104, 27, 2.8 }, { 115, 24, 2.1 }, { 125, 25, 1.5 } },
      nil,
    }
    local p = P[f]
    if p then
      for i = 1, #p - 1 do
        local a, b = p[i], p[i + 1]
        for k = 0, 8 do local t = k / 8; disc(c, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t, "steel1") end
      end
      -- rim light on the tail's upper edges + spikes along it
      for k, v in pairs(copy(c)) do
        local x, y = k % W, k // W
        if x >= 104 and v == "steel1" and get(c, x, y - 1) == nil and y < 26 then set(c, x, y, "steel2") end
      end
      -- blade at the tip, set across the tail direction
      local a, b = p[#p - 1], p[#p]
      local dx, dy = b[1] - a[1], b[2] - a[2]; local L = math.sqrt(dx * dx + dy * dy); dx, dy = dx / L, dy / L
      local nx, ny = -dy, dx
      poly(c, { { b[1] + nx * 4, b[2] + ny * 4 }, { b[1] + dx * 4, b[2] + dy * 4 }, { b[1] - nx * 3, b[2] - ny * 3 } }, "steel2")
      set(c, b[1] + dx * 3, b[2] + dy * 3, "steel3"); set(c, b[1] + nx * 3, b[2] + ny * 3, "steel3")
      -- water streaming off the raised tail
      if f == 3 or f == 4 then
        for i = 1, 7 do
          local t = H(i, f, 1)
          local x = math.floor(a[1] + (b[1] - a[1]) * t - (p[1][1] - a[1]) * 0.5 * H(i, f, 2))
          local y0 = math.floor(a[2] + (b[2] - a[2]) * t) + 2
          for j = 0, 1 + math.floor(H(i, f, 3) * 3) do if y0 + j * 2 < 27 then set(c, x, y0 + j * 2, "steel3") end end
        end
      end
    end
    -- splash rings / spray
    if f == 1 or f == 2 then for x = 107, 121 do if H(x, f, 4) < 0.6 then set(c, x, 26 - ((x % 3 == 0) and 1 or 0), "steel3") end end end
    if f == 5 then
      for x = 106, 127 do
        local e = 1 - math.abs(x - 117) / 11
        local h = math.floor(e * 18 * (0.6 + H(x, 5, 5) * 0.5))
        for k = 0, h do if H(x, k, 6) < 0.55 + e * 0.3 then set(c, x, 26 - k, (k > h - 2) and "ink5" or ((k % 3 == 0) and "steel3" or "steel4")) end end
      end
    elseif f == 6 then
      for i = 1, 26 do
        local x = 104 + H(i, 6, 7) * 24
        local y = 8 + H(i, 6, 8) * 18
        set(c, x, y, (H(i, 6, 9) < 0.3) and "ink5" or "steel3")
      end
      for x = 104, 127 do if x % 3 ~= 0 then set(c, x, 26, "steel3") end end
      for x = 108, 126 do if H(x, 6, 10) < 0.5 then set(c, x, 25, "ink4") end end
    end
    flush(c)(img)
  end
end
local function swimFrame(f) return function(img) local c = {}; body(c, f); flush(c)(img) end end
local swim, tail = {}, {}
for f = 1, 6 do swim[f] = { grid = swimFrame(f) }; tail[f] = { grid = tailFrame(f) } end
K.build{
  name = "bg_gator_wake", w = W, h = HH,
  src = ROOT .. "/art-src/backgrounds/actors/bg_gator_wake.aseprite",
  sheet = ROOT .. "/public/assets/sprites/bg/bg_gator_wake.png",
  data = ROOT .. "/public/assets/sprites/bg/bg_gator_wake.json",
  anims = {
    { tag = "bg_gator_wake_swim", ms = 110, frames = swim },
    { tag = "bg_gator_wake_tail", ms = 90, frames = tail },
  },
  anchor = "bottom-center",
}
