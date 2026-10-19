-- Background actor: far Regime twin-engine transport (Part I paratrooper drop). 72x24, nose RIGHT.
-- Tag bg_plane_fly: 2 frames @60 ms (prop blur discs alternate). Seen from the side, slightly below.
-- No outlines, dark steel1-3 silhouette, faint red2 stripe. Build: bash tools/build-art.sh art-src/backgrounds/actors/bg_plane.lua
local K = dofile(app.params.kbe)
local ROOT = app.params.root
local W, Hh = 72, 24
local function S(img, x, y, c) if x >= 0 and y >= 0 and x < W and y < Hh then K.px(img, x, y, c) end end

-- fuselage top/bottom per column (x 3..68): fat body, upswept tail at left, round nose at right
local function body(x)
  if x < 3 or x > 68 then return nil end
  local top, bot
  if x <= 20 then local t = (x - 3) / 17; top = 9 - t * 1.5; bot = 11 + t * 6
  elseif x <= 58 then top = 7.5; bot = 17
  else local t = (x - 58) / 10; top = 7.5 + t * t * 4.5; bot = 17 - t * t * 4.5 end
  return math.floor(top + 0.5), math.floor(bot + 0.5)
end

local function frame(f)
  return function(img)
    -- far engine nacelle (behind fuselage; sits a little higher since we look up at the plane)
    for x = 42, 58 do for y = 7, 9 do S(img, x, y, (y == 7) and "steel2" or "steel1") end end
    S(img, 58, 7, "steel2")
    -- far prop blur disc (dim)
    for y = 2, 12 do if ((y + f) % 2 == 0) or y == 8 then S(img, 59, y, (y < 8) and "steel3" or "steel2") end end
    -- vertical tail fin + rudder at left
    for x = 2, 12 do
      local t = (x - 2) / 10
      local top = math.floor(1 + t * 7 + 0.5)
      if x < 4 then top = 2 end
      for y = top, 9 do S(img, x, y, (y == top) and "steel3" or ((x < 5) and "steel1" or "steel2")) end
    end
    -- fuselage
    for x = 0, W - 1 do
      local top, bot = body(x)
      if top then for y = top, bot do
        local c
        if y == top then c = "steel3" elseif y <= top + 2 then c = "steel2" elseif y >= bot - 1 then c = "ink1" elseif y >= bot - 3 then c = "steel1" else c = "steel2" end
        S(img, x, y, c)
      end end
    end
    -- faint red2 stripe along the fuselage
    for x = 8, 64 do local top, bot = body(x); if top and bot - top > 4 then S(img, x, top + 4, "red2") end end
    -- cockpit glazing on the nose step
    S(img, 61, 9, "steel3"); S(img, 62, 9, "steel4"); S(img, 63, 9, "steel4"); S(img, 64, 10, "steel3"); S(img, 63, 10, "steel1"); S(img, 62, 10, "steel1")
    -- open side door (dark hole with a lit trailing edge)
    for x = 16, 20 do for y = 10, 15 do S(img, x, y, (x == 20) and "steel3" or ((y == 10) and "steel1" or "outline")) end end
    -- horizontal stabiliser (edge-on) at the tail
    for x = 0, 13 do S(img, x, 9, (x < 3) and "steel2" or "steel1") end
    -- high wing on top of the fuselage, edge-on, a sliver of underside visible
    for x = 22, 54 do
      S(img, x, 5, (x < 46) and "steel3" or "steel2"); S(img, x, 6, "steel2")
      if x > 24 and x < 52 then S(img, x, 7, "steel1") end
    end
    for x = 19, 21 do S(img, x, 6, "steel2") end
    -- near engine nacelle hanging under the wing
    for x = 37, 56 do
      local y0, y1 = 8, 12
      if x < 40 then y0, y1 = 9, 11 end
      for y = y0, y1 do
        local c = (y == y0) and "steel3" or ((y == y1) and "ink1" or "steel1")
        if x >= 55 then c = (y == y0) and "steel4" or "steel2" end
        S(img, x, y, c)
      end
    end
    -- near prop blur disc (alternates dither phase + blade streak between frames)
    for y = 4, 16 do
      if ((y + f) % 2 == 0) or math.abs(y - 10) <= 1 then S(img, 57, y, (y < 10) and "steel4" or "steel3") end
    end
    if f == 1 then S(img, 58, 5, "steel3"); S(img, 58, 15, "steel2") else S(img, 58, 7, "steel3"); S(img, 58, 13, "steel2") end
    S(img, 57, 10, "steel1")
    -- tailwheel
    S(img, 9, 14, "steel1"); S(img, 9, 15, "ink1")
  end
end

K.build{
  name = "bg_plane", w = W, h = Hh,
  src = ROOT .. "/art-src/backgrounds/actors/bg_plane.aseprite",
  sheet = ROOT .. "/public/assets/sprites/bg/bg_plane.png",
  data = ROOT .. "/public/assets/sprites/bg/bg_plane.json",
  anims = { { tag = "bg_plane_fly", ms = 60, frames = { { grid = frame(1) }, { grid = frame(2) } } } },
  anchor = "center",
}
