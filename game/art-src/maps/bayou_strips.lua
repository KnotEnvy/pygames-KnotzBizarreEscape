-- Mission 2 "BAYOU BLACKOUT": runtime water / foam / foreground / haze strips (plain PNGs, binary alpha, palette only).
-- Build: bash tools/build-art.sh art-src/maps/bayou_strips.lua
-- Writes (never touches the gen_* layers in the same folders):
--   m2p1/ wade.png 64x18, wade_crest.png 64x3, wade_edge.png 24x18 (2 frames of 12), haze.png 384x40
--   m2p2/ river_front.png 256x14, river_wake.png 256x10, fg_speed.png 768x30, fg_reeds.png 768x24, fg_trunks.png 768x216, haze.png 384x40
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
-- m2p1 WADING WATER (KBE-QA-G06 redraw: murky tea-brown swamp water, not a glass trough).
-- wade.png 64x18: row 0 a soft, broken surface line (short dull glints, no long or white highlights), row 1 a dark
-- meniscus, rows 2-13 a murky face that darkens with depth (the legs read dimly through it), rows 14-17 (over the riverbed) dither into
-- the riverbed so the bottom has no hard edge. Drawn at alpha ~0.7 over the legs.
local WADE_ROWS = {
  -- { colours by weight } per depth band
  { 2, 4,  { { "olive2", 0.40 }, { "leaf2", 0.34 }, { "dirt2", 0.16 }, { "olive3", 0.10 } } },
  { 5, 8,  { { "olive2", 0.34 }, { "leaf2", 0.26 }, { "dirt2", 0.24 }, { "leaf1", 0.16 } } },
  { 9, 12, { { "leaf1", 0.38 }, { "dirt1", 0.26 }, { "olive1", 0.24 }, { "dirt2", 0.12 } } },
  { 13, 17, { { "leaf1", 0.42 }, { "dirt1", 0.36 }, { "olive1", 0.22 } } },
}
local function wadeCols(y)
  for _, r in ipairs(WADE_ROWS) do if y >= r[1] and y <= r[2] then return r[3] end end
  return WADE_ROWS[#WADE_ROWS][3]
end
-- fade of the face toward the riverbed: 1 = solid, 0 = gone (Bayer dithered)
-- rows 0-13 are above the riverbed (only the parallax is behind them): solid; rows 14-17 overlap the riverbed tile
local function wadeFade(y) if y <= 13 then return 1 end return math.max(0, 1 - (y - 13) * 0.24) end
local function wadeFace(img, x, y)
  local cols = wadeCols(y)
  -- short horizontal runs so the murk has texture without banding
  local k = math.floor((x + math.floor(H(y, 0, 1100) * 7)) / (3 + math.floor(H(math.floor(x / 4), y, 1102) * 4)))
  return pick(cols, H(k, y, 1101))
end
local function drawWade(img)
  for y = 1, 17 do
    for x = 0, 63 do
      if y == 1 then P(img, x, y, H(x, 1, 1103) < 0.7 and "leaf1" or "olive1")
      elseif dither(x, y, wadeFade(y)) then P(img, x, y, wadeFace(img, x, y)) end
    end
  end
  -- gentle ripple dashes on the face (short, broken, dim): rows 4, 7, 10
  for _, rb in ipairs({ { 4, "olive3", 0.22, 1110 }, { 7, "leaf3", 0.16, 1111 }, { 10, "leaf2", 0.20, 1112 } }) do
    local y, c, p, sd = rb[1], rb[2], rb[3], rb[4]
    local x = 0
    while x < 64 do
      local len = 1 + math.floor(H(x, y, sd) * 3)
      if H(x, y, sd + 7) < p then for i = 0, len - 1 do P(img, x + i, y, c) end end
      x = x + len + 2 + math.floor(H(x, y, sd + 9) * 5)
    end
  end
  -- surface line: dull and broken (leaf3 / olive3 / steel3 runs of 1-4 px with gaps), a rare single steel4 glint
  local x = 0
  while x < 64 do
    local len = 1 + math.floor(H(x, 0, 1120) * 4)
    local r = H(x, 0, 1121)
    local c = r < 0.38 and "leaf3" or r < 0.66 and "olive3" or r < 0.86 and "steel3" or "_"
    for i = 0, len - 1 do P(img, x + i, 0, c) end
    x = x + len + math.floor(H(x, 0, 1122) * 2)
  end
  for xx = 0, 63 do if A(img, xx, 0) and H(xx, 0, 1123) < 0.04 then P(img, xx, 0, "steel4") end end
end
do
  local img = newImg(64, 18)
  drawWade(img)
  save(img, "m2p1", "wade.png")
end
-- wade_crest.png 64x3: slow ripples sliding the other way over the surface: sparse short dim dashes.
do
  local img = newImg(64, 3)
  for y = 0, 2 do
    local x = math.floor(H(y, 0, 1130) * 6)
    while x < 64 do
      local len = (y == 0) and 1 + math.floor(H(x, y, 1131) * 2) or 2 + math.floor(H(x, y, 1131) * 3)
      local c = (y == 0) and (H(x, y, 1132) < 0.5 and "olive4" or "steel3") or (y == 1 and "olive3" or "leaf3")
      for i = 0, len - 1 do P(img, x + i, y, c) end
      x = x + len + 5 + math.floor(H(x, y, 1133) * 9)
    end
  end
  save(img, "m2p1", "wade_crest.png")
end
-- wade_edge.png 24x18 = two 12 px frames of the left end (the runtime flips it for the right end). Column 11 matches the
-- body; toward the bank the face dissolves (Bayer dither) instead of ending in a cap, the surface line breaks up and
-- grey-green foam flecks collect against the bank (they shift between the two frames, ~2.2 Hz).
do
  local img = newImg(24, 18)
  for f = 0, 1 do
    local ox = f * 12
    for x = 0, 11 do
      local d = math.min(1, (x - 1) / 8)   -- face density: 0 at the bank, 1 by column 9
      for y = 1, 17 do
        local fade = (y == 1) and math.min(1, d * 1.4) or d * wadeFade(y)
        if fade > 0 and dither(x + y, y, fade) then
          P(img, ox + x, y, (y == 1) and "leaf1" or wadeFace(img, x, y))
        end
      end
      -- broken surface line, thinning toward the bank
      if H(x, f, 1141) < 0.25 + d * 0.6 then P(img, ox + x, 0, H(x, 0, 1142) < 0.5 and "olive3" or "leaf3") end
    end
    -- foam flecks against the bank: rows 0-3, densest at columns 0-4
    for x = 0, 6 do
      for y = 0, 3 do
        local p = (0.5 - x * 0.07) * (1 - y * 0.22)
        if H(x * 3 + f * 17, y, 1143) < p then P(img, ox + x, y, (H(x, y + f, 1144) < 0.35) and "ink4" or ((y == 0) and "steel4" or "ink3")) end
      end
    end
  end
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
-- m2p2 FOREGROUND SPEED LAYERS (front band, in front of gameplay). KBE-QA-G02: they may only hold scenery outside the
-- combat band, so they can never hide an enemy, a muzzle cue or a bullet.
--   fg_speed.png 768x30: a canopy fringe for the top margin (screen-fixed, y <= 28: behind the HUD, above the radio strip).
--   fg_reeds.png 768x24: a low muck/reed fringe of the near bank, world-anchored below the airboat lane (top at world
--                        y 352; hulls end at ~348), so it shows at the bottom edge from the main deck and never meets an actor.
-- The trunks that crossed the decks moved to fg_trunks.png, behind the gameplay layers.
local FG_TOP = 28
do
  local W, Hh = 768, 30
  local img = newImg(W, Hh)
  local DARK = { { "outline", 0.6 }, { "ink1", 0.25 }, { "leaf1", 0.15 } }
  local CLUMPS = { { 120, 70, 14 }, { 205, 40, 18 }, { 300, 34, 9 }, { 470, 64, 13 }, { 575, 36, 17 }, { 690, 44, 11 } }
  local canopyBot = {}
  for x = 0, W - 1 do canopyBot[x] = -1 end
  for ci, cl in ipairs(CLUMPS) do
    local cx, hw, dep = cl[1], cl[2], cl[3]
    for i = -hw, hw do
      local t = i / hw
      local q = math.sqrt(math.max(0, 1 - t * t))
      local b = math.floor(dep * q + (2 * math.sin(i * 0.37 + ci) + 1.5 * math.sin(i * 0.91 + ci * 2)) * q)
      local x = (cx + i) % W
      if b > canopyBot[x] then canopyBot[x] = b end
    end
  end
  for x = 0, W - 1 do
    for y = 0, canopyBot[x] do
      local c = pick(DARK, H(math.floor(x / 3), math.floor(y / 2), 1700))
      if y >= canopyBot[x] - 1 and H(x, y, 1701) < 0.18 then c = "ink2" end
      P(img, x, y, c)
    end
    if canopyBot[x] >= 0 and H(x, 0, 1702) < 0.4 then P(img, x, canopyBot[x] + 1, "leaf1") end
  end
  -- short Spanish-moss tassels, every pixel above FG_TOP
  local CURT = { { 100, 22 }, { 212, 16 }, { 455, 20 }, { 580, 14 }, { 692, 18 } }
  for ci, cu in ipairs(CURT) do
    local cx, hw = cu[1], cu[2]
    for i = -hw, hw do
      if H(i, ci, 1710) < 0.55 then
        local x0 = cx + i
        local y0 = math.max(0, canopyBot[x0 % W] - 1)
        local len = math.floor((FG_TOP - y0) * (1 - 0.7 * (i / hw) ^ 2) * (0.4 + 0.6 * H(i, ci, 1712)))
        for k = 0, len do
          local y = y0 + k
          if y > FG_TOP then break end
          local f = k / math.max(1, len)
          if f < 0.5 or H(x0, y, 1713) > (f - 0.5) * 1.6 then
            P(img, x0 + math.floor(math.sin(k * 0.2 + ci) + 0.5), y, (H(math.floor(x0 / 2), math.floor(y / 3), 1714) < 0.55) and "leaf1" or "ink1")
          end
        end
      end
    end
  end
  save(img, "m2p2", "fg_speed.png")
end
do
  local W, Hh = 768, 24
  local img = newImg(W, Hh)
  local REEDS = { { 40, 50 }, { 150, 38 }, { 340, 46 }, { 470, 30 }, { 620, 44 }, { 730, 34 } }
  for ri, rc in ipairs(REEDS) do
    local cx, hw = rc[1], rc[2]
    for i = -hw, hw do
      local t = i / hw
      local h = math.floor(5 * math.sqrt(math.max(0, 1 - t * t)) + H(i, ri, 1750) * 2)
      for y = Hh - h, Hh - 1 do P(img, cx + i, y, (y == Hh - h) and "ink1" or "outline") end
    end
    for i = -hw + 3, hw - 3, 3 do
      if H(i, ri, 1751) < 0.7 then
        local t = math.abs(i) / hw
        local h = math.min(Hh - 2, math.floor((8 + 10 * (1 - t)) * (0.6 + 0.4 * H(i, ri, 1752))))
        local lean = (H(i, ri, 1753) - 0.5) * 0.5
        for k = 0, h do
          local x = cx + i + math.floor(lean * k * k / math.max(1, h) + 0.5)
          P(img, x, Hh - 1 - k, (k > h - 2) and "leaf1" or ((H(x, k, 1754) < 0.5) and "outline" or "leaf1"))
        end
      end
    end
  end
  save(img, "m2p2", "fg_reeds.png")
end
-- m2p2 NEAR-BANK TRUNKS 768x216 (near band, BEHIND the boat and every actor): three thin cypress trunks with a moonlit
-- rim and a moss tuft, passing at near world speed (sfX 0.9 + drift) like Mission 1's telegraph poles. The boat's tiles
-- and the actors draw over them, so they read as speed without ever covering combat.
do
  local W, Hh = 768, 216
  local img = newImg(W, Hh)
  local function trunk(cx, hw, seed)
    for y = 0, Hh - 1 do
      local flare = 0
      if y > Hh - 60 then flare = ((y - (Hh - 60)) / 60) ^ 2 * hw * 2 end
      local wob = math.floor(0.8 * math.sin(y * 0.05 + seed) + 0.5)
      local l = math.floor(cx - hw - flare * 1.1 + wob)
      local r = math.floor(cx + hw + flare + wob)
      for x = l, r do
        local c = "outline"
        local u = (x - l) / math.max(1, r - l)
        if u < 0.45 and H(x, math.floor(y / 6), seed) < 0.35 then c = "ink1" end
        if u > 0.3 and u < 0.6 and H(math.floor(x / 2), math.floor(y / 9), seed + 1) < 0.2 then c = "steel1" end
        P(img, x, y, c)
      end
      P(img, l, y, (H(l, y, seed + 2) < 0.7) and "steel2" or "ink1")
    end
    -- a stub branch with a moss tuft high up
    local by = 30 + math.floor(H(cx, 0, seed + 4) * 20)
    for i = 1, 10 do P(img, cx + hw + i, by - math.floor(i / 3), "outline"); P(img, cx + hw + i, by + 1 - math.floor(i / 3), "ink1") end
    for i = 3, 10, 2 do for k = 0, 4 + math.floor(H(i, cx, seed + 5) * 8) do P(img, cx + hw + i, by + 2 - math.floor(i / 3) + k, (k % 3 == 0) and "leaf1" or "ink1") end end
  end
  trunk(150, 3, 1720)
  trunk(420, 2, 1730)
  trunk(640, 4, 1740)
  save(img, "m2p2", "fg_trunks.png")
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
