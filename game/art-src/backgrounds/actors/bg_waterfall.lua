-- Background actor: distant waterfall in a rock cleft (Part II "Timber Express", river bridge). 40x112, bottom-centre.
-- Tag bg_waterfall_flow: 4 frames @100 ms; water streaks scroll down 4 px/frame over a 16 px period (seamless),
-- foam/mist band at the bottom billows. No outlines. Build: bash tools/build-art.sh art-src/backgrounds/actors/bg_waterfall.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local W, Hh = 40, 112
local function S(img, x, y, c) if x >= 0 and y >= 0 and x < W and y < Hh then K.px(img, x, y, c) end end
local function H(x, y, s)
  local h = (math.floor(x) * 374761393 + math.floor(y) * 668265263 + math.floor(s or 0) * 1442695041) & 0xffffffff
  h = ((h ~ (h >> 13)) * 1274126177) & 0xffffffff
  return (h ~ (h >> 16)) / 4294967296
end

local WX0, WX1 = 13, 28     -- water column (16 px)
local LIP = 9               -- lip row
local FOAM = 98             -- foam band top (14 px tall)

-- rock wall extents per row: left wall outer edge..inner edge, right wall inner..outer
local function walls(y)
  local n1 = math.sin(y * 0.21) * 1.5 + math.sin(y * 0.53 + 1) * 0.8
  local n2 = math.sin(y * 0.19 + 2) * 1.5 + math.sin(y * 0.61) * 0.8
  local spread = (y / Hh) ^ 1.2 * 4                   -- mountain widens toward the bottom
  local lOut = math.floor(4 - spread + n1 + 0.5)
  local rOut = math.floor(35 + spread + n2 + 0.5)
  return lOut, rOut
end
local function wallTop(x)
  -- ragged cliff top: peaks at x~6 and x~33, dipping into the notch where the water spills
  if x < WX0 then return math.floor(2 + math.abs(x - 6) * 0.8 + (x >= WX0 - 3 and 2 or 0) + H(x, 0, 5) * 1.5) end
  return math.floor(1 + math.abs(x - 33) * 0.7 + (x <= WX1 + 3 and 2 or 0) + H(x, 0, 6) * 1.5)
end

local LEDGES_L = { 27, 52, 79 }
local LEDGES_R = { 18, 41, 66, 88 }

local function rocks(img)
  for y = 0, Hh - 1 do
    local lOut, rOut = walls(y)
    for x = 0, W - 1 do
      local isL = x < WX0 and x >= lOut
      local isR = x > WX1 and x <= rOut
      if (isL or isR) and y >= wallTop(x) then
        local c = "ink2"
        local h = H(x, y, 1)
        if isR then
          -- right wall's inner face looks left toward the light: lit
          if x <= WX1 + 3 then c = (h < 0.6) and "ink3" or "ink2" end
          if x >= rOut - 1 then c = "steel2" end
        else
          -- left wall's inner face is in shadow
          if x >= WX0 - 2 then c = "steel2" end
          if x <= lOut + 1 then c = (h < 0.5) and "ink3" or "ink2" end
        end
        -- vertical cracks
        if H(x, math.floor(y / 6), 2) < 0.12 then c = "steel2" end
        S(img, x, y, c)
      end
    end
  end
  -- snow caps on peaks + ledges (top surface of each column at each ledge band)
  for x = 0, W - 1 do
    local t = wallTop(x); local lOut, rOut = walls(t)
    if (x < WX0 and x >= lOut) or (x > WX1 and x <= rOut) then
      S(img, x, t, (x < 20) and "ink6" or "ink5"); if H(x, 9, 7) < 0.6 then S(img, x, t + 1, "ink5") end
    end
  end
  for i, ly in ipairs(LEDGES_L) do
    local lOut = walls(ly)
    local x0 = lOut + 1 + math.floor(H(ly, 1, 8) * 3); local len = 2 + math.floor(H(ly, 0, 8) * 3)
    for x = x0, x0 + len do S(img, x, ly, (x < x0 + 2) and "ink6" or "ink5"); S(img, x, ly + 1, "steel2") end
  end
  for i, ly in ipairs(LEDGES_R) do
    local _, rOut = walls(ly)
    local x0 = WX1 + 2 + math.floor(H(ly, 1, 9) * 3); local len = 2 + math.floor(H(ly, 0, 9) * 3)
    for x = x0, math.min(x0 + len, rOut) do S(img, x, ly, (x < x0 + 2) and "ink6" or "ink5"); S(img, x, ly + 1, "ink2") end
  end
end

local function water(f)
  return function(img)
    rocks(img)
    -- lip: water rolls over the ledge at the top of the column
    for x = WX0 - 1, WX1 + 1 do S(img, x, LIP - 1, "steel2") end
    for x = WX0, WX1 do S(img, x, LIP, (x < 20) and "white" or "ink6"); S(img, x, LIP + 1, (x % 3 == 0) and "ink6" or "sky5") end
    -- falling column: per-column streaks scroll down 4 px per frame, 16 px period
    for x = WX0, WX1 do
      local ph = math.floor(H(x, 0, 11) * 16)
      local len = 4 + math.floor(H(x, 1, 11) * 6)
      local ph2 = math.floor(H(x, 2, 11) * 16)
      local edge = (x == WX0 or x == WX1)
      for y = LIP + 2, FOAM + 4 do
        local v = (y - 4 * (f - 1) + ph) % 16
        local v2 = (y - 4 * (f - 1) + ph2) % 16
        local c = "sky4"
        if v < len then c = "sky5" end
        if v == 0 and not edge then c = (x < 19 and y < 40) and "white" or "ink6" end
        if v2 == 8 and not edge and x % 2 == 0 then c = "sky5" end
        if edge and c ~= "sky4" then c = "sky5" end
        S(img, x, y, c)
      end
    end
    -- foam / mist band at the bottom, billowing between frames
    for x = 0, W - 1 do
      local lOut, rOut = walls(Hh - 1)
      local dist = math.abs(x + 0.5 - (WX0 + WX1 + 1) / 2)
      local top = FOAM + math.floor(dist * 0.45 + math.sin(x * 0.7 + f * math.pi / 2) * 1.6 + math.sin(x * 0.31 - f * math.pi / 2) * 1.2 + 0.5)
      for y = top, Hh - 1 do
        local d = y - top
        local on
        if d >= 4 then on = true elseif d >= 2 then on = ((x + y + f) % 2 == 0) else on = ((x + y + f) % 4 == 0) end
        if on then
          local c = (d >= 4 and dist < 6) and "white" or "ink6"
          if dist > 9 or ((x + 2 * y + f) % 5 == 0 and d > 2) then c = "ink5" end
          S(img, x, y, c)
        end
      end
      -- loose mist puffs above the band
      if H(x, f, 21) < 0.18 and dist < 13 then S(img, x, top - 2 - math.floor(H(x, f, 22) * 3), "ink6") end
    end
  end
end

K.build{
  name = "bg_waterfall", w = W, h = Hh,
  src = ROOT .. "/art-src/backgrounds/actors/bg_waterfall.aseprite",
  sheet = ROOT .. "/public/assets/sprites/bg/bg_waterfall.png",
  data = ROOT .. "/public/assets/sprites/bg/bg_waterfall.json",
  anims = { { tag = "bg_waterfall_flow", ms = 100, frames = { { grid = water(1) }, { grid = water(2) }, { grid = water(3) }, { grid = water(4) } } } },
  anchor = "bottom-center",
}
