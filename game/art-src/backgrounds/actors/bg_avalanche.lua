-- bg_avalanche 96x64: far avalanche pouring down a diagonal slope from upper-RIGHT to lower-LEFT.
-- No mountain drawn (transparent; overlays a mountain layer). Bottom-centre anchor.
-- Tag bg_avalanche_slide, 10 frames @90 ms: mass + billowing powder front grow over frames 1-7, then the cloud
-- spreads and thins (8-10). White/ink6 lit top-left, ink5/ink4 lower-right, sparse dither, no outlines.
-- Build: bash tools/build-art.sh art-src/backgrounds/actors/bg_avalanche.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local W, HH = 96, 64

local function H(x, y, s)
  local h = (math.floor(x) * 374761393 + math.floor(y) * 668265263 + math.floor(s or 0) * 1442695041) & 0xffffffff
  h = ((h ~ (h >> 13)) * 1274126177) & 0xffffffff
  h = h ~ (h >> 16)
  return h / 4294967296
end
local BY = { { 0, 8, 2, 10 }, { 12, 4, 14, 6 }, { 3, 11, 1, 9 }, { 15, 7, 13, 5 } }
local function bay(x, y) return (BY[y % 4 + 1][x % 4 + 1] + 0.5) / 16 end

-- slope: P(s) from top-right (s=0) to bottom-left (s=1)
local X0, Y0, X1, Y1 = 95, 3, 2, 62
local LEN = math.sqrt((X1 - X0) ^ 2 + (Y1 - Y0) ^ 2)
local DX, DY = (X1 - X0) / LEN, (Y1 - Y0) / LEN   -- downhill
local NX, NY = DY, -DX                              -- outward normal (up-left)
if NY > 0 then NX, NY = -NX, -NY end
local function P(s) return X0 + (X1 - X0) * s, Y0 + (Y1 - Y0) * s end

local function front(t) if t <= 7 then return 0.12 + 0.125 * (t - 1) else return 0.87 + 0.01 * (t - 7) end end

local function puffs(t)
  local list = {}
  local sf = front(t)
  local late = math.max(0, t - 7)
  for i = 1, 12 do
    local si = 0.07 * i
    if si <= sf - 0.03 then
      local ti = (si - 0.12) / 0.125 + 1
      local a = t - ti
      local r = math.min(9, 2.5 + 1.5 * a) + late * 0.8
      local d = math.max(0, 1.0 - 0.1 * a) * (1 - 0.2 * late)
      local px, py = P(si)
      list[#list + 1] = { px + NX * r * 0.7 - 0.25 * a, py + NY * r * 0.7 - 0.35 * a, r, d, i }
    end
  end
  -- billowing head at the front
  local hr = 5 + 3.5 * math.min(1, sf / 0.87) + late * 1.8
  local hx, hy = P(sf - 0.03)
  list[#list + 1] = { hx + NX * hr * 0.65 + late * 0.4, hy + NY * hr * 0.65 - late * 1.0, hr, 1.0 - 0.2 * late, 99 }
  -- secondary lobe just ahead/down of the head
  if sf > 0.3 then
    local lx, ly = P(sf)
    local lr = hr * 0.6
    list[#list + 1] = { lx + NX * lr * 0.5 - late * 0.6, ly + NY * lr * 0.5 - late * 0.4, lr, 0.95 - 0.22 * late, 98 }
  end
  return list
end

local function frame(t)
  return function(img, K)
    local sf = front(t)
    local late = math.max(0, t - 7)
    local pl = puffs(t)
    for y = 0, HH - 1 do for x = 0, W - 1 do
      local rx, ry = x - X0, y - Y0
      local s = (rx * DX + ry * DY) / LEN
      local hgt = rx * NX + ry * NY
      local c = nil
      -- sliding mass on the slope surface
      if s > 0.0 and s < sf and hgt >= -0.5 then
        local q = s / sf
        local th = 2 + 6 * q ^ 1.3 + 1.5 * H(math.floor(s * 40), 1, 7 + t)
        if hgt < th then
          local dens = 1.0 - 0.22 * late - (q < 0.25 and 0.25 or 0)
          if dens > 0.6 * bay(x, y) + 0.4 * H(x, y, 3 + t) then
            if hgt > th - 1.5 then c = (H(x, y, 9) < 0.7) and "white" or "ink6"
            elseif hgt < 1.2 then c = (H(x, y, 4 + t) < 0.5) and "ink4" or "ink5"
            elseif H(x // 2, y, 5 + t) < 0.3 then c = "ink5"
            else c = "ink6" end
          end
        end
      end
      -- powder cloud (drawn over the mass)
      local best, bv = 0, 0
      for _, p in ipairs(pl) do
        local vx, vy = x - p[1], y - p[2]
        local ang = math.atan(vy, vx)
        local rr = p[3] * (1 + 0.14 * math.sin(ang * 5 + p[5]) + 0.08 * math.sin(ang * 9 + p[5] * 2))
        local d2 = (vx * vx + vy * vy) / (rr * rr)
        if d2 <= 1 then
          local f = p[4] * (1.2 - 0.55 * d2)
          if f > best then best, bv = f, (vx + vy) / rr end
        end
      end
      if best > 0 and best > 0.6 * bay(x, y) + 0.4 * H(x, y, 21 + t) then
        if bv < -0.55 then c = "white"
        elseif bv > 0.75 then c = "ink4"
        elseif bv > 0.25 then c = "ink5"
        else c = "ink6" end
      end
      if c then K.px(img, x, y, c) end
    end end
  end
end

local frames = {}
for t = 1, 10 do frames[t] = { grid = frame(t) } end
K.build{
  name = "bg_avalanche", w = W, h = HH,
  src   = ROOT .. "/art-src/backgrounds/actors/bg_avalanche.aseprite",
  sheet = ROOT .. "/public/assets/sprites/bg/bg_avalanche.png",
  data  = ROOT .. "/public/assets/sprites/bg/bg_avalanche.json",
  anims = { { tag = "bg_avalanche_slide", ms = 90, frames = frames } },
  anchor = "bottom-center",
}
