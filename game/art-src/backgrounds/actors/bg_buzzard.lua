-- Background actor: far Buzzard gunship silhouette (simplified from enemies/buzzard), 24x12, facing RIGHT.
-- Tag bg_buzzard_fly: 2 frames @60 ms (main + tail rotor blur alternate). ink1/steel1/steel2, one dim red4 light.
-- Build: bash tools/build-art.sh art-src/backgrounds/actors/bg_buzzard.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local keys = { a = "ink1", b = "steel1", c = "steel2", r = "red4" }
local BODY = {
  "........................",
  "........................",
  "...........cc...........",
  "..c......bbbbbcc........",
  "..b.....bbbbbbbbcc......",
  ".cbbbbbbbbbbbbbbbbbc....",
  "..baaaaabbbbbbbbbbbbc...",
  "..b.....abbbbbbbbbbb....",
  ".........aabbbbbbbba....",
  "...........aaaaaaaa.....",
  "...........a.....a......",
  "..........aaaaaaaaaa....",
}
local function frame(f)
  return function(img, K)
    K.grid(img, BODY, keys)
    -- cockpit glass hint (dim) at the nose
    K.px(img, 18, 6, "steel3"); K.px(img, 17, 5, "steel3")
    -- main rotor blur
    if f == 1 then for x = 3, 22 do K.px(img, x, 1, (x < 12) and "steel2" or "steel1") end
    else for x = 6, 20 do if x % 3 ~= 0 then K.px(img, x, 1, "steel2") end end; K.px(img, 4, 1, "steel1"); K.px(img, 21, 1, "steel1") end
    K.px(img, 12, 2, "steel1")
    -- tail rotor blur
    if f == 1 then for y = 3, 7 do K.px(img, 1, y, "steel2") end else K.px(img, 0, 4, "steel1"); K.px(img, 1, 5, "steel2"); K.px(img, 2, 6, "steel1"); K.px(img, 0, 6, "steel1"); K.px(img, 2, 4, "steel1") end
    -- dim belly light
    K.px(img, 13, 9, "red4")
  end
end
K.build{
  name = "bg_buzzard", w = 24, h = 12,
  src = ROOT .. "/art-src/backgrounds/actors/bg_buzzard.aseprite",
  sheet = ROOT .. "/public/assets/sprites/bg/bg_buzzard.png",
  data = ROOT .. "/public/assets/sprites/bg/bg_buzzard.json",
  anims = { { tag = "bg_buzzard_fly", ms = 60, frames = { { grid = frame(1) }, { grid = frame(2) } } } },
  anchor = "center",
}
