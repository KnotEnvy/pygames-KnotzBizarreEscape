-- Example build script. Run: bash tools/build-art.sh art-src/_examples/example.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root   -- absolute path to game/
K.build{
  name = "example_blob", w = 12, h = 12,
  src   = ROOT .. "/art-src/_examples/example_blob.aseprite",
  sheet = "/tmp/kbe-example/example_blob.png",
  data  = "/tmp/kbe-example/example_blob.json",
  keys = { o = "outline", g = "weird4", h = "weird5", e = "ink6" },
  anims = {
    { tag = "idle", ms = 160, frames = {
      { grid = { "............", "....oooo....", "...oghhgo...", "..oggggggo..", "..ogeggego..", "..oggggggo..", "...oooooo..." }, oy = 4 },
      { grid = { "............", "............", "...oooooo...", "..oghhhhgo..", "..ogeggego..", "..oggggggo..", "...oooooo..." }, oy = 4 },
    } },
    { tag = "pop", ms = 60, frames = {
      { grid = function(img, K) K.disc(img, 6, 6, 4, "weird4"); K.outline(img, "outline") end },
      { grid = function(img, K) K.disc(img, 6, 6, 5, "weird5") end },
    } },
  },
}
