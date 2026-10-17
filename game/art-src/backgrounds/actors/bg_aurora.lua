-- bg_aurora 128x56: tileable aurora curtain segment (Part III sky). Engine draws it ADD @ ~0.35 alpha.
-- Tag bg_aurora_shimmer, 6 frames @160 ms, loops. Left/right edges tile seamlessly (all x terms have
-- integer cycles over 128 px; drift phases advance whole cycles over the loop).
-- Build: bash tools/build-art.sh art-src/backgrounds/actors/bg_aurora.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local W, HH, N = 128, 56, 6
local TAU = math.pi * 2

local function H(x, y, s)
  local h = (math.floor(x) * 374761393 + math.floor(y) * 668265263 + math.floor(s or 0) * 1442695041) & 0xffffffff
  h = ((h ~ (h >> 13)) * 1274126177) & 0xffffffff
  h = h ~ (h >> 16)
  return h / 4294967296
end
local BAYER = { { 0, 8, 2, 10 }, { 12, 4, 14, 6 }, { 3, 11, 1, 9 }, { 15, 7, 13, 5 } }
local function bay(x, y) return (BAYER[(y % 4) + 1][(x % 4) + 1] + 0.5) / 16 end
local function smooth(a, b, v) local t = math.max(0, math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t) end

local function frame(t)
  local ph = TAU * t / N
  return function(img, K)
    for x = 0, W - 1 do
      local u = TAU * x / W
      -- curtain edges wave along x
      local bot = 43 + 3 * math.sin(2 * u + 0.6) + 1.5 * math.sin(5 * u - ph + 1.1)
      local top = 9 + 3 * math.sin(3 * u + 2.0) + 1.5 * math.sin(4 * u + ph)
      for y = 0, HH - 1 do
        -- rays slant slightly (curtain fold); periodic in x, so still seamless
        local v = u + (y - 28) * 0.012
        local r = 0.5 + 0.5 * (0.40 * math.sin(3 * v + 0.3)
          + 0.30 * math.sin(7 * v - ph)
          + 0.20 * math.sin(13 * v + ph + 1.7)
          + 0.10 * math.sin(23 * v - 2 * ph))
        -- vertical envelope: crisp-ish lower hem, long fade upward
        local e = smooth(bot + 4, bot - 3, y) * smooth(top - 6, top + 14, y)
        local p = e * (0.24 + 0.95 * r * r)
        -- vertically correlated noise -> streaky rays
        local thr = 0.45 * bay(x, y) + 0.35 * H(x, y // 4, 11 + t) + 0.2 * H(x, y, 5 + t)
        if p > thr then
          local c
          local hem = bot - y
          if hem < 3 and r > 0.55 then c = "weird5"
          elseif y < top + 7 then
            -- top fringe: a few violet / pale-blue rays
            local band = 0.5 + 0.5 * math.sin(5 * v + 0.9 + ph)
            if band > 0.78 then c = "weird3" elseif band < 0.16 then c = "sky5" else c = "weird4" end
          elseif r > 0.78 and H(x, y, 3 + t) < 0.5 then c = "weird5"
          else c = "weird4" end
          K.px(img, x, y, c)
        end
      end
    end
  end
end

local frames = {}
for t = 0, N - 1 do frames[#frames + 1] = { grid = frame(t) } end
K.build{
  name = "bg_aurora", w = W, h = HH,
  src   = ROOT .. "/art-src/backgrounds/actors/bg_aurora.aseprite",
  sheet = ROOT .. "/public/assets/sprites/bg/bg_aurora.png",
  data  = ROOT .. "/public/assets/sprites/bg/bg_aurora.json",
  anims = { { tag = "bg_aurora_shimmer", ms = 160, frames = frames } },
  anchor = "top-left",
}
