-- KBE title logo: "KNOTZ / BIZARRE / ESCAPE" chunky 3D pixel lettering with a glitch animation.
-- Build: bash tools/build-art.sh art-src/ui/logo.lua  -> public/assets/ui/logo.png/.json (tags logo_idle, logo_glitch)
local U = dofile(app.params.root .. "/art-src/ui/lib/ui.lua")
local K = U.K
local SRC = U.ROOT .. "/art-src/ui/"
local OUT = U.ROOT .. "/public/assets/ui/"
local PREV = "/tmp/kbe-ui/"
local pc = app.pixelColor
local W, H = 240, 112

-- A word as one image: letters from the BIG skeleton, `passes` EPX passes, bold, dressed with style.
-- jitter[i] = vertical offset per letter. spacing = extra px between letters (negative tightens).
local function word(text, passes, style, spacing, jitter)
  local letters = {}
  local totalW, maxH = 0, 0
  for i = 1, #text do
    local ch = text:sub(i, i)
    local m = U.trimX(U.mask(U.G.BIG[ch])); for _ = 1, passes do m = U.epx(m) end; m = U.bold(m, 1)
    local img = U.render(m, style)
    letters[i] = img
    totalW = totalW + m.w + spacing
    if img.height > maxH then maxH = img.height end
  end
  local ex = style.extrude and style.extrude[1] or 0
  local out = U.newImage(totalW - spacing + ex + 2, maxH + 4)
  local x = 0
  for i, img in ipairs(letters) do
    U.blit(out, img, x, 2 + (jitter and jitter[i] or 0))
    x = x + (img.width - ex - 2) + spacing  -- advance by mask width (image = mask + 2 outline + extrude)
  end
  return out
end

local STEEL = { fill = { "ink6", "steel5", "steel5", "steel4", "steel4", "steel3", "steel3", "steel2" }, outline = "outline", extrude = { 2, "steel1" } }
local WEIRD = { fill = { "white", "weird5", "weird5", "weird5", "weird4", "weird4", "weird4", "weird3", "weird3", "weird2" }, outline = "outline", extrude = { 4, "weird1" } }
local FIRE  = { fill = { "fire6", "fire6", "fire5", "fire5", "fire4", "fire4", "fire3", "fire3", "fire2" }, outline = "outline", extrude = { 4, "fire1" } }

local knotz   = word("KNOTZ", 1, STEEL, 2)
local bizarre = word("BIZARRE", 2, WEIRD, 3, { 0, 2, -1, 1, -2, 1, 0 })
local escape  = word("ESCAPE", 2, FIRE, 3)

-- slime drips under BIZARRE: 3px wide neon drips with a blob at the end
local function drips(img, cols)
  for _, d in ipairs(cols) do
    local x, len = d[1], d[2]
    local y0 = -1
    for y = img.height - 1, 0, -1 do if pc.rgbaA(img:getPixel(x, y)) > 0 then y0 = y; break end end
    if y0 >= 0 then
      local ys = y0 - 3
      for y = ys, y0 + len do
        K.px(img, x - 2, y, "outline"); K.px(img, x + 2, y, "outline")
        K.px(img, x - 1, y, "weird5"); K.px(img, x, y, "weird4"); K.px(img, x + 1, y, "weird3")
      end
      local ye = y0 + len
      -- blob
      K.rect(img, x - 3, ye - 1, 7, 1, "outline"); K.rect(img, x - 2, ye - 1, 5, 1, "weird4")
      K.rect(img, x - 3, ye, 1, 2, "outline"); K.rect(img, x + 3, ye, 1, 2, "outline")
      K.rect(img, x - 2, ye, 5, 2, "weird4"); K.px(img, x - 2, ye, "weird5"); K.px(img, x - 1, ye, "weird5"); K.px(img, x + 1, ye + 1, "weird3")
      K.rect(img, x - 2, ye + 2, 5, 1, "outline"); K.px(img, x - 3, ye + 2, "outline"); K.px(img, x + 3, ye + 2, "outline")
    end
  end
