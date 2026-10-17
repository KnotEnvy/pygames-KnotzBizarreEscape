-- bg_fissure 160x10: distant ice fissure racing left->right across the frozen lake. Origin LEFT-CENTRE (0,5).
-- Tag bg_fissure_crack, 8 frames @60 ms: grows ~1/6 width per frame (full by frame 6), frames 6-8 ice-spray puffs
-- pop along it; frame 8 holds (crack fully visible, spray thinning).
-- Build: bash tools/build-art.sh art-src/backgrounds/actors/bg_fissure.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local W, HH, MID = 160, 10, 5

local function H(x, y, s)
  local h = (math.floor(x) * 374761393 + math.floor(y) * 668265263 + math.floor(s or 0) * 1442695041) & 0xffffffff
  h = ((h ~ (h >> 13)) * 1274126177) & 0xffffffff
  h = h ~ (h >> 16)
  return h / 4294967296
end

-- crack centreline: bounded random walk, steps every 2-5 px
local CY, WIDE = {}, {}
do
  local y, run = MID, 0
  for x = 0, W - 1 do
    if run <= 0 then
      local r = H(x, 0, 1)
      if r < 0.33 and y > MID - 2 then y = y - 1 elseif r > 0.67 and y < MID + 1 then y = y + 1 end
      run = 2 + math.floor(H(x, 1, 1) * 4)
    end
    run = run - 1
    CY[x] = y
    WIDE[x] = H(x // 3, 2, 1) < 0.35   -- 2 px thick stretches
  end
end
-- small branches: {x, dir(-1 up/+1 down), len}
local BR = {}
for x = 8, W - 6, 1 do
  if H(x, 5, 3) < 0.07 then BR[#BR + 1] = { x, (H(x, 6, 3) < 0.5) and -1 or 1, 2 + math.floor(H(x, 7, 3) * 3) } end
end
-- spray puff sites
local PUFFS = { 14, 37, 58, 83, 104, 127, 149 }

local function inb(x, y) return x >= 0 and y >= 0 and x < W and y < HH end
local function px(img, x, y, c) if inb(x, y) then K.px(img, x, y, c) end end

local function crack(img, len)
  for x = 0, len - 1 do
    local y = CY[x]
    px(img, x, y, (H(x, 3, 2) < 0.25) and "ink2" or "sky2")
    if WIDE[x] then px(img, x, y + 1, "ink2") end
    -- highlight lip just below the dark line (catches top-left light)
    local hy = y + (WIDE[x] and 2 or 1)
    local h = H(x, 4, 2)
    if h < 0.45 then px(img, x, hy, "ink6") elseif h < 0.55 then px(img, x, hy, "white") end
    -- joint between steps
    if x > 0 and CY[x - 1] ~= y then px(img, x, math.min(y, CY[x - 1]), "sky2"); px(img, x - 1, y, "ink2") end
  end
  for _, b in ipairs(BR) do
    if b[1] + b[3] < len then
      local x, y = b[1], CY[b[1]]
      for k = 1, b[3] do
        x = x + 1; y = y + b[2]
        if k == b[3] and b[3] > 2 then y = y - b[2] end
        px(img, x, y, (k == 1) and "sky2" or "ink2")
      end
    end
  end
  -- racing tip
  if len < W then
    local tx = len - 1
    px(img, tx, CY[tx], "white"); px(img, tx + 1, CY[tx], "ink6")
    px(img, tx - 1, CY[tx] - 1, "ink6")
  end
end

-- dithered spray puff rising above the crack at site sx; stage 1 pop, 2 full, 3 thinning
local function puff(img, sx, stage, seed)
  local base = CY[sx] - 1
  local r = ({ 2.2, 3.2, 3.8 })[stage]
  local dens = ({ 0.95, 0.7, 0.3 })[stage]
  local cyy = base - ({ 1, 2, 3 })[stage]
  for y = -4, 4 do for x = -5, 5 do
    local d = math.sqrt((x * 0.8) ^ 2 + (y * 1.1) ^ 2)
    if d <= r and H(sx + x, y, seed) < dens * (1.2 - 0.5 * d / r) then
      local c = ((x + y) < 0 or H(x, y, seed + 1) < 0.4) and "white" or "ink6"
      local yy = cyy + y
      if yy < base + 1 then px(img, sx + x, yy, c) end
    end
  end end
end

local frames = {}
for f = 1, 8 do
  frames[f] = { grid = function(img, K)
    local len = math.min(W, math.floor(W * f / 6 + 0.5))
    crack(img, len)
    -- a little kicked-up ice right behind the racing tip
    if f < 6 then puff(img, len - 6, 1, 40 + f) end
    if f >= 6 then
      for i, sx in ipairs(PUFFS) do
        local stage = f - 5 - ((i % 2 == 0) and 1 or 0)   -- odd sites pop first
        if f == 8 then stage = (i % 2 == 0) and 2 or 3 end
        if stage >= 1 then puff(img, sx, stage, 10 * i + f) end
      end
    end
  end }
end

K.build{
  name = "bg_fissure", w = W, h = HH,
  src   = ROOT .. "/art-src/backgrounds/actors/bg_fissure.aseprite",
  sheet = ROOT .. "/public/assets/sprites/bg/bg_fissure.png",
  data  = ROOT .. "/public/assets/sprites/bg/bg_fissure.json",
  anims = { { tag = "bg_fissure_crack", ms = 60, frames = frames } },
  anchor = "left-center",
}
