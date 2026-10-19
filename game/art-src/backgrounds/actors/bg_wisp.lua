-- Background actor: swamp-gas will-o'-wisp hovering over water. 8x14, origin BOTTOM-CENTRE (the water surface).
-- Small green teardrop flame (weird4 skin, weird5 body, fire5 heart) floating above a faint weird4 reflection (rows 12-13).
-- Tag bg_wisp_flicker 6 f @80 ms: the tip sways and stretches, a spark breaks off and rises. Made for ADD blend at ~0.7.
-- Build: bash tools/build-art.sh art-src/backgrounds/actors/bg_wisp.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local W, HH = 8, 14

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
local keys = { g = "weird4", l = "weird5", f = "fire5" }
local F = {
  { "........", "........", "....g...", "...gg...", "...glg..", "..gllg..", "..glllg.", ".gllflg.", ".glfflg.", ".gllllg.", "..gllg..", "........", "..g.gg..", "...gg..." },
  { ".....g..", "........", "....g...", "....gg..", "...glg..", "..gllg..", "..glllg.", ".gllflg.", ".glfflg.", ".gllllg.", "..gllg..", "........", "..gg.g..", "...gg..." },
  { "......g.", "........", "........", ".....g..", "...ggg..", "..glgg..", "..glllg.", ".gllflg.", ".glfflg.", ".gllllg.", "..gllg..", "........", "...g.g..", "..gg...." },
  { "........", "........", "........", "........", "...g....", "...gg...", "..gllg..", ".gllllg.", ".glfflg.", ".gllllg.", "..gllg..", "........", "..ggg...", "....g..." },
  { "........", ".g......", "........", "..g.....", "..gg....", "..glg...", "..gllg..", ".glllg..", ".glfflg.", ".gllllg.", "..gllg..", "........", "..g.gg..", "...gg..." },
  { ".g......", "........", "...g....", "..gg....", "..glg...", "..gllg..", "..glllg.", ".gllflg.", ".glfflg.", ".gllllg.", "..gllg..", "........", "..gg.g..", "....gg.." },
}
local frames = {}; for f = 1, 6 do frames[f] = { grid = F[f] } end
K.build{
  name = "bg_wisp", w = W, h = HH,
  src = ROOT .. "/art-src/backgrounds/actors/bg_wisp.aseprite",
  sheet = ROOT .. "/public/assets/sprites/bg/bg_wisp.png",
  data = ROOT .. "/public/assets/sprites/bg/bg_wisp.json",
  keys = keys,
  anims = { { tag = "bg_wisp_flicker", ms = 80, frames = frames } },
  anchor = "bottom-center",
}