end
local bizarreTall = U.newImage(bizarre.width, bizarre.height + 10); U.blit(bizarreTall, bizarre, 0, 0)
drips(bizarreTall, { { 16, 4 }, { 58, 2 }, { 101, 6 }, { 147, 3 }, { 186, 5 } })
bizarre = bizarreTall

-- glitch: shift horizontal bands + colour ghost
local function glitch(img, seed)
  local out = U.newImage(img.width, img.height)
  local bands = ({ { { 6, 12, 3 }, { 20, 26, -4 }, { 30, 33, 2 } }, { { 2, 7, -3 }, { 14, 19, 5 }, { 28, 36, -2 } }, { { 10, 16, 2 }, { 24, 29, -5 } } })[seed]
  local function shiftFor(y) for _, b in ipairs(bands) do if y >= b[1] and y <= b[2] then return b[3] end end return 0 end
  -- ghost copy (neon green, offset left)
  for y = 0, img.height - 1 do for x = 0, img.width - 1 do
    local p = img:getPixel(x, y)
    if pc.rgbaA(p) > 0 and (x + y) % 2 == 0 then local gx = x - 3 - shiftFor(y); if gx >= 0 then out:drawPixel(gx, y, K.color("weird4")) end end
  end end
  for y = 0, img.height - 1 do
    local s = shiftFor(y)
    for x = 0, img.width - 1 do
      local p = img:getPixel(x, y)
      if pc.rgbaA(p) > 0 then local nx = x + s; if nx >= 0 and nx < out.width then out:drawPixel(nx, y, p) end end
    end
  end
  return out
end

-- stripes beside KNOTZ (sergeant chevrons)
local function stripes(img, x, y, dir)
  for i = 0, 2 do
    local sx = x + dir * i * 5
    for k = 0, 10 do K.px(img, sx + dir * k, y + (k < 5 and (4 - k) or (k - 5)) , "sand3") end
    for k = 0, 10 do K.px(img, sx + dir * k, y + 1 + (k < 5 and (4 - k) or (k - 5)) , "sand2") end
  end
end

local function compose(biz)
  local img = U.newImage(W, H)
  local kx = math.floor((W - knotz.width) / 2)
  U.blit(img, knotz, kx, 0)
  stripes(img, kx - 10, 4, -1); stripes(img, kx + knotz.width + 8, 4, 1)
  U.blit(img, biz, math.floor((W - biz.width) / 2), 18)
  U.blit(img, escape, math.floor((W - escape.width) / 2), 64)
  return img
end

local idle = compose(bizarre)
local frames = { glitch(bizarre, 1), glitch(bizarre, 2), glitch(bizarre, 3) }
local gl = {}
for i, b in ipairs(frames) do gl[i] = compose(b) end

U.sheet{ name = "logo", w = W, h = H, src = SRC .. "logo.aseprite", sheet = OUT .. "logo.png", data = OUT .. "logo.json",
  entries = { { name = "logo_idle", img = idle }, { name = "logo_glitch", ms = 70, frames = { gl[1], idle, gl[2], gl[3] } } } }

-- preview on a dark gradient
local prev = U.newImage(384, 216)
for y = 0, 215 do K.rect(prev, 0, y, 384, 1, (y < 70) and "sky1" or ((y < 150) and "ink1" or "dirt1")) end
U.blit(prev, idle, 72, 20)
local big = U.newImage(384 * 3, 216 * 3)
for y = 0, 215 do for x = 0, 383 do local p = prev:getPixel(x, y) for j = 0, 2 do for i = 0, 2 do big:drawPixel(x * 3 + i, y * 3 + j, p) end end end end
U.saveImage(prev, PREV .. "logo_mock.png"); U.saveImage(big, PREV .. "logo_mock_x3.png")
local gprev = U.newImage(W, H * 3); for i = 1, 3 do U.blit(gprev, gl[i], 0, (i - 1) * H) end
U.saveImage(gprev, PREV .. "logo_glitch.png")
print("logo done " .. idle.width .. "x" .. idle.height)
