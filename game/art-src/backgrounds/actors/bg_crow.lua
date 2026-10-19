-- Background actor: far crow, 12x8, facing RIGHT. Tag bg_crow_flap: 4 frames @80 ms (up, mid, down, mid).
-- Silhouette in outline with an ink2 highlight on the tail. Build: bash tools/build-art.sh art-src/backgrounds/actors/bg_crow.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local keys = { o = "outline", h = "ink2" }
local UP = {
  "..o.........",
  "...o........",
  "...oo.......",
  "....oo...oo.",
  ".ooooooooooo",
  "ohhoooooo...",
  "o...........",
  "............",
}
local MID = {
  "............",
  "............",
  "............",
  ".ooooooo.oo.",
  "..oooooooooo",
  "ohhoooooo...",
  "o...........",
  "............",
}
local DOWN = {
  "............",
  "............",
  "............",
  ".........oo.",
  ".ooooooooooo",
  "ohhoooooo...",
  "o...ooo.....",
  ".....o......",
}
K.build{
  name = "bg_crow", w = 12, h = 8,
  src = ROOT .. "/art-src/backgrounds/actors/bg_crow.aseprite",
  sheet = ROOT .. "/public/assets/sprites/bg/bg_crow.png",
  data = ROOT .. "/public/assets/sprites/bg/bg_crow.json",
  keys = keys,
  anims = { { tag = "bg_crow_flap", ms = 80, frames = { { grid = UP }, { grid = MID }, { grid = DOWN }, { grid = MID } } } },
  anchor = "center",
}
