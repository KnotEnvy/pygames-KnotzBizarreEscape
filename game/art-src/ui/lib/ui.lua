-- KBE UI art helpers (fonts, glyph dressing, atlas + BMFont XML export, previews).
-- Load from a build script:  local U = dofile(app.params.root .. "/art-src/ui/lib/ui.lua")
local U = {}
U.K = dofile(app.params.kbe)
U.G = dofile(app.params.root .. "/art-src/ui/lib/glyphs.lua")
U.ROOT = app.params.root
local K = U.K
local pc = app.pixelColor

-- Named symbol glyphs -> Unicode codepoints (usable in BitmapText strings).
U.SYMBOLS = { ARROW_R = 8594, ARROW_L = 8592, ARROW_U = 8593, ARROW_D = 8595, TRI_U = 9650, DOT = 9679, TIMES = 215, HEART = 9829, INF = 8734 }

-- ------------------------------------------------------------------ masks
-- A mask is { w, h, px = { [y*w+x] = true } } with 0-based x,y.
function U.mask(rows)
  local h = #rows; local w = 0
  for _, r in ipairs(rows) do if #r > w then w = #r end end
  local m = { w = w, h = h, px = {} }
  for y, r in ipairs(rows) do for x = 1, #r do if r:sub(x, x) == "#" then m.px[(y - 1) * w + (x - 1)] = true end end end
  return m
end
function U.mget(m, x, y) if x < 0 or y < 0 or x >= m.w or y >= m.h then return false end return m.px[y * m.w + x] == true end
function U.mset(m, x, y, v) if x >= 0 and y >= 0 and x < m.w and y < m.h then m.px[y * m.w + x] = v or nil end end
function U.mnew(w, h) return { w = w, h = h, px = {} } end

-- EPX / Scale2x upscale (2x) with diagonal smoothing.
function U.epx(m)
  local o = U.mnew(m.w * 2, m.h * 2)
  for y = 0, m.h - 1 do for x = 0, m.w - 1 do
    local P = U.mget(m, x, y)
    local A, B, C, D = U.mget(m, x, y - 1), U.mget(m, x + 1, y), U.mget(m, x - 1, y), U.mget(m, x, y + 1)
    local p1, p2, p3, p4 = P, P, P, P
    if C == A and C ~= D and A ~= B then p1 = A end
    if A == B and A ~= C and B ~= D then p2 = B end
    if D == C and D ~= A and C ~= B then p3 = C end
    if B == D and B ~= A and D ~= C then p4 = D end
    U.mset(o, 2 * x, 2 * y, p1); U.mset(o, 2 * x + 1, 2 * y, p2)
    U.mset(o, 2 * x, 2 * y + 1, p3); U.mset(o, 2 * x + 1, 2 * y + 1, p4)
  end end
  return o
end
function U.scaleNearest(m, k)
  local o = U.mnew(m.w * k, m.h * k)
  for y = 0, m.h - 1 do for x = 0, m.w - 1 do if U.mget(m, x, y) then
    for j = 0, k - 1 do for i = 0, k - 1 do U.mset(o, x * k + i, y * k + j, true) end end end end end
  return o
end
-- Bold: smear the mask right/down by n px (2px strokes -> 2+n px strokes).
function U.bold(m, n)
  n = (n == true) and 1 or n
  local o = U.mnew(m.w + n, m.h + n)
  for y = 0, m.h - 1 do for x = 0, m.w - 1 do if U.mget(m, x, y) then
    for j = 0, n do for i = 0, n do U.mset(o, x + i, y + j, true) end end end end end
  return o
end
function U.dilate(m)
  local o = U.mnew(m.w + 2, m.h + 2)
  for y = 0, m.h - 1 do for x = 0, m.w - 1 do if U.mget(m, x, y) then
    for j = -1, 1 do for i = -1, 1 do U.mset(o, x + 1 + i, y + 1 + j, true) end end end end end
  return o
end
-- Trim empty columns (keeps full height).
function U.trimX(m)
  local x0, x1 = m.w, -1
  for y = 0, m.h - 1 do for x = 0, m.w - 1 do if U.mget(m, x, y) then if x < x0 then x0 = x end; if x > x1 then x1 = x end end end end
  if x1 < 0 then return m end
  local o = U.mnew(x1 - x0 + 1, m.h)
  for y = 0, m.h - 1 do for x = x0, x1 do U.mset(o, x - x0, y, U.mget(m, x, y)) end end
  return o
