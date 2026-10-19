-- Background actor: GATORGEDDON foreshadowing. The huge mech alligator lying half-submerged far across the swamp, facing LEFT.
-- 160x44, origin BOTTOM-CENTRE (row 43 = waterline). Long snout with a nose knob and interlocking steel teeth, brow plates
-- over two yellow eye lamps (the only bright pixels), dorsal ridge of spikes + two exhaust stacks, a back-mounted
-- missile pod, the tail tip curling out of the water at the right.
-- Tags: bg_gator_sil_dark 2 f @600 ms (near-black outline/ink1/sky1 shape, eye lamps on / dim),
--       bg_gator_sil_lit 1 f (lightning from above: ink4/ink3 rims on every top edge, ink1/ink2 plates visible).
-- Build: bash tools/build-art.sh art-src/backgrounds/actors/bg_gator_sil.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local W, HH = 160, 44

-- deterministic hash in [0,1)
local function H(x, y, s)
  local h = (math.floor(x) * 374761393 + math.floor(y) * 668265263 + math.floor(s or 0) * 1442695041) & 0xffffffff
  h = ((h ~ (h >> 13)) * 1274126177) & 0xffffffff
  h = h ~ (h >> 16)
  return h / 4294967296
end
-- pixel buffer of palette names (key y*W+x)
local function inb(x, y) return x >= 0 and y >= 0 and x < W and y < HH end
local function set(c, x, y, col) x, y = math.floor(x + 0.5), math.floor(y + 0.5); if inb(x, y) then c[y * W + x] = col end end
local function get(c, x, y) if not inb(x, y) then return nil end return c[y * W + x] end
local function del(c, x, y) if inb(x, y) then c[y * W + x] = nil end end
local function rect(c, x, y, w, h, col) for j = y, y + h - 1 do for i = x, x + w - 1 do set(c, i, j, col) end end end
local function ell(c, cx, cy, rx, ry, col)
  for j = math.floor(cy - ry - 1), math.ceil(cy + ry + 1) do for i = math.floor(cx - rx - 1), math.ceil(cx + rx + 1) do
    local dx, dy = (i - cx) / rx, (j - cy) / ry
    if dx * dx + dy * dy <= 1.0 then set(c, i, j, col) end
  end end
end
local function disc(c, cx, cy, r, col) ell(c, cx, cy, r + 0.3, r + 0.3, col) end
local function poly(c, pts, col)
  local minx, maxx, miny, maxy = 1e9, -1e9, 1e9, -1e9
  for _, p in ipairs(pts) do minx = math.min(minx, p[1]); maxx = math.max(maxx, p[1]); miny = math.min(miny, p[2]); maxy = math.max(maxy, p[2]) end
  for y = math.floor(miny), math.ceil(maxy) do for x = math.floor(minx), math.ceil(maxx) do
    local inside, j = false, #pts
    for i = 1, #pts do
      local xi, yi, xj, yj = pts[i][1], pts[i][2], pts[j][1], pts[j][2]
      if ((yi > y + 0.5) ~= (yj > y + 0.5)) and (x + 0.5 < (xj - xi) * (y + 0.5 - yi) / (yj - yi) + xi) then inside = not inside end
      j = i
    end
    if inside then set(c, x, y, col) end
  end end
end
local function line(c, x0, y0, x1, y1, col)
  x0, y0, x1, y1 = math.floor(x0 + 0.5), math.floor(y0 + 0.5), math.floor(x1 + 0.5), math.floor(y1 + 0.5)
  local dx, dy = math.abs(x1 - x0), -math.abs(y1 - y0)
  local sx, sy = x0 < x1 and 1 or -1, y0 < y1 and 1 or -1; local err = dx + dy
  while true do set(c, x0, y0, col); if x0 == x1 and y0 == y1 then break end
    local e2 = 2 * err; if e2 >= dy then err = err + dy; x0 = x0 + sx end; if e2 <= dx then err = err + dx; y0 = y0 + sy end end
end
local function thick(c, x0, y0, x1, y1, r, col)
  local n = math.max(1, math.ceil(math.max(math.abs(x1 - x0), math.abs(y1 - y0))))
  for i = 0, n do local t = i / n; if r <= 0 then set(c, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, col) else disc(c, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, r, col) end end
