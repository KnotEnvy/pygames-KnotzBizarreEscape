-- Background actor: enemy armoured train on a parallel track (Part II "Timber Express"). 224x36, travelling RIGHT.
-- Bottom-centre anchor: wheel bottoms on the last row (y 35). Tag bg_armtrain_roll: 2 frames @80 ms (wheels/rods + stack wisp).
-- Loco at the RIGHT end (sloped armour, cowcatcher, dim headlamp, stack, red2 stripe + spiral eye), two armoured cars to its
-- left, the middle one with a flak turret aimed up-left. Low contrast steel1-3, no outlines.
-- Build: bash tools/build-art.sh art-src/backgrounds/actors/bg_armtrain.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local W, Hh = 224, 36
local function S(img, x, y, c) if x >= 0 and y >= 0 and x < W and y < Hh then K.px(img, x, y, c) end end

-- armoured box: x0..x1, top y0, skirt bottom y1, chamfered top corners
local function hull(img, x0, x1, y0, y1, cham)
  for x = x0, x1 do
    local t = y0
    if x - x0 < cham then t = y0 + (cham - (x - x0)) end
    if x1 - x < cham then t = y0 + (cham - (x1 - x)) end
    for y = t, y1 do
      local c = "steel2"
      if y == t then c = "steel3" elseif y >= y1 - 1 then c = "ink1" elseif y >= y1 - 4 then c = "steel1" end
      if x == x0 and y > t then c = "steel1" end
      S(img, x, y, c)
    end
  end
  -- plate seams + rivets
  for x = x0 + 8, x1 - 4, 10 do
    for y = y0 + 2, y1 - 5 do S(img, x, y, "steel1") end
    for y = y0 + 3, y1 - 6, 3 do S(img, x + 1, y, "steel3") end
  end
  for x = x0 + 3, x1 - 3, 3 do S(img, x, y0 + 2, "steel3") end
end
local function wheel(img, cx, f)
  for j = -3, 3 do for i = -3, 3 do
    local d = i * i + j * j
    if d <= 10 then S(img, cx + i, 32 + j, (d >= 6) and "ink1" or "steel1") end
  end end
  -- spoke mark rotates between frames
  if f == 1 then S(img, cx - 1, 31, "steel2"); S(img, cx + 1, 33, "steel2") else S(img, cx + 1, 31, "steel2"); S(img, cx - 1, 33, "steel2") end
  S(img, cx, 32, "steel2")
end
local function bogie(img, cx, f)
  wheel(img, cx - 4, f); wheel(img, cx + 4, f)
  for x = cx - 6, cx + 6 do S(img, x, 29, "ink1") end
end

local EYE = { -- 7x5 spiral eye
  ".22222.",
  "2.333.2",
  "2.3.3.2" ,
  "2.33..2",
  ".22222.",
}

