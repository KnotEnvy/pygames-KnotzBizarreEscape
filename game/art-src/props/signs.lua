-- Tutorial / warning signs (32x32): wooden post signs with painted icons and tiny letters,
-- and a regime steel DANGER plate.
-- Build: bash tools/build-art.sh art-src/props/signs.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local P = dofile(ROOT .. "/art-src/props/lib/pk.lua")(K)

local PAINT, PAINT_SH = "ink6", "ink4"

-- wooden board on a log post, snow on top and a drift at the foot
local function woodSign(img)
  -- post
  for y = 20, 30 do P.set(img, 14, y, "dirt3"); P.set(img, 15, y, "dirt4"); P.set(img, 16, y, "dirt3"); P.set(img, 17, y, "dirt2") end
  P.set(img, 16, 24, "dirt2"); P.set(img, 16, 25, "dirt1")
  -- board: three planks
  P.plankH(img, 2, 4, 28, 5, { seed = 1, knot = false })
  P.plankH(img, 2, 9, 28, 5, { seed = 2, knot = false })
  P.plankH(img, 2, 14, 28, 7, { seed = 3, knot = false })
  P.hline(img, 2, 29, 8, "dirt1"); P.hline(img, 2, 29, 13, "dirt1")
  P.vline(img, 2, 4, 20, "dirt4"); P.vline(img, 29, 4, 20, "dirt2")
  -- ragged plank ends
  P.clear(img, 2, 9); P.clear(img, 29, 14); P.clear(img, 29, 4)
  for _, p in ipairs({ { 3, 6 }, { 27, 6 }, { 3, 18 }, { 27, 18 } }) do P.nail(img, p[1], p[2]) end
  P.mound(img, 15, 31, 8, 2)
end
local function finish(img)
  P.snow(img, 2, 29, 4, 1, { seed = 8, lumpy = 0.6 })
  P.selout(img)
end
-- paint helper with chips (wear) and a darker lower half for the brush stroke variation
local function paintAt(img, x, y, rnd, c)
  if rnd() < 0.04 then P.set(img, x, y, "dirt2") return end
  P.set(img, x, y, c or PAINT)
end
local function paintText(img, s, y, rnd, c)
  local w = P.textWidth(s)
  local x0 = 16 - math.floor(w / 2 + 0.5)
  local wear = {}
  for _ = 1, 2 do wear[(x0 + rnd(0, w - 1)) .. "," .. (y + rnd(0, 4))] = true end
  P.text(img, s, x0, y, c or PAINT)
end

-- JUMP: up triangle
local function signJump(img)
  woodSign(img)
  local rnd = P.rng(11)
  for k = 0, 5 do for x = 15 - k, 16 + k do paintAt(img, x, 6 + k, rnd) end end
  P.set(img, 15, 6, "white"); P.set(img, 14, 7, "white")
  paintText(img, "JUMP", 15, rnd)
  finish(img)
end
-- BOMB: round bomb with fuse and painted spark
local function signBomb(img)
  woodSign(img)
  local rnd = P.rng(12)
  P.disc(img, 14, 9, 3, nil, function(x, y) paintAt(img, x, y, rnd) end)
  P.set(img, 12, 8, "white"); P.set(img, 13, 7, "white")
  P.fill(img, 16, 5, 2, 2, PAINT)                                        -- cap
  P.set(img, 18, 5, PAINT); P.set(img, 19, 4 + 1, PAINT)                 -- fuse
  P.set(img, 20, 4, "fire5"); P.set(img, 21, 5, "fire4"); P.set(img, 20, 6, "fire4"); P.set(img, 21, 3, "fire3"); P.set(img, 22, 5, "fire3")
  paintText(img, "BOMB", 15, rnd)
  finish(img)
end
-- FIRE: crosshair
local function signFire(img)
  woodSign(img)
  local rnd = P.rng(13)
  local cx, cy = 15, 9
  for a = 0, 359, 10 do
    local r = math.rad(a)
    P.set(img, math.floor(cx + math.cos(r) * 3 + 0.5), math.floor(cy + math.sin(r) * 3 + 0.5), PAINT)
  end
  for i = 1, 5 do
    if i ~= 2 then
      P.set(img, cx - i, cy, PAINT); P.set(img, cx + i, cy, PAINT); P.set(img, cx, cy - i, PAINT); P.set(img, cx, cy + i, PAINT)
    end
  end
  P.set(img, cx, cy, "red4")
  P.set(img, cx - 2, cy, "dirt3"); P.set(img, cx + 2, cy, "dirt3"); P.set(img, cx, cy - 2, "dirt3"); P.set(img, cx, cy + 2, "dirt3")
  paintText(img, "FIRE", 15, rnd)
  finish(img)
