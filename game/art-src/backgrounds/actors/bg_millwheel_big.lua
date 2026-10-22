-- Background actor: the Drowned Mill's big broken waterwheel, drawn to sit exactly over the painted wheel in
-- public/assets/backgrounds/m2p3/gen_mill_far.png at 1x. 144x100, origin CENTRE: canvas (72,50) = wheel hub =
-- gen_mill_far.png pixel (152,74). The painting shows the wheel in perspective as an ellipse (rx ~67, ry ~46), so this
-- wheel is drawn in the wheel plane and projected onto that ellipse. The interior is opaque so the painted spokes never
-- ghost through. Storm timber in the painting's own palette (outline/ink1/steel1, steel2 lit edges, olive moss,
-- sand1 rust on the hub), 8 chunky plank spokes, the drum's far rim showing through on the right, 24 paddles (every third one snapped short), water sheeting off the right-hand
-- paddles, the painted left-hand fall animated, churn where the wheel goes under (rows 82-92; nothing below row 92).
-- Tag bg_millwheel_big_turn 8 f @140 ms: CLOCKWISE, 45 deg per loop (8-fold symmetric), so it loops cleanly.
-- Build: bash tools/build-art.sh art-src/backgrounds/actors/bg_millwheel_big.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local W, HH = 144, 100

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
local CX, CY, RX, RY = 72, 50, 66, 46
local CLIP = 86                                   -- last row of timber (the painted water covers the rest)
local TAU = math.pi * 2
local function adiff(a, b) local d = (a - b) % TAU; if d > math.pi then d = d - TAU end; return d end
local function frame(f)
  return function(img)
    local c = {}
    local rot = (f - 1) * (math.pi / 4) / 8
    for y = 0, CLIP do for x = 0, W - 1 do
      local u, v = (x + 0.5 - CX) / RX, (y + 0.5 - CY) / RY
      local r = math.sqrt(u * u + v * v)
      if r <= 1.06 then
        local th = math.atan(v, u)
        local lit = -(u + v) / (r + 1e-6)
        local scr = r * 56                        -- approx. screen radius, for pixel-thickness tests
        local col
        -- paddles: chunky boards across and beyond the rim
        if r >= 0.8 then
          for k = 0, 23 do
            local a = rot + k * TAU / 24 + TAU / 48
            local d = adiff(th, a) * scr
            local rmax = (k % 3 == 2) and 0.9 or 1.06
            if math.abs(d) < 2.4 and r <= rmax then
              col = (d < -1.1) and ((math.sin(a) < 0) and "steel2" or "steel1") or ((d > 1.2) and "outline" or "ink1")
              if k % 3 == 2 and r > rmax - 0.03 then col = "ink2" end           -- splintered stub
              if r > 1.0 and d < -1.1 then col = "steel1" end
            end
          end
        end
        if not col and r <= 1.0 then
          if r >= 0.83 then                                                    -- thick rim: two boards + moss
            col = "ink1"
            if lit > 0.4 then col = "steel1" end
            if lit > 0.8 and r > 0.93 then col = "steel2" end
            if r >= 0.9 and r < 0.925 then col = "outline" end
            if r >= 0.975 and lit < -0.2 then col = "outline" end
            if r < 0.85 then col = "outline" end
            if v < -0.45 and H(x, y, 3) < 0.28 then col = (H(x, y, 4) < 0.5) and "olive2" or "olive1" end
          end
          -- chunky plank spokes
          if not col and r > 0.12 then
            for k = 0, 7 do
              local a = rot + k * TAU / 8
              local d = adiff(th, a) * scr
              if math.abs(d) < 3.3 then
                col = (d < -1.6) and "steel1" or ((d > 1.8) and "outline" or "ink1")
                if d < -2.6 and math.sin(a) < 0.2 then col = "steel2" end
                if math.abs(d) < 0.5 and r > 0.3 and (math.floor(r * 40) % 5 == 0) then col = "ink2" end   -- bolts
                if math.sin(a) < -0.3 and d < -1.6 and H(x, y, 11) < 0.15 then col = "olive1" end
              end
            end
          end
          if not col and r < 0.17 then                                         -- iron hub with rust
            col = (r > 0.12) and ((lit > 0.2) and "steel2" or "steel1") or "ink2"
            if r <= 0.05 then col = "outline" end
            if r > 0.06 and r < 0.12 and H(x, y, 5) < 0.35 then col = "sand1" end
          end
          if not col then                                                      -- dark drum interior + far rim
            col = "outline"
            local ub, vb = (u - 0.36) / 0.55, v / 0.8
            local rb = math.sqrt(ub * ub + vb * vb)
            if rb > 0.9 and rb < 1.0 and ub > -0.3 then col = (rb > 0.96) and "steel1" or "ink1" end
            if rb < 0.9 and ub > 0.2 and math.floor((v + 1) * 18) % 4 == 0 then col = "ink1" end    -- drum boards beyond
          end
        end
        if col then set(c, x, y, col) end
      end
    end end
    -- water sheeting off the paddle tips on the right-hand (descending) side
    for k = 0, 23 do
      local a = rot + k * TAU / 24 + TAU / 48
      if math.cos(a) > 0.25 then
        local rr = (k % 3 == 2) and 0.93 or 1.04
        local px, py = CX + math.cos(a) * rr * RX, CY + math.sin(a) * rr * RY
        local len = 6 + math.floor(H(k, 1, 7) * 10)
        for j = 0, len do
          local y = math.floor(py + j)
          if y <= 90 and H(k, (y - f * 2) % 16, 8) < 0.55 then
            set(c, px + j * 0.12, y, (j == 0) and "steel4" or (((y - f * 2) % 4 == 0) and "ink3" or "steel3"))
          end
        end
      end
    end
    -- the painted left-hand fall (gen_mill_far x 88-106, y 85-110 -> canvas x 8-26, rows 61-86): streaky, animated
    for x = 8, 26 do
      local hx = H(x, 0, 9)
      if hx < 0.55 or (x >= 13 and x <= 19) then
        local core = (x >= 13 and x <= 19)
        local base = core and ((hx < 0.3) and "steel3" or "steel2") or ((hx < 0.4) and "steel2" or "ink2")
        local y0 = 58 + math.floor(H(x, 1, 9) * 12)
        for y = y0, 88 do
          local ph = (y - f * 2 + math.floor(hx * 16)) % 16
          if ph >= 2 then set(c, x, y, (ph == 15 and core) and "steel4" or base) end
        end
      end
    end
    -- churn where the wheel goes under
    for x = 4, 140 do
      local top = 82 + math.floor(H(x // 3, 2, 20) * 5)
      for y = top, 91 do
        local hv = H(x, y, f + 20)
        if hv < 0.55 - (y - top) * 0.06 then set(c, x, y, (hv < 0.04) and "steel4" or ((hv < 0.16) and "steel3" or ((hv < 0.32) and "steel2" or "steel1"))) end
      end
    end
    flush(c)(img)
  end
end
local frames = {}; for f = 1, 8 do frames[f] = { grid = frame(f) } end
K.build{
  name = "bg_millwheel_big", w = W, h = HH,
  src = ROOT .. "/art-src/backgrounds/actors/bg_millwheel_big.aseprite",
  sheet = ROOT .. "/public/assets/sprites/bg/bg_millwheel_big.png",
  data = ROOT .. "/public/assets/sprites/bg/bg_millwheel_big.json",
  anims = { { tag = "bg_millwheel_big_turn", ms = 140, frames = frames } },
  anchor = "center",
}
