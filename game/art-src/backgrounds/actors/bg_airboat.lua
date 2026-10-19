-- Background actor: far Regime airboat racing RIGHT. 32x14, origin BOTTOM-CENTRE (row 13 = waterline).
-- Flat jon-boat hull, engine block, driver on a raised seat, big caged fan at the stern (3/4 view oval) with rudders,
-- rooster-tail spray behind and bow spray. Dark steel; driver helmet steel3 with a faint red2 band.
-- Tag bg_airboat_run 4 f @60 ms: 2-blade fan rotates 45 deg/frame, spray churns, 1 px hull chatter.
-- Build: bash tools/build-art.sh art-src/backgrounds/actors/bg_airboat.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local W, HH = 32, 14

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
    local by = (f % 2 == 0) and 1 or 0       -- hull chatter
    -- rooster tail spray (behind the stern, drawn first)
    for i = 0, 9 do
      local x = 3 - math.floor(H(i, 1, f) * 4)
      local y = 12 - math.floor(H(i, 2, f) * 4)
      set(c, x, y, (H(i, 3, f) < 0.4) and "steel4" or "steel3")
    end
    set(c, 0, 12, "ink3"); set(c, 1, 13, "steel3")
    -- hull
    for x = 4, 29 do
      local top = 10 + by
      if x >= 26 then top = 10 + by - math.floor((x - 25) / 2) end
      local bot = 12
      if x >= 27 then bot = 12 - (x - 27) end
      for y = top, bot do
        local col = (y == top) and "steel3" or ((y == bot) and "ink1" or "steel1")
        set(c, x, y, col)
      end
    end
    for x = 5, 26, 4 do set(c, x, 11 + by, "steel2") end   -- rivet ribs
    -- rudders behind the fan
    for y = 5 + by, 10 + by do set(c, 2, y, "ink2") end; set(c, 2, 5 + by, "steel2")
    -- fan cage (3/4-view disc) centre (7, 5): dithered grill, solid rim lit top-left
    local fx, fy = 7, 5 + by
    for y = -6, 6 do for x = -5, 5 do
      local nx, ny = x / 4.2, y / 5.6
      local d = nx * nx + ny * ny
      if d <= 1 then
        local col
        if d > 0.62 then col = ((x + y) < 0) and "steel3" or "steel2"
        elseif (x + y + 20) % 2 == 0 then col = "ink2" end
        if col then set(c, fx + x, fy + y, col) end
      end
    end end
    -- blade blur: 2-blade prop rotating 45 deg per frame (period 180 deg = 4 frames)
    local ang = (f - 1) * math.pi / 4
    for r = -4, 4 do
      local x, y = fx + math.cos(ang) * r * 0.7, fy + math.sin(ang) * r * 0.95
      if r ~= 0 then set(c, x, y, "ink4") end
    end
    local ang2 = ang - math.pi / 8
    for r = -3, 3, 2 do set(c, fx + math.cos(ang2) * r * 0.7, fy + math.sin(ang2) * r * 0.95, "ink3") end
    set(c, fx, fy, "steel1")
    -- cage stand
    set(c, 7, 10 + by, "ink2"); set(c, 8, 10 + by, "ink2")
    -- engine block in front of the fan
    for x = 10, 13 do for y = 7 + by, 9 + by do set(c, x, y, (y == 7 + by) and "steel3" or "steel1") end end
    set(c, 13, 8 + by, "ink1")
    -- raised seat frame + driver
    for y = 6 + by, 9 + by do set(c, 16, y, "ink2") end
    set(c, 15, 6 + by, "ink2"); set(c, 17, 6 + by, "ink2")
    for y = 3 + by, 5 + by do set(c, 16, y, "steel1"); set(c, 17, y, "steel1") end   -- torso
    set(c, 18, 4 + by, "steel1"); set(c, 19, 5 + by, "steel1")                       -- arm to the stick
    set(c, 16, 1 + by, "steel3"); set(c, 17, 1 + by, "steel3")                       -- helmet
    set(c, 16, 2 + by, "red2"); set(c, 17, 2 + by, "skin2")                          -- band + face
    set(c, 19, 6 + by, "ink2"); set(c, 19, 7 + by, "ink2")                           -- control stick
    -- bow spray
    for i = 0, 4 do
      local x = 29 + math.floor(H(i, 5, f) * 3)
      local y = 13 - math.floor(H(i, 6, f) * 3)
      set(c, x, y, (i % 2 == 0) and "steel4" or "steel3")
    end
    -- waterline foam streak under the hull
    for x = 0, 31 do if (x + f * 3) % 5 < 2 then set(c, x, 13, "steel3") end end
    flush(c)(img)
  end
end
local frames = {}; for f = 1, 4 do frames[f] = { grid = frame(f) } end
K.build{
  name = "bg_airboat", w = W, h = HH,
  src = ROOT .. "/art-src/backgrounds/actors/bg_airboat.aseprite",
  sheet = ROOT .. "/public/assets/sprites/bg/bg_airboat.png",
  data = ROOT .. "/public/assets/sprites/bg/bg_airboat.json",
  anims = { { tag = "bg_airboat_run", ms = 60, frames = frames } },
  anchor = "bottom-center",
}
