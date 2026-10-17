-- Mission 1 Part II "TIMBER EXPRESS" train props: bogie (wheel truck), coupling, boxcar door, DUCK! sign,
-- low bridge beam, train marker lamp. All anchored bottom-centre; tags are prop_<kind>_<anim>.
-- Build: bash tools/build-art.sh art-src/props/train.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local P = dofile(ROOT .. "/art-src/props/lib/pk.lua")(K)

-------------------------------------------------------------------------------
-- prop_bogie 48x24: two-wheel truck, wheels r=9 on the rail (wheel bottoms on the canvas bottom row).
-- spin: 4 frames, 6 spokes turn 15 deg per frame clockwise (train runs right), seamless loop.
-------------------------------------------------------------------------------
local function wheel(img, cx, cy, f)
  local base = f * math.pi / 12
  for j = -9, 9 do for i = -9, 9 do
    local d = math.sqrt(i * i + j * j)
    if d <= 9.3 then
      local c
      if d > 7.6 then
        c = (i + j < -2) and "steel4" or ((i + j > 3) and "steel2" or "steel3")      -- tyre
        if d > 8.6 and i + j < -6 then c = "steel5" end
      elseif d > 6.6 then c = "steel1"                                             -- rim inner edge
      elseif d <= 2.4 then c = (i + j < 0) and "steel4" or "steel3"                -- hub
      else
        c = "outline"
        local a = math.atan(j, i)
        for k = 0, 5 do
          local s = base + k * math.pi / 3
          local da = math.abs(((a - s + math.pi) % (2 * math.pi)) - math.pi)
          if da * d <= 1.0 then c = (k % 3 == 0) and "steel4" or "steel3" end
        end
        if c == "outline" and d > 5.6 then c = "ink1" end
      end
      P.set(img, cx + i, cy + j, c)
    end
  end end
  P.set(img, cx - 1, cy - 1, "steel5")
end
local function bogie(f)
  return function(img)
    wheel(img, 12, 14, f); wheel(img, 36, 14, f)
    -- bolster (rises into the car underframe)
    P.box(img, 17, 0, 15, 5, "steel", 2)
    P.hline(img, 17, 31, 0, "steel3")
    -- top member of the side frame
    P.fill(img, 7, 5, 35, 3, "steel2"); P.hline(img, 7, 41, 5, "steel3"); P.hline(img, 8, 40, 7, "steel1")
    -- tension member: axle boxes down to a flat belly
    P.line(img, 14, 15, 19, 18, "steel2"); P.line(img, 14, 16, 19, 19, "steel1")
    P.line(img, 34, 15, 29, 18, "steel2"); P.line(img, 34, 16, 29, 19, "steel1")
    P.hline(img, 19, 29, 18, "steel3"); P.hline(img, 19, 29, 19, "steel1")
    -- columns
    for _, x in ipairs({ 18, 29 }) do P.vline(img, x, 8, 18, "steel3"); P.vline(img, x + 1, 8, 18, "steel1") end
    -- leaf springs between the columns
    for y = 9, 16 do
      local c = (y % 2 == 0) and "steel4" or "steel1"
      if y == 9 then c = "steel3" end
      P.hline(img, 20, 28, y, c)
    end
    P.vline(img, 24, 9, 16, "steel2")
    -- axle boxes over the hubs
    for _, x in ipairs({ 12, 36 }) do
      P.box(img, x - 3, 10, 7, 6, "steel", 3)
      P.hline(img, x - 3, x + 3, 12, "steel1")                             -- lid seam
      P.set(img, x - 2, 11, "steel5")
      P.vline(img, x, 8, 9, "steel2")
    end
    -- brake beam hint between wheels at hub height
    P.set(img, 22, 17, "red3"); P.set(img, 26, 17, "red3")
    -- snow on the top member
    for _, x in ipairs({ 9, 10, 13, 14, 15, 33, 34, 37, 38 }) do P.set(img, x, 5, "ink6") end
    P.set(img, 18, 0, "white"); P.set(img, 19, 0, "ink6"); P.set(img, 27, 0, "ink6")
    P.selout(img)
    -- keep the wheel bottoms on the bottom row (selout never writes outside the canvas)
  end
