-- Mission 1 Part II "TIMBER EXPRESS": speed-illusion and tunnel strips (plain PNGs, binary alpha, palette only).
-- Build: bash tools/build-art.sh art-src/maps/train_strips.lua
-- Writes public/assets/backgrounds/m1p2/: track.png 64x32, ballast_front.png 64x16, poles.png 512x128,
-- fg_speed.png 1024x96, tunnel_edge.png 48x64, tunnel_wall.png 64x64, tunnel_ceiling.png 64x40.
-- (Never touches the gen_* layers in the same folder.)
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local OUT = ROOT .. "/public/assets/backgrounds/m1p2/"

local function H(x, y, s)
  local h = (math.floor(x) * 374761393 + math.floor(y) * 668265263 + math.floor(s or 0) * 1442695041) & 0xffffffff
  h = ((h ~ (h >> 13)) * 1274126177) & 0xffffffff
  h = h ~ (h >> 16)
  return h / 4294967296
end
local CLEAR = app.pixelColor.rgba(0, 0, 0, 0)
local function newImg(w, h) return Image(w, h, ColorMode.RGB) end
local function P(img, x, y, c)
  if y < 0 or y >= img.height then return end
  x = x % img.width                                     -- every strip wraps horizontally
  if c == nil then img:drawPixel(x, y, CLEAR) else img:drawPixel(x, y, K.color(c)) end
end
local function A(img, x, y)
  if y < 0 or y >= img.height then return false end
  return app.pixelColor.rgbaA(img:getPixel(x % img.width, y)) > 0
end
local function save(img, name)
  local spr = Sprite(img.width, img.height, ColorMode.RGB)
  spr.cels[1].image = img
  spr:saveCopyAs(OUT .. name)
  spr:close()
  print("built m1p2/" .. name .. " (" .. img.width .. "x" .. img.height .. ")")
end
local BAYER = { { 0, 8, 2, 10 }, { 12, 4, 14, 6 }, { 3, 11, 1, 9 }, { 15, 7, 13, 5 } }
local function dither(x, y, d) return d * 16 > BAYER[y % 4 + 1][x % 4 + 1] + 0.5 end

