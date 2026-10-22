-- Background actor: the far Drowned Mill's broken waterwheel turning (2-3). 56x56, origin BOTTOM-CENTRE.
-- Hub (28,28); dark timber rim + 8 spokes + 16 paddles (in every quarter one paddle is missing and one is snapped short),
-- iron hub; turns CLOCKWISE (overshot: water falls on the right side), sheets of water streaming off the right-hand paddles,
-- churn at the bottom. Tag bg_millwheel_turn 8 f @140 ms = a 90 deg turn (the wheel is 4-fold symmetric, so it loops).
-- Build: bash tools/build-art.sh art-src/backgrounds/actors/bg_millwheel.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local W, HH = 56, 56

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
local CX, CY = 27.5, 27.5
local function polar(r, a) return CX + math.cos(a) * r, CY + math.sin(a) * r end
local function frame(f)
  return function(img)
    local c = {}
    local rot = (f - 1) * (math.pi / 2) / 8
    -- rim rings (outer double ring + inner ring), shaded by facing: top-left lit
    for y = 0, HH - 1 do for x = 0, W - 1 do
      local dx, dy = x + 0.5 - CX, y + 0.5 - CY
      local r = math.sqrt(dx * dx + dy * dy)
      local lit = (-dx - dy) / math.max(r, 0.01)
      if (r >= 21.5 and r < 24.5) or (r >= 14.2 and r < 15.6) then
        local col = (lit > -0.1) and "dirt2" or "dirt1"
        if r < 22.2 and lit > 0.55 and r > 21.5 then col = "dirt3" end            -- lit inner lip, top-left only
        if r >= 23.6 then col = (lit > 0.5) and "dirt3" or ((lit > -0.3) and "dirt1" or "ink1") end
        if r >= 22.2 and r < 22.9 then col = "ink1" end                  -- groove between the two rim boards
        set(c, x, y, col)
      end
    end end
    -- spokes (8, 45 deg apart), 2 px timber
    for k = 0, 7 do
      local a = rot + k * math.pi / 4
      local x0, y0 = polar(4, a); local x1, y1 = polar(22, a)
      local nx, ny = -math.sin(a) * 0.6, math.cos(a) * 0.6
      line(c, x0, y0, x1, y1, "dirt1"); line(c, x0 + nx, y0 + ny, x1 + nx, y1 + ny, "ink1")
      local mx, my = polar(15, a); set(c, mx, my, "ink2")                -- iron strap bolt where the spoke crosses the ring
    end
    -- paddles: 16 radial boards from r 21.5 to 27, 2 px thick; per quarter: slot 1 snapped short, slot 3 missing
    for k = 0, 15 do
      local slot = k % 4
      if slot ~= 3 then
        local a = rot + k * math.pi / 8 + math.pi / 16
        local r1 = (slot == 1) and 24.6 or 27.4
        local nx, ny = -math.sin(a), math.cos(a)
        for t = 21.5, r1, 0.5 do
          local x, y = polar(t, a)
          local up = (math.sin(a) < 0)
          set(c, x, y, up and "dirt2" or "dirt1"); set(c, x + nx, y + ny, "ink1")
        end
        if slot == 1 then local x, y = polar(r1 + 0.6, a + 0.04); set(c, x, y, "dirt2") end   -- splintered end
        -- water sheeting off the paddles on the descending (right) half
        local px, py = polar(r1 - 0.5, a)
        if px > CX + 2 and py > 2 and py < 50 then
          local len = 5 + math.floor(H(k, f, 1) * 7)
          for j = 1, len do
            local col = (j == 1) and "ink4" or (((j + f) % 3 == 0) and "steel2" or "steel3")
            if H(k, j + f * 7, 2) < 0.8 then set(c, px + 0.5 + j * 0.15, py + j, col) end
          end
        elseif px < CX - 6 and py < 40 and H(k, f, 3) < 0.5 then
          set(c, px, py + 1, "steel2"); set(c, px, py + 3, "steel2")            -- drips on the rising side
        end
      end
    end
    -- hub: iron disc with a lit top-left rim and the axle
    for y = -5, 5 do for x = -5, 5 do
      local r = math.sqrt(x * x + y * y)
      if r <= 4.6 then
        local col = (r > 3.6) and ((x + y < 0) and "steel3" or "steel1") or "steel2"
        if r <= 1.6 then col = "outline" end
        set(c, CX - 0.5 + x, CY - 0.5 + y, col)
      end
    end end
    local bx, by = polar(3, rot + 0.4); set(c, bx, by, "ink3"); bx, by = polar(3, rot + 0.4 + math.pi); set(c, bx, by, "ink3")
    -- churn where the wheel meets the race; water spilling over the top-right paddles (rows 50-55)
    for i = 0, 5 do local x, y = polar(26 + H(i, f, 6) * 2, -0.9 + i * 0.12); set(c, x + 1, y, (i % 2 == 0) and "ink4" or "steel3") end
    for x = 6, 52 do
      for y = 51, 55 do
        local v = H(x, y, f + 10)
        if y == 55 or (v < 0.35 - (55 - y) * 0.05) or (x > 36 and v < 0.55 - (55 - y) * 0.07) then
          set(c, x, y, (v < 0.12) and "ink4" or ((y == 55) and "steel2" or "steel3"))
        end
      end
    end
    flush(c)(img)
  end
end
local frames = {}; for f = 1, 8 do frames[f] = { grid = frame(f) } end
K.build{
  name = "bg_millwheel", w = W, h = HH,
  src = ROOT .. "/art-src/backgrounds/actors/bg_millwheel.aseprite",
  sheet = ROOT .. "/public/assets/sprites/bg/bg_millwheel.png",
  data = ROOT .. "/public/assets/sprites/bg/bg_millwheel.json",
  anims = { { tag = "bg_millwheel_turn", ms = 140, frames = frames } },
  anchor = "bottom-center",
}
