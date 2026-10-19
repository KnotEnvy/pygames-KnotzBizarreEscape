-- Forest props: big foreground pine, mid-ground pine (no outline), dead pine.
-- Build: bash tools/build-art.sh art-src/props/forest.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local P = dofile(ROOT .. "/art-src/props/lib/pk.lua")(K)

-- pal = { deep, shadow, base, light, hi, snow_hi, snow, snow_sh }
-- One tier: a skirt of branches. Upper slopes carry a snow blanket, the bottom edge is a row of
-- drooping needle fingers over a dark underside. Lit from the top-left.
local function tier(img, cx, top, bot, W, pal, rnd, o)
  local H = bot - top
  local phase = rnd(0, 3)
  local mid = top + math.floor(H * 0.55)
  local function hwAt(y) return W * ((y - top) / H) ^ (o.flare or 1.4) end
  local function ybAt(d)
    local ad = math.abs(d)
    local zig = ({ 0, 1, 2, 1 })[((d + phase) % 4) + 1]
    return bot - 2 + math.floor(3 * (ad / W) ^ 2 + 0.5) - zig
  end
  -- cast shadow from this tier onto whatever is below its fingers
  for d = -W, W do
    local yb = ybAt(d)
    if math.abs(d) <= W - 1 then
      P.over(img, cx + d, yb + 1, pal[1]); P.over(img, cx + d, yb + 2, pal[1])
      if math.abs(d) < W * 0.6 then P.over(img, cx + d, yb + 3, pal[2]) end
    end
  end
  local cols = {}
  for d = -W - 1, W + 1 do
    local x = cx + d
    local yb = ybAt(d)
    for y = top, yb do
      if math.abs(d) <= hwAt(y) + 0.5 then
        local hw = math.max(1, hwAt(y))
        local u = d / hw
        local c
        if y >= yb - 1 then c = (y == yb) and pal[2] or pal[1]
        elseif u < -0.45 then c = pal[4]
        elseif u > 0.5 then c = pal[2]
        else c = pal[3] end
        -- inner ledge: a second branch layer halfway down
        local ledge = mid + ({ 0, 1, 2, 1 })[((d + phase + 2) % 4) + 1] - math.floor(2 * (1 - math.abs(u)))
        if y == ledge then c = pal[1] elseif y == ledge + 1 then c = (u < 0.3) and pal[5] or pal[4] end
        -- needle strokes
        if y < yb - 1 and y ~= ledge and y ~= ledge + 1 then
          local k = (d < 0) and (x + y) % 5 or (x - y) % 5
          if k == 0 and math.abs(d) > 1 then c = (c == pal[4]) and pal[3] or pal[2] end
        end
        P.set(img, x, y, c)
        cols[d] = cols[d] or y
      end
    end
  end
  -- snow blanket in lumps on the upper slopes (heavier on the lit left side)
  local d = -W - 1
  while d <= W + 1 do
    local lw = rnd(3, 5)
    local u = math.abs(d + lw / 2) / W
    if u > 0.3 and rnd() < (o.snow or 0.8) then
      for i = 0, lw - 1 do
        local dd = d + i
        local y0 = cols[dd]
        if y0 and math.abs(dd) <= W + 1 then
          local lit = dd < 0
          local prof = (i == 0 or i == lw - 1) and 1 or ((u > 0.6) and 3 or 2)
          P.set(img, cx + dd, y0 - 1, lit and pal[6] or pal[7])
          for k = 0, prof - 1 do
            local c = (k == prof - 1) and pal[8] or pal[7]
            if k == 0 and lit and i < lw / 2 then c = (prof > 1) and pal[6] or c end
            P.set(img, cx + dd, y0 + k, c)
          end
          if prof == 3 and rnd() < 0.5 then P.set(img, cx + dd, y0 - 2, lit and pal[6] or pal[7]); P.set(img, cx + dd, y0 - 1, pal[7]) end
        end
      end
    end
    d = d + lw + rnd(0, 2)
  end
  -- heavy clumps resting on the flattened outer shoulders of the tier
  local function lump(xc, w, h, lit)
    for i = -w, w do
      local t = math.max(1, math.floor(h * (1 - (i / (w + 1)) ^ 2) + 0.5))
      local col = cols[i + xc - cx]
      if col then
        local yb = col + 1
        for k = 0, t - 1 do
          local c = pal[7]
          if k == t - 1 then c = (lit and i <= 0) and pal[6] or pal[7] end
          if k == 0 then c = pal[8] end
          if not lit and i > 0 and k < t - 1 then c = pal[8] end
          P.set(img, xc + i, yb - k, c)
        end
      end
    end
  end
  local sw = math.max(1, math.floor(W / 8))
  lump(cx - W + sw + 1, sw + 1, (W > 8) and 3 or 2, true)
  lump(cx + W - sw - 1, sw, (W > 8) and 3 or 2, false)
  if W > 10 then lump(cx - math.floor(W * 0.5), sw, 2, true) end
  for d = -W + 2, W - 2 do
    local u = d / W
    local ledge = mid + ({ 0, 1, 2, 1 })[((d + phase + 2) % 4) + 1] - math.floor(2 * (1 - math.abs(u)))
    if math.abs(u) > 0.3 and ((d + phase) % 7 < 3) and rnd() < 0.8 then
      P.over(img, cx + d, ledge, d < 0 and pal[6] or pal[7]); P.over(img, cx + d, ledge + 1, pal[8])
    end
  end