-- horizontal motion-blur streak row: runs of random length picked from a weighted colour list (wraps in x)
local function streakRow(img, y, colors, seed, minL, maxL)
  local W = img.width
  local x = 0
  local k = 0
  while x < W do
    local len = minL + math.floor(H(k, y, seed) * (maxL - minL + 1))
    local r = H(k, y, seed + 1)
    local acc, c = 0, colors[#colors][1]
    for _, cw in ipairs(colors) do acc = acc + cw[2]; if r < acc then c = cw[1]; break end end
    for i = 0, len - 1 do if x + i < W then P(img, x + i, y, c) end end
    x = x + len; k = k + 1
  end
end

---------------------------------------------------------------------------------------------------
-- track.png 64x32: rail (rows 0-4), sleeper ends smeared by speed, ballast + snow streaks below. Opaque.
do
  local img = newImg(64, 32)
  for y = 5, 31 do
    local d = (y - 5) / 26
    local cols
    if y <= 9 then cols = { { "ink5", 0.3 }, { "ink6", 0.12 }, { "white", 0.04 }, { "ink4", 0.3 }, { "ink3", 0.24 } }
    elseif y <= 16 then cols = { { "ink4", 0.15 }, { "ink3", 0.4 }, { "ink5", 0.06 }, { "ink2", 0.39 } }
    elseif y <= 25 then cols = { { "ink3", 0.22 }, { "ink2", 0.5 }, { "ink4", 0.04 }, { "ink1", 0.24 } }
    else cols = { { "ink2", 0.35 }, { "ink1", 0.5 }, { "outline", 0.15 } } end
    streakRow(img, y, cols, 100, 3, 12)
    if d > 0.85 then for x = 0, 63 do if dither(x, y, (d - 0.85) * 4) then P(img, x, y, "outline") end end end
  end
  -- sleeper ends (one per 16 px) blurred into long dark smears with a lit top edge
  for s = 0, 3 do
    local x0 = s * 16 + 2
    for i = -3, 12 do
      local x = x0 + i
      local core = i >= 0 and i <= 6
      if core or H(i, s, 120) < 0.6 then
        P(img, x, 5, core and "dirt3" or "dirt2")
        P(img, x, 6, core and "dirt2" or "dirt1")
        P(img, x, 7, core and "dirt2" or "dirt1")
        if core then P(img, x, 8, "dirt1") end
      end
    end
    -- tie plate under the rail
    for i = 1, 5 do P(img, x0 + i, 5, "steel2") end
  end
  -- rail: head glint, head, web, base flange, shadow
  for x = 0, 63 do
    P(img, x, 0, (H(x, 0, 130) < 0.12) and "white" or "steel5")
    P(img, x, 1, "steel4"); P(img, x, 2, "steel3"); P(img, x, 3, "steel2"); P(img, x, 4, "steel1")
    if H(x, 2, 131) < 0.15 then P(img, x, 2, "steel2") end
  end
  -- fishplate joint (blurred)
  for x = 40, 51 do P(img, x, 2, (x % 3 == 0) and "steel4" or "steel3"); P(img, x, 3, "steel3") end
  save(img, "track.png")
end

---------------------------------------------------------------------------------------------------
-- ballast_front.png 64x16: darker foreground gravel/snow lip at the very bottom of the map. Opaque.
do
  local img = newImg(64, 16)
  for y = 0, 15 do
    local cols
    if y == 0 then cols = { { "ink4", 0.45 }, { "ink5", 0.35 }, { "ink3", 0.2 } }
    elseif y <= 3 then cols = { { "ink4", 0.3 }, { "ink3", 0.4 }, { "ink5", 0.1 }, { "ink2", 0.2 } }
    elseif y <= 8 then cols = { { "ink2", 0.5 }, { "ink3", 0.15 }, { "ink1", 0.35 } }
    else cols = { { "ink1", 0.55 }, { "outline", 0.35 }, { "ink2", 0.1 } } end
    streakRow(img, y, cols, 200, 4, 14)
  end
  save(img, "ballast_front.png")
end

---------------------------------------------------------------------------------------------------
-- poles.png 512x128: mid-distance telegraph poles (every 256 px) with sagging wires, low snowy bushes.
-- No outlines, cool and desaturated, lit from the top-left. Alpha background; wraps in x.
do
  local W, Hh = 512, 128
  local img = newImg(W, Hh)
  local POLES = { 64, 320 }
  local INS = { -11, -5, 6, 12 }                 -- insulator offsets from the pole
  local ARM_Y = 14
  -- wires first (behind the poles)
  for pi, px in ipairs(POLES) do
    local nx = POLES[pi % #POLES + 1]
    if nx <= px then nx = nx + W end
    for wi, o in ipairs(INS) do
      local x0, x1 = px + o, nx + o
      local y0 = ARM_Y - 3
      local sag = 15 + wi
      for x = x0, x1 do
        local t = (x - x0) / (x1 - x0)
        local y = math.floor(y0 + sag * 4 * t * (1 - t) + 0.5)
        P(img, x, y, "ink2")
      end
    end
  end
  -- bushes
  local BUSH = { { 20, 18, 9 }, { 140, 28, 12 }, { 176, 14, 7 }, { 262, 22, 10 }, { 395, 34, 13 }, { 440, 16, 8 }, { 486, 20, 9 } }
  for bi, b in ipairs(BUSH) do
    local cx, hw, hh = b[1], b[2], b[3]
    for i = -hw, hw do
      local t = i / hw
      local top = math.floor(Hh - hh * math.sqrt(math.max(0, 1 - t * t)) + 0.5 + ((i % 3 == 0) and 1 or 0))
      for y = top, Hh - 1 do
        local d = y - top
        local c
        if d == 0 then c = (t < 0.3) and "ink5" or "ink4"
        elseif d == 1 then c = (t < 0.0) and "ink4" or "steel3"
        elseif d == 2 and H(cx + i, y, 300 + bi) < 0.5 then c = "ink4"
        else
          c = (t > 0.35) and "steel1" or "steel2"
          if H(cx + i, y, 310 + bi) < 0.12 then c = "leaf1" end
          if c == "steel2" and H(cx + i, y, 311 + bi) < 0.08 then c = "steel3" end
        end
        P(img, cx + i, y, c)
      end
    end
  end
  -- poles
  for _, px in ipairs(POLES) do
    for y = 6, Hh - 1 do
      P(img, px - 1, y, "ink3"); P(img, px, y, "dirt2"); P(img, px + 1, y, "dirt2"); P(img, px + 2, y, "ink1")
      if H(px, y, 320) < 0.1 then P(img, px + 1, y, "ink2") end
    end
    P(img, px - 1, 5, "ink4"); P(img, px, 5, "ink4"); P(img, px + 1, 5, "ink3")
    -- crossarm + braces
    for x = px - 13, px + 14 do P(img, x, ARM_Y, "ink3"); P(img, x, ARM_Y + 1, "ink2") end
    for x = px - 13, px + 14 do if H(x, 0, 330) < 0.55 then P(img, x, ARM_Y - 1, "ink4") end end
    for k = 0, 6 do P(img, px - 2 - k, ARM_Y + 8 - k, "ink2"); P(img, px + 3 + k, ARM_Y + 8 - k, "ink1") end
    -- insulators
    for _, o in ipairs(INS) do
      P(img, px + o, ARM_Y - 3, "steel4"); P(img, px + o, ARM_Y - 2, "steel3"); P(img, px + o + 1, ARM_Y - 2, "steel2")
      P(img, px + o, ARM_Y - 1, "steel2")
    end
    -- step bolts
    for y = 40, 110, 9 do P(img, px - 2, y, "ink2") end
    -- snow at the foot
    for i = -5, 6 do local top = Hh - 3 + math.floor(math.abs(i) / 3); for y = top, Hh - 1 do P(img, px + i, y, (y == top) and "ink5" or "ink4") end end
  end
  save(img, "poles.png")
end

---------------------------------------------------------------------------------------------------
-- fg_speed.png 1024x96: near-foreground silhouettes whipping past in front of the train: dark snowbank,
-- two pines, one telegraph pole. Mostly transparent, very dark so it never reads as gameplay.
do
  local W, Hh = 1024, 96
  local img = newImg(W, Hh)
  local function pine(cx, height, seed)
    local base = Hh - 8
    local top = base - height
    -- trunk
    for y = base - 14, Hh - 1 do P(img, cx - 1, y, "outline"); P(img, cx, y, "outline"); P(img, cx + 1, y, "outline") end
    -- tiers: drooping skirts, wider going down
    local tiers = 5
    for k = 0, tiers - 1 do
      local ty0 = top + math.floor(k * height * 0.17)
      local ty1 = ty0 + math.floor(height * 0.26)
      local w1 = 4 + math.floor((k + 1) * height * 0.075)
      for y = ty0, ty1 do
        local f = (y - ty0) / math.max(1, ty1 - ty0)
        local hw = 1 + (w1 - 1) * f
        for x = math.floor(cx - hw), math.ceil(cx + hw) do
          local dx = x - cx
          local edge = hw - math.abs(dx)
          local droop = (math.floor(math.abs(dx)) % 4 < 2) and 0 or 2
          if not (y > ty1 - 2 and edge < droop) then
            local c = (dx > 1) and "outline" or "leaf1"
            if f > 0.82 then c = "outline" end
            if dx < -1 and f < 0.75 and H(x, y, seed) < 0.15 then c = "sky1" end
            -- snow lying on the bough tops (dim so it stays in the dark foreground)
            local above = y - 1
            local hwa = 1 + (w1 - 1) * ((above - ty0) / math.max(1, ty1 - ty0))
            if y == ty0 or math.abs(dx) > hwa then
              if dx < hw * 0.6 then c = (dx < 0) and "ink3" or "ink2" end
            end
            P(img, x, y, c)
          end
        end
      end
    end
  end
  -- snowbank along the bottom
  for x = 0, W - 1 do
    local h = 11 + math.floor(1.6 * math.sin(x / W * 2 * math.pi * 5) + 1.2 * math.sin(x / W * 2 * math.pi * 13 + 1.1) + 0.5)
    local top = Hh - h
    for y = top, Hh - 1 do
      local d = y - top
      local c = (d == 0) and "ink3" or ((d <= 2) and "ink2" or ((d <= 6) and "ink1" or "outline"))
      if d == 1 and H(x, y, 400) < 0.25 then c = "ink3" end
      P(img, x, y, c)
    end
  end
  pine(300, 70, 410)
  pine(352, 46, 411)
  pine(720, 62, 412)
  -- full-height telegraph pole (dark)
  local px = 900
  for y = 0, Hh - 1 do
    P(img, px - 2, y, "ink1"); P(img, px - 1, y, "outline"); P(img, px, y, "outline"); P(img, px + 1, y, "outline"); P(img, px + 2, y, "outline")
  end
  for x = px - 16, px + 17 do P(img, x, 10, "ink1"); P(img, x, 11, "outline"); P(img, x, 12, "outline") end
  for _, o in ipairs({ -14, -7, 7, 14 }) do P(img, px + o, 8, "ink2"); P(img, px + o, 9, "ink1") end
  for k = 0, 8 do P(img, px - 3 - k, 22 - k, "outline"); P(img, px + 3 + k, 22 - k, "outline") end
  for x = px - 16, px + 17 do if H(x, 9, 420) < 0.5 then P(img, x, 9, "ink2") end end
  save(img, "fg_speed.png")
end

---------------------------------------------------------------------------------------------------
-- rock helpers for the tunnel strips: voronoi facets that wrap with the given periods
local function rockField(w, h, seeds, wrapX, wrapY)
  return function(x, y)
    local d1, d2, best = 1e9, 1e9, nil
    for i, s in ipairs(seeds) do
      for oy = (wrapY and -1 or 0), (wrapY and 1 or 0) do for ox = (wrapX and -1 or 0), (wrapX and 1 or 0) do
        local dx, dy = x - (s[1] + ox * w), y - (s[2] + oy * h)
        local d = math.sqrt(dx * dx * 1.3 + dy * dy)
        if d < d1 then d2 = d1; d1 = d; best = { dx = dx, dy = dy, i = i } elseif d < d2 then d2 = d end
      end end
    end
    return d2 - d1, best
  end
end
local function seedsFor(n, w, h, s) local t = {}; for i = 1, n do t[i] = { math.floor(H(i, 1, s) * w), math.floor(H(i, 2, s) * h) } end; return t end
local TONES = { "outline", "ink1", "ink2", "ink3", "ink4", "ink5" }

-- tunnel_edge.png 48x64 (tiles vertically): rock portal face, lit rim on the left, fading to black at the right.
do
  local W, Hh = 48, 64
  local img = newImg(W, Hh)
  local field = rockField(W, Hh, seedsFor(9, W, Hh, 500), false, true)
  for y = 0, Hh - 1 do
    local cut = math.floor(1 + math.sin(y / Hh * 2 * math.pi * 3) * 1.0 + math.sin(y / Hh * 2 * math.pi * 7 + 2) * 0.8 + 0.5)
    for x = 0, W - 1 do
      if x >= cut then
        local gap, b = field(x, y)
        -- base brightness falls off to the right (dithered)
        local u = (x - cut) / (W - 1 - cut)
        local base = 3.6 - u * 3.9
        local f = b.dx + b.dy * 1.2
        if f < -3 then base = base + 0.8 elseif f > 3 then base = base - 0.7 end
        local lv = math.floor(base)
        local fr = base - lv
        if fr > 0.62 or (fr > 0.38 and (x + y) % 2 == 0) then lv = lv + 1 end
        if gap < 1.0 then lv = lv - 2 end
        if x == cut then lv = 5 elseif x <= cut + 1 and lv < 4 then lv = 4 end
        lv = math.max(0, math.min(5, lv))
        P(img, x, y, TONES[lv + 1])
        -- snow lodged on lit ledges near the rim
        if x < cut + 7 and gap < 1.0 and b.dy > 0 and H(x, y, 510) < 0.5 then P(img, x, y, "ink6") end
      end
    end
  end
  save(img, "tunnel_edge.png")
end

-- tunnel_wall.png 64x64 (tiles both ways): very dark, low-contrast rock.
do
  local W, Hh = 64, 64
  local img = newImg(W, Hh)
  local field = rockField(W, Hh, seedsFor(11, W, Hh, 600), true, true)
  for y = 0, Hh - 1 do for x = 0, W - 1 do
    local gap, b = field(x, y)
    local f = b.dx + b.dy * 1.2
    local c = "ink1"
    if gap < 1.0 then c = "outline"
    elseif f < -4.5 then c = "ink2"
    elseif f > 4.5 then c = "outline"
    elseif H(x, y, 610) < 0.03 then c = "ink2" end
    P(img, x, y, c)
  end end
  save(img, "tunnel_wall.png")
end

-- tunnel_ceiling.png 64x40 (tiles in x): rock band from the top with a jagged, dripping lower edge + icicles.
do
  local W, Hh = 64, 40
  local img = newImg(W, Hh)
  local field = rockField(W, Hh, seedsFor(8, W, 30, 700), true, false)
  local bottoms = {}
  for x = 0, W - 1 do
    local b = 24 + 3 * math.sin(x / W * 2 * math.pi * 2) + 2 * math.sin(x / W * 2 * math.pi * 5 + 0.7)
    -- hanging rock teeth
    for _, tth in ipairs({ { 9, 5, 3 }, { 30, 7, 4 }, { 47, 4, 2 }, { 58, 6, 3 } }) do
      local d = math.abs(x - tth[1])
      if d < tth[3] then b = b + tth[2] * (1 - d / tth[3]) end
    end
    bottoms[x] = math.floor(b + 0.5)
  end
  for x = 0, W - 1 do
    for y = 0, bottoms[x] do
      local gap, bb = field(x, y)
      local f = bb.dx + bb.dy * 1.2
      local c = "ink1"
      if gap < 1.0 then c = "outline" elseif f < -4 then c = "ink2" elseif f > 3 then c = "outline" end
      if y >= bottoms[x] - 1 then c = "outline" end
      if y < 6 and c == "ink1" and dither(x, y, 0.5) then c = "outline" end
      P(img, x, y, c)
    end
  end
  -- icicles under the lip
  for _, ic in ipairs({ { 5, 6 }, { 6, 3 }, { 18, 8 }, { 19, 4 }, { 31, 5 }, { 40, 9 }, { 41, 5 }, { 53, 6 }, { 61, 4 } }) do
    local x, len = ic[1], ic[2]
    local y0 = bottoms[x] + 1
    for k = 0, len - 1 do
      local c = (k == len - 1) and "sky4" or ((k < 2) and "ink5" or "sky5")
      if y0 + k < Hh then P(img, x, y0 + k, c) end
    end
    if len > 4 then P(img, x + 1, y0, "sky5"); P(img, x + 1, y0 + 1, "sky4") end
  end
  save(img, "tunnel_ceiling.png")
end
