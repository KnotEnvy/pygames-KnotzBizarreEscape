-- Background actor: far camp watchtower silhouette, 20x56, bottom-centre anchor.
-- Tags bg_tower_off (1 frame, dark) and bg_tower_on (2 frames @220 ms, lamp + windows lit with flicker).
-- No outlines; ink1/steel1/ink2 with ink4 roof snow. Build: bash tools/build-art.sh art-src/backgrounds/actors/bg_tower.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local W, Hh = 20, 56
local function S(img, x, y, c) if x >= 0 and y >= 0 and x < W and y < Hh then K.px(img, x, y, c) end end

local function base(img)
  -- stilt legs: taper from x 3/16 at the ground to x 5/14 under the deck
  local function legX(y, side) local d = (y >= 52) and 1 or 0; if side < 0 then return 4 - d else return 15 + d end end
  for y = 20, 55 do
    S(img, legX(y, -1), y, "ink2"); S(img, legX(y, 1), y, "ink1")
  end
  -- zig-zag cross-braces + horizontal girts between legs (3 bays)
  local bays = { { 21, 32 }, { 32, 44 }, { 44, 55 } }
  for i, b in ipairs(bays) do
    local y0, y1 = b[1], b[2]
    if i % 2 == 1 then K.line(img, legX(y0, -1) + 1, y0 + 1, legX(y1, 1) - 1, y1 - 1, "steel1")
    else K.line(img, legX(y0, 1) - 1, y0 + 1, legX(y1, -1) + 1, y1 - 1, "steel1") end
    for x = legX(y0, -1) + 1, legX(y0, 1) - 1 do S(img, x, y0, "ink1") end
  end
  -- deck + railing
  for x = 2, 17 do S(img, x, 19, "ink1"); S(img, x, 20, "steel1") end
  S(img, 2, 19, "ink2"); S(img, 3, 19, "ink2")
  -- hut walls
  for y = 10, 18 do for x = 4, 15 do S(img, x, y, (x <= 5) and "ink2" or "ink1") end end
  for x = 4, 15 do S(img, x, 16, "steel1") end
  -- peaked roof with overhang
  for y = 3, 9 do
    local hw = math.floor((y - 3) * 1.25 + 0.5) + 1
    for x = 10 - hw, 9 + hw do
      local c = (x < 10) and "steel1" or "ink1"
      if x == 10 - hw then c = "ink2" end
      S(img, x, y, c)
    end
  end
  for x = 1, 18 do S(img, x, 9, "ink1") end
  -- snow hint on the lit roof slope and the ridge
  for y = 3, 8 do local hw = math.floor((y - 3) * 1.25 + 0.5) + 1; S(img, 10 - hw, y, (y % 2 == 0) and "ink4" or "ink3") end
  S(img, 9, 2, "ink4"); S(img, 10, 2, "ink3"); S(img, 9, 3, "ink4")
  -- lamp bracket at the right eave
  S(img, 17, 10, "ink1"); S(img, 17, 11, "ink1")
end

local function dark(img) base(img)
  for x = 7, 12 do for y = 12, 14 do S(img, x, y, "steel1") end end
  S(img, 9, 12, "ink1"); S(img, 10, 12, "ink1")
  S(img, 17, 12, "steel1")
end
local function lit(f) return function(img) base(img)
  -- 1 px fire3 halo (sides + sill) around the window, then the panes
  for y = 12, 14 do S(img, 6, y, "fire3"); S(img, 13, y, "fire3") end
  for x = 7, 12 do S(img, x, 15, "fire3") end
  for x = 7, 12 do for y = 12, 14 do
    local c = (y == 12) and "fire4" or "fire5"
    if f == 2 and x >= 11 then c = "fire4" end
    if f == 2 and x >= 11 and y == 14 then c = "fire3" end
    S(img, x, y, c)
  end end
  for y = 12, 14 do S(img, 9, y, "ink1") end  -- mullion
  if f == 2 then S(img, 6, 12, "ink1"); S(img, 13, 14, "ink1") else S(img, 13, 12, "ink1") end
  -- deck lamp at the eave
  S(img, 17, 12, (f == 1) and "fire6" or "fire5")
  S(img, 16, 12, "fire3"); S(img, 18, 12, "fire3"); S(img, 17, 13, "fire3")
  if f == 1 then S(img, 17, 14, "fire3"); S(img, 16, 13, "fire3") end
end end

K.build{
  name = "bg_tower", w = W, h = Hh,
  src = ROOT .. "/art-src/backgrounds/actors/bg_tower.aseprite",
  sheet = ROOT .. "/public/assets/sprites/bg/bg_tower.png",
  data = ROOT .. "/public/assets/sprites/bg/bg_tower.json",
  anims = {
    { tag = "bg_tower_off", ms = 1000, frames = { { grid = dark } } },
    { tag = "bg_tower_on", ms = 220, frames = { { grid = lit(1) }, { grid = lit(2) } } },
  },
  anchor = "bottom-center",
}
