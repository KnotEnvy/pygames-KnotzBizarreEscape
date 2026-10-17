-- Background actor: far searchlight beam cone, 24x150. Lamp point at the BOTTOM CENTRE, cone widens upward to ~22 px.
-- Tag bg_beam_on: 1 frame. Binary alpha, dithered (engine draws it ADD-blended at ~0.3 alpha and rotates it).
-- Build: bash tools/build-art.sh art-src/backgrounds/actors/bg_beam.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local W, Hh = 24, 150
local BAYER = { { 0, 8, 2, 10 }, { 12, 4, 14, 6 }, { 3, 11, 1, 9 }, { 15, 7, 13, 5 } }
local function Hs(x, y)
  local h = (x * 374761393 + y * 668265263) & 0xffffffff
  h = ((h ~ (h >> 13)) * 1274126177) & 0xffffffff
  return (h ~ (h >> 16)) / 4294967296
end
local set, total = 0, 0
local function draw(img)
  local cx = 11.5
  for y = 0, Hh - 1 do
    local d = (Hh - 1 - y) / (Hh - 1)          -- 0 at lamp, 1 at top
    local hw = 1.0 + d * 10.0                  -- half width
    for x = 0, W - 1 do
      local u = (x + 0.5 - cx) / hw            -- -1..1 across the cone
      if math.abs(u) <= 1 then
        total = total + 1
        local band = 0.5 + 0.5 * math.cos(u * 7.0 + 0.6)     -- soft vertical streaks
        local p = (1.05 - 0.5 * d) * (1 - 0.75 * u * u) * (0.8 + 0.25 * band)
        if d < 0.06 then p = 1 end
        local th = (BAYER[y % 4 + 1][x % 4 + 1] + 0.5) / 16 * 0.7 + Hs(x, y) * 0.3
        if p > th then
          set = set + 1
          local c = "sky5"
          if math.abs(u) < 0.35 and p > 0.55 then c = "white" elseif math.abs(u) < 0.7 then c = "ink6" end
          if band > 0.8 and math.abs(u) < 0.8 then c = (c == "sky5") and "ink6" or "white" end
          K.px(img, x, y, c)
        end
      end
    end
  end
  print(string.format("beam fill %.0f%% (%d/%d)", set / total * 100, set, total))
end
K.build{
  name = "bg_beam", w = W, h = Hh,
  src = ROOT .. "/art-src/backgrounds/actors/bg_beam.aseprite",
  sheet = ROOT .. "/public/assets/sprites/bg/bg_beam.png",
  data = ROOT .. "/public/assets/sprites/bg/bg_beam.json",
  anims = { { tag = "bg_beam_on", ms = 1000, frames = { { grid = draw } } } },
  anchor = "bottom-center (lamp point)",
}