end

-- Pine: stacked tiers of branch layers over a trunk.
local function pine(img, o)
  local rnd = P.rng(o.seed)
  local cx = o.cx
  local tw = o.trunkW
  for y = o.trunkTop, o.ground do
    for i = 0, tw - 1 do
      local t = i / (tw - 1)
      local c = (t < 0.3) and o.bark[3] or (t < 0.7) and o.bark[2] or o.bark[1]
      if i == 0 then c = o.bark[2] end
      P.set(img, cx - math.floor(tw / 2) + i, y, c)
    end
  end
  for _ = 1, 6 do
    local x, y = cx - math.floor(tw / 2) + rnd(1, tw - 2), rnd(o.ground - 10, o.ground - 2)
    P.set(img, x, y, o.bark[1]); P.set(img, x, y + 1, o.bark[1])
  end
  P.set(img, cx - math.floor(tw / 2) - 1, o.ground, o.bark[2]); P.set(img, cx + math.ceil(tw / 2), o.ground, o.bark[1])
  for ti = 1, #o.tiers do
    local t = o.tiers[ti]
    tier(img, cx, t[1], t[2], t[3], o.pal, rnd, o)
  end
  -- leader (top spike)
  local lt = o.tiers[#o.tiers][1]
  for k = 0, 3 do P.set(img, cx, lt - 4 + k, (k < 2) and o.pal[4] or o.pal[3]) end
  P.set(img, cx, lt - 5, o.pal[6]); P.set(img, cx - 1, lt - 2, o.pal[7])
  if o.mound then
    P.mound(img, cx - 1, o.ground, o.mound[1], o.mound[2])
    if o.dimMound then
      for y = o.ground - o.mound[2], o.ground do for x = cx - o.mound[1] - 1, cx + o.mound[1] do
        local c = P.get(img, x, y)
        if c == "white" or c == "ink6" then P.set(img, x, y, "ink5") elseif c == "ink5" then P.set(img, x, y, "ink4") end
      end end
    end
  end
end

-------------------------------------------------------------------------------
-- prop_pine_fg 48x96
-------------------------------------------------------------------------------
local FG = { "leaf1", "leaf1", "leaf2", "leaf3", "leaf4", "white", "ink6", "ink5" }
K.build(P.spec("prop_pine_fg", 48, 96, {
  { tag = "prop_pine_fg_idle", ms = 100, frames = { { grid = function(img)
    pine(img, {
      seed = 17, cx = 24, trunkW = 6, trunkTop = 24, ground = 94,
      bark = { "dirt1", "dirt2", "dirt3" },
      pal = FG, lh = 6, snow = 0.7,
      tiers = { { 62, 88, 23 }, { 48, 73, 20 }, { 35, 58, 17 }, { 23, 44, 14 }, { 13, 31, 11 }, { 5, 20, 8 }, { 1, 11, 5 } }, flare = 1.7,
      mound = { 8, 3 },
    })
    P.selout(img)
  end } } },
}))

-------------------------------------------------------------------------------
-- prop_pine_mid 32x64 (background: lighter, desaturated, no outline)
-------------------------------------------------------------------------------
local MID = { "leaf2", "leaf2", "leaf3", "leaf4", "sky4", "ink5", "ink4", "sky4" }
K.build(P.spec("prop_pine_mid", 32, 64, {
  { tag = "prop_pine_mid_idle", ms = 100, frames = { { grid = function(img)
    pine(img, {
      seed = 5, cx = 16, trunkW = 4, trunkTop = 20, ground = 63,
      bark = { "ink2", "ink2", "ink3" },
      pal = MID, lh = 5, snow = 0.9,
      tiers = { { 26, 59, 15 }, { 15, 44, 12 }, { 7, 30, 9 }, { 2, 17, 5 } },
      mound = { 6, 2 }, dimMound = true,
    })
  end } } },
}))

-------------------------------------------------------------------------------
-- prop_pine_dead 32x64: bare, broken-topped snag with snowy stubs
-------------------------------------------------------------------------------
local function deadPine(img)
  local rnd = P.rng(77)
  local cx, ground = 15, 62
  -- trunk: tapers from 7 wide at the foot to 3 at the broken top (y=10)
  for y = 10, ground do
    local f = (y - 10) / (ground - 10)
    local w = math.floor(3 + 4 * f ^ 1.4 + 0.5)
    local lean = math.floor((1 - f) * 2 + 0.5)        -- slight lean to the right near the top
    local x0 = cx - math.floor(w / 2) + lean
    for i = 0, w - 1 do
      local t = i / math.max(1, w - 1)
      local c = (i == 0 and w > 3) and "ink3" or (t < 0.35) and "ink4" or (t < 0.7) and "ink3" or "dirt2"
      P.set(img, x0 + i, y, c)
    end
  end
  -- bark cracks (vertical) and a knot hole
  for _ = 1, 9 do
    local y = rnd(14, ground - 3)
    local f = (y - 10) / (ground - 10)
    local w = math.floor(3 + 4 * f ^ 1.4 + 0.5)
    local x = cx - math.floor(w / 2) + math.floor((1 - f) * 2 + 0.5) + rnd(1, math.max(1, w - 2))
    P.over(img, x, y, "ink2"); P.over(img, x, y + 1, "ink2"); if rnd() < 0.5 then P.over(img, x, y + 2, "dirt1") end
  end
  P.set(img, 15, 40, "outline"); P.set(img, 16, 40, "dirt1"); P.set(img, 15, 41, "dirt1"); P.set(img, 14, 39, "ink5")
  -- jagged broken top with pale splinters
  local tops = { { 15, 6 }, { 15, 7 }, { 16, 8 }, { 16, 9 }, { 17, 7 }, { 17, 8 }, { 17, 9 }, { 18, 9 }, { 14, 8 }, { 14, 9 } }
  for _, p in ipairs(tops) do P.set(img, p[1], p[2], "ink4") end
  P.set(img, 15, 6, "sand4"); P.set(img, 17, 7, "sand4"); P.set(img, 18, 9, "dirt2"); P.set(img, 16, 9, "dirt3")
  -- branches: {x, y, len, dir(-1 left / 1 right), rise}
  local br = {
    { 13, 53, 9, -1, 1 }, { 18, 49, 5, 1, 3 }, { 13, 43, 4, -1, 3 }, { 18, 38, 9, 1, 4 },
    { 14, 31, 7, -1, 4 }, { 18, 25, 4, 1, 2 }, { 15, 19, 5, -1, 3 }, { 17, 15, 3, 1, 1 },
  }
  for bi, b in ipairs(br) do
    local x0, y0, len, dir, rise = b[1], b[2], b[3], b[4], b[5]
    local x1, y1 = x0 + dir * len, y0 - rise
    P.line(img, x0, y0, x1, y1, nil, function(x, y)
      P.set(img, x, y, "ink4"); P.set(img, x, y + 1, (math.abs(x - x0) < len - 1) and "ink3" or "ink2")
      if math.abs(x - x0) < 3 then P.set(img, x, y + 2, "dirt2") end
    end)
    -- broken tip twig
    P.set(img, x1 + dir, y1 - 1, "ink3")
    if bi % 3 == 0 then P.set(img, x1 - dir * 2, y1 - 2, "ink3") end
    -- snow along the top of the branch
    if bi ~= 2 and bi ~= 6 then
      local sl = math.floor(len * 0.75)
      P.line(img, x0 + dir, y0 - 1, x1, y1 - 1, nil, function(x, y)
        if math.abs(x - x0) <= sl then
          P.set(img, x, y, (dir < 0 and math.abs(x - x0) < sl) and "white" or "ink6")
          P.over(img, x, y + 1, "ink5")
        end
      end)
    end
  end
  -- snow on the broken top and a drift at the foot
  P.set(img, 14, 7, "white"); P.set(img, 15, 5, "white"); P.set(img, 16, 7, "ink6"); P.set(img, 17, 6, "ink6")
  P.mound(img, 16, ground, 9, 3)
  -- a fallen chunk of bark half-buried in the drift
  P.fill(img, 22, ground - 1, 4, 1, "ink3"); P.set(img, 22, ground - 1, "ink4"); P.set(img, 25, ground - 1, "dirt2")
  P.selout(img)
end
K.build(P.spec("prop_pine_dead", 32, 64, {
  { tag = "prop_pine_dead_idle", ms = 100, frames = { { grid = deadPine } } },
}))
