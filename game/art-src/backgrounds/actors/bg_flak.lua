-- bg_flak 16x16: distant flak / artillery burst. Centre anchor (8,8).
-- Tag bg_flak_pop, 6 frames @60 ms: tiny flash, bigger flash + fire4 ring, then dark smoke puff expanding/thinning.
-- Build: bash tools/build-art.sh art-src/backgrounds/actors/bg_flak.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local C = 8

local function H(x, y, s)
  local h = (math.floor(x) * 374761393 + math.floor(y) * 668265263 + math.floor(s or 0) * 1442695041) & 0xffffffff
  h = ((h ~ (h >> 13)) * 1274126177) & 0xffffffff
  h = h ~ (h >> 16)
  return h / 4294967296
end

local function f1(img, K)
  K.px(img, C, C, "fire6"); K.px(img, C - 1, C, "fire5"); K.px(img, C + 1, C, "fire5")
  K.px(img, C, C - 1, "fire5"); K.px(img, C, C + 1, "fire5")
end
local function f2(img, K)
  for y = -3, 3 do for x = -3, 3 do
    local d = math.sqrt(x * x + y * y)
    if d <= 1.3 then K.px(img, C + x, C + y, "fire6")
    elseif d <= 2.2 then K.px(img, C + x, C + y, "fire5")
    elseif d <= 3.3 and H(x, y, 2) < 0.75 then K.px(img, C + x, C + y, "fire4") end
  end end
  -- a couple of shrapnel flecks
  K.px(img, C - 5, C - 2, "fire4"); K.px(img, C + 5, C + 1, "fire4"); K.px(img, C + 1, C - 5, "fire5")
end
-- smoke: cauliflower of sub-discs, each lit top-left (ink3) / shaded lower-right (ink2); density falls with age
local BLOBS = { { 0, 0, 1.0 }, { -2, -1, 0.75 }, { 2, -1, 0.7 }, { 0, -2, 0.7 }, { 1, 2, 0.6 }, { -2, 2, 0.55 } }
local function smoke(r, dens, ember, seed, rise)
  return function(img, K)
    local cy = C - rise
    for y = -7, 7 do for x = -7, 7 do
      local best, bx, by = nil, 0, 0
      for _, b in ipairs(BLOBS) do
        local ox, oy, rr = b[1] * r / 4, b[2] * r / 4, b[3] * r
        local dx, dy = x - ox, y - oy
        local q = (dx * dx + dy * dy) / (rr * rr)
        if q <= 1 and (not best or q < best) then best, bx, by = q, dx / rr, dy / rr end
      end
      local px, py = C + x, cy + y
      if best and px >= 0 and px < 16 and py >= 0 and py < 16 then
        local p = dens * (1.25 - 0.6 * best)
        local BY = { { 0, 8, 2, 10 }, { 12, 4, 14, 6 }, { 3, 11, 1, 9 }, { 15, 7, 13, 5 } }
        local bay = (BY[(y + 16) % 4 + 1][(x + 16) % 4 + 1] + 0.5) / 16
        if p > 0.7 * bay + 0.3 * H(x, y, seed + 1) then
          local c = (bx + by < -0.55) and "ink3" or "ink2"
          local d = math.sqrt(x * x + y * y)
          if ember > 0 and d < ember then c = (d < ember * 0.5) and "fire4" or "fire2" end
          K.px(img, px, py, c)
        end
      end
    end end
  end
end

K.build{
  name = "bg_flak", w = 16, h = 16,
  src   = ROOT .. "/art-src/backgrounds/actors/bg_flak.aseprite",
  sheet = ROOT .. "/public/assets/sprites/bg/bg_flak.png",
  data  = ROOT .. "/public/assets/sprites/bg/bg_flak.json",
  anims = { { tag = "bg_flak_pop", ms = 60, frames = {
    { grid = f1 }, { grid = f2 },
    { grid = smoke(3.2, 1.0, 1.6, 3, 0) },
    { grid = smoke(4.4, 0.9, 0, 5, 0) },
    { grid = smoke(5.4, 0.55, 0, 7, 1) },
    { grid = smoke(6.2, 0.22, 0, 9, 2) },
  } } },
  anchor = "center",
}
