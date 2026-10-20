-- Background actor: far Buzzard gunship (Phase H design, from enemies/buzzard + art-src/refs/buzzard), 34x14, facing RIGHT.
-- Reads at far scale as the new gunship: bulbous tinted canopy with a dim red rim, engine hump + exhaust, stub-wing pod,
-- long tapered tail boom with a fin and a red stripe, skids. Far style: no outline, atmospheric steel, low contrast.
-- Tag bg_buzzard_fly: 4 frames @60 ms (main rotor blur long/dashed/short/dashed, tail rotor turning 45 deg per frame).
-- Build: bash tools/build-art.sh art-src/backgrounds/actors/bg_buzzard.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local W, HH = 34, 14
local keys = { d = "steel1", b = "steel2", c = "steel3", r = "red2", R = "red3", g = "sky2", G = "sky3", k = "ink1" }
local BODY = {
  "..................................",
  "..................................",
  "....b..............dcd............",
  "....cb.........ccccccccc.rrrr.....",
  ".....b.......dkbbbbbbbbbrGGggr....",
  ".....cccccccccbbbcccbbbbrGgRggr...",
  "......rrrrrrrrbbbdddrRbbbggggggr..",
  "........dddddddbbdddbbbbbgggggggr.",
  "...............dbbddddcbbbdggggdd.",
  "................ddddddddddddddkk..",
  ".................d......d.....k...",
  ".................d......d....d....",
  "..............dddddddddddddddd....",
  "..................................",
}
local function rotor(img, f)
  local hub = 20
  if f == 1 then for x = 4, 33 do K.px(img, x, 1, (x < 12) and "steel3" or "steel2") end
  elseif f == 3 then for x = 8, 31 do K.px(img, x, 1, (x > 23) and "steel3" or "steel2") end
  else
    local o = (f == 2) and 0 or 1
    for x = 6, 32 do if (x + o) % 3 ~= 0 then K.px(img, x, 1, "steel2") end end
  end
  K.px(img, hub, 1, "steel1")
end
-- tail rotor: 2-blade, centre (2,4), 45 deg per frame (period 180 deg = 4 frames)
local TAIL = {
  { { 2, 2 }, { 2, 3 }, { 2, 5 }, { 2, 6 } },          -- vertical
  { { 0, 2 }, { 1, 3 }, { 3, 5 }, { 4, 6 } },          -- diagonal \
  { { 0, 4 }, { 1, 4 }, { 3, 4 }, { 4, 4 } },          -- horizontal
  { { 4, 2 }, { 3, 3 }, { 1, 5 }, { 0, 6 } },          -- diagonal /
}
local function frame(f)
  return function(img, K)
    K.grid(img, BODY, keys)
    rotor(img, f)
    for i, p in ipairs(TAIL[f]) do K.px(img, p[1], p[2], (i == 1 or i == 4) and "steel2" or "steel3") end
    K.px(img, 2, 4, "steel1")
  end
end
local frames = {}; for f = 1, 4 do frames[f] = { grid = frame(f) } end
K.build{
  name = "bg_buzzard", w = W, h = HH,
  src = ROOT .. "/art-src/backgrounds/actors/bg_buzzard.aseprite",
  sheet = ROOT .. "/public/assets/sprites/bg/bg_buzzard.png",
  data = ROOT .. "/public/assets/sprites/bg/bg_buzzard.json",
  anims = { { tag = "bg_buzzard_fly", ms = 60, frames = frames } },
  anchor = "center",
}
