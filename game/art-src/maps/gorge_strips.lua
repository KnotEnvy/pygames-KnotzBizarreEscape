-- Mission 1 Part II "TIMBER EXPRESS": the gorge crossing (plain PNGs, binary alpha, palette only, no outlines).
-- Build: bash tools/build-art.sh art-src/maps/gorge_strips.lua
-- Writes public/assets/backgrounds/m1p2/:
--   gorge.png   768x136  seamless in x, transparent top. Deep valley seen from a high trestle: far rim, rock spurs
--                        falling away, a winding river and mist far below. Lighter/hazier toward the bottom.
--                        Meant for screen y 80 (replaces slopes + near pines while the train is on the bridge).
--   trestle.png 256x48   seamless in x. Timber trestle under the track: deck stringer (top 10 px opaque), bents every
--                        32 px with X bracing thinning out downward. Meant for screen y 184 in the 'front' band.
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
  x = math.floor(x) % img.width                         -- every strip wraps horizontally
  if c == nil then img:drawPixel(x, y, CLEAR) else img:drawPixel(x, y, K.color(c)) end
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

-- periodic 1D value noise in [-1, 1]: lattice of `cell` px, wraps every W px (W % cell == 0)
local function pn(x, cell, seed, W)
  local n = W // cell
  local fx = x / cell
  local i = math.floor(fx)
  local t = fx - i
  t = t * t * (3 - 2 * t)
  local a = H(i % n, 0, seed) * 2 - 1
  local b = H((i + 1) % n, 0, seed) * 2 - 1
  return a + (b - a) * t
end