end
K.build(P.spec("prop_bogie", 48, 24, {
  { tag = "prop_bogie_spin", ms = 45, frames = { { grid = bogie(0) }, { grid = bogie(1) }, { grid = bogie(2) }, { grid = bogie(3) } } },
}))

-------------------------------------------------------------------------------
-- prop_coupling 48x16: bridges a 3-tile gap between two car decks; canvas bottom = deck bottom (y 320).
-- The shanks leave the canvas edges on rows 9-11 (the deck end tiles' coupler pockets). Air hoses sag below.
-------------------------------------------------------------------------------
local function coupling(f)
  local bob = ({ 0, 0, 1, 0 })[f + 1]
  local sway = ({ 0, 1, 0, -1 })[f + 1]
  return function(img)
    -- air hoses: two rubber hoses sagging from the car ends to the gladhands in the middle
    local function hose(x0, x1, y0, y1, sag)
      local n = math.abs(x1 - x0)
      for k = 0, n do
        local t = k / n
        local x = x0 + (x1 > x0 and k or -k)
        local y = math.floor(y0 + (y1 - y0) * t + sag * 4 * t * (1 - t) + 0.5)
        P.set(img, x, y, "ink2"); P.set(img, x, y + 1, "ink1")
      end
    end
    hose(2, 22 + sway, 12, 13 + bob, 3)
    hose(45, 25 + sway, 12, 13 + bob, 3)
    -- gladhands (hose couplers) + angle cocks
    P.fill(img, 22 + sway, 13 + bob, 4, 2, "steel3"); P.set(img, 22 + sway, 13 + bob, "steel5"); P.set(img, 25 + sway, 14 + bob, "steel1")
    P.set(img, 3, 11, "red4"); P.set(img, 44, 11, "red3")
    -- shanks (fixed at the pockets, the middle bobs)
    for x = 0, 47 do
      local o = (x >= 7 and x <= 40) and bob or 0
      P.set(img, x, 9 + o, "steel4"); P.set(img, x, 10 + o, "steel3"); P.set(img, x, 11 + o, "steel1")
    end
    P.set(img, 0, 9, "steel5")
    -- knuckle heads, interlocked
    local y0 = 6 + bob
    P.box(img, 16, y0, 9, 9, "steel", 3)
    P.box(img, 24, y0 + 1, 9, 8, "steel", 2)
    P.vline(img, 24, y0 + 1, y0 + 7, "outline")
    P.set(img, 24, y0 + 3, "steel3"); P.set(img, 23, y0 + 4, "outline")
    P.set(img, 17, y0 + 1, "steel5"); P.set(img, 18, y0 + 1, "steel5")
    P.rivet(img, 19, y0 + 3); P.rivet(img, 28, y0 + 4)
    -- uncoupling lever pin
    P.vline(img, 20, y0 - 2, y0 - 1, "steel3"); P.set(img, 20, y0 - 3, "red4")
    P.set(img, 17, y0, "ink6"); P.set(img, 18, y0, "white"); P.set(img, 26, y0 + 1, "ink6")
    P.selout(img)
  end
end
K.build(P.spec("prop_coupling", 48, 16, {
  { tag = "prop_coupling_idle", ms = 90, frames = { { grid = coupling(0) }, { grid = coupling(1) }, { grid = coupling(2) }, { grid = coupling(3) } } },
}))

-------------------------------------------------------------------------------
-- prop_boxcar_door 32x40: sliding door on the boxcar wall (bottom on the deck, y 304). Opening x 3..28, y 4..38.
-- open: 6 frames slide right behind the door stop post, revealing the dark interior; hold the last frame.
-------------------------------------------------------------------------------
local function boxDoor(s)
  return function(img)
    -- interior
    for y = 4, 38 do for x = 3, 28 do P.set(img, x, y, (y > 35) and "ink1" or "outline") end end
    P.hline(img, 3, 28, 36, "ink2")
    -- crates in the dark
    P.fill(img, 5, 27, 8, 9, "ink1"); P.hline(img, 5, 12, 27, "ink2"); P.vline(img, 5, 27, 35, "ink2")
    P.line(img, 6, 28, 11, 34, "outline")
    P.fill(img, 13, 31, 6, 5, "ink1"); P.hline(img, 13, 18, 31, "ink2")
    P.set(img, 22, 9, "sand2"); P.set(img, 22, 8, "ink2"); P.vline(img, 22, 4, 7, "ink1")      -- dead bulb
    -- door panel (local u 0..25, v 0..34), shifted right by s, clipped to the opening
    for y = 4, 38 do
      local v = y - 4
      for x = 3, 28 do
        local u = x - 3 - s
        if u >= 0 and u <= 25 then
          local k = u % 4
          local c = (k == 0) and "red2" or ((k == 1) and "red4" or "red3")
          if k >= 2 and ((u * 7 + v * 3) % 23 == 0) then c = "red2" end
          if v == 34 then c = "steel1" elseif v == 33 then c = "steel2" end
          if v == 0 then c = "steel4" elseif v == 1 then c = "steel3" end
          if u == 0 then c = "steel4" elseif u == 1 then c = "steel3" elseif u == 25 then c = "steel1" elseif u == 24 then c = "steel2" end
          if (v == 11 or v == 23) and u > 1 and u < 24 then c = "steel3" end
          if (v == 12 or v == 24) and u > 1 and u < 24 then c = "steel1" end
          if v >= 26 and v <= 31 and k >= 2 and ((u + v) % 9 == 0) then c = "dirt2" end
          P.set(img, x, y, c)
        end
      end
    end
    local function du(u, v, c) local x = 3 + s + u; if x >= 3 and x <= 28 then P.set(img, x, 4 + v, c) end end
    for _, u in ipairs({ 4, 12, 20 }) do du(u, 11, "steel5"); du(u, 23, "steel5") end
    -- handle + latch on the leading (left) edge
    for v = 15, 21 do du(3, v, "steel5"); du(4, v, "steel2") end
    du(3, 14, "steel3"); du(3, 22, "steel3"); du(5, 18, "outline")
    du(2, 17, "sand4"); du(2, 18, "red4")                                   -- seal tag
    -- frame: top track, side posts, bottom guide
    P.box(img, 0, 0, 32, 4, "steel", 3)
    P.hline(img, 0, 31, 3, "steel1")
    for _, u in ipairs({ 4, 19 }) do                                        -- rollers hanging on the track
      local x = 3 + s + u
      if x <= 27 then P.set(img, x, 2, "steel5"); P.set(img, x + 1, 2, "steel4"); P.set(img, x, 3, "steel2"); P.set(img, x + 1, 3, "steel2") end
    end
    P.fill(img, 0, 4, 3, 36, "steel3"); P.vline(img, 0, 4, 39, "steel4"); P.vline(img, 2, 4, 39, "steel1")
    P.fill(img, 29, 4, 3, 36, "steel3"); P.vline(img, 29, 4, 39, "steel4"); P.vline(img, 31, 4, 39, "steel1")
    P.hline(img, 0, 31, 39, "steel1"); P.hline(img, 3, 28, 38, "steel2")
    for _, y in ipairs({ 8, 20, 32 }) do P.rivet(img, 1, y); P.rivet(img, 30, y) end
    P.set(img, 0, 0, "steel5")
    -- rust drip from the track
    P.set(img, 7, 4, s < 4 and "dirt3" or "dirt3"); P.set(img, 26, 3, "dirt3")
  end
end
K.build(P.spec("prop_boxcar_door", 32, 40, {
  { tag = "prop_boxcar_door_closed", ms = 100, frames = { { grid = boxDoor(0) } } },
  { tag = "prop_boxcar_door_open", ms = 60, frames = { { grid = boxDoor(3) }, { grid = boxDoor(7) }, { grid = boxDoor(12) },
    { grid = boxDoor(17) }, { grid = boxDoor(22) }, { grid = boxDoor(26) } } },
}))

-------------------------------------------------------------------------------
-- prop_sign_duck 32x144: trackside warning sign. Yellow board (top ~26 px) reading DUCK! with a down arrow,
-- on a thin wooden post down to the trackside ground (canvas bottom = y 352).
-------------------------------------------------------------------------------
local BIG = {
  D = { "xxxx.", "xx.xx", "xx.xx", "xx.xx", "xxxx." },
  U = { "xx.xx", "xx.xx", "xx.xx", "xx.xx", ".xxx." },
  C = { ".xxxx", "xx...", "xx...", "xx...", ".xxxx" },
  K = { "xx.xx", "xx.x.", "xxx..", "xx.x.", "xx.xx" },
  ["!"] = { "xx", "xx", "xx", "..", "xx" },
}
local function signDuck(img)
  -- post
  for y = 24, 143 do
    P.set(img, 15, y, "dirt4"); P.set(img, 16, y, "dirt3"); P.set(img, 17, y, "dirt2")
    if (y * 7) % 11 == 0 then P.set(img, 16, y, "dirt2") end
  end
  P.hline(img, 15, 17, 60, "dirt1"); P.hline(img, 15, 17, 98, "dirt1")
  -- bracket under the board
  P.fill(img, 12, 24, 8, 2, "steel3"); P.hline(img, 12, 19, 24, "steel4"); P.set(img, 13, 25, "steel5"); P.set(img, 18, 25, "steel5")
  -- board
  P.fill(img, 1, 3, 30, 21, "fire4")
  P.hline(img, 1, 30, 3, "fire5"); P.vline(img, 1, 3, 23, "fire5")
  P.hline(img, 1, 30, 23, "fire3"); P.vline(img, 30, 3, 23, "fire3")
  P.hline(img, 2, 29, 4, "fire5")
  P.hline(img, 0, 31, 2, "outline"); P.hline(img, 0, 31, 24, "outline"); P.vline(img, 0, 2, 24, "outline"); P.vline(img, 31, 2, 24, "outline")
  -- inner keyline
  P.hline(img, 4, 27, 6, "fire3"); P.hline(img, 4, 27, 21, "fire3")
  -- text DUCK!
  local s, x = "DUCK!", 3
  for i = 1, #s do
    local g = BIG[s:sub(i, i)]
    for j, row in ipairs(g) do for k = 1, #row do
      if row:sub(k, k) == "x" then P.set(img, x + k - 1, 8 + j - 1, "outline") end
    end end
    x = x + #g[1] + 1
  end
  -- down arrow
  for k = 0, 5 do for xx = 10 + k, 21 - k do P.set(img, xx, 14 + k, "outline") end end
  -- bolts, scuffs
  for _, p in ipairs({ { 2, 4 }, { 29, 4 }, { 2, 22 }, { 29, 22 } }) do P.set(img, p[1], p[2], "steel4") end
  P.set(img, 6, 19, "fire3"); P.set(img, 24, 5, "fire3"); P.set(img, 26, 18, "dirt3")
  P.snow(img, 0, 31, 2, 1, { seed = 41, lumpy = 0.5, drips = false })
  P.mound(img, 16, 143, 7, 3)
  P.selout(img)
end
K.build(P.spec("prop_sign_duck", 32, 144, { { tag = "prop_sign_duck_idle", ms = 100, frames = { { grid = signDuck } } } }))

-------------------------------------------------------------------------------
-- prop_low_bridge 64x128: overhead girder that sweeps across just above the cars. The bottom 14 px (y 114..127)
-- is the dangerous riveted I-beam with a hazard-striped lower flange; truss lattice above to the top edge.
-------------------------------------------------------------------------------
local function lowBridge(img)
  -- lattice: X-bracing between the chords, panel by panel
  local panels = { { 8, 36 }, { 36, 64 }, { 64, 92 }, { 92, 113 } }
  for _, pn in ipairs(panels) do
    P.line(img, 8, pn[1], 55, pn[2], nil, function(x, y) P.set(img, x, y, "steel3"); P.set(img, x, y + 1, "steel2") end)
    P.line(img, 55, pn[1], 8, pn[2], nil, function(x, y) P.set(img, x, y, "steel3"); P.set(img, x, y + 1, "steel2") end)
  end
  -- struts
  for _, y in ipairs({ 36, 64, 92 }) do
    P.fill(img, 7, y - 1, 50, 3, "steel3"); P.hline(img, 7, 56, y - 1, "steel4"); P.hline(img, 7, 56, y + 1, "steel2")
    for x = 9, 54, 3 do if (x * 5 + y) % 4 == 0 then P.set(img, x, y - 2, "ink6") end end
  end
  -- gusset plates at the crossings
  for _, pn in ipairs(panels) do
    local cy = math.floor((pn[1] + pn[2]) / 2)
    P.box(img, 29, cy - 2, 6, 5, "steel", 3); P.rivet(img, 30, cy - 1); P.rivet(img, 32, cy + 1)
  end
  -- vertical chords
  for _, x0 in ipairs({ 1, 57 }) do
    P.fill(img, x0, 0, 6, 114, "steel3")
    P.vline(img, x0, 0, 113, "steel4"); P.vline(img, x0 + 1, 0, 113, "steel4")
    P.vline(img, x0 + 4, 0, 113, "steel2"); P.vline(img, x0 + 5, 0, 113, "steel1")
    for y = 6, 110, 8 do P.rivet(img, x0 + 2, y) end
  end
  -- top chord with snow
  P.fill(img, 0, 3, 64, 6, "steel3"); P.hline(img, 0, 63, 3, "steel4"); P.hline(img, 0, 63, 8, "steel1"); P.hline(img, 0, 63, 7, "steel2")
  for x = 3, 61, 6 do P.rivet(img, x, 5) end
  P.snow(img, 1, 62, 3, 2, { seed = 77, lumpy = 0.6 })
  for _, x in ipairs({ 12, 13, 30, 47 }) do P.set(img, x, 9, "sky5"); if x ~= 13 then P.set(img, x, 10, "sky4") end end
  -- the I-beam: top flange 114..116, web 117..121, bottom flange 122..127 (hazard)
  P.fill(img, 0, 114, 64, 3, "steel3"); P.hline(img, 0, 63, 114, "steel5"); P.hline(img, 0, 63, 116, "steel2")
  P.fill(img, 0, 117, 64, 5, "steel2"); P.hline(img, 0, 63, 117, "steel1")
  for x = 2, 62, 8 do
    P.vline(img, x, 117, 121, "steel4"); P.vline(img, x + 1, 117, 121, "steel3"); P.vline(img, x + 2, 118, 121, "steel1")
    P.rivet(img, x + 5, 119)
  end
  for x = 4, 62, 5 do P.rivet(img, x, 115) end
  P.hline(img, 0, 63, 122, "outline")
  P.hazard(img, 0, 123, 64, 4, { p = 8, a = "fire4", b = "outline", a_hi = "fire5", a_lo = "fire3" })
  P.hline(img, 0, 63, 127, "outline")
  for x = 0, 63 do P.set(img, x, 113, (x % 5 == 2) and "white" or "ink6") end   -- snow on the beam top
  P.selout(img)
end
K.build(P.spec("prop_low_bridge", 64, 128, { { tag = "prop_low_bridge_idle", ms = 100, frames = { { grid = lowBridge } } } }))

-------------------------------------------------------------------------------
-- prop_train_lamp 16x16: red marker lantern on a bracket (end of train), 3-frame flicker loop.
-------------------------------------------------------------------------------
local function lamp(f)
  return function(img)
    -- bracket
    P.vline(img, 7, 12, 15, "steel3"); P.vline(img, 8, 12, 15, "steel1"); P.hline(img, 5, 10, 15, "steel2"); P.set(img, 5, 15, "steel4")
    -- housing
    P.box(img, 3, 3, 10, 9, "steel", 2)
    P.fill(img, 5, 1, 6, 2, "steel3"); P.hline(img, 5, 10, 1, "steel4")
    P.set(img, 7, 0, "steel4"); P.set(img, 8, 0, "steel3")                           -- handle
    P.hline(img, 3, 12, 11, "steel1")
    -- lens
    local ring, mid, core = ({ "red4", "red3", "red4" })[f + 1], ({ "red5", "red4", "red5" })[f + 1], ({ "fire5", "red5", "fire6" })[f + 1]
    P.disc(img, 8, 7, 3, ring)
    P.disc(img, 8, 7, 2, mid)
    P.fill(img, 7, 6, 2, 2, core)
    if f ~= 1 then P.set(img, 6, 5, "fire6") end
    P.set(img, 10, 9, "red2"); P.set(img, 11, 8, "red2")
    -- snow on the cap
    P.set(img, 5, 0, "ink6"); P.set(img, 6, 0, "white"); P.set(img, 9, 0, "ink6")
    P.selout(img)
  end
end
K.build(P.spec("prop_train_lamp", 16, 16, {
  { tag = "prop_train_lamp_idle", ms = { 220, 90, 160 }, frames = { { grid = lamp(0) }, { grid = lamp(1) }, { grid = lamp(2) } } },
}))
