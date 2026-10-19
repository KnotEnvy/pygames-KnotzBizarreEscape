-- Mission 2 "BAYOU BLACKOUT": runtime water / foam / foreground / haze strips (plain PNGs, binary alpha, palette only).
-- Build: bash tools/build-art.sh art-src/maps/bayou_strips.lua
-- Writes (never touches the gen_* layers in the same folders):
--   m2p1/ wade.png 64x18, wade_crest.png 64x3, wade_edge.png 8x18, haze.png 384x40
--   m2p2/ river_front.png 256x14, river_wake.png 256x10, fg_speed.png 768x216, haze.png 384x40
--   m2p3/ channel.png 128x12, channel_glint.png 128x3, haze.png 384x40, rain_sheet.png 192x216
-- Every strip is drawn periodic in x, then "sealed": column W-1 is a copy of column 0 (identical wrap columns).
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local BG = ROOT .. "/public/assets/backgrounds/"

local function H(x, y, s)
  local h = (math.floor(x) * 374761393 + math.floor(y) * 668265263 + math.floor(s or 0) * 1442695041) & 0xffffffff
  h = ((h ~ (h >> 13)) * 1274126177) & 0xffffffff
  h = h ~ (h >> 16)
  return h / 4294967296
end
local CLEAR = app.pixelColor.rgba(0, 0, 0, 0)
local TAU = 2 * math.pi
local function newImg(w, h) return Image(w, h, ColorMode.RGB) end
-- c == "_" leaves the pixel untouched; c == nil clears it. x always wraps.
local function P(img, x, y, c)
  if y < 0 or y >= img.height or c == "_" then return end
  x = math.floor(x) % img.width
  if c == nil then img:drawPixel(x, y, CLEAR) else img:drawPixel(x, y, K.color(c)) end
end
local function A(img, x, y)
  if y < 0 or y >= img.height then return false end
  return app.pixelColor.rgbaA(img:getPixel(math.floor(x) % img.width, y)) > 0
end
local function seal(img)
  local W = img.width
  for y = 0, img.height - 1 do img:drawPixel(W - 1, y, img:getPixel(0, y)) end
end
local function save(img, dir, name, noSeal)
  if not noSeal then seal(img) end
  local spr = Sprite(img.width, img.height, ColorMode.RGB)
  spr.cels[1].image = img
  spr:saveCopyAs(BG .. dir .. "/" .. name)
  spr:close()
  print("built " .. dir .. "/" .. name .. " (" .. img.width .. "x" .. img.height .. ")")
