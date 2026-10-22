-- Background actor: far rickety jetty with a moored rowboat and a lantern. 48x18, origin BOTTOM-CENTRE (row 17 = waterline).
-- Sagging plank deck on uneven posts (two planks missing), mooring rope to a small rowboat, lantern hanging from a tall post.
-- LANTERN PIXEL = (36,4) (fire5, fire3 halo). Tag bg_jetty_idle 1 f. Build: bash tools/build-art.sh art-src/backgrounds/actors/bg_jetty.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local W, HH = 48, 18

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
local function frame(img)
  local c = {}
  -- posts (some stick up above the deck)
  for _, p in ipairs({ { 1, 6 }, { 9, 8 }, { 17, 9 }, { 25, 7 }, { 31, 9 } }) do
    for y = p[2], 16 do set(c, p[1], y, (y == p[2]) and "dirt3" or ((y > 12) and "ink1" or "dirt1")) end
  end
  -- deck planks with a sag and two missing planks
  for x = 0, 33 do
    local sag = math.floor(1.2 * math.sin((x / 33) * math.pi) + 0.5)
    if not (x == 13 or x == 14 or x == 22) then
      set(c, x, 9 + sag, (x % 3 == 0) and "dirt2" or "dirt3")
      set(c, x, 10 + sag, "dirt1")
    end
  end
  -- tall lantern post + hook arm + lantern
  for y = 1, 16 do set(c, 34, y, (y > 12) and "ink1" or "dirt2") end
  set(c, 35, 1, "dirt2"); set(c, 36, 1, "dirt2"); set(c, 36, 2, "ink2")
  set(c, 36, 3, "ink2"); set(c, 35, 4, "fire3"); set(c, 36, 4, "fire5"); set(c, 37, 4, "fire3"); set(c, 36, 5, "fire2")
  -- rope to the boat
  line(c, 31, 10, 36, 13, "ink2")
  -- rowboat (bow right), a seat, an oar
  for x = 34, 46 do
    local top = 13
    local bot = 16 - ((x > 43) and (x - 43) or 0) - ((x < 36) and (36 - x) or 0)
    if x >= 45 then top = 12 end
    for y = top, math.max(top, bot) do set(c, x, y, (y == top) and "dirt3" or ((y == bot) and "ink1" or "dirt2")) end
  end
  set(c, 40, 12, "dirt2"); set(c, 41, 12, "dirt2")
  line(c, 38, 11, 44, 15, "dirt1")
  -- water: ripples, lantern reflection
  for x = 0, W - 1 do if (x % 6 == 2) or (x % 9 == 5) then set(c, x, 17, "ink2") end end
  for _, sx in ipairs({ 1, 9, 17, 25, 31, 34 }) do set(c, sx + 1, 17, "steel2") end
  set(c, 36, 17, "fire2"); set(c, 35, 17, "fire1"); set(c, 37, 17, "fire1")
  flush(c)(img)
end
K.build{
  name = "bg_jetty", w = W, h = HH,
  src = ROOT .. "/art-src/backgrounds/actors/bg_jetty.aseprite",
  sheet = ROOT .. "/public/assets/sprites/bg/bg_jetty.png",
  data = ROOT .. "/public/assets/sprites/bg/bg_jetty.json",
  anims = { { tag = "bg_jetty_idle", ms = 100, frames = { { grid = frame } } } },
  anchor = "bottom-center",
}
