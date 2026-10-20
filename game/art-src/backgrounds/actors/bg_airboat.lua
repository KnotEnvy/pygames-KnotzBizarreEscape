-- Background actor: far Regime airboat racing RIGHT (Phase H design, from enemies/airboat + art-src/refs/airboat).
-- 36x18, origin BOTTOM-CENTRE (row 17 = waterline). Big round olive fan cage at the stern with a spinning 2-blade wooden
-- prop, engine block + exhaust stack, driver on a raised seat (red uniform, cap), whip antenna with a Regime pennant,
-- jerrycan, bow gunner behind a pintle MG + shield plate, olive hull with a red stripe and an upturned bow, spray + foam.
-- Far style: no outline, river-haze palette (HAZE below), low contrast. Tag bg_airboat_run 4 f @60 ms: the prop turns 45 deg per frame,
-- the pennant flutters, the spray churns, 1 px hull chatter.
-- Build: bash tools/build-art.sh art-src/backgrounds/actors/bg_airboat.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local W, HH = 36, 18

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
-- H3 river haze: the racers run on the far water at Knotz's chest height, so they are pushed back atmospherically. The lit
-- olive turns to the cool steel of the river fog (the rims still trace the cage and hull), and the bright red, sand and spray
-- tones drop one step. The dark tones stay, so the boats don't sink into the treeline. Drawn in design colours, remapped on output.
local HAZE = {
  olive3 = "steel3", olive1 = "steel1",
  red3 = "red2",
  sand3 = "sand2", sand2 = "sand1",
  steel4 = "steel3",
  ink3 = "ink2",
}
local function flush(c) return function(img) for k, col in pairs(c) do img:drawPixel(k % W, k // W, K.color(HAZE[col] or col)) end end end
local function frame(f)
  return function(img)
    local c = {}
    local by = (f % 2 == 0) and 1 or 0       -- hull chatter (everything above the waterline)
    -- rooster-tail spray behind the cage (the fan blows it back)
    for i = 0, 11 do
      local x = 2 - math.floor(H(i, 1, f) * 3)
      local y = 16 - math.floor(H(i, 2, f) * 7)
      set(c, x, y, (H(i, 3, f) < 0.35) and "steel4" or "steel3")
    end
    -- fan cage: dark mesh disc, crosshair spokes, olive ring lit top-left
    local fx, fy = 8, 8 + by
    for y = -7, 7 do for x = -7, 7 do
      local d = math.sqrt(x * x + y * y)
      if d <= 6.3 then
        local col
        if d > 5.1 then col = ((x + y) < 2) and "olive3" or "olive2"
        elseif x == 0 or y == 0 then col = "olive2"
        else col = "olive1" end
        set(c, fx + x, fy + y, col)
      end
    end end
    -- prop: 2 blades, 45 deg per frame (period 180 deg = 4 frames); leading half lighter
    local ang = (f - 1) * math.pi / 4
    for r = 1, 4 do
      set(c, fx + math.cos(ang) * r, fy + math.sin(ang) * r, "sand3")
      set(c, fx - math.cos(ang) * r, fy - math.sin(ang) * r, "sand2")
    end
    set(c, fx, fy, "steel3")
    -- engine block in front of the cage + exhaust stack
    rect(c, 14, 9 + by, 3, 4, "steel2"); rect(c, 14, 9 + by, 3, 1, "steel3")
    set(c, 16, 7 + by, "steel1"); set(c, 16, 8 + by, "steel1")
    -- whip antenna + Regime pennant (flutters)
    for y = 0, 9 do set(c, 18, y + by, "ink3") end
    if f <= 2 then rect(c, 19, 0 + by, 3, 1, "red3"); rect(c, 19, 1 + by, 2, 1, "red2")
    else rect(c, 19, 0 + by, 2, 1, "red3"); set(c, 19, 1 + by, "red2"); set(c, 21, 1 + by, "red2"); set(c, 22, 1 + by, "red2") end
    -- raised seat + driver (red uniform, cap with brim, pale face)
    set(c, 19, 11 + by, "ink2"); set(c, 21, 11 + by, "ink2"); set(c, 19, 12 + by, "ink2"); set(c, 21, 12 + by, "ink2")
    rect(c, 19, 7 + by, 3, 4, "red2"); set(c, 19, 7 + by, "red3"); set(c, 20, 7 + by, "red3")
    set(c, 22, 9 + by, "red2")                                     -- arm to the stick
    set(c, 20, 6 + by, "sand3"); set(c, 21, 6 + by, "sand3")      -- face
    rect(c, 19, 5 + by, 3, 1, "red3"); set(c, 22, 5 + by, "red2")  -- cap + brim
    -- jerrycan
    rect(c, 23, 11 + by, 2, 2, "olive3"); set(c, 24, 12 + by, "olive2")
    -- bow gunner behind a pintle MG with a shield plate
    rect(c, 26, 10 + by, 2, 3, "red2"); set(c, 26, 10 + by, "red3")
    set(c, 27, 9 + by, "sand3")
    rect(c, 26, 8 + by, 2, 1, "red3"); set(c, 28, 8 + by, "red2")
    for y = 9, 11 do set(c, 29, y + by, "steel2") end; set(c, 29, 9 + by, "steel3")
    for x = 30, 33 do set(c, x, 10 + by, "steel1") end
    set(c, 30, 11 + by, "steel1")
    -- hull: flat bottom, olive with a top rim, red stripe, dark keel; the bow tips up
    local TOP = { [30] = 12, [31] = 12, [32] = 11, [33] = 10, [34] = 10 }
    local BOT = { [29] = 15, [30] = 15, [31] = 14, [32] = 13, [33] = 12, [34] = 11 }
    for x = 3, 34 do
      local top, bot = (TOP[x] or 13) + by, (BOT[x] or 16) + by
      for y = top, bot do
        local col = "olive2"
        if y == top then col = "olive3" elseif y == bot then col = "olive1" elseif y == 15 + by then col = "red2" end
        set(c, x, y, col)
      end
    end
    for x = 3, 4 do for y = 13 + by, 16 + by do set(c, x, y, (y == 13 + by) and "olive2" or "olive1") end end  -- stern face
    for x = 7, 27, 5 do set(c, x, 14 + by, "olive1") end                                                        -- rivet seams
    set(c, 32, 12 + by, "sand2")                                                                                -- bow eye decal
    -- bow spray + waterline foam
    for i = 0, 5 do
      local x = 34 + math.floor(H(i, 5, f) * 2)
      local y = 16 - math.floor(H(i, 6, f) * 4)
      set(c, x, y, (i % 2 == 0) and "steel4" or "steel3")
    end
    for x = 0, W - 1 do if (x + f * 3) % 5 < 3 then set(c, x, 17, (x > 30 or x < 4) and "steel4" or "steel3") end end
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