end
function U.maskFromImage(img)
  local m = U.mnew(img.width, img.height)
  for y = 0, img.height - 1 do for x = 0, img.width - 1 do if pc.rgbaA(img:getPixel(x, y)) > 0 then U.mset(m, x, y, true) end end end
  return m
end

-- ------------------------------------------------------------------ images
function U.newImage(w, h) return Image(w, h, ColorMode.RGB) end
function U.blit(dst, src, x, y)
  for j = 0, src.height - 1 do for i = 0, src.width - 1 do
    local p = src:getPixel(i, j)
    if pc.rgbaA(p) > 0 then local dx, dy = x + i, y + j
      if dx >= 0 and dy >= 0 and dx < dst.width and dy < dst.height then dst:drawPixel(dx, dy, p) end end
  end end
end
-- Tint preview: recolours pure-white pixels only (mimics Phaser's multiply tint on a white glyph; outlines stay dark).
function U.blitTinted(dst, src, x, y, color)
  local c = K.color(color); local white = K.color("white")
  for j = 0, src.height - 1 do for i = 0, src.width - 1 do
    local p = src:getPixel(i, j)
    if pc.rgbaA(p) > 0 then local dx, dy = x + i, y + j
      if dx >= 0 and dy >= 0 and dx < dst.width and dy < dst.height then dst:drawPixel(dx, dy, (p == white) and c or p) end end
  end end
end
function U.fillRect(img, x, y, w, h, c) K.rect(img, x, y, w, h, c) end
function U.saveImage(img, path, asepritePath)
  local spr = Sprite(img.width, img.height, ColorMode.RGB)
  spr.cels[1].image:drawImage(img, Point(0, 0))
  if asepritePath then spr:saveAs(asepritePath) end
  spr:saveAs(path); spr:close()
end
function U.writeFile(path, text) local f = assert(io.open(path, "w")); f:write(text); f:close() end

-- Build a sprite with one frame per entry {name=, img=} and export packed sheet + json via tags.
-- All frames must share the canvas size (w,h). Each entry becomes a 1-frame tag unless frames is given.
function U.sheet(spec)
  local anims = {}
  for _, e in ipairs(spec.entries) do
    local frames = {}
    for _, img in ipairs(e.frames or { e.img }) do
      local captured = img
      frames[#frames + 1] = { grid = function(dst) dst:drawImage(captured, Point(0, 0)) end }
    end
    anims[#anims + 1] = { tag = e.name, ms = e.ms or 100, frames = frames, dir = e.dir }
  end
  K.build{ name = spec.name, w = spec.w, h = spec.h, src = spec.src, sheet = spec.sheet, data = spec.data, anims = anims }
end

-- ------------------------------------------------------------------ glyph dressing
-- style = { fill = { colors top->bottom } | "color", outline = color|nil, shadow = {dx,dy,color}|nil,
--           extrude = {n, color}|nil, bevel = color|nil, padL/padT/padR/padB override }
-- Returns img, ox, oy (where the mask's (0,0) landed inside img).
function U.render(m, style)
  style = style or {}
  local ex = style.extrude and style.extrude[1] or 0
  local sdx, sdy = 0, 0
  if style.shadow then sdx, sdy = style.shadow[1], style.shadow[2] end
  local ol = style.outline and 1 or 0
  local padL, padT = ol + math.max(0, -sdx), ol + math.max(0, -sdy)
  local padR, padB = ol + math.max(ex, sdx), ol + math.max(ex, sdy)
  local W, H = m.w + padL + padR, m.h + padT + padB
  local img = U.newImage(W, H)
  local union = U.mnew(W, H)
  -- extrusion (back to front)
  if ex > 0 then
    for k = ex, 1, -1 do
      local c = K.color(style.extrude[2])
      for y = 0, m.h - 1 do for x = 0, m.w - 1 do if U.mget(m, x, y) then
        img:drawPixel(padL + x + k, padT + y + k, c); U.mset(union, padL + x + k, padT + y + k, true) end end end
    end
  end
  -- fill
  local fill = style.fill or "white"
  if type(fill) == "string" then fill = { fill } end
  for y = 0, m.h - 1 do
    local idx = math.floor(y * #fill / m.h) + 1
    local c = K.color(fill[idx])
    for x = 0, m.w - 1 do if U.mget(m, x, y) then img:drawPixel(padL + x, padT + y, c); U.mset(union, padL + x, padT + y, true) end end
  end
  if style.bevel then
    local c = K.color(style.bevel)
    for y = 0, m.h - 1 do for x = 0, m.w - 1 do
      if U.mget(m, x, y) and not U.mget(m, x, y - 1) then img:drawPixel(padL + x, padT + y, c) end
    end end
  end
  -- outline (8-neighbour) around the union
  if style.outline then
    local c = K.color(style.outline); local marks = {}
    for y = 0, H - 1 do for x = 0, W - 1 do if not U.mget(union, x, y) then
      local hit = false
      for j = -1, 1 do for i = -1, 1 do if U.mget(union, x + i, y + j) then hit = true end end end
      if hit then marks[#marks + 1] = { x, y } end
    end end end
    for _, p in ipairs(marks) do img:drawPixel(p[1], p[2], c); U.mset(union, p[1], p[2], true) end
  end
  -- drop shadow under everything so far
  if style.shadow then
    local c = K.color(style.shadow[3]); local marks = {}
    for y = 0, H - 1 do for x = 0, W - 1 do
      if U.mget(union, x, y) and not U.mget(union, x + sdx, y + sdy) then marks[#marks + 1] = { x + sdx, y + sdy } end
    end end
    for _, p in ipairs(marks) do if p[1] >= 0 and p[2] >= 0 and p[1] < W and p[2] < H then img:drawPixel(p[1], p[2], c) end end
  end
  return img, padL, padT
end

-- ------------------------------------------------------------------ fonts
local function utf8codes(s)
  local out, i = {}, 1
  while i <= #s do
    local c = s:byte(i)
    if c < 0x80 then out[#out + 1] = c; i = i + 1
    elseif c < 0xE0 then out[#out + 1] = ((c & 0x1F) << 6) | (s:byte(i + 1) & 0x3F); i = i + 2
    elseif c < 0xF0 then out[#out + 1] = ((c & 0x0F) << 12) | ((s:byte(i + 1) & 0x3F) << 6) | (s:byte(i + 2) & 0x3F); i = i + 3
    else out[#out + 1] = ((c & 0x07) << 18) | ((s:byte(i + 1) & 0x3F) << 12) | ((s:byte(i + 2) & 0x3F) << 6) | (s:byte(i + 3) & 0x3F); i = i + 4 end
  end
  return out
end
U.utf8codes = utf8codes

-- Prepare the glyph mask for a codepoint from a glyph table. Returns mask or nil.
-- opts.upper: fold lowercase to uppercase; opts.scale: number of EPX passes; opts.trim: trim columns.
function U.glyphMask(glyphs, cp, opts)
  local key
  if cp >= 32 and cp < 127 then key = string.char(cp) else for n, c in pairs(U.SYMBOLS) do if c == cp then key = n end end end
  if not key then return nil end
  if opts.upper and glyphs[key] == nil and cp >= 97 and cp <= 122 then key = string.char(cp - 32) end
  local rows = glyphs[key]
  if not rows then return nil end
  local m = U.mask(rows)
  if opts.trim and key ~= " " then m = U.trimX(m) end
  for _ = 1, (opts.scale or 0) do m = U.epx(m) end
  if opts.bold and key ~= " " then m = U.bold(m, opts.bold) end
  return m
end

-- Render a whole font: returns font object { glyph = {[cp] = {img, w, h, xadv, xoff, yoff}}, lineHeight, base }
-- spec = { glyphs=, style=, scale=, upper=, trim=, gap= (px between glyphs), name=, png=, xml=, pngName= }
function U.makeFont(spec)
  local font = { glyph = {}, name = spec.name }
  local cps = {}
  for cp = 32, 126 do cps[#cps + 1] = cp end
  for _, cp in pairs(U.SYMBOLS) do cps[#cps + 1] = cp end
  table.sort(cps)
  local maxH = 0
  for _, cp in ipairs(cps) do
    local m = U.glyphMask(spec.glyphs, cp, spec)
    if m then
      local img, ox, oy = U.render(m, spec.style)
      local xadv = m.w + (spec.gap or 1)
      if cp == 32 then xadv = spec.space or math.floor(m.w * 0.75) + 1 end
      font.glyph[cp] = { img = img, w = img.width, h = img.height, xadv = xadv, xoff = -ox, yoff = -oy, mw = m.w, mh = m.h }
      if img.height > maxH then maxH = img.height end
    end
  end
  font.cell = maxH
  font.lineHeight = spec.lineHeight or (maxH + 1)
  font.base = font.glyph[65] and font.glyph[65].mh or maxH
  return font
end

-- Pack a font into an atlas PNG + BMFont XML.
function U.exportFont(font, png, xml, pngName)
  local cps = {}
  for cp in pairs(font.glyph) do cps[#cps + 1] = cp end
  table.sort(cps)
  local cols = 16
  local cellW, cellH = 0, font.cell
  for _, cp in ipairs(cps) do if font.glyph[cp].w > cellW then cellW = font.glyph[cp].w end end
  cellW = cellW + 1; cellH = cellH + 1
  local rows = math.ceil(#cps / cols)
  local W, H = cols * cellW, rows * cellH
  -- power of two is friendlier for GPUs
  local function pot(n) local p = 1; while p < n do p = p * 2 end; return p end
  W, H = pot(W), pot(H)
  local atlas = U.newImage(W, H)
  local chars = {}
  for i, cp in ipairs(cps) do
    local g = font.glyph[cp]
    local cx, cy = ((i - 1) % cols) * cellW, math.floor((i - 1) / cols) * cellH
    U.blit(atlas, g.img, cx, cy)
    chars[#chars + 1] = string.format('    <char id="%d" x="%d" y="%d" width="%d" height="%d" xoffset="%d" yoffset="%d" xadvance="%d" page="0" chnl="15"/>',
      cp, cx, cy, g.w, g.h, g.xoff, g.yoff, g.xadv)
  end
  local out = {
    '<?xml version="1.0"?>', '<font>',
    string.format('  <info face="%s" size="%d" bold="0" italic="0" charset="" unicode="1" stretchH="100" smooth="0" aa="1" padding="0,0,0,0" spacing="0,0" outline="0"/>', font.name, font.base),
    string.format('  <common lineHeight="%d" base="%d" scaleW="%d" scaleH="%d" pages="1" packed="0" alphaChnl="0" redChnl="4" greenChnl="4" blueChnl="4"/>', font.lineHeight, font.base, W, H),
    '  <pages>', string.format('    <page id="0" file="%s"/>', pngName), '  </pages>',
    string.format('  <chars count="%d">', #chars) }
  for _, c in ipairs(chars) do out[#out + 1] = c end
  out[#out + 1] = '  </chars>'; out[#out + 1] = '</font>'
  U.saveImage(atlas, png)
  U.writeFile(xml, table.concat(out, "\n") .. "\n")
  print(string.format("font %s: %d glyphs, atlas %dx%d, lineHeight %d", font.name, #cps, W, H, font.lineHeight))
end

-- Draw text with a font object onto an image (previews, baked badges). Returns width.
function U.drawText(img, font, x, y, s, tint)
  local cx = x
  for _, cp in ipairs(utf8codes(s)) do
    if cp == 10 then cx = x; y = y + font.lineHeight else
      local g = font.glyph[cp] or font.glyph[63]
      if g then
        if tint then U.blitTinted(img, g.img, cx + g.xoff, y + g.yoff, tint) else U.blit(img, g.img, cx + g.xoff, y + g.yoff) end
        cx = cx + g.xadv
      end
    end
  end
  return cx - x
end
function U.textWidth(font, s)
  local w = 0
  for _, cp in ipairs(utf8codes(s)) do local g = font.glyph[cp] or font.glyph[63]; if g then w = w + g.xadv end end
  return w
end

-- ------------------------------------------------------------------ handy ramps
U.RAMP = {
  fire  = { "fire6", "fire5", "fire5", "fire5", "fire4", "fire4", "fire4", "fire3", "fire3", "fire2" },
  sand  = { "sand5", "sand5", "sand4", "sand4", "sand3", "sand3", "sand2", "sand2" },
  steel = { "ink6", "steel5", "steel5", "steel4", "steel4", "steel3", "steel3", "steel2" },
  weird = { "weird5", "weird5", "weird4", "weird4", "weird3", "weird3", "weird2", "weird2" },
  gold  = { "fire6", "fire5", "fire5", "fire4", "fire4", "fire3", "fire3" },
  red   = { "red5", "red5", "red4", "red4", "red3", "red3", "red2", "red2" },
  white = { "white" },
}

return U
