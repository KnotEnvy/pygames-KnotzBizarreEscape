-- Background actor: far Regime airship (Part I "The Camp"). 80x28, nose LEFT (travels left).
-- Tag bg_zeppelin_fly: 4 frames @120 ms (rear prop blur cycle, nav light on f1-2).
-- No outlines, muted steel ramps, light top-left. Build: bash tools/build-art.sh art-src/backgrounds/actors/bg_zeppelin.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local W, Hh = 80, 28
local function S(img, x, y, c) if x >= 0 and y >= 0 and x < W and y < Hh then K.px(img, x, y, c) end end

local CX, CY, AN, AT, B = 39, 11, 35, 35, 7.6
local function inHull(x, y)
  local dx = x + 0.5 - CX; local dy = y + 0.5 - CY
  local a = dx < 0 and AN or AT
  local ex = dx < 0 and 2.3 or 1.7
  return (math.abs(dx) / a) ^ ex + (dy / B) ^ 2 <= 1, dx / a, dy / B
end

local EYE = { -- 9x5 spiral eye, '2' = red2 lid, '3' = red3 spiral
  "..22222..",
  ".2.333.2.",
  "2.3.2.3.2",
  ".2.3332..",
  "..22222..",
}

local function frame(f)
  return function(img)
    -- tail fins (behind hull)
    for x = 60, 75 do
      local t = (x - 60) / 15
      local top = math.floor(CY - 4 - t * 7 + 0.5)
      local bot = math.floor(CY + 4 + t * 6 + 0.5)
      if x <= 73 then
        for y = top, CY - 3 do S(img, x, y, (y == top) and "steel3" or "steel2") end
        for y = CY + 3, bot do S(img, x, y, (y == bot) and "steel1" or "ink1") end
      end
    end
    for x = 69, 73 do S(img, x, CY - 11, "steel2") end
    -- hull
    for y = 0, Hh - 1 do for x = 0, W - 1 do
      local inside, u, v = inHull(x, y)
      if inside then
        local l = -v * 0.75 - u * 0.25
        local c
        if l > 0.5 then c = "steel4" elseif l > 0.05 then c = "steel3" elseif l > -0.45 then c = "steel2" elseif l > -0.75 then c = "steel1" else c = "ink1" end
        -- panel seams (girder ribs), faint
        if (x % 8 == 3) and x > 8 and x < 66 and c == "steel3" then c = "steel2" end
        S(img, x, y, c)
      end
    end end
    -- horizontal stabiliser edge-on + hull top highlight streak
    for x = 64, 76 do S(img, x, CY, (x < 70) and "steel3" or "steel2") end
    for x = 12, 40 do if (x % 3 ~= 0) then S(img, x, CY - 6, "steel4") end end
    -- emblem on hull side
    for j, row in ipairs(EYE) do for i = 1, #row do
      local ch = row:sub(i, i)
      if ch == "2" then S(img, 15 + i, 7 + j, "red2") elseif ch == "3" then S(img, 15 + i, 7 + j, "red3") end
    end end
    -- gondola + struts
    S(img, 32, 18, "steel1"); S(img, 44, 18, "steel1")
    for x = 30, 46 do
      local yt = 19
      local yb = (x < 32 or x > 44) and 21 or 22
      for y = yt, yb do S(img, x, y, (y == yt) and "steel2" or "steel1") end
    end
    S(img, 29, 20, "steel1"); S(img, 29, 19, "steel2")
    for x = 31, 45 do S(img, x, 22, "ink1") end
    for _, wx in ipairs({ 33, 37, 41 }) do S(img, wx, 20, "fire4"); S(img, wx + 1, 20, "fire2") end
    -- tail cone hub + propeller (4 blur poses)
    local px = 77
    S(img, 75, CY, "steel1"); S(img, 76, CY, "steel1")
    if f == 1 then
      for y = CY - 5, CY + 5 do S(img, px, y, (y < CY) and "steel3" or "steel2") end
    elseif f == 2 then
      for k = 1, 4 do S(img, px + (k > 2 and 1 or 0), CY - k, "steel3"); S(img, px - (k > 2 and 1 or 0) + 1, CY + k, "steel2") end
    elseif f == 3 then
      for y = CY - 5, CY + 5 do if (y + CY) % 2 == 0 then S(img, px, y, "steel3") end end
      S(img, px + 1, CY - 3, "steel2"); S(img, px + 1, CY + 3, "steel2")
    else
      for k = 1, 4 do S(img, px + 1 - (k > 2 and 1 or 0), CY - k, "steel3"); S(img, px + (k > 2 and 1 or 0), CY + k, "steel2") end
    end
    S(img, px, CY, "steel1")
    -- nav light on the top fin tip
    if f <= 2 then S(img, 71, CY - 11, "red4") else S(img, 71, CY - 11, "red2") end
  end
end

K.build{
  name = "bg_zeppelin", w = W, h = Hh,
  src = ROOT .. "/art-src/backgrounds/actors/bg_zeppelin.aseprite",
  sheet = ROOT .. "/public/assets/sprites/bg/bg_zeppelin.png",
  data = ROOT .. "/public/assets/sprites/bg/bg_zeppelin.json",
  anims = { { tag = "bg_zeppelin_fly", ms = 120, frames = {
    { grid = frame(1) }, { grid = frame(2) }, { grid = frame(3) }, { grid = frame(4) },
  } } },
  anchor = "center",
}