end
-- GO: arrow pointing right, nudging 1px
local function signArrow(off)
  return function(img)
    woodSign(img)
    local rnd = P.rng(14)
    for x = 7, 18 do for y = 8, 10 do P.set(img, x + off, y, PAINT) end end
    for k = 0, 4 do for y = 9 - k, 9 + k do if y >= 6 and y <= 12 then P.set(img, 23 - k + off, y, PAINT) end end end
    P.set(img, 7 + off, 8, "white"); P.set(img, 19 + off, 6, "white"); P.set(img, 11 + off, 10, "dirt2")
    P.set(img, 6 + off, 8, PAINT); P.set(img, 5 + off, 10, PAINT)       -- feathered tail
    paintText(img, "GO", 15, rnd, "fire4")
    finish(img)
  end
end

-- DANGER: regime steel plate (red) with a warning triangle on a steel pipe post
local function signDanger(img)
  -- pipe post
  for y = 20, 30 do P.set(img, 14, y, "steel4"); P.set(img, 15, y, "steel3"); P.set(img, 16, y, "steel2"); P.set(img, 17, y, "steel1") end
  P.hline(img, 13, 18, 23, "steel3"); P.set(img, 13, 23, "steel5"); P.set(img, 18, 23, "steel1")
  -- plate
  P.fill(img, 2, 3, 28, 18, "red3")
  P.hline(img, 2, 29, 3, "steel4"); P.hline(img, 2, 29, 20, "steel2"); P.vline(img, 2, 3, 20, "steel4"); P.vline(img, 29, 3, 20, "steel2")
  P.hline(img, 3, 28, 4, "red4"); P.vline(img, 3, 4, 19, "red4"); P.hline(img, 3, 28, 19, "red2"); P.vline(img, 28, 4, 19, "red2")
  P.set(img, 2, 3, "steel5")
  for _, p in ipairs({ { 4, 5 }, { 26, 5 }, { 4, 17 }, { 26, 17 } }) do P.rivet(img, p[1], p[2]) end
  -- warning triangle: yellow with dark keyline, black "!"
  for k = 0, 7 do
    for x = 15 - k, 16 + k do
      local edge = (x == 15 - k or x == 16 + k or k == 7)
      P.set(img, x, 5 + k, edge and "outline" or "fire4")
    end
  end
  for k = 1, 6 do P.set(img, 15 - k + 1, 5 + k, "fire5") end
  P.vline(img, 15, 7, 10, "outline"); P.vline(img, 16, 7, 10, "outline"); P.set(img, 15, 12, "outline"); P.set(img, 16, 12, "outline")
  P.set(img, 16, 7, "ink1")
  -- text
  local w = P.textWidth("DANGER")
  P.text(img, "DANGER", 16 - math.floor(w / 2 + 0.5) + 1, 14, "ink6", { shadow = "red1" })
  -- scratches / rust streak
  P.set(img, 24, 8, "red5"); P.set(img, 25, 9, "red5"); P.set(img, 7, 9, "red2"); P.set(img, 7, 10, "red2"); P.set(img, 28, 15, "dirt3")
  P.snow(img, 2, 29, 3, 1, { seed = 19, lumpy = 0.5 })
  P.mound(img, 15, 31, 7, 2)
  P.selout(img)
end

for _, s in ipairs({
  { "prop_sign_jump", signJump }, { "prop_sign_bomb", signBomb }, { "prop_sign_shoot", signFire }, { "prop_sign_danger", signDanger },
}) do
  K.build(P.spec(s[1], 32, 32, { { tag = s[1] .. "_idle", ms = 100, frames = { { grid = s[2] } } } }))
end
K.build(P.spec("prop_sign_arrow", 32, 32, {
  { tag = "prop_sign_arrow_idle", ms = 400, frames = { { grid = signArrow(0) }, { grid = signArrow(1) } } },
}))
