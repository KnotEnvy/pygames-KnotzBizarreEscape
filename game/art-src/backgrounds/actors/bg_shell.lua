-- Background actor: SHELLSHOCK foreshadowing. A huge riveted turtle-shell dome breaking a far pond surface.
-- 56x24, origin BOTTOM-CENTRE (row 23 = waterline). Rust-green armour (olive ramp, dirt3 rust), scute seams with steel3
-- rivets, steel spikes on the crown, moss strands. Water cascades off as it rises; bubbles as it sinks.
-- Tags: bg_shell_rise 6 f @110 ms (ripples -> spikes break -> dome rises streaming water -> holds),
--       bg_shell_sink 4 f @110 ms (reverse with bubbles). Build: bash tools/build-art.sh art-src/backgrounds/actors/bg_shell.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local W, HH = 56, 24

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
local CX, RX, RY, FULL = 27.5, 21, 15, 15
local SURF = 22                       -- last dome row above water; rows 22-23 carry foam / ripples
-- plate id for a dome-local normalised point: centre scutes, ring of costal scutes, marginal tiles
local function pid(nx, ny)
  local r = math.sqrt(nx * nx + ny * ny)
  local ang = math.atan(-ny, nx)                       -- 0 = right, pi/2 = up, pi = left
  if r > 0.84 then return 100 + math.floor(ang / (math.pi / 11)) end
  if r > 0.5 then return 50 + math.floor(ang / (math.pi / 5)) end
  if nx < -0.19 then return 1 elseif nx > 0.19 then return 3 else return 2 end
end
local function dome(c, h, f)
  local cy = SURF + (FULL - h)        -- ellipse centre row (base of the dome)
  local top = cy - RY
  local function norm(x, y) return (x + 0.5 - CX) / RX, (y + 0.5 - cy) / RY end
  local function inside(x, y) local nx, ny = norm(x, y); return nx * nx + ny * ny <= 1 and ny <= 0.02 end
  for y = math.max(0, math.floor(top)), SURF - 1 do
    for x = 0, W - 1 do
      if inside(x, y) then
        local nx, ny = norm(x, y)
        local l = -0.55 * nx - 0.85 * ny
        local id = pid(nx, ny)
        local col = (l > 0.8) and "olive3" or ((l > 0.35) and "olive2" or "olive1")
        if id >= 100 then col = (l > 0.6) and "olive2" or ((l > 0.1) and "olive1" or "dirt1") end   -- darker marginal tiles
        -- bevel: lit edge where the up-left neighbour is another plate, seam where right/down neighbour differs
        local ul = pid(norm(x - 1, y - 1))
        local rn, dn = pid(norm(x + 1, y)), pid(norm(x, y + 1))
        if ul ~= id and inside(x - 1, y - 1) then col = (l > 0.3) and "olive4" or "olive3" end
        if (rn ~= id and inside(x + 1, y)) or (dn ~= id and inside(x, y + 1) and y < SURF - 1) then col = "dirt1" end
        set(c, x, y, col)
      end
    end
  end
  -- rivets: one per marginal tile, on the tile centre line
  for k = 0, 10 do
    local ang = (k + 0.5) * math.pi / 11
    local x, y = CX + math.cos(ang) * RX * 0.92 - 0.5, cy - math.sin(ang) * RY * 0.92 - 0.5
    if y < SURF and get(c, math.floor(x + 0.5), math.floor(y + 0.5)) then set(c, x, y, (ang > 1.2) and "steel3" or "steel2") end
  end
  -- a few rust runs on the shaded side
  for _, rx in ipairs({ 36, 40, 43 }) do
    local nx = (rx + 0.5 - CX) / RX
    local yt = math.floor(cy - RY * math.sqrt(math.max(0, 1 - nx * nx)) + 3)
    for k = 0, 2 do if yt + k < SURF and get(c, rx, yt + k) then set(c, rx, yt + k, "dirt2") end end
  end
  -- moss strands hanging down the sides
  for _, mx in ipairs({ 10, 13, 20, 34, 41, 45 }) do
    local nx = (mx + 0.5 - CX) / RX
    local yt = cy - RY * math.sqrt(math.max(0, 1 - nx * nx))
    local len = 2 + math.floor(H(mx, 1, 9) * 4)
    for k = 0, len do local y = math.floor(yt + 1 + k); if y < SURF then set(c, mx, y, (k == 0) and "leaf4" or "leaf3") end end
  end
  return top, cy
