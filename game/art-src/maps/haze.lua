-- Stage 1 near-parallax haze: a cold, ordered-dithered mist band (binary alpha, palette colours only) that sits
-- between the generated far layers and the tile layers to push the backgrounds back.
-- Build: bash tools/build-art.sh art-src/maps/haze.lua  -> public/assets/backgrounds/stage1/haze.png (384x64, tiles in X)
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local W, H = 384, 64
local img = Image(W, H, ColorMode.RGB)
local BAYER = { { 0, 8, 2, 10 }, { 12, 4, 14, 6 }, { 3, 11, 1, 9 }, { 15, 7, 13, 5 } }
for y = 0, H - 1 do
  for x = 0, W - 1 do
    -- density rises toward the bottom, with slow horizontal swells (period divides W so it wraps)
    local swell = math.sin(x / W * 2 * math.pi * 3) * 0.08 + math.sin(x / W * 2 * math.pi * 7 + 1.3) * 0.05
    local d = (y / (H - 1)) ^ 2.2 * 0.32 + swell * 0.5
    if d * 16 > BAYER[y % 4 + 1][x % 4 + 1] + 0.5 then
      img:drawPixel(x, y, K.color((y > H * 0.6) and "sky5" or "ink6"))
    end
  end
end
local spr = Sprite(W, H, ColorMode.RGB)
spr.cels[1].image = img
spr:saveCopyAs(ROOT .. "/public/assets/backgrounds/stage1/haze.png")
spr:close()
print("built haze (" .. W .. "x" .. H .. ")")
