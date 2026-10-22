-- Background actor: forked lightning bolt for horizon storm strikes. 40x120, origin TOP-CENTRE (bolt enters at (20,0)).
-- Core ink6 (main channel) / sky5 (forks), sparse weird3 glow pixels beside the channel.
-- Tag bg_bolt_strike 4 f @50 ms, play once: leader (top 60%), full strike with forks, fading return stroke, remnant.
-- Made for ADD at alpha <= 0.8 (dim it further for reduced flash). Build: bash tools/build-art.sh art-src/backgrounds/actors/bg_bolt.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local W, HH = 40, 120

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
local function jag(x0, y0, x1, y1, seed, kick, step)
  local pts = { { x0, y0 } }
  local n = math.max(2, math.floor(math.abs(y1 - y0) / step))
  for i = 1, n - 1 do
    local t = i / n
    pts[#pts + 1] = { math.floor(x0 + (x1 - x0) * t + (H(i, 1, seed) - 0.5) * 2 * kick + 0.5), math.floor(y0 + (y1 - y0) * t + 0.5) }
  end
  pts[#pts + 1] = { x1, y1 }
  return pts
end
local MAIN = jag(20, 0, 15, 119, 7, 4, 7)
local function pointAt(pts, frac) local i = math.max(1, math.min(#pts, math.floor(frac * (#pts - 1)) + 1)); return pts[i][1], pts[i][2] end
local FORKS = {}
do
  local fx, fy = pointAt(MAIN, 0.22); FORKS[1] = { pts = jag(fx, fy, fx + 14, fy + 34, 11, 3, 5), big = true }
  fx, fy = pointAt(MAIN, 0.45); FORKS[2] = { pts = jag(fx, fy, fx - 13, fy + 26, 13, 3, 5), big = true }
  fx, fy = pointAt(MAIN, 0.64); FORKS[3] = { pts = jag(fx, fy, fx + 10, fy + 16, 17, 2, 4), big = false }
  local gx, gy = pointAt(FORKS[1].pts, 0.6); FORKS[4] = { pts = jag(gx, gy, gx + 5, gy + 14, 19, 2, 4), big = false }
end
local function stroke(c, pts, col, maxY, glow, seed, wide)
  for i = 1, #pts - 1 do
    local x0, y0, x1, y1 = pts[i][1], pts[i][2], pts[i + 1][1], pts[i + 1][2]
    local n = math.max(math.abs(x1 - x0), math.abs(y1 - y0), 1)
    for k = 0, n do
      local x, y = math.floor(x0 + (x1 - x0) * k / n + 0.5), math.floor(y0 + (y1 - y0) * k / n + 0.5)
      if y <= maxY then
        if glow > 0 then
          for _, d in ipairs({ { -1, 0 }, { 1, 0 }, { -2, 0 }, { 2, 0 } }) do
            if H(x + d[1], y, seed) < glow * ((math.abs(d[1]) == 1) and 1 or 0.4) and not get(c, x + d[1], y) then set(c, x + d[1], y, "weird3") end
          end
        end
        set(c, x, y, col)
        if wide and y < 50 then set(c, x + 1, y, col) end
      end
    end
  end
end
local function frame(f)
  return function(img)
    local c = {}
    if f == 1 then
      stroke(c, MAIN, "sky5", 72, 0.15, 1, false)
      local fx, fy = pointAt(MAIN, 0.22); stroke(c, jag(fx, fy, fx + 6, fy + 12, 11, 2, 4), "sky4", 72, 0, 1, false)
    elseif f == 2 then
      stroke(c, MAIN, "ink6", 119, 0.45, 2, true)
      for _, fk in ipairs(FORKS) do stroke(c, fk.pts, "sky5", 119, fk.big and 0.3 or 0.15, 3, false) end
      for x = 11, 19 do if H(x, 0, 9) < 0.6 then set(c, x, 118 + (x % 2), "weird3") end end   -- ground splash glow
    elseif f == 3 then
      stroke(c, MAIN, "sky5", 119, 0.2, 4, false)
      for _, fk in ipairs(FORKS) do if fk.big then stroke(c, fk.pts, "sky4", 119, 0, 5, false) end end
    else
      local pts = MAIN
      for i = 1, #pts - 1 do
        if H(i, 4, 21) < 0.55 then stroke(c, { pts[i], pts[i + 1] }, (i < 6) and "weird3" or "sky4", 119, 0, 6, false) end
      end
    end
    flush(c)(img)
  end
end
local frames = {}; for f = 1, 4 do frames[f] = { grid = frame(f) } end
K.build{
  name = "bg_bolt", w = W, h = HH,
  src = ROOT .. "/art-src/backgrounds/actors/bg_bolt.aseprite",
  sheet = ROOT .. "/public/assets/sprites/bg/bg_bolt.png",
  data = ROOT .. "/public/assets/sprites/bg/bg_bolt.json",
  anims = { { tag = "bg_bolt_strike", ms = 50, frames = frames } },
  anchor = "top-center",
}