end
local BAYER = { { 0, 8, 2, 10 }, { 12, 4, 14, 6 }, { 3, 11, 1, 9 }, { 15, 7, 13, 5 } }
local function dither(x, y, d) return d * 16 > BAYER[y % 4 + 1][x % 4 + 1] + 0.5 end
local function pick(list, r)
  local acc = 0
  for _, cw in ipairs(list) do acc = acc + cw[2]; if r < acc then return cw[1] end end
  return list[#list][1]
end
-- horizontal run row: runs of random length, colour picked per run from a weighted list ("_" = gap)
local function streakRow(img, y, colors, seed, minL, maxL)
  local W = img.width
  local x, k = 0, 0
  while x < W do
    local len = minL + math.floor(H(k, y, seed) * (maxL - minL + 1))
    local c = pick(colors, H(k, y, seed + 1))
    for i = 0, len - 1 do if x + i < W then P(img, x + i, y, c) end end
    x = x + len; k = k + 1
  end
end
-- periodic wave sum (integer cycles per strip width so it wraps)
local function wave(x, W, terms)
  local v = 0
  for _, t in ipairs(terms) do v = v + t[2] * math.sin(TAU * x * t[1] / W + t[3]) end
  return v
end

---------------------------------------------------------------------------------------------------
-- m2p1 WADING WATER (dusk tea-green). Body rows 2-17, crest rows 0-1.
local function wadeBody(img, x, y, seed)
  -- y is the strip row (2..17)
  local cols
  if y <= 3 then cols = { { "leaf2", 0.42 }, { "steel2", 0.42 }, { "steel3", 0.10 }, { "leaf3", 0.06 } }
  elseif y <= 9 then cols = { { "leaf2", 0.48 }, { "steel2", 0.32 }, { "leaf1", 0.20 } }
  elseif y <= 13 then cols = { { "leaf1", 0.45 }, { "leaf2", 0.30 }, { "steel2", 0.15 }, { "steel1", 0.10 } }
  else cols = { { "leaf1", 0.55 }, { "steel1", 0.35 }, { "leaf2", 0.10 } } end
  return cols
end
local function drawWadeBody(img, x0, x1, topOf)
  for y = 2, 17 do
    local cols = wadeBody(img, 0, y)
    -- per-row runs
    local x, k = 0, 0
    while x < 64 do
      local len = 3 + math.floor(H(k, y, 1100) * 9)
      local c = pick(cols, H(k, y, 1101))
      for i = 0, len - 1 do
        local xx = x + i
        if xx < 64 and xx >= x0 and xx <= x1 and y >= topOf(xx) then P(img, xx, y, c) end
      end
      x = x + len; k = k + 1
    end
  end
  -- faint ripple bands (short lighter dashes on rows 5, 9, 13)
  for _, rb in ipairs({ { 5, "steel3", 0.30, 1110 }, { 9, "steel2", 0.35, 1111 }, { 13, "leaf2", 0.35, 1112 } }) do
    local y, c, p, s = rb[1], rb[2], rb[3], rb[4]
    for x = 0, 63 do
      local band = H(math.floor((x + y * 7) / 5), y, s) < p
      if band and (x % 5) ~= 4 and x >= x0 and x <= x1 and y >= topOf(x) then P(img, x, y, c) end
    end
  end
end
local CREST0 = { { "ink5", 0.22 }, { "sky4", 0.22 }, { "steel4", 0.14 }, { "_", 0.42 } }
local CREST1 = { { "steel4", 0.40 }, { "sky4", 0.18 }, { "steel3", 0.30 }, { "_", 0.12 } }
do
  local img = newImg(64, 18)
  drawWadeBody(img, 0, 63, function() return 2 end)
  streakRow(img, 1, CREST1, 1120, 2, 7)
  streakRow(img, 0, CREST0, 1121, 2, 6)
  -- a few bright pinpoint glints on the crest
  for x = 0, 63 do if A(img, x, 0) and H(x, 0, 1122) < 0.06 then P(img, x, 0, "white") end end
  -- under the crest: a darker line so the crest reads against the legs
  for x = 0, 63 do if H(x, 2, 1123) < 0.55 then P(img, x, 2, "steel2") end end
  save(img, "m2p1", "wade.png")
end
do
  local img = newImg(64, 3)
  streakRow(img, 1, { { "sky4", 0.25 }, { "steel4", 0.25 }, { "_", 0.50 } }, 1130, 2, 6)
  streakRow(img, 0, { { "ink5", 0.18 }, { "sky5", 0.10 }, { "_", 0.72 } }, 1131, 1, 4)
  streakRow(img, 2, { { "steel3", 0.20 }, { "_", 0.80 } }, 1132, 2, 5)
  for x = 0, 63 do if A(img, x, 0) and H(x, 0, 1133) < 0.12 then P(img, x, 0, "white") end end
  save(img, "m2p1", "wade_crest.png")
end
-- wade_edge.png 8x18: left end cap. Column 7 matches the body; going left the crest curls down and the body ends.
do
  local img = newImg(8, 18)
  local TOP = { [0] = 15, 11, 8, 5, 3, 2, 1, 0 }     -- crest top row per column
  local BOT = { [0] = 17, 17, 17, 17, 17, 17, 17, 17 }
  for x = 0, 7 do
    local t = TOP[x]
    for y = t + 2, BOT[x] do
      local cols = wadeBody(img, x, y)
      P(img, x, y, pick(cols, H(x, y, 1140)))
    end
    -- thin to nothing: dither away the lower-left corner
    for y = t + 2, 17 do
      if x <= 2 and dither(x, y, 0.5 - x * 0.15) then P(img, x, y, nil) end
    end
    P(img, x, t, (x >= 5) and ((x % 2 == 0) and "ink5" or "sky4") or "steel4")
    P(img, x, t + 1, (x >= 4) and "steel4" or "steel3")
  end
  -- curl: fill the step between columns so the crest reads as one continuous curved line
  for x = 0, 6 do
    local t, tn = TOP[x], TOP[x + 1]
    for y = tn + 1, t - 1 do P(img, x, y, (y < t - 1) and "steel3" or "steel4") end
  end
  P(img, 7, 0, "ink5"); P(img, 6, 1, "sky4")
  save(img, "m2p1", "wade_edge.png", true)
end

---------------------------------------------------------------------------------------------------
-- HAZE bands 384x40: sparse dithered wisps, denser toward the bottom, clear at the top edge.
local function haze(dir, seed, tones)
  local W, Hh = 384, 40
  local img = newImg(W, Hh)
  local wisps = {}
  for i = 1, 16 do
    wisps[i] = {
      cx = H(i, 1, seed) * W, cy = 14 + H(i, 2, seed) * 22,
      rx = 26 + H(i, 3, seed) * 56, ry = 2.5 + H(i, 4, seed) * 5, s = 0.5 + H(i, 5, seed) * 0.5,
    }
  end
  for y = 0, Hh - 1 do
    local env = math.min(1, math.max(0, (y - 2) / 22))
    for x = 0, W - 1 do
      local d = 0
      for _, w in ipairs(wisps) do
        local dx = (x - w.cx + W * 1.5) % W - W * 0.5
        local slant = (y - w.cy) * 3                      -- wisps lean a little
        local q = ((dx + slant) / w.rx) ^ 2 + ((y - w.cy) / w.ry) ^ 2
        if q < 1 then d = d + (1 - q) * w.s end
      end
      d = d * env * 0.62 + wave(x, W, { { 3, 0.05, seed }, { 7, 0.04, 1.0 } }) * env
      -- horizontal streakiness: favour every other row so it reads as wisps, not a screen-door
      if y % 2 == 1 then d = d * 0.6 end
      -- threshold is constant along short horizontal runs (3-9 px) so the mist breaks into wisp dashes
      local run = math.floor((x + math.floor(H(y, 0, seed + 8) * 9)) / (3 + y % 4 * 2))
      local th = 0.12 + 0.75 * H(run, y, seed + 9)
      if d > th then
        local c
        if d > 0.62 then c = tones[1] elseif d > 0.34 then c = tones[2] else c = tones[3] end
        if type(c) == "table" then c = (H(x, y, seed + 10) < c[3]) and c[2] or c[1] end
        P(img, x, y, c)
      end
    end
  end
  save(img, dir, "haze.png")
end
haze("m2p1", 1200, { "ink4", "ink3", "steel3" })
haze("m2p2", 1300, { "steel4", "steel3", "sky2" })
haze("m2p3", 1400, { "ink3", { "steel3", "leaf3", 0.35 }, { "steel2", "leaf2", 0.45 } })

---------------------------------------------------------------------------------------------------
-- m2p2 RIVER FOAM LINE 256x14: choppy crest, foam streaks streaming left (bright heads on the left,
-- breaking into dashes to the right), bubbles, dark moonlit water below. Opaque below the crest.
do
  local W, Hh = 256, 14
  local img = newImg(W, Hh)
  local TERMS = { { 8, 1.2, 0.0 }, { 19, 0.8, 1.3 }, { 37, 0.5, 0.4 } }
  local top = {}
  for x = 0, W - 1 do top[x] = math.max(0, math.min(5, math.floor(2.6 + wave(x, W, TERMS) + 0.5))) end
  for x = 0, W - 1 do
    for y = top[x], Hh - 1 do
      local d = y - top[x]
      local c
      if d == 0 then c = (top[x] <= top[(x - 1) % W]) and "steel4" or "steel3"
      elseif d == 1 then c = (H(x, y, 1500) < 0.3) and "sky2" or "steel2"
      elseif y <= 8 then c = pick({ { "steel2", 0.35 }, { "steel1", 0.45 }, { "sky1", 0.20 } }, H(math.floor(x / 4), y, 1501))
      else c = pick({ { "steel1", 0.65 }, { "sky1", 0.20 }, { "ink1", 0.15 } }, H(math.floor(x / 5), y, 1502)) end
      P(img, x, y, c)
    end
  end
  -- moonlit glint dashes in the body
  for y = 5, 12 do
    for x = 0, W - 1 do
      if A(img, x, y) and y > top[x] + 2 and H(math.floor(x / 3), y, 1510) < 0.07 then P(img, x, y, (y < 9) and "steel3" or "steel2") end
    end
  end
  -- foam streaks
  for i = 0, 17 do
    local x0 = math.floor(H(i, 1, 1520) * W)
    local len = 12 + math.floor(H(i, 2, 1520) * 30)
    local low = H(i, 3, 1520) < 0.35                     -- some streaks ride lower and dimmer
    local off = low and (3 + math.floor(H(i, 4, 1520) * 4)) or math.floor(H(i, 4, 1520) * 2)
    for k = 0, len - 1 do
      local x = x0 + k
      local f = k / len
      local y = top[x % W] + off
      local keep = f < 0.18 or H(x, y, 1521 + i) > f * 0.9
      if keep then
        local c
        if low then c = (f < 0.2) and "steel4" or "steel3"
        elseif f < 0.15 then c = "white" elseif f < 0.4 then c = "sky5" elseif f < 0.7 then c = "ink5" else c = "sky4" end
        P(img, x, y, c)
        if not low and f < 0.3 then P(img, x, y + 1, (f < 0.12) and "sky5" or "sky4") end
        if not low and f < 0.08 and top[x % W] + off >= 1 then P(img, x, y - 1, "ink5") end
      end
    end
  end
  -- bubbles
  for i = 0, 13 do
    local x = math.floor(H(i, 1, 1530) * W)
    local y = 6 + math.floor(H(i, 2, 1530) * 7)
    if y > top[x] + 2 then
      if H(i, 3, 1530) < 0.5 then
        P(img, x, y, "sky4")
      else
        P(img, x, y, "sky4"); P(img, x + 1, y, "sky3"); P(img, x, y + 1, "sky3"); P(img, x + 1, y + 1, "sky2")
      end
    end
  end
  save(img, "m2p2", "river_front.png")
end

-- river_wake.png 256x10: low-contrast churned streaks on transparency (behind river_front, under the hulls).
do
  local W, Hh = 256, 10
  local img = newImg(W, Hh)
  for y = 0, Hh - 1 do
    local p = 0.62 - y * 0.055
    local cols = { { "steel2", p * 0.40 }, { "steel3", p * 0.32 }, { "sky2", p * 0.18 }, { "steel4", p * 0.10 }, { "_", 1 - p } }
    streakRow(img, y, cols, 1600 + y, 3, 16)
  end
  -- streak heads (left end of a few runs) a touch brighter
  for y = 0, 4 do
    for x = 0, W - 1 do
      if A(img, x, y) and not A(img, x - 1, y) and H(x, y, 1610) < 0.35 then P(img, x, y, "ink4") end
    end
  end
  save(img, "m2p2", "river_wake.png")
end

---------------------------------------------------------------------------------------------------
-- m2p2 FOREGROUND SPEED LAYER 768x216: near-black silhouettes. Canopy clumps + moss curtains from the top,
-- two thin cypress trunks, knees, reeds and cattails from the bottom. Middle band y 40-170 nearly clear.
do
  local W, Hh = 768, 216
  local img = newImg(W, Hh)
  local DARK = { { "outline", 0.6 }, { "ink1", 0.25 }, { "leaf1", 0.15 } }
  -- canopy clumps hanging from the top edge
  local CLUMPS = { { 120, 70, 24 }, { 205, 40, 30 }, { 300, 34, 12 }, { 470, 64, 22 }, { 575, 36, 28 }, { 690, 44, 16 } }
  local canopyBot = {}
  for x = 0, W - 1 do canopyBot[x] = -1 end
  for ci, cl in ipairs(CLUMPS) do
    local cx, hw, dep = cl[1], cl[2], cl[3]
    for i = -hw, hw do
      local t = i / hw
      local q = math.sqrt(math.max(0, 1 - t * t))
      local b = dep * q + (3 * math.sin(i * 0.37 + ci) + 2 * math.sin(i * 0.91 + ci * 2)) * q
      b = math.floor(b)
      local x = (cx + i) % W
      if b > canopyBot[x] then canopyBot[x] = b end
    end
  end
  for x = 0, W - 1 do
    for y = 0, canopyBot[x] do
      local c = pick(DARK, H(math.floor(x / 3), math.floor(y / 2), 1700))
      -- moonlit leaf tufts on the lower-left of the clump edge
      if y >= canopyBot[x] - 1 and H(x, y, 1701) < 0.18 then c = "ink2" end
      P(img, x, y, c)
    end
    -- ragged leafy lower fringe
    if canopyBot[x] >= 0 and H(x, 0, 1702) < 0.4 then P(img, x, canopyBot[x] + 1, "leaf1") end
  end
  -- Spanish-moss beards: solid and lumpy near the branch, stringy toward the tips
  local CURT = { { 100, 26, 34 }, { 212, 18, 50 }, { 300, 14, 22 }, { 455, 24, 38 }, { 580, 16, 54 }, { 692, 22, 34 } }
  for ci, cu in ipairs(CURT) do
    local cx, hw, maxL = cu[1], cu[2], cu[3]
    for i = -hw, hw do
      if H(i, ci, 1710) < 0.62 then
        local x0 = cx + i
        local t = math.abs(i) / hw
        local len = math.floor(maxL * (1 - 0.75 * t * t) * (0.45 + 0.55 * H(i, ci, 1712)))
        local y0 = math.max(0, canopyBot[x0 % W] - 1)
        for k = 0, len do
          local y = y0 + k
          local sway = math.floor(1.5 * math.sin(k * 0.12 + ci) + 0.5)
          local x = x0 + sway
          local f = k / math.max(1, len)
          if f < 0.55 or H(x, y, 1713) > (f - 0.55) * 1.6 then
            local c = (H(math.floor(x / 2), math.floor(y / 3), 1714) < 0.55) and "leaf1" or "ink1"
            if i < -hw * 0.3 and (k + i) % 6 == 0 then c = "ink2" end
            if i > hw * 0.4 then c = "outline" end
            P(img, x, y, c)
          end
        end
      end
    end
  end
  -- trunks (full height, thin) with flared buttress bases and a moonlit left rim
  local function trunk(cx, hw, seed)
    for y = 0, Hh - 1 do
      local flare = 0
      if y > Hh - 46 then flare = ((y - (Hh - 46)) / 46) ^ 2 * hw * 2.2 end
      local wob = math.floor(0.8 * math.sin(y * 0.05 + seed) + 0.5)
      local l = math.floor(cx - hw - flare * 1.1 + wob)
      local r = math.floor(cx + hw + flare + wob)
      for x = l, r do
        local c = "outline"
        local u = (x - l) / math.max(1, r - l)
        if u < 0.45 and H(x, math.floor(y / 6), seed) < 0.35 then c = "ink1" end
        if u > 0.25 and u < 0.6 and H(math.floor(x / 2), math.floor(y / 9), seed + 1) < 0.25 then c = "leaf1" end
        P(img, x, y, c)
      end
      P(img, l, y, (H(l, y, seed + 2) < 0.75) and "ink2" or "ink1")
      if H(l + 1, y, seed + 3) < 0.25 then P(img, l + 1, y, "ink2") end
    end
  end
  trunk(212, 6, 1720)
  trunk(588, 4, 1730)
  -- cypress knees at the bottom
  local function knee(cx, h, hw, seed)
    for y = Hh - h, Hh - 1 do
      local f = (y - (Hh - h)) / h
      local w = 1 + hw * f ^ 0.8
      for x = math.floor(cx - w), math.ceil(cx + w) do
        local c = (x < cx - w * 0.3) and "ink1" or "outline"
        if x == math.floor(cx - w) then c = "ink2" end
        if y == Hh - h then c = "ink2" end
        P(img, x, y, c)
      end
    end
  end
  knee(330, 26, 5, 1740); knee(344, 16, 4, 1741); knee(612, 20, 4, 1742); knee(40, 30, 6, 1743)
  -- dark bank of muck along the bottom under reed clumps
  local REEDS = { { 40, 50 }, { 150, 38 }, { 340, 46 }, { 470, 30 }, { 620, 44 }, { 730, 34 } }
  for ri, rc in ipairs(REEDS) do
    local cx, hw = rc[1], rc[2]
    for i = -hw, hw do
      local t = i / hw
      local h = math.floor(6 * math.sqrt(math.max(0, 1 - t * t)) + H(i, ri, 1750) * 2)
      for y = Hh - h, Hh - 1 do P(img, cx + i, y, (y == Hh - h) and "ink1" or "outline") end
    end
    -- reed blades
    for i = -hw + 3, hw - 3, 2 do
      if H(i, ri, 1751) < 0.8 then
        local t = math.abs(i) / hw
        local h = math.floor((20 + 26 * (1 - t) ) * (0.6 + 0.4 * H(i, ri, 1752)))
        local lean = (H(i, ri, 1753) - 0.5) * 0.35
        for k = 0, h do
          local x = cx + i + math.floor(lean * k * k / h + 0.5)
          local y = Hh - 1 - k
          local c = (k > h - 3) and "leaf1" or ((H(x, y, 1754) < 0.5) and "outline" or "leaf1")
          if k > h * 0.5 and lean < -0.05 and H(x, y, 1755) < 0.3 then c = "ink2" end
          P(img, x, y, c)
          if k < h * 0.45 then P(img, x + 1, y, "outline") end
        end
      end
    end
    -- cattails: taller stalk with a dark seed head, moonlit on the left
    for j = 0, 1 do
      if H(j, ri, 1760) < 0.8 then
        local x = cx + math.floor((H(j, ri, 1761) - 0.5) * hw)
        local h = 42 + math.floor(H(j, ri, 1762) * 10)
        for k = 0, h do P(img, x, Hh - 1 - k, "outline") end
        local hy = Hh - 1 - h + 3
        for y = hy, hy + 6 do
          P(img, x - 1, y, (y < hy + 5) and "ink2" or "ink1"); P(img, x, y, "dirt1"); P(img, x + 1, y, "outline")
        end
        P(img, x, hy - 1, "ink1"); P(img, x, hy - 2, "outline"); P(img, x, hy - 3, "outline")
      end
    end
  end
  -- keep the wrap seam column clear-ish is not needed: everything is drawn periodic in x
  save(img, "m2p2", "fg_speed.png")
end

---------------------------------------------------------------------------------------------------
-- m2p3 DEN CHANNEL 128x12: storm water, opaque below the crest. Crest rows 0-1 with storm-light glints.
do
  local W, Hh = 128, 12
  local img = newImg(W, Hh)
  for y = 2, Hh - 1 do
    local cols
    if y <= 4 then cols = { { "steel1", 0.45 }, { "sky1", 0.25 }, { "steel2", 0.20 }, { "leaf1", 0.10 } }
    elseif y <= 8 then cols = { { "steel1", 0.45 }, { "sky1", 0.25 }, { "leaf1", 0.30 } }
    else cols = { { "leaf1", 0.40 }, { "steel1", 0.40 }, { "ink1", 0.20 } } end
    streakRow(img, y, cols, 1800 + y, 3, 11)
  end
  -- lighter ripple dashes
  for _, rr in ipairs({ { 4, "steel3", 0.25 }, { 7, "steel2", 0.35 }, { 10, "steel2", 0.25 } }) do
    local y, c, p = rr[1], rr[2], rr[3]
    for x = 0, W - 1 do
      if H(math.floor((x + y * 5) / 4), y, 1810) < p and x % 4 ~= 3 then P(img, x, y, c) end
    end
  end
  -- faint green reactor sheen: small horizontal smears with a leaf3 core
  for i = 0, 7 do
    local x = math.floor(H(i, 1, 1820) * W)
    local y = 3 + math.floor(H(i, 2, 1820) * 7)
    local len = 3 + math.floor(H(i, 3, 1820) * 4)
    for k = 0, len - 1 do P(img, x + k, y, (k > 0 and k < len - 1 and H(k, i, 1821) < 0.7) and "leaf3" or "leaf2") end
  end
  -- crest
  streakRow(img, 1, { { "steel3", 0.40 }, { "steel2", 0.30 }, { "ink3", 0.20 }, { "steel4", 0.10 } }, 1830, 2, 7)
  streakRow(img, 0, { { "steel4", 0.25 }, { "ink4", 0.18 }, { "steel3", 0.27 }, { "_", 0.30 } }, 1831, 2, 6)
  for x = 0, W - 1 do if A(img, x, 0) and H(x, 0, 1832) < 0.05 then P(img, x, 0, "ink5") end end
  save(img, "m2p3", "channel.png")
end
do
  local W = 128
  local img = newImg(W, 3)
  streakRow(img, 0, { { "ink5", 0.10 }, { "white", 0.05 }, { "_", 0.85 } }, 1840, 1, 3)
  streakRow(img, 1, { { "ink4", 0.20 }, { "steel4", 0.18 }, { "_", 0.62 } }, 1841, 2, 6)
  streakRow(img, 2, { { "steel3", 0.20 }, { "_", 0.80 } }, 1842, 2, 5)
  save(img, "m2p3", "channel_glint.png")
end

-- rain_sheet.png 192x216: sparse diagonal streaks falling down-left (1 px left per 3 px down). Wraps both ways.
do
  local W, Hh = 192, 216
  local img = newImg(W, Hh)
  for i = 0, 84 do
    local x0 = math.floor(H(i, 1, 1900) * W)
    local y0 = math.floor(H(i, 2, 1900) * Hh)
    local len = 5 + math.floor(H(i, 3, 1900) * 7)
    local c = (H(i, 4, 1900) < 0.3) and "sky4" or "ink4"
    for k = 0, len - 1 do
      local y = (y0 + k) % Hh
      local x = x0 - math.floor((y0 + k) / 3)
      P(img, x, y, (k == len - 1 and c == "ink4") and "ink5" or c)
    end
  end
  save(img, "m2p3", "rain_sheet.png")
end
