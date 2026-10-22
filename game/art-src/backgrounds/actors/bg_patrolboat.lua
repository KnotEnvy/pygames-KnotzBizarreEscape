-- Background actor: Regime patrol gunboat cruising RIGHT. 64x22, origin BOTTOM-CENTRE (row 21 = waterline).
-- Low hull with a raked bow, deck gun + shield forward, cabin with one lit window, exhaust stack, stern rail + pennant,
-- mast with a searchlight drum. LAMP PIXEL (beam origin) = (LAMP_X, LAMP_Y + bob): (34,2) on frames 1 and 4, (34,3) on 2-3.
-- Tag bg_patrolboat_idle 4 f @140 ms: 1 px bob, bow wake spray, exhaust puffs drift back.
-- Build: bash tools/build-art.sh art-src/backgrounds/actors/bg_patrolboat.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local W, HH = 64, 22

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
local LAMP_X, LAMP_Y = 34, 2
local BOB = { 0, 1, 1, 0 }
local function frame(f)
  return function(img)
    local c = {}
    local b = BOB[f]
    -- exhaust puffs (behind everything): drift up/left; 3 puffs at staggered ages
    for i = 0, 2 do
      local age = ((f - 1) + i * 4 / 3) % 4          -- 0..4, loops seamlessly
      local px, py = 20 - age * 2.6, 7.5 - age * 0.9
      local r = 0.7 + age * 0.22
      ell(c, px, py + b, r + 0.5, r, (age < 2.2) and "ink2" or "ink1")
    end
    -- hull: sheer line row 15 at the stern rising to 13 at the bow, bottom clipped at row 20
    for x = 3, 61 do
      local top = 15
      if x > 44 then top = 15 - math.floor((x - 44) / 8.5 + 0.5) end
      local bot = 20
      if x > 55 then bot = 20 - math.floor((x - 55) * 1.25) end         -- raked bow
      if x <= 4 then top = top + 1 end
      for y = top + b, math.min(bot + b, 20) do
        local col
        if y == top + b then col = "steel3"
        elseif y == top + b + 1 then col = "steel2"
        elseif y >= 19 then col = "ink1"
        else col = "steel1" end
        set(c, x, y, col)
      end
    end
    -- boot-top stripe + portholes + rust
    for x = 6, 54 do set(c, x, 19, (x % 9 == 4) and "steel1" or "red1") end
    for _, px in ipairs({ 14, 19, 42, 47 }) do set(c, px, 17 + b, "ink1") end
    for _, px in ipairs({ 9, 27, 51 }) do set(c, px, 18 + b, "dirt2") end
    -- stern rail + pennant pole
    for x = 4, 21 do if x % 3 == 1 then set(c, x, 14 + b, "ink2") end; set(c, x, 13 + b, "ink2") end
    for y = 7, 13 do set(c, 5, y + b, "ink2") end
    local fl = (f % 2 == 0) and { { 3, 7 }, { 4, 7 }, { 2, 8 }, { 4, 8 } } or { { 4, 7 }, { 3, 7 }, { 2, 7 }, { 3, 8 } }
    for _, p in ipairs(fl) do set(c, p[1], p[2] + b, "red2") end
    -- exhaust stack
    for y = 9, 14 do set(c, 21, y + b, "ink1"); set(c, 22, y + b, "steel1") end
    set(c, 21, 9 + b, "steel2"); set(c, 22, 9 + b, "steel3")
    -- cabin (x 24..38, rows 8..14) with a sloped wheelhouse front
    for x = 24, 39 do
      local top = 9
      if x >= 37 then top = 9 + (x - 36) end
      for y = top, 14 do
        local col = (y == top) and "steel3" or ((x == 24) and "steel1" or "steel2")
        if y == 14 then col = "steel1" end
        set(c, x, y + b, col)
      end
    end
    for x = 25, 36 do set(c, x, 8 + b, (x < 30) and "steel3" or "steel2") end           -- roof cap
    -- windows: two dark, one lit (fire3/fire4)
    set(c, 27, 11 + b, "ink1"); set(c, 28, 11 + b, "ink1")
    set(c, 33, 11 + b, "fire3"); set(c, 34, 11 + b, "fire4"); set(c, 35, 11 + b, "fire3")
    set(c, 33, 12 + b, "fire2"); set(c, 34, 12 + b, "fire3"); set(c, 35, 12 + b, "fire2")
    set(c, 30, 11 + b, "ink1"); set(c, 30, 12 + b, "ink1")                               -- door
    -- mast + yard + whip antenna
    for y = 3, 8 do set(c, 31, y + b, "steel2") end
    for x = 29, 33 do set(c, x, 5 + b, "ink2") end
    set(c, 30, 0 + b, "ink2"); set(c, 30, 1 + b, "ink2"); set(c, 29, 2 + b, "ink2")
    -- searchlight drum on the masthead, lens facing forward-right
    rect(c, 31, 1 + b, 3, 3, "steel2"); set(c, 31, 1 + b, "steel3"); set(c, 32, 1 + b, "steel3")
    set(c, 31, 3 + b, "steel1"); set(c, 32, 3 + b, "steel1"); set(c, 33, 3 + b, "steel1")
    set(c, 33, 1 + b, "fire4"); set(c, 33, 3 + b, "fire4")
    set(c, LAMP_X, LAMP_Y + b, "fire6")
    -- deck gun forward: shield + barrel
    for x = 45, 50 do
      local top = 11 + math.max(0, 47 - x)
      for y = top, 13 do set(c, x, y + b, (y == top) and "steel3" or "steel2") end
    end
    set(c, 45, 13 + b, "steel1"); set(c, 46, 13 + b, "steel1")
    for x = 51, 57 do set(c, x, 11 + b, (x < 54) and "steel3" or "steel2") end
    set(c, 57, 10 + b, "steel2")
    -- bow wake: spray + foam at the waterline
    for i = 0, 6 do
      local x = 55 + math.floor(H(i, 1, f) * 9)
      local y = 21 - math.floor(H(i, 2, f) * (x > 59 and 3 or 2))
      set(c, x, y, (H(i, 3, f) < 0.5) and "ink4" or "steel3")
    end
    -- waterline foam streaks (crawl back) and stern wash
    for x = 0, 63 do
      local k = (x + f * 4) % 9
      if k < 3 or (x < 6 and k < 6) then set(c, x, 21, (x < 8 or x > 52) and "steel3" or "steel2") end
    end
    for x = 0, 3 do if (x + f) % 2 == 0 then set(c, x, 20, "steel3") end end
    flush(c)(img)
  end
end
local frames = {}; for f = 1, 4 do frames[f] = { grid = frame(f) } end
K.build{
  name = "bg_patrolboat", w = W, h = HH,
  src = ROOT .. "/art-src/backgrounds/actors/bg_patrolboat.aseprite",
  sheet = ROOT .. "/public/assets/sprites/bg/bg_patrolboat.png",
  data = ROOT .. "/public/assets/sprites/bg/bg_patrolboat.json",
  anims = { { tag = "bg_patrolboat_idle", ms = 140, frames = frames } },
  anchor = "bottom-center",
}
