-- bg_arc 24x40: distant tesla-coil electric arc. Origin TOP-CENTRE (coil tip at (12,0)).
-- Tag bg_arc_zap, 5 frames @50 ms: four different jagged bolts (branches on frames 2 and 4), frame 5 a faint remnant.
-- Build: bash tools/build-art.sh art-src/backgrounds/actors/bg_arc.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local W, HH = 24, 40

local function H(x, y, s)
  local h = (math.floor(x) * 374761393 + math.floor(y) * 668265263 + math.floor(s or 0) * 1442695041) & 0xffffffff
  h = ((h ~ (h >> 13)) * 1274126177) & 0xffffffff
  h = h ~ (h >> 16)
  return h / 4294967296
end

-- jagged polyline from (x0,y0) to (x1,y1): steps of 3-5 px down, sideways kicks
local function bolt(x0, y0, x1, y1, seed, kick)
  local pts = { { x0, y0 } }
  local n = math.max(3, math.floor(math.max(math.abs(y1 - y0), math.abs(x1 - x0)) / 4))
  for i = 1, n - 1 do
    local t = i / n
    local bx = x0 + (x1 - x0) * t
    local dx = (H(i, 1, seed) - 0.5) * 2 * kick
    pts[#pts + 1] = { math.floor(bx + dx + 0.5), math.floor(y0 + (y1 - y0) * t + (H(i, 2, seed) - 0.5) * 2 + 0.5) }
  end
  pts[#pts + 1] = { x1, y1 }
  return pts
end

local function collect(pts)
  local set, list = {}, {}
  for i = 1, #pts - 1 do
    local x0, y0, x1, y1 = pts[i][1], pts[i][2], pts[i + 1][1], pts[i + 1][2]
    local dx, dy = math.abs(x1 - x0), -math.abs(y1 - y0)
    local sx, sy = x0 < x1 and 1 or -1, y0 < y1 and 1 or -1; local err = dx + dy
    while true do
      local k = x0 .. "," .. y0
      if not set[k] then set[k] = true; list[#list + 1] = { x0, y0 } end
      if x0 == x1 and y0 == y1 then break end
      local e2 = 2 * err; if e2 >= dy then err = err + dy; x0 = x0 + sx end; if e2 <= dx then err = err + dx; y0 = y0 + sy end
    end
  end
  return list, set
end

local function inb(x, y) return x >= 0 and y >= 0 and x < W and y < HH end

-- draw a bolt: glow (weird4 sparse, weird5 adjacent) then white core
local function drawBolt(img, list, set, seed, glow)
  for i, p in ipairs(list) do
    for _, d in ipairs({ { -1, 0 }, { 1, 0 }, { 0, -1 }, { 0, 1 } }) do
      local x, y = p[1] + d[1], p[2] + d[2]
      if inb(x, y) and not set[x .. "," .. y] and H(x, y, seed) < glow then K.px(img, x, y, (H(x, y, seed + 9) < 0.3) and "weird5" or "weird4") end
    end
    for _, d in ipairs({ { -2, 0 }, { 2, 0 } }) do
      local x, y = p[1] + d[1], p[2] + d[2]
      if inb(x, y) and H(x, y, seed + 3) < glow * 0.25 then K.px(img, x, y, "weird4") end
    end
  end
  for _, p in ipairs(list) do if inb(p[1], p[2]) then K.px(img, p[1], p[2], "white") end end
end

local SHAPES = {
  { ex = 4,  ey = 37, seed = 11, kick = 3.5 },
  { ex = 19, ey = 38, seed = 23, kick = 4.0, br = { at = 0.4, ex = 3, ey = 26, seed = 5 } },
  { ex = 7,  ey = 39, seed = 37, kick = 4.5 },
  { ex = 17, ey = 36, seed = 41, kick = 3.5, br = { at = 0.55, ex = 22, ey = 30, seed = 8 } },
}

local function frame(i)
  return function(img, K)
    local s = SHAPES[i]
    local pts = bolt(12, 0, s.ex, s.ey, s.seed, s.kick)
    local list, set = collect(pts)
    if s.br then
      local j = math.max(2, math.floor(#pts * s.br.at))
      local bp = bolt(pts[j][1], pts[j][2], s.br.ex, s.br.ey, s.br.seed, 3.5)
      local bl, bs = collect(bp)
      drawBolt(img, bl, bs, s.seed + 50, 0.35)
    end
    drawBolt(img, list, set, s.seed, 0.45)
    -- coil-tip spark
    K.px(img, 11, 0, "weird5"); K.px(img, 13, 0, "weird5")
  end
end

local function remnant(img, K)
  local s = SHAPES[4]
  local list = collect(bolt(12, 0, s.ex, s.ey, s.seed, s.kick))
  for i, p in ipairs(list) do
    local h = H(p[1], p[2], 77)
    if i <= 3 then K.px(img, p[1], p[2], "weird5")
    elseif h < 0.12 then K.px(img, p[1], p[2], "weird5")
    elseif h < 0.3 then K.px(img, p[1], p[2], "weird4") end
  end
  K.px(img, 12, 0, "white")
end

K.build{
  name = "bg_arc", w = W, h = HH,
  src   = ROOT .. "/art-src/backgrounds/actors/bg_arc.aseprite",
  sheet = ROOT .. "/public/assets/sprites/bg/bg_arc.png",
  data  = ROOT .. "/public/assets/sprites/bg/bg_arc.json",
  anims = { { tag = "bg_arc_zap", ms = 50, frames = {
    { grid = frame(1) }, { grid = frame(2) }, { grid = frame(3) }, { grid = frame(4) }, { grid = remnant },
  } } },
  anchor = "top-center",
}
