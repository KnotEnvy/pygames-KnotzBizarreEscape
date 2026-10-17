-- Background actor: tall far smoke column (armoured loco smoke / engine smoke behind a gate). 48x96, bottom-centre.
-- Tag bg_plume_rise: 6 frames @140 ms. Billows sit on a 12 px lattice and rise 2 px/frame, so frame 7 == frame 1.
-- Everything (size, tone, lean, erosion) is a function of the billow's height, which keeps the loop seamless.
-- No outlines; dark ink1-3 at the base fading to ink3-5 and breaking up at the top, leaning left.
-- Build: bash tools/build-art.sh art-src/backgrounds/actors/bg_plume.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local W, Hh = 48, 96
local function H(x, y, s)
  local h = (math.floor(x) * 374761393 + math.floor(y) * 668265263 + math.floor(s or 0) * 1442695041) & 0xffffffff
  h = ((h ~ (h >> 13)) * 1274126177) & 0xffffffff
  return (h ~ (h >> 16)) / 4294967296
end
local SP, STEP = 12, 2
-- tone ramps by height band: { shadow, base, lit }
local TONES = {
  { "ink1", "ink1", "ink2" },
  { "ink1", "ink2", "ink3" },
  { "ink2", "ink3", "ink3" },
  { "ink3", "ink3", "ink4" },
  { "ink3", "ink4", "ink4" },
}

local function frame(f)
  return function(img)
    local buf = {}   -- buf[y*W+x] = { band(height t), shade index } ; painter order bottom over top
    local function put(x, y, c) if x >= 0 and y >= 0 and x < W and y < Hh then buf[y * W + x] = c end end
    -- top-most billows first, lower (denser, nearer the source) painted over them
    local blobs = {}
    for k = -1, 10 do
      local by = (Hh + 6) - (k * SP + (f - 1) * STEP)   -- centre y of this slot
      blobs[#blobs + 1] = by
    end
    table.sort(blobs)   -- ascending y: highest on screen first
    for _, by in ipairs(blobs) do
      local t = math.max(0, math.min(1, (Hh + 6 - by) / (Hh + 4)))   -- 0 at base, 1 at top
      local cx = 25 - 9 * t ^ 1.6                                  -- lean left toward the top
      local r = 6.5 + 3.5 * math.sin(math.min(1, t * 1.4) * math.pi * 0.85) - 2.5 * math.max(0, t - 0.7) / 0.3
      local off = 3 + 2 * math.sin(by * 0.37)
      local band = math.min(#TONES, 1 + math.floor(t * #TONES))
      local erode = math.max(0, (t - 0.55) / 0.45)                 -- 0..1 dissolving near the top
      for _, sub in ipairs({ { -off, 0.9, 1 }, { off * 0.8, 0.8, 2 }, { off * 0.2, 0.75, 3 } }) do
        local sx = cx + sub[1]; local sy = by - (sub[3] == 3 and r * 0.6 or 0); local rr = r * sub[2]
        for j = math.floor(-rr - 1), math.ceil(rr + 1) do for i = math.floor(-rr - 1), math.ceil(rr + 1) do
          local d2 = (i * i + j * j) / (rr * rr)
          if d2 <= 1 then
            -- erosion keyed to blob-relative coords so the pattern rides with the billow
            local keep = H(i + 20, j + 20, sub[3]) >= erode * (0.35 + 0.65 * d2) or d2 < 0.15 and erode < 0.8
            if keep then
              -- crescents: lit rim top-left, shadow rim bottom-right (shifted-circle tests)
              local s = 2
              local a = rr * 0.38
              if ((i + a) ^ 2 + (j + a) ^ 2) > rr * rr then s = 1
              elseif ((i - a) ^ 2 + (j - a) ^ 2) > rr * rr then s = 3 end
              put(math.floor(sx + i), math.floor(sy + j), TONES[band][s])
            end
          end
        end end
      end
    end
    for key, c in pairs(buf) do K.px(img, key % W, key // W, c) end
  end
end

local frames = {}
for f = 1, 6 do frames[f] = { grid = frame(f) } end
K.build{
  name = "bg_plume", w = W, h = Hh,
  src = ROOT .. "/art-src/backgrounds/actors/bg_plume.aseprite",
  sheet = ROOT .. "/public/assets/sprites/bg/bg_plume.png",
  data = ROOT .. "/public/assets/sprites/bg/bg_plume.json",
  anims = { { tag = "bg_plume_rise", ms = 140, frames = frames } },
  anchor = "bottom-center",
}