end
local function copy(c) local o = {}; for k, v in pairs(c) do o[k] = v end; return o end
local function flush(c) return function(img) for k, col in pairs(c) do img:drawPixel(k % W, k // W, K.color(col)) end end end
-- materials: 1 near mass, 2 seam/detail, 3 far mass, 4 teeth, 5 eye rim, 6 eye core, 7 lit-only seam (scute bricks)
local M = {}
local function m(x, y, v) set(M, x, y, v) end
local function mpoly(pts, v) poly(M, pts, v) end

-- top profile of the near body (lying low in the water), filled down to the waterline
local prof = { { 0, 39 }, { 2, 36 }, { 5, 34 }, { 7, 33 }, { 10, 33 }, { 12, 35 }, { 16, 35.5 }, { 32, 35 }, { 46, 34 },
  { 51, 33 }, { 55, 31 }, { 62, 30 }, { 70, 31 }, { 77, 32 }, { 86, 31 }, { 100, 30 }, { 116, 30 }, { 128, 31 },
  { 138, 34 }, { 145, 39 }, { 149, 43 } }
local function topAt(x)
  for i = 1, #prof - 1 do
    local a, b = prof[i], prof[i + 1]
    if x >= a[1] and x <= b[1] then local t = (x - a[1]) / (b[1] - a[1]); return a[2] + (b[2] - a[2]) * t end
  end
end
for x = 0, 149 do local t = topAt(x); if t then for y = math.floor(t + 0.5), 43 do m(x, y, 1) end end end

-- far side: a second row of dorsal spikes peeking over the back, far eye bump + far brow
for i = 0, 12 do
  local x = 72 + i * 5 + 2
  local t = topAt(x + 2)
  if t and not (x > 76 and x < 92) then mpoly({ { x, t + 1 }, { x + 2, t - 3 - (i % 2) }, { x + 4, t + 1 } }, 3) end
end
disc(M, 65, 28.5, 1.9, 3)
mpoly({ { 61, 27 }, { 65, 24.5 }, { 70, 25.5 }, { 69, 27.5 } }, 3)

-- near eye socket bump + angry brow plate sloping down toward the snout
disc(M, 58, 30, 2.3, 1)
mpoly({ { 51, 31 }, { 56, 26.5 }, { 63, 26 }, { 62, 28.5 }, { 55, 30 } }, 1)

-- near dorsal spikes: neck pair, then the back (stacks sit at 79..90)
local function spike(x, h, v)
  local t = topAt(x + 1.5); if not t then return end
  mpoly({ { x - 0.5, t + 1 }, { x + 1.5, t - h }, { x + 3.5, t + 1 } }, v or 1)
end
for _, s in ipairs({ { 69, 2 }, { 73, 3 }, { 92, 3 }, { 97, 4 }, { 118, 4 }, { 123, 3 }, { 128, 4 }, { 133, 3 }, { 138, 3 }, { 142, 2 } }) do spike(s[1], s[2]) end
-- two exhaust stacks with caps and dark bores
local function stack(x, h)
  local t = math.floor(topAt(x + 1) + 0.5)
  rect(M, x, t - h, 3, h + 1, 1); rect(M, x - 1, t - h - 1, 5, 2, 1)
  m(x, t - h - 1, 2); m(x + 1, t - h - 1, 2); m(x + 2, t - h - 1, 2)
  m(x + 1, t - h + 3, 7); m(x + 1, t - h + 4, 7)                              -- band clamp
end
stack(80, 10); stack(86, 8)
-- missile pod on a pylon, angled nose-up toward the left: 2x2 tubes with rounded warheads
rect(M, 105, 24, 4, 7, 1); rect(M, 103, 28, 8, 2, 1)
mpoly({ { 97, 17 }, { 117, 19.5 }, { 117, 25.5 }, { 98, 24 } }, 1)
disc(M, 96.5, 18.8, 1.3, 1); disc(M, 96.8, 22.2, 1.3, 1)
for x = 98, 116 do m(x, 20.6 + (x - 98) * 0.11, 2) end                         -- tube split
m(97, 18.5, 2); m(97, 22, 2)                                                   -- warhead seams
for y = 20, 25 do m(113, y, 7) end                                             -- pod frame
-- tail tip curling out of the water at the right, hooked over with a blade
local tail = { { 149, 43, 2.4 }, { 152, 40, 2.1 }, { 155, 36, 1.8 }, { 156, 32, 1.5 }, { 155, 29, 1.2 }, { 152, 27, 1.0 }, { 150, 28, 0.7 } }
for i = 1, #tail - 1 do
  local a, b = tail[i], tail[i + 1]
  for k = 0, 6 do local t = k / 6; disc(M, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, a[3] + (b[3] - a[3]) * t, 1) end
end
mpoly({ { 147, 31.5 }, { 149.5, 27 }, { 151, 29.5 } }, 1)                      -- blade
mpoly({ { 157, 37 }, { 159.5, 34.5 }, { 157.5, 33 } }, 1); mpoly({ { 158, 31 }, { 159.5, 28.5 }, { 157, 29 } }, 1)  -- fins
for x = 146, 152 do for y = 41, 43 do m(x, y, 1) end end

-- seams that read in both modes: jaw (croc grin rising to the eye), nostril vents
local function seam(x, y, v) local cur = get(M, x, y); if cur == 1 then m(x, y, v or 2) end end
local function jawY(x) if x < 34 then return 40.5 - x * 0.02 elseif x < 54 then return 39.8 - (x - 34) * 0.16 else return nil end end
for x = 1, 53 do seam(x, math.floor(jawY(x) + 0.5)) end
seam(7, 34); seam(9, 34)
-- lit-only scute bricks along the back and snout
for x = 14, 146 do
  local t = topAt(x)
  if t then
    local r1, r2 = math.floor(t + 3.5), math.floor(t + 7.5)
    if x >= 56 or r1 < (jawY(x) or 99) - 1 then seam(x, r1, 7) end
    if x >= 56 and r2 < 42 then seam(x, r2, 7) end
    local row = 0
    if (x % 6) == 0 then for y = math.floor(t + 1.5), r1 - 1 do seam(x, y, 7) end end
    if x >= 56 and ((x + 3) % 6) == 0 then for y = r1 + 1, math.min(r2 - 1, 41) do seam(x, y, 7) end end
  end
end
-- interlocking teeth along the jaw line
for x = 4, 48, 6 do
  local jy = math.floor(jawY(x) + 0.5)
  if get(M, x, jy + 1) then m(x, jy + 1, 4); m(x + 1, jy + 1, 4) end
  local jy2 = math.floor(jawY(x + 2) + 0.5)
  if get(M, x + 3, jy2 - 1) then m(x + 3, jy2 - 1, 4); m(x + 3, jy2 - 2, 4) end
end
-- eye lamps: near eye (56..58, 30) + under pixel, far eye (64..65, 28)
m(56, 30, 5); m(57, 30, 6); m(58, 30, 6); m(57, 31, 5)
m(64, 28, 5); m(65, 28, 6)

local function render(mode, eyes)
  return function(img)
    local c = {}
    for k, v in pairs(M) do
      local x, y = k % W, k // W
      local col
      local up = get(M, x, y - 1)
      local up2 = get(M, x, y - 2)
      local open = (up == nil) or (up == 3 and v ~= 3)
      if v == 5 then col = eyes and "fire4" or "fire2"
      elseif v == 6 then col = eyes and "fire5" or "fire3"
      elseif mode == "dark" then
        if v == 1 or v == 7 then col = "outline" elseif v == 2 then col = "ink1" elseif v == 3 then col = "sky1" elseif v == 4 then col = "ink2" end
        if (v == 1 or v == 7) and up == nil and (x + y) % 3 == 0 then col = "ink1" end   -- faint sheen on the top edge
      else
        if v == 1 then
          col = "ink1"
          if open then col = "ink4" elseif up2 == nil then col = "ink3" elseif up == 2 or up == 7 then col = "ink2" end
        elseif v == 2 or v == 7 then col = "outline"
        elseif v == 3 then col = (up == nil) and "ink3" or "ink2"
        elseif v == 4 then col = "steel4" end
      end
      set(c, x, y, col)
    end
    -- waterline ripples hugging the body + wake rings
    for x = 0, W - 1 do
      local inBody = get(M, x, 42) ~= nil
      if (not inBody) and (get(M, x - 1, 42) or get(M, x + 1, 42) or get(M, x - 2, 42) or get(M, x + 2, 42)) then
        set(c, x, 43, (mode == "lit") and "steel3" or "steel1")
      elseif inBody and (x % 5 < 3) then
        set(c, x, 43, (mode == "lit") and "ink3" or "steel1")
      end
    end
    flush(c)(img)
  end
end
K.build{
  name = "bg_gator_sil", w = W, h = HH,
  src = ROOT .. "/art-src/backgrounds/actors/bg_gator_sil.aseprite",
  sheet = ROOT .. "/public/assets/sprites/bg/bg_gator_sil.png",
  data = ROOT .. "/public/assets/sprites/bg/bg_gator_sil.json",
  anims = {
    { tag = "bg_gator_sil_dark", ms = 600, frames = { { grid = render("dark", true) }, { grid = render("dark", false) } } },
    { tag = "bg_gator_sil_lit", ms = 100, frames = { { grid = render("lit", true) } } },
  },
  anchor = "bottom-center",
}