---------------------------------------------------------------------------------------------------
-- gorge.png 768x136: looking down a winding gorge from the trestle. Two vistas per strip (centres x 192, 576):
-- snowy rock spurs step in from both walls (far -> near, each lower and less hazy), the river winds between their
-- toes from the distant gorge end down to the misty depths. Transparent above the far rim.
do
  local W, Hh = 768, 136
  local img = newImg(W, Hh)
  local R = { "ink1", "steel2", "ink2", "steel3", "ink3", "steel4", "ink4", "ink5", "ink6" }   -- value ramp, dark -> light
  local function tone(lv, x, y)
    local i = math.floor(lv)
    if dither(x, y, lv - i) then i = i + 1 end
    return R[math.max(1, math.min(#R, i))]
  end
  local function depthHaze(y) local t = math.max(0, (y - 44) / (Hh - 44)); return 2.6 * t ^ 1.35 end
  local function mist(y0, y1, peak, dens, seed)
    for x = 0, W - 1 do
      local m = 0.55 + 0.45 * pn(x, 48, seed, W)
      for y = y0, y1 do
        local t = 1 - math.abs(y - peak) / math.max(1, (peak - y0 > y1 - peak) and (peak - y0) or (y1 - peak))
        local d = dens * m * math.max(0, t)
        if d > 0.04 and dither(x + seed, y, d) then P(img, x, y, "ink5") end
      end
    end
  end
  local function pine(cx, base, h)
    for k = 0, h - 1 do
      local hw = math.floor((h - k) * 0.4 + 0.3)
      for i = -hw, hw do P(img, cx + i, base - k, (i < 0 and k < h - 1) and "leaf2" or "leaf1") end
    end
    if h >= 4 then P(img, cx - 1, base - h + 3, "ink4") end   -- snow fleck on the lit bough
  end

  ---------------------------------------------------------------- distant gorge end: hazy far rim
  for x = 0, W - 1 do
    local function f(xx) return 15 + 6 * pn(xx, 48, 1, W) + 3 * pn(xx, 16, 2, W) + 0.8 * pn(xx, 4, 3, W) end
    local top = math.floor(f(x) + 0.5)
    local slope = f(x + 1) - f(x - 1)
    for y = top, Hh - 1 do
      local d = y - top
      local lv = 6.3 + d * 0.03 + ((d < 7) and ((slope < -0.3) and 0.7 or ((slope > 0.3) and -0.5 or 0)) or 0)
      local c = tone(lv, x, y)
      if d == 0 then c = (slope <= 0.3) and "ink5" or "ink4" elseif d == 1 and slope < -0.3 then c = "ink5" end
      P(img, x, y, c)
    end
  end

  ---------------------------------------------------------------- floor + river, per vista
  local VISTAS = {
    { c = 192, flip = 1, seed = 100 },
    { c = 576, flip = -1, seed = 200 },
  }
  local RIVER = { { 27, 0 }, { 38, 2 }, { 54, -9 }, { 66, -2 }, { 80, 13 }, { 92, 7 }, { 104, -5 }, { 120, -14 }, { 136, -9 } }
  local function riverX(y, flip)
    for i = 1, #RIVER - 1 do
      local a, b = RIVER[i], RIVER[i + 1]
      if y <= b[1] then
        local t = (y - a[1]) / (b[1] - a[1]); t = (1 - math.cos(t * math.pi)) / 2
        return (a[2] + (b[2] - a[2]) * t) * flip
      end
    end
    return RIVER[#RIVER][2] * flip
  end
  for _, v in ipairs(VISTAS) do
    local c = v.c
    for y = 26, Hh - 1 do
      local t = (y - 26) / (Hh - 26)
      -- snowy valley floor around the river (only the central band; the spurs cover the rest)
      for u = -84, 84 do
        local x = c + u
        local lv = 6.75 + 0.3 * pn(x, 9, v.seed + 2, W) + ((H(x, y, v.seed) < 0.1) and -1 or 0)
        if H(x, y, v.seed + 3) < 0.012 and y > 40 then lv = 4 end                -- boulders / scrub on the floor
        if y == 26 then lv = 6.4 end
        P(img, x, y, tone(lv, x, y))
      end
      local rx = c + riverX(y, v.flip)
      local hw = 0.35 + 2.4 * t
      for x = math.floor(rx - hw - 1), math.ceil(rx + hw + 1) do
        local dd = math.abs(x - rx)
        if dd <= hw + 0.5 then
          local col = (dd <= hw - 0.7) and "sky4" or "sky3"
          if t < 0.12 then col = "sky4" end
          if dd <= 0.7 and H(x, y, v.seed + 1) < 0.16 then col = "sky5" end
          P(img, x, y, col)
        elseif dd <= hw + 1.5 and t > 0.15 then
          P(img, x, y, (x < rx) and "steel3" or "ink5")                       -- shadowed far bank, snowy near bank
        end
      end
    end
  end

  ---------------------------------------------------------------- spurs
  -- crest of a spur at distance u from the vista centre: plateau beyond ua, concave fall to the toe at ut, cliff inside
  local function crest(x, u, sp)
    if u >= sp.ua then return sp.ya + 1.5 * pn(x, 16, sp.seed, W) + 0.8 * pn(x, 4, sp.seed + 1, W) end
    if u >= sp.ut then
      local f = (sp.ua - u) / (sp.ua - sp.ut)
      return sp.ya + (sp.yt - sp.ya) * f ^ 1.7 + 1.4 * pn(x, 8, sp.seed + 2, W) + 0.6 * pn(x, 4, sp.seed + 1, W)
    end
    return sp.yt + (sp.ut - u) * 4.5 + 0.8 * pn(x, 4, sp.seed + 3, W)
  end
  local function jag(x, sp) -- broken, stepped crest
    local v = 2.2 * pn(x, 7, sp.seed + 12, W) + 1.2 * pn(x, 3, sp.seed + 13, W)
    return math.floor(v + 0.5)
  end
  local function spur(c, s, sp)
    local lit = (s > 0)                          -- right-hand wall faces left -> lit from the top-left
    for u = 0, 196 do
      local x = (c + s * u) % W
      local cy = crest(x, u, sp)
      local top = math.floor(cy + 0.5) + ((u >= sp.ut) and jag(x, sp) or 0)
      local foot = sp.foot and math.floor(sp.yt + sp.foot + 3 * pn(x, 12, sp.seed + 14, W) + 0.5) or (Hh - 1)
      local cliff = u < sp.ut
      local gully = pn(x, 14, sp.seed + 4, W) > 0.55
      local stri = 0.3 * pn(x, 6, sp.seed + 5, W) + 0.4 * pn(x, 18, sp.seed + 6, W)
      for y = math.max(0, top), math.min(Hh - 1, foot) do
        local d = y - top
        local lv = sp.base + (lit and 0.85 or -0.8) + stri + depthHaze(y)
        if gully and d > 2 then lv = lv - 0.8 end
        if cliff then lv = lv + (lit and 0.5 or -0.4) end
        local col = tone(lv, x, y)
        -- snow: crest line, plateau snowfield (seen from above), strata ledges
        local plateau = u >= sp.ua - 6
        if y >= foot - 1 and foot < Hh - 1 then col = (y == foot) and "ink5" or "ink4"            -- scree/snow at the foot
        elseif d == 0 then col = lit and "ink6" or "ink5"
        elseif d <= (plateau and 2 or 1) and (lit or plateau) then col = "ink5"
        else
          local sy = y + math.floor(3 * pn(x, 40, sp.seed + 7, W))
          if sy % 7 == 0 and d > 3 and pn(x, 5, sp.seed + 8 + (sy // 7), W) > (lit and 0.45 or 0.75) then
            col = (lv > 6.2) and "ink6" or "ink5"
          elseif sy % 7 == 1 and d > 3 and lit and H(x, y, sp.seed + 9) < 0.2 then
            col = "ink4"
          end
        end
        if cliff and lit and (u == sp.ut - 1 or (u < sp.ut and math.floor(crest(x, u + 1, sp) + 0.5) > y)) then
          if col ~= "ink6" then col = "ink5" end                              -- lit rim down the cliff edge
        end
        P(img, x, y, col)
      end
    end
    -- pines on the plateau / upper crest
    for j = 0, (sp.pines or 3) - 1 do
      local u = math.floor(sp.ut + (sp.ua - sp.ut) * (0.35 + 0.6 * H(c, j, sp.seed + 10)) + 0.5)
      if u <= 194 then
        local x = (c + s * u) % W
        pine(x, math.floor(crest(x, u, sp) + 0.5) + 1, 3 + math.floor(H(c, j, sp.seed + 11) * 3))
      end
    end
  end

  -- per vista: left/right spurs at 4 depths (far -> near). Toe positions alternate so the river winds between them.
  local LEFT = { { ua = 64, ya = 22, ut = 6, yt = 34 }, { ua = 112, ya = 18, ut = 28, yt = 53 },
                 { ua = 152, ya = 14, ut = 16, yt = 76 }, { ua = 205, ya = 9, ut = 48, yt = 101 } }
  local RIGHT = { { ua = 58, ya = 23, ut = 8, yt = 36 }, { ua = 104, ya = 19, ut = 14, yt = 57 },
                  { ua = 146, ya = 15, ut = 40, yt = 80 }, { ua = 205, ya = 10, ut = 34, yt = 106 } }
  local BASE = { 6.0, 5.2, 4.5, 3.95 }
  for j = 1, 4 do
    for vi, v in ipairs(VISTAS) do
      for _, side in ipairs({ -1, 1 }) do
        local src = ((side * v.flip) < 0) and LEFT[j] or RIGHT[j]
        local sp = { ua = src.ua, ya = src.ya + (vi - 1), ut = src.ut, yt = src.yt + ((vi == 2) and 2 or 0),
                     base = BASE[j], seed = v.seed + j * 20 + (side > 0 and 10 or 0), pines = (j >= 3) and 4 or 2,
                     foot = (j < 4) and 11 or nil }
        spur(v.c, side, sp)
      end
    end
    -- mist pooling at this depth, in front of these spurs and behind the nearer ones
    if j < 4 then
      local yt = LEFT[j].yt
      mist(yt - 6, yt + 6, yt + 1, 0.42 + j * 0.04, 300 + j)
    end
  end
  -- the depths: rising mist bank and a milky bottom
  mist(90, 122, 106, 0.55, 310)
  for x = 0, W - 1 do for y = 126, Hh - 1 do
    if dither(x, y, (y - 126) / 10 * 0.3) then P(img, x, y, "ink5") end
  end end
  save(img, "gorge.png")
end

---------------------------------------------------------------------------------------------------
-- trestle.png 256x48
do
  local W, Hh = 256, 48
  local img = newImg(W, Hh)
  local function wood(x, y, lit)
    -- timber colour: grain streaks, darker and sparser going down (it falls into the void)
    local c = lit and "dirt3" or "dirt2"
    if H(x, y, 1000) < 0.18 then c = lit and "dirt2" or "dirt1" end
    if y > 32 and not lit then c = "dirt1" end
    if y > 40 then c = (H(x, y, 1001) < 0.5) and "dirt1" or "outline" end
    return c
  end
  -- X bracing between bents (drawn first, behind the posts). Two tiers of braces, the lower one thinner.
  for b = 0, W // 32 - 1 do
    local x0 = b * 32
    for _, tier in ipairs({ { 10, 30, 2 }, { 30, 50, 1 } }) do
      local y0, y1, th = tier[1], tier[2], tier[3]
      for x = x0 + 2, x0 + 30 do
        local t = (x - x0 - 2) / 28
        local ya = math.floor(y0 + (y1 - y0) * t + 0.5)
        local yb = math.floor(y1 - (y1 - y0) * t + 0.5)
        for k = 0, th - 1 do
          if ya + k < Hh then P(img, x, ya + k, (k == 0) and wood(x, ya, true) or "dirt1") end
          if yb + k < Hh then P(img, x, yb + k, (k == 0) and wood(x, yb, false) or "dirt1") end
        end
      end
      -- horizontal girt at the top of each tier
      if y0 > 10 then for x = x0, x0 + 31 do P(img, x, y0, "dirt2"); P(img, x, y0 + 1, "dirt1") end end
    end
  end
  -- bents: a post every 32 px (4 px wide: lit / mid / mid / shadow), with bolt plates at the joints
  for b = 0, W // 32 - 1 do
    local px = b * 32
    for y = 10, Hh - 1 do
      local c1, c2 = "dirt3", "dirt2"
      if y > 30 then c1, c2 = "dirt2", "dirt1" end
      if y > 41 then c1, c2 = "dirt1", "outline" end
      P(img, px - 1, y, c1); P(img, px, y, c2); P(img, px + 1, y, c2); P(img, px + 2, y, (y > 30) and "outline" or "dirt1")
      if H(px, y, 1010) < 0.12 then P(img, px, y, "dirt1") end
    end
    for _, jy in ipairs({ 11, 30 }) do
      P(img, px, jy + 1, "steel3"); P(img, px + 1, jy + 1, "steel2"); P(img, px, jy + 2, "steel2")
    end
    -- snow caught on the post caps / girt
    P(img, px - 1, 10, "ink5"); P(img, px, 10, "ink4")
  end
  -- deck: stringer beam rows 0-5 (lit dirt4 top edge), tie ends + shadow rows 6-9 (opaque band)
  for x = 0, W - 1 do
    P(img, x, 0, (H(x, 0, 1020) < 0.2) and "dirt5" or "dirt4")
    P(img, x, 1, (H(x, 1, 1021) < 0.3) and "dirt4" or "dirt3")
    P(img, x, 2, "dirt3")
    P(img, x, 3, (H(x, 3, 1022) < 0.25) and "dirt2" or "dirt3")
    P(img, x, 4, "dirt2")
    P(img, x, 5, "dirt1")
    -- cap beam below the stringer
    P(img, x, 6, (H(x, 6, 1023) < 0.3) and "dirt3" or "dirt2")
    P(img, x, 7, "dirt2"); P(img, x, 8, "dirt1"); P(img, x, 9, "outline")
  end
  -- light snow dusting on the stringer top
  for x = 0, W - 1 do if H(x, 0, 1024) < 0.22 then P(img, x, 0, (H(x, 0, 1025) < 0.5) and "ink6" or "ink5") end end
  -- stringer joints + bolts (every 64 px a butt joint, bolts every 16)
  for x = 0, W - 1, 16 do P(img, x + 6, 2, "steel4"); P(img, x + 6, 3, "steel2") end
  for x = 0, W - 1, 64 do for y = 1, 5 do P(img, x + 22, y, "dirt1") end end
  save(img, "trestle.png")
end