local function frame(f)
  return function(img)
    -- couplers
    for x = 70, 80 do S(img, x, 26, "ink1") end
    for x = 144, 154 do S(img, x, 26, "ink1") end
    ---------------------------------------------------------------- car 1 (left): gun slits + small cupola
    bogie(img, 14, f); bogie(img, 60, f)
    hull(img, 3, 72, 14, 30, 3)
    for x = 30, 40 do for y = 10, 13 do S(img, x, y, (y == 10) and "steel3" or ((x == 30) and "steel1" or "steel2")) end end
    S(img, 31, 9, "steel2"); S(img, 39, 9, "steel2"); for x = 32, 38 do S(img, x, 9, "steel3") end
    for x = 41, 46 do S(img, x, 11, "steel1") end   -- MG barrel
    for _, sx in ipairs({ 12, 24, 50, 62 }) do for x = sx, sx + 4 do S(img, x, 19, "ink1") end end
    for x = 4, 71 do S(img, x, 23, "red2") end
    ---------------------------------------------------------------- car 2 (middle): flak turret pointing up-left
    bogie(img, 88, f); bogie(img, 134, f)
    hull(img, 77, 146, 15, 30, 3)
    -- turret ring + dome
    for x = 102, 122 do
      local dx = (x - 112) / 10
      local top = math.floor(8 + dx * dx * 5 + 0.5)
      for y = top, 14 do S(img, x, y, (y == top) and ((x < 112) and "steel3" or "steel2") or ((x > 117) and "steel1" or "steel2")) end
    end
    for x = 100, 124 do S(img, x, 14, "steel1") end
    -- twin barrels up-left
    K.line(img, 106, 10, 94, 1, "steel2"); K.line(img, 107, 11, 95, 2, "steel1")
    K.line(img, 108, 9, 97, 1, "steel3"); K.line(img, 109, 10, 98, 2, "steel1")
    S(img, 94, 1, "ink1"); S(img, 97, 1, "ink1")
    for _, sx in ipairs({ 84, 132 }) do for x = sx, sx + 4 do S(img, x, 20, "ink1") end end
    for x = 78, 145 do S(img, x, 24, "red2") end
    ---------------------------------------------------------------- locomotive (right)
    for _, wx in ipairs({ 162, 174, 186, 198 }) do wheel(img, wx, f) end
    wheel(img, 210, f)
    -- body: tall cab at the rear, long armoured boiler casing sloping to the front
    hull(img, 152, 214, 12, 30, 2)
    for x = 152, 171 do for y = 5, 12 do S(img, x, y, (y == 5) and "steel3" or ((x == 152) and "steel1" or "steel2")) end end
    for x = 156, 167 do S(img, x, 8, "ink1") end              -- cab vision slit
    for x = 157, 166 do S(img, x, 9, "steel1") end
    -- sloped front armour (wedge) + headlamp
    for x = 212, 222 do
      local t = (x - 212) / 10
      local top = math.floor(12 + t * 13 + 0.5)
      for y = top, 30 do S(img, x, y, (y == top) and "steel3" or ((y > 27) and "ink1" or "steel2")) end
    end
    S(img, 216, 19, "fire4"); S(img, 217, 19, "fire2"); S(img, 216, 20, "fire2"); S(img, 215, 19, "steel1")
    -- cowcatcher
    for x = 213, 223 do local y0 = 30 + math.floor((x - 213) * 0.45); for y = y0, 34 do if (x + y) % 2 == 0 or y == 34 then S(img, x, y, (y == y0) and "steel2" or "steel1") end end end
    -- stack + wisp
    for x = 194, 198 do for y = 6, 11 do S(img, x, y, (x == 194) and "steel3" or ((x == 198) and "steel1" or "steel2")) end end
    for x = 193, 199 do S(img, x, 5, "steel2") end
    local wisp = (f == 1) and { { 195, 3 }, { 196, 3 }, { 197, 3 }, { 194, 2 }, { 195, 2 }, { 192, 1 }, { 193, 1 }, { 190, 0 } }
                           or { { 195, 4 }, { 196, 3 }, { 197, 3 }, { 196, 2 }, { 193, 2 }, { 194, 1 }, { 191, 1 }, { 192, 0 }, { 189, 0 } }
    for i, p in ipairs(wisp) do S(img, p[1], p[2], (i <= 3) and "ink1" or "ink2") end
    -- red2 stripe + emblem
    for x = 153, 214 do S(img, x, 22, "red2") end
    for j, row in ipairs(EYE) do for i = 1, #row do
      local ch = row:sub(i, i)
      if ch == "2" then S(img, 180 + i, 14 + j, "red2") elseif ch == "3" then S(img, 180 + i, 14 + j, "red3") end
    end end
    -- connecting rod along the drivers (below the skirt), phase alternates
    local ry = (f == 1) and 32 or 33
    local rx = (f == 1) and 0 or 1
    for x = 162 + rx, 198 + rx do S(img, x, ry, "steel3") end
  end
end

K.build{
  name = "bg_armtrain", w = W, h = Hh,
  src = ROOT .. "/art-src/backgrounds/actors/bg_armtrain.aseprite",
  sheet = ROOT .. "/public/assets/sprites/bg/bg_armtrain.png",
  data = ROOT .. "/public/assets/sprites/bg/bg_armtrain.json",
  anims = { { tag = "bg_armtrain_roll", ms = 80, frames = { { grid = frame(1) }, { grid = frame(2) } } } },
  anchor = "bottom-center",
}
