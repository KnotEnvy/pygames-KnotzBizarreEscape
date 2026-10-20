-- Background actor: tiny Regime mech mosquito drone for the 2-2 swarm (MEGA-SKEETER foreshadowing), matching the Phase H
-- gnat (enemies/gnat + art-src/refs/gnat): glowing red fuel-bulb abdomen at the back, skinny dark thorax, red eye, long
-- steel needle, pale steel wing rims, hair-thin dangling legs. 8x5, facing RIGHT, origin CENTRE. Far style: no outline.
-- Tag bg_skeeter_buzz 3 f @40 ms (wings up / swept / down). Build: bash tools/build-art.sh art-src/backgrounds/actors/bg_skeeter.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local keys = { R = "red4", r = "red3", q = "red2", k = "outline", e = "red4", n = "steel3", w = "steel4", v = "steel3", l = "ink3" }
local UP = {
  ".wv.....",
  "..wv....",
  "Rrkkkenn",
  "qq.l.l..",
  "..l...l.",
}
local SWEPT = {
  "........",
  "wwvv....",
  "Rrkkkenn",
  "qq.l.l..",
  "..l...l.",
}
local DOWN = {
  "........",
  "........",
  "Rrkkkenn",
  "qqvw.l..",
  ".vw...l.",
}
K.build{
  name = "bg_skeeter", w = 8, h = 5,
  src = ROOT .. "/art-src/backgrounds/actors/bg_skeeter.aseprite",
  sheet = ROOT .. "/public/assets/sprites/bg/bg_skeeter.png",
  data = ROOT .. "/public/assets/sprites/bg/bg_skeeter.json",
  keys = keys,
  anims = { { tag = "bg_skeeter_buzz", ms = 40, frames = { { grid = UP }, { grid = SWEPT }, { grid = DOWN } } } },
  anchor = "center",
}
