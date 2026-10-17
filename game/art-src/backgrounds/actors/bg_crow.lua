-- Background actor: far crow, 8x6, facing RIGHT. Tag bg_crow_flap: 4 frames @80 ms (up, mid, down, mid).
-- Silhouette in outline with a single ink2 highlight. Build: bash tools/build-art.sh art-src/backgrounds/actors/bg_crow.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local keys = { o = "outline", h = "ink2" }
local UP = {
  "..o.....",
  "...o....",
  "...oo.o.",
  "..oooooo",
  "ohooo...",
  "........",
}
local MID = {
  "........",
  "........",
  "..ooo.o.",
  ".hoooooo",
  "oooo....",
  "........",
}
local DOWN = {
  "........",
  "........",
  "......o.",
  "..oooooo",
  "ohoooo..",
  "...o....",
}
K.build{
  name = "bg_crow", w = 8, h = 6,
  src = ROOT .. "/art-src/backgrounds/actors/bg_crow.aseprite",
  sheet = ROOT .. "/public/assets/sprites/bg/bg_crow.png",
  data = ROOT .. "/public/assets/sprites/bg/bg_crow.json",
  keys = keys,
  anims = { { tag = "bg_crow_flap", ms = 80, frames = { { grid = UP }, { grid = MID }, { grid = DOWN }, { grid = MID } } } },
  anchor = "center",
}