end
-- crown spikes (drawn after the water so they stay crisp)
local function spikes(c, h)
  local cy = SURF + (FULL - h); local top = cy - RY
  for _, sp in ipairs({ { 15, 2.6, 2 }, { 21, 0.7, 3 }, { 27, 0.0, 4 }, { 33, 0.6, 3 }, { 39, 2.4, 2 } }) do
    local sx = sp[1]; local base = math.floor(top + 1 + sp[2] + 0.5)
    for k = 0, sp[3] do
      local y = base - k
      if y < SURF then
        set(c, sx, y, (k == sp[3]) and "steel4" or "steel3")
        if k < sp[3] - 1 then set(c, sx + 1, y, "steel1") end
        if k == 0 then set(c, sx - 1, y, "steel2"); set(c, sx + 2, y, "ink1") end
      end
    end
  end
end
-- water streams running down the dome (amount 0..1)
local function streams(c, h, amt, f)
  if h <= 0 or amt <= 0 then return end
  local cy = SURF + (FULL - h)
  for x = 7, 48 do
    if H(x, f, 21) < amt * 0.35 then
      local nx = (x + 0.5 - CX) / RX
      if math.abs(nx) < 0.97 then
        local yt = cy - RY * math.sqrt(1 - nx * nx)
        local y0 = math.floor(yt + H(x, f, 22) * 3)
        local len = 2 + math.floor(H(x, f, 23) * 6 * amt)
        for k = 0, len do local y = y0 + k; if y < SURF and get(c, x, y) then set(c, x, y, (k == 0) and "ink4" or ((k % 3 == 1) and "steel2" or "steel3")) end end
      end
    end
  end
end
local function water(c, h, foam, rip, bubbles, f)
  -- the dome footprint at the surface
  local cy = SURF + (FULL - h)
  local half = (h > 0) and RX * math.sqrt(math.max(0, 1 - ((SURF - cy) / RY) ^ 2)) or 0
  -- ripple rings on rows 22-23 (widen with rip)
  for x = 0, W - 1 do
    local dx = math.abs(x + 0.5 - CX)
    local onRing = false
    for _, rr in ipairs({ half + 2 + rip * 4, half + 6 + rip * 7 }) do if math.abs(dx - rr) < 1.6 then onRing = true end end
    if dx < half + 1 and foam > 0 then set(c, x, 22, (H(x, f, 31) < 0.5) and "steel4" or "steel3") end
    if onRing and (x + f) % 3 ~= 0 then set(c, x, 23, "steel3") end
    if dx < half + 3 and (x + f) % 2 == 0 then set(c, x, 23, "ink3") end
  end
  -- splash / foam spray around the base
  for i = 1, foam do
    local side = (i % 2 == 0) and 1 or -1
    local x = CX + side * (half + 1 + H(i, f, 41) * 4)
    local y = 21 - math.floor(H(i, f, 42) * (2 + foam / 3))
    set(c, x, y, (H(i, f, 43) < 0.5) and "ink4" or "steel3")
  end
  -- bubbles: small rings / dots popping beside the dome
  for i = 1, bubbles do
    local x = math.floor(CX + (H(i, f, 51) - 0.5) * (half * 2 + 14))
    local y = 21 - math.floor(H(i, f, 52) * 3)
    if not get(c, x, y) then
      if H(i, f, 53) < 0.4 then set(c, x, y, "ink4"); set(c, x + 1, y, "steel3"); set(c, x, y - 1, "steel3")
      else set(c, x, y, "steel3") end
    end
  end
end
local function frame(h, amt, foam, rip, bubbles, f)
  return function(img)
    local c = {}
    if h > 0 then dome(c, h, f); streams(c, h, amt, f); spikes(c, h) end
    if h == 0 and foam > 0 then for x = 21, 34 do set(c, x, 21, (x % 3 == 0) and "ink4" or "steel3") end end   -- water hump
    water(c, h, foam, rip, bubbles, f)
    flush(c)(img)
  end
end
K.build{
  name = "bg_shell", w = W, h = HH,
  src = ROOT .. "/art-src/backgrounds/actors/bg_shell.aseprite",
  sheet = ROOT .. "/public/assets/sprites/bg/bg_shell.png",
  data = ROOT .. "/public/assets/sprites/bg/bg_shell.json",
  anims = {
    { tag = "bg_shell_rise", ms = 110, frames = {
      { grid = frame(0, 0, 0, 0, 2, 1) }, { grid = frame(3, 1, 6, 0.3, 0, 2) }, { grid = frame(7, 1, 8, 0.6, 0, 3) },
      { grid = frame(11, 0.8, 6, 0.8, 0, 4) }, { grid = frame(15, 0.5, 3, 1, 0, 5) }, { grid = frame(15, 0.15, 0, 0.4, 0, 6) } } },
    { tag = "bg_shell_sink", ms = 110, frames = {
      { grid = frame(13, 0.3, 2, 0.2, 4, 7) }, { grid = frame(8, 0.4, 4, 0.5, 6, 8) }, { grid = frame(3, 0.2, 3, 0.8, 7, 9) },
      { grid = frame(0, 0, 0, 1, 8, 10) } } },
  },
  anchor = "bottom-center",
}
